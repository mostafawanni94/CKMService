"""WorkEntry URL Configuration - Unified endpoint."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkEntryViewSet

router = DefaultRouter()
# Unified endpoint - all work entries (planning + actual work)
router.register(r'entries', WorkEntryViewSet, basename='workentry')
# Also register at root for backward compatibility
router.register(r'', WorkEntryViewSet, basename='workentry-root')

urlpatterns = [path('', include(router.urls))]
