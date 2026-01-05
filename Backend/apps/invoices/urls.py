"""Invoice URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, CostTypeViewSet, ProjectRateViewSet

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'cost-types', CostTypeViewSet, basename='cost-type')
router.register(r'rates', ProjectRateViewSet, basename='rate')

urlpatterns = [path('', include(router.urls))]
