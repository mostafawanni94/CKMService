"""Certificate Serializers."""
from rest_framework import serializers
from .models import CertificateType, EmployeeCertificate, VCAInfo


class CertificateTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateType
        fields = ['id', 'name', 'description', 'is_active', 'is_required',
                  'has_expiry', 'has_diploma_number', 'sort_order']


class EmployeeCertificateSerializer(serializers.ModelSerializer):
    certificate_type_name = serializers.CharField(source='certificate_type.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    
    # Explicitly make these required
    diploma_number = serializers.CharField(required=True)
    expiry_date = serializers.DateField(required=True)
    issue_date = serializers.DateField(required=True) 
    
    class Meta:
        model = EmployeeCertificate
        fields = ['id', 'employee', 'certificate_type', 'certificate_type_name',
                  'certificate_file', 'certificate_file_back', 'diploma_number', 'expiry_date', 'issue_date',
                  'status', 'is_expired', 'days_until_expiry', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


class VCAInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VCAInfo
        fields = ['id', 'employee', 'has_vca_basis', 'vca_basis_certificate',
                  'has_vca_vol', 'vca_vol_certificate']
