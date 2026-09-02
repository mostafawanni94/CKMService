"""
Post source documents into the VAT ledger.

Every function here is idempotent and reads the source without changing it. An
issued invoice keeps the figures it was issued with: the ledger records how the
VAT *should* be treated, and a disagreement surfaces as a reconciliation
difference or a review item — never as a silent edit to the document.
"""

import logging
from decimal import Decimal

from django.db import transaction

from .classification import classify_amount, review
from .constants import ClassificationStatus, PriceMode, VatTreatmentCode
from .ledger import PeriodClosed, post
from .models import VatLedgerEntry, to_cents

logger = logging.getLogger(__name__)


class PostingResult:
    """What happened when a document was posted."""

    def __init__(self):
        self.entries = []
        self.skipped = []
        self.errors = []

    @property
    def requires_review_count(self):
        return sum(1 for e in self.entries if e.requires_review)

    def __repr__(self):
        return (f'<PostingResult entries={len(self.entries)} '
                f'review={self.requires_review_count} errors={len(self.errors)}>')


def _deductible_or_review(document, fallback, result):
    """
    Resolve deductibility, or turn the classification into a review item.

    Full deduction is never assumed. A purchase whose deductibility nobody has
    stated is held, because guessing 100% overstates voorbelasting.
    """
    percentage = document.effective_deductible_percentage(fallback)
    if percentage is None:
        return None, review(
            'Input VAT deductibility has not been established for this document. '
            'Set it on the document or on its category.',
            result.taxable_base + result.vat_amount)
    return percentage, result


# =============================================================================
# CUSTOMER INVOICES  (output VAT)
# =============================================================================

@transaction.atomic
def post_invoice(invoice, created_by=None):
    """
    Post a customer invoice: one ledger entry per line, plus one for the extras.

    The line is the classification unit: CKM can bill ordinary cleaning at 21%
    and lend a worker for covered work on the same invoice, and those belong in
    different boxes.

    Costs and allowances billed alongside the work are posted too. They used to
    be charged to the customer and left out of the ledger entirely, so an
    invoice with billed transport collected VAT that the return never declared.
    """
    outcome = PostingResult()
    tax_point = invoice.issue_date or invoice.week_start_date
    if tax_point is None:
        outcome.errors.append('The invoice has no date, so it has no tax point.')
        return outcome

    customer = invoice.customer
    lines = list(invoice.lines.all().select_related('project', 'employee', 'work_entry'))

    if not lines:
        outcome.skipped.append('The invoice has no lines.')
        return outcome

    for line in lines:
        amount = line.total or Decimal('0.00')
        treatment = line.effective_treatment_code(fallback=invoice)
        price_mode = line.price_mode or PriceMode.EXCLUDING_VAT

        # Facts are read from the line first, falling back to the invoice: the
        # treatment is per service, but the circumstances usually describe the
        # engagement as a whole. The customer's BTW number is required on a
        # reverse-charged invoice by law.
        facts = line.build_reverse_charge_facts(
            counterparty_vat_number=getattr(customer, 'btw_number', None),
            fallback=invoice,
        )

        result = classify_amount(
            amount, treatment, tax_point,
            price_mode=price_mode, direction='OUTPUT',
            reverse_charge_facts=facts,
            counterparty_vat_number=getattr(customer, 'btw_number', None),
        )

        try:
            entry = post(
                result,
                source_type='InvoiceLine',
                source_id=invoice.pk,
                source_line_id=line.pk,
                kind=VatLedgerEntry.Kind.SALE,
                tax_point_date=tax_point,
                invoice_date=invoice.issue_date,
                source_reference=invoice.invoice_number,
                direction='OUTPUT',
                created_by=created_by,
            )
        except PeriodClosed as exc:
            outcome.errors.append(str(exc))
            continue

        # Mirror the outcome onto the line so the dashboard can show it without
        # joining the ledger. The invoice's own issued totals are untouched.
        line.vat_rate = result.vat_rate
        line.net_amount = result.taxable_base
        line.vat_amount = result.vat_amount
        line.gross_amount = result.gross_amount
        line.vat_return_box = result.return_box_code or ''
        line.vat_classification_status = result.status
        line.vat_review_reason = result.reason if result.requires_review else ''
        line.save(update_fields=[
            'vat_rate', 'net_amount', 'vat_amount', 'gross_amount',
            'vat_return_box', 'vat_classification_status', 'vat_review_reason',
            'updated_at',
        ])
        outcome.entries.append(entry)

    _post_invoice_extras(invoice, tax_point, customer, outcome, created_by)
    return outcome


def _post_invoice_extras(invoice, tax_point, customer, outcome, created_by):
    """
    Post the costs and allowances billed alongside the work.

    They are part of the same supply, so they carry the invoice's treatment:
    reverse charged with it, or taxed with it. One entry, because they are one
    amount on the document rather than separate services.

    Gratuities are deliberately excluded — a tip passed through to staff is not
    consideration for CKM's supply. See `Invoice.extras_taxable`.
    """
    taxable = invoice.extras_taxable
    if not taxable:
        return

    # The same rule the invoice totals use, so the document and the ledger
    # cannot disagree about the extras.
    treatment = invoice.extras_treatment_code()

    # The facts are frozen onto the lines when the invoice is generated, so the
    # extras inherit them from the supply they were billed with.
    facts = invoice.build_reverse_charge_facts(
        counterparty_vat_number=getattr(customer, 'btw_number', None),
        fallback=invoice.extras_facts_source(),
    )

    result = classify_amount(
        taxable, treatment, tax_point,
        price_mode=PriceMode.EXCLUDING_VAT, direction='OUTPUT',
        reverse_charge_facts=facts,
        counterparty_vat_number=getattr(customer, 'btw_number', None),
    )

    try:
        entry = post(
            result,
            source_type='InvoiceExtras',
            source_id=invoice.pk,
            source_line_id='extras',
            kind=VatLedgerEntry.Kind.SALE,
            tax_point_date=tax_point,
            invoice_date=invoice.issue_date,
            source_reference=f'{invoice.invoice_number} (kosten en toeslagen)',
            direction='OUTPUT',
            created_by=created_by,
        )
    except PeriodClosed as exc:
        outcome.errors.append(str(exc))
        return

    outcome.entries.append(entry)


# =============================================================================
# AGENCY INVOICES  (input VAT, possibly reverse charged)
# =============================================================================

@transaction.atomic
def post_agency_invoice(agency_invoice, created_by=None):
    """
    Post an agency invoice.

    Reverse charge is decided from the facts, never from the counterparty being
    an agency. Where it applies, two entries are written — the VAT declared in
    2a and the VAT deducted in 5b — so both legs can be traced independently
    even though they net to zero.
    """
    outcome = PostingResult()
    tax_point = agency_invoice.issue_date
    if tax_point is None:
        outcome.errors.append('The agency invoice has no issue date.')
        return outcome

    agency = agency_invoice.agency
    treatment = agency_invoice.effective_treatment_code(fallback=agency)
    facts = agency_invoice.build_reverse_charge_facts(
        counterparty_vat_number=getattr(agency, 'btw_number', None),
        fallback=agency,
    )

    base = agency_invoice.subtotal or Decimal('0.00')
    result = classify_amount(
        base, treatment, tax_point,
        price_mode=PriceMode.EXCLUDING_VAT,
        direction='INPUT',
        reverse_charge_facts=facts,
        counterparty_vat_number=getattr(agency, 'btw_number', None),
    )

    # An invoice that says "btw verlegd" while being classified as normal VAT is
    # a contradiction worth a human's attention.
    if (agency_invoice.invoice_states_reverse_charge
            and result.treatment_code == VatTreatmentCode.NORMAL):
        result = review(
            'The invoice states "btw verlegd" but is classified as normal VAT. '
            'Confirm which is correct before filing.', base)

    is_reverse_charge = (
        result.treatment.is_reverse_charge if result.treatment else False)

    percentage, result = _deductible_or_review(agency_invoice, agency, result)
    if percentage is None:
        percentage = Decimal('0.00')

    kinds = (
        [VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT, VatLedgerEntry.Kind.REVERSE_CHARGE_INPUT]
        if is_reverse_charge and not result.requires_review
        else [VatLedgerEntry.Kind.PURCHASE]
    )

    for kind in kinds:
        try:
            outcome.entries.append(post(
                result,
                source_type='AgencyInvoice',
                source_id=agency_invoice.pk,
                kind=kind,
                tax_point_date=tax_point,
                invoice_date=agency_invoice.issue_date,
                source_reference=agency_invoice.invoice_number,
                direction='INPUT',
                deductible_percentage=percentage,
                created_by=created_by,
            ))
        except PeriodClosed as exc:
            outcome.errors.append(str(exc))

    return outcome


# =============================================================================
# INCOMING (SUPPLIER) INVOICES
# =============================================================================

@transaction.atomic
def post_incoming_invoice(incoming, created_by=None):
    outcome = PostingResult()
    tax_point = incoming.invoice_date
    if tax_point is None:
        outcome.errors.append('The incoming invoice has no invoice date.')
        return outcome

    fallback = incoming.agency
    treatment = incoming.effective_treatment_code(fallback=fallback)
    facts = incoming.build_reverse_charge_facts(
        counterparty_vat_number=incoming.vendor_vat_number or
                                getattr(fallback, 'btw_number', None),
        fallback=fallback,
    )

    result = classify_amount(
        incoming.subtotal or Decimal('0.00'), treatment, tax_point,
        price_mode=PriceMode.EXCLUDING_VAT, direction='INPUT',
        reverse_charge_facts=facts,
        counterparty_vat_number=incoming.vendor_vat_number,
    )

    percentage, result = _deductible_or_review(incoming, incoming.category, result)
    if percentage is None:
        percentage = Decimal('0.00')

    is_reverse_charge = result.treatment.is_reverse_charge if result.treatment else False
    kinds = (
        [VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT, VatLedgerEntry.Kind.REVERSE_CHARGE_INPUT]
        if is_reverse_charge and not result.requires_review
        else [VatLedgerEntry.Kind.PURCHASE]
    )

    for kind in kinds:
        try:
            outcome.entries.append(post(
                result,
                source_type='IncomingInvoice',
                source_id=incoming.pk,
                kind=kind,
                tax_point_date=tax_point,
                invoice_date=incoming.invoice_date,
                source_reference=f'{incoming.vendor_name} {incoming.invoice_number}',
                direction='INPUT',
                deductible_percentage=percentage,
                created_by=created_by,
            ))
        except PeriodClosed as exc:
            outcome.errors.append(str(exc))

    return outcome


# =============================================================================
# EXPENSES
# =============================================================================

@transaction.atomic
def post_expense(expense, created_by=None):
    outcome = PostingResult()
    tax_point = expense.expense_date
    if tax_point is None:
        outcome.errors.append('The expense has no date.')
        return outcome

    category = expense.category
    treatment = expense.effective_treatment_code(fallback=category)

    result = classify_amount(
        expense.amount_excl_vat or Decimal('0.00'), treatment, tax_point,
        price_mode=PriceMode.EXCLUDING_VAT, direction='INPUT',
    )

    percentage, result = _deductible_or_review(expense, category, result)
    if percentage is None:
        percentage = Decimal('0.00')

    try:
        outcome.entries.append(post(
            result,
            source_type='Expense',
            source_id=expense.pk,
            kind=VatLedgerEntry.Kind.PURCHASE,
            tax_point_date=tax_point,
            invoice_date=expense.expense_date,
            source_reference=f'{expense.vendor_name} {expense.reference_number}'.strip(),
            direction='INPUT',
            deductible_percentage=percentage,
            created_by=created_by,
        ))
    except PeriodClosed as exc:
        outcome.errors.append(str(exc))

    return outcome


# =============================================================================
# BULK
# =============================================================================

SOURCE_POSTERS = {
    'Invoice': post_invoice,
    'AgencyInvoice': post_agency_invoice,
    'IncomingInvoice': post_incoming_invoice,
    'Expense': post_expense,
}


def post_all(start_date=None, end_date=None, created_by=None):
    """Post every source document in a date range. Safe to re-run."""
    from apps.expenses.models import Expense
    from apps.invoices.models import AgencyInvoice, IncomingInvoice, Invoice

    combined = PostingResult()
    querysets = [
        (Invoice.objects.all(), 'issue_date', post_invoice),
        (AgencyInvoice.objects.all(), 'issue_date', post_agency_invoice),
        (IncomingInvoice.objects.all(), 'invoice_date', post_incoming_invoice),
        (Expense.objects.all(), 'expense_date', post_expense),
    ]

    for queryset, date_field, poster in querysets:
        if start_date:
            queryset = queryset.filter(**{f'{date_field}__gte': start_date})
        if end_date:
            queryset = queryset.filter(**{f'{date_field}__lte': end_date})
        for document in queryset.iterator():
            outcome = poster(document, created_by=created_by)
            combined.entries.extend(outcome.entries)
            combined.skipped.extend(outcome.skipped)
            combined.errors.extend(outcome.errors)

    return combined
