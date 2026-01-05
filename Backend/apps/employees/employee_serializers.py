/// Employee-Specific Serializers - Data Isolation
/// 
/// These serializers hide business details from employees.

from rest_framework import serializers
from apps.projects.models import ProjectAssignment


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for employee view of assignments.
    Shows ONLY location and time - NO client/project business details.
    """
    location_address = serializers.CharField(source='project.address')
    location_city = serializers.CharField(source='project.city')
    date = serializers.DateField(source='date_from')
    date_range = serializers.SerializerMethodField()
    expected_start_time = serializers.TimeField(format='%H:%M')
    expected_end_time = serializers.TimeField(format='%H:%M')
    
    class Meta:
        model = ProjectAssignment
        fields = [
            'id',
            'location_address',
            'location_city', 
            'date',
            'date_range',
            'expected_start_time',
            'expected_end_time',
            'instructions',  # General instructions only
            'status',
        ]
    
    def get_date_range(self, obj):
        if obj.date_from == obj.date_to:
            return None
        return f"{obj.date_from.strftime('%d/%m')} - {obj.date_to.strftime('%d/%m')}"


class NotificationPreferencesSerializer(serializers.Serializer):
    """
    Serializer for employee notification preferences.
    Used by mobile app settings screen.
    """
    push_notifications_enabled = serializers.BooleanField(required=False)
    notify_certificate_expiry = serializers.BooleanField(required=False)
    notify_contract_expiry = serializers.BooleanField(required=False)
    notify_worklog_reminders = serializers.BooleanField(required=False)
    notify_shift_changes = serializers.BooleanField(required=False)
    notify_approvals = serializers.BooleanField(required=False)
    
    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(update_fields=list(validated_data.keys()) + ['updated_at'])
        return instance
