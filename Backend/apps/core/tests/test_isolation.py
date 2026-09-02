"""
Object-level authorization.

Role permissions decide which *endpoints* you reach. These tests are about the
other half: given an endpoint you may use, can you reach a row that is not
yours by putting someone else's id in the URL?

Every test here attacks the system from a real client's position.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    attach_service_rate, make_customer, make_employee, make_project, make_service,
    make_user, make_work_entry,
)

MONDAY = date(2026, 8, 10)


class TwoOfEverything(TestCase):
    """Two customers, two employees, no overlap. Nobody may cross the line."""

    def setUp(self):
        self.service = make_service(name='Schoonmaak')

        # --- organisation A ---
        self.customer_a = make_customer(company_name='Alpha BV',
                                        btw_number='NL111111111B01')
        self.customer_a.vat_treatment_code = 'NORMAL'
        self.customer_a.save()
        self.project_a = make_project(customer=self.customer_a, name='Alpha kantoor')
        attach_service_rate(self.customer_a, self.service, Decimal('40.00'))
        self.employee_a = make_employee(hourly_rate=Decimal('16.00'))
        self.entry_a = make_work_entry(
            employee=self.employee_a, project=self.project_a,
            service=self.service, work_date=MONDAY)

        # --- organisation B ---
        self.customer_b = make_customer(company_name='Beta BV',
                                        btw_number='NL222222222B01')
        self.customer_b.vat_treatment_code = 'NORMAL'
        self.customer_b.save()
        self.project_b = make_project(customer=self.customer_b, name='Beta depot')
        attach_service_rate(self.customer_b, self.service, Decimal('55.00'))
        self.employee_b = make_employee(hourly_rate=Decimal('19.00'))
        self.entry_b = make_work_entry(
            employee=self.employee_b, project=self.project_b,
            service=self.service, work_date=MONDAY)

        # --- the people ---
        self.portal_a = make_user(email='portal-a@alpha.test', role='customer')
        self.portal_a.customer = self.customer_a
        self.portal_a.save()

        self.portal_b = make_user(email='portal-b@beta.test', role='customer')
        self.portal_b.customer = self.customer_b
        self.portal_b.save()

        self.admin = make_user(email='admin@ckm.test', role='admin')

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client


class CustomerCannotReachAnotherCustomerTests(TwoOfEverything):
    """
    The portal login for Alpha must not reach anything belonging to Beta, by
    any route: listing, detail by id, or a nested collection.
    """

    def setUp(self):
        super().setUp()
        self.alpha = self.client_for(self.portal_a)

    def test_the_customer_list_shows_only_their_own(self):
        response = self.alpha.get('/api/customers/worklog-customers/')
        self.assertEqual(response.status_code, 200)
        rows = response.data.get('results', response.data)
        self.assertEqual({row['company_name'] for row in rows}, {'Alpha BV'})

    def test_fetching_another_customer_by_id_is_refused(self):
        response = self.alpha.get(
            f'/api/customers/worklog-customers/{self.customer_b.pk}/')
        self.assertIn(response.status_code, (403, 404), response.data)

    def test_the_portal_projects_list_shows_only_their_own(self):
        response = self.alpha.get('/api/customer-portal/projects/')
        self.assertEqual(response.status_code, 200)
        rows = response.data.get('results', response.data)
        names = {row.get('name') for row in rows} if rows else set()
        self.assertNotIn('Beta depot', names)

    def test_another_customers_project_is_refused(self):
        for path in (
            f'/api/customer-portal/projects/{self.project_b.pk}/',
            f'/api/customer-portal/projects/{self.project_b.pk}/entries/',
            f'/api/customer-portal/projects/{self.project_b.pk}/calendar/',
            f'/api/customer-portal/projects/{self.project_b.pk}/export/',
        ):
            with self.subTest(path=path):
                response = self.alpha.get(path)
                self.assertIn(response.status_code, (403, 404),
                              f'{path} returned {response.status_code}')

    def test_their_own_project_is_reachable(self):
        """The control: the isolation must not be achieved by refusing everyone."""
        response = self.alpha.get(
            f'/api/customer-portal/projects/{self.project_a.pk}/')
        self.assertEqual(response.status_code, 200)

    def test_a_customer_reaches_no_financial_endpoint(self):
        for path in ('/api/invoices/invoices/', '/api/invoices/agency-invoices/',
                     '/api/invoices/incoming-invoices/', '/api/expenses/expenses/',
                     '/api/vat/periods/', '/api/vat/ledger/', '/api/vat/dashboard/',
                     '/api/wallet/wallets/', '/api/hr/payslips/'):
            with self.subTest(path=path):
                self.assertIn(self.alpha.get(path).status_code, (403, 404))

    def test_a_customer_cannot_read_employee_records(self):
        for path in ('/api/employees/profiles/', '/api/employees/users/',
                     f'/api/employees/profiles/{self.employee_b.pk}/'):
            with self.subTest(path=path):
                self.assertIn(self.alpha.get(path).status_code, (403, 404))

    def test_a_customer_cannot_read_another_customers_work_entries(self):
        response = self.alpha.get(f'/api/worklogs/entries/{self.entry_b.pk}/')
        self.assertIn(response.status_code, (403, 404))


class EmployeeCannotReachAnotherEmployeeTests(TwoOfEverything):
    def setUp(self):
        super().setUp()
        self.mobile = self.client_for(self.employee_a.user)

    def test_their_own_profile_is_reachable(self):
        response = self.mobile.get('/api/employees/profiles/me/')
        self.assertEqual(response.status_code, 200)

    def test_another_employees_profile_is_refused(self):
        response = self.mobile.get(f'/api/employees/profiles/{self.employee_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_another_employees_work_entry_is_refused(self):
        response = self.mobile.get(f'/api/worklogs/entries/{self.entry_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_the_work_entry_list_shows_only_their_own(self):
        response = self.mobile.get('/api/worklogs/entries/')
        self.assertEqual(response.status_code, 200)
        rows = response.data.get('results', response.data)
        employees = {str(row.get('employee')) for row in rows}
        self.assertNotIn(str(self.employee_b.pk), employees)

    def test_another_employees_wallet_is_refused(self):
        from apps.wallet.services import wallet_for

        wallet_b = wallet_for(self.employee_b)
        response = self.mobile.get(f'/api/wallet/wallets/{wallet_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_their_own_wallet_is_reachable(self):
        response = self.mobile.get('/api/wallet/wallets/my_wallet/')
        self.assertEqual(response.status_code, 200)

    def test_another_employees_payslip_is_refused(self):
        from apps.hr.models import PayrollPeriod, Payslip

        period = PayrollPeriod.objects.create(
            name='Augustus 2026', start_date=MONDAY,
            end_date=MONDAY + timedelta(days=20))
        payslip_b = Payslip.objects.create(
            period=period, employee=self.employee_b, net_pay=Decimal('500.00'))

        response = self.mobile.get(f'/api/hr/payslips/{payslip_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_an_employee_reaches_no_financial_endpoint(self):
        for path in ('/api/invoices/invoices/', '/api/expenses/expenses/',
                     '/api/vat/periods/', '/api/vat/dashboard/',
                     '/api/invoices/incoming-invoices/'):
            with self.subTest(path=path):
                self.assertEqual(self.mobile.get(path).status_code, 403)

    def test_an_employee_cannot_approve_their_own_work(self):
        entry = make_work_entry(
            employee=self.employee_a, project=self.project_a, service=self.service,
            work_date=MONDAY + timedelta(days=1), status='submitted')
        response = self.mobile.post(f'/api/worklogs/entries/{entry.pk}/approve/',
                                    {}, format='json')
        self.assertEqual(response.status_code, 403)
        entry.refresh_from_db()
        self.assertEqual(entry.status, 'submitted')

    def test_an_employee_cannot_change_their_own_hourly_rate(self):
        response = self.mobile.patch(
            f'/api/employees/profiles/{self.employee_a.pk}/',
            {'hourly_rate': '99.00'}, format='json')
        self.employee_a.refresh_from_db()
        self.assertEqual(self.employee_a.hourly_rate, Decimal('16.00'),
                         f'rate changed via {response.status_code}')


class RoleBoundaryTests(TwoOfEverything):
    """Operations is not finance, and finance is not operations."""

    def setUp(self):
        super().setUp()
        self.operations = self.client_for(
            make_user(email='ops@ckm.test', role='operations'))
        self.finance = self.client_for(
            make_user(email='fin@ckm.test', role='finance'))

    def test_operations_cannot_reach_finance(self):
        for path in ('/api/invoices/invoices/', '/api/vat/periods/',
                     '/api/vat/dashboard/', '/api/expenses/expenses/',
                     '/api/invoices/incoming-invoices/'):
            with self.subTest(path=path):
                self.assertEqual(self.operations.get(path).status_code, 403)

    def test_finance_can(self):
        for path in ('/api/invoices/invoices/', '/api/vat/periods/',
                     '/api/vat/dashboard/', '/api/expenses/expenses/'):
            with self.subTest(path=path):
                self.assertEqual(self.finance.get(path).status_code, 200)

    def test_finance_cannot_reopen_a_filed_period(self):
        """Reopening a filed return is an admin decision."""
        from apps.vat.models import VatPeriod

        period = VatPeriod.for_date(MONDAY)
        response = self.finance.post(
            f'/api/vat/periods/{period.pk}/reopen/',
            {'reason': 'A sufficiently long and genuine reason.'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_neither_can_change_the_company_identity(self):
        for client, label in ((self.operations, 'operations'),
                              (self.finance, 'finance')):
            with self.subTest(role=label):
                response = client.patch('/api/settings/config/',
                                        {'company_kvk_number': '00000000'},
                                        format='json')
                self.assertEqual(response.status_code, 403)


class TokenTests(TwoOfEverything):
    """A request without a good token reaches nothing."""

    PROTECTED = [
        '/api/employees/profiles/', '/api/customers/customers/',
        '/api/worklogs/entries/', '/api/invoices/invoices/',
        '/api/vat/periods/', '/api/wallet/wallets/', '/api/hr/payslips/',
    ]

    def test_no_token(self):
        client = APIClient()
        for path in self.PROTECTED:
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 401)

    def test_a_malformed_token(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer not-a-real-token')
        for path in self.PROTECTED:
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 401)

    def test_a_token_for_a_deactivated_user(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        user = make_user(email='gone@ckm.test', role='admin')
        token = str(RefreshToken.for_user(user).access_token)
        user.is_active = False
        user.save()

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(client.get('/api/invoices/invoices/').status_code, 401)


class DocumentAccessTests(TwoOfEverything):
    """An uploaded document is not reachable by guessing its path."""

    def test_media_needs_a_signature(self):
        client = APIClient()
        client.force_authenticate(self.portal_a)
        for path in ('/media/employees/contract.pdf',
                     '/media/invoices/2026/F2026-001.pdf',
                     '/media/customers/logos/logo.png'):
            with self.subTest(path=path):
                self.assertIn(client.get(path).status_code, (403, 404))

    def test_another_customers_invoice_pdf_is_refused(self):
        from apps.invoices.billing import generate_invoice, issue_invoice

        invoice = generate_invoice(self.customer_b, week=(2026, 33),
                                   actor=self.admin)
        issue_invoice(invoice, actor=self.admin, issue_date=MONDAY)

        client = self.client_for(self.portal_a)
        self.assertIn(
            client.get(f'/api/invoices/invoices/{invoice.pk}/pdf/').status_code,
            (403, 404))
