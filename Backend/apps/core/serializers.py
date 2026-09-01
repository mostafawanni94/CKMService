"""
Core serializers for system-wide configuration.
"""

from rest_framework import serializers
from .models import SystemConfig


class SystemConfigSerializer(serializers.ModelSerializer):
    """Serializer for system configuration."""

    class Meta:
        model = SystemConfig
        fields = [
            'company_name',
            'company_emails',
            'company_phones',
            'company_address',
            # Legal identity — required on every invoice under the Wet OB.
            'company_legal_name',
            'company_kvk_number',
            'company_btw_number',
            'company_iban',
            'company_bic',
            'company_postal_code',
            'company_city',
            'company_country',
            'company_website',
            'company_logo',
            # Invoicing
            'invoice_payment_terms_days',
            'invoice_number_prefix',
            'credit_note_number_prefix',
            'invoice_footer_text',
            'invoice_reverse_charge_text',
            'week_starts_on',
            'week_start_hour',
            'default_break_minutes',
            # Dashboard notification toggles
            'notify_new_employee',
            'notify_pending_approvals',
            'notify_weekly_summary',
            'notify_certificate_expiry',
            'certificate_expiry_days',
            # Email configuration
            'smtp_enabled',
            'smtp_email',
            'smtp_password',
            'notification_recipients',
            # Email rules per category
            'email_on_employees',
            'email_on_worklogs',
            'email_on_certificates',
            'email_on_invoices',
            'email_on_high_priority',
            'updated_at',
        ]
        read_only_fields = ['updated_at']
        extra_kwargs = {
            'smtp_password': {'write_only': True}
        }


class SystemConfigPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for system configuration.
    Only exposes non-sensitive settings needed by mobile app.
    """

    class Meta:
        model = SystemConfig
        fields = [
            'week_starts_on',
            'week_start_hour',
            'default_break_minutes',
            'company_name',
            'updated_at',
        ]
        read_only_fields = ['__all__']
