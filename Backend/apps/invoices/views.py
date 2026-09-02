"""Invoice API Views."""
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsFinanceStaff
from apps.employees.models import Agency
from apps.worklogs.models import WorkEntry
from .billing import (
    BillingError, add_manual_line, billable_entries, create_credit_note,
    describe_entry, generate_invoice, issue_blockers, issue_invoice,
    price_entry, record_payment, retry_on_lock,
)
from .numbering import DocumentSeries, peek_number
from .models import (
    Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate,
    AgencyInvoice, AgencyInvoiceLine, IncomingInvoice,
)
from .serializers import (
    InvoiceListSerializer, InvoiceDetailSerializer, InvoiceGenerateSerializer,
    InvoicePreviewSerializer, CreditNoteSerializer, RecordPaymentSerializer,
    ManualLineSerializer,
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
    """
    Customer invoices and credit notes.

    Generation, issuing and crediting all go through `apps.invoices.billing`;
    this class only translates HTTP into calls on it, so there is one place
    where work becomes money.
    """

    queryset = Invoice.objects.select_related('customer', 'project', 'corrects') \
        .prefetch_related('lines', 'costs', 'allowance_lines', 'gratuity_lines',
                          'credit_notes') \
        .order_by('-issue_date', '-week_year', '-week_number')
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['customer', 'status', 'document_type', 'week_year',
                        'week_number', 'project']
    search_fields = ['invoice_number', 'customer__company_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action == 'generate':
            return InvoiceGenerateSerializer
        if self.action == 'preview':
            return InvoicePreviewSerializer
        if self.action == 'credit_note':
            return CreditNoteSerializer
        if self.action == 'record_payment':
            return RecordPaymentSerializer
        if self.action == 'add_line':
            return ManualLineSerializer
        return InvoiceDetailSerializer

    def perform_destroy(self, instance):
        """
        A document that has ever been issued is never deleted.

        The test is the issue date, not the current status: a cancelled invoice
        was still sent to a customer, and its number has been consumed. Only a
        draft that never left the building can be removed.
        """
        if instance.issue_date is not None or instance.is_issued:
            raise ValidationError(
                f'{instance.invoice_number} was issued on {instance.issue_date} '
                f'and cannot be deleted. Issue a credit note instead.')
        if instance.is_credit_note:
            raise ValidationError(
                f'{instance.invoice_number} is a credit note and cannot be deleted.')
        instance.delete()

    # ── Selecting the work ────────────────────────────────────────────────

    def _selection(self, data):
        """Turn request data into the arguments the billing service expects."""
        from apps.customers.models import Customer
        from apps.projects.models import Project

        customer = get_object_or_404(Customer, pk=data['customer_id'])
        project = None
        if data.get('project_id'):
            project = get_object_or_404(Project, pk=data['project_id'],
                                        customer=customer)
        if data.get('week_year') and data.get('week_number'):
            return customer, project, {'week': (data['week_year'], data['week_number'])}
        return customer, project, {'start': data['period_start'],
                                   'end': data['period_end']}

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """
        What would be billed, and what would stand in the way.

        Nothing is created. Used by the dashboard before the user commits.
        """
        serializer = InvoicePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer, project, window = self._selection(serializer.validated_data)

        entries = list(billable_entries(customer, project=project, **window))
        rows, total = [], Decimal('0.00')
        unpriced_services = set()
        for entry in entries:
            priced = price_entry(entry)
            total += priced['total']
            if not priced['has_rate']:
                unpriced_services.add(
                    priced['service'] or 'geen dienst gekozen op de urenregistratie')
            rows.append({
                'work_entry': str(entry.pk),
                'work_date': entry.work_date,
                'employee': entry.employee.full_name if entry.employee else '',
                'project': entry.project.name if entry.project else '',
                'description': describe_entry(entry),
                'hours': priced['hours'],
                'rate': priced['rate'],
                'base': priced['base'],
                'surcharge_amount': priced['surcharge_amount'],
                'allowance_amount': priced['allowance_amount'],
                'total': priced['total'],
                'surcharges': priced['surcharges'],
                'has_rate': priced['has_rate'],
            })

        skipped = list(billable_entries(
            customer, project=project, include_billed=True, **window
        ).exclude(pk__in=[e.pk for e in entries]).values_list('pk', flat=True))

        warnings = []
        if unpriced_services:
            warnings.append({
                'code': 'NO_RATE',
                'message': 'No hourly rate resolves for: '
                           + ', '.join(sorted(unpriced_services))
                           + '. Those hours would be billed at zero.',
            })

        return Response({
            'customer': customer.company_name,
            'entry_count': len(rows),
            'already_billed_count': len(skipped),
            'subtotal': total,
            'warnings': warnings,
            'next_invoice_number': peek_number(
                DocumentSeries.INVOICE, timezone.localdate().year),
            'lines': rows,
        })

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Create a draft invoice from approved, unbilled work."""
        serializer = InvoiceGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        customer, project, window = self._selection(data)

        facts = {
            field: data[field]
            for field in ('is_staff_lending_or_subcontracting',
                          'is_physical_work_on_immovable_property')
            if data.get(field) is not None
        }

        try:
            # Two people generating at the same moment contend for the number
            # sequence; the loser waits and tries again rather than erroring.
            invoice = retry_on_lock(lambda: generate_invoice(
                customer, project=project, actor=request.user,
                notes=data.get('notes', ''),
                vat_treatment_code=data.get('vat_treatment_code') or None,
                reverse_charge_facts=facts,
                **window))
        except BillingError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {'status': 'success',
             'invoice': InvoiceDetailSerializer(
                 invoice, context=self.get_serializer_context()).data},
            status=status.HTTP_201_CREATED)

    # ── Lifecycle ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def blockers(self, request, pk=None):
        """What stands between this draft and the customer."""
        blockers = issue_blockers(self.get_object())
        return Response({'can_issue': not blockers, 'blockers': blockers})

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """
        Issue the invoice: date it, render the PDF, and post the VAT.

        Replaces the old `finalize`, which only flipped a status field.
        """
        try:
            invoice = issue_invoice(self.get_object(), actor=request.user)
        except BillingError as exc:
            return Response(
                {'error': str(exc), 'blockers': issue_blockers(self.get_object())},
                status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'success', 'invoice': InvoiceDetailSerializer(
            invoice, context=self.get_serializer_context()).data})

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Kept for existing clients; `issue` is the current name."""
        return self.issue(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='add-line')
    def add_line(self, request, pk=None):
        """Add a line that did not come from a work entry."""
        serializer = ManualLineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.employees.models import EmployeeProfile
        from apps.projects.models import Project

        try:
            line = add_manual_line(
                self.get_object(),
                description=data['description'],
                quantity_hours=data['quantity_hours'],
                hourly_rate=data['hourly_rate'],
                project=(Project.objects.filter(pk=data['project_id']).first()
                         if data.get('project_id') else None),
                employee=(EmployeeProfile.objects.filter(pk=data['employee_id']).first()
                          if data.get('employee_id') else None),
                work_date=data.get('work_date'),
                actor=request.user)
        except BillingError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvoiceLineSerializer(line).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='credit-note')
    def credit_note(self, request, pk=None):
        """Credit this invoice, in whole or in part. The original is untouched."""
        serializer = CreditNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            note = retry_on_lock(lambda: create_credit_note(
                self.get_object(),
                reason=serializer.validated_data['reason'],
                line_ids=serializer.validated_data.get('line_ids') or None,
                actor=request.user))
        except BillingError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {'status': 'success',
             'credit_note': InvoiceDetailSerializer(
                 note, context=self.get_serializer_context()).data},
            status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        """Record money received against this invoice."""
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            invoice = record_payment(
                self.get_object(),
                serializer.validated_data['amount'],
                paid_date=serializer.validated_data.get('paid_date'),
                actor=request.user)
        except BillingError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvoiceDetailSerializer(
            invoice, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Settle the invoice in full. Kept for existing clients."""
        invoice = self.get_object()
        outstanding = invoice.net_of_credits - invoice.amount_paid
        if outstanding > 0:
            record_payment(invoice, outstanding, actor=request.user)
        else:
            invoice.status = Invoice.Status.PAID
            invoice.paid_date = timezone.localdate()
            invoice.save(update_fields=['status', 'paid_date', 'updated_at'])
        return Response({'status': 'success'})

    # ── The document ──────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        The invoice as the customer sees it.

        A draft is rendered on demand so it can be checked; an issued invoice
        returns the file that was stored when it was issued, never a fresh
        render, so our copy and the customer's stay identical.
        """
        invoice = self.get_object()
        if invoice.pdf_file:
            invoice.pdf_file.open('rb')
            content = invoice.pdf_file.read()
            invoice.pdf_file.close()
        else:
            from .pdf import build_invoice_pdf
            content = build_invoice_pdf(invoice)

        response = HttpResponse(content, content_type='application/pdf')
        disposition = 'attachment' if request.query_params.get('download') else 'inline'
        response['Content-Disposition'] = (
            f'{disposition}; filename="{invoice.invoice_number}.pdf"')
        return response

    @action(detail=True, methods=['post'], url_path='send')
    def send_to_customer(self, request, pk=None):
        """Email the invoice to the customer, with the PDF attached."""
        invoice = self.get_object()
        if not invoice.is_issued:
            return Response({'error': 'Issue the invoice before sending it.'},
                            status=status.HTTP_400_BAD_REQUEST)
        recipient = (request.data.get('email')
                     or getattr(invoice.customer, 'email', '') or '').strip()
        if not recipient:
            return Response({'error': 'No email address for this customer.'},
                            status=status.HTTP_400_BAD_REQUEST)

        from .delivery import email_invoice
        sent = email_invoice(invoice, recipient, actor=request.user)
        if not sent:
            return Response(
                {'error': 'Email is not configured. Set SMTP up in Settings.'},
                status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'success', 'sent_to': recipient})


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
        
        # The VAT the agency will charge, not a flat 21%. An agency lending
        # workers for covered work invoices CKM with the VAT reverse charged,
        # and the preview must say the same thing the invoice will.
        probe = AgencyInvoice(agency=agency, vat_rate=Decimal('21.00'),
                              vat_treatment_code=agency.vat_treatment_code)
        vat_amount = probe.charged_vat_on(total_amount)

        return Response({
            'agency_name': agency.name,
            'agency_code': agency.code,
            'agency_vat_treatment': agency.vat_treatment_code,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'entry_count': len(preview_lines),
            'total_hours': str(total_hours),
            'subtotal': str(total_amount),
            'vat_amount': str(vat_amount),
            'total': str(total_amount + vat_amount),
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

@extend_schema_view(
    list=extend_schema(
        summary='What an employee has earned but not yet been paid',
        responses=OpenApiTypes.OBJECT),
)
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
