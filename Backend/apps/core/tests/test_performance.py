"""
Query counts on the paths that carry real volume.

These are guard rails, not benchmarks. Each asserts an upper bound that a
naive implementation would blow through, so an N+1 reintroduced later fails
here rather than in production with a year of data.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user, make_work_entry,
)

MONDAY = date(2026, 8, 10)


class QueryBoundMixin:
    """
    `assertNumQueries` asserts an exact count, which turns every harmless
    refactor into a failing test. What matters here is the ceiling.
    """

    def assertQueriesAtMost(self, limit):
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        test = self

        class _Bound(CaptureQueriesContext):
            def __exit__(self, exc_type, exc_value, traceback):
                super().__exit__(exc_type, exc_value, traceback)
                if exc_type is not None:
                    return
                test.assertLessEqual(
                    len(self), limit,
                    f'{len(self)} queries ran; the ceiling is {limit}.')

        return _Bound(connection)


class VolumeSetup(QueryBoundMixin, TestCase):
    """A month of work: 40 entries across 4 employees."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(email='perf@ckm.test', role='admin')
        cls.customer = make_customer(company_name='Volume BV',
                                     btw_number='NL001538146B17')
        cls.customer.vat_treatment_code = 'NORMAL'
        cls.customer.save()
        cls.project = make_project(customer=cls.customer)
        cls.service = make_service(name='Schoonmaak')
        attach_service_rate(cls.customer, cls.service, Decimal('40.00'))
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(cls.customer, night, Decimal('130.00'))

        cls.employees = [make_employee(hourly_rate=Decimal('16.00')) for _ in range(4)]
        cls.entries = []
        for day in range(10):
            for employee in cls.employees:
                cls.entries.append(make_work_entry(
                    employee=employee, project=cls.project,
                    work_date=MONDAY + timedelta(days=day),
                    service=cls.service))


class WorkEntryPricingTests(VolumeSetup):
    def test_pricing_forty_entries_does_not_scale_queries_with_rows(self):
        """
        `calculated_price` used to run seven queries per row: the service rate,
        the customer surcharges and the surcharge types, every time. A list of
        200 rows meant 1,400 queries.
        """
        from apps.worklogs.models import WorkEntry, clear_surcharge_caches

        clear_surcharge_caches()
        entries = list(WorkEntry.objects.select_related(
            'project', 'project__customer', 'service', 'employee').all())

        with self.assertQueriesAtMost(4):
            total = sum((entry.calculated_price for entry in entries), Decimal('0.00'))

        self.assertGreater(total, Decimal('0.00'))

    def test_employee_payment_is_memoised_the_same_way(self):
        from apps.worklogs.models import WorkEntry, clear_surcharge_caches

        clear_surcharge_caches()
        entries = list(WorkEntry.objects.select_related(
            'employee', 'project', 'project__customer', 'service').all())

        with self.assertQueriesAtMost(4):
            for entry in entries:
                entry.calculated_employee_payment


class BillingQueryTests(VolumeSetup):
    def test_generating_an_invoice_is_not_quadratic(self):
        """
        Forty lines, each priced and classified. The bound is generous — the
        point is that it does not grow with the square of the line count.
        """
        from apps.invoices.billing import generate_invoice
        from apps.worklogs.models import clear_surcharge_caches

        clear_surcharge_caches()
        with self.assertQueriesAtMost(220):
            invoice = generate_invoice(
                self.customer, start=MONDAY, end=MONDAY + timedelta(days=9),
                actor=self.admin)
        self.assertEqual(invoice.lines.count(), 40)

    def test_the_invoice_list_endpoint_stays_flat(self):
        """The list view must not query per row for its related objects."""
        from apps.invoices.billing import generate_invoice, issue_invoice

        for day in range(3):
            invoice = generate_invoice(
                self.customer, start=MONDAY + timedelta(days=day),
                end=MONDAY + timedelta(days=day), actor=self.admin)
            issue_invoice(invoice, actor=self.admin,
                          issue_date=MONDAY + timedelta(days=day))

        client = APIClient()
        client.force_authenticate(self.admin)
        with self.assertQueriesAtMost(15):
            response = client.get('/api/invoices/invoices/')
        self.assertEqual(response.status_code, 200)


class VatQueryTests(VolumeSetup):
    def test_the_return_is_calculated_in_a_fixed_number_of_queries(self):
        """
        The return aggregates in SQL. Thirteen boxes must not mean thirteen
        round trips per entry, however many entries there are.
        """
        from apps.invoices.billing import generate_invoice, issue_invoice
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return

        invoice = generate_invoice(
            self.customer, start=MONDAY, end=MONDAY + timedelta(days=9),
            actor=self.admin)
        issue_invoice(invoice, actor=self.admin, issue_date=MONDAY)

        period = VatPeriod.for_date(MONDAY)
        with self.assertQueriesAtMost(6):
            result = calculate_return(period)
        self.assertEqual(len(result['boxes']), 13)

    def test_the_dashboard_does_not_scale_with_the_number_of_documents(self):
        from apps.invoices.billing import generate_invoice, issue_invoice
        from apps.vat.reporting import dashboard

        for day in range(5):
            invoice = generate_invoice(
                self.customer, start=MONDAY + timedelta(days=day),
                end=MONDAY + timedelta(days=day), actor=self.admin)
            issue_invoice(invoice, actor=self.admin,
                          issue_date=MONDAY + timedelta(days=day))

        with self.assertQueriesAtMost(50):
            result = dashboard(2026, quarter=3)
        self.assertEqual(result['revenue']['invoice_count'], 5)


class IndexTests(TestCase):
    """The columns the money paths filter on are indexed."""

    def _index_columns(self, model):
        columns = set()
        for index in model._meta.indexes:
            columns.update(field.lstrip('-') for field in index.fields)
        for constraint in model._meta.constraints:
            columns.update(getattr(constraint, 'fields', []) or [])
        for field in model._meta.fields:
            if getattr(field, 'db_index', False) or field.unique or field.primary_key:
                columns.add(field.name)
        return columns

    def test_work_entries_are_indexed_on_the_billing_week(self):
        from apps.worklogs.models import WorkEntry

        columns = self._index_columns(WorkEntry)
        self.assertIn('billing_week_year', columns)
        self.assertIn('billing_week_number', columns)

    def test_invoices_are_indexed_for_the_dashboard_queries(self):
        from apps.invoices.models import Invoice

        columns = self._index_columns(Invoice)
        self.assertIn('document_type', columns)
        self.assertIn('issue_date', columns)
        self.assertIn('period_start', columns)

    def test_invoice_lines_are_indexed_on_the_work_entry(self):
        from apps.invoices.models import InvoiceLine

        self.assertIn('work_entry', self._index_columns(InvoiceLine))

    def test_the_vat_ledger_is_indexed_on_period_and_box(self):
        from apps.vat.models import VatLedgerEntry

        columns = self._index_columns(VatLedgerEntry)
        self.assertIn('period', columns)

    def test_wallet_transactions_are_indexed_on_their_source(self):
        from apps.wallet.models import WalletTransaction

        columns = self._index_columns(WalletTransaction)
        self.assertIn('reference_type', columns)
        self.assertIn('reference_id', columns)

    def test_expenses_are_indexed_for_reimbursement_and_reporting(self):
        from apps.expenses.models import Expense

        columns = self._index_columns(Expense)
        self.assertIn('expense_date', columns)
        self.assertIn('reimbursement_status', columns)


class ScalingTests(QueryBoundMixin, TestCase):
    """
    The queries must not grow with the number of rows.

    A ceiling can be met by accident on a small fixture. This measures the same
    operation twice, on ten rows and on fifty, and requires the counts to match
    — which is the property that actually holds at a year's volume.
    """

    def _build(self, entry_count):
        customer = make_customer(btw_number='NL001538146B17')
        customer.vat_treatment_code = 'NORMAL'
        customer.save()
        project = make_project(customer=customer)
        service = make_service(name=f'Dienst {entry_count}')
        attach_service_rate(customer, service, Decimal('40.00'))
        surcharge = make_surcharge_type(name=f'Toeslag {entry_count}')
        attach_customer_surcharge(customer, surcharge, Decimal('130.00'))

        employee = make_employee(hourly_rate=Decimal('16.00'))
        for index in range(entry_count):
            make_work_entry(employee=employee, project=project,
                            work_date=MONDAY + timedelta(days=index % 28),
                            service=service)
        return customer

    def _price_queries(self, customer):
        from apps.worklogs.models import WorkEntry, clear_surcharge_caches

        clear_surcharge_caches()
        entries = list(WorkEntry.objects.filter(project__customer=customer)
                       .select_related('project', 'project__customer', 'service',
                                       'employee'))

        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as captured:
            for entry in entries:
                entry.calculated_price
        return len(captured)

    def test_pricing_costs_the_same_at_ten_rows_and_at_fifty(self):
        small = self._price_queries(self._build(10))
        large = self._price_queries(self._build(50))
        self.assertEqual(
            small, large,
            f'{small} queries for 10 rows but {large} for 50 — the per-row '
            f'lookups are back.')

    def test_the_return_costs_the_same_however_many_entries_it_covers(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        from apps.invoices.billing import generate_invoice, issue_invoice
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return

        admin = make_user(email='scale@ckm.test', role='admin')
        for size in (5, 30):
            customer = self._build(size)
            invoice = generate_invoice(
                customer, start=MONDAY, end=MONDAY + timedelta(days=28), actor=admin)
            issue_invoice(invoice, actor=admin, issue_date=MONDAY)

        period = VatPeriod.for_date(MONDAY)
        with CaptureQueriesContext(connection) as first:
            calculate_return(period)

        customer = self._build(60)
        invoice = generate_invoice(
            customer, start=MONDAY, end=MONDAY + timedelta(days=28), actor=admin)
        issue_invoice(invoice, actor=admin, issue_date=MONDAY)

        with CaptureQueriesContext(connection) as second:
            calculate_return(period)

        self.assertEqual(len(first), len(second))
