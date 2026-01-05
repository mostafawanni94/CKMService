"""
Employee URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet, DocumentTypeViewSet, EmployeeProfileViewSet,
    ContractTypeViewSet, AgencyViewSet,
    SurchargeTypeViewSet, AgencySurchargeViewSet, AgencyWalletViewSet, AgencyTransactionViewSet,
    AllowanceTypeViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'document-types', DocumentTypeViewSet, basename='document-type')
router.register(r'contract-types', ContractTypeViewSet, basename='contract-type')
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'profiles', EmployeeProfileViewSet, basename='employee-profile')
router.register(r'surcharge-types', SurchargeTypeViewSet, basename='surcharge-type')
router.register(r'allowance-types', AllowanceTypeViewSet, basename='allowance-type')
router.register(r'wallets', AgencyWalletViewSet, basename='agency-wallet')

urlpatterns = [
    path('', include(router.urls)),
]

