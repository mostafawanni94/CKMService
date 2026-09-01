"""Invoice Serializers."""
from decimal import Decimal
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import (
    Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate,
    InvoiceAllowance, InvoiceGratuity, AgencyInvoice, AgencyInvoiceLine,
    IncomingInvoice,
)


class CostTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostType
        fields = ['id', 'name', 'description', 'code', 'default_unit_price', 
                  'is_active', 'is_billable_to_customer', 'is_deductible_from_employee']


class InvoiceLineSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = InvoiceLine
        fields = ['id', 'project', 'project_name', 'employee', 'employee_name',
                  'description', 'quantity_hours', 'hourly_rate', 'total',
                  'line_type', 'work_date', 'work_entry',
                  'base_amount', 'surcharge_amount', 'allowance_amount',
                  'surcharge_breakdown',
                  'vat_treatment_code', 'vat_rate', 'net_amount', 'vat_amount',
                  'gross_amount', 'vat_return_box', 'vat_classification_status',
                  'vat_review_reason']
        read_only_fields = ['net_amount', 'vat_amount', 'gross_amount',
                            'vat_return_box', 'vat_classification_status',
                            'vat_review_reason', 'base_amount',
                            'surcharge_amount', 'allowance_amount',
                            'surcharge_breakdown']


class InvoiceCostSerializer(serializers.ModelSerializer):
    cost_type_name = serializers.CharField(source='cost_type.name', read_only=True)
    
    class Meta:
        model = InvoiceCost
        fields = ['id', 'cost_type', 'cost_type_name', 'project', 'employee',
                  'description', 'quantity', 'unit_price', 'total']


class InvoiceAllowanceSerializer(serializers.ModelSerializer):
    """Serializer for invoice allowance line items."""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    allowance_type_name = serializers.CharField(source='allowance_type.name', read_only=True)
    allowance_type_code = serializers.CharField(source='allowance_type.code', read_only=True)
    allowance_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = InvoiceAllowance
        fields = ['id', 'employee', 'employee_name', 'allowance_type', 
                  'allowance_type_name', 'allowance_type_code', 'custom_name', 
                  'allowance_name', 'description', 'quantity_hours', 'hourly_rate', 'total']


class InvoiceGratuitySerializer(serializers.ModelSerializer):
    """Serializer for invoice gratuity line items."""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = InvoiceGratuity
        fields = ['id', 'gratuity', 'employee', 'employee_name', 'description', 'amount']


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'document_type', 'billing_mode',
                  'customer', 'customer_name', 'project', 'week_year',
                  'week_number', 'week_start_date', 'week_end_date',
                  'period_start', 'period_end', 'subtotal', 'vat_amount', 'total',
                  'total_allowances', 'total_gratuities', 'amount_paid',
                  'status', 'status_display', 'issue_date', 'due_date',
                  'corrects', 'has_pdf', 'created_at']

    has_pdf = serializers.SerializerMethodField()

    def get_has_pdf(self, obj):
        return bool(obj.pdf_file)


class InvoiceDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    costs = InvoiceCostSerializer(many=True, read_only=True)
    allowance_lines = InvoiceAllowanceSerializer(many=True, read_only=True)
    gratuity_lines = InvoiceGratuitySerializer(many=True, read_only=True)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    credited_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_of_credits = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    unclassified_line_count = serializers.IntegerField(read_only=True)
    has_reverse_charged_lines = serializers.BooleanField(read_only=True)
    is_issued = serializers.BooleanField(read_only=True)
    credit_notes = InvoiceListSerializer(many=True, read_only=True)
    corrects_number = serializers.CharField(
        source='corrects.invoice_number', read_only=True, default=None)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = [
            'invoice_number', 'subtotal', 'total_costs', 'total_allowances',
            'total_gratuities', 'vat_amount', 'total', 'pdf_file',
            'pdf_generated_at', 'sent_at', 'sent_to', 'corrects',
        ]

    def get_pdf_url(self, obj):
        if not obj.pdf_file:
            return None
        from apps.core.media import signed_media_url
        return signed_media_url(obj.pdf_file, self.context.get('request'))


class InvoiceGenerateSerializer(serializers.Serializer):
    """
    Generate an invoice for a week, or for an arbitrary period.

    Give either week_year + week_number, or period_start + period_end. The
    optional project narrows the invoice to one project.
    """

    customer_id = serializers.UUIDField()
    week_year = serializers.IntegerField(
        min_value=2020, max_value=2100, required=False)
    week_number = serializers.IntegerField(
        min_value=1, max_value=53, required=False)
    period_start = serializers.DateField(required=False)
    period_end = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    vat_treatment_code = serializers.CharField(required=False, allow_blank=True)
    is_staff_lending_or_subcontracting = serializers.BooleanField(
        required=False, allow_null=True, default=None)
    is_physical_work_on_immovable_property = serializers.BooleanField(
        required=False, allow_null=True, default=None)

    def validate(self, attrs):
        has_week = attrs.get('week_year') and attrs.get('week_number')
        has_period = attrs.get('period_start') and attrs.get('period_end')
        if has_week == has_period:
            raise serializers.ValidationError(
                'Give either week_year and week_number, or period_start and period_end.')
        if has_period and attrs['period_start'] > attrs['period_end']:
            raise serializers.ValidationError(
                'period_start must not be after period_end.')
        return attrs


class InvoicePreviewSerializer(serializers.Serializer):
    """What would be billed, before anything is created."""

    customer_id = serializers.UUIDField()
    week_year = serializers.IntegerField(min_value=2020, max_value=2100, required=False)
    week_number = serializers.IntegerField(min_value=1, max_value=53, required=False)
    period_start = serializers.DateField(required=False)
    period_end = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False, allow_null=True)

    validate = InvoiceGenerateSerializer.validate


class CreditNoteSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=10)
    line_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True)


class RecordPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    paid_date = serializers.DateField(required=False)


class ManualLineSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    quantity_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    employee_id = serializers.UUIDField(required=False, allow_null=True)
    work_date = serializers.DateField(required=False)


class ProjectRateSerializer(serializers.ModelSerializer):
    margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = ProjectRate
        fields = '__all__'


# =============================================================================
# AGENCY INVOICE SERIALIZERS
# =============================================================================

class AgencyInvoiceLineSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = AgencyInvoiceLine
        fields = [
            'id', 'employee', 'employee_name', 'project', 'project_name',
            'work_entry', 'work_date', 'hours', 'base_rate', 'base_amount',
            'surcharge_percentage', 'surcharge_amount', 'total', 'description',
        ]
    
    def get_employee_name(self, obj):
        return obj.employee.full_name if hasattr(obj.employee, 'full_name') else str(obj.employee)


class AgencyInvoiceListSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    agency_code = serializers.CharField(source='agency.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    line_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AgencyInvoice
        fields = [
            'id', 'invoice_number', 'agency', 'agency_name', 'agency_code',
            'period_start', 'period_end', 'total_hours', 'subtotal',
            'total_surcharges', 'vat_amount', 'total', 'status', 'status_display',
            'amount_due', 'amount_paid', 'issue_date', 'due_date', 'paid_date',
            'line_count', 'created_at',
        ]
    
    def get_line_count(self, obj):
        return obj.lines.count()


class AgencyInvoiceDetailSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    agency_code = serializers.CharField(source='agency.code', read_only=True)
    lines = AgencyInvoiceLineSerializer(many=True, read_only=True)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = AgencyInvoice
        fields = '__all__'


class AgencyInvoiceGenerateSerializer(serializers.Serializer):
    """Serializer for generating an agency invoice from approved work entries."""
    agency_id = serializers.IntegerField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    
    def validate(self, data):
        if data['period_start'] > data['period_end']:
            raise serializers.ValidationError("Period start must be before period end.")
        return data


class AgencyInvoicePaymentSerializer(serializers.Serializer):
    """Serializer for marking an agency invoice as paid."""
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_date = serializers.DateField()
    bank_proof = serializers.FileField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


# =============================================================================
# INCOMING INVOICES
# =============================================================================

class IncomingInvoiceSerializer(serializers.ModelSerializer):
    """Read/write serializer for supplier invoices."""

    agency_name = serializers.CharField(source='agency.name', read_only=True, default=None)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = IncomingInvoice
        fields = [
            'id', 'invoice_number', 'vendor_name', 'vendor_vat_number',
            'agency', 'agency_name', 'description', 'category', 'category_name',
            'invoice_date', 'due_date', 'paid_date',
            'subtotal', 'vat_rate', 'vat_amount', 'total',
            'status', 'document', 'notes',
            'is_overdue', 'days_until_due', 'created_at', 'updated_at',
        ]
        # VAT and total are always derived from subtotal x rate.
        read_only_fields = ['vat_amount', 'total', 'paid_date']
        # Mirrors the DB UniqueConstraint. Without this the constraint surfaced
        # as an IntegrityError (HTTP 500) rather than a 400 the client can show.
        validators = [
            UniqueTogetherValidator(
                queryset=IncomingInvoice.objects.filter(is_deleted=False),
                fields=['vendor_name', 'invoice_number'],
                message='This vendor already has an invoice with that number.',
            )
        ]

    def validate(self, attrs):
        invoice_date = attrs.get('invoice_date', getattr(self.instance, 'invoice_date', None))
        due_date = attrs.get('due_date', getattr(self.instance, 'due_date', None))
        if invoice_date and due_date and due_date < invoice_date:
            raise serializers.ValidationError(
                {'due_date': 'Due date cannot be before the invoice date.'}
            )
        return attrs
