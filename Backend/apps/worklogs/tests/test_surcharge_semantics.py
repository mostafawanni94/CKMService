"""
Surcharge percentages are a percentage OF the hourly rate, not an uplift.

150 means those hours are billed at 1.5x the rate: EUR 10/h becomes EUR 15/h.
100 means no uplift at all.
"""

from datetime import date, time
from decimal import Decimal

from django.test import TestCase

from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_work_entry,
)


class SurchargeIsPercentageOfRateTests(TestCase):
    """The business states surcharges as 'night shift is 150%'."""

    def setUp(self):
        self.customer = make_customer()
        self.service = make_service()
        self.project = make_project(customer=self.customer)
        # EUR 10/h so the arithmetic is obvious.
        attach_service_rate(self.customer, self.service, Decimal('10.00'))

    def _entry(self, employee, start, end):
        return make_work_entry(
            employee=employee, project=self.project, service=self.service,
            work_date=date(2026, 3, 4), start=start, end=end, break_minutes=0,
        )

    def test_150_percent_turns_a_10_euro_rate_into_15(self):
        """One hour, entirely inside the window, at 150%: EUR 15, not EUR 25."""
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(self.customer, window, Decimal('150.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        entry = self._entry(employee, '09:00', '10:00')

        self.assertEqual(Decimal(str(entry.calculated_hours)), Decimal('1.00'))
        # 1h x (EUR 10 x 1.5). The old "uplift" reading gave EUR 25.
        self.assertEqual(entry.calculated_price, Decimal('15.00'))

    def test_100_percent_means_no_uplift(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(self.customer, window, Decimal('100.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        entry = self._entry(employee, '09:00', '13:00')

        # 4h x EUR 10, nothing added.
        self.assertEqual(entry.calculated_price, Decimal('40.00'))

    def test_the_uplift_applies_only_to_hours_inside_the_window(self):
        """
        The percentage lifts the *rate* for the covered hours; hours outside the
        window stay at the plain rate.
        """
        night = make_surcharge_type(time_from=time(0, 0), time_to=time(6, 0))
        attach_customer_surcharge(self.customer, night, Decimal('150.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        # 02:00-10:00 => 4h inside the night window, 4h outside.
        entry = self._entry(employee, '02:00', '10:00')

        breakdown = entry.get_hours_breakdown_detailed()
        surcharged = sum(s['hours'] for s in breakdown['surcharges'])
        self.assertAlmostEqual(surcharged, 4.0, places=1)

        # 4h x EUR 15 + 4h x EUR 10 = EUR 100
        self.assertEqual(entry.calculated_price, Decimal('100.00'))

    def test_the_breakdown_reports_the_effective_hourly_rate(self):
        """The UI should be able to show 'EUR 15/h', which is how it is stated."""
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(self.customer, window, Decimal('150.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        entry = self._entry(employee, '09:00', '10:00')

        surcharge = entry.get_hours_breakdown_detailed()['surcharges'][0]
        self.assertEqual(surcharge['percentage'], Decimal('150.00'))
        self.assertAlmostEqual(surcharge['effective_rate'], 15.0, places=2)
        # `amount` is the portion above the plain rate, which is what an
        # invoice line shows on top of the base.
        self.assertAlmostEqual(surcharge['amount'], 5.0, places=2)

    def test_employee_pay_follows_the_same_rule(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(self.customer, window, Decimal('150.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        entry = self._entry(employee, '09:00', '10:00')

        # 1h at EUR 10 x 1.5
        self.assertEqual(entry.calculated_employee_payment, Decimal('15.00'))

    def test_an_employee_without_entitlement_stays_on_the_plain_rate(self):
        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(self.customer, window, Decimal('150.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=False)
        entry = self._entry(employee, '09:00', '10:00')

        self.assertEqual(entry.calculated_employee_payment, Decimal('10.00'))


class MigrationIsBehaviourPreservingTests(TestCase):
    """
    Converting stored values X -> 100+X must not change a single euro.

    Hofkens' night shift was 30 under the old "uplift" reading and is 130 under
    the new one; both bill EUR 10/h at EUR 13/h.
    """

    def test_130_matches_the_old_plus_30_percent(self):
        customer = make_customer()
        service = make_service()
        project = make_project(customer=customer)
        attach_service_rate(customer, service, Decimal('10.00'))

        window = make_surcharge_type(time_from=time(0, 0), time_to=time(23, 59))
        attach_customer_surcharge(customer, window, Decimal('130.00'))

        employee = make_employee(hourly_rate=Decimal('10.00'), receives_surcharges=True)
        entry = make_work_entry(
            employee=employee, project=project, service=service,
            work_date=date(2026, 3, 4), start='09:00', end='10:00', break_minutes=0,
        )

        # Old behaviour: 10 + 10*0.30 = 13.00
        self.assertEqual(entry.calculated_price, Decimal('13.00'))
