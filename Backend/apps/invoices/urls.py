"""Invoice URL Configuration."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AgencyInvoiceViewSet,
    CostTypeViewSet,
    IncomingInvoiceViewSet,
    InvoiceViewSet,
    PendingEarningsView,
    ProjectRateViewSet,
)

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'agency-invoices', AgencyInvoiceViewSet, basename='agency-invoice')
router.register(r'incoming-invoices', IncomingInvoiceViewSet, basename='incoming-invoice')
router.register(r'cost-types', CostTypeViewSet, basename='cost-type')
router.register(r'rates', ProjectRateViewSet, basename='rate')
router.register(r'pending-earnings', PendingEarningsView, basename='pending-earnings')

urlpatterns = [path('', include(router.urls))]
