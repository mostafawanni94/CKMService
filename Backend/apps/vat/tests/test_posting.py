"""
Integration tests: source documents through the engine into the ledger.

The recurring assertion is that issued documents are never altered. The ledger
records how VAT should be treated; where that disagrees with what was issued,
the disagreement surfaces — it is not silently applied.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    make_customer, make_employee, make_project, make_user, make_work_entry,
)
from apps.invoices.models import (
    AgencyInvoice, IncomingInvoice, Invoice, InvoiceLine,
)
from apps.employees.models import Agency
from apps.expenses.models import Expense, ExpenseCategory
from apps.vat.constants import ClassificationStatus, PriceMode, VatPeriodStatus
from apps.vat.ledger import summarise
from apps.vat.models import VatLedgerEntry, VatPeriod
from apps.vat.posting import (
    post_agency_invoice, post_expense, post_incoming_invoice, post_invoice,
)
from apps.vat.reconciliation import status_for

Q3 = date(2026, 8, 12)


def _invoice(customer, number='F2026-100', issue_date=Q3, vat_rate='21.00'):
    return Invoice.objects.create(
        invoice_number=number, customer=customer,
        week_year=2026, week_number=33,
        week_start_date=issue_date, week_end_date=issue_date,
        issue_date=issue_date, vat_rate=Decimal(vat_rate),
    )


def _line(invoice, total='100.00', treatment='NORMAL', project=None,
          work_entry=None, employee=None):
    return InvoiceLine.objects.create(
        invoice=invoice, project=project or make_project(),
        employee=employee or make_employee(),
        description='Cleaning', quantity_hours=Decimal('1.00'),
        hourly_rate=Decimal(total), total=Decimal(total),
        vat_treatment_code=treatment, work_entry=work_entry,
    )


class CustomerInvoiceTests(TestCase):
    def setUp(self):
        self.customer = make_customer(btw_number='NL001538146B17')

    def test_a_normal_line_produces_one_sale_entry_in_1a(self):
        invoice = _invoice(self.customer)
        _line(invoice, '100.00', 'NORMAL')

        outcome = post_invoice(invoice)

        self.assertEqual(len(outcome.entries), 1)
        entry = outcome.entries[0]
        self.assertEqual(entry.taxable_base, Decimal('100.00'))
        self.assertEqual(entry.vat_amount, Decimal('21.00'))
        self.assertEqual(entry.output_vat, Decimal('21.00'))
        self.assertEqual(entry.return_box.code, '1a')
        self.assertEqual(entry.kind, VatLedgerEntry.Kind.SALE)

    def test_the_line_is_stamped_with_its_classification(self):
        invoice = _invoice(self.customer)
        line = _line(invoice, '100.00', 'NORMAL')
        post_invoice(invoice)
        line.refresh_from_db()
        self.assertEqual(line.net_amount, Decimal('100.00'))
        self.assertEqual(line.vat_amount, Decimal('21.00'))
        self.assertEqual(line.vat_return_box, '1a')
        self.assertEqual(line.vat_classification_status, ClassificationStatus.CLASSIFIED)

    def test_an_unclassified_line_is_held_for_review_and_adds_no_vat(self):
        invoice = _invoice(self.customer)
        _line(invoice, '100.00', 'UNKNOWN')

        entry = post_invoice(invoice).entries[0]

        self.assertTrue(entry.requires_review)
        self.assertEqual(entry.vat_amount, Decimal('0.00'))
        self.assertTrue(entry.review_reason)

    def test_a_mixed_invoice_puts_its_lines_in_different_boxes(self):
        """The reason VAT had to move to the line."""
        invoice = _invoice(self.customer)
        _line(invoice, '100.00', 'NORMAL')
        _line(invoice, '400.00', 'REVERSE_CHARGE')
        invoice.is_staff_lending_or_subcontracting = True
        invoice.is_physical_work_on_immovable_property = True
        invoice.save()

        outcome = post_invoice(invoice)
        boxes = sorted(e.return_box.code for e in outcome.entries if e.return_box)
        self.assertEqual(boxes, ['1a', '1e'])

    def test_the_chain_back_to_the_work_is_traceable(self):
        employee = make_employee()
        project = make_project(customer=self.customer)
        work_entry = make_work_entry(employee=employee, project=project, work_date=Q3)

        invoice = _invoice(self.customer)
        line = _line(invoice, '100.00', 'NORMAL', project=project,
                     work_entry=work_entry, employee=employee)
        entry = post_invoice(invoice).entries[0]

        # ledger -> line -> work entry -> project -> customer
        self.assertEqual(entry.source_line_id, str(line.pk))
        found = InvoiceLine.objects.get(pk=entry.source_line_id)
        self.assertEqual(found.work_entry_id, work_entry.pk)
        self.assertEqual(found.work_entry.project.customer_id, self.customer.pk)

    def test_reposting_does_not_duplicate(self):
        invoice = _invoice(self.customer)
        _line(invoice, '100.00', 'NORMAL')
        for _ in range(3):
            post_invoice(invoice)
        self.assertEqual(
            VatLedgerEntry.objects.filter(source_type='InvoiceLine').count(), 1)

    def test_an_edited_open_line_is_recalculated(self):
        invoice = _invoice(self.customer)
        line = _line(invoice, '100.00', 'NORMAL')
        post_invoice(invoice)

        # InvoiceLine.save() derives total from quantity x rate, so the rate is
        # what an edit actually changes.
        line.hourly_rate = Decimal('120.00')
        line.save()
        entry = post_invoice(invoice).entries[0]

        self.assertEqual(entry.taxable_base, Decimal('120.00'))
        self.assertEqual(entry.vat_amount, Decimal('25.20'))
        self.assertEqual(
            VatLedgerEntry.objects.filter(source_type='InvoiceLine').count(), 1)


class F2026_009_Tests(TestCase):
    """
    The real invoice: EUR 175 + EUR 36,75 to a gardening business for a lent
    worker, described as organisational work.
    """

    def setUp(self):
        self.customer = make_customer(
            company_name='Smaak voor Groen', btw_number='NL001538146B17')

    def _issued(self):
        invoice = _invoice(self.customer, number='F2026-009', issue_date=date(2026, 8, 12))
        invoice.subtotal = Decimal('175.00')
        invoice.vat_amount = Decimal('36.75')
        invoice.total = Decimal('211.75')
        invoice.save()
        _line(invoice, '175.00', 'NORMAL')
        return invoice

    def test_the_issued_figures_are_never_altered(self):
        invoice = self._issued()
        post_invoice(invoice)
        invoice.refresh_from_db()
        self.assertEqual(invoice.subtotal, Decimal('175.00'))
        self.assertEqual(invoice.vat_amount, Decimal('36.75'))
        self.assertEqual(invoice.total, Decimal('211.75'))

    def test_classified_as_issued_when_marked_normal(self):
        entry = post_invoice(self._issued()).entries[0]
        self.assertEqual(entry.vat_amount, Decimal('36.75'))
        self.assertEqual(entry.return_box.code, '1a')

    def test_it_is_held_for_review_when_reverse_charge_is_suspected(self):
        invoice = self._issued()
        line = invoice.lines.first()
        line.vat_treatment_code = 'REVERSE_CHARGE'
        line.save()
        # Nobody has established whether the work was physical work on property.
        invoice.is_staff_lending_or_subcontracting = True
        invoice.save()

        entry = post_invoice(invoice).entries[0]

        self.assertTrue(entry.requires_review)
        self.assertIn('physical work on immovable property', entry.review_reason)
        invoice.refresh_from_db()
        self.assertEqual(invoice.vat_amount, Decimal('36.75'))  # still untouched


class AgencyInvoiceTests(TestCase):
    def setUp(self):
        self.agency = Agency.objects.create(
            name='Uitzend BV', code='UZB', btw_number='NL869591071B01',
            base_hourly_rate=Decimal('10.00'))

    def _invoice(self, **kwargs):
        defaults = dict(
            invoice_number='AG-2026-01', agency=self.agency,
            period_start=Q3, period_end=Q3, issue_date=Q3,
            subtotal=Decimal('400.00'), vat_rate=Decimal('21.00'),
        )
        defaults.update(kwargs)
        return AgencyInvoice.objects.create(**defaults)

    def test_normal_vat_becomes_deductible_input_vat(self):
        invoice = self._invoice(vat_treatment_code='NORMAL',
                                deductible_percentage=Decimal('100.00'))
        entry = post_agency_invoice(invoice).entries[0]
        self.assertEqual(entry.kind, VatLedgerEntry.Kind.PURCHASE)
        self.assertEqual(entry.input_vat, Decimal('84.00'))
        self.assertEqual(entry.deductible_vat, Decimal('84.00'))
        self.assertEqual(entry.return_box.code, '5b')

    def test_partial_deductibility_splits_the_vat(self):
        invoice = self._invoice(vat_treatment_code='NORMAL',
                                deductible_percentage=Decimal('50.00'))
        entry = post_agency_invoice(invoice).entries[0]
        self.assertEqual(entry.input_vat, Decimal('84.00'))
        self.assertEqual(entry.deductible_vat, Decimal('42.00'))
        self.assertEqual(entry.non_deductible_vat, Decimal('42.00'))

    def test_deductibility_is_never_assumed(self):
        invoice = self._invoice(vat_treatment_code='NORMAL')  # no percentage
        entry = post_agency_invoice(invoice).entries[0]
        self.assertTrue(entry.requires_review)
        self.assertIn('deductibility', entry.review_reason)

    def test_reverse_charge_writes_both_legs(self):
        invoice = self._invoice(
            vat_treatment_code='REVERSE_CHARGE',
            invoice_states_reverse_charge=True,
            is_staff_lending_or_subcontracting=True,
            is_physical_work_on_immovable_property=True,
            deductible_percentage=Decimal('100.00'),
        )
        outcome = post_agency_invoice(invoice)

        self.assertEqual(len(outcome.entries), 2)
        kinds = {e.kind for e in outcome.entries}
        self.assertEqual(kinds, {VatLedgerEntry.Kind.REVERSE_CHARGE_OUTPUT,
                                 VatLedgerEntry.Kind.REVERSE_CHARGE_INPUT})
        for entry in outcome.entries:
            self.assertEqual(entry.vat_amount, Decimal('84.00'))
            self.assertEqual(entry.return_box.code, '2a')

    def test_being_an_agency_is_not_enough_on_its_own(self):
        invoice = self._invoice(vat_treatment_code='REVERSE_CHARGE',
                                deductible_percentage=Decimal('100.00'))
        entry = post_agency_invoice(invoice).entries[0]
        self.assertTrue(entry.requires_review)

    def test_the_agency_default_applies_when_the_invoice_says_nothing(self):
        self.agency.vat_treatment_code = 'REVERSE_CHARGE'
        self.agency.is_staff_lending_or_subcontracting = True
        self.agency.is_physical_work_on_immovable_property = True
        self.agency.deductible_percentage = Decimal('100.00')
        self.agency.save()

        outcome = post_agency_invoice(self._invoice())
        self.assertEqual(len(outcome.entries), 2)
        self.assertFalse(outcome.entries[0].requires_review)

    def test_wording_that_contradicts_the_classification_is_flagged(self):
        invoice = self._invoice(vat_treatment_code='NORMAL',
                                invoice_states_reverse_charge=True,
                                deductible_percentage=Decimal('100.00'))
        entry = post_agency_invoice(invoice).entries[0]
        self.assertTrue(entry.requires_review)
        self.assertIn('btw verlegd', entry.review_reason)


class ExpenseAndIncomingTests(TestCase):
    def test_an_expense_with_stated_deductibility_becomes_input_vat(self):
        category = ExpenseCategory.objects.create(
            name='Supplies', code='SUP', deductible_percentage=Decimal('100.00'),
            vat_treatment_code='NORMAL')
        expense = Expense.objects.create(
            category=category, description='Cleaning supplies', vendor_name='Makro',
            amount_excl_vat=Decimal('100.00'), vat_rate=Decimal('21.00'),
            vat_amount=Decimal('21.00'), total_amount=Decimal('121.00'),
            expense_date=Q3)

        entry = post_expense(expense).entries[0]
        self.assertEqual(entry.deductible_vat, Decimal('21.00'))
        self.assertEqual(entry.return_box.code, '5b')

    def test_an_expense_without_stated_deductibility_is_held(self):
        category = ExpenseCategory.objects.create(name='Misc', code='MSC')
        expense = Expense.objects.create(
            category=category, description='Unclear', vendor_name='Someone',
            amount_excl_vat=Decimal('100.00'), vat_rate=Decimal('21.00'),
            vat_amount=Decimal('21.00'), total_amount=Decimal('121.00'),
            expense_date=Q3)

        entry = post_expense(expense).entries[0]
        self.assertTrue(entry.requires_review)
        self.assertEqual(entry.deductible_vat, Decimal('0.00'))

    def test_an_incoming_invoice_posts_as_input_vat(self):
        incoming = IncomingInvoice.objects.create(
            invoice_number='SUP-77', vendor_name='Supplier BV',
            vendor_vat_number='NL123456789B01', invoice_date=Q3,
            subtotal=Decimal('200.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL', deductible_percentage=Decimal('100.00'))

        entry = post_incoming_invoice(incoming).entries[0]
        self.assertEqual(entry.input_vat, Decimal('42.00'))
        self.assertEqual(entry.deductible_vat, Decimal('42.00'))


class EndToEndTests(TestCase):
    """The scenario you described, end to end."""

    def test_a_full_quarter(self):
        customer = make_customer(btw_number='NL001538146B17')
        invoice = _invoice(customer, number='F2026-200')
        _line(invoice, '100.00', 'NORMAL')
        post_invoice(invoice)

        agency = Agency.objects.create(
            name='Uitzend BV', code='UZB2', btw_number='NL869591071B01',
            base_hourly_rate=Decimal('10.00'))
        agency_invoice = AgencyInvoice.objects.create(
            invoice_number='AG-500', agency=agency,
            period_start=Q3, period_end=Q3, issue_date=Q3,
            subtotal=Decimal('400.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='REVERSE_CHARGE',
            invoice_states_reverse_charge=True,
            is_staff_lending_or_subcontracting=True,
            is_physical_work_on_immovable_property=True,
            deductible_percentage=Decimal('100.00'))
        post_agency_invoice(agency_invoice)

        summary = summarise(VatPeriod.for_date(Q3))

        # Sale 21.00 output; reverse charge 84.00 declared and 84.00 deducted.
        self.assertEqual(summary['box_5a_verschuldigde_omzetbelasting'], Decimal('105.00'))
        self.assertEqual(summary['box_5b_voorbelasting'], Decimal('84.00'))
        self.assertEqual(summary['payable'], Decimal('21.00'))
        self.assertIn('1a', summary['boxes'])
        self.assertIn('2a', summary['boxes'])
        self.assertNotIn('5g', summary['boxes'])
        self.assertEqual(summary['requires_review_count'], 0)


class ReconciliationTests(TestCase):
    def test_a_clean_period_reports_clean(self):
        customer = make_customer(btw_number='NL001538146B17')
        invoice = _invoice(customer, number='F2026-300')
        invoice.vat_amount = Decimal('21.00')
        invoice.save()
        _line(invoice, '100.00', 'NORMAL')
        post_invoice(invoice)

        report = status_for(VatPeriod.for_date(Q3))
        self.assertTrue(report['is_clean'], report['findings'])

    def test_an_unresolved_entry_blocks_the_period(self):
        customer = make_customer()
        invoice = _invoice(customer, number='F2026-301')
        _line(invoice, '100.00', 'UNKNOWN')
        post_invoice(invoice)

        report = status_for(VatPeriod.for_date(Q3))
        self.assertFalse(report['is_clean'])
        self.assertTrue(any(f['code'] == 'REQUIRES_REVIEW' for f in report['findings']))

    def test_a_line_total_that_disagrees_with_the_invoice_is_reported(self):
        customer = make_customer(btw_number='NL001538146B17')
        invoice = _invoice(customer, number='F2026-302')
        invoice.vat_amount = Decimal('99.00')      # wrong on purpose
        invoice.save()
        _line(invoice, '100.00', 'NORMAL')         # produces 21.00
        post_invoice(invoice)

        report = status_for(VatPeriod.for_date(Q3))
        self.assertTrue(any(f['code'] == 'INVOICE_VAT_MISMATCH' for f in report['findings']))
        invoice.refresh_from_db()
        self.assertEqual(invoice.vat_amount, Decimal('99.00'))  # not corrected

    def test_possible_duplicate_incoming_invoices_are_flagged_not_removed(self):
        # A repeated (vendor, number) is already blocked by a DB constraint, so
        # the realistic duplicate is the same vendor, date and amount entered
        # twice under different numbers.
        for number in ('DUP-1', 'DUP-2'):
            IncomingInvoice.objects.create(
                invoice_number=number, vendor_name='Same Vendor',
                invoice_date=Q3, subtotal=Decimal('100.00'), vat_rate=Decimal('0.00'))

        report = status_for(VatPeriod.for_date(Q3))
        self.assertTrue(any(f['code'] == 'POSSIBLE_DUPLICATE' for f in report['findings']))
        self.assertEqual(IncomingInvoice.objects.filter(vendor_name='Same Vendor').count(), 2)


class FinalizationTests(TestCase):
    def setUp(self):
        self.customer = make_customer(btw_number='NL001538146B17')
        self.invoice = _invoice(self.customer, number='F2026-400')
        self.invoice.vat_amount = Decimal('21.00')
        self.invoice.save()
        _line(self.invoice, '100.00', 'NORMAL')
        post_invoice(self.invoice)
        self.period = VatPeriod.for_date(Q3)

    def test_a_finalized_period_refuses_reposting(self):
        self.period.status = VatPeriodStatus.FINALIZED
        self.period.save()
        VatLedgerEntry.objects.filter(period=self.period).update(is_locked=True)

        outcome = post_invoice(self.invoice)
        self.assertTrue(outcome.errors)
        self.assertEqual(
            VatLedgerEntry.objects.get(source_type='InvoiceLine').vat_amount,
            Decimal('21.00'))


class PermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.clients = {}
        for role in ('admin', 'finance', 'operations', 'employee', 'customer'):
            client = APIClient()
            client.force_authenticate(make_user(email=f'{role}@vat.test', role=role))
            self.clients[role] = client

    def _get(self, role, path='/api/vat/ledger/'):
        return self.clients[role].get(path)

    def test_finance_and_admin_may_read_the_ledger(self):
        for role in ('admin', 'finance'):
            self.assertEqual(self._get(role).status_code, 200, role)

    def test_operations_employees_and_customers_may_not(self):
        for role in ('operations', 'employee', 'customer'):
            self.assertEqual(self._get(role).status_code, 403, role)

    def test_anonymous_is_rejected(self):
        self.assertIn(self.client.get('/api/vat/ledger/').status_code, (401, 403))

    def test_the_review_queue_and_periods_are_equally_restricted(self):
        for path in ('/api/vat/ledger/review_queue/', '/api/vat/periods/',
                     '/api/vat/boxes/', '/api/vat/treatments/'):
            self.assertEqual(self._get('employee', path).status_code, 403, path)
            self.assertEqual(self._get('finance', path).status_code, 200, path)
