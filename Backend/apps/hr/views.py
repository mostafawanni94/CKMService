"""HR API views: leave, payroll, and the derived attendance report."""

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Prefetch, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsBackOffice, IsFinanceStaff

from .models import LeaveRequest, LeaveType, PayrollPeriod, Payslip, PayslipLine
from .serializers import (
    AttendanceRecordSerializer,
    LeaveRequestSerializer,
    LeaveReviewSerializer,
    LeaveTypeSerializer,
    PayrollPeriodSerializer,
    PayslipListSerializer,
    PayslipSerializer,
)


def _employee_profile(user):
    """Return the EmployeeProfile for a user, or None."""
    from apps.employees.models import EmployeeProfile
    return EmployeeProfile.objects.filter(user=user).first()


# =============================================================================
# LEAVE
# =============================================================================

class LeaveTypeViewSet(viewsets.ModelViewSet):
    """Leave categories. Anyone authenticated may read; only admins may write."""

    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    filterset_fields = ['is_active', 'is_paid']
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """
    Leave requests.

    Employees see and create only their own; back-office roles see everything
    and are the only ones who may approve or reject.
    """

    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'employee', 'leave_type']
    search_fields = ['employee__first_name', 'employee__last_name', 'reason']
    ordering_fields = ['start_date', 'created_at', 'status']

    def get_queryset(self):
        qs = (
            LeaveRequest.objects.select_related(
                'employee', 'leave_type', 'reviewed_by'
            )
            .filter(is_deleted=False)
        )
        user = self.request.user
        if user.is_back_office:
            return qs
        profile = _employee_profile(user)
        return qs.filter(employee=profile) if profile else qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        employee = serializer.validated_data.get('employee')

        if not user.is_back_office:
            # An employee may only file leave for themselves, whatever they post.
            profile = _employee_profile(user)
            if profile is None:
                raise ValidationError('No employee profile is linked to this account.')
            employee = profile
        elif employee is None:
            raise ValidationError({'employee': 'This field is required.'})

        serializer.save(employee=employee, created_by=user)

    def _review(self, request, approve):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {'detail': f'This request is already {leave.get_status_display().lower()}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = LeaveReviewSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        notes = payload.validated_data['notes']

        leave.approve(request.user, notes) if approve else leave.reject(request.user, notes)
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=['post'], permission_classes=[IsBackOffice])
    def approve(self, request, pk=None):
        return self._review(request, approve=True)

    @action(detail=True, methods=['post'], permission_classes=[IsBackOffice])
    def reject(self, request, pk=None):
        return self._review(request, approve=False)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Withdraw a request. The owner may cancel while it is still pending."""
        leave = self.get_object()
        if leave.status not in (LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED):
            return Response(
                {'detail': 'Only pending or approved requests can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.is_back_office and leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {'detail': 'Approved leave can only be cancelled by the back office.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        leave.status = LeaveRequest.Status.CANCELLED
        leave.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(leave).data)

    @action(detail=False, methods=['get'])
    def my(self, request):
        profile = _employee_profile(request.user)
        if profile is None:
            return Response({'count': 0, 'results': []})
        qs = self.filter_queryset(self.get_queryset().filter(employee=profile))
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'], permission_classes=[IsBackOffice])
    def pending(self, request):
        qs = self.filter_queryset(
            self.get_queryset().filter(status=LeaveRequest.Status.PENDING)
        )
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


# =============================================================================
# PAYROLL
# =============================================================================

class PayrollPeriodViewSet(viewsets.ModelViewSet):
    """Pay runs. Finance and admin only."""

    queryset = PayrollPeriod.objects.filter(is_deleted=False).prefetch_related('payslips')
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['status']
    ordering_fields = ['start_date', 'created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """
        Build payslips for this period from approved work entries.

        Idempotent: an employee who already has a payslip in this period is
        skipped rather than duplicated, and a work entry already carried by a
        payslip line is never counted twice.
        """
        from apps.worklogs.models import WorkEntry

        period = self.get_object()
        if period.status == PayrollPeriod.Status.PAID:
            return Response(
                {'detail': 'This period has been paid and can no longer be regenerated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entries = (
            WorkEntry.objects.filter(
                status=WorkEntry.Status.APPROVED,
                work_date__gte=period.start_date,
                work_date__lte=period.end_date,
            )
            .exclude(payslip_lines__isnull=False)
            .select_related('employee', 'project', 'service')
            .order_by('employee_id', 'work_date')
        )

        by_employee = {}
        for entry in entries:
            if entry.employee_id is None:
                continue
            by_employee.setdefault(entry.employee_id, []).append(entry)

        created, skipped = [], []
        with transaction.atomic():
            for employee_id, employee_entries in by_employee.items():
                if Payslip.objects.filter(
                    period=period, employee_id=employee_id, is_deleted=False
                ).exists():
                    skipped.append(str(employee_id))
                    continue

                payslip = Payslip.objects.create(
                    period=period,
                    employee_id=employee_id,
                    created_by=request.user,
                )
                lines = []
                for entry in employee_entries:
                    breakdown = entry.get_employee_hours_breakdown()
                    lines.append(PayslipLine(
                        payslip=payslip,
                        work_entry=entry,
                        work_date=entry.work_date,
                        description=str(entry.project or entry.service or ''),
                        hours=Decimal(str(breakdown.get('total_hours', 0))),
                        hourly_rate=Decimal(str(breakdown.get('employee_rate', 0))),
                        base_amount=Decimal(str(breakdown.get('base_payment', 0))),
                        surcharge_amount=Decimal(str(breakdown.get('total_surcharge_amount', 0))),
                        allowance_amount=Decimal('0.00'),
                    ))
                PayslipLine.objects.bulk_create(lines)
                payslip.recalculate()
                created.append(payslip)

            if period.status == PayrollPeriod.Status.DRAFT and created:
                period.status = PayrollPeriod.Status.PENDING
                period.save(update_fields=['status', 'updated_at'])

        return Response({
            'period': PayrollPeriodSerializer(period).data,
            'payslips_created': len(created),
            'employees_skipped': len(skipped),
            'payslips': PayslipListSerializer(created, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        period = self.get_object()
        if period.status == PayrollPeriod.Status.PAID:
            return Response(
                {'detail': 'This period is already marked paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            period.status = PayrollPeriod.Status.PAID
            period.paid_at = timezone.now()
            period.save(update_fields=['status', 'paid_at', 'updated_at'])
            period.payslips.update(status=Payslip.Status.PAID)
        return Response(self.get_serializer(period).data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        period = self.get_object()
        agg = period.payslips.aggregate(
            gross=Sum('gross_pay'),
            net=Sum('net_pay'),
            deductions=Sum('deductions'),
            hours=Sum('total_hours'),
        )
        return Response({
            'period': PayrollPeriodSerializer(period).data,
            'employee_count': period.payslips.count(),
            'total_hours': agg['hours'] or Decimal('0.00'),
            'total_gross': agg['gross'] or Decimal('0.00'),
            'total_deductions': agg['deductions'] or Decimal('0.00'),
            'total_net': agg['net'] or Decimal('0.00'),
        })


class PayslipViewSet(viewsets.ModelViewSet):
    """
    Payslips.

    Finance and admin see all. An employee may read their own via ``my``;
    only finance may edit deductions or notes.
    """

    permission_classes = [IsAuthenticated]
    filterset_fields = ['period', 'employee', 'status']
    ordering_fields = ['created_at', 'gross_pay']

    def get_serializer_class(self):
        return PayslipListSerializer if self.action == 'list' else PayslipSerializer

    def get_queryset(self):
        qs = (
            Payslip.objects.filter(is_deleted=False)
            .select_related('employee', 'period')
            .prefetch_related(Prefetch('lines', queryset=PayslipLine.objects.order_by('work_date')))
        )
        user = self.request.user
        if user.is_admin or user.is_finance:
            return qs
        profile = _employee_profile(user)
        return qs.filter(employee=profile) if profile else qs.none()

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'my'):
            return [IsAuthenticated()]
        return [IsFinanceStaff()]

    def perform_update(self, serializer):
        payslip = serializer.save(updated_by=self.request.user)
        # Deductions are the only editable money field; net must follow it.
        payslip.recalculate()

    @action(detail=False, methods=['get'])
    def my(self, request):
        profile = _employee_profile(request.user)
        if profile is None:
            return Response([])
        qs = self.filter_queryset(self.get_queryset().filter(employee=profile))
        return Response(PayslipListSerializer(qs, many=True).data)


# =============================================================================
# ATTENDANCE (derived, read-only)
# =============================================================================

class AttendanceViewSet(viewsets.ViewSet):
    """
    Attendance derived from work entries and approved leave.

    Nothing is stored: a day is ``leave`` if it falls inside approved leave,
    ``present`` if an approved or submitted work entry exists, ``late`` if the
    actual start ran past the planned start by more than the grace period, and
    ``absent`` if a shift was planned but never worked.

    GET /api/hr/attendance/?date_from=&date_to=&employee=&status=
    """

    permission_classes = [IsBackOffice]
    LATE_GRACE_MINUTES = 5

    def list(self, request):
        from apps.worklogs.models import WorkEntry

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if not date_from or not date_to:
            today = timezone.localdate()
            date_from = date_from or (today - timedelta(days=30)).isoformat()
            date_to = date_to or today.isoformat()

        entries = WorkEntry.objects.filter(
            work_date__gte=date_from,
            work_date__lte=date_to,
        ).select_related('employee')

        employee_id = request.query_params.get('employee')
        if employee_id:
            entries = entries.filter(employee_id=employee_id)

        leaves = LeaveRequest.objects.filter(
            status=LeaveRequest.Status.APPROVED,
            start_date__lte=date_to,
            end_date__gte=date_from,
            is_deleted=False,
        ).select_related('employee', 'leave_type')
        if employee_id:
            leaves = leaves.filter(employee_id=employee_id)

        leave_days = {}
        for leave in leaves:
            day = leave.start_date
            while day <= leave.end_date:
                leave_days[(leave.employee_id, day)] = leave.leave_type.name
                day += timedelta(days=1)

        records = []
        for entry in entries:
            if entry.employee is None:
                continue
            key = (entry.employee_id, entry.work_date)
            planned_start = entry.planned_start_time
            actual_start = (
                timezone.localtime(entry.actual_start_datetime).time()
                if entry.actual_start_datetime else None
            )

            minutes_late = 0
            if planned_start and actual_start:
                delta = (
                    (actual_start.hour * 60 + actual_start.minute)
                    - (planned_start.hour * 60 + planned_start.minute)
                )
                minutes_late = max(delta, 0)

            if key in leave_days:
                state = 'leave'
            elif entry.status in (
                WorkEntry.Status.CANCELLED, WorkEntry.Status.NO_SHOW,
            ):
                state = 'absent'
            elif minutes_late > self.LATE_GRACE_MINUTES:
                state = 'late'
            elif entry.status in (
                WorkEntry.Status.APPROVED, WorkEntry.Status.SUBMITTED,
                WorkEntry.Status.PENDING, WorkEntry.Status.IN_PROGRESS,
            ):
                state = 'present'
            else:
                state = 'absent'

            records.append({
                'employee': entry.employee_id,
                'employee_name': entry.employee.full_name,
                'date': entry.work_date,
                'status': state,
                'planned_start': planned_start,
                'actual_start': actual_start,
                'minutes_late': minutes_late,
                'hours': Decimal(str(entry.calculated_hours or 0)),
                'work_entry': entry.id,
                'leave_type': leave_days.get(key),
            })
            leave_days.pop(key, None)

        # Approved leave on days with no work entry at all.
        for (emp_id, day), leave_type_name in leave_days.items():
            leave = next(l for l in leaves if l.employee_id == emp_id)
            records.append({
                'employee': emp_id,
                'employee_name': leave.employee.full_name,
                'date': day,
                'status': 'leave',
                'planned_start': None,
                'actual_start': None,
                'minutes_late': 0,
                'hours': Decimal('0.00'),
                'work_entry': None,
                'leave_type': leave_type_name,
            })

        state_filter = request.query_params.get('status')
        if state_filter and state_filter != 'all':
            records = [r for r in records if r['status'] == state_filter]

        records.sort(key=lambda r: (r['date'], r['employee_name']), reverse=True)
        return Response({
            'count': len(records),
            'results': AttendanceRecordSerializer(records, many=True).data,
        })
