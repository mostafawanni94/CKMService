"""
Tests for field-level encryption of BSN, IBAN and document numbers.

These cover the two things that matter: the plaintext must not survive on disk,
and it must survive a round trip. Everything else — masking, key errors, the
migration command — protects those two properties.
"""

from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core import encryption
from apps.core.encryption import (
    decrypt, encrypt, is_encrypted, mask_bsn, mask_generic, mask_iban,
)
from apps.core.testing import make_customer, make_employee, make_user



def _raw_column(table, column, pk, model=None):
    """
    Read a column straight from the database, bypassing the field converter.

    The pk is prepared through the model field because a UUID is stored without
    dashes on SQLite and as a native uuid on PostgreSQL.
    """
    from apps.employees.models import EmployeeProfile
    from apps.customers.models import Customer
    model = model or (Customer if 'customer' in table else EmployeeProfile)
    prepared = model._meta.pk.get_db_prep_value(pk, connection)
    with connection.cursor() as cursor:
        cursor.execute(f'SELECT {column} FROM {table} WHERE id = %s', [prepared])
        row = cursor.fetchone()
    return row[0] if row else None


def _write_raw(table, column, value, pk):
    """Force a column back to plaintext, as it was before the migration."""
    from apps.employees.models import EmployeeProfile
    prepared = EmployeeProfile._meta.pk.get_db_prep_value(pk, connection)
    with connection.cursor() as cursor:
        cursor.execute(f'UPDATE {table} SET {column} = %s WHERE id = %s',
                       [value, prepared])


class EncryptionPrimitiveTests(TestCase):
    def test_a_value_round_trips(self):
        self.assertEqual(decrypt(encrypt('123456782')), '123456782')

    def test_the_ciphertext_does_not_contain_the_plaintext(self):
        self.assertNotIn('123456782', encrypt('123456782'))

    def test_encryption_is_randomised(self):
        """Two encryptions of the same value must differ, or equality leaks."""
        self.assertNotEqual(encrypt('NL91ABNA0417164300'), encrypt('NL91ABNA0417164300'))

    def test_blank_and_none_pass_through(self):
        self.assertEqual(encrypt(''), '')
        self.assertIsNone(encrypt(None))
        self.assertEqual(decrypt(''), '')
        self.assertIsNone(decrypt(None))

    def test_encrypting_twice_does_not_double_encrypt(self):
        once = encrypt('123456782')
        self.assertEqual(encrypt(once), once)

    def test_legacy_plaintext_is_returned_unchanged(self):
        """A half-migrated column must still read, so the migration can run."""
        self.assertEqual(decrypt('123456782'), '123456782')

    def test_a_value_from_another_key_will_not_decrypt(self):
        from cryptography.fernet import Fernet
        token = encrypt('123456782')
        encryption.reset_fernet_cache()
        with override_settings(FIELD_ENCRYPTION_KEYS=Fernet.generate_key().decode()):
            with self.assertRaises(ImproperlyConfigured):
                decrypt(token)
        encryption.reset_fernet_cache()

    def test_a_missing_key_fails_loudly(self):
        encryption.reset_fernet_cache()
        with override_settings(FIELD_ENCRYPTION_KEYS=''):
            with self.assertRaises(ImproperlyConfigured):
                encrypt('123456782')
        encryption.reset_fernet_cache()

    def test_rotation_keeps_old_values_readable(self):
        from cryptography.fernet import Fernet
        from django.conf import settings

        old_key = settings.FIELD_ENCRYPTION_KEYS
        token = encrypt('123456782')

        new_key = Fernet.generate_key().decode()
        encryption.reset_fernet_cache()
        with override_settings(FIELD_ENCRYPTION_KEYS=f'{new_key},{old_key}'):
            # Old ciphertext still reads, new writes use the new key.
            self.assertEqual(decrypt(token), '123456782')
            self.assertEqual(decrypt(encrypt('987654321')), '987654321')
        encryption.reset_fernet_cache()


class MaskingTests(TestCase):
    def test_an_iban_keeps_only_its_country_and_last_two(self):
        self.assertEqual(mask_iban('NL20 INGB 0119 4132 56'), 'NL20 **** **** **** 56')

    def test_a_bsn_reveals_nothing(self):
        self.assertEqual(mask_bsn('123456782'), '*********')

    def test_a_generic_value_keeps_its_last_four(self):
        self.assertEqual(mask_generic('NL1234567'), '*****4567')

    def test_masking_a_blank_value_is_safe(self):
        for masker in (mask_iban, mask_bsn, mask_generic):
            self.assertEqual(masker(''), '')
            self.assertIsNone(masker(None))


class StorageTests(TestCase):
    """The column on disk must not hold the plaintext."""

    def test_the_bsn_column_holds_ciphertext(self):
        employee = make_employee(bsn='123456782')

        stored = _raw_column('employees_employeeprofile', 'bsn', employee.pk)

        self.assertTrue(is_encrypted(stored))
        self.assertNotIn('123456782', stored)

    def test_the_model_still_returns_the_plaintext(self):
        employee = make_employee(bsn='123456782', iban='NL91ABNA0417164300')
        employee.refresh_from_db()
        self.assertEqual(employee.bsn, '123456782')
        self.assertEqual(employee.iban, 'NL91ABNA0417164300')

    def test_a_customer_iban_is_encrypted_too(self):
        customer = make_customer(iban='NL91ABNA0417164300')
        stored = _raw_column('customers_customer', 'iban', customer.pk)
        self.assertTrue(is_encrypted(stored))

    def test_an_updated_value_is_re_encrypted(self):
        employee = make_employee(bsn='123456782')
        employee.bsn = '987654321'
        employee.save()
        employee.refresh_from_db()
        self.assertEqual(employee.bsn, '987654321')
        self.assertNotIn('987654321',
                         _raw_column('employees_employeeprofile', 'bsn', employee.pk))


class ApiExposureTests(TestCase):
    """Encryption protects the database; masking protects the API."""

    def setUp(self):
        self.employee = make_employee(bsn='123456782', iban='NL91ABNA0417164300')
        self.client = APIClient()

    def _profile(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client.get('/api/employees/profiles/me/')

    def test_an_admin_sees_the_real_values(self):
        admin = make_user(email='admin@enc.test', role='admin')
        client = APIClient()
        client.force_authenticate(admin)
        response = client.get(f'/api/employees/profiles/{self.employee.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['bsn'], '123456782')

    def test_an_employee_sees_their_own_real_values(self):
        response = self._profile(self.employee.user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['bsn'], '123456782')

    def test_another_employee_cannot_reach_the_record_at_all(self):
        other = make_employee(email='other@enc.test')
        client = APIClient()
        client.force_authenticate(other.user)
        response = client.get(f'/api/employees/profiles/{self.employee.id}/')
        self.assertEqual(response.status_code, 403)

    def test_an_operations_user_sees_a_mask_not_the_bsn(self):
        from rest_framework.test import APIRequestFactory

        from apps.employees.serializers import EmployeeProfileDetailSerializer

        ops = make_user(email='ops@enc.test', role='operations')
        request = APIRequestFactory().get('/')
        request.user = ops
        data = EmployeeProfileDetailSerializer(
            self.employee, context={'request': request}).data
        self.assertEqual(data['bsn'], '*********')
        self.assertNotIn('123456782', str(data))
        self.assertEqual(data['iban'], 'NL91 **** **** **** 00')

    def test_an_anonymous_context_never_reveals_a_value(self):
        from apps.employees.serializers import EmployeeProfileDetailSerializer
        data = EmployeeProfileDetailSerializer(self.employee, context={}).data
        self.assertNotIn('123456782', str(data))


class MigrationCommandTests(TestCase):
    def _raw(self, pk, column='bsn'):
        return _raw_column('employees_employeeprofile', column, pk)

    def test_it_encrypts_a_legacy_plaintext_row(self):
        from django.core.management import call_command

        employee = make_employee(bsn='123456782')
        # Force the column back to plaintext, as it was before the migration.
        _write_raw('employees_employeeprofile', 'bsn', '123456782', employee.pk)
        self.assertFalse(is_encrypted(self._raw(employee.pk)))

        call_command('encrypt_sensitive_fields', verbosity=0)

        self.assertTrue(is_encrypted(self._raw(employee.pk)))
        employee.refresh_from_db()
        self.assertEqual(employee.bsn, '123456782')

    def test_a_dry_run_writes_nothing(self):
        from django.core.management import call_command

        employee = make_employee(bsn='123456782')
        _write_raw('employees_employeeprofile', 'bsn', '123456782', employee.pk)

        call_command('encrypt_sensitive_fields', dry_run=True, verbosity=0)
        self.assertFalse(is_encrypted(self._raw(employee.pk)))

    def test_running_it_twice_is_safe(self):
        from django.core.management import call_command

        employee = make_employee(bsn='123456782')
        call_command('encrypt_sensitive_fields', verbosity=0)
        first = self._raw(employee.pk)
        call_command('encrypt_sensitive_fields', verbosity=0)
        # Already-encrypted rows are left exactly as they were.
        self.assertEqual(self._raw(employee.pk), first)
        employee.refresh_from_db()
        self.assertEqual(employee.bsn, '123456782')
