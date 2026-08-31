"""HR serializers."""

from rest_framework import serializers

from .models import LeaveRequest, LeaveType, PayrollPeriod, Payslip, PayslipLine


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            'id', 'name', 'code', 'description', 'is_paid',
            'requires_approval', 'max_days_per_year', 'is_active',
        ]


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)
    total_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_name',
            'start_date', 'end_date', 'total_days', 'reason',
            'status', 'reviewed_by', 'reviewed_by_email', 'reviewed_at',
            'review_notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'reviewed_by', 'reviewed_at', 'review_notes']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {'end_date': 'End date cannot be before start date.'}
            )

        employee = attrs.get('employee', getattr(self.instance, 'employee', None))
        if employee and start and end:
            overlapping = LeaveRequest.objects.filter(
                employee=employee,
                status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
                start_date__lte=end,
                end_date__gte=start,
            )
            if self.instance is not None:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    'This employee already has a pending or approved leave request '
                    'that overlaps these dates.'
                )
        return attrs


class LeaveReviewSerializer(serializers.Serializer):
    """Payload for the approve/reject actions."""

    notes = serializers.CharField(required=False, allow_blank=True, default='')


class PayslipLineSerializer(serializers.ModelSerializer):
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PayslipLine
        fields = [
            'id', 'work_entry', 'work_date', 'description', 'hours', 'hourly_rate',
            'base_amount', 'surcharge_amount', 'allowance_amount', 'total_amount',
        ]


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    lines = PayslipLineSerializer(many=True, read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id', 'period', 'period_name', 'employee', 'employee_name',
            'total_hours', 'base_pay', 'surcharge_pay', 'allowance_pay',
            'deductions', 'gross_pay', 'net_pay', 'status', 'notes',
            'lines', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'total_hours', 'base_pay', 'surcharge_pay', 'allowance_pay',
            'gross_pay', 'net_pay',
        ]


class PayslipListSerializer(serializers.ModelSerializer):
    """Lighter payslip representation for list views (no nested lines)."""

    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id', 'period', 'period_name', 'employee', 'employee_name',
            'total_hours', 'gross_pay', 'deductions', 'net_pay', 'status',
        ]


class PayrollPeriodSerializer(serializers.ModelSerializer):
    total_gross = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = [
            'id', 'name', 'start_date', 'end_date', 'status', 'paid_at',
            'notes', 'total_gross', 'employee_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'paid_at']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {'end_date': 'End date cannot be before start date.'}
            )
        return attrs


class AttendanceRecordSerializer(serializers.Serializer):
    """Read-only shape for the derived attendance report."""

    employee = serializers.UUIDField()
    employee_name = serializers.CharField()
    date = serializers.DateField()
    status = serializers.ChoiceField(choices=['present', 'absent', 'late', 'leave'])
    planned_start = serializers.TimeField(allow_null=True)
    actual_start = serializers.TimeField(allow_null=True)
    minutes_late = serializers.IntegerField()
    hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    work_entry = serializers.UUIDField(allow_null=True)
    leave_type = serializers.CharField(allow_null=True)
