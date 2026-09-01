"""
Posting classifications into the ledger, and summarising a period.

Posting is idempotent: an entry is keyed on its source, so reprocessing a
document updates its row rather than adding a second one. A locked entry — one
belonging to a finalised period — is never touched.
"""

from decimal import Decimal

from django.db import transaction

from .classification import VatClassificationResult
from .constants import (
    CLOSED_PERIOD_STATUSES, ClassificationStatus, VAT_RULES_VERSION,
)
from .models import VatLedgerEntry, VatPeriod, VatReturnBox, to_cents


class PeriodClosed(Exception):
    """Raised when something tries to write into a finalised period."""


@transaction.atomic
def post(
    result: VatClassificationResult,
    *,
    source_type,
    source_id,
    kind,
    tax_point_date,
    source_line_id='',
    source_reference='',
    invoice_date=None,
    transaction_date=None,
    direction='OUTPUT',
    deductible_percentage=Decimal('100.00'),
    created_by=None,
):
    """
    Write a classification to the ledger, or update the entry already there.

    Under factuurstelsel the period comes from the tax point — the invoice date
    — never from when the invoice was paid.
    """
    period = VatPeriod.for_date(tax_point_date)
    if period.status in CLOSED_PERIOD_STATUSES:
        raise PeriodClosed(
            f'{period} is {period.get_status_display().lower()}. Post a correction '
            'against a later period instead of altering a filed return.'
        )

    existing = VatLedgerEntry.objects.filter(
        source_type=source_type, source_id=str(source_id),
        source_line_id=str(source_line_id or ''), kind=kind, is_deleted=False,
    ).first()

    if existing and existing.is_locked:
        raise PeriodClosed(
            f'Ledger entry {existing.pk} is locked because its period was filed. '
            'Record a correction rather than changing it.'
        )

    # Tag the entry with its box, including 5b. 5a and 5b are *totals* — their
    # value is summed rather than fed in — but tagging each entry is exactly how
    # a total is traced back to the transactions behind it.
    box = None
    if result.return_box_code:
        box = VatReturnBox.objects.filter(code=result.return_box_code).first()

    # Reverse-charge VAT is declared and, when deductible, deducted — the two
    # legs are separate entries so both boxes can be traced independently.
    output_vat = input_vat = Decimal('0.00')
    if not result.requires_review:
        if kind in (VatLedgerEntry.Kind.SALE,):
            output_vat = result.vat_amount
        elif kind in (VatLedgerEntry.Kind.PURCHASE, VatLedgerEntry.Kind.REVERSE_CHARGE_INPUT):
            input_vat = result.vat_amount
        elif kind == VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT:
            output_vat = result.vat_amount

    deductible = to_cents(input_vat * Decimal(deductible_percentage) / Decimal('100'))
    non_deductible = to_cents(input_vat - deductible)

    values = {
        'source_reference': source_reference,
        'invoice_date': invoice_date,
        'transaction_date': transaction_date or tax_point_date,
        'tax_point_date': tax_point_date,
        'period': period,
        'treatment': result.treatment,
        'treatment_code': result.treatment_code,
        'price_mode': result.price_mode,
        'vat_rate': result.vat_rate,
        'taxable_base': result.taxable_base,
        'vat_amount': result.vat_amount,
        'output_vat': output_vat,
        'input_vat': input_vat,
        'deductible_vat': deductible,
        'non_deductible_vat': non_deductible,
        'return_box': box,
        'classification_status': result.status,
        'review_reason': result.reason if result.requires_review else '',
        'calculation_method': result.calculation,
        'rules_version': result.rules_version or VAT_RULES_VERSION,
    }

    if existing:
        for attr, value in values.items():
            setattr(existing, attr, value)
        existing.updated_by = created_by
        existing.save()
        return existing

    return VatLedgerEntry.objects.create(
        source_type=source_type,
        source_id=str(source_id),
        source_line_id=str(source_line_id or ''),
        kind=kind,
        created_by=created_by,
        **values,
    )


def summarise(period):
    """
    Backwards-compatible summary.

    Delegates to apps.vat.returns.calculate_return so there is exactly one
    implementation of the return maths.
    """
    from .returns import calculate_return

    result = calculate_return(period)
    entries = VatLedgerEntry.objects.filter(period=period, is_deleted=False)
    needs_review = entries.filter(
        classification_status=ClassificationStatus.REQUIRES_REVIEW)

    return {
        'period': result['period'],
        'status': result['status'],
        'boxes': {b['code']: b for b in result['boxes'] if b['entry_count']},
        'box_5a_verschuldigde_omzetbelasting': result['box_5a'],
        'box_5b_voorbelasting': result['box_5b'],
        'payable': result['vat_position'],
        'is_refund': result['vat_position'] < 0,
        'entry_count': result['entry_count'],
        'requires_review_count': result['requires_review_count'],
        'requires_review': [
            {'id': str(e.pk), 'source': e.source_reference or e.source_id,
             'reason': e.review_reason}
            for e in needs_review[:50]
        ],
        'rules_version': result['rules_version'],
    }
