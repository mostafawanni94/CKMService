"""HR URL configuration."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
    PayrollPeriodViewSet,
    PayslipViewSet,
)

router = DefaultRouter()
router.register(r'leave-types', LeaveTypeViewSet, basename='leave-type')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')
router.register(r'payroll-periods', PayrollPeriodViewSet, basename='payroll-period')
router.register(r'payslips', PayslipViewSet, basename='payslip')
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [path('', include(router.urls))]
