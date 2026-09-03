"""The list page shows one page; the totals must still describe the whole set.

These pin the property the page depends on: paging changes which rows come
back, and changes nothing about the totals.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    attach_service_rate, make_customer, make_employee, make_project,
    make_service, make_user, make_work_entry,
)


class SummaryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(role='admin')
        cls.customer = make_customer()
        cls.project = make_project(customer=cls.customer)
        cls.service = make_service()
        attach_service_rate(cls.customer, cls.service, Decimal('30.00'))
        cls.employee = make_employee(hourly_rate=Decimal('20.00'))

        # Twenty-five entries, so the default page size cannot cover them.
        cls.start = date(2026, 3, 2)
        for offset in range(25):
            make_work_entry(
                employee=cls.employee,
                project=cls.project,
                service=cls.service,
                work_date=cls.start + timedelta(days=offset),
                start='08:00',
                end='16:00',
                status='approved',
            )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def summary(self, **params):
        params.setdefault('include_past', 'true')
        response = self.client.get('/api/worklogs/entries/summary/', params)
        self.assertEqual(response.status_code, 200, response.content[:300])
        return response.json()

    def every_row(self, **params):
        """Every row the filters match, however many pages that would be."""
        params.setdefault('include_past', 'true')
        params['page_size'] = 500
        return self.client.get('/api/worklogs/entries/', params).json()['results']

    def test_totals_cover_every_entry_not_just_the_first_page(self):
        page = self.client.get(
            '/api/worklogs/entries/', {'include_past': 'true', 'page_size': 5})
        self.assertEqual(len(page.json()['results']), 5)

        totals = self.summary()
        rows = self.every_row()
        self.assertEqual(totals['count'], 25)
        self.assertEqual(len(rows), 25)
        # The figure the page used to add up in the browser, now from one call.
        self.assertEqual(
            Decimal(totals['hours']),
            sum(Decimal(str(r['calculated_hours'])) for r in rows))

    def test_the_page_size_never_changes_the_totals(self):
        first = self.summary()
        for page_size in (1, 5, 100):
            self.client.get('/api/worklogs/entries/',
                            {'include_past': 'true', 'page_size': page_size})
            self.assertEqual(self.summary(), first)

    def test_totals_follow_the_filters(self):
        window = {
            'start_date': str(self.start),
            'end_date': str(self.start + timedelta(days=4)),
        }
        totals = self.summary(**window)
        rows = self.every_row(**window)
        self.assertEqual(totals['count'], 5)
        self.assertEqual(
            Decimal(totals['hours']),
            sum(Decimal(str(r['calculated_hours'])) for r in rows))

    def test_status_counts_group_by_status(self):
        entry = make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=self.start + timedelta(days=40), start='08:00', end='16:00',
            status='pending',
        )
        self.addCleanup(entry.delete)

        counts = self.summary()['status_counts']
        self.assertEqual(counts.get('approved'), 25)
        self.assertEqual(counts.get('pending'), 1)

    def test_search_narrows_both_the_list_and_the_totals(self):
        other = make_customer(company_name='Zeldzame Klant BV')
        other_project = make_project(customer=other, name='Zeldzaam Project')
        entry = make_work_entry(
            employee=self.employee, project=other_project, service=self.service,
            work_date=self.start + timedelta(days=50), start='08:00', end='12:00',
            status='approved',
        )
        self.addCleanup(entry.delete)

        listed = self.client.get(
            '/api/worklogs/entries/',
            {'include_past': 'true', 'search': 'Zeldzaam'}).json()
        totals = self.summary(search='Zeldzaam')

        self.assertEqual(listed['count'], 1)
        self.assertEqual(totals['count'], 1)
        self.assertEqual(
            Decimal(totals['hours']),
            Decimal(str(listed['results'][0]['calculated_hours'])))

    def test_several_statuses_can_be_requested_at_once(self):
        entry = make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=self.start + timedelta(days=60), start='08:00', end='16:00',
            status='rejected',
        )
        self.addCleanup(entry.delete)

        both = self.client.get('/api/worklogs/entries/', {
            'include_past': 'true', 'status': ['approved', 'rejected'],
            'page_size': 100,
        }).json()
        self.assertEqual(both['count'], 26)

    def test_the_money_adds_up_the_way_the_rows_do(self):
        totals = self.summary()
        # 200 hours at the 30.00 service rate, with no surcharge on weekdays
        # here beyond what the entries themselves carry.
        self.assertEqual(
            Decimal(totals['total_amount']),
            Decimal(totals['base_amount'])
            + Decimal(totals['surcharge_amount'])
            + Decimal(totals['allowance_amount']),
        )
