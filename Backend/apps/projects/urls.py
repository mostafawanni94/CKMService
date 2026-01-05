"""Project URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, ProjectAssignmentViewSet,
    ProjectShiftTemplateViewSet, ProjectPlannedDayViewSet, ShiftAssignmentViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'assignments', ProjectAssignmentViewSet, basename='assignment')
router.register(r'shift-templates', ProjectShiftTemplateViewSet, basename='shift-template')
router.register(r'planned-days', ProjectPlannedDayViewSet, basename='planned-day')
router.register(r'shift-assignments', ShiftAssignmentViewSet, basename='shift-assignment')

urlpatterns = [path('', include(router.urls))]
