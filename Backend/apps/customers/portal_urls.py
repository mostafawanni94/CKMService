"""Customer Portal URL Configuration."""

from django.urls import path
from .portal_views import CustomerPortalViewSet

# Manual URL patterns since we use a single ViewSet with custom actions
portal = CustomerPortalViewSet.as_view({
    'get': 'profile',
})

urlpatterns = [
    # Profile
    path('profile/', 
         CustomerPortalViewSet.as_view({'get': 'profile'}),
         name='customer-portal-profile'),
    
    # Projects
    path('projects/', 
         CustomerPortalViewSet.as_view({'get': 'list_projects'}),
         name='customer-portal-projects'),
    
    path('projects/<uuid:project_id>/', 
         CustomerPortalViewSet.as_view({'get': 'project_detail'}),
         name='customer-portal-project-detail'),
    
    path('projects/<uuid:project_id>/entries/', 
         CustomerPortalViewSet.as_view({'get': 'project_entries'}),
         name='customer-portal-project-entries'),
    
    path('projects/<uuid:project_id>/calendar/', 
         CustomerPortalViewSet.as_view({'get': 'project_calendar'}),
         name='customer-portal-project-calendar'),
    
    path('projects/<uuid:project_id>/export/', 
         CustomerPortalViewSet.as_view({'get': 'export_excel'}),
         name='customer-portal-project-export'),
    
    # Work entries
    path('entries/<uuid:entry_id>/', 
         CustomerPortalViewSet.as_view({'get': 'entry_detail'}),
         name='customer-portal-entry-detail'),
]
