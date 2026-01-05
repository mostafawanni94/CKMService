"""Notification URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationPreferenceViewSet, DeviceRegistrationViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'device', DeviceRegistrationViewSet, basename='device-registration')

urlpatterns = [path('', include(router.urls))]
