"""
HR models: leave administration and payroll.

Attendance is deliberately *not* stored here. It is fully derivable from
approved WorkEntry rows plus approved leave, so it is exposed as a computed
report (see ``views.AttendanceViewSet``) rather than a third copy of the truth
that can drift out of sync with the worklogs.

Employee contracts are likewise already modelled by
``employees.EmployeeContractHistory`` and are not duplicated here.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel


# =============================================================================
# LEAVE
# =============================================================================

class LeaveType(TimeStampedModel):
    """A category of leave, e.g. vacation, sick leave, unpaid leave."""

    name = models.CharField(max_length=100, verbose_name='Name')
    code = models.CharField(max_length=20, unique=True, verbose_name='Code')
    description = models.TextField(blank=True, default='', verbose_name='Description')
    is_paid = models.BooleanField(
        default=True,
        verbose_name='Is Paid',
        help_text='Paid leave still accrues wages on the payslip.',
    )
    requires_approval = models.BooleanField(default=True, verbose_name='Requires Approval')
    max_days_per_year = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='Max Days Per Year',
        help_text='Leave blank for no annual cap.',
    )
    is_active = models.BooleanField(default=True, verbose_name='Is Active')

    class Meta:
        verbose_name = 'Leave Type'
        verbose_name_plural = 'Leave Types'
        ordering = ['name']

    def __str__(self):
        return self.name


class LeaveRequest(BaseModel):
    """An employee's request for time off."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='leave_requests',
        verbose_name='Employee',
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name='requests',
        verbose_name='Leave Type',
    )
    start_date = models.DateField(verbose_name='Start Date')
    end_date = models.DateField(verbose_name='End Date')
    reason = models.TextField(blank=True, default='', verbose_name='Reason')

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name='Status',
    )
    reviewed_by = models.ForeignKey(
        'employees.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_leave_requests',
        verbose_name='Reviewed By',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='Reviewed At')
    review_notes = models.TextField(blank=True, default='', verbose_name='Review Notes')

    class Meta:
        verbose_name = 'Leave Request'
        verbose_name_plural = 'Leave Requests'
        ordering = ['-start_date', '-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F('start_date')),
                name='hr_leaverequest_end_after_start',
            ),
        ]

    def __str__(self):
        return f'{self.employee} — {self.leave_type} ({self.start_date} → {self.end_date})'

    @property
    def total_days(self):
        """Calendar days covered, inclusive of both endpoints."""
        return (self.end_date - self.start_date).days + 1

    def approve(self, reviewer, notes=''):
        self.status = self.Status.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])
        return self

    def reject(self, reviewer, notes=''):
        self.status = self.Status.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])
        return self


# =============================================================================
# PAYROLL
# =============================================================================

class PayrollPeriod(BaseModel):
    """A pay run covering a date range, holding one payslip per employee."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Approval'
        PAID = 'paid', 'Paid'
        CANCELLED = 'cancelled', 'Cancelled'

    name = models.CharField(
        max_length=120,
        verbose_name='Name',
        help_text='e.g. "Week 34 2026" or "Augustus 2026".',
    )
    start_date = models.DateField(verbose_name='Start Date')
    end_date = models.DateField(verbose_name='End Date')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        verbose_name='Status',
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='Paid At')
    notes = models.TextField(blank=True, default='', verbose_name='Notes')

    class Meta:
        verbose_name = 'Payroll Period'
        verbose_name_plural = 'Payroll Periods'
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F('start_date')),
                name='hr_payrollperiod_end_after_start',
            ),
            models.UniqueConstraint(
                fields=['start_date', 'end_date'],
                condition=models.Q(is_deleted=False),
                name='hr_payrollperiod_unique_range',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.start_date} → {self.end_date})'

    @property
    def total_gross(self):
        return self.payslips.aggregate(t=models.Sum('gross_pay'))['t'] or Decimal('0.00')

    @property
    def employee_count(self):
        return self.payslips.count()


class Payslip(BaseModel):
    """One employee's pay for one period, derived from approved work entries."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Approval'
        PAID = 'paid', 'Paid'

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='payslips',
        verbose_name='Payroll Period',
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.PROTECT,
        related_name='payslips',
        verbose_name='Employee',
    )

    total_hours = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Total Hours',
    )
    base_pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Base Pay',
    )
    surcharge_pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Surcharge Pay',
    )
    allowance_pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Allowance Pay',
    )
    deductions = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Deductions',
        help_text='Wallet advances repaid in this period, and any manual deductions.',
    )
    gross_pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Gross Pay',
    )
    net_pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Net Pay',
        help_text='Gross pay minus deductions. Payroll tax is handled by the '
                  'external payroll provider, not by this system.',
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
        db_index=True, verbose_name='Status',
    )
    notes = models.TextField(blank=True, default='', verbose_name='Notes')

    class Meta:
        verbose_name = 'Payslip'
        verbose_name_plural = 'Payslips'
        ordering = ['employee__last_name', 'employee__first_name']
        constraints = [
            models.UniqueConstraint(
                fields=['period', 'employee'],
                condition=models.Q(is_deleted=False),
                name='hr_payslip_unique_employee_per_period',
            ),
        ]

    def __str__(self):
        return f'{self.employee} — {self.period.name}'

    def recalculate(self):
        """Recompute the totals from this payslip's own lines."""
        agg = self.lines.aggregate(
            hours=models.Sum('hours'),
            base=models.Sum('base_amount'),
            surcharge=models.Sum('surcharge_amount'),
            allowance=models.Sum('allowance_amount'),
        )
        self.total_hours = agg['hours'] or Decimal('0.00')
        self.base_pay = agg['base'] or Decimal('0.00')
        self.surcharge_pay = agg['surcharge'] or Decimal('0.00')
        self.allowance_pay = agg['allowance'] or Decimal('0.00')
        self.gross_pay = self.base_pay + self.surcharge_pay + self.allowance_pay
        self.net_pay = self.gross_pay - self.deductions
        self.save(update_fields=[
            'total_hours', 'base_pay', 'surcharge_pay', 'allowance_pay',
            'gross_pay', 'net_pay', 'updated_at',
        ])
        return self


class PayslipLine(TimeStampedModel):
    """One work entry's contribution to a payslip, kept for auditability."""

    payslip = models.ForeignKey(
        Payslip,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name='Payslip',
    )
    work_entry = models.ForeignKey(
        'worklogs.WorkEntry',
        on_delete=models.PROTECT,
        related_name='payslip_lines',
        verbose_name='Work Entry',
    )
    work_date = models.DateField(verbose_name='Work Date')
    description = models.CharField(max_length=255, blank=True, default='', verbose_name='Description')

    hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    surcharge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    allowance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = 'Payslip Line'
        verbose_name_plural = 'Payslip Lines'
        ordering = ['work_date']
        constraints = [
            models.UniqueConstraint(
                fields=['payslip', 'work_entry'],
                name='hr_payslipline_unique_entry_per_payslip',
            ),
        ]

    def __str__(self):
        return f'{self.work_date} — {self.hours}h'

    @property
    def total_amount(self):
        return self.base_amount + self.surcharge_amount + self.allowance_amount
