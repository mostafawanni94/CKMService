"""
Customer URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, OutfolderViewSet, ServiceViewSet, GratuityViewSet, EmployeeCustomerViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'outfolders', OutfolderViewSet, basename='outfolder')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'gratuities', GratuityViewSet, basename='gratuity')
router.register(r'worklog-customers', EmployeeCustomerViewSet, basename='worklog-customer')

urlpatterns = [
    path('', include(router.urls)),
]

