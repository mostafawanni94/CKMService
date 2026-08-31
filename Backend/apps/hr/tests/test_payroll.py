"""Tests for payroll generation and leave administration."""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    make_employee, make_leave_type, make_project, make_user, make_work_entry,
)
from apps.hr.models import LeaveRequest, PayrollPeriod, Payslip, PayslipLine


class PayrollGenerationTests(TestCase):
    def setUp(self):
        self.admin = make_user(email='admin@ckm.test', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        self.period = PayrollPeriod.objects.create(
            name='Week 35 2026',
            start_date=date(2026, 8, 24),
            end_date=date(2026, 8, 30),
        )
        self.employee = make_employee(hourly_rate=Decimal('20.00'), receives_surcharges=False)
        self.project = make_project()

    def _generate(self):
        return self.client.post(f'/api/hr/payroll-periods/{self.period.id}/generate/')

    def test_generate_creates_one_payslip_per_employee(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00', break_minutes=0,
        )
        response = self._generate()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['payslips_created'], 1)
        self.assertEqual(Payslip.objects.filter(period=self.period).count(), 1)

    def test_payslip_totals_match_the_work_entries(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00', break_minutes=0,
        )
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 26), start='09:00', end='13:00', break_minutes=0,
        )
        self._generate()

        payslip = Payslip.objects.get(period=self.period, employee=self.employee)
        # 8h + 4h at €20.00
        self.assertEqual(payslip.total_hours, Decimal('12.00'))
        self.assertEqual(payslip.gross_pay, Decimal('240.00'))
        self.assertEqual(payslip.net_pay, Decimal('240.00'))
        self.assertEqual(payslip.lines.count(), 2)

    def test_generate_is_idempotent(self):
        """Running generate twice must not double-pay anyone."""
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00', break_minutes=0,
        )
        self._generate()
        second = self._generate()

        self.assertEqual(second.data['payslips_created'], 0)
        self.assertEqual(Payslip.objects.filter(period=self.period).count(), 1)
        self.assertEqual(PayslipLine.objects.count(), 1)

    def test_only_approved_entries_are_paid(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00',
            status='submitted',
        )
        response = self._generate()
        self.assertEqual(response.data['payslips_created'], 0)

    def test_entries_outside_the_period_are_ignored(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 9, 15), start='09:00', end='17:00',
        )
        response = self._generate()
        self.assertEqual(response.data['payslips_created'], 0)

    def test_deductions_reduce_net_pay(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00', break_minutes=0,
        )
        self._generate()

        payslip = Payslip.objects.get(period=self.period)
        payslip.deductions = Decimal('40.00')
        payslip.recalculate()

        self.assertEqual(payslip.gross_pay, Decimal('160.00'))
        self.assertEqual(payslip.net_pay, Decimal('120.00'))

    def test_mark_paid_settles_the_period_and_its_payslips(self):
        make_work_entry(
            employee=self.employee, project=self.project,
            work_date=date(2026, 8, 25), start='09:00', end='17:00',
        )
        self._generate()
        response = self.client.post(f'/api/hr/payroll-periods/{self.period.id}/mark_paid/')

        self.assertEqual(response.status_code, 200)
        self.period.refresh_from_db()
        self.assertEqual(self.period.status, PayrollPeriod.Status.PAID)
        self.assertTrue(
            all(p.status == Payslip.Status.PAID for p in self.period.payslips.all())
        )

    def test_a_paid_period_cannot_be_regenerated(self):
        self.period.status = PayrollPeriod.Status.PAID
        self.period.save()
        self.assertEqual(self._generate().status_code, 400)


class LeaveRequestTests(TestCase):
    def setUp(self):
        self.admin = make_user(email='hr@ckm.test', role='admin')
        self.employee = make_employee()
        self.leave_type = make_leave_type()
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _create(self, start, end):
        return LeaveRequest.objects.create(
            employee=self.employee, leave_type=self.leave_type,
            start_date=start, end_date=end,
        )

    def test_total_days_is_inclusive(self):
        leave = self._create(date(2026, 9, 1), date(2026, 9, 5))
        self.assertEqual(leave.total_days, 5)

    def test_single_day_leave_counts_as_one(self):
        leave = self._create(date(2026, 9, 1), date(2026, 9, 1))
        self.assertEqual(leave.total_days, 1)

    def test_approve_records_the_reviewer(self):
        leave = self._create(date(2026, 9, 1), date(2026, 9, 3))
        response = self.client.post(
            f'/api/hr/leave-requests/{leave.id}/approve/', {'notes': 'Fine'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        leave.refresh_from_db()
        self.assertEqual(leave.status, LeaveRequest.Status.APPROVED)
        self.assertEqual(leave.reviewed_by, self.admin)
        self.assertIsNotNone(leave.reviewed_at)

    def test_a_decided_request_cannot_be_decided_again(self):
        leave = self._create(date(2026, 9, 1), date(2026, 9, 3))
        self.client.post(f'/api/hr/leave-requests/{leave.id}/approve/', {}, format='json')
        second = self.client.post(
            f'/api/hr/leave-requests/{leave.id}/reject/', {}, format='json',
        )
        self.assertEqual(second.status_code, 400)

    def test_overlapping_leave_is_rejected(self):
        self._create(date(2026, 9, 1), date(2026, 9, 5))
        response = self.client.post('/api/hr/leave-requests/', {
            'employee': str(self.employee.id),
            'leave_type': self.leave_type.id,
            'start_date': '2026-09-04',
            'end_date': '2026-09-08',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_end_before_start_is_rejected(self):
        response = self.client.post('/api/hr/leave-requests/', {
            'employee': str(self.employee.id),
            'leave_type': self.leave_type.id,
            'start_date': '2026-09-10',
            'end_date': '2026-09-01',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_employee_only_sees_their_own_requests(self):
        other = make_employee()
        self._create(date(2026, 9, 1), date(2026, 9, 3))
        LeaveRequest.objects.create(
            employee=other, leave_type=self.leave_type,
            start_date=date(2026, 9, 1), end_date=date(2026, 9, 3),
        )

        client = APIClient()
        client.force_authenticate(self.employee.user)
        response = client.get('/api/hr/leave-requests/')

        self.assertEqual(response.status_code, 200)
        results = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(str(results[0]['employee']), str(self.employee.id))

    def test_employee_cannot_approve_leave(self):
        leave = self._create(date(2026, 9, 1), date(2026, 9, 3))
        client = APIClient()
        client.force_authenticate(self.employee.user)
        response = client.post(f'/api/hr/leave-requests/{leave.id}/approve/', {}, format='json')
        self.assertIn(response.status_code, (403, 404))

    def test_employee_filing_leave_cannot_impersonate_someone_else(self):
        other = make_employee()
        client = APIClient()
        client.force_authenticate(self.employee.user)
        response = client.post('/api/hr/leave-requests/', {
            'employee': str(other.id),
            'leave_type': self.leave_type.id,
            'start_date': '2026-10-01',
            'end_date': '2026-10-02',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        created = LeaveRequest.objects.get(id=response.data['id'])
        self.assertEqual(created.employee, self.employee)
