"""
VAT classification tests.

The arithmetic is asserted exactly, in Decimal. The behavioural rule under test
throughout is that an unresolved fact produces REQUIRES_REVIEW — never a
fallback of 0%, exempt, or 21%.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.vat.classification import (
    ReverseChargeFacts, VatClassificationResult, classify_amount,
)
from apps.vat.constants import ClassificationStatus, PriceMode, VatTreatmentCode
from apps.vat.models import VatReturnBox, VatTreatment

TODAY = date(2026, 8, 12)


class NormalVatTests(TestCase):
    def test_100_net_at_21_percent(self):
        r = classify_amount(Decimal('100.00'), 'NORMAL', TODAY)
        self.assertEqual(r.status, ClassificationStatus.CLASSIFIED)
        self.assertEqual(r.taxable_base, Decimal('100.00'))
        self.assertEqual(r.vat_amount, Decimal('21.00'))
        self.assertEqual(r.gross_amount, Decimal('121.00'))
        self.assertEqual(r.return_box_code, '1a')

    def test_the_invoice_you_sent_reproduces_exactly(self):
        """F2026-009: 175.00 net at 21% -> 36.75 VAT, 211.75 gross."""
        r = classify_amount(Decimal('175.00'), 'NORMAL', TODAY)
        self.assertEqual(r.vat_amount, Decimal('36.75'))
        self.assertEqual(r.gross_amount, Decimal('211.75'))

    def test_a_vat_inclusive_price_is_split_the_other_way(self):
        r = classify_amount(Decimal('121.00'), 'VAT_INCLUDED', TODAY,
                            price_mode=PriceMode.INCLUDING_VAT)
        self.assertEqual(r.taxable_base, Decimal('100.00'))
        self.assertEqual(r.vat_amount, Decimal('21.00'))
        self.assertEqual(r.gross_amount, Decimal('121.00'))

    def test_the_38_euro_case(self):
        """EUR 38 including 21%: net 31.40, VAT 6.60."""
        r = classify_amount(Decimal('38.00'), 'VAT_INCLUDED', TODAY,
                            price_mode=PriceMode.INCLUDING_VAT)
        self.assertEqual(r.taxable_base, Decimal('31.40'))
        self.assertEqual(r.vat_amount, Decimal('6.60'))
        self.assertEqual(r.taxable_base + r.vat_amount, Decimal('38.00'))

    def test_the_same_38_read_as_exclusive_gives_a_different_answer(self):
        """Which side of the line the price sits on changes the VAT owed."""
        inclusive = classify_amount(Decimal('38.00'), 'VAT_INCLUDED', TODAY,
                                    price_mode=PriceMode.INCLUDING_VAT)
        exclusive = classify_amount(Decimal('38.00'), 'NORMAL', TODAY,
                                    price_mode=PriceMode.EXCLUDING_VAT)
        self.assertEqual(exclusive.vat_amount, Decimal('7.98'))
        self.assertNotEqual(inclusive.vat_amount, exclusive.vat_amount)

    def test_zero_rate_charges_nothing_and_files_in_1e(self):
        r = classify_amount(Decimal('500.00'), 'ZERO_RATE', TODAY)
        self.assertEqual(r.vat_amount, Decimal('0.00'))
        self.assertEqual(r.return_box_code, '1e')

    def test_exempt_charges_nothing(self):
        r = classify_amount(Decimal('500.00'), 'EXEMPT', TODAY)
        self.assertEqual(r.vat_amount, Decimal('0.00'))

    def test_out_of_scope_has_no_box(self):
        r = classify_amount(Decimal('500.00'), 'OUT_OF_SCOPE', TODAY)
        self.assertIsNone(r.return_box_code)

    def test_nine_percent_is_supported_when_activated(self):
        rule = VatTreatment.objects.filter(code='NORMAL', rate=Decimal('9.00')).first()
        rule.is_active = True
        rule.save()
        # The 9% rule is newer, so resolve() picks it only when 21% is retired.
        VatTreatment.objects.filter(code='NORMAL', rate=Decimal('21.00')).update(
            effective_to=date(2026, 1, 1))
        r = classify_amount(Decimal('100.00'), 'NORMAL', TODAY)
        self.assertEqual(r.vat_rate, Decimal('9.00'))
        self.assertEqual(r.vat_amount, Decimal('9.00'))
        self.assertEqual(r.return_box_code, '1b')


class UnknownNeverFallsBackTests(TestCase):
    def test_unknown_treatment_requires_review(self):
        r = classify_amount(Decimal('100.00'), 'UNKNOWN', TODAY)
        self.assertTrue(r.requires_review)
        self.assertEqual(r.vat_amount, Decimal('0.00'))

    def test_a_blank_treatment_requires_review(self):
        self.assertTrue(classify_amount(Decimal('100.00'), '', TODAY).requires_review)

    def test_unknown_is_not_silently_zero_rated(self):
        r = classify_amount(Decimal('100.00'), 'UNKNOWN', TODAY)
        self.assertNotEqual(r.treatment_code, VatTreatmentCode.ZERO_RATE)
        self.assertNotEqual(r.treatment_code, VatTreatmentCode.EXEMPT)
        self.assertIsNone(r.return_box_code)

    def test_a_missing_amount_requires_review(self):
        self.assertTrue(classify_amount(None, 'NORMAL', TODAY).requires_review)

    def test_a_rule_with_no_version_in_force_requires_review(self):
        r = classify_amount(Decimal('100.00'), 'NORMAL', date(2010, 1, 1))
        self.assertTrue(r.requires_review)
        self.assertIn('No VAT rule', r.reason)

    def test_every_review_result_says_why(self):
        for args in ((None, 'NORMAL'), (Decimal('10'), 'UNKNOWN'), (Decimal('10'), '')):
            r = classify_amount(args[0], args[1], TODAY)
            self.assertTrue(r.reason, 'a review result must carry a reason')


def _complete_facts(**overrides):
    facts = ReverseChargeFacts(
        is_staff_lending_or_subcontracting=True,
        is_physical_work_on_immovable_property=True,
        counterparty_vat_number='NL001538146B17',
    )
    for k, v in overrides.items():
        setattr(facts, k, v)
    return facts


class ReverseChargeTests(TestCase):
    def test_inbound_declares_in_2a_and_deducts_in_5b(self):
        """Agency lends staff to CKM: 400 net, 84 declared, 84 deductible, net 0."""
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='INPUT', reverse_charge_facts=_complete_facts())
        self.assertEqual(r.status, ClassificationStatus.CLASSIFIED)
        self.assertEqual(r.taxable_base, Decimal('400.00'))
        self.assertEqual(r.vat_amount, Decimal('84.00'))
        self.assertEqual(r.return_box_code, '2a')

    def test_outbound_files_in_1e_not_1a(self):
        """CKM lends staff for covered work: no VAT charged, reported in 1e."""
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='OUTPUT', reverse_charge_facts=_complete_facts())
        self.assertEqual(r.return_box_code, '1e')
        self.assertNotEqual(r.return_box_code, '1a')
        self.assertEqual(r.vat_amount, Decimal('0.00'))
        self.assertEqual(r.gross_amount, Decimal('400.00'))

    def test_it_is_never_applied_without_the_facts(self):
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='INPUT', reverse_charge_facts=ReverseChargeFacts())
        self.assertTrue(r.requires_review)
        self.assertIn('cannot be established', r.reason)

    def test_non_physical_work_is_not_reverse_charged(self):
        facts = _complete_facts(is_physical_work_on_immovable_property=False)
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='INPUT', reverse_charge_facts=facts)
        self.assertTrue(r.requires_review)
        self.assertIn('physical work', r.reason)

    def test_a_missing_counterparty_vat_number_blocks_it(self):
        facts = _complete_facts(counterparty_vat_number=None)
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='OUTPUT', reverse_charge_facts=facts)
        self.assertTrue(r.requires_review)
        self.assertIn('VAT number', r.reason)

    def test_each_verified_exception_blocks_it(self):
        for attr, fragment in [
            ('majority_work_in_own_workshop', 'own workshop'),
            ('lent_to_subcontractor_working_own_premises', 'own premises'),
            ('ancillary_to_goods_sold', 'ancillary'),
            ('is_design_work', 'design work'),
            ('is_guarding_or_rental', 'guarding or rental'),
        ]:
            with self.subTest(exception=attr):
                r = classify_amount(
                    Decimal('400.00'), 'REVERSE_CHARGE', TODAY, direction='INPUT',
                    reverse_charge_facts=_complete_facts(**{attr: True}))
                self.assertTrue(r.requires_review)
                self.assertIn(fragment, r.reason)

    def test_being_an_agency_is_not_evidence_of_anything(self):
        """
        The rule must come from the transaction, not the counterparty type.
        Facts left unestablished must not resolve just because a supplier is an
        agency — that inference is exactly what the spec forbids.
        """
        facts = ReverseChargeFacts(is_staff_lending_or_subcontracting=True)
        r = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', TODAY,
                            direction='INPUT', reverse_charge_facts=facts)
        self.assertTrue(r.requires_review)


class F2026_009_Tests(TestCase):
    """
    The real invoice: a worker lent to a gardening business, billed at 21%,
    described as "Organisatiewerkzaamheden".

    Whether 21% was right depends on a fact the description does not settle. The
    engine must be able to hold it for review rather than decide.
    """

    def test_the_original_figures_are_reproduced_untouched(self):
        r = classify_amount(Decimal('175.00'), 'NORMAL', date(2026, 8, 12))
        self.assertEqual(r.vat_amount, Decimal('36.75'))
        self.assertEqual(r.return_box_code, '1a')

    def test_flagged_for_review_when_the_nature_of_the_work_is_unstated(self):
        facts = ReverseChargeFacts(
            is_staff_lending_or_subcontracting=True,
            is_physical_work_on_immovable_property=None,
            counterparty_vat_number='NL001538146B17',
        )
        r = classify_amount(Decimal('175.00'), 'REVERSE_CHARGE', date(2026, 8, 12),
                            direction='OUTPUT', reverse_charge_facts=facts)
        self.assertTrue(r.requires_review)
        self.assertIn('physical work on immovable property', r.reason)

    def test_once_established_as_physical_work_it_moves_to_1e(self):
        r = classify_amount(Decimal('175.00'), 'REVERSE_CHARGE', date(2026, 8, 12),
                            direction='OUTPUT', reverse_charge_facts=_complete_facts())
        self.assertEqual(r.return_box_code, '1e')
        self.assertEqual(r.vat_amount, Decimal('0.00'))


class NoForbiddenBoxTests(TestCase):
    def test_5g_is_not_a_box(self):
        self.assertFalse(VatReturnBox.objects.filter(code='5g').exists())

    def test_creating_5g_is_rejected(self):
        from django.core.exceptions import ValidationError
        box = VatReturnBox(code='5g', name='Af te dragen', direction='OUTPUT')
        with self.assertRaises(ValidationError):
            box.full_clean()

    def test_no_treatment_maps_to_a_forbidden_box(self):
        from apps.vat.constants import FORBIDDEN_BOX_CODES
        for rule in VatTreatment.objects.all():
            for box in (rule.output_box, rule.input_box):
                if box:
                    self.assertNotIn(box.code, FORBIDDEN_BOX_CODES)


class DecimalTests(TestCase):
    def test_no_float_leaks_into_the_result(self):
        r = classify_amount(Decimal('33.33'), 'NORMAL', TODAY)
        for value in (r.taxable_base, r.vat_amount, r.gross_amount, r.vat_rate):
            self.assertIsInstance(value, Decimal)

    def test_rounding_is_half_up_at_two_places(self):
        # 0.105 * 100 = 10.50 exactly; 33.33 * 21% = 6.9993 -> 7.00
        self.assertEqual(classify_amount(Decimal('33.33'), 'NORMAL', TODAY).vat_amount,
                         Decimal('7.00'))

    def test_an_inclusive_split_always_reconstitutes_the_gross(self):
        for amount in ('38.00', '121.00', '99.99', '0.01', '1234.56'):
            r = classify_amount(Decimal(amount), 'VAT_INCLUDED', TODAY,
                                price_mode=PriceMode.INCLUDING_VAT)
            self.assertEqual(r.taxable_base + r.vat_amount, Decimal(amount),
                             f'{amount} did not reconstitute')
