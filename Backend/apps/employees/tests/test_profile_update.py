"""
Tests for editing an employee profile.

The detail serializer wrote `user.email` straight through with no uniqueness
check, so saving a profile with an address belonging to another account raised
IntegrityError — a Django HTML 500 page, which the dashboard then tried to
parse as JSON.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import make_employee, make_user


class ProfileEmailUpdateTests(TestCase):
    def setUp(self):
        self.admin = make_user(email='admin@ckm.test', role='admin')
        self.employee = make_employee(email='first@ckm.test')
        self.other = make_employee(email='second@ckm.test')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _patch(self, payload):
        return self.client.patch(
            f'/api/employees/profiles/{self.employee.id}/', payload, format='json',
        )

    def test_taking_another_accounts_email_is_a_400_not_a_500(self):
        response = self._patch({'user_email': 'second@ckm.test'})

        self.assertEqual(response.status_code, 400)
        self.assertIn('user_email', response.data)
        # The old behaviour was an uncaught IntegrityError.
        self.assertNotEqual(response.status_code, 500)

    def test_the_clash_is_case_insensitive(self):
        self.assertEqual(self._patch({'user_email': 'SECOND@ckm.test'}).status_code, 400)

    def test_keeping_your_own_email_still_saves(self):
        response = self._patch({'user_email': 'first@ckm.test', 'city': 'Rotterdam'})

        self.assertEqual(response.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.city, 'Rotterdam')

    def test_a_free_email_is_accepted(self):
        response = self._patch({'user_email': 'moved@ckm.test'})

        self.assertEqual(response.status_code, 200)
        self.employee.user.refresh_from_db()
        self.assertEqual(self.employee.user.email, 'moved@ckm.test')

    def test_a_rejected_email_leaves_the_login_untouched(self):
        """The email write and the profile write share one transaction."""
        self._patch({'user_email': 'second@ckm.test', 'city': 'Utrecht'})

        self.employee.user.refresh_from_db()
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.user.email, 'first@ckm.test')
        self.assertNotEqual(self.employee.city, 'Utrecht')

    def test_an_ordinary_edit_without_an_email_works(self):
        response = self._patch({'city': 'Den Haag', 'phone_number': '0611111111'})

        self.assertEqual(response.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.city, 'Den Haag')
