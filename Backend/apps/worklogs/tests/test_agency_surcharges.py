"""
Agency surcharges must behave exactly like customer surcharges.

Before this, AgencySurcharge was never read by anything: the invoice code
guarded on `hasattr(entry, 'surcharges_breakdown')`, a serializer field that
does not exist on the model, so the guard never passed and every agency line
was billed with zero surcharge no matter what was configured.
"""

from datetime import date, time
from decimal import Decimal

from django.test import TestCase

from apps.core.testing import (
    attach_agency_surcharge, attach_customer_surcharge, attach_service_rate,
    make_agency, make_customer, make_employee, make_project, make_service,
    make_surcharge_type, make_work_entry,
)


class AgencySurchargeTests(TestCase):
    def setUp(self):
        self.customer = make_customer()
        self.service = make_service()
        self.project = make_project(customer=self.customer)
        attach_service_rate(self.customer, self.service, Decimal('20.00'))
        self.agency = make_agency(base_hourly_rate=Decimal('10.00'))
        self.employee = make_employee(hourly_rate=Decimal('10.00'))

    def _entry(self, start, end, work_date=date(2026, 3, 4)):
        return make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=work_date, start=start, end=end, break_minutes=0,
        )

    def test_a_configured_surcharge_is_actually_applied(self):
        """The whole point: 150% on a EUR 10 agency rate bills EUR 15/h."""
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_agency_surcharge(self.agency, window, Decimal('150.00'))

        breakdown = self._entry('09:00', '10:00').get_agency_hours_breakdown(self.agency)

        self.assertEqual(breakdown['total_hours'], 1.0)
        self.assertEqual(breakdown['base_amount'], 10.0)
        self.assertEqual(breakdown['total_surcharge_amount'], 5.0)
        self.assertEqual(breakdown['total_amount'], 15.0)

    def test_partial_hours_inside_the_window_split_correctly(self):
        """
        This is the behaviour that already worked for customer billing: only the
        hours inside the window get the uplifted rate.
        """
        night = make_surcharge_type(time_from=time(0, 0), time_to=time(6, 0))
        attach_agency_surcharge(self.agency, night, Decimal('150.00'))

        # 02:00-10:00 => 4h inside the night window, 4h outside.
        breakdown = self._entry('02:00', '10:00').get_agency_hours_breakdown(self.agency)

        self.assertEqual(breakdown['total_hours'], 8.0)
        surcharged = sum(s['hours'] for s in breakdown['surcharges'])
        self.assertAlmostEqual(surcharged, 4.0, places=1)
        # 4h x EUR 15 + 4h x EUR 10 = EUR 100
        self.assertEqual(breakdown['total_amount'], 100.0)

    def test_the_agency_is_independent_of_the_customer(self):
        """
        An agency can be paid a surcharge the customer is not billed, and at a
        different percentage. The two must not leak into each other.
        """
        night = make_surcharge_type(time_from=time(0, 0), time_to=time(6, 0))
        attach_agency_surcharge(self.agency, night, Decimal('150.00'))
        # Customer pays nothing for night work.

        entry = self._entry('02:00', '06:00')

        agency = entry.get_agency_hours_breakdown(self.agency)
        self.assertEqual(agency['total_amount'], 60.0)      # 4h x EUR 15

        # Customer side: 4h x EUR 20 flat, no surcharge configured.
        self.assertEqual(entry.calculated_price, Decimal('80.00'))

    def test_different_percentages_on_each_side(self):
        night = make_surcharge_type(time_from=time(0, 0), time_to=time(6, 0))
        attach_agency_surcharge(self.agency, night, Decimal('150.00'))
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))

        entry = self._entry('02:00', '06:00')

        # agency: 4h x (10 x 1.5) = 60
        self.assertEqual(entry.get_agency_hours_breakdown(self.agency)['total_amount'], 60.0)
        # customer: 4h x (20 x 1.3) = 104
        self.assertEqual(entry.calculated_price, Decimal('104.00'))

    def test_100_percent_adds_nothing(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_agency_surcharge(self.agency, window, Decimal('100.00'))

        breakdown = self._entry('09:00', '13:00').get_agency_hours_breakdown(self.agency)
        self.assertEqual(breakdown['total_surcharge_amount'], 0.0)
        self.assertEqual(breakdown['total_amount'], 40.0)

    def test_surcharges_disabled_on_the_agency_means_flat_rate(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_agency_surcharge(self.agency, window, Decimal('150.00'))
        self.agency.has_surcharges = False
        self.agency.save(update_fields=['has_surcharges'])

        breakdown = self._entry('09:00', '10:00').get_agency_hours_breakdown(self.agency)
        self.assertEqual(breakdown['total_surcharge_amount'], 0.0)
        self.assertEqual(breakdown['total_amount'], 10.0)

    def test_a_disabled_row_is_ignored(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        row = attach_agency_surcharge(self.agency, window, Decimal('150.00'))
        row.is_enabled = False
        row.save(update_fields=['is_enabled'])

        breakdown = self._entry('09:00', '10:00').get_agency_hours_breakdown(self.agency)
        self.assertEqual(breakdown['total_amount'], 10.0)

    def test_only_the_highest_surcharge_applies_to_an_overlapping_minute(self):
        """Surcharges must not stack; the agency's own rates decide the winner."""
        low = make_surcharge_type(name='evening', time_from=time(0, 0), time_to=time(23, 59))
        high = make_surcharge_type(name='night', time_from=time(0, 0), time_to=time(6, 0))
        attach_agency_surcharge(self.agency, low, Decimal('120.00'))
        attach_agency_surcharge(self.agency, high, Decimal('200.00'))

        # 02:00-03:00 falls in both windows; only the 200% one should count.
        breakdown = self._entry('02:00', '03:00').get_agency_hours_breakdown(self.agency)
        self.assertEqual(breakdown['total_amount'], 20.0)   # 1h x (10 x 2.0)
