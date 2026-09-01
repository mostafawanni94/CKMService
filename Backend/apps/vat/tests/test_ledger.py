"""Ledger tests: periods, idempotency, immutability and the derived totals."""

from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.core.testing import make_user
from apps.vat.classification import ReverseChargeFacts, classify_amount
from apps.vat.constants import ClassificationStatus, PriceMode, VatPeriodStatus
from apps.vat.ledger import PeriodClosed, post, summarise
from apps.vat.models import VatLedgerEntry, VatPeriod

Q3 = date(2026, 8, 12)


def _post_sale(amount='100.00', ref='INV-1', on=Q3, treatment='NORMAL', line=''):
    result = classify_amount(Decimal(amount), treatment, on)
    return post(result, source_type='Invoice', source_id=ref, source_line_id=line,
                kind=VatLedgerEntry.Kind.SALE, tax_point_date=on,
                invoice_date=on, source_reference=ref, direction='OUTPUT')


class PeriodTests(TestCase):
    def test_a_tax_point_lands_in_the_right_quarter(self):
        for day, quarter in [(date(2026, 1, 1), 1), (date(2026, 3, 31), 1),
                             (date(2026, 4, 1), 2), (date(2026, 6, 30), 2),
                             (date(2026, 7, 1), 3), (date(2026, 9, 30), 3),
                             (date(2026, 10, 1), 4), (date(2026, 12, 31), 4)]:
            with self.subTest(day=day):
                self.assertEqual(VatPeriod.for_date(day).quarter, quarter)

    def test_the_invoice_date_decides_the_period_not_the_payment_date(self):
        """
        Factuurstelsel. An invoice dated 30 September paid in October belongs to
        Q3, and nothing about the payment moves it.
        """
        entry = _post_sale(on=date(2026, 9, 30), ref='INV-Q3')
        self.assertEqual(entry.period.quarter, 3)
        self.assertEqual(entry.tax_point_date, date(2026, 9, 30))

    def test_a_quarter_boundary_does_not_leak(self):
        september = _post_sale(on=date(2026, 9, 30), ref='INV-SEP')
        october = _post_sale(on=date(2026, 10, 1), ref='INV-OCT')
        self.assertNotEqual(september.period_id, october.period_id)


class IdempotencyTests(TestCase):
    def test_posting_the_same_source_twice_updates_one_entry(self):
        first = _post_sale(ref='INV-2')
        second = _post_sale(ref='INV-2')
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(VatLedgerEntry.objects.filter(source_id='INV-2').count(), 1)

    def test_ten_runs_produce_one_entry_and_a_stable_total(self):
        for _ in range(10):
            _post_sale(ref='INV-3')
        self.assertEqual(VatLedgerEntry.objects.filter(source_id='INV-3').count(), 1)
        self.assertEqual(
            VatLedgerEntry.objects.get(source_id='INV-3').vat_amount, Decimal('21.00'))

    def test_separate_lines_of_one_invoice_are_separate_entries(self):
        _post_sale(ref='INV-4', line='a')
        _post_sale(ref='INV-4', line='b')
        self.assertEqual(VatLedgerEntry.objects.filter(source_id='INV-4').count(), 2)

    def test_a_changed_amount_corrects_rather_than_duplicates(self):
        _post_sale(amount='100.00', ref='INV-5')
        _post_sale(amount='200.00', ref='INV-5')
        entries = VatLedgerEntry.objects.filter(source_id='INV-5')
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().vat_amount, Decimal('42.00'))


class ImmutabilityTests(TestCase):
    def test_a_finalized_period_refuses_new_postings(self):
        entry = _post_sale(ref='INV-6')
        period = entry.period
        period.status = VatPeriodStatus.FINALIZED
        period.save()

        with self.assertRaises(PeriodClosed):
            _post_sale(ref='INV-7', on=Q3)

    def test_a_locked_entry_cannot_be_rewritten(self):
        entry = _post_sale(ref='INV-8')
        entry.is_locked = True
        entry.save()

        with self.assertRaises(PeriodClosed):
            _post_sale(amount='999.00', ref='INV-8')

        entry.refresh_from_db()
        self.assertEqual(entry.vat_amount, Decimal('21.00'))


class SummaryTests(TestCase):
    def test_5a_and_5b_are_derived_and_the_result_is_computed(self):
        _post_sale(amount='1000.00', ref='INV-A')          # 210.00 output

        purchase = classify_amount(Decimal('400.00'), 'NORMAL', Q3)
        post(purchase, source_type='IncomingInvoice', source_id='SUP-1',
             kind=VatLedgerEntry.Kind.PURCHASE, tax_point_date=Q3,
             source_reference='SUP-1', direction='INPUT')   # 84.00 input

        summary = summarise(VatPeriod.for_date(Q3))
        self.assertEqual(summary['box_5a_verschuldigde_omzetbelasting'], Decimal('210.00'))
        self.assertEqual(summary['box_5b_voorbelasting'], Decimal('84.00'))
        self.assertEqual(summary['payable'], Decimal('126.00'))
        self.assertFalse(summary['is_refund'])

    def test_more_input_than_output_is_a_refund(self):
        _post_sale(amount='100.00', ref='INV-B')            # 21.00
        purchase = classify_amount(Decimal('1000.00'), 'NORMAL', Q3)
        post(purchase, source_type='Expense', source_id='EXP-1',
             kind=VatLedgerEntry.Kind.PURCHASE, tax_point_date=Q3,
             source_reference='EXP-1', direction='INPUT')   # 210.00

        summary = summarise(VatPeriod.for_date(Q3))
        self.assertEqual(summary['payable'], Decimal('-189.00'))
        self.assertTrue(summary['is_refund'])

    def test_the_summary_never_contains_a_5g_box(self):
        _post_sale(ref='INV-C')
        summary = summarise(VatPeriod.for_date(Q3))
        self.assertNotIn('5g', summary['boxes'])
        self.assertNotIn('5g', str(summary))

    def test_reverse_charge_nets_to_zero_but_is_still_reported(self):
        facts = ReverseChargeFacts(
            is_staff_lending_or_subcontracting=True,
            is_physical_work_on_immovable_property=True,
            counterparty_vat_number='NL869591071B01')
        result = classify_amount(Decimal('400.00'), 'REVERSE_CHARGE', Q3,
                                 direction='INPUT', reverse_charge_facts=facts)

        post(result, source_type='AgencyInvoice', source_id='AG-1',
             kind=VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT, tax_point_date=Q3,
             source_reference='AG-1', direction='INPUT')
        post(result, source_type='AgencyInvoice', source_id='AG-1',
             kind=VatLedgerEntry.Kind.REVERSE_CHARGE_INPUT, tax_point_date=Q3,
             source_reference='AG-1', direction='INPUT')

        summary = summarise(VatPeriod.for_date(Q3))
        self.assertEqual(summary['box_5a_verschuldigde_omzetbelasting'], Decimal('84.00'))
        self.assertEqual(summary['box_5b_voorbelasting'], Decimal('84.00'))
        self.assertEqual(summary['payable'], Decimal('0.00'))
        # Netting to zero must not mean vanishing from the return.
        self.assertEqual(summary['entry_count'], 2)
        self.assertIn('2a', summary['boxes'])

    def test_an_unresolved_line_is_counted_for_review_and_adds_no_vat(self):
        unknown = classify_amount(Decimal('500.00'), 'UNKNOWN', Q3)
        post(unknown, source_type='Invoice', source_id='INV-D',
             kind=VatLedgerEntry.Kind.SALE, tax_point_date=Q3,
             source_reference='INV-D', direction='OUTPUT')

        summary = summarise(VatPeriod.for_date(Q3))
        self.assertEqual(summary['requires_review_count'], 1)
        self.assertEqual(summary['box_5a_verschuldigde_omzetbelasting'], Decimal('0.00'))
        self.assertTrue(summary['requires_review'][0]['reason'])


class AuditTests(TestCase):
    def test_every_entry_records_how_it_was_calculated(self):
        entry = _post_sale(ref='INV-E')
        self.assertTrue(entry.calculation_method)
        self.assertTrue(entry.rules_version)
        self.assertEqual(entry.source_type, 'Invoice')
        self.assertEqual(entry.source_reference, 'INV-E')

    def test_an_override_keeps_the_original_decision(self):
        from apps.vat.models import VatClassificationOverride

        entry = _post_sale(ref='INV-F', treatment='UNKNOWN')
        user = make_user(email='fin@vat.test', role='finance')

        override = VatClassificationOverride.objects.create(
            entry=entry,
            original_treatment_code=entry.treatment_code,
            original_status=entry.classification_status,
            original_vat_amount=entry.vat_amount,
            new_treatment_code='NORMAL',
            new_vat_amount=Decimal('21.00'),
            reason='Accountant confirmed ordinary domestic cleaning at 21%.',
            resolved_by=user,
        )
        self.assertEqual(override.original_treatment_code, 'UNKNOWN')
        self.assertEqual(override.new_treatment_code, 'NORMAL')
        self.assertTrue(override.reason)
        self.assertEqual(entry.overrides.count(), 1)
