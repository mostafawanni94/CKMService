"""
Customer Serializers.
"""

from rest_framework import serializers

from .models import (
    Customer, CustomerContact, Outfolder, OutfolderContact, 
    Service, CustomerServiceRate, CustomerSurcharge,
    CustomerContractHistory, CustomerServiceRateHistory, CustomerAllowance
)
from apps.employees.models import SurchargeType


class CustomerContactSerializer(serializers.ModelSerializer):
    """Serializer for customer contacts."""
    
    class Meta:
        model = CustomerContact
        fields = ['id', 'contact_type', 'value', 'label', 'is_primary']


class OutfolderContactSerializer(serializers.ModelSerializer):
    """Serializer for outfolder contacts."""
    
    class Meta:
        model = OutfolderContact
        fields = ['id', 'contact_type', 'value', 'label', 'is_primary']


class OutfolderSerializer(serializers.ModelSerializer):
    """Serializer for outfolders/rayon managers."""
    
    contacts = OutfolderContactSerializer(many=True, read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Outfolder
        fields = [
            'id', 'customer', 'company_name', 'first_name', 'last_name',
            'full_name', 'notes', 'is_active', 'contacts', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CustomerListSerializer(serializers.ModelSerializer):
    """Serializer for customer list view."""
    
    outfolders_count = serializers.IntegerField(
        source='outfolders.count',
        read_only=True
    )
    projects_count = serializers.IntegerField(
        source='projects.count',
        read_only=True
    )
    
    class Meta:
        model = Customer
        fields = [
            'id', 'company_name', 'city', 'country', 'is_active',
            'outfolders_count', 'projects_count', 'created_at'
        ]


class RequiredCertificateSerializer(serializers.ModelSerializer):
    """Nested serializer for required certificates in services."""
    class Meta:
        from apps.certificates.models import CertificateType
        model = CertificateType
        fields = ['id', 'name']


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for Services."""
    required_certificates_detail = RequiredCertificateSerializer(
        source='required_certificates',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Service
        fields = ['id', 'name', 'code', 'description', 'is_active', 'required_certificates', 'required_certificates_detail']
    
    def get_fields(self):
        fields = super().get_fields()
        from apps.certificates.models import CertificateType
        fields['required_certificates'] = serializers.PrimaryKeyRelatedField(
            many=True,
            queryset=CertificateType.objects.filter(is_active=True),
            required=False
        )
        return fields


class CustomerServiceRateSerializer(serializers.ModelSerializer):
    """Serializer for Customer Service Rates."""
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = CustomerServiceRate
        fields = ['id', 'customer', 'service', 'service_name', 'price', 'is_active']
        read_only_fields = ['id']


class CustomerSurchargeSerializer(serializers.ModelSerializer):
    """Serializer for Customer Surcharges."""
    surcharge_type_name = serializers.CharField(source='surcharge_type.name', read_only=True)
    surcharge_type_category = serializers.CharField(source='surcharge_type.category', read_only=True)
    
    class Meta:
        model = CustomerSurcharge
        fields = ['id', 'customer', 'surcharge_type', 'surcharge_type_name', 'surcharge_type_category', 'percentage', 'is_enabled']
        read_only_fields = ['id']


class CustomerServiceSurchargeSerializer(serializers.ModelSerializer):
    """Serializer for Customer Service Surcharges."""
    surcharge_type_name = serializers.CharField(source='surcharge_type.name', read_only=True)
    surcharge_type_category = serializers.CharField(source='surcharge_type.category', read_only=True)
    
    class Meta:
        from apps.customers.models import CustomerServiceSurcharge
        model = CustomerServiceSurcharge
        fields = ['id', 'customer', 'surcharge_type', 'surcharge_type_name', 'surcharge_type_category', 'percentage', 'is_enabled']
        read_only_fields = ['id']


class CustomerAllowanceSurchargeSerializer(serializers.ModelSerializer):
    """Serializer for Customer Allowance Surcharges."""
    surcharge_type_name = serializers.CharField(source='surcharge_type.name', read_only=True)
    surcharge_type_category = serializers.CharField(source='surcharge_type.category', read_only=True)
    
    class Meta:
        from apps.customers.models import CustomerAllowanceSurcharge
        model = CustomerAllowanceSurcharge
        fields = ['id', 'customer', 'surcharge_type', 'surcharge_type_name', 'surcharge_type_category', 'percentage', 'is_enabled']
        read_only_fields = ['id']


class CustomerAllowanceSerializer(serializers.ModelSerializer):
    """Serializer for Customer Allowances."""
    allowance_type_name = serializers.CharField(source='allowance_type.name', read_only=True, allow_null=True)
    allowance_type_code = serializers.CharField(source='allowance_type.code', read_only=True, allow_null=True)
    base_price = serializers.DecimalField(source='allowance_type.base_price', read_only=True, max_digits=10, decimal_places=2, allow_null=True)
    effective_price = serializers.DecimalField(read_only=True, max_digits=10, decimal_places=2)
    enabled_surcharges_ids = serializers.PrimaryKeyRelatedField(
        source='enabled_surcharges',
        queryset=SurchargeType.objects.all(),
        many=True,
        required=False
    )
    enabled_surcharges_names = serializers.SerializerMethodField()
    
    class Meta:
        from apps.customers.models import CustomerAllowance
        model = CustomerAllowance
        fields = [
            'id', 'customer', 'allowance_type', 'allowance_type_name', 'allowance_type_code',
            'custom_name', 'custom_code', 'price', 'base_price', 'effective_price', 
            'is_enabled', 'apply_surcharges', 'enabled_surcharges_ids', 'enabled_surcharges_names'
        ]
        read_only_fields = ['id', 'effective_price']
    
    def get_enabled_surcharges_names(self, obj):
        return [s.name for s in obj.enabled_surcharges.all()]


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Serializer for customer detail view."""
    
    contacts = CustomerContactSerializer(many=True, read_only=True)
    outfolders = OutfolderSerializer(many=True, read_only=True)
    service_rates = CustomerServiceRateSerializer(many=True, read_only=True)
    surcharges = CustomerSurchargeSerializer(many=True, read_only=True)
    service_surcharges = CustomerServiceSurchargeSerializer(many=True, read_only=True)
    allowance_surcharges = CustomerAllowanceSurchargeSerializer(many=True, read_only=True)
    allowances = CustomerAllowanceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'is_deleted', 'deleted_at', 'deleted_by'
        ]


# =============================================================================
# CUSTOMER CONTRACT HISTORY SERIALIZER
# =============================================================================

class CustomerContractHistorySerializer(serializers.ModelSerializer):
    """Serializer for customer contract history."""
    uploaded_by_name = serializers.SerializerMethodField()
    contract_document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerContractHistory
        fields = [
            'id', 'contract_document', 'contract_document_url', 
            'effective_from', 'effective_to', 'notes', 'uploaded_by', 'uploaded_by_name', 
            'service_rates_snapshot', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'uploaded_by']


    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            full_name = obj.uploaded_by.get_full_name()
            return full_name if full_name else obj.uploaded_by.email
        return None
    
    def get_contract_document_url(self, obj):
        if obj.contract_document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.contract_document.url)
            return obj.contract_document.url
        return None


# =============================================================================
# CUSTOMER SERVICE RATE HISTORY SERIALIZER
# =============================================================================

class CustomerServiceRateHistorySerializer(serializers.ModelSerializer):
    """Serializer for customer service rate history."""
    changed_by_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = CustomerServiceRateHistory
        fields = [
            'id', 'service', 'service_name', 'price', 
            'effective_from', 'effective_to', 'notes', 'changed_by', 'changed_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'changed_by']
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            full_name = obj.changed_by.get_full_name()
            return full_name if full_name else obj.changed_by.email
        return None


# =============================================================================
# GRATUITY SERIALIZER
# =============================================================================

class GratuitySerializer(serializers.ModelSerializer):
    """Serializer for gratuities (tips)."""
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        from apps.customers.models import Gratuity
        model = Gratuity
        fields = [
            'id', 'customer', 'customer_name', 'employee', 'employee_name',
            'amount', 'date_received', 'date_work_done', 'notes',
            'status', 'paid_to_employee_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_employee_name(self, obj):
        if obj.employee and obj.employee.user:
            return obj.employee.user.get_full_name() or obj.employee.user.email
        return None

