"""
Project models for Pro Totaal Service.

Handles:
- Project creation and management
- Employee assignments to projects
- Project status tracking
"""

from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, StatusChoices


# =============================================================================
# PROJECT
# =============================================================================

class Project(BaseModel):
    """
    Project represents a work assignment from a customer.
    
    Created when outfolder requests workers.
    Links to customer, outfolder, and assigned employees.
    """
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ON_HOLD = 'on_hold', 'On Hold'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        CLOSED = 'closed', 'Closed'
    
    # Project Information
    name = models.CharField(
        max_length=200,
        verbose_name="Project Name"
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    # Location
    location = models.CharField(
        max_length=255,
        verbose_name="Project Location"
    )
    location_address = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Full Address"
    )
    location_postcode = models.CharField(
        max_length=10,
        blank=True,
        default='',
        verbose_name="Postcode"
    )
    location_city = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="City"
    )
    
    # Links
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='projects',
        verbose_name="Customer"
    )
    outfolder = models.ForeignKey(
        'customers.Outfolder',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='projects',
        verbose_name="Outfolder (Rayon Manager)"
    )
    
    # Multiple supervisors support
    supervisors = models.ManyToManyField(
        'customers.Outfolder',
        blank=True,
        related_name='assigned_projects',
        verbose_name="Assigned Supervisors"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        verbose_name="Status"
    )
    
    # Dates
    start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Start Date"
    )
    expected_end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Expected End Date"
    )
    actual_end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Actual End Date"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Internal Notes"
    )
    
    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.customer})"
    
    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE
    
    @property
    def active_assignments_count(self):
        return self.assignments.filter(is_active=True).count()


# =============================================================================
# PROJECT ASSIGNMENT
# =============================================================================

class ProjectAssignment(BaseModel):
    """
    Links employees to projects.
    
    - Long-term or temporary assignments
    - Role specification (worker, driver)
    - Certificate requirements tracking
    """
    
    class Role(models.TextChoices):
        WORKER = 'worker', 'Worker'
        DRIVER = 'driver', 'Driver'
        WORKER_DRIVER = 'worker_driver', 'Worker + Driver'
        SUPERVISOR = 'supervisor', 'Supervisor'
    
    class AssignmentType(models.TextChoices):
        LONG_TERM = 'long_term', 'Long Term'
        TEMPORARY = 'temporary', 'Temporary'
        ON_CALL = 'on_call', 'On Call'
    
    # Links
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="Project"
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="Employee"
    )
    
    # Assignment Details
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.WORKER,
        verbose_name="Role"
    )
    assignment_type = models.CharField(
        max_length=20,
        choices=AssignmentType.choices,
        default=AssignmentType.LONG_TERM,
        verbose_name="Assignment Type"
    )
    
    # Dates
    start_date = models.DateField(
        verbose_name="Start Date"
    )
    end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="End Date",
        help_text="Leave empty for ongoing assignments"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    # Exception flag (for compliance overrides)
    is_exception = models.BooleanField(
        default=False,
        verbose_name="Is Exception",
        help_text="True if assigned despite missing requirements"
    )
    exception_reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Exception Reason"
    )
    
    class Meta:
        verbose_name = 'Project Assignment'
        verbose_name_plural = 'Project Assignments'
        ordering = ['-start_date']
        unique_together = ['project', 'employee', 'start_date']
    
    def __str__(self):
        return f"{self.employee} → {self.project} ({self.get_role_display()})"
    
    @property
    def is_current(self):
        """Check if assignment is currently active."""
        today = timezone.now().date()
        if not self.is_active:
            return False
        if self.start_date > today:
            return False
        if self.end_date and self.end_date < today:
            return False
        return True


# =============================================================================
# PROJECT REQUIRED CERTIFICATES
# =============================================================================

class ProjectRequiredCertificate(BaseModel):
    """
    Defines which certificates are required for a project.
    Used for filtering eligible employees.
    """
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='required_certificates',
        verbose_name="Project"
    )
    certificate_type = models.ForeignKey(
        'certificates.CertificateType',
        on_delete=models.PROTECT,
        related_name='required_for_projects',
        verbose_name="Certificate Type"
    )
    is_mandatory = models.BooleanField(
        default=True,
        verbose_name="Is Mandatory",
        help_text="If false, certificate is preferred but not required"
    )
    
    class Meta:
        verbose_name = 'Project Required Certificate'
        verbose_name_plural = 'Project Required Certificates'
        unique_together = ['project', 'certificate_type']
    
    def __str__(self):
        mandatory = "Required" if self.is_mandatory else "Preferred"
        return f"{self.project}: {self.certificate_type} ({mandatory})"


# =============================================================================
# PROJECT SHIFT TEMPLATE
# =============================================================================

class ProjectShiftTemplate(BaseModel):
    """
    Defines shift patterns for a project.
    
    Example: Morning Shift (09:00-17:00), Night Shift (22:00-06:00)
    These are reusable templates that can be assigned to multiple days.
    """
    
    # Default colors for shifts
    COLOR_CHOICES = [
        ('#10B981', 'Green'),
        ('#3B82F6', 'Blue'),
        ('#F59E0B', 'Amber'),
        ('#EF4444', 'Red'),
        ('#8B5CF6', 'Purple'),
        ('#EC4899', 'Pink'),
        ('#06B6D4', 'Cyan'),
        ('#84CC16', 'Lime'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='shift_templates',
        verbose_name="Project"
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Shift Name",
        help_text="e.g., Morning Shift, Night Shift"
    )
    start_time = models.TimeField(
        verbose_name="Start Time"
    )
    end_time = models.TimeField(
        verbose_name="End Time"
    )
    color = models.CharField(
        max_length=7,
        default='#10B981',
        verbose_name="Color",
        help_text="Hex color code for calendar display"
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name="Description"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active"
    )
    
    class Meta:
        verbose_name = 'Shift Template'
        verbose_name_plural = 'Shift Templates'
        ordering = ['start_time']
    
    def __str__(self):
        return f"{self.project.name} - {self.name} ({self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')})"


# =============================================================================
# PROJECT PLANNED DAY
# =============================================================================

class ProjectPlannedDay(BaseModel):
    """
    A specific date assigned to a shift template.
    
    This represents "On January 15th, we need workers for Morning Shift".
    Employees are assigned through ShiftAssignment.
    """
    
    shift_template = models.ForeignKey(
        ProjectShiftTemplate,
        on_delete=models.CASCADE,
        related_name='planned_days',
        verbose_name="Shift Template"
    )
    date = models.DateField(
        verbose_name="Date",
        db_index=True
    )
    supervisor = models.ForeignKey(
        'customers.Outfolder',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='supervised_planned_days',
        verbose_name="Supervisor",
        help_text="Supervisor responsible for this day"
    )
    required_workers = models.PositiveIntegerField(
        default=1,
        verbose_name="Required Workers",
        help_text="Number of workers needed for this day"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    class Meta:
        verbose_name = 'Planned Day'
        verbose_name_plural = 'Planned Days'
        ordering = ['date']
        unique_together = ['shift_template', 'date']
    
    def __str__(self):
        return f"{self.shift_template.name} - {self.date}"
    
    @property
    def project(self):
        return self.shift_template.project
    
    @property
    def assigned_count(self):
        return self.assignments.filter(status='confirmed').count()
    
    @property
    def is_fully_staffed(self):
        return self.assigned_count >= self.required_workers


# =============================================================================
# SHIFT ASSIGNMENT
# =============================================================================

class ShiftAssignment(BaseModel):
    """
    Assigns an employee to a planned day.
    
    Supports both internal employees and agency workers.
    Tracks assignment status and history.
    """
    
    class Status(models.TextChoices):
        PLANNED = 'planned', 'Planned'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        NO_SHOW = 'no_show', 'No Show'
        COMPLETED = 'completed', 'Completed'
    
    planned_day = models.ForeignKey(
        ProjectPlannedDay,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="Planned Day"
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='shift_assignments',
        verbose_name="Employee"
    )
    agency = models.ForeignKey(
        'employees.Agency',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='shift_assignments',
        verbose_name="Agency",
        help_text="If employee is from an external agency"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
        db_index=True,
        verbose_name="Status"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    # Tracking
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Confirmed At"
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled At"
    )
    cancellation_reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Cancellation Reason"
    )
    
    class Meta:
        verbose_name = 'Shift Assignment'
        verbose_name_plural = 'Shift Assignments'
        ordering = ['planned_day__date']
        unique_together = ['planned_day', 'employee']
    
    def __str__(self):
        return f"{self.employee} - {self.planned_day}"
    
    def confirm(self):
        """Mark assignment as confirmed."""
        from django.utils import timezone
        self.status = self.Status.CONFIRMED
        self.confirmed_at = timezone.now()
        self.save()
    
    def cancel(self, reason=''):
        """Cancel the assignment."""
        from django.utils import timezone
        self.status = self.Status.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save()
