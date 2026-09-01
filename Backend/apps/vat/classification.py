"""
VAT classification.

Turns transaction facts into a treatment, a rate, an amount and a return box —
together with the reason it reached that conclusion. When the facts do not
support a conclusion the result is REQUIRES_REVIEW, never a fallback rate.

The reverse-charge rules encoded here follow Belastingdienst guidance for
onderaanneming and personeel uitlenen. That scheme covers cleaning companies for
physical work on immovable property, which is CKM's situation, so the engine has
to handle it in both directions. What it must not do is infer it: an invoice
being from an agency proves nothing about whether the conditions are met.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from .constants import (
    ClassificationStatus, PriceMode, VAT_RULES_VERSION, VatTreatmentCode,
)
from .models import VatReturnBox, VatTreatment, to_cents


@dataclass
class VatClassificationResult:
    """The outcome of classifying one amount, with its justification."""

    treatment_code: str
    status: str
    taxable_base: Decimal = Decimal('0.00')
    vat_amount: Decimal = Decimal('0.00')
    vat_rate: Decimal = Decimal('0.00')
    gross_amount: Decimal = Decimal('0.00')
    return_box_code: Optional[str] = None
    price_mode: str = PriceMode.EXCLUDING_VAT
    treatment: Optional[VatTreatment] = None
    reason: str = ''
    calculation: str = ''
    rules_version: str = VAT_RULES_VERSION
    warnings: list = field(default_factory=list)

    @property
    def requires_review(self):
        return self.status == ClassificationStatus.REQUIRES_REVIEW


@dataclass
class ReverseChargeFacts:
    """
    What has to be known before reverse charge can be applied.

    Every field is a tri-state: True, False, or None for "not established".
    None is what produces REQUIRES_REVIEW — it is the difference between
    "we know this is not physical work" and "nobody has said".
    """

    is_staff_lending_or_subcontracting: Optional[bool] = None
    is_physical_work_on_immovable_property: Optional[bool] = None
    counterparty_vat_number: Optional[str] = None
    counterparty_country: Optional[str] = 'Netherlands'

    # The verified exceptions. True means the exception applies, so the scheme
    # does NOT.
    majority_work_in_own_workshop: Optional[bool] = False
    lent_to_subcontractor_working_own_premises: Optional[bool] = False
    ancillary_to_goods_sold: Optional[bool] = False
    is_design_work: Optional[bool] = False
    is_guarding_or_rental: Optional[bool] = False

    def unresolved(self):
        """Facts that must be established before a conclusion is possible."""
        missing = []
        if self.is_staff_lending_or_subcontracting is None:
            missing.append('whether this is staff lending or subcontracting')
        if self.is_physical_work_on_immovable_property is None:
            missing.append('whether the work is physical work on immovable property')
        return missing

    def triggered_exceptions(self):
        checks = [
            (self.majority_work_in_own_workshop,
             'more than half the work is done in the supplier\'s own workshop'),
            (self.lent_to_subcontractor_working_own_premises,
             'staff are lent to a subcontractor working mainly on their own premises'),
            (self.ancillary_to_goods_sold,
             'the work is ancillary to goods sold to the contractor'),
            (self.is_design_work, 'the work is design work'),
            (self.is_guarding_or_rental, 'the service is guarding or rental'),
        ]
        return [text for applies, text in checks if applies is True]

    def unknown_exceptions(self):
        names = {
            'majority_work_in_own_workshop': 'work location',
            'lent_to_subcontractor_working_own_premises': 'the recipient\'s working premises',
            'ancillary_to_goods_sold': 'whether the work is ancillary to a sale',
            'is_design_work': 'whether this is design work',
            'is_guarding_or_rental': 'whether this is guarding or rental',
        }
        return [label for attr, label in names.items() if getattr(self, attr) is None]


def _box(code):
    return VatReturnBox.objects.filter(code=code, is_active=True).first()


def _split(amount, rate, price_mode):
    """
    Split an amount into net and VAT.

    Which side of the line the given amount sits on is a stated fact, never
    inferred: reading a gross price as net silently changes the VAT owed.
    """
    amount = Decimal(amount)
    rate = Decimal(rate)

    if price_mode == PriceMode.INCLUDING_VAT and rate > 0:
        net = to_cents(amount / (Decimal('1') + rate / Decimal('100')))
        vat = to_cents(amount - net)
        return net, vat, to_cents(amount)

    net = to_cents(amount)
    vat = to_cents(net * rate / Decimal('100'))
    return net, vat, to_cents(net + vat)


def review(reason, amount=Decimal('0.00'), price_mode=PriceMode.EXCLUDING_VAT):
    """A classification that refuses to conclude, with the reason recorded."""
    return VatClassificationResult(
        treatment_code=VatTreatmentCode.UNKNOWN,
        status=ClassificationStatus.REQUIRES_REVIEW,
        taxable_base=to_cents(amount),
        gross_amount=to_cents(amount),
        price_mode=price_mode,
        reason=reason,
        calculation='No VAT computed: the treatment is unresolved.',
    )


def classify_amount(
    amount,
    treatment_code,
    on_date,
    price_mode=PriceMode.EXCLUDING_VAT,
    direction='OUTPUT',
    reverse_charge_facts=None,
    counterparty_vat_number=None,
):
    """
    Classify one amount.

    `direction` is OUTPUT for something CKM sells and INPUT for something it
    buys; it decides which box a reverse-charge entry lands in.
    """
    if amount is None:
        return review('No amount was supplied.')

    if treatment_code in (VatTreatmentCode.UNKNOWN, None, ''):
        return review(
            'VAT treatment has not been set for this line.',
            amount, price_mode)

    rule = VatTreatment.resolve(treatment_code, on_date)
    if rule is None:
        return review(
            f'No VAT rule is configured for "{treatment_code}" on {on_date}.',
            amount, price_mode)

    if rule.requires_review:
        return review(
            f'The rule "{rule.name}" always requires review.', amount, price_mode)

    # --- reverse charge ----------------------------------------------------
    if rule.is_reverse_charge:
        facts = reverse_charge_facts or ReverseChargeFacts()

        missing = facts.unresolved()
        if missing:
            return review(
                'Reverse charge cannot be established: ' + '; '.join(missing) + '.',
                amount, price_mode)

        if not facts.is_staff_lending_or_subcontracting:
            return review(
                'Marked as reverse charge, but the transaction is not recorded as '
                'staff lending or subcontracting.', amount, price_mode)

        if not facts.is_physical_work_on_immovable_property:
            return review(
                'Marked as reverse charge, but the work is not recorded as physical '
                'work on immovable property, which the scheme requires.',
                amount, price_mode)

        exceptions = facts.triggered_exceptions()
        if exceptions:
            return review(
                'An exception to the reverse-charge scheme applies: '
                + '; '.join(exceptions) + '. The supply is not reverse charged.',
                amount, price_mode)

        unknown = facts.unknown_exceptions()
        vat_number = counterparty_vat_number or facts.counterparty_vat_number
        if not vat_number:
            return review(
                'Reverse charge requires the counterparty VAT number, which is missing.',
                amount, price_mode)

        # Under reverse charge the supplier charges nothing; the base is the net.
        net = to_cents(amount)
        rc_vat = to_cents(net * rule.rate / Decimal('100'))
        box = _box('2a') if direction == 'INPUT' else _box('1e')

        result = VatClassificationResult(
            treatment_code=rule.code,
            status=ClassificationStatus.CLASSIFIED,
            taxable_base=net,
            vat_amount=rc_vat if direction == 'INPUT' else Decimal('0.00'),
            vat_rate=rule.rate,
            gross_amount=net,
            return_box_code=box.code if box else None,
            price_mode=PriceMode.EXCLUDING_VAT,
            treatment=rule,
            reason=('VAT is reverse charged to the recipient.'
                    if direction == 'OUTPUT'
                    else 'VAT was reverse charged to CKM by the supplier.'),
            calculation=(
                f'Net {net}; no VAT charged on the invoice. '
                + (f'CKM declares {rc_vat} in 2a at {rule.rate}% and may deduct the '
                   f'same amount in 5b, a net effect of 0.00.'
                   if direction == 'INPUT'
                   else f'Reported in 1e; the customer declares the VAT.')
            ),
        )
        if unknown:
            result.warnings.append(
                'Not established: ' + '; '.join(unknown) + '.')
        return result

    # --- everything else ---------------------------------------------------
    net, vat, gross = _split(amount, rule.rate, price_mode)

    if direction == 'OUTPUT':
        box = rule.output_box
    else:
        box = rule.input_box or _box('5b')

    basis = ('the price includes VAT, so the net is the price divided by '
             f'1 + {rule.rate}%'
             if price_mode == PriceMode.INCLUDING_VAT
             else f'the price excludes VAT, so VAT is {rule.rate}% of the net')

    return VatClassificationResult(
        treatment_code=rule.code,
        status=ClassificationStatus.CLASSIFIED,
        taxable_base=net,
        vat_amount=vat,
        vat_rate=rule.rate,
        gross_amount=gross,
        return_box_code=box.code if box else None,
        price_mode=price_mode,
        treatment=rule,
        reason=rule.name,
        calculation=f'Net {net}, VAT {vat}, gross {gross} — {basis}.',
    )
