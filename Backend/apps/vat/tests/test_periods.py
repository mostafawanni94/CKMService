"""
Quarterly periods, the return calculation, finalization and locking.

The scenarios are CKM's own: a cleaning sale, a reverse-charged agency invoice,
and the EUR 3,000 supplier invoice whose deductibility nobody has established.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import make_customer, make_employee, make_project, make_user
from apps.employees.models import Agency
from apps.invoices.models import AgencyInvoice, IncomingInvoice, Invoice, InvoiceLine
from apps.vat.constants import VatPeriodStatus
from apps.vat.corrections import CorrectionError, post_correction
from apps.vat.models import VatLedgerEntry, VatPeriod, VatPeriodEvent
from apps.vat.posting import post_agency_invoice, post_incoming_invoice, post_invoice
from apps.vat.returns import (
    FinalizationBlocked, blockers_for, calculate_return, derive_status,
    ensure_periods, finalize, lock, reopen,
)

Q3 = date(2026, 8, 12)


def _sale(customer, net='100.00', number='F2026-500', on=Q3, treatment='NORMAL'):
    # One invoice per customer per week, so the week follows the date.
    invoice = Invoice.objects.create(
        invoice_number=number, customer=customer, week_year=on.year,
        week_number=on.isocalendar().week,
        week_start_date=on, week_end_date=on, issue_date=on,
        vat_rate=Decimal('21.00'), subtotal=Decimal(net),
        vat_amount=(Decimal(net) * Decimal('0.21')).quantize(Decimal('0.01')))
    InvoiceLine.objects.create(
        invoice=invoice, project=make_project(), employee=make_employee(),
        description='Cleaning', quantity_hours=Decimal('1.00'),
        hourly_rate=Decimal(net), total=Decimal(net), vat_treatment_code=treatment)
    post_invoice(invoice)
    return invoice


def _reverse_charged_agency(net='400.00', number='AG-700', on=Q3):
    agency = Agency.objects.create(
        name=f'Uitzend {number}', code=number, btw_number='NL869591071B01',
        base_hourly_rate=Decimal('10.00'))
    invoice = AgencyInvoice.objects.create(
        invoice_number=number, agency=agency, period_start=on, period_end=on,
        issue_date=on, subtotal=Decimal(net), vat_rate=Decimal('21.00'),
        vat_treatment_code='REVERSE_CHARGE', invoice_states_reverse_charge=True,
        is_staff_lending_or_subcontracting=True,
        is_physical_work_on_immovable_property=True,
        deductible_percentage=Decimal('100.00'))
    post_agency_invoice(invoice)
    return invoice


class PeriodCreationTests(TestCase):
    def test_quarter_boundaries(self):
        for day, quarter in [(date(2027, 1, 1), 1), (date(2027, 3, 31), 1),
                             (date(2027, 4, 1), 2), (date(2027, 6, 30), 2),
                             (date(2027, 7, 1), 3), (date(2027, 9, 30), 3),
                             (date(2027, 10, 1), 4), (date(2027, 12, 31), 4)]:
            with self.subTest(day=day):
                self.assertEqual(VatPeriod.for_date(day).quarter, quarter)

    def test_a_year_boundary_does_not_merge_quarters(self):
        q4 = VatPeriod.for_date(date(2026, 12, 31))
        q1 = VatPeriod.for_date(date(2027, 1, 1))
        self.assertEqual((q4.year, q4.quarter), (2026, 4))
        self.assertEqual((q1.year, q1.quarter), (2027, 1))

    def test_a_leap_year_february_ends_correctly(self):
        period = VatPeriod.for_date(date(2028, 2, 15))
        self.assertEqual(period.end_date, date(2028, 3, 31))

    def test_future_years_are_generated_not_hardcoded(self):
        created = ensure_periods(2031)
        self.assertEqual(len(created), 4)
        self.assertEqual(VatPeriod.objects.filter(year=2031).count(), 4)

    def test_ensure_periods_is_idempotent(self):
        ensure_periods(2032)
        ensure_periods(2032)
        self.assertEqual(VatPeriod.objects.filter(year=2032).count(), 4)


class ReturnCalculationTests(TestCase):
    def setUp(self):
        self.customer = make_customer(btw_number='NL001538146B17')

    def test_the_ckm_quarter(self):
        """Sale EUR 100 @21%, agency EUR 400 reverse charged."""
        _sale(self.customer, '100.00')
        _reverse_charged_agency('400.00')

        result = calculate_return(VatPeriod.for_date(Q3))
        boxes = {b['code']: b for b in result['boxes']}

        self.assertEqual(boxes['1a']['taxable_base'], Decimal('100.00'))
        self.assertEqual(boxes['1a']['vat_amount'], Decimal('21.00'))
        self.assertEqual(boxes['2a']['vat_amount'], Decimal('168.00'))  # both legs
        self.assertEqual(result['box_5a'], Decimal('105.00'))           # 21 + 84
        self.assertEqual(result['box_5b'], Decimal('84.00'))
        self.assertEqual(result['vat_position'], Decimal('21.00'))
        self.assertEqual(result['outcome'], 'PAYABLE')
        self.assertEqual(result['requires_review_count'], 0)

    def test_a_refund_position_is_reported_as_refundable(self):
        _sale(self.customer, '100.00')
        supplier = IncomingInvoice.objects.create(
            invoice_number='SUP-9', vendor_name='Big Supplier',
            vendor_vat_number='NL1', invoice_date=Q3,
            subtotal=Decimal('1000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL', deductible_percentage=Decimal('100.00'))
        post_incoming_invoice(supplier)

        result = calculate_return(VatPeriod.for_date(Q3))
        self.assertEqual(result['outcome'], 'REFUNDABLE')
        self.assertEqual(result['amount_refundable'], Decimal('189.00'))
        self.assertEqual(result['amount_payable'], Decimal('0.00'))

    def test_a_zero_balance_is_reported_as_zero(self):
        _reverse_charged_agency('400.00')   # 84 declared, 84 deducted
        result = calculate_return(VatPeriod.for_date(Q3))
        self.assertEqual(result['vat_position'], Decimal('0.00'))
        self.assertEqual(result['outcome'], 'ZERO')

    def test_outbound_reverse_charge_lands_in_1e_with_no_output_vat(self):
        invoice = Invoice.objects.create(
            invoice_number='F2026-RC', customer=self.customer, week_year=2026,
            week_number=33, week_start_date=Q3, week_end_date=Q3, issue_date=Q3,
            vat_rate=Decimal('0.00'),
            is_staff_lending_or_subcontracting=True,
            is_physical_work_on_immovable_property=True)
        InvoiceLine.objects.create(
            invoice=invoice, project=make_project(), employee=make_employee(),
            description='Lent worker', quantity_hours=Decimal('1.00'),
            hourly_rate=Decimal('400.00'), total=Decimal('400.00'),
            vat_treatment_code='REVERSE_CHARGE')
        post_invoice(invoice)

        result = calculate_return(VatPeriod.for_date(Q3))
        boxes = {b['code']: b for b in result['boxes']}
        self.assertEqual(boxes['1e']['taxable_base'], Decimal('400.00'))
        self.assertEqual(boxes['1a']['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['box_5a'], Decimal('0.00'))

    def test_every_box_is_present_and_none_of_them_is_5g(self):
        _sale(self.customer)
        result = calculate_return(VatPeriod.for_date(Q3))
        codes = [b['code'] for b in result['boxes']]
        self.assertEqual(codes, ['1a', '1b', '1c', '1d', '1e', '2a',
                                 '3a', '3b', '3c', '4a', '4b', '5a', '5b'])
        self.assertNotIn('5g', codes)
        self.assertNotIn('5g', str(result))

    def test_boxes_carry_transaction_counts_for_drill_down(self):
        _sale(self.customer, '100.00', number='F-1')
        _sale(self.customer, '200.00', number='F-2', on=date(2026, 8, 19))
        result = calculate_return(VatPeriod.for_date(Q3))
        box_1a = next(b for b in result['boxes'] if b['code'] == '1a')
        self.assertEqual(box_1a['entry_count'], 2)
        self.assertEqual(box_1a['source_count'], 2)

    def test_amounts_are_decimal(self):
        _sale(self.customer)
        result = calculate_return(VatPeriod.for_date(Q3))
        for key in ('box_5a', 'box_5b', 'vat_position'):
            self.assertIsInstance(result[key], Decimal)


class ReviewBlocksFilingTests(TestCase):
    """The EUR 3,000 supplier invoice with unknown deductibility."""

    def setUp(self):
        self.user = make_user(email='fin@period.test', role='finance')
        self.incoming = IncomingInvoice.objects.create(
            invoice_number='654646', vendor_name='8776',
            vendor_vat_number='78654', invoice_date=Q3,
            subtotal=Decimal('3000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL')   # no deductibility stated
        post_incoming_invoice(self.incoming)
        self.period = VatPeriod.for_date(Q3)

    def test_the_630_does_not_enter_5b(self):
        result = calculate_return(self.period)
        self.assertEqual(result['box_5b'], Decimal('0.00'))
        self.assertEqual(result['requires_review_count'], 1)

    def test_the_period_reports_review_required(self):
        self.assertEqual(derive_status(self.period), VatPeriodStatus.REVIEW_REQUIRED)

    def test_finalization_is_refused_with_a_reason(self):
        with self.assertRaises(FinalizationBlocked) as caught:
            finalize(self.period, actor=self.user)
        blockers = caught.exception.blockers
        self.assertTrue(blockers)
        self.assertEqual(blockers[0]['code'], 'REQUIRES_REVIEW')
        self.assertIn('deductibility', blockers[0]['entries'][0]['reason'])

    def test_a_blocked_attempt_is_audited(self):
        with self.assertRaises(FinalizationBlocked):
            finalize(self.period, actor=self.user)
        self.assertTrue(VatPeriodEvent.objects.filter(
            period=self.period, event=VatPeriodEvent.Event.BLOCKED).exists())

    def test_once_deductibility_is_stated_the_630_appears_and_filing_proceeds(self):
        self.incoming.deductible_percentage = Decimal('100.00')
        self.incoming.save()
        post_incoming_invoice(self.incoming)

        result = calculate_return(self.period)
        self.assertEqual(result['box_5b'], Decimal('630.00'))
        self.assertEqual(result['requires_review_count'], 0)
        self.assertEqual(derive_status(self.period), VatPeriodStatus.READY_TO_FINALIZE)

        finalize(self.period, actor=self.user)
        self.period.refresh_from_db()
        self.assertEqual(self.period.status, VatPeriodStatus.FINALIZED)


class FinalizationTests(TestCase):
    def setUp(self):
        self.user = make_user(email='fin2@period.test', role='finance')
        self.customer = make_customer(btw_number='NL001538146B17')
        _sale(self.customer, '100.00')
        _reverse_charged_agency('400.00')
        self.period = VatPeriod.for_date(Q3)

    def test_finalizing_records_who_when_and_what(self):
        finalize(self.period, actor=self.user)
        self.period.refresh_from_db()
        self.assertEqual(self.period.status, VatPeriodStatus.FINALIZED)
        self.assertIsNotNone(self.period.finalized_at)
        self.assertEqual(self.period.finalized_by, self.user)
        self.assertTrue(self.period.rules_version)

    def test_the_snapshot_reproduces_the_filed_figures(self):
        finalize(self.period, actor=self.user)
        self.period.refresh_from_db()
        snapshot = self.period.filed_snapshot
        self.assertEqual(snapshot['box_5a'], '105.00')
        self.assertEqual(snapshot['box_5b'], '84.00')
        self.assertEqual(snapshot['vat_position'], '21.00')
        self.assertIn('entry_ids_by_box', snapshot)

    def test_every_entry_is_locked(self):
        finalize(self.period, actor=self.user)
        self.assertFalse(
            VatLedgerEntry.objects.filter(period=self.period, is_locked=False).exists())

    def test_a_finalized_period_cannot_be_finalized_again(self):
        finalize(self.period, actor=self.user)
        with self.assertRaises(FinalizationBlocked):
            finalize(self.period, actor=self.user)

    def test_a_later_source_change_does_not_rewrite_the_snapshot(self):
        finalize(self.period, actor=self.user)
        before = dict(self.period.filed_snapshot)

        invoice = Invoice.objects.get(invoice_number='F2026-500')
        line = invoice.lines.first()
        line.hourly_rate = Decimal('999.00')
        line.save()
        post_invoice(invoice)          # refused: the period is closed

        self.period.refresh_from_db()
        self.assertEqual(self.period.filed_snapshot, before)
        entry = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        self.assertEqual(entry.vat_amount, Decimal('21.00'))

    def test_locking_after_finalizing(self):
        finalize(self.period, actor=self.user)
        lock(self.period, actor=self.user)
        self.period.refresh_from_db()
        self.assertEqual(self.period.status, VatPeriodStatus.LOCKED)
        self.assertIsNotNone(self.period.locked_at)

    def test_an_open_period_cannot_be_locked(self):
        with self.assertRaises(FinalizationBlocked):
            lock(self.period, actor=self.user)


class ReopenAndCorrectionTests(TestCase):
    def setUp(self):
        self.user = make_user(email='admin@period.test', role='admin')
        self.customer = make_customer(btw_number='NL001538146B17')
        _sale(self.customer, '100.00')
        self.period = VatPeriod.for_date(Q3)
        finalize(self.period, actor=self.user)

    def test_reopening_requires_a_written_reason(self):
        with self.assertRaises(FinalizationBlocked):
            reopen(self.period, actor=self.user, reason='oops')

    def test_reopening_keeps_the_filed_snapshot(self):
        before = dict(self.period.filed_snapshot)
        reopen(self.period, actor=self.user,
               reason='Accountant found a misclassified line before submission.')
        self.period.refresh_from_db()
        self.assertEqual(self.period.filed_snapshot, before)
        self.assertEqual(self.period.status, VatPeriodStatus.REVIEW_REQUIRED)
        self.assertTrue(self.period.reopen_reason)

    def test_a_locked_period_cannot_be_reopened(self):
        lock(self.period, actor=self.user)
        with self.assertRaises(FinalizationBlocked):
            reopen(self.period, actor=self.user,
                   reason='A perfectly good reason that is long enough.')

    def test_a_correction_goes_to_an_open_period_and_keeps_the_original(self):
        original = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        correction = post_correction(
            original, actor=self.user,
            reason='Line was billed at the wrong rate; reversed in Q4.',
            correction_date=date(2026, 10, 15))

        self.assertEqual(correction.period.quarter, 4)
        self.assertEqual(correction.vat_amount, Decimal('-21.00'))
        self.assertEqual(correction.kind, VatLedgerEntry.Kind.CORRECTION)

        original.refresh_from_db()
        self.assertEqual(original.vat_amount, Decimal('21.00'))   # untouched
        self.assertEqual(VatLedgerEntry.objects.filter(pk=original.pk).count(), 1)

        q4 = calculate_return(VatPeriod.for_date(date(2026, 10, 15)))
        self.assertEqual(q4['box_5a'], Decimal('-21.00'))

    def test_a_correction_cannot_be_posted_into_a_closed_period(self):
        lock(self.period, actor=self.user)
        original = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        with self.assertRaises(CorrectionError):
            post_correction(original, actor=self.user,
                            reason='Attempting to correct inside the filed period.',
                            correction_date=Q3)

    def test_a_correction_requires_a_reason(self):
        original = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        with self.assertRaises(CorrectionError):
            post_correction(original, actor=self.user, reason='no',
                            correction_date=date(2026, 10, 15))


class F2026_009_RegressionTests(TestCase):
    def test_the_issued_invoice_survives_a_full_period_calculation(self):
        customer = make_customer(company_name='Smaak voor Groen',
                                 btw_number='NL001538146B17')
        invoice = Invoice.objects.create(
            invoice_number='F2026-009', customer=customer, week_year=2026,
            week_number=33, week_start_date=date(2026, 8, 12),
            week_end_date=date(2026, 8, 12), issue_date=date(2026, 8, 12),
            vat_rate=Decimal('21.00'), subtotal=Decimal('175.00'),
            vat_amount=Decimal('36.75'), total=Decimal('211.75'))
        InvoiceLine.objects.create(
            invoice=invoice, project=make_project(), employee=make_employee(),
            description='1 medewerker 09:00 - 14:00', quantity_hours=Decimal('1.00'),
            hourly_rate=Decimal('175.00'), total=Decimal('175.00'),
            vat_treatment_code='NORMAL')
        post_invoice(invoice)

        user = make_user(email='fin3@period.test', role='finance')
        period = VatPeriod.for_date(date(2026, 8, 12))
        calculate_return(period)
        finalize(period, actor=user)

        invoice.refresh_from_db()
        self.assertEqual(invoice.subtotal, Decimal('175.00'))
        self.assertEqual(invoice.vat_amount, Decimal('36.75'))
        self.assertEqual(invoice.total, Decimal('211.75'))


class PeriodApiTests(TestCase):
    def setUp(self):
        self.customer = make_customer(btw_number='NL001538146B17')
        _sale(self.customer, '100.00')
        self.period = VatPeriod.for_date(Q3)
        self.finance = APIClient()
        self.finance.force_authenticate(make_user(email='f@api.test', role='finance'))

    def test_the_return_endpoint(self):
        response = self.finance.get(f'/api/vat/periods/{self.period.pk}/return/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['box_5a'], Decimal('21.00'))
        self.assertEqual(len(response.data['boxes']), 13)

    def test_box_drill_down(self):
        response = self.finance.get(f'/api/vat/periods/{self.period.pk}/boxes/1a/')
        self.assertEqual(response.status_code, 200)
        payload = response.data['results'] if 'results' in response.data else response.data
        self.assertTrue(payload)

    def test_blockers_and_snapshot(self):
        self.assertEqual(
            self.finance.get(f'/api/vat/periods/{self.period.pk}/blockers/').status_code, 200)
        # Not filed yet, so there is no snapshot.
        self.assertEqual(
            self.finance.get(f'/api/vat/periods/{self.period.pk}/snapshot/').status_code, 404)

    def test_finalize_then_snapshot(self):
        self.assertEqual(
            self.finance.post(f'/api/vat/periods/{self.period.pk}/finalize/').status_code, 200)
        response = self.finance.get(f'/api/vat/periods/{self.period.pk}/snapshot/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['snapshot']['box_5a'], '21.00')

    def test_only_an_admin_may_reopen(self):
        self.finance.post(f'/api/vat/periods/{self.period.pk}/finalize/')
        blocked = self.finance.post(
            f'/api/vat/periods/{self.period.pk}/reopen/',
            {'reason': 'A sufficiently long and genuine reason.'}, format='json')
        self.assertEqual(blocked.status_code, 403)

        admin = APIClient()
        admin.force_authenticate(make_user(email='a@api.test', role='admin'))
        allowed = admin.post(
            f'/api/vat/periods/{self.period.pk}/reopen/',
            {'reason': 'A sufficiently long and genuine reason.'}, format='json')
        self.assertEqual(allowed.status_code, 200)

    def test_other_roles_are_refused_throughout(self):
        for role in ('operations', 'employee', 'customer'):
            client = APIClient()
            client.force_authenticate(make_user(email=f'{role}@api.test', role=role))
            for path in ('return', 'blockers', 'reconciliation', 'events'):
                self.assertEqual(
                    client.get(f'/api/vat/periods/{self.period.pk}/{path}/').status_code,
                    403, f'{role} reached {path}')
