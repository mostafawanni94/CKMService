"""WorkLog URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkLogViewSet, ShiftViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'', WorkLogViewSet, basename='worklog')

urlpatterns = [path('', include(router.urls))]
