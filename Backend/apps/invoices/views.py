"""Invoice API Views."""
from datetime import datetime, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.views import IsAdmin
from apps.worklogs.models import WorkEntry
from .models import Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate
from .serializers import (
    InvoiceListSerializer, InvoiceDetailSerializer, InvoiceGenerateSerializer,
    CostTypeSerializer, ProjectRateSerializer, InvoiceLineSerializer, InvoiceCostSerializer,
)


class CostTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for cost types (admin configurable)."""
    queryset = CostType.objects.order_by('name')
    serializer_class = CostTypeSerializer
    permission_classes = [IsAdmin]


class ProjectRateViewSet(viewsets.ModelViewSet):
    """ViewSet for project rates."""
    queryset = ProjectRate.objects.select_related('project', 'customer').order_by('-effective_from')
    serializer_class = ProjectRateSerializer
    permission_classes = [IsAdmin]


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for invoice management with weekly generation."""
    
    queryset = Invoice.objects.select_related('customer').prefetch_related(
        'lines', 'costs'
    ).order_by('-week_year', '-week_number')
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action == 'generate':
            return InvoiceGenerateSerializer
        return InvoiceDetailSerializer
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate weekly invoice for a customer.
        
        Week = Monday 06:00 → Sunday 06:00
        """
        serializer = InvoiceGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        customer_id = serializer.validated_data['customer_id']
        week_year = serializer.validated_data['week_year']
        week_number = serializer.validated_data['week_number']
        
        # Check if invoice already exists
        if Invoice.objects.filter(
            customer_id=customer_id,
            week_year=week_year,
            week_number=week_number
        ).exists():
            return Response(
                {'error': 'Invoice already exists for this week'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate week dates (Mon 06:00 → Sun 06:00)
        week_start = datetime.strptime(f'{week_year}-W{week_number:02d}-1', '%G-W%V-%u')
        week_start = week_start.replace(hour=6, minute=0, second=0)
        week_end = week_start + timedelta(days=7)
        
        # Get approved work entries for this customer in this week
        work_entries = WorkEntry.objects.filter(
            status=WorkEntry.Status.APPROVED,
            project__customer_id=customer_id,
            billing_week_year=week_year,
            billing_week_number=week_number
        ).select_related('employee', 'project')
        
        if not work_entries.exists():
            return Response(
                {'error': 'No approved work entries for this week'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate invoice number
        invoice_count = Invoice.objects.count() + 1
        invoice_number = f"INV-{week_year}{week_number:02d}-{invoice_count:04d}"
        
        # Create invoice
        from apps.customers.models import Customer
        customer = Customer.objects.get(id=customer_id)
        
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            customer=customer,
            week_year=week_year,
            week_number=week_number,
            week_start_date=week_start.date(),
            week_end_date=week_end.date(),
            created_by=request.user
        )
        
        # Create invoice lines from work entries
        for entry in work_entries:
            # Get rate (simplified)
            rate = ProjectRate.objects.filter(
                project=entry.project,
                effective_from__lte=entry.work_date
            ).first()
            
            hourly_rate = rate.customer_rate if rate else 25.00
            
            InvoiceLine.objects.create(
                invoice=invoice,
                project=entry.project,
                employee=entry.employee,
                description=f"Work on {entry.work_date}",
                quantity_hours=entry.billable_hours,
                hourly_rate=hourly_rate,
                created_by=request.user
            )
        
        # Recalculate totals
        invoice.calculate_totals()
        
        return Response({
            'status': 'success',
            'invoice': InvoiceDetailSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Finalize invoice (mark as sent)."""
        invoice = self.get_object()
        if invoice.status != Invoice.Status.DRAFT:
            return Response({'error': 'Invoice already finalized'}, status=status.HTTP_400_BAD_REQUEST)
        
        invoice.status = Invoice.Status.SENT
        invoice.issue_date = datetime.now().date()
        invoice.save()
        return Response({'status': 'success', 'invoice': InvoiceDetailSerializer(invoice).data})
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid."""
        invoice = self.get_object()
        invoice.status = Invoice.Status.PAID
        invoice.paid_date = datetime.now().date()
        invoice.amount_paid = invoice.total
        invoice.save()
        return Response({'status': 'success'})
