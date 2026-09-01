"""
The employee wallet.

The wallet is what CKM owes an employee right now. It has to agree with the work
that was approved, the advances that were taken, the expenses the employee
fronted, and the payslips that have been paid.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user, make_work_entry,
)
from apps.wallet.models import Wallet, WalletTransaction
from apps.wallet.services import (
    WalletError, credit_work_entry, post, rebuild, reimburse_expense,
    reverse_work_entry, settle_payslip, summary, wallet_for,
)
from apps.worklogs.models import WorkEntry

MONDAY = date(2026, 8, 10)


class WalletSetup(TestCase):
    def setUp(self):
        self.customer = make_customer()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self.employee = make_employee(hourly_rate=Decimal('16.00'))
        self.admin = make_user(email='wallet-admin@ckm.test', role='admin')

    def work(self, day=0, **kwargs):
        return make_work_entry(
            employee=self.employee, project=self.project,
            work_date=MONDAY + timedelta(days=day),
            service=self.service, **kwargs)


class EarningTests(WalletSetup):
    def test_approved_work_credits_the_employees_own_rate(self):
        entry = self.work()                          # 7.5 hours
        credit_work_entry(entry)
        wallet = wallet_for(self.employee)
        self.assertEqual(wallet.balance, Decimal('120.00'))   # 7.5 x 16.00

    def test_crediting_twice_does_not_pay_twice(self):
        entry = self.work()
        credit_work_entry(entry)
        credit_work_entry(entry)
        self.assertEqual(WalletTransaction.objects.count(), 1)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('120.00'))

    def test_an_edited_entry_corrects_rather_than_duplicates(self):
        entry = self.work()
        credit_work_entry(entry)
        self.employee.hourly_rate = Decimal('18.00')
        self.employee.save()
        credit_work_entry(entry)
        self.assertEqual(WalletTransaction.objects.count(), 1)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('135.00'))

    def test_an_employee_without_a_rate_is_not_credited_zero_silently(self):
        employee = make_employee(hourly_rate=Decimal('0.00'))
        entry = make_work_entry(employee=employee, project=self.project,
                                work_date=MONDAY, service=self.service)
        self.assertIsNone(credit_work_entry(entry))

    def test_surcharges_reach_the_wallet_only_for_entitled_employees(self):
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))

        entitled = make_employee(hourly_rate=Decimal('16.00'), receives_surcharges=True)
        plain = make_employee(hourly_rate=Decimal('16.00'), receives_surcharges=False)
        for employee in (entitled, plain):
            entry = make_work_entry(
                employee=employee, project=self.project, work_date=MONDAY,
                service=self.service, start='02:00', end='08:00', break_minutes=0)
            credit_work_entry(entry)

        self.assertGreater(wallet_for(entitled).balance, wallet_for(plain).balance)

    def test_withdrawing_an_approval_takes_the_money_back(self):
        entry = self.work()
        credit_work_entry(entry)
        reverse_work_entry(entry)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))
        # The history stays: two movements, not one deleted one.
        self.assertEqual(WalletTransaction.objects.count(), 2)

    def test_the_database_refuses_a_second_earning_for_one_entry(self):
        from django.db.utils import IntegrityError

        entry = self.work()
        wallet = wallet_for(self.employee)
        WalletTransaction.objects.create(
            wallet=wallet, transaction_type=WalletTransaction.Type.EARNING,
            amount=Decimal('10.00'), reference_type='workentry',
            reference_id=entry.pk)
        with self.assertRaises(IntegrityError):
            WalletTransaction.objects.create(
                wallet=wallet, transaction_type=WalletTransaction.Type.EARNING,
                amount=Decimal('10.00'), reference_type='workentry',
                reference_id=entry.pk)


class ApprovalFlowTests(WalletSetup):
    """The wallet through the API, which is how it actually gets used."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_approving_through_the_api_credits_the_wallet(self):
        entry = self.work(status='submitted')
        response = self.client.post(f'/api/worklogs/entries/{entry.pk}/approve/', {},
                                    format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('120.00'))

    def test_rejecting_an_approved_entry_reverses_the_credit(self):
        entry = self.work(status='submitted')
        self.client.post(f'/api/worklogs/entries/{entry.pk}/approve/', {}, format='json')
        self.client.post(f'/api/worklogs/entries/{entry.pk}/reject/',
                         {'reason': 'Hours do not match the site log.'}, format='json')
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))


class PayoutTests(WalletSetup):
    def test_paying_a_payslip_settles_the_wallet(self):
        from apps.hr.models import PayrollPeriod, Payslip

        entry = self.work()
        credit_work_entry(entry)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('120.00'))

        period = PayrollPeriod.objects.create(
            name='Augustus 2026', start_date=MONDAY, end_date=MONDAY + timedelta(days=20))
        payslip = Payslip.objects.create(
            period=period, employee=self.employee, total_hours=Decimal('7.50'),
            base_pay=Decimal('120.00'), gross_pay=Decimal('120.00'),
            net_pay=Decimal('120.00'))

        settle_payslip(payslip)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))

    def test_settling_twice_does_not_deduct_twice(self):
        from apps.hr.models import PayrollPeriod, Payslip

        credit_work_entry(self.work())
        period = PayrollPeriod.objects.create(
            name='Augustus 2026', start_date=MONDAY, end_date=MONDAY + timedelta(days=20))
        payslip = Payslip.objects.create(
            period=period, employee=self.employee, net_pay=Decimal('120.00'))
        settle_payslip(payslip)
        settle_payslip(payslip)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))


class ReimbursementTests(WalletSetup):
    def make_expense(self, amount=Decimal('50.00')):
        from apps.expenses.models import Expense, ExpenseCategory

        category = ExpenseCategory.objects.create(name='Materiaal', code='MAT')
        return Expense.objects.create(
            category=category, description='Schoonmaakmiddelen',
            vendor_name='Makro', amount_excl_vat=amount,
            vat_rate=Decimal('21.00'), expense_date=MONDAY,
            paid_by_employee=self.employee)

    def test_an_expense_paid_by_an_employee_is_pending_reimbursement(self):
        expense = self.make_expense()
        self.assertTrue(expense.awaits_reimbursement)

    def test_reimbursing_credits_the_wallet_with_the_gross_amount(self):
        expense = self.make_expense(Decimal('100.00'))
        reimburse_expense(expense, self.employee)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('121.00'))

    def test_the_api_reimburses_once(self):
        expense = self.make_expense(Decimal('100.00'))
        client = APIClient()
        client.force_authenticate(self.admin)

        first = client.post(f'/api/expenses/expenses/{expense.pk}/reimburse/')
        self.assertEqual(first.status_code, 200)
        second = client.post(f'/api/expenses/expenses/{expense.pk}/reimburse/')
        self.assertEqual(second.status_code, 400)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('121.00'))

    def test_what_the_company_owes_its_employees_is_listed(self):
        self.make_expense(Decimal('40.00'))
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get('/api/expenses/expenses/awaiting-reimbursement/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['total'], Decimal('48.40'))


class DuplicateExpenseTests(TestCase):
    def test_the_same_supplier_reference_cannot_be_booked_twice(self):
        from django.db.utils import IntegrityError

        from apps.expenses.models import Expense, ExpenseCategory

        category = ExpenseCategory.objects.create(name='Brandstof', code='FUEL')
        fields = dict(category=category, description='Diesel', vendor_name='Shell',
                      amount_excl_vat=Decimal('80.00'), vat_rate=Decimal('21.00'),
                      expense_date=MONDAY, reference_number='SHELL-991')
        Expense.objects.create(**fields)
        with self.assertRaises(IntegrityError):
            Expense.objects.create(**fields)

    def test_the_duplicate_check_endpoint_finds_it_before_saving(self):
        from apps.expenses.models import Expense, ExpenseCategory

        category = ExpenseCategory.objects.create(name='Brandstof', code='FUEL')
        Expense.objects.create(
            category=category, description='Diesel', vendor_name='Shell',
            amount_excl_vat=Decimal('80.00'), vat_rate=Decimal('21.00'),
            expense_date=MONDAY, reference_number='SHELL-991')

        client = APIClient()
        client.force_authenticate(make_user(email='dup@ckm.test', role='finance'))
        response = client.post('/api/expenses/expenses/check-duplicate/',
                               {'vendor_name': 'shell', 'reference_number': 'SHELL-991'},
                               format='json')
        self.assertTrue(response.data['duplicate'])
        self.assertEqual(len(response.data['matches']), 1)


class SummaryTests(WalletSetup):
    def test_the_summary_reports_the_liability(self):
        credit_work_entry(self.work())
        result = summary()
        self.assertEqual(result['total_owed'], Decimal('120.00'))
        self.assertEqual(result['wallet_count'], 1)

    def test_rebuild_repairs_a_drifted_balance(self):
        credit_work_entry(self.work())
        wallet = wallet_for(self.employee)
        Wallet.objects.filter(pk=wallet.pk).update(balance=Decimal('999.00'))

        changes = rebuild()
        self.assertEqual(len(changes), 1)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('120.00'))

    def test_a_movement_needs_an_employee(self):
        with self.assertRaises(WalletError):
            post(None, amount=Decimal('1'), transaction_type='earning',
                 description='nowhere')


class MultiAgencyTests(TestCase):
    """An employee can work through more than one agency over time."""

    def setUp(self):
        from apps.employees.models import Agency

        self.customer = make_customer()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self.employee = make_employee(hourly_rate=Decimal('16.00'))
        self.first = Agency.objects.create(
            name='Uitzendbureau Een', code='UZ1', base_hourly_rate=Decimal('20.00'))
        self.second = Agency.objects.create(
            name='Uitzendbureau Twee', code='UZ2', base_hourly_rate=Decimal('22.00'))

    def assign(self, agency, start, end=None):
        from apps.employees.models import EmployeeAgencyHistory

        return EmployeeAgencyHistory.objects.create(
            employee=self.employee, agency=agency, start_date=start, end_date=end)

    def test_work_is_billed_to_the_agency_in_force_that_day(self):
        self.assign(self.first, date(2026, 1, 1), date(2026, 6, 30))
        self.assign(self.second, date(2026, 7, 1))

        before = make_work_entry(employee=self.employee, project=self.project,
                                 work_date=date(2026, 5, 12), service=self.service)
        after = make_work_entry(employee=self.employee, project=self.project,
                                work_date=date(2026, 8, 12), service=self.service)

        self.assertEqual(before.agency, self.first)
        self.assertEqual(after.agency, self.second)

    def test_a_transfer_does_not_re_bill_history_to_the_new_agency(self):
        self.assign(self.first, date(2026, 1, 1), date(2026, 6, 30))
        entry = make_work_entry(employee=self.employee, project=self.project,
                                work_date=date(2026, 5, 12), service=self.service)
        self.assign(self.second, date(2026, 7, 1))
        entry.refresh_from_db()
        self.assertEqual(entry.agency, self.first)

    def test_an_explicit_agency_is_never_overwritten(self):
        self.assign(self.first, date(2026, 1, 1))
        entry = make_work_entry(employee=self.employee, project=self.project,
                                work_date=date(2026, 5, 12), service=self.service,
                                agency=self.second)
        self.assertEqual(entry.agency, self.second)

    def test_an_agency_invoice_uses_the_agencys_own_rate_and_surcharges(self):
        self.assign(self.first, date(2026, 1, 1))
        entry = make_work_entry(employee=self.employee, project=self.project,
                                work_date=date(2026, 5, 12), service=self.service)
        breakdown = entry.get_agency_hours_breakdown(self.first)
        self.assertEqual(Decimal(str(breakdown['base_amount'])), Decimal('150.00'))


class AgencyInvoiceVatTests(TestCase):
    def setUp(self):
        from apps.employees.models import Agency

        self.agency = Agency.objects.create(
            name='Uitzend Verlegd', code='UZV', base_hourly_rate=Decimal('20.00'),
            btw_number='NL123456789B01')

    def _invoice(self, treatment):
        from apps.invoices.models import AgencyInvoice

        self.agency.vat_treatment_code = treatment
        self.agency.save()
        return AgencyInvoice(agency=self.agency, vat_rate=Decimal('21.00'))

    def test_a_reverse_charged_agency_invoice_carries_no_vat(self):
        invoice = self._invoice('REVERSE_CHARGE')
        self.assertEqual(invoice.charged_vat_on(Decimal('1000.00')), Decimal('0.00'))

    def test_an_ordinary_agency_invoice_carries_21_percent(self):
        invoice = self._invoice('NORMAL')
        self.assertEqual(invoice.charged_vat_on(Decimal('1000.00')), Decimal('210.00'))

    def test_an_unstated_treatment_keeps_the_invoices_own_rate(self):
        invoice = self._invoice('UNKNOWN')
        self.assertEqual(invoice.charged_vat_on(Decimal('1000.00')), Decimal('210.00'))
