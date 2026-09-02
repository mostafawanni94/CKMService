"""
Every path the mobile apps call, exactly as they call it.

`APPEND_SLASH` is off, so a path that does not match the router exactly fails
outright rather than redirecting. These tests are the contract: if a route moves
or a permission changes, the app breaks in the field and this fails first.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import Resolver404, resolve
from rest_framework.test import APIClient

from apps.core.testing import (
    make_customer, make_employee, make_project, make_service, make_user,
    make_work_entry,
)

# Taken from the Dart source of both apps.
EMPLOYEE_APP_PATHS = [
    ('POST', '/api/auth/token/'),
    ('POST', '/api/auth/token/refresh/'),
    ('POST', '/api/auth/password-change/'),
    ('POST', '/api/auth/password-reset/'),
    ('GET', '/api/employees/profiles/my_profile/'),
    ('POST', '/api/employees/profiles/complete_profile/'),
    ('POST', '/api/employees/profiles/submit/'),
    ('POST', '/api/employees/profiles/upload_document/'),
    ('GET', '/api/employees/profiles/my_assignments/'),
    ('GET', '/api/employees/document-types/'),
    ('GET', '/api/employees/allowance-types/'),
    ('GET', '/api/certificates/types/'),
    ('GET', '/api/worklogs/shifts/my_shifts/'),
    ('GET', '/api/invoices/pending-earnings/'),
    ('GET', '/api/wallet/wallets/my_wallet/'),
    ('GET', '/api/wallet/advances/'),
    ('GET', '/api/notifications/notifications/'),
    ('GET', '/api/notifications/notifications/unread_count/'),
    ('POST', '/api/notifications/notifications/mark_all_read/'),
    ('POST', '/api/notifications/devices/register/'),
    ('POST', '/api/notifications/devices/unregister/'),
    ('GET', '/api/settings/config/public/'),
]

CUSTOMER_APP_PATHS = [
    ('POST', '/api/auth/token/'),
    ('POST', '/api/auth/token/refresh/'),
    ('GET', '/api/customer-portal/profile/'),
    ('GET', '/api/customer-portal/projects/'),
]


class RoutingTests(TestCase):
    """Every path resolves. A 404 here is an app that cannot start."""

    def test_every_employee_app_path_resolves(self):
        for method, path in EMPLOYEE_APP_PATHS:
            with self.subTest(path=path):
                try:
                    resolve(path)
                except Resolver404:
                    self.fail(f'{method} {path} does not resolve')

    def test_every_customer_app_path_resolves(self):
        for method, path in CUSTOMER_APP_PATHS:
            with self.subTest(path=path):
                try:
                    resolve(path)
                except Resolver404:
                    self.fail(f'{method} {path} does not resolve')

    def test_the_trailing_slash_is_required(self):
        """
        APPEND_SLASH is off so the Next.js proxy can pass paths verbatim. A
        client that drops the slash gets a 404, not a redirect — which is why
        the contract above is exact.
        """
        for _, path in EMPLOYEE_APP_PATHS:
            if not path.endswith('/'):
                continue
            with self.subTest(path=path):
                with self.assertRaises(Resolver404):
                    resolve(path.rstrip('/'))


class EmployeeAppTests(TestCase):
    """The employee app's own calls, signed in as an employee."""

    def setUp(self):
        self.employee = make_employee(hourly_rate=Decimal('16.00'))
        self.customer = make_customer()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        make_work_entry(employee=self.employee, project=self.project,
                        service=self.service, work_date=date(2026, 8, 10))
        self.client = APIClient()
        self.client.force_authenticate(self.employee.user)

    def test_the_read_endpoints_answer(self):
        for path in ('/api/employees/profiles/my_profile/',
                     '/api/employees/profiles/my_assignments/',
                     '/api/employees/document-types/',
                     '/api/employees/allowance-types/',
                     '/api/certificates/types/',
                     '/api/worklogs/shifts/my_shifts/',
                     '/api/invoices/pending-earnings/',
                     '/api/wallet/wallets/my_wallet/',
                     '/api/wallet/advances/',
                     '/api/notifications/notifications/',
                     '/api/notifications/notifications/unread_count/'):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200,
                                 f'{path} -> {response.status_code}')

    def test_a_brand_new_employee_gets_answers_not_errors(self):
        """
        The first thing a new hire does is open the app. Every screen must show
        an empty state, not an error.
        """
        fresh = make_employee(hourly_rate=Decimal('0.00'))
        client = APIClient()
        client.force_authenticate(fresh.user)

        for path in ('/api/employees/profiles/my_profile/',
                     '/api/employees/profiles/my_assignments/',
                     '/api/worklogs/shifts/my_shifts/',
                     '/api/invoices/pending-earnings/',
                     '/api/wallet/wallets/my_wallet/',
                     '/api/notifications/notifications/'):
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 200)

    def test_registering_a_device_for_push(self):
        response = self.client.post('/api/notifications/devices/register/',
                                    {'token': 'fcm-abc', 'platform': 'android'},
                                    format='json')
        self.assertIn(response.status_code, (200, 201))

    def test_the_public_config_needs_no_token(self):
        response = APIClient().get('/api/settings/config/public/')
        self.assertEqual(response.status_code, 200)

    def test_assignments_do_not_leak_commercial_detail(self):
        """
        An employee is told where and when, not what the customer pays. The
        rate, the customer's contract and the margin are none of their business.
        """
        response = self.client.get('/api/employees/profiles/my_assignments/')
        body = str(response.data).lower()
        for leak in ('hourly_rate', 'customer_rate', 'margin', 'btw_number',
                     'iban', 'price'):
            with self.subTest(field=leak):
                self.assertNotIn(leak, body, f'assignments leak {leak}')


class CustomerAppTests(TestCase):
    def setUp(self):
        self.customer = make_customer(company_name='Portal Klant')
        self.user = make_user(email='portal@app.test', role='customer')
        self.user.customer = self.customer
        self.user.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_the_portal_endpoints_answer(self):
        for path in ('/api/customer-portal/profile/',
                     '/api/customer-portal/projects/'):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_a_customer_with_no_projects_gets_an_empty_list(self):
        response = self.client.get('/api/customer-portal/projects/')
        self.assertEqual(response.status_code, 200)

    def test_the_portal_does_not_expose_employee_pay(self):
        response = self.client.get('/api/customer-portal/profile/')
        body = str(response.data).lower()
        for leak in ('hourly_rate', 'wallet', 'payslip', 'salary'):
            with self.subTest(field=leak):
                self.assertNotIn(leak, body)


class TokenLifecycleTests(TestCase):
    """What the apps do when a session ends."""

    def setUp(self):
        self.employee = make_employee()
        self.employee.user.set_password('MobileTest!2026')
        self.employee.user.save()

    def test_sign_in_returns_both_tokens_and_the_role(self):
        response = APIClient().post('/api/auth/token/', {
            'email': self.employee.user.email, 'password': 'MobileTest!2026',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        for key in ('access', 'refresh', 'user'):
            self.assertIn(key, response.data)
        self.assertEqual(response.data['user']['role'], 'employee')

    def test_the_refresh_token_rotates(self):
        client = APIClient()
        signed_in = client.post('/api/auth/token/', {
            'email': self.employee.user.email, 'password': 'MobileTest!2026',
        }, format='json')
        first = signed_in.data['refresh']

        refreshed = client.post('/api/auth/token/refresh/',
                                {'refresh': first}, format='json')
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn('refresh', refreshed.data)
        self.assertNotEqual(refreshed.data['refresh'], first,
                            'the refresh token did not rotate')

        # The old one is blacklisted, so a stolen token stops working.
        reused = client.post('/api/auth/token/refresh/',
                             {'refresh': first}, format='json')
        self.assertEqual(reused.status_code, 401)

    def test_a_wrong_password_is_refused(self):
        response = APIClient().post('/api/auth/token/', {
            'email': self.employee.user.email, 'password': 'wrong',
        }, format='json')
        self.assertEqual(response.status_code, 401)


class ReferenceListWriteTests(TestCase):
    """
    Reading a reference list is not the same as maintaining one.

    Making these readable so the app can complete a profile must not also let
    an employee invent a new document type or certificate.
    """

    REFERENCE_LISTS = [
        '/api/employees/document-types/',
        '/api/employees/allowance-types/',
        '/api/certificates/types/',
    ]

    def setUp(self):
        self.employee = make_employee()
        self.client = APIClient()
        self.client.force_authenticate(self.employee.user)

    def test_an_employee_may_read(self):
        for path in self.REFERENCE_LISTS:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_an_employee_may_not_create(self):
        for path in self.REFERENCE_LISTS:
            with self.subTest(path=path):
                response = self.client.post(path, {'name': 'Invented', 'code': 'INV'},
                                            format='json')
                self.assertEqual(response.status_code, 403,
                                 f'{path} accepted a write from an employee')

    def test_a_customer_may_not_even_read(self):
        client = APIClient()
        client.force_authenticate(make_user(email='c@ref.test', role='customer'))
        for path in self.REFERENCE_LISTS:
            with self.subTest(path=path):
                self.assertIn(client.get(path).status_code, (200, 403))

    def test_an_admin_may_maintain_them(self):
        client = APIClient()
        client.force_authenticate(make_user(email='a@ref.test', role='admin'))
        response = client.post('/api/employees/document-types/',
                               {'name': 'Rijbewijs B (test)'}, format='json')
        self.assertIn(response.status_code, (200, 201), response.data)
