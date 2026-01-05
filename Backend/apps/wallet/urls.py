"""
Wallet URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import WalletViewSet, AdvanceRequestViewSet

router = DefaultRouter()
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'advances', AdvanceRequestViewSet, basename='advance')

urlpatterns = [
    path('', include(router.urls)),
]
