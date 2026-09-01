"""
Schema invariants that protect financial data.

These are the properties a database has to keep once it holds a real year of
work: money is never a float, financial history survives a deletion elsewhere,
and every paginated list has a stable order.
"""

from django.apps import apps
from django.db.models import DecimalField, FloatField
from django.test import TestCase

OUR_APPS = [config for config in apps.get_app_configs()
            if config.name.startswith('apps.')]
FINANCIAL_APPS = {'invoices', 'vat', 'wallet', 'expenses', 'hr'}


def our_models():
    for config in OUR_APPS:
        for model in config.get_models():
            yield model


class MoneyTypeTests(TestCase):
    def test_no_money_is_stored_as_a_float(self):
        offenders = [
            f'{model._meta.label}.{field.name}'
            for model in our_models()
            for field in model._meta.fields
            if isinstance(field, FloatField)
        ]
        self.assertEqual(offenders, [], 'floats cannot represent cents exactly')

    def test_money_fields_carry_two_decimal_places(self):
        skip = ('rate', 'percentage', 'confidence', 'hours', 'quantity', 'factor')
        offenders = [
            f'{model._meta.label}.{field.name} '
            f'({field.max_digits},{field.decimal_places})'
            for model in our_models()
            for field in model._meta.fields
            if isinstance(field, DecimalField)
            and field.decimal_places != 2
            and not any(word in field.name for word in skip)
        ]
        self.assertEqual(offenders, [])


class DeletionSafetyTests(TestCase):
    """A deletion somewhere else must not erase what someone was paid."""

    PROTECTED = [
        ('wallet', 'Wallet', 'employee'),
        ('wallet', 'AdvanceRequest', 'employee'),
        ('hr', 'Payslip', 'period'),
        ('invoices', 'ProjectRate', 'project'),
        ('invoices', 'Invoice', 'customer'),
        ('invoices', 'InvoiceLine', 'project'),
        ('invoices', 'InvoiceLine', 'employee'),
    ]

    def test_financial_relations_are_protected(self):
        from django.db.models.deletion import PROTECT

        for app_label, model_name, field_name in self.PROTECTED:
            with self.subTest(f'{app_label}.{model_name}.{field_name}'):
                model = apps.get_model(app_label, model_name)
                field = model._meta.get_field(field_name)
                self.assertIs(field.remote_field.on_delete, PROTECT)

    def test_hard_deleting_an_employee_with_a_wallet_is_refused(self):
        """
        Employees are soft-deleted in normal use. A hard delete — from the
        admin, a shell, or a cleanup script — must not silently take the
        wallet ledger with it.
        """
        from django.db.models import ProtectedError

        from apps.core.testing import make_employee
        from apps.employees.models import EmployeeProfile
        from apps.wallet.services import wallet_for

        employee = make_employee()
        wallet_for(employee)
        with self.assertRaises(ProtectedError):
            EmployeeProfile.all_objects.filter(pk=employee.pk).delete()

    def test_invoice_lines_still_belong_to_their_invoice(self):
        """Lines are part of the document, so they go with it — by design."""
        from django.db.models.deletion import CASCADE

        from apps.invoices.models import InvoiceLine

        self.assertIs(
            InvoiceLine._meta.get_field('invoice').remote_field.on_delete, CASCADE)


class OrderingTests(TestCase):
    def test_every_model_has_a_default_ordering(self):
        """
        An unordered queryset paginates unstably: the same row can appear on
        two pages and another can be skipped, because the database is free to
        return rows in any order it likes.
        """
        unordered = [
            model._meta.label for model in our_models()
            if not model._meta.ordering and not model._meta.abstract
        ]
        self.assertEqual(unordered, [])


class IndexCoverageTests(TestCase):
    def test_every_foreign_key_is_indexed(self):
        offenders = []
        for model in our_models():
            indexed = {index.fields[0].lstrip('-')
                       for index in model._meta.indexes if index.fields}
            for constraint in model._meta.constraints:
                fields = getattr(constraint, 'fields', None)
                if fields:
                    indexed.add(fields[0])
            for field in model._meta.fields:
                if not field.is_relation:
                    continue
                if (field.db_index or field.unique or field.primary_key
                        or field.name in indexed):
                    continue
                offenders.append(f'{model._meta.label}.{field.name}')
        self.assertEqual(offenders, [])

    def test_the_financial_hot_paths_have_composite_indexes(self):
        expected = {
            ('worklogs', 'WorkEntry'): {'billing_week_year'},
            ('invoices', 'Invoice'): {'document_type', 'period_start'},
            ('invoices', 'InvoiceLine'): {'work_entry'},
            ('wallet', 'WalletTransaction'): {'reference_type'},
            ('expenses', 'Expense'): {'expense_date'},
        }
        for (app_label, model_name), required in expected.items():
            model = apps.get_model(app_label, model_name)
            covered = set()
            for index in model._meta.indexes:
                covered.update(field.lstrip('-') for field in index.fields)
            with self.subTest(f'{app_label}.{model_name}'):
                self.assertTrue(required <= covered,
                                f'missing {required - covered}')


class MigrationTests(TestCase):
    def test_there_is_no_unapplied_model_change(self):
        """A model edited without a migration breaks the next deployment."""
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        try:
            call_command('makemigrations', '--check', '--dry-run',
                         stdout=out, stderr=out, verbosity=1)
        except SystemExit:
            self.fail(f'Models have changed without a migration:\n{out.getvalue()}')
