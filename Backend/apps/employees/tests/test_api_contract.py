"""
Contract tests for the endpoints the mobile apps depend on.

Several of these routes did not exist, so the employee app was calling into
404s: the whole shifts feature, `/employees/me/`, `/invoices/pending-earnings/`,
password reset, and every notification path. These tests pin the URLs so a
future rename fails here rather than silently in a shipped app.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import Resolver404, resolve
from rest_framework.test import APIClient

from apps.core.testing import make_employee, make_project, make_user, make_work_entry


class RouteExistenceTests(TestCase):
    """Every path a client actually calls must resolve."""

    MOBILE_PATHS = [
        '/api/auth/token/',
        '/api/auth/token/refresh/',
        '/api/auth/password-change/',
        '/api/auth/password-reset/',
        '/api/auth/password-reset/confirm/',
        '/api/employees/profiles/me/',
        '/api/employees/profiles/my_profile/',
        '/api/employees/profiles/upload_document/',
        '/api/employees/profiles/my_assignments/',
        '/api/employees/profiles/contracts/',
        '/api/employees/allowance-types/',
        '/api/certificates/types/',
        '/api/customers/worklog-customers/',
        '/api/invoices/pending-earnings/',
        '/api/invoices/incoming-invoices/',
        '/api/notifications/notifications/',
        '/api/notifications/notifications/unread_count/',
        '/api/notifications/notifications/mark_all_read/',
        '/api/notifications/devices/register/',
        '/api/notifications/devices/unregister/',
        '/api/settings/config/',
        '/api/settings/config/public/',
        '/api/wallet/wallets/my_wallet/',
        '/api/wallet/advances/',
        '/api/worklogs/',
        '/api/worklogs/entries/',
        '/api/worklogs/shifts/my_shifts/',
        '/api/worklogs/shifts/pending/',
        '/api/worklogs/export/customer/',
        '/api/hr/leave-requests/',
        '/api/hr/leave-requests/my/',
        '/api/hr/payroll-periods/',
        '/api/hr/payslips/my/',
        '/api/hr/attendance/',
    ]

    def test_every_client_path_resolves(self):
        unresolved = []
        for path in self.MOBILE_PATHS:
            try:
                resolve(path)
            except Resolver404:
                unresolved.append(path)
        self.assertEqual(unresolved, [], f'These paths 404: {unresolved}')

    def test_shift_detail_actions_resolve(self):
        pk = '00000000-0000-0000-0000-000000000001'
        for suffix in ('', 'acknowledge/', 'fill_data/', 'submit/'):
            resolve(f'/api/worklogs/shifts/{pk}/{suffix}')


class TokenClaimsTests(TestCase):
    """Login must return the role so the dashboard can render for it."""

    def test_access_token_carries_role_and_email(self):
        make_user(email='finance@ckm.test', role='finance', password='TestPass!234')
        response = self.client.post('/api/auth/token/', {
            'email': 'finance@ckm.test', 'password': 'TestPass!234',
        }, content_type='application/json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        self.assertEqual(response.json()['user']['role'], 'finance')

        import jwt
        claims = jwt.decode(
            response.json()['access'], options={'verify_signature': False},
        )
        self.assertEqual(claims['role'], 'finance')
        self.assertEqual(claims['email'], 'finance@ckm.test')


class PasswordResetTests(TestCase):
    def test_unknown_address_gets_the_same_answer_as_a_known_one(self):
        """A differing response would let anyone enumerate accounts."""
        make_user(email='known@ckm.test', role='admin')

        known = self.client.post('/api/auth/password-reset/', {
            'email': 'known@ckm.test'}, content_type='application/json')
        unknown = self.client.post('/api/auth/password-reset/', {
            'email': 'nobody@ckm.test'}, content_type='application/json')

        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.json(), unknown.json())

    def test_a_bad_token_is_refused(self):
        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': 'bogus', 'token': 'bogus', 'new_password': 'BrandNew!234',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)


class PendingEarningsTests(TestCase):
    def setUp(self):
        self.employee = make_employee(
            hourly_rate=Decimal('20.00'), receives_surcharges=False,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.employee.user)

    def test_approved_and_submitted_work_counts_as_pending(self):
        project = make_project()
        make_work_entry(
            employee=self.employee, project=project, work_date=date(2026, 8, 25),
            start='09:00', end='17:00', break_minutes=0, status='approved',
        )
        make_work_entry(
            employee=self.employee, project=project, work_date=date(2026, 8, 26),
            start='09:00', end='13:00', break_minutes=0, status='submitted',
        )

        response = self.client.get('/api/invoices/pending-earnings/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['approved_count'], 1)
        self.assertEqual(response.data['submitted_count'], 1)
        # 8h + 4h at €20.00
        self.assertEqual(response.data['total_pending_amount'], '240.00')

    def test_an_account_without_a_profile_gets_empty_totals(self):
        client = APIClient()
        client.force_authenticate(make_user(email='noprofile@ckm.test', role='admin'))
        response = client.get('/api/invoices/pending-earnings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_pending_amount'], '0.00')
