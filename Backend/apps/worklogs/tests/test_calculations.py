"""
Tests for WorkEntry hour and money calculations.

This is the financial core of the platform — roughly 1,400 lines deciding what
a customer is billed and what an employee is paid — and it had no test at all.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase

from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_work_entry,
)
from apps.worklogs.models import WorkEntry


class CalculatedHoursTests(TestCase):
    """`calculated_hours` = worked span minus breaks."""

    def test_simple_day_shift_subtracts_break(self):
        entry = make_work_entry(start='09:00', end='17:00', break_minutes=30)
        # 8 hours worked, 30 minutes unpaid break.
        self.assertEqual(Decimal(str(entry.calculated_hours)), Decimal('7.50'))

    def test_no_break_counts_the_whole_span(self):
        entry = make_work_entry(start='09:00', end='17:00', break_minutes=0)
        self.assertEqual(Decimal(str(entry.calculated_hours)), Decimal('8.00'))

    def test_overnight_shift_spans_midnight(self):
        # 22:00 → 06:00 is 8 hours, not a negative span.
        entry = make_work_entry(start='22:00', end='06:00', break_minutes=0)
        self.assertEqual(Decimal(str(entry.calculated_hours)), Decimal('8.00'))

    def test_break_longer_than_shift_does_not_go_negative(self):
        entry = make_work_entry(start='09:00', end='10:00', break_minutes=120)
        self.assertGreaterEqual(Decimal(str(entry.calculated_hours)), Decimal('0'))

    def test_missing_actual_times_yield_zero_hours(self):
        employee = make_employee()
        entry = WorkEntry.objects.create(
            employee=employee,
            project=make_project(),
            work_date=date.today(),
            status=WorkEntry.Status.PLANNED,
        )
        self.assertEqual(Decimal(str(entry.calculated_hours)), Decimal('0'))


class EmployeePaymentTests(TestCase):
    """`calculated_employee_payment` uses the employee's own rate."""

    def test_payment_is_hours_times_employee_rate(self):
        employee = make_employee(hourly_rate=Decimal('20.00'), receives_surcharges=False)
        entry = make_work_entry(employee=employee, start='09:00', end='17:00', break_minutes=0)
        # 8h x €20.00
        self.assertEqual(entry.calculated_employee_payment, Decimal('160.00'))

    def test_zero_rate_pays_nothing(self):
        employee = make_employee(hourly_rate=Decimal('0.00'))
        entry = make_work_entry(employee=employee, start='09:00', end='17:00')
        self.assertEqual(entry.calculated_employee_payment, Decimal('0'))

    def test_entry_with_no_worked_time_pays_nothing(self):
        """A planned-but-never-worked entry has no actual times and no pay."""
        employee = make_employee(hourly_rate=Decimal('25.00'))
        entry = WorkEntry.objects.create(
            employee=employee,
            project=make_project(),
            work_date=date.today(),
            status=WorkEntry.Status.PLANNED,
        )
        self.assertEqual(entry.calculated_employee_payment, Decimal('0'))

    def test_employee_without_surcharge_entitlement_gets_base_pay_only(self):
        """
        An employee flagged `receives_surcharges=False` is paid the flat rate
        even on a shift that falls entirely inside a surcharge window.
        """
        customer = make_customer()
        service = make_service()
        project = make_project(customer=customer)
        night = make_surcharge_type(name='Nacht', time_from=None, time_to=None)
        attach_customer_surcharge(customer, night, Decimal('50.00'))
        attach_service_rate(customer, service, Decimal('40.00'))

        employee = make_employee(hourly_rate=Decimal('20.00'), receives_surcharges=False)
        entry = make_work_entry(
            employee=employee, project=project, service=service,
            start='09:00', end='17:00', break_minutes=0,
        )
        self.assertEqual(entry.calculated_employee_payment, Decimal('160.00'))


class HoursBreakdownTests(TestCase):
    """`get_employee_hours_breakdown` is what payroll reads."""

    def test_breakdown_totals_match_the_payment(self):
        employee = make_employee(hourly_rate=Decimal('22.50'), receives_surcharges=False)
        entry = make_work_entry(employee=employee, start='08:00', end='16:00', break_minutes=30)

        breakdown = entry.get_employee_hours_breakdown()

        self.assertEqual(Decimal(str(breakdown['employee_rate'])), Decimal('22.50'))
        self.assertAlmostEqual(
            breakdown['base_payment'] + breakdown['total_surcharge_amount'],
            breakdown['total_payment'],
            places=2,
        )

    def test_breakdown_hours_match_calculated_hours(self):
        entry = make_work_entry(start='09:00', end='17:30', break_minutes=45)
        breakdown = entry.get_employee_hours_breakdown()
        self.assertAlmostEqual(
            float(breakdown['total_hours']), float(entry.calculated_hours), places=2,
        )

    def test_surcharges_are_empty_when_employee_is_not_entitled(self):
        employee = make_employee(receives_surcharges=False)
        entry = make_work_entry(employee=employee)
        breakdown = entry.get_employee_hours_breakdown()
        self.assertEqual(breakdown['surcharges'], [])
        self.assertEqual(breakdown['total_surcharge_amount'], 0.0)


class BillingWeekTests(TestCase):
    """The business week runs Monday 06:00 → Sunday 06:00."""

    def test_billing_week_is_populated_on_save(self):
        entry = make_work_entry(work_date=date(2026, 8, 26))  # a Wednesday
        self.assertIsNotNone(entry.billing_week_year)
        self.assertIsNotNone(entry.billing_week_number)

    def test_consecutive_weekdays_share_a_billing_week(self):
        monday = date(2026, 8, 24)
        first = make_work_entry(work_date=monday, start='09:00', end='17:00')
        second = make_work_entry(
            work_date=monday + timedelta(days=2), start='09:00', end='17:00',
        )
        self.assertEqual(
            (first.billing_week_year, first.billing_week_number),
            (second.billing_week_year, second.billing_week_number),
        )
