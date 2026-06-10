"""
Core models for Pro Totaal Service.

Provides abstract base classes with common fields and behaviors
that all models inherit from. This ensures consistency and
enables future extensions without schema changes.
"""

import uuid
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides self-updating
    'created_at' and 'updated_at' fields.
    """
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At",
        help_text="Timestamp when this record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At",
        help_text="Timestamp when this record was last updated"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']


class UUIDModel(models.Model):
    """
    Abstract base model that uses UUID as primary key.
    Provides better security and distributed ID generation.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID"
    )

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """Custom QuerySet that filters out soft-deleted records by default."""
    
    def delete(self):
        """Soft delete all records in queryset."""
        return self.update(is_deleted=True, deleted_at=timezone.now())
    
    def hard_delete(self):
        """Permanently delete records."""
        return super().delete()
    
    def alive(self):
        """Return only non-deleted records."""
        return self.filter(is_deleted=False)
    
    def dead(self):
        """Return only deleted records."""
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default."""
    
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()
    
    def all_with_deleted(self):
        """Include soft-deleted records."""
        return SoftDeleteQuerySet(self.model, using=self._db)
    
    def deleted_only(self):
        """Return only soft-deleted records."""
        return SoftDeleteQuerySet(self.model, using=self._db).dead()


class SoftDeleteModel(models.Model):
    """
    Abstract base model for soft delete functionality.
    Records are marked as deleted instead of being removed.
    Essential for audit trails and data recovery.
    """
    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Is Deleted",
        db_index=True,
        help_text="Soft delete flag - records are never truly deleted"
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Deleted At"
    )
    deleted_by = models.ForeignKey(
        'employees.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_deleted',
        verbose_name="Deleted By"
    )

    # Use custom manager
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Fallback to include deleted

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        """Mark record as deleted without removing from database."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])


class AuditModel(models.Model):
    """
    Abstract base model for audit tracking.
    Tracks who created and last modified records.
    """
    created_by = models.ForeignKey(
        'employees.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_created',
        verbose_name="Created By"
    )
    updated_by = models.ForeignKey(
        'employees.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_updated',
        verbose_name="Updated By"
    )

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel, SoftDeleteModel, AuditModel):
    """
    The primary abstract base model that combines:
    - UUID primary key
    - Timestamps (created_at, updated_at)
    - Soft delete (is_deleted, deleted_at, deleted_by)
    - Audit fields (created_by, updated_by)
    
    Use this for all business entities.
    """

    class Meta:
        abstract = True
        ordering = ['-created_at']


class StatusChoices(models.TextChoices):
    """
    Common status choices used across multiple models.
    Extensible for future status additions.
    """
    DRAFT = 'draft', 'Draft'
    PENDING = 'pending', 'Pending'
    ACTIVE = 'active', 'Active'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    SUSPENDED = 'suspended', 'Suspended'
    CLOSED = 'closed', 'Closed'


class SystemConfigManager(models.Manager):
    """Manager for SystemConfig singleton."""

    def get_config(self):
        """Get or create the single config instance."""
        config, _ = self.get_or_create(pk=1)
        return config


class SystemConfig(TimeStampedModel):
    """
    Singleton model for system-wide configuration.
    Only one instance should exist (pk=1).
    """

    class WeekDay(models.TextChoices):
        MONDAY = 'monday', 'Monday'
        SUNDAY = 'sunday', 'Sunday'

    # Company Info
    company_name = models.CharField(max_length=200, default='CKM Services')
    company_emails = models.JSONField(
        default=list,
        blank=True,
        help_text="List of company emails, e.g. [{'label': 'Info', 'email': 'info@company.nl'}]"
    )
    company_phones = models.JSONField(
        default=list,
        blank=True,
        help_text="List of company phone numbers, e.g. [{'label': 'Main', 'number': '+31 20 123 4567'}]"
    )
    company_address = models.TextField(default='Rotterdam, Netherlands')
    
    # Frontend URL for email links
    frontend_url = models.URLField(
        default='http://localhost:3000',
        help_text="Frontend base URL for email links, e.g. https://admin.prototaalservice.nl"
    )

    # Week Configuration (ISO 8601 compliant)
    week_starts_on = models.CharField(
        max_length=10,
        choices=WeekDay.choices,
        default=WeekDay.MONDAY,
        help_text="Day the work week starts on"
    )
    week_start_hour = models.CharField(
        max_length=5,
        default='06:00',
        help_text="Hour the work week starts (HH:MM format)"
    )
    default_break_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Default break duration in minutes"
    )

    # Notification Settings (Dashboard toggles)
    notify_new_employee = models.BooleanField(default=True)
    notify_pending_approvals = models.BooleanField(default=True)
    notify_weekly_summary = models.BooleanField(default=False)
    notify_certificate_expiry = models.BooleanField(default=True)
    certificate_expiry_days = models.PositiveIntegerField(default=30)

    # Email Configuration (Gmail SMTP)
    smtp_enabled = models.BooleanField(
        default=False,
        help_text="Enable email sending via Gmail SMTP"
    )
    smtp_email = models.EmailField(
        blank=True,
        default='',
        help_text="Gmail address for sending emails"
    )
    smtp_password = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Gmail App Password (not regular password)"
    )
    notification_recipients = models.JSONField(
        default=list,
        blank=True,
        help_text="List of emails to receive notifications, e.g. ['admin@company.nl']"
    )
    
    # Email Rules - which categories trigger email
    email_on_employees = models.BooleanField(
        default=True,
        help_text="Send email for employee-related notifications"
    )
    email_on_worklogs = models.BooleanField(
        default=False,
        help_text="Send email for worklog submissions"
    )
    email_on_certificates = models.BooleanField(
        default=True,
        help_text="Send email for certificate expiry warnings"
    )
    email_on_invoices = models.BooleanField(
        default=False,
        help_text="Send email for invoice notifications"
    )
    email_on_high_priority = models.BooleanField(
        default=True,
        help_text="Always send email for high/urgent priority"
    )
    
    # Category-specific email recipients (email routing)
    category_recipients = models.JSONField(
        default=dict,
        blank=True,
        help_text="""Email recipients per category, e.g.:
        {
            'employees': ['hr@company.nl'],
            'worklogs': ['manager@company.nl', 'admin@company.nl'],
            'certificates': ['hr@company.nl'],
            'invoices': ['finance@company.nl'],
            'projects': [],
            'system': ['admin@company.nl']
        }"""
    )
    
    # ==========================================================================
    # FIREBASE PUSH NOTIFICATIONS
    # ==========================================================================
    firebase_enabled = models.BooleanField(
        default=False,
        help_text="Enable Firebase Cloud Messaging for push notifications"
    )
    firebase_server_key = models.TextField(
        blank=True,
        default='',
        help_text="Firebase Server Key from Firebase Console → Project Settings → Cloud Messaging"
    )

    objects = SystemConfigManager()

    class Meta:
        verbose_name = 'System Configuration'
        verbose_name_plural = 'System Configuration'

    def save(self, *args, **kwargs):
        """Ensure only one config instance exists."""
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of config."""
        pass

    def __str__(self):
        return f"System Config (Week starts {self.week_starts_on} {self.week_start_hour})"

