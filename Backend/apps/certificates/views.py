"""Certificate API Views."""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.views import IsAdmin
from .models import CertificateType, EmployeeCertificate
from .serializers import CertificateTypeSerializer, EmployeeCertificateSerializer


class CertificateTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for certificate types (admin configurable)."""
    queryset = CertificateType.objects.order_by('sort_order', 'name')
    serializer_class = CertificateTypeSerializer
    permission_classes = [IsAdmin]

    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active certificate types."""
        active = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active, many=True)
        return Response(serializer.data)


class EmployeeCertificateViewSet(viewsets.ModelViewSet):
    """ViewSet for employee certificates."""
    queryset = EmployeeCertificate.objects.select_related(
        'employee', 'certificate_type'
    ).order_by('-created_at')
    serializer_class = EmployeeCertificateSerializer
    
    def get_queryset(self):
        queryset = self.queryset
        employee_id = self.request.query_params.get('employee', None)
        if employee_id is not None:
            queryset = queryset.filter(employee__id=employee_id)
            
        user = self.request.user
        if user.is_admin:
            return queryset
        return queryset.filter(employee__user=user)
    
    def perform_create(self, serializer):
        # If employee is already validated in serializer, use it.
        # Otherwise fall back to current user's profile (for self-service if added later)
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def verify(self, request, pk=None):
        """Admin verifies certificate."""
        cert = self.get_object()
        cert.status = EmployeeCertificate.Status.VERIFIED
        cert.save()
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def expiring_soon(self, request):
        """Get certificates expiring within 30 days."""
        from django.utils import timezone
        from datetime import timedelta
        
        threshold = timezone.now().date() + timedelta(days=30)
        expiring = self.queryset.filter(
            expiry_date__lte=threshold,
            expiry_date__gte=timezone.now().date(),
            status=EmployeeCertificate.Status.VERIFIED
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)
