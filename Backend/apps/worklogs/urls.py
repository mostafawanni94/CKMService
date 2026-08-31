"""
WorkEntry & Shift URL Configuration.

Route order matters. The bare ``r''`` registration exposes WorkEntry at
``/api/worklogs/`` for backwards compatibility with the mobile app and the
dashboard, but it also claims ``^(?P<pk>[^/.]+)/$``. Any named prefix must
therefore be registered *before* it, or it will be swallowed as a detail lookup.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import WorkEntryViewSet, ShiftViewSet
from .excel_export import excel_export_view

router = DefaultRouter()
router.register(r'entries', WorkEntryViewSet, basename='workentry')
router.register(r'shifts', ShiftViewSet, basename='shift')
# Backwards-compatible alias: must stay last, see module docstring.
router.register(r'', WorkEntryViewSet, basename='workentry-root')

urlpatterns = [
    path('export/customer/', excel_export_view, name='worklog-export-customer'),
    path('', include(router.urls)),
]
