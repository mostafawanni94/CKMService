"""
Notification models for Pro Totaal Service.

Handles:
- System notifications for all events
- Notification center with history
- Read/unread tracking
"""

from django.db import models

from apps.core.models import BaseModel


# =============================================================================
# NOTIFICATION
# =============================================================================

class Notification(BaseModel):
    """
    System notification for users.
    
    Events that trigger notifications:
    - Credential creation
    - Profile approval/rejection
    - Project assignment
    - Work log approval/rejection
    - Advance request approval/rejection
    - Invoice generation
    """
    
    class Type(models.TextChoices):
        # Account & Profile
        CREDENTIALS_CREATED = 'credentials_created', 'Credentials Created'
        PROFILE_SUBMITTED = 'profile_submitted', 'Profile Submitted'
        PROFILE_APPROVED = 'profile_approved', 'Profile Approved'
        PROFILE_REJECTED = 'profile_rejected', 'Profile Rejected'
        
        # Projects & Assignments
        PROJECT_ASSIGNED = 'project_assigned', 'Project Assigned'
        PROJECT_UNASSIGNED = 'project_unassigned', 'Project Unassigned'
        PROJECT_COMPLETED = 'project_completed', 'Project Completed'
        
        # Work Logs
        WORKLOG_SUBMITTED = 'worklog_submitted', 'Work Log Submitted'
        WORKLOG_APPROVED = 'worklog_approved', 'Work Log Approved'
        WORKLOG_REJECTED = 'worklog_rejected', 'Work Log Rejected'
        
        # Wallet & Advances
        ADVANCE_REQUESTED = 'advance_requested', 'Advance Requested'
        ADVANCE_APPROVED = 'advance_approved', 'Advance Approved'
        ADVANCE_REJECTED = 'advance_rejected', 'Advance Rejected'
        WALLET_UPDATED = 'wallet_updated', 'Wallet Updated'
        
        # Invoices
        INVOICE_GENERATED = 'invoice_generated', 'Invoice Generated'
        INVOICE_SENT = 'invoice_sent', 'Invoice Sent'
        INVOICE_PAID = 'invoice_paid', 'Invoice Paid'
        
        # Certificates
        CERTIFICATE_EXPIRING = 'certificate_expiring', 'Certificate Expiring'
        CERTIFICATE_EXPIRED = 'certificate_expired', 'Certificate Expired'
        
        # General
        SYSTEM = 'system', 'System Notification'
        INFO = 'info', 'Information'
        WARNING = 'warning', 'Warning'
        ALERT = 'alert', 'Alert'
    
    class Category(models.TextChoices):
        """Categories for grouping notifications in the UI."""
        EMPLOYEES = 'employees', 'Employees'
        WORKLOGS = 'worklogs', 'Work Logs'
        CERTIFICATES = 'certificates', 'Certificates'
        INVOICES = 'invoices', 'Invoices'
        PROJECTS = 'projects', 'Projects'
        WALLET = 'wallet', 'Wallet'
        SYSTEM = 'system', 'System'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'
    
    # Recipient
    recipient = models.ForeignKey(
        'employees.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Recipient"
    )
    
    # Notification details
    notification_type = models.CharField(
        max_length=30,
        choices=Type.choices,
        db_index=True,
        verbose_name="Type"
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.SYSTEM,
        db_index=True,
        verbose_name="Category",
        help_text="Category for grouping in UI"
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL,
        verbose_name="Priority"
    )
    
    # Content
    title = models.CharField(
        max_length=200,
        verbose_name="Title"
    )
    message = models.TextField(
        verbose_name="Message"
    )
    
    # Reference to related object
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Reference Type"
    )
    reference_id = models.UUIDField(
        blank=True,
        null=True,
        verbose_name="Reference ID"
    )
    
    # Action URL (for "View" button in UI)
    action_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        verbose_name="Action URL"
    )
    
    # Read status
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Is Read"
    )
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Read At"
    )
    
    # Email/Push sent
    email_sent = models.BooleanField(
        default=False,
        verbose_name="Email Sent"
    )
    push_sent = models.BooleanField(
        default=False,
        verbose_name="Push Sent"
    )
    
    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.recipient}: {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at', 'updated_at'])


# =============================================================================
# NOTIFICATION PREFERENCE
# =============================================================================

class NotificationPreference(models.Model):
    """
    User preferences for notification delivery.
    """
    
    user = models.OneToOneField(
        'employees.User',
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        verbose_name="User"
    )
    
    # Email notifications
    email_enabled = models.BooleanField(
        default=True,
        verbose_name="Email Notifications"
    )
    email_digest = models.BooleanField(
        default=False,
        verbose_name="Daily Email Digest",
        help_text="Send daily digest instead of individual emails"
    )
    
    # Push notifications
    push_enabled = models.BooleanField(
        default=True,
        verbose_name="Push Notifications"
    )
    
    # WhatsApp notifications
    whatsapp_enabled = models.BooleanField(
        default=False,
        verbose_name="WhatsApp Notifications"
    )
    whatsapp_number = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="WhatsApp Number"
    )
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(
        default=False,
        verbose_name="Quiet Hours Enabled"
    )
    quiet_hours_start = models.TimeField(
        blank=True,
        null=True,
        verbose_name="Quiet Hours Start"
    )
    quiet_hours_end = models.TimeField(
        blank=True,
        null=True,
        verbose_name="Quiet Hours End"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
    
    def __str__(self):
        return f"Notification Preferences: {self.user}"
