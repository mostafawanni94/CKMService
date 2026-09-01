"""Tests for the shared permission classes."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.permissions import (
    IsAdmin, IsBackOffice, IsCustomerUser, IsFinanceStaff, IsOperationsStaff,
)
from apps.core.testing import make_customer, make_user


class _FakeRequest:
    def __init__(self, user):
        self.user = user


class RolePermissionTests(TestCase):
    def setUp(self):
        self.admin = make_user(email='a@ckm.test', role='admin')
        self.finance = make_user(email='f@ckm.test', role='finance')
        self.operations = make_user(email='o@ckm.test', role='operations')
        self.employee = make_user(email='e@ckm.test', role='employee')

    def _allows(self, permission, user):
        return permission().has_permission(_FakeRequest(user), None)

    def test_admin_passes_every_back_office_gate(self):
        for permission in (IsAdmin, IsFinanceStaff, IsOperationsStaff, IsBackOffice):
            self.assertTrue(self._allows(permission, self.admin), permission.__name__)

    def test_finance_passes_finance_but_not_admin_only(self):
        self.assertTrue(self._allows(IsFinanceStaff, self.finance))
        self.assertTrue(self._allows(IsBackOffice, self.finance))
        self.assertFalse(self._allows(IsAdmin, self.finance))
        self.assertFalse(self._allows(IsOperationsStaff, self.finance))

    def test_operations_passes_operations_but_not_finance(self):
        self.assertTrue(self._allows(IsOperationsStaff, self.operations))
        self.assertTrue(self._allows(IsBackOffice, self.operations))
        self.assertFalse(self._allows(IsFinanceStaff, self.operations))

    def test_employee_passes_no_back_office_gate(self):
        for permission in (IsAdmin, IsFinanceStaff, IsOperationsStaff, IsBackOffice):
            self.assertFalse(self._allows(permission, self.employee), permission.__name__)

    def test_customer_portal_user_needs_a_linked_customer(self):
        unlinked = make_user(email='c1@ckm.test', role='customer')
        self.assertFalse(self._allows(IsCustomerUser, unlinked))

        linked = make_user(email='c2@ckm.test', role='customer', customer=make_customer())
        self.assertTrue(self._allows(IsCustomerUser, linked))

    def test_anonymous_passes_nothing(self):
        from django.contrib.auth.models import AnonymousUser
        for permission in (IsAdmin, IsFinanceStaff, IsBackOffice, IsCustomerUser):
            self.assertFalse(self._allows(permission, AnonymousUser()), permission.__name__)


class EndpointAuthorizationTests(TestCase):
    """The role split has to hold at the HTTP layer, not just in unit tests."""

    def setUp(self):
        self.finance = make_user(email='fin@ckm.test', role='finance')
        self.employee = make_user(email='emp@ckm.test', role='employee')

    def test_finance_may_read_incoming_invoices(self):
        client = APIClient()
        client.force_authenticate(self.finance)
        self.assertEqual(client.get('/api/invoices/incoming-invoices/').status_code, 200)

    def test_employee_may_not_read_incoming_invoices(self):
        client = APIClient()
        client.force_authenticate(self.employee)
        self.assertEqual(client.get('/api/invoices/incoming-invoices/').status_code, 403)

    def test_anonymous_is_rejected(self):
        self.assertIn(
            APIClient().get('/api/invoices/incoming-invoices/').status_code, (401, 403),
        )

    def test_employee_may_not_run_payroll(self):
        client = APIClient()
        client.force_authenticate(self.employee)
        self.assertEqual(client.get('/api/hr/payroll-periods/').status_code, 403)


class RelativePaginationTests(TestCase):
    """
    Pagination links must be relative.

    DRF builds absolute links from the request it sees. The dashboard talks to
    the API through the Next.js proxy, so an absolute link pointed the browser
    at the backend's own host — bypassing the proxy and, in production, exposing
    the internal hostname.
    """

    def setUp(self):
        from apps.core.testing import make_employee, make_project, make_work_entry
        from datetime import date, timedelta

        self.admin = make_user(email='pager@ckm.test', role='admin')
        employee = make_employee()
        project = make_project()
        # Enough entries to force a second page.
        for offset in range(25):
            make_work_entry(
                employee=employee, project=project,
                work_date=date(2026, 3, 1) + timedelta(days=offset),
                start='09:00', end='17:00',
            )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_next_link_is_relative(self):
        response = self.client.get('/api/worklogs/?include_past=true&page_size=10')

        self.assertEqual(response.status_code, 200)
        next_link = response.data.get('next')
        self.assertIsNotNone(next_link, 'expected a second page')
        self.assertTrue(next_link.startswith('/'), f'not relative: {next_link}')
        self.assertNotIn('http://', next_link)
        self.assertNotIn('testserver', next_link)

    def test_previous_link_is_relative(self):
        response = self.client.get('/api/worklogs/?include_past=true&page_size=10&page=2')

        previous = response.data.get('previous')
        self.assertIsNotNone(previous)
        self.assertTrue(previous.startswith('/'), f'not relative: {previous}')

    def test_the_link_preserves_the_other_query_params(self):
        response = self.client.get('/api/worklogs/?include_past=true&page_size=10')
        self.assertIn('include_past=true', response.data['next'])

    def test_following_the_link_returns_the_next_page(self):
        first = self.client.get('/api/worklogs/?include_past=true&page_size=10')
        second = self.client.get(first.data['next'])

        self.assertEqual(second.status_code, 200)
        self.assertNotEqual(
            [row['id'] for row in first.data['results']],
            [row['id'] for row in second.data['results']],
        )


class ProtectedMediaTests(TestCase):
    """
    MEDIA_ROOT holds ID documents, contracts and work photos. It was served by
    static() with no access control: ~1,500 files were downloadable by anyone
    who guessed a path, and the filenames are people's names.
    """

    def setUp(self):
        import tempfile, pathlib
        from django.test import override_settings
        self.tmp = tempfile.mkdtemp()
        (pathlib.Path(self.tmp) / 'employees').mkdir()
        self.rel = 'employees/contract.pdf'
        (pathlib.Path(self.tmp) / self.rel).write_bytes(b'%PDF-1.4 secret')
        self.override = override_settings(MEDIA_ROOT=self.tmp)
        self.override.enable()

    def tearDown(self):
        import shutil
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_an_unsigned_request_is_refused(self):
        self.assertEqual(self.client.get(f'/media/{self.rel}').status_code, 403)

    def test_a_forged_signature_is_refused(self):
        response = self.client.get(f'/media/{self.rel}?sig=not-a-real-signature')
        self.assertEqual(response.status_code, 403)

    def test_a_valid_signature_serves_the_file(self):
        from apps.core.media import sign_path
        response = self.client.get(f'/media/{self.rel}?sig={sign_path(self.rel)}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), b'%PDF-1.4 secret')

    def test_a_signature_for_one_file_does_not_open_another(self):
        import pathlib
        from apps.core.media import sign_path
        other = 'employees/other.pdf'
        (pathlib.Path(self.tmp) / other).write_bytes(b'other')
        response = self.client.get(f'/media/{other}?sig={sign_path(self.rel)}')
        self.assertEqual(response.status_code, 403)

    def test_a_signature_expires(self):
        from apps.core.media import sign_path, verify_path
        self.assertFalse(verify_path(self.rel, sign_path(self.rel), ttl=-1))

    def test_path_traversal_is_refused(self):
        from apps.core.media import sign_path
        evil = '../config/settings.py'
        response = self.client.get(f'/media/{evil}?sig={sign_path(evil)}')
        self.assertIn(response.status_code, (403, 404))

    def test_signed_media_url_returns_none_for_an_empty_field(self):
        from apps.core.media import signed_media_url
        self.assertIsNone(signed_media_url(None))
