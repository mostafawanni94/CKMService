"""Invoice Serializers."""
from decimal import Decimal
from rest_framework import serializers
from .models import (
    Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate,
    InvoiceAllowance, InvoiceGratuity, AgencyInvoice, AgencyInvoiceLine,
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
                  'description', 'quantity_hours', 'hourly_rate', 'total']


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
        fields = ['id', 'invoice_number', 'customer', 'customer_name', 'week_year',
                  'week_number', 'week_start_date', 'week_end_date', 'total',
                  'total_allowances', 'total_gratuities',
                  'status', 'status_display', 'issue_date', 'created_at']


class InvoiceDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    costs = InvoiceCostSerializer(many=True, read_only=True)
    allowance_lines = InvoiceAllowanceSerializer(many=True, read_only=True)
    gratuity_lines = InvoiceGratuitySerializer(many=True, read_only=True)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'


class InvoiceGenerateSerializer(serializers.Serializer):
    customer_id = serializers.UUIDField()
    week_year = serializers.IntegerField(min_value=2020, max_value=2100)
    week_number = serializers.IntegerField(min_value=1, max_value=53)
    
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
