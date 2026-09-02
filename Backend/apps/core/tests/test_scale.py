"""
Behaviour at the volume this company will actually reach.

The guard rails in test_performance.py assert query counts on tens of rows.
These build thousands and measure what a real request would do: the dashboard,
the return, a year of work history, the wallet. The thresholds are generous —
they exist to catch a regression that turns a page into a table scan, not to
police milliseconds.
"""

import time
from datetime import date, timedelta
from decimal import Decimal

from django.db import connection, reset_queries
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.core.models import SystemConfig
from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user,
)

YEAR_START = date(2026, 1, 5)          # a Monday


class ScaleFixture(TestCase):
    """
    A year of work: 20 employees across 10 customers, ~4,000 work entries.

    Built with bulk_create, so the fixture itself does not dominate the run.
    """

    CUSTOMERS = 10
    EMPLOYEES = 20
    WEEKS = 20

    @classmethod
    def setUpTestData(cls):
        from apps.worklogs.models import WorkEntry

        config = SystemConfig.objects.get_config()
        config.company_legal_name = 'CKMcleaning VOF'
        config.company_btw_number = 'NL869591071B01'
        config.save()

        cls.admin = make_user(email='scale@ckm.test', role='admin')
        cls.service = make_service(name='Schoonmaak')
        night = make_surcharge_type(name='Nachttoeslag')

        cls.customers, cls.projects = [], []
        for index in range(cls.CUSTOMERS):
            customer = make_customer(company_name=f'Klant {index:02d}',
                                     btw_number=f'NL{index:09d}B01')
            customer.vat_treatment_code = 'NORMAL'
            customer.save()
            attach_service_rate(customer, cls.service, Decimal('40.00'))
            attach_customer_surcharge(customer, night, Decimal('130.00'))
            cls.customers.append(customer)
            cls.projects.append(make_project(customer=customer,
                                             name=f'Project {index:02d}'))

        cls.employees = [make_employee(hourly_rate=Decimal('16.00'),
                                       receives_surcharges=True)
                         for _ in range(cls.EMPLOYEES)]

        from django.utils import timezone
        import zoneinfo

        amsterdam = zoneinfo.ZoneInfo('Europe/Amsterdam')
        entries = []
        for week in range(cls.WEEKS):
            for day in range(5):
                work_date = YEAR_START + timedelta(weeks=week, days=day)
                for index, employee in enumerate(cls.employees):
                    project = cls.projects[index % cls.CUSTOMERS]
                    start = timezone.datetime(
                        work_date.year, work_date.month, work_date.day, 9, 0,
                        tzinfo=amsterdam)
                    entries.append(WorkEntry(
                        employee=employee, project=project, service=cls.service,
                        work_date=work_date,
                        actual_start_datetime=start,
                        actual_end_datetime=start + timedelta(hours=8),
                        break_duration_minutes=30,
                        status=WorkEntry.Status.APPROVED,
                        billing_week_year=work_date.isocalendar()[0],
                        billing_week_number=work_date.isocalendar()[1],
                    ))
        WorkEntry.objects.bulk_create(entries, batch_size=500)
        cls.entry_count = len(entries)

    def measure(self, label, operation, query_ceiling, second_ceiling=5.0):
        """Run it, report what it cost, and fail if it scales badly."""
        from apps.worklogs.models import clear_surcharge_caches

        clear_surcharge_caches()
        started = time.perf_counter()
        with CaptureQueriesContext(connection) as captured:
            result = operation()
        elapsed = time.perf_counter() - started

        print(f'\n    [{label}] {len(captured)} queries, {elapsed:.2f}s '
              f'over {self.entry_count} work entries')
        self.assertLessEqual(len(captured), query_ceiling,
                             f'{label}: {len(captured)} queries')
        self.assertLess(elapsed, second_ceiling, f'{label}: {elapsed:.2f}s')
        return result


class VolumeTests(ScaleFixture):
    def test_the_fixture_is_actually_large(self):
        from apps.worklogs.models import WorkEntry

        self.assertGreaterEqual(WorkEntry.objects.count(), 2000)

    def test_the_worklog_list_endpoint(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = self.measure(
            'worklog list, one page',
            lambda: client.get('/api/worklogs/entries/?page_size=50'),
            query_ceiling=25)
        self.assertEqual(response.status_code, 200)

    def test_billing_a_week_for_one_customer(self):
        from apps.invoices.billing import generate_invoice

        invoice = self.measure(
            'generate one weekly invoice',
            lambda: generate_invoice(
                self.customers[0], week=YEAR_START.isocalendar()[:2],
                actor=self.admin),
            query_ceiling=120)
        self.assertGreater(invoice.lines.count(), 0)

    def test_the_finance_dashboard(self):
        from apps.vat.reporting import dashboard

        self.measure('finance dashboard',
                     lambda: dashboard(2026, quarter=1),
                     query_ceiling=60)

    def test_the_vat_return(self):
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return

        period = VatPeriod.for_date(YEAR_START)
        self.measure('vat return', lambda: calculate_return(period),
                     query_ceiling=8)

    def test_the_employee_earnings_screen(self):
        client = APIClient()
        client.force_authenticate(self.employees[0].user)
        response = self.measure(
            'employee pending earnings',
            lambda: client.get('/api/invoices/pending-earnings/'),
            query_ceiling=40)
        self.assertEqual(response.status_code, 200)

    def test_crediting_one_entry_is_cheap(self):
        """The path an approval takes: one shift, one request."""
        from apps.wallet.services import credit_work_entry
        from apps.worklogs.models import WorkEntry

        entry = WorkEntry.objects.filter(employee=self.employees[0]).select_related(
            'employee', 'project', 'project__customer', 'service').first()

        self.measure('credit one work entry',
                     lambda: credit_work_entry(entry),
                     query_ceiling=16)

    def test_crediting_in_bulk_does_not_cost_a_transaction_per_entry(self):
        """
        The path payroll and the backfill take. One transaction and one balance
        recalculation, instead of both per entry.
        """
        from apps.wallet.services import credit_work_entries
        from apps.worklogs.models import WorkEntry

        entries = list(WorkEntry.objects.filter(
            employee=self.employees[0]).select_related(
            'employee', 'project', 'project__customer', 'service')[:100])

        result = self.measure(
            'credit 100 work entries in bulk',
            lambda: credit_work_entries(entries),
            query_ceiling=30)
        self.assertEqual(result['credited'], 100)

    def test_pricing_a_thousand_entries(self):
        from apps.worklogs.models import WorkEntry

        entries = list(WorkEntry.objects.select_related(
            'employee', 'project', 'project__customer', 'service')[:1000])

        total = self.measure(
            'price 1000 entries',
            lambda: sum((entry.calculated_price for entry in entries),
                        Decimal('0.00')),
            query_ceiling=25)
        self.assertGreater(total, Decimal('0.00'))

    def test_the_customer_list_does_not_load_the_world(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = self.measure(
            'customer list',
            lambda: client.get('/api/customers/customers/'),
            query_ceiling=25)
        self.assertEqual(response.status_code, 200)

    def test_the_notification_list(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = self.measure(
            'notification list',
            lambda: client.get('/api/notifications/notifications/'),
            query_ceiling=15)
        self.assertEqual(response.status_code, 200)


class UnboundedResponseTests(ScaleFixture):
    """No endpoint hands back the whole table because a client asked."""

    def test_page_size_is_capped(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get('/api/worklogs/entries/?page_size=999999')
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.data['results']), 10000)

    def test_every_list_endpoint_paginates(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        for path in ('/api/worklogs/entries/', '/api/customers/customers/',
                     '/api/employees/profiles/', '/api/invoices/invoices/',
                     '/api/vat/ledger/', '/api/notifications/notifications/'):
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn('count', response.data,
                              f'{path} is not paginated')
