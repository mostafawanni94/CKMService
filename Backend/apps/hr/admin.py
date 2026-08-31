from django.contrib import admin

from .models import LeaveRequest, LeaveType, PayrollPeriod, Payslip, PayslipLine


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_paid', 'requires_approval', 'is_active')
    list_filter = ('is_paid', 'requires_approval', 'is_active')
    search_fields = ('name', 'code')


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'start_date', 'end_date', 'status')
    list_filter = ('status', 'leave_type')
    search_fields = ('employee__first_name', 'employee__last_name')
    date_hierarchy = 'start_date'


class PayslipLineInline(admin.TabularInline):
    model = PayslipLine
    extra = 0
    readonly_fields = ('work_entry', 'work_date', 'hours', 'hourly_rate',
                       'base_amount', 'surcharge_amount', 'allowance_amount')
    can_delete = False


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period', 'total_hours', 'gross_pay', 'deductions',
                    'net_pay', 'status')
    list_filter = ('status', 'period')
    search_fields = ('employee__first_name', 'employee__last_name')
    inlines = [PayslipLineInline]
    readonly_fields = ('total_hours', 'base_pay', 'surcharge_pay', 'allowance_pay',
                       'gross_pay', 'net_pay')


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'status', 'paid_at')
    list_filter = ('status',)
    search_fields = ('name',)
