"""
Turning approved work into customer invoices.

One service, one path. Everything that bills a customer goes through here so
that duplicate protection, rate resolution, surcharge transparency and VAT
classification cannot be bypassed by a second implementation.

Three rules hold throughout:

* An approved work entry is billed to the customer exactly once. The database
  enforces it as well as this module.
* Money comes from `WorkEntry.calculated_price`, which is the platform's single
  pricing authority. Nothing here re-derives a rate.
* A line whose VAT treatment cannot be established is written as
  REQUIRES_REVIEW, never as 21%.
"""

import random
import time
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.vat.classification import classify_amount
from apps.vat.constants import ClassificationStatus, PriceMode, VatTreatmentCode
from apps.worklogs.models import WorkEntry

from .models import Invoice, InvoiceLine
from .numbering import DocumentSeries, next_number

CENT = Decimal('0.01')


class BillingError(Exception):
    """A billing request that cannot be honoured as asked."""


def retry_on_lock(operation, attempts=5, base_delay=0.05):
    """
    Retry an operation that lost a database lock.

    Taking an invoice number locks the sequence row, so two people generating
    invoices at the same moment contend for it. PostgreSQL blocks the second
    writer until the first commits and both succeed. SQLite refuses immediately
    with "database is locked", which would surface as a 500 for whoever was
    second — a safe failure, since no number is duplicated, but a needless one.

    Each attempt runs in its own transaction, so this must wrap the whole
    operation rather than sit inside it.
    """
    from django.db import OperationalError

    for attempt in range(attempts):
        try:
            return operation()
        except OperationalError as exc:
            if 'lock' not in str(exc).lower() or attempt == attempts - 1:
                raise
            # Back off a little further each time, with a jitter so two
            # contending writers do not retry in lockstep forever.
            time.sleep(base_delay * (2 ** attempt) * (0.5 + random.random()))
    raise AssertionError('unreachable')


# ─────────────────────────────────────────────────────────────────────────────
# Selecting the work
# ─────────────────────────────────────────────────────────────────────────────

def week_bounds(year, week_number):
    """
    The operational week: Monday 06:00 → Sunday 06:00 (Europe/Amsterdam).

    Returned as dates, which is what the invoice stores.
    """
    from datetime import datetime

    start = datetime.strptime(f'{year}-W{week_number:02d}-1', '%G-W%V-%u')
    return start.date(), (start + timedelta(days=7)).date()


def billable_entries(customer, *, start=None, end=None, week=None, project=None,
                     include_billed=False):
    """
    Approved work for a customer that has not yet been billed.

    `week` is a (year, number) pair; `start`/`end` are inclusive dates. Give one
    or the other. `project` narrows to a single project.
    """
    query = WorkEntry.objects.filter(
        status=WorkEntry.Status.APPROVED,
        project__customer=customer,
        is_deleted=False,
    )

    if week is not None:
        year, number = week
        query = query.filter(billing_week_year=year, billing_week_number=number)
    elif start is not None and end is not None:
        query = query.filter(work_date__gte=start, work_date__lte=end)
    else:
        raise BillingError('Specify either a week or a start and end date.')

    if project is not None:
        query = query.filter(project=project)

    if not include_billed:
        query = query.exclude(
            invoice_lines__line_type=InvoiceLine.LineType.SERVICE,
            invoice_lines__is_deleted=False,
        )

    return query.select_related(
        'employee', 'employee__user', 'project', 'project__customer', 'service',
    ).order_by('work_date', 'employee__user__first_name')


def already_billed(entries):
    """Which of these entries are on an existing invoice, and where."""
    lines = InvoiceLine.objects.filter(
        work_entry__in=entries,
        line_type=InvoiceLine.LineType.SERVICE,
        is_deleted=False,
    ).select_related('invoice')
    return {line.work_entry_id: line.invoice for line in lines}


# ─────────────────────────────────────────────────────────────────────────────
# Pricing one entry
# ─────────────────────────────────────────────────────────────────────────────

def price_entry(entry):
    """
    What this entry costs the customer, and why.

    Delegates the arithmetic to WorkEntry — the money model — and returns the
    parts so the invoice can show the customer what they are paying for.

    A rate of zero is reported, not billed. `get_service_rate` returns 0 when
    the customer has no rate configured for the service, and quietly invoicing
    a month of work at nothing is worse than refusing to invoice it.
    """
    hours = entry.calculated_hours
    rate = entry.get_service_rate()
    total = entry.calculated_price

    breakdown = entry.get_hours_breakdown_detailed()
    surcharges = [
        {
            'name': item.get('name', ''),
            'percentage': str(item.get('percentage', '')),
            'hours': str(item.get('hours', '')),
            'amount': str(Decimal(str(item.get('amount', 0))).quantize(CENT)),
        }
        for item in breakdown.get('surcharges', [])
    ]
    surcharge_amount = sum(
        (Decimal(part['amount']) for part in surcharges), Decimal('0.00'))

    base = (Decimal(hours) * Decimal(rate)).quantize(CENT)
    allowance = (Decimal(total) - base - surcharge_amount).quantize(CENT)

    return {
        'hours': Decimal(hours).quantize(CENT),
        'rate': Decimal(rate).quantize(CENT),
        'base': base,
        'surcharges': surcharges,
        'surcharge_amount': surcharge_amount.quantize(CENT),
        'allowance_amount': allowance if allowance > 0 else Decimal('0.00'),
        'total': Decimal(total).quantize(CENT),
        'has_rate': Decimal(rate) > 0,
        'service': entry.service.name if entry.service else None,
    }


def describe_entry(entry):
    """The line as the customer reads it."""
    who = entry.employee.full_name if entry.employee else 'Medewerker'
    service = entry.service.name if entry.service else 'Werkzaamheden'
    times = ''
    if entry.actual_start_datetime and entry.actual_end_datetime:
        times = (f" {timezone.localtime(entry.actual_start_datetime):%H:%M}"
                 f" - {timezone.localtime(entry.actual_end_datetime):%H:%M}")
    return f'{service} — {who}{times}'


# ─────────────────────────────────────────────────────────────────────────────
# VAT for one line
# ─────────────────────────────────────────────────────────────────────────────

# The order facts are consulted in: the most specific statement wins, and a
# fact nobody has stated stays unstated all the way down.
FACT_FIELDS = (
    'is_staff_lending_or_subcontracting',
    'is_physical_work_on_immovable_property',
    'invoice_states_reverse_charge',
    'majority_work_in_own_workshop',
    'lent_to_subcontractor_working_own_premises',
    'ancillary_to_goods_sold',
    'is_design_work',
    'is_guarding_or_rental',
)


def resolve_facts(*sources):
    """
    Merge reverse-charge facts from invoice, project and customer.

    A fact set anywhere in the chain is used; a fact set nowhere stays None, and
    the engine holds the line for review rather than picking a treatment.
    """
    from apps.vat.classification import ReverseChargeFacts

    values = {}
    for field in FACT_FIELDS:
        for source in sources:
            if source is None:
                continue
            value = getattr(source, field, None)
            if value is not None:
                values[field] = value
                break
    values.pop('invoice_states_reverse_charge', None)
    return ReverseChargeFacts(**values)


def resolve_treatment(*sources):
    """The first treatment anyone has actually stated."""
    for source in sources:
        if source is None:
            continue
        code = getattr(source, 'vat_treatment_code', None)
        if code and code != VatTreatmentCode.UNKNOWN:
            return code
    return VatTreatmentCode.UNKNOWN


def classify_line(invoice, amount, on_date, project=None):
    """
    Decide the VAT for a labour line.

    Facts come from the invoice first, then the project, then the customer.
    Where nobody has stated whether this is lent labour for physical work on
    immovable property, the line is held for review — it is not billed at 21%
    on the assumption that it is ordinary cleaning, and it is not zero-rated on
    the assumption that it is reverse charged.
    """
    customer = invoice.customer
    chain = (invoice, project, customer)
    vat_number = (getattr(customer, 'btw_number', '') or '').strip() or None

    facts = resolve_facts(*chain)
    facts.counterparty_vat_number = vat_number

    result = classify_amount(
        amount,
        treatment_code=resolve_treatment(*chain),
        on_date=on_date,
        price_mode=PriceMode.EXCLUDING_VAT,
        direction='OUTPUT',
        reverse_charge_facts=facts,
        counterparty_vat_number=vat_number,
    )
    return result, facts


def freeze_facts(line, facts):
    """
    Record on the line the facts it was classified under.

    The facts usually live on the project or the customer, and both can change
    after an invoice has gone out. Copying them onto the line makes the issued
    document self-contained: it says why it was treated the way it was, and
    re-posting it to the VAT ledger reaches the same conclusion.

    Without this the line was classified correctly at billing time and then
    reclassified as unresolved when it was posted, wiping its box.
    """
    for field in FACT_FIELDS:
        value = getattr(facts, field, None)
        if value is not None and hasattr(line, field):
            setattr(line, field, value)
    return line


def apply_classification(line, result):
    """
    Write a classification result onto a line.

    A line held for review keeps null money fields rather than zeroes: a zero
    would read as "no VAT is due", which is a different claim from "nobody has
    established what is due".
    """
    line.vat_classification_status = result.status
    line.vat_review_reason = result.reason or ''
    line.vat_return_box = result.return_box_code or ''

    if result.requires_review:
        line.vat_rate = None
        line.net_amount = None
        line.vat_amount = None
        line.gross_amount = None
        return line

    line.vat_treatment_code = result.treatment_code
    line.vat_rate = result.vat_rate
    line.net_amount = result.taxable_base
    line.vat_amount = result.vat_amount
    line.gross_amount = result.gross_amount
    return line


# ─────────────────────────────────────────────────────────────────────────────
# Generating an invoice
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def generate_invoice(customer, *, week=None, start=None, end=None, project=None,
                     actor=None, notes='', vat_treatment_code=None,
                     reverse_charge_facts=None):
    """
    Build a draft invoice from the customer's unbilled approved work.

    Returns the invoice. Raises BillingError when there is nothing to bill, or
    when an active invoice already covers the same week.
    """
    from apps.core.models import SystemConfig

    entries = list(billable_entries(
        customer, start=start, end=end, week=week, project=project))
    if not entries:
        raise BillingError(
            'There is no approved, unbilled work for this customer in that period.')

    if week is not None:
        year, number = week
        period_start, period_end = week_bounds(year, number)
        mode = Invoice.BillingMode.WEEKLY
        clash = Invoice.objects.filter(
            customer=customer, week_year=year, week_number=number,
            document_type=Invoice.DocumentType.INVOICE,
            billing_mode=Invoice.BillingMode.WEEKLY, is_deleted=False,
        ).exclude(status=Invoice.Status.CANCELLED).first()
        if clash:
            raise BillingError(
                f'Invoice {clash.invoice_number} already covers week {number} of {year}.')
    else:
        period_start, period_end = start, end
        iso = period_start.isocalendar()
        year, number = iso[0], iso[1]
        mode = Invoice.BillingMode.PERIOD

    config = SystemConfig.objects.get_config()
    issue_date = timezone.localdate()
    number_string = next_number(DocumentSeries.INVOICE, issue_date.year)

    invoice = Invoice(
        invoice_number=number_string,
        document_type=Invoice.DocumentType.INVOICE,
        billing_mode=mode,
        customer=customer,
        project=project,
        week_year=year,
        week_number=number,
        week_start_date=period_start,
        week_end_date=period_end,
        period_start=period_start,
        period_end=period_end,
        status=Invoice.Status.DRAFT,
        notes=notes,
        created_by=actor,
    )
    if vat_treatment_code:
        invoice.vat_treatment_code = vat_treatment_code
    for field, value in (reverse_charge_facts or {}).items():
        if hasattr(invoice, field):
            setattr(invoice, field, value)
    invoice.save()

    for entry in entries:
        add_entry_line(invoice, entry, actor=actor)

    invoice.calculate_totals()
    return invoice


def add_entry_line(invoice, entry, actor=None):
    """Add one work entry to a draft invoice, priced and classified."""
    if invoice.is_issued:
        raise BillingError(
            f'{invoice.invoice_number} has been issued and cannot take new lines. '
            'Issue a credit note and a corrected invoice instead.')

    existing = InvoiceLine.objects.filter(
        work_entry=entry, line_type=InvoiceLine.LineType.SERVICE, is_deleted=False,
    ).select_related('invoice').first()
    if existing:
        raise BillingError(
            f'Work of {entry.work_date} is already billed on '
            f'{existing.invoice.invoice_number}.')

    priced = price_entry(entry)

    line = InvoiceLine(
        invoice=invoice,
        project=entry.project,
        employee=entry.employee,
        work_entry=entry,
        work_date=entry.work_date,
        line_type=InvoiceLine.LineType.SERVICE,
        description=describe_entry(entry),
        quantity_hours=priced['hours'],
        hourly_rate=priced['rate'],
        total=priced['total'],
        total_is_explicit=True,
        base_amount=priced['base'],
        surcharge_amount=priced['surcharge_amount'],
        allowance_amount=priced['allowance_amount'],
        surcharge_breakdown=priced['surcharges'],
        price_mode=PriceMode.EXCLUDING_VAT,
        created_by=actor,
    )

    result, facts = classify_line(
        invoice, priced['total'], entry.work_date, entry.project)
    freeze_facts(line, facts)
    apply_classification(line, result)
    line.save()
    return line


@transaction.atomic
def add_manual_line(invoice, *, description, quantity_hours, hourly_rate,
                    project=None, employee=None, work_date=None, actor=None):
    """A line that did not come from a work entry — a call-out, a fixed price."""
    if invoice.is_issued:
        raise BillingError(
            f'{invoice.invoice_number} has been issued and cannot take new lines.')

    total = (Decimal(quantity_hours) * Decimal(hourly_rate)).quantize(CENT)
    line = InvoiceLine(
        invoice=invoice,
        project=project or invoice.project,
        employee=employee,
        work_date=work_date or invoice.period_start,
        line_type=InvoiceLine.LineType.MANUAL,
        description=description,
        quantity_hours=Decimal(quantity_hours),
        hourly_rate=Decimal(hourly_rate),
        price_mode=PriceMode.EXCLUDING_VAT,
        created_by=actor,
    )
    result, facts = classify_line(
        invoice, total, line.work_date or timezone.localdate(), line.project)
    freeze_facts(line, facts)
    apply_classification(line, result)
    line.save()
    invoice.calculate_totals()
    return line


# ─────────────────────────────────────────────────────────────────────────────
# Lifecycle
# ─────────────────────────────────────────────────────────────────────────────

def issue_blockers(invoice):
    """Everything standing between this draft and the customer."""
    blockers = []

    if invoice.is_issued:
        blockers.append({'code': 'ALREADY_ISSUED',
                         'message': f'{invoice.invoice_number} has already been issued.'})
    if invoice.status == Invoice.Status.CANCELLED:
        blockers.append({'code': 'CANCELLED',
                         'message': 'This invoice is cancelled.'})
    if not invoice.lines.filter(is_deleted=False).exists():
        blockers.append({'code': 'NO_LINES',
                         'message': 'An invoice with no lines cannot be issued.'})

    # A line at zero almost always means the customer has no agreed rate for
    # that service. Sending it would invoice the work at nothing.
    unpriced = invoice.lines.filter(
        is_deleted=False, line_type=InvoiceLine.LineType.SERVICE, hourly_rate=0)
    if unpriced.exists():
        blockers.append({
            'code': 'NO_RATE',
            'message': f'{unpriced.count()} line(s) have no hourly rate. Set the '
                       'customer’s rate for that service before issuing.',
            'lines': [
                {'id': str(line.pk), 'description': line.description,
                 'reason': ('No service is recorded on the work entry.'
                            if line.work_entry and line.work_entry.service_id is None
                            else 'No CustomerServiceRate is configured for this service.')}
                for line in unpriced[:20]
            ],
        })

    unclassified = invoice.lines.filter(is_deleted=False).exclude(
        vat_classification_status=ClassificationStatus.CLASSIFIED)
    if unclassified.exists():
        blockers.append({
            'code': 'VAT_REQUIRES_REVIEW',
            'message': f'{unclassified.count()} line(s) have no established VAT '
                       'treatment. Resolve them before issuing.',
            'lines': [
                {'id': str(line.pk), 'description': line.description,
                 'reason': line.vat_review_reason}
                for line in unclassified[:20]
            ],
        })

    # Costs and allowances follow the treatment of the work they are billed
    # with. On an invoice that mixes treatments there is no single answer, so
    # the extras stay unresolved — and an invoice must not go out charging a
    # VAT amount the return will not declare.
    if invoice.extras_taxable:
        from apps.vat.constants import VatTreatmentCode

        if invoice.extras_treatment_code() == VatTreatmentCode.UNKNOWN:
            blockers.append({
                'code': 'EXTRAS_TREATMENT_UNRESOLVED',
                'message': (
                    'This invoice bills costs or allowances, but its lines do '
                    'not agree on one VAT treatment, so the treatment of those '
                    'extras cannot be established. Set the treatment on the '
                    'invoice, or split the work across two invoices.'),
            })

    customer = invoice.customer
    if invoice.has_reverse_charged_lines and not (customer.btw_number or '').strip():
        blockers.append({
            'code': 'MISSING_CUSTOMER_VAT_NUMBER',
            'message': 'A reverse-charged invoice must state the customer’s '
                       'BTW number, and this customer has none on file.',
        })

    return blockers


@transaction.atomic
def issue_invoice(invoice, actor=None, issue_date=None):
    """
    Issue the invoice: fix the date, set the due date, render the PDF, post the
    VAT, and stop the figures from moving.
    """
    from apps.core.models import SystemConfig
    from apps.vat.posting import post_invoice

    blockers = issue_blockers(invoice)
    if blockers:
        raise BillingError('; '.join(b['message'] for b in blockers))

    config = SystemConfig.objects.get_config()
    invoice.issue_date = issue_date or timezone.localdate()
    invoice.due_date = invoice.issue_date + timedelta(
        days=config.invoice_payment_terms_days or 14)
    invoice.status = Invoice.Status.SENT
    invoice.updated_by = actor
    invoice.save(update_fields=['issue_date', 'due_date', 'status', 'updated_by',
                                'updated_at'])

    invoice.calculate_totals()
    invoice.refresh_from_db()

    render_pdf(invoice)
    post_invoice(invoice)
    return invoice


def render_pdf(invoice, force=False):
    """Render and store the document. Rendered once unless explicitly forced."""
    from django.core.files.base import ContentFile

    from .pdf import build_invoice_pdf

    if invoice.pdf_file and not force:
        return invoice.pdf_file

    content = build_invoice_pdf(invoice)
    invoice.pdf_file.save(f'{invoice.invoice_number}.pdf',
                          ContentFile(content), save=False)
    invoice.pdf_generated_at = timezone.now()
    invoice.save(update_fields=['pdf_file', 'pdf_generated_at', 'updated_at'])
    return invoice.pdf_file


@transaction.atomic
def record_payment(invoice, amount, *, paid_date=None, actor=None):
    """Record money received. Never rewrites the invoice's own figures."""
    amount = Decimal(amount).quantize(CENT)
    if amount <= 0:
        raise BillingError('A payment must be a positive amount.')

    invoice.amount_paid = (invoice.amount_paid + amount).quantize(CENT)
    invoice.paid_date = paid_date or timezone.localdate()

    if invoice.amount_paid >= invoice.net_of_credits:
        invoice.status = Invoice.Status.PAID
    else:
        invoice.status = Invoice.Status.PARTIALLY_PAID

    invoice.updated_by = actor
    invoice.save(update_fields=['amount_paid', 'paid_date', 'status',
                                'updated_by', 'updated_at'])
    return invoice


def mark_overdue(as_of=None):
    """Flag issued invoices whose due date has passed. Run daily by cron."""
    as_of = as_of or timezone.localdate()
    return Invoice.objects.filter(
        document_type=Invoice.DocumentType.INVOICE,
        status__in=[Invoice.Status.SENT, Invoice.Status.PARTIALLY_PAID],
        due_date__lt=as_of,
        is_deleted=False,
    ).update(status=Invoice.Status.OVERDUE, updated_at=timezone.now())


# ─────────────────────────────────────────────────────────────────────────────
# Credit notes
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def create_credit_note(invoice, *, reason, actor=None, line_ids=None,
                       issue_date=None):
    """
    Credit an issued invoice, in whole or in part.

    The original document is never altered: a credit note is its own numbered
    document with negative lines, pointing back at what it corrects. The VAT
    is posted the same way, so the correction reaches the return.
    """
    if not reason or len(reason.strip()) < 10:
        raise BillingError('A credit note requires a written reason.')
    if invoice.is_credit_note:
        raise BillingError('A credit note cannot itself be credited.')
    if not invoice.is_issued:
        raise BillingError(
            'Only an issued invoice can be credited. Edit or delete the draft instead.')

    source_lines = invoice.lines.filter(is_deleted=False)
    if line_ids:
        source_lines = source_lines.filter(pk__in=line_ids)
    if not source_lines.exists():
        raise BillingError('There are no lines to credit.')

    already = abs(sum(
        (note.total for note in invoice.credit_notes.filter(
            is_deleted=False).exclude(status=Invoice.Status.CANCELLED)),
        Decimal('0.00')))
    if already >= invoice.total and not line_ids:
        raise BillingError(f'{invoice.invoice_number} has already been credited in full.')

    issue_date = issue_date or timezone.localdate()
    note = Invoice.objects.create(
        invoice_number=next_number(DocumentSeries.CREDIT_NOTE, issue_date.year),
        document_type=Invoice.DocumentType.CREDIT_NOTE,
        billing_mode=invoice.billing_mode,
        customer=invoice.customer,
        project=invoice.project,
        corrects=invoice,
        correction_reason=reason.strip(),
        week_year=invoice.week_year,
        week_number=invoice.week_number,
        week_start_date=invoice.week_start_date,
        week_end_date=invoice.week_end_date,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        vat_rate=invoice.vat_rate,
        vat_treatment_code=invoice.vat_treatment_code,
        status=Invoice.Status.SENT,
        issue_date=issue_date,
        due_date=issue_date,
        notes=f'Creditnota bij factuur {invoice.invoice_number}.',
        created_by=actor,
    )
    # The facts follow the original, so the credit lands in the same box.
    for field in ('is_staff_lending_or_subcontracting',
                  'is_physical_work_on_immovable_property',
                  'invoice_states_reverse_charge', 'majority_work_in_own_workshop',
                  'lent_to_subcontractor_working_own_premises',
                  'ancillary_to_goods_sold', 'is_design_work',
                  'is_guarding_or_rental'):
        setattr(note, field, getattr(invoice, field))
    note.save()

    for line in source_lines:
        credit = InvoiceLine(
            invoice=note,
            project=line.project,
            employee=line.employee,
            work_entry=line.work_entry,
            work_date=line.work_date,
            line_type=InvoiceLine.LineType.CREDIT,
            description=f'Creditering: {line.description}',
            quantity_hours=-line.quantity_hours,
            hourly_rate=line.hourly_rate,
            total=-line.total,
            total_is_explicit=True,
            base_amount=-(line.base_amount or Decimal('0.00')),
            surcharge_amount=-(line.surcharge_amount or Decimal('0.00')),
            allowance_amount=-(line.allowance_amount or Decimal('0.00')),
            surcharge_breakdown=line.surcharge_breakdown,
            price_mode=line.price_mode,
            vat_treatment_code=line.vat_treatment_code,
            vat_rate=line.vat_rate,
            net_amount=-(line.net_amount or Decimal('0.00')),
            vat_amount=-(line.vat_amount or Decimal('0.00')),
            gross_amount=-(line.gross_amount or Decimal('0.00')),
            vat_return_box=line.vat_return_box,
            vat_classification_status=line.vat_classification_status,
            vat_review_reason=line.vat_review_reason,
            created_by=actor,
        )
        credit.save()

    note.calculate_totals()
    note.refresh_from_db()

    render_pdf(note)

    from apps.vat.posting import post_invoice
    post_invoice(note)

    # A fully credited invoice is settled, not deleted: the document stands.
    if abs(note.total) >= invoice.total and not line_ids:
        invoice.status = Invoice.Status.CANCELLED
        invoice.internal_notes = (
            f'{invoice.internal_notes}\n'
            f'Credited in full by {note.invoice_number} on {issue_date}: '
            f'{reason.strip()}').strip()
        invoice.save(update_fields=['status', 'internal_notes', 'updated_at'])

    return note
