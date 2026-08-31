"""
Employee-specific serializers — data isolation.

These serializers deliberately hide business details from employees: an
assignment exposes where and when, never which customer or what the job is
worth.
"""

from rest_framework import serializers
from apps.projects.models import ProjectAssignment


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    """
    An assignment as the employee sees it: where and when, nothing else.

    Deliberately omits the customer, the project name, rates and any other
    commercial detail — the employee app must not leak who the work is for.

    The field list here had drifted from the models (it referenced
    `project.address`, `date_from`, `expected_start_time` and an `instructions`
    field, none of which exist) and the module carried Dart-style `///`
    comments, so importing it raised SyntaxError. Nothing could call it.
    """

    location_address = serializers.CharField(source='project.location_address', read_only=True)
    location_postcode = serializers.CharField(source='project.location_postcode', read_only=True)
    location_city = serializers.CharField(source='project.location_city', read_only=True)
    location = serializers.CharField(source='project.location', read_only=True)
    date_range = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAssignment
        fields = [
            'id',
            'location',
            'location_address',
            'location_postcode',
            'location_city',
            'start_date',
            'end_date',
            'date_range',
            'role',
            'assignment_type',
            'is_active',
        ]

    def get_date_range(self, obj):
        """A short human label, or None for a single-day assignment."""
        if not obj.start_date:
            return None
        if obj.end_date is None or obj.start_date == obj.end_date:
            return None
        return f"{obj.start_date.strftime('%d/%m')} - {obj.end_date.strftime('%d/%m')}"


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
