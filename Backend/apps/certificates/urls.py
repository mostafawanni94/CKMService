"""Certificate URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CertificateTypeViewSet, EmployeeCertificateViewSet

router = DefaultRouter()
router.register(r'types', CertificateTypeViewSet, basename='certificate-type')
router.register(r'employee-certificates', EmployeeCertificateViewSet, basename='employee-certificate')

urlpatterns = [path('', include(router.urls))]
