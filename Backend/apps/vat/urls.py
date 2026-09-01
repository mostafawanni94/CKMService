"""VAT URL configuration."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FinanceDashboardView, VatLedgerEntryViewSet, VatPeriodViewSet,
    VatReturnBoxViewSet, VatTreatmentViewSet,
)

router = DefaultRouter()
router.register(r'boxes', VatReturnBoxViewSet, basename='vat-box')
router.register(r'treatments', VatTreatmentViewSet, basename='vat-treatment')
router.register(r'ledger', VatLedgerEntryViewSet, basename='vat-ledger')
router.register(r'periods', VatPeriodViewSet, basename='vat-period')
router.register(r'dashboard', FinanceDashboardView, basename='finance-dashboard')

urlpatterns = [path('', include(router.urls))]
