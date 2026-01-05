"""
Core URL configuration for system-wide APIs.
"""

from django.urls import path
from .views import SystemConfigView, SystemConfigPublicView

urlpatterns = [
    path('config/', SystemConfigView.as_view(), name='system-config'),
    path('config/public/', SystemConfigPublicView.as_view(), name='system-config-public'),
]
