"""
Employee Serializers.

Comprehensive serializers with validation for employee management.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import (
    EmployeeProfile, DocumentType, ContractType, Agency, EmployeeAgencyHistory,
    SurchargeType, AgencySurcharge, AgencyWallet, AgencyTransaction, EmployeeRateHistory,
    EmployeeContractHistory
)

# =============================================================================
# RATE HISTORY SERIALIZER
# =============================================================================

class EmployeeRateHistorySerializer(serializers.ModelSerializer):
    """Serializer for employee hourly rate history."""
    changed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeRateHistory
        fields = ['id', 'hourly_rate', 'effective_from', 'effective_to', 'changed_by', 'changed_by_name', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at', 'changed_by']
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            full_name = obj.changed_by.get_full_name()
            return full_name if full_name else obj.changed_by.email
        return None


# =============================================================================
# CONTRACT HISTORY SERIALIZER
# =============================================================================

class EmployeeContractHistorySerializer(serializers.ModelSerializer):
    """Serializer for employee contract history."""
    uploaded_by_name = serializers.SerializerMethodField()
    contract_document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeContractHistory
        fields = ['id', 'contract_document', 'contract_document_url', 'hourly_rate', 
                  'effective_from', 'effective_to', 'notes', 'uploaded_by', 'uploaded_by_name', 'created_at']
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

User = get_user_model()


# =============================================================================
# USER SERIALIZERS
# =============================================================================

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for admin to create employee accounts."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'password', 'role']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_first_login', 'created_at']
        read_only_fields = ['id', 'email', 'created_at']


class ShareCredentialsSerializer(serializers.Serializer):
    """Serializer for sharing credentials via WhatsApp or Email."""
    
    SHARE_METHOD_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('email', 'Email'),
    ]
    
    method = serializers.ChoiceField(choices=SHARE_METHOD_CHOICES)
    phone_number = serializers.CharField(max_length=20, required=False)
    
    def validate(self, data):
        if data['method'] == 'whatsapp' and not data.get('phone_number'):
            raise serializers.ValidationError({
                'phone_number': 'Phone number is required for WhatsApp sharing.'
            })
        return data


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change (current password required)."""
    
    current_password = serializers.CharField(write_only=True, min_length=1)
    new_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate_new_password(self, value):
        """Validate password strength."""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value
    
    def validate_current_password(self, value):
        """Verify current password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


# =============================================================================
# DOCUMENT TYPE SERIALIZER
# =============================================================================

class DocumentTypeSerializer(serializers.ModelSerializer):
    """Serializer for document types (admin-managed)."""
    
    class Meta:
        model = DocumentType
        fields = ['id', 'name', 'description', 'is_active']


# =============================================================================
# CONTRACT TYPE SERIALIZER
# =============================================================================

class ContractTypeSerializer(serializers.ModelSerializer):
    """Serializer for contract types (admin-managed, NL-specific)."""
    
    class Meta:
        model = ContractType
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'requires_end_date', 'requires_agency', 'default_duration_months',
            'default_hours_type', 'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# SURCHARGE TYPE SERIALIZERS (Admin-managed day payment types)
# =============================================================================

class SurchargeTypeSerializer(serializers.ModelSerializer):
    """Serializer for surcharge types (Weekend, Night Shift, King's Day, Overtime, etc.)."""
    
    class Meta:
        model = SurchargeType
        fields = [
            'id', 'name', 'category', 'description',
            'time_from', 'time_to', 'days_of_week', 'specific_dates',
            'min_hours_threshold',
            'is_active', 'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# ALLOWANCE TYPE SERIALIZERS (Admin-managed per-hour allowances)
# =============================================================================

class AllowanceTypeSerializer(serializers.ModelSerializer):
    """Serializer for allowance types (Toeslag - mask, EPZ, etc.)."""
    
    class Meta:
        from apps.employees.models import AllowanceType
        model = AllowanceType
        fields = [
            'id', 'name', 'code', 'base_price', 'description',
            'is_active', 'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# AGENCY SURCHARGE SERIALIZERS (Agency-specific percentages)
# =============================================================================

class AgencySurchargeSerializer(serializers.ModelSerializer):
    """Serializer for agency-specific surcharge with percentage."""
    
    surcharge_type_name = serializers.CharField(source='surcharge_type.name', read_only=True)
    surcharge_type_category = serializers.CharField(source='surcharge_type.category', read_only=True)
    calculated_rate = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = AgencySurcharge
        fields = [
            'id', 'agency', 'surcharge_type', 'surcharge_type_name', 'surcharge_type_category',
            'percentage', 'is_enabled', 'calculated_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'calculated_rate', 'created_at', 'updated_at']


class AgencySurchargeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating agency surcharges."""
    
    class Meta:
        model = AgencySurcharge
        fields = ['surcharge_type', 'percentage', 'is_enabled']


# =============================================================================
# AGENCY SERIALIZERS
# =============================================================================

class AgencySerializer(serializers.ModelSerializer):
    """Serializer for agencies (admin-managed)."""
    employee_count = serializers.SerializerMethodField()
    surcharges = AgencySurchargeCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'code', 'description', 'is_active', 'is_deleted',
            'base_hourly_rate', 'has_surcharges',
            'employee_count', 'surcharges', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        return obj.current_employees.count()

    def create(self, validated_data):
        surcharges_data = validated_data.pop('surcharges', [])
        agency = Agency.objects.create(**validated_data)
        
        for surcharge_data in surcharges_data:
            AgencySurcharge.objects.create(agency=agency, **surcharge_data)
            
        return agency

    def update(self, instance, validated_data):
        surcharges_data = validated_data.pop('surcharges', None)
        
        # Update standard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update surcharges if provided
        if surcharges_data is not None:
            # Clear existing surcharges and recreate
            # This handles updates, deletions, and additions
            instance.surcharges.all().delete()
            for surcharge_data in surcharges_data:
                AgencySurcharge.objects.create(agency=instance, **surcharge_data)
        
        return instance


class EmployeeAgencyHistorySerializer(serializers.ModelSerializer):
    """Serializer for employee agency history (transfer tracking)."""
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    agency_code = serializers.CharField(source='agency.code', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = EmployeeAgencyHistory
        fields = [
            'id', 'agency', 'agency_name', 'agency_code',
            'start_date', 'end_date', 'notes', 'is_current', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# =============================================================================
# EMPLOYEE PROFILE SERIALIZERS
# =============================================================================

class EmployeeProfileListSerializer(serializers.ModelSerializer):
    """Serializer for employee list view."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = EmployeeProfile
        fields = [
            'id', 'user_email', 'full_name', 'status', 'phone_number',
            'nationality', 'contract_phase', 'contract_start_date', 
            'contract_end_date', 'created_at'
        ]


class EmployeeProfileDetailSerializer(serializers.ModelSerializer):
    """Full serializer for employee profile detail with attachment URLs."""
    
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False, allow_null=True)
    document_type_name = serializers.CharField(source='document_type.name', read_only=True, allow_null=True)
    document_type_id = serializers.IntegerField(source='document_type.id', read_only=True, allow_null=True)
    contract_type_id = serializers.IntegerField(source='contract_type.id', read_only=True, allow_null=True)
    current_agency_id = serializers.IntegerField(source='current_agency.id', read_only=True, allow_null=True)
    full_name = serializers.CharField(read_only=True)
    is_contract_active = serializers.BooleanField(read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    
    # Attachment URLs
    id_document_front_url = serializers.SerializerMethodField()
    id_document_back_url = serializers.SerializerMethodField()
    id_document_pdf_url = serializers.SerializerMethodField()
    drivers_license_front_url = serializers.SerializerMethodField()
    drivers_license_back_url = serializers.SerializerMethodField()
    contract_document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeProfile
        fields = '__all__'
        read_only_fields = [
            'id', 'user', 'submitted_at', 'approved_at', 
            'approved_by', 'created_at', 'updated_at', 'created_by',
            'updated_by', 'deleted_at', 'deleted_by', 'is_deleted'
        ]
    
    def update(self, instance, validated_data):
        """Handle user_email update separately."""
        user_email = validated_data.pop('user_email', None)
        
        if user_email and instance.user:
            # Only admin can change email - check is handled by view permissions
            instance.user.email = user_email
            instance.user.save()
        
        return super().update(instance, validated_data)
    
    def _get_file_url(self, obj, field_name):
        """Helper to get full URL for a file field."""
        file_field = getattr(obj, field_name, None)
        if file_field and hasattr(file_field, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(file_field.url)
            return file_field.url
        return None
    
    def get_id_document_front_url(self, obj):
        return self._get_file_url(obj, 'id_document_front')
    
    def get_id_document_back_url(self, obj):
        return self._get_file_url(obj, 'id_document_back')
    
    def get_id_document_pdf_url(self, obj):
        return self._get_file_url(obj, 'id_document_pdf')
    
    def get_drivers_license_front_url(self, obj):
        return self._get_file_url(obj, 'drivers_license_front')
    
    def get_drivers_license_back_url(self, obj):
        return self._get_file_url(obj, 'drivers_license_back')
    
    def get_contract_document_url(self, obj):
        return self._get_file_url(obj, 'contract_document')


class EmployeeProfileCompletionSerializer(serializers.ModelSerializer):
    """
    Serializer for employee to complete their profile.
    Used during first login mandatory completion.
    """
    # Accept document type as string name (will be converted in update)
    document_type_name = serializers.CharField(
        write_only=True, 
        required=False, 
        allow_blank=True,
    )
    
    # Make image fields optional (will be uploaded separately)
    id_document_front = serializers.ImageField(required=False, allow_null=True)
    id_document_back = serializers.ImageField(required=False, allow_null=True)
    id_document_pdf = serializers.FileField(required=False, allow_null=True)
    drivers_license_front = serializers.ImageField(required=False, allow_null=True)
    drivers_license_back = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = EmployeeProfile
        fields = [
            # Personal Information
            'first_name', 'last_name', 'prefix_name', 'initials',
            'gender', 'date_of_birth', 'birthplace', 'bsn',
            # Document - use document_type_name for input
            'document_type_name', 'document_number', 'document_expiry_date',
            'id_document_front', 'id_document_back', 'id_document_pdf',
            # Contact
            'phone_number', 'address', 'postcode', 'city',
            # Financial
            'iban', 'nationality',
            # Driver
            'has_drivers_license', 'drivers_license_front', 'drivers_license_back',
        ]
        extra_kwargs = {
            'document_number': {'required': False, 'allow_blank': True},
            'document_expiry_date': {'required': False, 'allow_null': True},
            'birthplace': {'required': False, 'allow_blank': True},
            'has_drivers_license': {'required': False},
        }
    
    def update(self, instance, validated_data):
        """Override update to handle document_type_name conversion."""
        # Handle document_type_name -> DocumentType conversion
        document_type_name = validated_data.pop('document_type_name', None)
        if document_type_name:
            from apps.employees.models import DocumentType
            # Format the name nicely
            formatted_name = document_type_name.replace('_', ' ').title()
            # Get or create the document type
            doc_type, _ = DocumentType.objects.get_or_create(
                name__iexact=formatted_name,
                defaults={'name': formatted_name, 'is_active': True}
            )
            instance.document_type = doc_type
        
        # Update other fields
        for attr, value in validated_data.items():
            if value is not None:  # Skip None values to not overwrite existing data
                setattr(instance, attr, value)
        
        instance.save()
        return instance
    
    def validate_bsn(self, value):
        """Validate Dutch BSN number (11-test)."""
        if not value.isdigit() or len(value) != 9:
            raise serializers.ValidationError('BSN must be exactly 9 digits.')
        
        # 11-test validation
        total = 0
        for i, digit in enumerate(value):
            multiplier = 9 - i if i < 8 else -1
            total += int(digit) * multiplier
        
        if total % 11 != 0:
            raise serializers.ValidationError('Invalid BSN number.')
        
        return value
    
    def validate_iban(self, value):
        """Basic IBAN validation."""
        value = value.replace(' ', '').upper()
        if len(value) < 15 or len(value) > 34:
            raise serializers.ValidationError('Invalid IBAN length.')
        if not value[:2].isalpha():
            raise serializers.ValidationError('IBAN must start with country code.')
        return value
    
    def validate(self, data):
        """Ensure profile can be edited."""
        profile = self.instance
        if profile and profile.pk:  # Only check for existing profiles
            allowed_statuses = [
                EmployeeProfile.ProfileStatus.INCOMPLETE,
                EmployeeProfile.ProfileStatus.REJECTED,
            ]
            if profile.status not in allowed_statuses:
                raise serializers.ValidationError('Profile cannot be edited after submission.')
        return data


class EmployeeSubmitSerializer(serializers.Serializer):
    """Serializer for submitting profile for approval."""
    pass  # No additional fields needed


class EmployeeApprovalSerializer(serializers.Serializer):
    """Serializer for admin to approve employee."""
    
    contract_phase = serializers.ChoiceField(choices=EmployeeProfile.ContractPhase.choices)
    contract_start_date = serializers.DateField()
    contract_end_date = serializers.DateField()
    
    def validate(self, data):
        if data['contract_end_date'] <= data['contract_start_date']:
            raise serializers.ValidationError({
                'contract_end_date': 'End date must be after start date.'
            })
        return data


class EmployeeRejectionSerializer(serializers.Serializer):
    """Serializer for admin to reject employee."""
    
    reason = serializers.CharField(min_length=10, max_length=1000)





# =============================================================================
# AGENCY WALLET SERIALIZERS
# =============================================================================

class AgencyWalletSerializer(serializers.ModelSerializer):
    """Serializer for agency wallet."""
    
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    
    class Meta:
        model = AgencyWallet
        fields = ['id', 'agency', 'agency_name', 'balance', 'total_earned', 'created_at', 'updated_at']
        read_only_fields = ['id', 'balance', 'total_earned', 'created_at', 'updated_at']


class AgencyTransactionSerializer(serializers.ModelSerializer):
    """Serializer for agency transactions."""
    
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AgencyTransaction
        fields = [
            'id', 'wallet', 'employee', 'employee_name', 'transaction_type',
            'date', 'hours_worked', 'base_rate', 'base_amount',
            'surcharge_percentage', 'surcharge_amount', 'total_amount',
            'description', 'surcharges_applied', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None


# =============================================================================
# EXTENDED AGENCY SERIALIZER (with billing info)
# =============================================================================

class AgencyDetailSerializer(serializers.ModelSerializer):
    """Full agency detail with billing and surcharges."""
    
    employee_count = serializers.SerializerMethodField()
    surcharges = AgencySurchargeSerializer(many=True, read_only=True)
    wallet = AgencyWalletSerializer(read_only=True)
    current_employees = serializers.SerializerMethodField()
    
    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'code', 'description', 'is_active', 'is_deleted',
            'base_hourly_rate', 'has_surcharges',
            'employee_count', 'surcharges', 'wallet', 'current_employees',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        return obj.current_employees.count()
    
    def get_current_employees(self, obj):
        from .models import EmployeeProfile
        employees = obj.current_employees.all()[:10]  # Limit to 10
        return [
            {
                'id': str(e.id),
                'full_name': e.full_name,
                'status': e.status,
            }
            for e in employees
        ]
