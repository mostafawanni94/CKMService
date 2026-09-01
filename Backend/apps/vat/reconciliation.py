"""
Reconciliation: does the ledger still agree with the documents it came from?

Every check reports a difference rather than correcting one. A VAT return that
quietly repairs its own inputs is worse than one that says where it disagrees.
"""

from decimal import Decimal

from django.db.models import Count, Sum

from .constants import ClassificationStatus
from .models import VatLedgerEntry, to_cents

#: Differences at or below this are rounding, not errors. Cent-level drift is
#: expected when a document rounds once and its lines round individually.
TOLERANCE = Decimal('0.02')


class Finding:
    """One reconciliation problem, in terms a person can act on."""

    def __init__(self, code, severity, message, source=None, difference=None):
        self.code = code
        self.severity = severity      # 'error' | 'warning' | 'info'
        self.message = message
        self.source = source
        self.difference = difference

    def as_dict(self):
        return {
            'code': self.code,
            'severity': self.severity,
            'message': self.message,
            'source': self.source,
            'difference': str(self.difference) if self.difference is not None else None,
        }


def check_period(period):
    """Run every check against one VAT period."""
    findings = []
    findings += _check_unclassified(period)
    findings += _check_invoice_totals(period)
    findings += _check_ledger_internal_consistency(period)
    findings += _check_orphans(period)
    findings += _check_duplicates(period)
    findings += _check_finalized_sources_unchanged(period)
    return findings


def _check_unclassified(period):
    unresolved = VatLedgerEntry.objects.filter(
        period=period, is_deleted=False,
        classification_status=ClassificationStatus.REQUIRES_REVIEW)
    count = unresolved.count()
    if not count:
        return []
    return [Finding(
        'REQUIRES_REVIEW', 'error',
        f'{count} transaction{"s" if count != 1 else ""} could not be classified '
        f'and must be resolved before this period is filed.',
    )]


def _check_invoice_totals(period):
    """An invoice's own VAT should equal the sum of its lines' VAT."""
    from apps.invoices.models import Invoice

    findings = []
    invoice_ids = set(
        VatLedgerEntry.objects.filter(
            period=period, source_type='InvoiceLine', is_deleted=False)
        .values_list('source_id', flat=True))

    for invoice in Invoice.objects.filter(pk__in=invoice_ids).prefetch_related('lines'):
        line_vat = sum(
            (line.vat_amount or Decimal('0.00')) for line in invoice.lines.all())
        difference = to_cents(Decimal(line_vat) - (invoice.vat_amount or Decimal('0.00')))
        if abs(difference) > TOLERANCE:
            findings.append(Finding(
                'INVOICE_VAT_MISMATCH', 'error',
                f'Invoice {invoice.invoice_number}: the sum of line VAT differs from '
                f'the invoice VAT by {difference}. The issued invoice has not been '
                f'changed — decide which figure is correct.',
                source=invoice.invoice_number, difference=difference,
            ))
    return findings


def _check_ledger_internal_consistency(period):
    """Base x rate should reproduce the VAT on every classified entry."""
    findings = []
    entries = VatLedgerEntry.objects.filter(
        period=period, is_deleted=False,
        classification_status=ClassificationStatus.CLASSIFIED,
    ).exclude(vat_rate=Decimal('0.00'))

    for entry in entries.iterator():
        # Reverse-charge sales carry a base but charge no VAT; that is correct.
        if entry.kind == VatLedgerEntry.Kind.SALE and entry.vat_amount == 0 and \
                entry.treatment and entry.treatment.is_reverse_charge:
            continue
        expected = to_cents(entry.taxable_base * entry.vat_rate / Decimal('100'))
        difference = to_cents(entry.vat_amount - expected)
        if abs(difference) > TOLERANCE:
            findings.append(Finding(
                'VAT_AMOUNT_INCONSISTENT', 'error',
                f'{entry.source_reference or entry.source_id}: VAT of {entry.vat_amount} '
                f'does not match {entry.taxable_base} at {entry.vat_rate}% '
                f'(expected {expected}).',
                source=entry.source_reference, difference=difference,
            ))
    return findings


def _check_orphans(period):
    """A ledger entry whose source document has gone."""
    from django.apps import apps as dj

    findings = []
    models = {
        'InvoiceLine': ('invoices', 'Invoice'),
        'AgencyInvoice': ('invoices', 'AgencyInvoice'),
        'IncomingInvoice': ('invoices', 'IncomingInvoice'),
        'Expense': ('expenses', 'Expense'),
    }
    for source_type, (app_label, model_name) in models.items():
        Model = dj.get_model(app_label, model_name)
        ids = set(
            VatLedgerEntry.objects.filter(
                period=period, source_type=source_type, is_deleted=False)
            .values_list('source_id', flat=True))
        if not ids:
            continue
        existing = {str(pk) for pk in
                    Model.objects.filter(pk__in=ids).values_list('pk', flat=True)}
        for missing in ids - existing:
            findings.append(Finding(
                'ORPHAN_LEDGER_ENTRY', 'error',
                f'A ledger entry references {source_type} {missing}, which no longer '
                f'exists. It was not removed automatically.',
                source=missing,
            ))
    return findings


def _check_duplicates(period):
    """
    Possible duplicate purchase documents.

    Flagged, never removed: two invoices from one supplier on one day for one
    amount are usually a mistake, but occasionally genuine.
    """
    from apps.invoices.models import IncomingInvoice

    findings = []
    groups = (
        IncomingInvoice.objects
        .filter(invoice_date__range=(period.start_date, period.end_date), is_deleted=False)
        .values('vendor_name', 'invoice_number')
        .annotate(count=Count('id'))
        .filter(count__gt=1)
    )
    for group in groups:
        findings.append(Finding(
            'POSSIBLE_DUPLICATE', 'warning',
            f'{group["count"]} incoming invoices share vendor "{group["vendor_name"]}" '
            f'and number "{group["invoice_number"]}". Confirm before filing.',
            source=group['invoice_number'],
        ))

    amount_groups = (
        IncomingInvoice.objects
        .filter(invoice_date__range=(period.start_date, period.end_date), is_deleted=False)
        .values('vendor_name', 'invoice_date', 'total')
        .annotate(count=Count('id'))
        .filter(count__gt=1)
    )
    for group in amount_groups:
        findings.append(Finding(
            'POSSIBLE_DUPLICATE', 'warning',
            f'{group["count"]} invoices from "{group["vendor_name"]}" on '
            f'{group["invoice_date"]} for {group["total"]}. Possible duplicate.',
            source=group['vendor_name'],
        ))
    return findings


def _check_finalized_sources_unchanged(period):
    """
    A source edited after its period was filed.

    The filed figures are not rewritten; the discrepancy is raised so it can be
    corrected through the proper mechanism.
    """
    if not period.is_closed or not period.finalized_at:
        return []

    changed = VatLedgerEntry.objects.filter(
        period=period, is_deleted=False, updated_at__gt=period.finalized_at)
    if not changed.exists():
        return []

    return [Finding(
        'SOURCE_CHANGED_AFTER_FILING', 'error',
        f'{changed.count()} ledger entries changed after {period} was filed. '
        f'The filed figures were not altered; post a correction instead.',
    )]


def status_for(period):
    """A compact reconciliation verdict for a period."""
    findings = check_period(period)
    errors = [f for f in findings if f.severity == 'error']
    warnings = [f for f in findings if f.severity == 'warning']
    return {
        'period': str(period),
        'is_clean': not errors,
        'error_count': len(errors),
        'warning_count': len(warnings),
        'findings': [f.as_dict() for f in findings],
    }
