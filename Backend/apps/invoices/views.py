"""Invoice API Views."""
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsFinanceStaff
from apps.employees.models import Agency
from apps.worklogs.models import WorkEntry
from .models import (
    Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate,
    AgencyInvoice, AgencyInvoiceLine, IncomingInvoice,
)
from .serializers import (
    InvoiceListSerializer, InvoiceDetailSerializer, InvoiceGenerateSerializer,
    CostTypeSerializer, ProjectRateSerializer, InvoiceLineSerializer, InvoiceCostSerializer,
    AgencyInvoiceListSerializer, AgencyInvoiceDetailSerializer,
    AgencyInvoiceGenerateSerializer, AgencyInvoicePaymentSerializer,
    IncomingInvoiceSerializer,
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
        from django.db import IntegrityError
        customer = Customer.objects.get(id=customer_id)
        
        try:
            invoice = Invoice.objects.create(
                invoice_number=invoice_number,
                customer=customer,
                week_year=week_year,
                week_number=week_number,
                week_start_date=week_start.date(),
                week_end_date=week_end.date(),
                created_by=request.user
            )
        except IntegrityError:
            return Response(
                {'error': 'Invoice already exists for this customer and week'},
                status=status.HTTP_400_BAD_REQUEST
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
                quantity_hours=entry.calculated_hours,
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


# =============================================================================
# AGENCY INVOICE VIEWSET
# =============================================================================

class AgencyInvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for agency invoice management.
    
    Endpoints:
        GET    /api/invoices/agency-invoices/          — List all agency invoices
        POST   /api/invoices/agency-invoices/          — Create manually
        GET    /api/invoices/agency-invoices/{id}/      — Detail view
        POST   /api/invoices/agency-invoices/preview/   — Preview entries before generating
        POST   /api/invoices/agency-invoices/generate/  — Generate invoice from work entries
        POST   /api/invoices/agency-invoices/{id}/finalize/   — Mark as sent
        POST   /api/invoices/agency-invoices/{id}/mark_paid/  — Mark as paid with bank proof
    """
    
    queryset = AgencyInvoice.objects.select_related('agency').prefetch_related(
        'lines__employee', 'lines__project'
    ).order_by('-period_start')
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AgencyInvoiceListSerializer
        if self.action == 'generate':
            return AgencyInvoiceGenerateSerializer
        if self.action == 'mark_paid':
            return AgencyInvoicePaymentSerializer
        return AgencyInvoiceDetailSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by agency
        agency_id = self.request.query_params.get('agency')
        if agency_id:
            qs = qs.filter(agency_id=agency_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        return qs
    
    @action(detail=False, methods=['post'])
    def preview(self, request):
        """
        Preview which work entries will be included in an agency invoice.
        
        Returns the list of approved entries for the agency in the given period
        that have NOT been invoiced yet (no double-billing).
        """
        serializer = AgencyInvoiceGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        agency_id = serializer.validated_data['agency_id']
        period_start = serializer.validated_data['period_start']
        period_end = serializer.validated_data['period_end']
        
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            return Response(
                {'error': 'Agency not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get approved entries for this agency, not yet invoiced
        entries = WorkEntry.objects.filter(
            status=WorkEntry.Status.APPROVED,
            agency=agency,
            work_date__gte=period_start,
            work_date__lte=period_end,
        ).exclude(
            agency_invoice_line__isnull=False  # Exclude already-invoiced entries
        ).select_related('employee', 'project').order_by('work_date', 'employee')
        
        # Build preview data
        preview_lines = []
        total_hours = Decimal('0.00')
        total_amount = Decimal('0.00')
        
        for entry in entries:
            # Priced on the agency's own rate and its own AgencySurcharge
            # percentages, using the same minute-level engine as customer
            # billing — so partial hours inside a window split identically.
            #
            # This used to read `entry.surcharges_breakdown`, a serializer field
            # that does not exist on the model, so the guard never passed and
            # every agency line was billed with zero surcharge.
            agency_breakdown = entry.get_agency_hours_breakdown(agency)

            hours = Decimal(str(agency_breakdown['total_hours']))
            base_rate = agency.base_hourly_rate
            base_amount = Decimal(str(agency_breakdown['base_amount']))
            surcharge_amount = Decimal(str(agency_breakdown['total_surcharge_amount']))
            # Effective blended percentage, for display on the line.
            surcharge_pct = (
                (surcharge_amount / base_amount * 100).quantize(Decimal('0.01'))
                if base_amount else Decimal('0.00')
            )
            line_total = Decimal(str(agency_breakdown['total_amount']))
            
            total_hours += hours
            total_amount += line_total
            
            preview_lines.append({
                'work_entry_id': str(entry.id),
                'employee_name': entry.employee.full_name if hasattr(entry.employee, 'full_name') else str(entry.employee),
                'project_name': entry.project.name,
                'work_date': entry.work_date.isoformat(),
                'hours': str(hours),
                'base_rate': str(base_rate),
                'base_amount': str(base_amount),
                'surcharge_percentage': str(surcharge_pct),
                'surcharge_amount': str(surcharge_amount),
                'total': str(line_total),
            })
        
        return Response({
            'agency_name': agency.name,
            'agency_code': agency.code,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'entry_count': len(preview_lines),
            'total_hours': str(total_hours),
            'subtotal': str(total_amount),
            'vat_amount': str((total_amount * Decimal('0.21')).quantize(Decimal('0.01'))),
            'total': str((total_amount * Decimal('1.21')).quantize(Decimal('0.01'))),
            'lines': preview_lines,
        })
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate an agency invoice from approved work entries.
        
        Only includes entries that have NOT been invoiced yet.
        Each work entry gets a OneToOne link to an AgencyInvoiceLine,
        preventing it from ever being double-billed.
        """
        serializer = AgencyInvoiceGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        agency_id = serializer.validated_data['agency_id']
        period_start = serializer.validated_data['period_start']
        period_end = serializer.validated_data['period_end']
        
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            return Response(
                {'error': 'Agency not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get approved, un-invoiced entries
        entries = WorkEntry.objects.filter(
            status=WorkEntry.Status.APPROVED,
            agency=agency,
            work_date__gte=period_start,
            work_date__lte=period_end,
        ).exclude(
            agency_invoice_line__isnull=False
        ).select_related('employee', 'project').order_by('work_date')
        
        if not entries.exists():
            return Response(
                {'error': 'No un-invoiced approved work entries found for this agency and period.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate invoice number: AG-YYYY-NNNN
        year = period_start.year
        count = AgencyInvoice.objects.filter(
            invoice_number__startswith=f'AG-{year}'
        ).count() + 1
        invoice_number = f"AG-{year}-{count:04d}"
        
        # Create invoice
        invoice = AgencyInvoice.objects.create(
            invoice_number=invoice_number,
            agency=agency,
            period_start=period_start,
            period_end=period_end,
            created_by=request.user,
        )
        
        # Create line items
        for entry in entries:
            # Same engine as the preview above, so a generated invoice always
            # matches what was previewed.
            agency_breakdown = entry.get_agency_hours_breakdown(agency)

            hours = Decimal(str(agency_breakdown['total_hours']))
            base_rate = agency.base_hourly_rate
            base_amount = Decimal(str(agency_breakdown['base_amount']))
            surcharge_amount = Decimal(str(agency_breakdown['total_surcharge_amount']))
            surcharge_pct = (
                (surcharge_amount / base_amount * 100).quantize(Decimal('0.01'))
                if base_amount else Decimal('0.00')
            )

            AgencyInvoiceLine.objects.create(
                invoice=invoice,
                employee=entry.employee,
                work_entry=entry,
                project=entry.project,
                work_date=entry.work_date,
                hours=hours,
                base_rate=base_rate,
                base_amount=base_amount,
                surcharge_percentage=surcharge_pct,
                surcharge_amount=surcharge_amount,
                total=base_amount + surcharge_amount,
                description=f"{entry.employee.full_name if hasattr(entry.employee, 'full_name') else ''} - {entry.project.name}",
                created_by=request.user,
            )
        
        # Recalculate totals
        invoice.calculate_totals()
        
        return Response({
            'status': 'success',
            'invoice': AgencyInvoiceDetailSerializer(invoice).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Finalize agency invoice (mark as sent)."""
        invoice = self.get_object()
        if invoice.status not in [AgencyInvoice.Status.DRAFT, AgencyInvoice.Status.PENDING]:
            return Response(
                {'error': 'Invoice already finalized'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invoice.status = AgencyInvoice.Status.SENT
        invoice.issue_date = datetime.now().date()
        # Default due date: 30 days from issue
        invoice.due_date = invoice.issue_date + timedelta(days=30)
        invoice.save()
        return Response({
            'status': 'success',
            'invoice': AgencyInvoiceDetailSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """
        Mark agency invoice as paid with bank proof.
        
        Accepts multipart form data with:
        - amount_paid: decimal
        - paid_date: date
        - bank_proof: file (optional)
        - notes: string (optional)
        """
        invoice = self.get_object()
        serializer = AgencyInvoicePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        invoice.amount_paid = serializer.validated_data['amount_paid']
        invoice.paid_date = serializer.validated_data['paid_date']
        
        if 'bank_proof' in request.FILES:
            invoice.bank_proof = request.FILES['bank_proof']
        
        notes = serializer.validated_data.get('notes', '')
        if notes:
            invoice.internal_notes = (invoice.internal_notes + f"\n[Payment] {notes}").strip()
        
        # Determine status based on amount
        if invoice.amount_paid >= invoice.total:
            invoice.status = AgencyInvoice.Status.PAID
        else:
            invoice.status = AgencyInvoice.Status.PARTIALLY_PAID
        
        invoice.save()
        return Response({
            'status': 'success',
            'invoice': AgencyInvoiceDetailSerializer(invoice).data
        })



# =============================================================================
# INCOMING INVOICES
# =============================================================================

class IncomingInvoiceViewSet(viewsets.ModelViewSet):
    """
    Supplier / purchase invoices.

    Finance and admin only — these are payables, not employee-facing data.
    """

    queryset = (
        IncomingInvoice.objects.filter(is_deleted=False)
        .select_related('agency', 'category')
    )
    serializer_class = IncomingInvoiceSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['status', 'agency', 'category', 'vendor_name']
    search_fields = ['invoice_number', 'vendor_name', 'description']
    ordering_fields = ['invoice_date', 'due_date', 'total', 'created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark an incoming invoice as paid."""
        invoice = self.get_object()
        if invoice.status == IncomingInvoice.Status.PAID:
            return Response(
                {'detail': 'This invoice is already marked paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        paid_date = request.data.get('paid_date') or timezone.localdate()
        invoice.status = IncomingInvoice.Status.PAID
        invoice.paid_date = paid_date
        invoice.updated_by = request.user
        invoice.save()
        return Response(self.get_serializer(invoice).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Totals for the dashboard header cards."""
        qs = self.filter_queryset(self.get_queryset())
        today = timezone.localdate()
        pending = qs.filter(status=IncomingInvoice.Status.PENDING)
        overdue = qs.filter(
            status__in=[IncomingInvoice.Status.PENDING, IncomingInvoice.Status.OVERDUE],
            due_date__lt=today,
        )
        paid = qs.filter(status=IncomingInvoice.Status.PAID)
        def agg(queryset):
            # Serialised as a string: the JSON renderer turns a bare Decimal
            # into a float, so €302.50 came back as 302.5 while every other
            # money field in the API is a two-decimal string.
            total = queryset.aggregate(t=Sum('total'))['t'] or Decimal('0.00')
            return f"{total.quantize(Decimal('0.01'))}"
        return Response({
            'total_count': qs.count(),
            'pending_count': pending.count(),
            'pending_total': agg(pending),
            'overdue_count': overdue.count(),
            'overdue_total': agg(overdue),
            'paid_count': paid.count(),
            'paid_total': agg(paid),
        })


# =============================================================================
# EMPLOYEE EARNINGS
# =============================================================================

class PendingEarningsView(viewsets.ViewSet):
    """
    What the signed-in employee has earned but not yet been paid for.

    GET /api/invoices/pending-earnings/

    "Pending" means a work entry that has been submitted or approved but is not
    yet carried by a paid payslip. The mobile app shows this as the running
    total on the earnings screen.
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        from apps.employees.models import EmployeeProfile
        from apps.hr.models import Payslip

        profile = EmployeeProfile.objects.filter(user=request.user).first()
        if profile is None:
            return Response({
                'submitted_count': 0, 'submitted_hours': '0.00', 'submitted_amount': '0.00',
                'approved_count': 0, 'approved_hours': '0.00', 'approved_amount': '0.00',
                'total_pending_amount': '0.00', 'currency': 'EUR', 'results': [],
            })

        paid_entry_ids = set(
            Payslip.objects.filter(
                employee=profile, status=Payslip.Status.PAID, is_deleted=False,
            ).values_list('lines__work_entry_id', flat=True)
        )
        paid_entry_ids.discard(None)

        entries = (
            WorkEntry.objects.filter(
                employee=profile,
                status__in=[WorkEntry.Status.SUBMITTED, WorkEntry.Status.APPROVED],
            )
            .exclude(id__in=paid_entry_ids)
            .select_related('project', 'service')
            .order_by('-work_date')
        )

        buckets = {
            WorkEntry.Status.SUBMITTED: {'count': 0, 'hours': Decimal('0'), 'amount': Decimal('0')},
            WorkEntry.Status.APPROVED: {'count': 0, 'hours': Decimal('0'), 'amount': Decimal('0')},
        }
        results = []
        for entry in entries:
            hours = Decimal(str(entry.calculated_hours or 0))
            amount = entry.calculated_employee_payment or Decimal('0')
            bucket = buckets[entry.status]
            bucket['count'] += 1
            bucket['hours'] += hours
            bucket['amount'] += amount
            results.append({
                'id': str(entry.id),
                'work_date': entry.work_date,
                'status': entry.status,
                'project': str(entry.project) if entry.project else None,
                'service': str(entry.service) if entry.service else None,
                'hours': f'{hours:.2f}',
                'estimated_earnings': f'{amount:.2f}',
            })

        submitted = buckets[WorkEntry.Status.SUBMITTED]
        approved = buckets[WorkEntry.Status.APPROVED]
        return Response({
            'submitted_count': submitted['count'],
            'submitted_hours': f"{submitted['hours']:.2f}",
            'submitted_amount': f"{submitted['amount']:.2f}",
            'approved_count': approved['count'],
            'approved_hours': f"{approved['hours']:.2f}",
            'approved_amount': f"{approved['amount']:.2f}",
            'total_pending_amount': f"{submitted['amount'] + approved['amount']:.2f}",
            'currency': 'EUR',
            'results': results,
        })
