"""
Certificate models for Pro Totaal Service.

Handles:
- Admin-defined certificate types
- Employee certificate uploads (bridge table)
- VCA Basis/VOL tracking
- OCR support for diploma numbers
"""

from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel


# =============================================================================
# CERTIFICATE TYPE (Admin-defined)
# =============================================================================

class CertificateType(TimeStampedModel):
    """
    Types of certificates, defined by admin.
    Examples: VCA Basis, VCA VOL, Forklift License, etc.
    
    Scalable: Admin can add new certificate types without code changes.
    """
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Certificate Name"
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name="Description"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active"
    )
    is_required = models.BooleanField(
        default=False,
        verbose_name="Is Required",
        help_text="If true, employees must have this certificate"
    )
    has_expiry = models.BooleanField(
        default=True,
        verbose_name="Has Expiry Date",
        help_text="If true, certificate has an expiration date"
    )
    has_diploma_number = models.BooleanField(
        default=True,
        verbose_name="Has Diploma Number",
        help_text="If true, certificate has a diploma/certificate number"
    )
    # OCR field name for automatic extraction
    ocr_field_name = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="OCR Field Name",
        help_text="Field name for OCR extraction (e.g., diploma_number)"
    )
    # Display order
    sort_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Sort Order"
    )
    
    class Meta:
        verbose_name = 'Certificate Type'
        verbose_name_plural = 'Certificate Types'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name


# =============================================================================
# EMPLOYEE CERTIFICATE (Bridge Table)
# =============================================================================

class EmployeeCertificate(BaseModel):
    """
    Bridge table linking employees to certificates.
    
    Structure:
    - employee_id + certificate_type_id + file + extracted_number + expiry
    
    This allows:
    - Multiple certificates per employee
    - Unified interface for different certificate types
    - OCR extraction of diploma numbers
    - Expiry tracking
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Verification'
        VERIFIED = 'verified', 'Verified'
        EXPIRED = 'expired', 'Expired'
        REJECTED = 'rejected', 'Rejected'
    
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='certificates',
        verbose_name="Employee"
    )
    certificate_type = models.ForeignKey(
        CertificateType,
        on_delete=models.PROTECT,
        related_name='employee_certificates',
        verbose_name="Certificate Type"
    )
    
    # Certificate file
    certificate_file = models.FileField(
        upload_to='certificates/',
        verbose_name="Certificate File (Front/PDF)"
    )

    certificate_file_back = models.FileField(
        upload_to='certificates/',
        verbose_name="Certificate File (Back)",
        blank=True,
        null=True
    )
    
    # Diploma/Certificate number (can be OCR extracted)
    diploma_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Diploma Number",
        help_text="Extracted via OCR, employee can manually correct"
    )
    
    # Expiry date (if applicable)
    expiry_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Expiry Date"
    )
    
    # Issue date
    issue_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Issue Date"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Status"
    )
    
    # Admin notes
    admin_notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Admin Notes"
    )
    
    # OCR extraction data (for debugging/auditing)
    ocr_extracted_data = models.JSONField(
        blank=True,
        null=True,
        verbose_name="OCR Extracted Data"
    )
    
    class Meta:
        verbose_name = 'Employee Certificate'
        verbose_name_plural = 'Employee Certificates'
        ordering = ['-created_at']
        unique_together = ['employee', 'certificate_type']  # One cert type per employee
    
    def __str__(self):
        return f"{self.employee} - {self.certificate_type}"
    
    @property
    def is_expired(self):
        """Check if certificate is expired."""
        if not self.expiry_date:
            return False
        return self.expiry_date < timezone.now().date()
    
    @property
    def days_until_expiry(self):
        """Days until certificate expires (negative if expired)."""
        if not self.expiry_date:
            return None
        delta = self.expiry_date - timezone.now().date()
        return delta.days
    
    def save(self, *args, **kwargs):
        """Auto-update status if expired."""
        if self.is_expired and self.status != self.Status.EXPIRED:
            self.status = self.Status.EXPIRED
        super().save(*args, **kwargs)


# =============================================================================
# VCA SPECIFIC TRACKING
# =============================================================================

class VCAInfo(BaseModel):
    """
    VCA-specific information for employees.
    Tracks VCA Basis and VCA VOL status.
    """
    
    employee = models.OneToOneField(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='vca_info',
        verbose_name="Employee"
    )
    
    # VCA Basis
    has_vca_basis = models.BooleanField(
        default=False,
        verbose_name="Has VCA Basis"
    )
    vca_basis_certificate = models.ForeignKey(
        EmployeeCertificate,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='vca_basis_for',
        verbose_name="VCA Basis Certificate"
    )
    
    # VCA VOL (simple checkbox as per requirements)
    has_vca_vol = models.BooleanField(
        default=False,
        verbose_name="Has VCA VOL (V.O.L.)"
    )
    vca_vol_certificate = models.ForeignKey(
        EmployeeCertificate,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='vca_vol_for',
        verbose_name="VCA VOL Certificate"
    )
    
    class Meta:
        verbose_name = 'VCA Information'
        verbose_name_plural = 'VCA Information'
    
    def __str__(self):
        return f"VCA Info - {self.employee}"
