"""
Security invariants.

Each of these guards a hole that was actually reachable in this codebase at some
point, so they are regression tests rather than hypotheticals.
"""

from datetime import date

from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    make_customer, make_employee, make_project, make_service, make_user,
    make_work_entry,
)


class MediaAccessTests(TestCase):
    """Uploaded documents are not public files."""

    def test_an_unsigned_media_url_is_refused(self):
        response = self.client.get('/media/employees/contract.pdf')
        self.assertIn(response.status_code, (403, 404))

    def test_a_forged_signature_is_refused(self):
        response = self.client.get(
            '/media/employees/contract.pdf?sig=not-a-real-signature')
        self.assertIn(response.status_code, (403, 404))

    def test_path_traversal_is_refused(self):
        response = self.client.get('/media/../config/settings.py')
        self.assertIn(response.status_code, (403, 404))


class CustomerVisibilityTests(TestCase):
    """
    An employee sees the customers they work for, and nobody else's.

    This endpoint used to return every active customer to any authenticated
    user, so a customer-portal login could enumerate the whole client list.
    """

    def setUp(self):
        self.mine = make_customer(company_name='Mijn Klant')
        self.theirs = make_customer(company_name='Andermans Klant')
        self.employee = make_employee()
        self.project = make_project(customer=self.mine)
        make_work_entry(employee=self.employee, project=self.project,
                        work_date=date(2026, 8, 10), service=make_service())

        self.client = APIClient()
        self.client.force_authenticate(self.employee.user)

    def _names(self, response):
        rows = response.data.get('results', response.data)
        return {row['company_name'] for row in rows}

    def test_an_employee_sees_only_their_own_customers(self):
        response = self.client.get('/api/customers/worklog-customers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._names(response), {'Mijn Klant'})

    def test_the_back_office_still_sees_everything(self):
        client = APIClient()
        client.force_authenticate(make_user(email='ops@sec.test', role='operations'))
        response = client.get('/api/customers/worklog-customers/')
        self.assertIn('Andermans Klant', self._names(response))


class FinancialAccessTests(TestCase):
    """Money endpoints answer to finance staff only."""

    ENDPOINTS = [
        '/api/invoices/invoices/',
        '/api/invoices/agency-invoices/',
        '/api/invoices/incoming-invoices/',
        '/api/expenses/expenses/',
        '/api/vat/periods/',
        '/api/vat/ledger/',
        '/api/vat/dashboard/',
    ]

    def test_an_employee_reaches_none_of_them(self):
        client = APIClient()
        client.force_authenticate(make_employee().user)
        for path in self.ENDPOINTS:
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 403)

    def test_a_customer_login_reaches_none_of_them(self):
        client = APIClient()
        client.force_authenticate(make_user(email='cust@sec.test', role='customer'))
        for path in self.ENDPOINTS:
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 403)

    def test_an_anonymous_request_reaches_none_of_them(self):
        client = APIClient()
        for path in self.ENDPOINTS:
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 401)


class PaginationTests(TestCase):
    """A client cannot ask for the entire database in one request."""

    def test_the_default_page_size_is_capped(self):
        from apps.core.pagination import RelativePageNumberPagination

        self.assertLessEqual(RelativePageNumberPagination.max_page_size, 200)

    def test_every_pagination_class_has_a_cap(self):
        from apps.core import pagination

        for name in dir(pagination):
            cls = getattr(pagination, name)
            # Only our own classes; DRF's imported base has no cap by design.
            if (isinstance(cls, type) and name.endswith('Pagination')
                    and cls.__module__ == pagination.__name__):
                with self.subTest(cls=name):
                    self.assertIsNotNone(getattr(cls, 'max_page_size', None))


class RendererTests(TestCase):
    """
    The browsable API is a development tool, not a production surface.

    The renderer list is built when settings are imported, so it reflects the
    DEBUG value from the environment — not `settings.DEBUG`, which the test
    runner forces to False after import. The module attribute is the honest
    thing to compare against.
    """

    def test_json_is_always_available(self):
        self.assertIn('rest_framework.renderers.JSONRenderer',
                      settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'])

    def test_the_browsable_api_follows_the_configured_debug_flag(self):
        import config.settings as configured

        renderers = settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES']
        browsable = 'rest_framework.renderers.BrowsableAPIRenderer'
        if configured.DEBUG:
            self.assertIn(browsable, renderers)
        else:
            self.assertNotIn(browsable, renderers)


class ThrottleTests(TestCase):
    def test_login_and_password_reset_have_their_own_buckets(self):
        rates = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
        self.assertIn('login', rates)
        self.assertIn('password_reset', rates)


class EncryptionTests(TestCase):
    """Sensitive fields are ciphertext at rest."""

    def test_an_iban_is_not_stored_in_the_clear(self):
        from django.db import connection

        customer = make_customer(company_name='Encrypted BV')
        customer.iban = 'NL20INGB0119413256'
        customer.save()

        with connection.cursor() as cursor:
            # SQLite stores the UUID primary key without dashes.
            cursor.execute('SELECT iban FROM customers_customer WHERE id = %s',
                           [customer.pk.hex])
            stored = cursor.fetchone()[0]

        self.assertNotIn('INGB', stored)
        self.assertTrue(stored.startswith('enc$v1'))
        customer.refresh_from_db()
        self.assertEqual(customer.iban, 'NL20INGB0119413256')

    def test_the_company_iban_is_encrypted_too(self):
        from django.db import connection

        from apps.core.models import SystemConfig

        config = SystemConfig.objects.get_config()
        config.company_iban = 'NL20INGB0119413256'
        config.save()

        with connection.cursor() as cursor:
            cursor.execute('SELECT company_iban FROM core_systemconfig WHERE id = %s',
                           [config.pk])
            stored = cursor.fetchone()[0]
        self.assertTrue(stored.startswith('enc$v1'))
