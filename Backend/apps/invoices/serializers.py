"""Invoice Serializers."""
from decimal import Decimal
from rest_framework import serializers
from .models import Invoice, InvoiceLine, InvoiceCost, CostType, ProjectRate, InvoiceAllowance, InvoiceGratuity


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

