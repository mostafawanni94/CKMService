"""
Corrections to a filed period.

A filed return is never edited. A correction is a new ledger entry, in an open
period, carrying the offsetting amounts and a reference back to what it
corrects. The original stays exactly as filed, and both are visible.
"""

from decimal import Decimal

from django.db import transaction

from .constants import ClassificationStatus, VAT_RULES_VERSION
from .models import VatLedgerEntry, VatPeriod, VatPeriodEvent, to_cents


class CorrectionError(Exception):
    pass


@transaction.atomic
def post_correction(original_entry, *, actor, reason, correction_date,
                    taxable_base=None, vat_amount=None):
    """
    Post a correction against an existing ledger entry.

    By default this reverses the original in full. Supplying amounts posts a
    partial adjustment instead — for a rate that was wrong rather than a
    transaction that should not have been there.

    The correction lands in whatever period `correction_date` falls in, which
    must be open. Nothing about the original entry changes.
    """
    if not reason or len(reason.strip()) < 10:
        raise CorrectionError('A correction requires a written reason.')

    target_period = VatPeriod.for_date(correction_date)
    if target_period.is_closed:
        raise CorrectionError(
            f'{target_period} is closed. Post the correction to an open period.')

    base = to_cents(taxable_base) if taxable_base is not None else -original_entry.taxable_base
    vat = to_cents(vat_amount) if vat_amount is not None else -original_entry.vat_amount

    # Mirror the original's side so the correction lands in the same box.
    is_output = original_entry.output_vat != 0 or original_entry.kind in (
        VatLedgerEntry.Kind.SALE, VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT)

    correction = VatLedgerEntry.objects.create(
        source_type='Correction',
        source_id=str(original_entry.pk),
        source_line_id='',
        source_reference=f'Correction of {original_entry.source_reference or original_entry.source_id}',
        kind=VatLedgerEntry.Kind.CORRECTION,
        invoice_date=original_entry.invoice_date,
        transaction_date=correction_date,
        tax_point_date=correction_date,
        period=target_period,
        treatment=original_entry.treatment,
        treatment_code=original_entry.treatment_code,
        price_mode=original_entry.price_mode,
        vat_rate=original_entry.vat_rate,
        taxable_base=base,
        vat_amount=vat,
        output_vat=vat if is_output else Decimal('0.00'),
        input_vat=Decimal('0.00') if is_output else vat,
        deductible_vat=Decimal('0.00') if is_output else vat,
        return_box=original_entry.return_box,
        classification_status=ClassificationStatus.MANUALLY_RESOLVED,
        calculation_method=(
            f'Correction of ledger entry {original_entry.pk} '
            f'(filed in {original_entry.period}). Reason: {reason.strip()}'),
        rules_version=VAT_RULES_VERSION,
        created_by=actor,
    )

    VatPeriodEvent.objects.create(
        period=target_period,
        event=VatPeriodEvent.Event.CORRECTION_POSTED,
        detail=(f'Correction of {original_entry.source_reference or original_entry.pk} '
                f'from {original_entry.period}: base {base}, VAT {vat}. {reason.strip()}'),
        actor=actor,
    )

    return correction
