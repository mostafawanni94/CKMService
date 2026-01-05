"""Notification Serializers."""
from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'type_display', 'category', 'category_display',
                  'priority', 'priority_display', 'title', 'message', 'action_url', 
                  'is_read', 'read_at', 'email_sent', 'reference_type', 'reference_id', 'created_at']
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['email_enabled', 'email_digest', 'push_enabled',
                  'whatsapp_enabled', 'whatsapp_number',
                  'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end']
