"""
Invoice models for CKM Services.

Handles:
- Weekly invoice generation
- Line items per project/employee
- Cost tracking (transport, clothes, extras)
- Margin calculation
"""

from decimal import Decimal

from django.db import models

from apps.core.models import BaseModel, TimeStampedModel


# =============================================================================
# DOCUMENT NUMBERING
# =============================================================================

class DocumentSeries(models.TextChoices):
    INVOICE = 'invoice', 'Invoice'
    CREDIT_NOTE = 'credit_note', 'Credit note'


class InvoiceSequence(TimeStampedModel):
    """The last number issued in one series, for one year."""

    series = models.CharField(max_length=20, choices=DocumentSeries.choices)
    year = models.PositiveIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Invoice sequence'
        verbose_name_plural = 'Invoice sequences'
        constraints = [
            models.UniqueConstraint(fields=['series', 'year'],
                                    name='unique_sequence_per_series_year'),
        ]
        ordering = ['-year', 'series']

    def __str__(self):
        return f'{self.get_series_display()} {self.year}: {self.last_number}'



# =============================================================================
# COST TYPE (Admin-defined, Extensible)
# =============================================================================

from apps.vat.mixins import VatClassifiableMixin

class CostType(models.Model):
    """
    Admin-defined cost types for flexible cost tracking.
    Examples: Transport, Work Clothes, Equipment, etc.
    
    Extensible: Admin can add new cost types without code changes.
    """
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Cost Type Name"
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name="Description"
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Code",
        help_text="Short code for invoicing (e.g., TRANS, CLOTH)"
    )
    default_unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Default Unit Price"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active"
    )
    
    # Billing options
    is_billable_to_customer = models.BooleanField(
        default=True,
        verbose_name="Billable to Customer"
    )
    is_deductible_from_employee = models.BooleanField(
        default=False,
        verbose_name="Deductible from Employee"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cost Type'
        verbose_name_plural = 'Cost Types'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


# =============================================================================
# INVOICE
# =============================================================================

class Invoice(VatClassifiableMixin, BaseModel):
    """
    Weekly invoice for a customer.
    
    Week definition: Monday 06:00 → Sunday 06:00
    Generated from approved work logs.
    """
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Review'
        SENT = 'sent', 'Sent'
        PAID = 'paid', 'Paid'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        OVERDUE = 'overdue', 'Overdue'
        CANCELLED = 'cancelled', 'Cancelled'

    class DocumentType(models.TextChoices):
        INVOICE = 'invoice', 'Invoice'
        CREDIT_NOTE = 'credit_note', 'Credit note'

    class BillingMode(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        PERIOD = 'period', 'Period'

    # Statuses at which the document has left the building. Past this point the
    # figures are the customer's copy and are never edited in place.
    ISSUED_STATUSES = ('sent', 'paid', 'partially_paid', 'overdue')

    # Invoice number
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Invoice Number"
    )

    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.INVOICE,
        db_index=True,
        verbose_name="Document type",
    )
    billing_mode = models.CharField(
        max_length=10,
        choices=BillingMode.choices,
        default=BillingMode.WEEKLY,
        verbose_name="Billing mode",
        help_text="Weekly invoices are one per customer per week; period "
                  "invoices cover an arbitrary date range.",
    )
    # A credit note points at what it corrects. The original is never altered.
    corrects = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='credit_notes',
        verbose_name="Corrects",
    )
    correction_reason = models.TextField(
        blank=True, default='',
        verbose_name="Reason for correction",
    )
    
    # Customer
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name="Customer"
    )
    
    # Week period
    week_year = models.PositiveIntegerField(
        verbose_name="Year"
    )
    week_number = models.PositiveIntegerField(
        verbose_name="Week Number"
    )
    week_start_date = models.DateField(
        verbose_name="Week Start Date"
    )
    week_end_date = models.DateField(
        verbose_name="Week End Date"
    )

    # Explicit service period. Equal to the week for a weekly invoice; an
    # arbitrary range for a period invoice. Printed on the document, because a
    # Dutch invoice must state when the service was supplied.
    period_start = models.DateField(
        null=True, blank=True, verbose_name="Period start")
    period_end = models.DateField(
        null=True, blank=True, verbose_name="Period end")
    # Optional narrowing: an invoice for one project rather than the customer's
    # whole week.
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Project",
    )

    # Totals
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Subtotal"
    )
    total_costs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Costs"
    )
    total_allowances = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Allowances"
    )
    total_gratuities = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Gratuities"
    )
    vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('21.00'),
        verbose_name="VAT Rate (%)"
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="VAT Amount"
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total"
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
    issue_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Issue Date"
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Due Date"
    )
    paid_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Paid Date"
    )
    
    # Payment
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Amount Paid"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    internal_notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Internal Notes"
    )

    # --- The issued document -------------------------------------------------
    # Rendered once, when the invoice is issued, and never regenerated: the
    # customer's copy and ours must be the same file.
    pdf_file = models.FileField(
        upload_to='invoices/%Y/', blank=True, null=True,
        verbose_name="PDF")
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_to = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-week_year', '-week_number']
        constraints = [
            # One weekly invoice per customer per week — but a cancelled or
            # deleted one must not block a replacement, and a credit note is a
            # separate document that may share the week.
            models.UniqueConstraint(
                fields=['customer', 'week_year', 'week_number'],
                condition=models.Q(document_type='invoice', billing_mode='weekly',
                                   is_deleted=False) & ~models.Q(status='cancelled'),
                name='unique_active_weekly_invoice_per_customer',
            ),
        ]
        indexes = [
            models.Index(fields=['document_type', 'status'],
                         name='invoice_type_status_idx'),
            models.Index(fields=['customer', '-issue_date'],
                         name='invoice_customer_date_idx'),
            models.Index(fields=['period_start', 'period_end'],
                         name='invoice_period_idx'),
        ]
    
    def __str__(self):
        return f"{self.invoice_number} - {self.customer}"
    
    @property
    def amount_due(self):
        return self.total - self.amount_paid
    
    def calculate_totals(self):
        """
        Recalculate the totals from the line items.

        VAT is summed from the lines, because reverse charge is decided per
        service: CKM can clean an office at 21% and lend a worker for covered
        work on the same invoice. `vat_rate` on the invoice is a display
        default only — it is never the arithmetic. Lines that have not been
        classified contribute no VAT and are reported separately, so an
        unclassified line shows up as a hole rather than as 21%.
        """
        from django.db.models import Sum

        lines = self.lines.filter(is_deleted=False)

        labor_total = lines.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        cost_total = self.costs.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        allowance_total = self.allowance_lines.aggregate(
            total=Sum('total'))['total'] or Decimal('0.00')
        gratuity_total = self.gratuity_lines.aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')

        self.subtotal = labor_total
        self.total_costs = cost_total
        self.total_allowances = allowance_total
        self.total_gratuities = gratuity_total

        classified = lines.exclude(vat_amount=None)
        line_vat = classified.aggregate(total=Sum('vat_amount'))['total']

        if line_vat is not None and classified.count() == lines.count() and lines.exists():
            # Every labour line is classified: the lines are the truth.
            # Costs and allowances follow the invoice's own rate, which is the
            # rate the customer agreed for extras.
            extras_taxable = self.total_costs + self.total_allowances
            self.vat_amount = (
                line_vat + (extras_taxable * self.vat_rate / 100)
            ).quantize(Decimal('0.01'))
        else:
            # Legacy or partially classified: fall back to the invoice rate so
            # historical invoices keep the totals they were issued with.
            taxable = self.subtotal + self.total_allowances
            self.vat_amount = (taxable * self.vat_rate / 100).quantize(Decimal('0.01'))

        self.total = (self.subtotal + self.total_costs + self.total_allowances
                      + self.total_gratuities + self.vat_amount)

        self.save(update_fields=[
            'subtotal', 'total_costs', 'total_allowances', 'total_gratuities',
            'vat_amount', 'total', 'updated_at'
        ])

    @property
    def is_issued(self):
        """Has this document been given to the customer?"""
        return self.status in self.ISSUED_STATUSES

    @property
    def is_credit_note(self):
        return self.document_type == self.DocumentType.CREDIT_NOTE

    @property
    def credited_total(self):
        """How much of this invoice has been credited back."""
        from django.db.models import Sum

        return abs(self.credit_notes.filter(is_deleted=False).exclude(
            status=self.Status.CANCELLED
        ).aggregate(total=Sum('total'))['total'] or Decimal('0.00'))

    @property
    def net_of_credits(self):
        """What the customer actually owes once credit notes are applied."""
        return self.total - self.credited_total

    @property
    def unclassified_line_count(self):
        """Labour lines whose VAT treatment nobody has established."""
        return self.lines.filter(is_deleted=False).exclude(
            vat_classification_status='CLASSIFIED').count()

    @property
    def has_reverse_charged_lines(self):
        return self.lines.filter(
            is_deleted=False, vat_return_box='1e').exists()


# =============================================================================
# INVOICE LINE (Labor Hours)
# =============================================================================

class InvoiceLine(VatClassifiableMixin, BaseModel):
    """
    Invoice line item - represents billable hours.
    
    One line per project/employee combination.
    """
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name="Invoice"
    )
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        related_name='invoice_lines',
        verbose_name="Project"
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.PROTECT,
        related_name='invoice_lines',
        verbose_name="Employee"
    )
    
    # Description
    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    # Hours and rate
    quantity_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Hours"
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Hourly Rate (€)"
    )
    
    # Total
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total"
    )

    # ── VAT, per line ──────────────────────────────────────────────────────
    # Reverse charge is decided per service, not per invoice: CKM can bill a
    # customer for ordinary cleaning at 21% and lend them a worker for covered
    # physical work on the same invoice. A single invoice-level rate cannot
    # express that, so treatment lives here.
    vat_treatment_code = models.CharField(
        max_length=30,
        default='UNKNOWN',
        verbose_name="VAT treatment",
        help_text="Defaults to UNKNOWN. A line is never assumed to be 21%.",
    )
    price_mode = models.CharField(
        max_length=20,
        default='EXCLUDING_VAT',
        verbose_name="Price mode",
        help_text="Whether `total` includes VAT. Stated, never inferred.",
    )
    vat_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name="VAT rate (%)",
        help_text="Derived from the treatment; null until classified.",
    )
    net_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    vat_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    gross_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    vat_return_box = models.CharField(max_length=4, blank=True, default='')
    vat_classification_status = models.CharField(
        max_length=20, default='REQUIRES_REVIEW', db_index=True,
        verbose_name="VAT classification status",
    )
    vat_review_reason = models.TextField(blank=True, default='')

    # Traceability back to the work that produced the line.
    work_entry = models.ForeignKey(
        'worklogs.WorkEntry',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoice_lines',
        verbose_name="Work entry",
    )

    class LineType(models.TextChoices):
        SERVICE = 'service', 'Service'
        CREDIT = 'credit', 'Credit'
        MANUAL = 'manual', 'Manual'

    line_type = models.CharField(
        max_length=10,
        choices=LineType.choices,
        default=LineType.SERVICE,
        verbose_name="Line type",
    )
    work_date = models.DateField(
        null=True, blank=True,
        verbose_name="Work date",
        help_text="The day the work was done; drives the sort order on the PDF.")
    # What the customer is being charged for, in the customer's terms: the
    # hours at plain rate plus each surcharge that applied. Frozen at billing
    # time so a later change to a surcharge cannot rewrite an issued invoice.
    surcharge_breakdown = models.JSONField(
        default=list, blank=True,
        verbose_name="Surcharge breakdown")
    base_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Base amount",
        help_text="Hours at the plain rate, before surcharges and allowances.")
    surcharge_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        verbose_name="Surcharge amount")
    allowance_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        verbose_name="Allowance amount")
    # Set when the line's `total` was supplied rather than derived from
    # hours x rate — a credit line, or a fixed-price item.
    total_is_explicit = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Invoice Line'
        verbose_name_plural = 'Invoice Lines'
        ordering = ['work_date', 'created_at']
        constraints = [
            # A work entry is billed to the customer exactly once. Credit lines
            # reference the same entry deliberately, so they are excluded.
            models.UniqueConstraint(
                fields=['work_entry'],
                condition=models.Q(line_type='service', is_deleted=False,
                                   work_entry__isnull=False),
                name='unique_billed_work_entry',
            ),
        ]
        indexes = [
            models.Index(fields=['invoice', 'work_date'], name='line_invoice_date_idx'),
            models.Index(fields=['work_entry'], name='line_work_entry_idx'),
        ]
    
    def __str__(self):
        return f"{self.invoice}: {self.employee} - {self.quantity_hours}h"
    
    def save(self, *args, **kwargs):
        """
        Derive the total from hours x rate, unless it was stated explicitly.

        A billed line carries surcharges and allowances that hours x rate does
        not express, and a credit line carries a negative amount that is not a
        product of hours at all. Recomputing those would silently change money.
        """
        if not self.total_is_explicit:
            self.total = (self.quantity_hours * self.hourly_rate).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


# =============================================================================
# INVOICE COST (Transport, Clothes, Extras)
# =============================================================================

class InvoiceCost(BaseModel):
    """
    Additional costs added to invoice.
    
    Examples: Transport, Work Clothes, Equipment rental
    """
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name="Invoice"
    )
    
    cost_type = models.ForeignKey(
        CostType,
        on_delete=models.PROTECT,
        related_name='invoice_costs',
        verbose_name="Cost Type"
    )
    
    # Optional links
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='invoice_costs',
        verbose_name="Project"
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='invoice_costs',
        verbose_name="Employee"
    )
    
    # Description
    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    # Quantity and price
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        verbose_name="Quantity"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Unit Price (€)"
    )
    
    # Total
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total"
    )
    
    class Meta:
        verbose_name = 'Invoice Cost'
        verbose_name_plural = 'Invoice Costs'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.invoice}: {self.cost_type} - €{self.total}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate total."""
        self.total = (self.quantity * self.unit_price).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


# =============================================================================
# INVOICE ALLOWANCE (Toeslag hours per employee)
# =============================================================================

class InvoiceAllowance(BaseModel):
    """
    Allowance line items on invoice.
    
    Represents billable allowance hours (e.g., mask hours, hazard pay).
    """
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='allowance_lines',
        verbose_name="Invoice"
    )
    
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.PROTECT,
        related_name='invoice_allowances',
        verbose_name="Employee"
    )
    
    allowance_type = models.ForeignKey(
        'employees.AllowanceType',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name='invoice_allowances',
        verbose_name="Allowance Type"
    )
    
    # For custom allowances that aren't type-based
    custom_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Custom Allowance Name"
    )
    
    # Description
    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    # Hours and rate
    quantity_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Hours"
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Hourly Rate (€)"
    )
    
    # Total
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total"
    )
    
    class Meta:
        verbose_name = 'Invoice Allowance'
        verbose_name_plural = 'Invoice Allowances'
        ordering = ['created_at']
    
    def __str__(self):
        name = self.allowance_type.name if self.allowance_type else self.custom_name
        return f"{self.invoice}: {name} - {self.quantity_hours}h"
    
    @property
    def allowance_name(self):
        return self.allowance_type.name if self.allowance_type else self.custom_name
    
    def save(self, *args, **kwargs):
        """Auto-calculate total."""
        self.total = (self.quantity_hours * self.hourly_rate).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


# =============================================================================
# INVOICE GRATUITY (Fooi - Tips)
# =============================================================================

class InvoiceGratuity(BaseModel):
    """
    Gratuity line items on invoice.
    
    References the original Gratuity record for tracking.
    """
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='gratuity_lines',
        verbose_name="Invoice"
    )
    
    gratuity = models.ForeignKey(
        'customers.Gratuity',
        on_delete=models.PROTECT,
        related_name='invoice_entries',
        verbose_name="Gratuity"
    )
    
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.PROTECT,
        related_name='invoice_gratuities',
        verbose_name="Employee"
    )
    
    # Description
    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    # Amount
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Amount (€)"
    )
    
    class Meta:
        verbose_name = 'Invoice Gratuity'
        verbose_name_plural = 'Invoice Gratuities'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.invoice}: Gratuity for {self.employee} - €{self.amount}"


# =============================================================================
# PROJECT RATE (Customer-specific rates)
# =============================================================================

class ProjectRate(BaseModel):
    """
    Hourly rates for billing - can be per project or per customer.
    
    Allows different rates for different roles/projects.
    """
    
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='rates',
        verbose_name="Project"
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='rates',
        verbose_name="Customer"
    )
    
    # Role-based rates
    role = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="Role",
        help_text="Leave empty for default rate"
    )
    
    # Rates
    employee_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Employee Rate (€/hour)",
        help_text="What we pay the employee"
    )
    customer_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Customer Rate (€/hour)",
        help_text="What we charge the customer"
    )
    
    # Effective dates
    effective_from = models.DateField(
        verbose_name="Effective From"
    )
    effective_until = models.DateField(
        blank=True,
        null=True,
        verbose_name="Effective Until"
    )
    
    class Meta:
        verbose_name = 'Project Rate'
        verbose_name_plural = 'Project Rates'
        ordering = ['-effective_from']
    
    def __str__(self):
        target = self.project or self.customer
        return f"Rate for {target}: €{self.customer_rate}"
    
    @property
    def margin(self):
        """Calculate margin per hour."""
        return self.customer_rate - self.employee_rate
    
    @property
    def margin_percentage(self):
        """Calculate margin percentage."""
        if self.customer_rate == 0:
            return Decimal('0.00')
        return ((self.customer_rate - self.employee_rate) / self.customer_rate * 100).quantize(Decimal('0.01'))


# =============================================================================
# AGENCY INVOICE
# =============================================================================

class AgencyInvoice(VatClassifiableMixin, BaseModel):
    """
    Invoice for an agency — tracks what CKM owes to the agency
    for their employees' work during a specific period.
    
    Payment tracking:
        - When generated, status is DRAFT
        - Admin reviews and sends → SENT
        - When paid, admin uploads bank proof → PAID
        - Work entries linked to a paid invoice cannot be re-invoiced
    """
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Review'
        SENT = 'sent', 'Sent to Agency'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        CANCELLED = 'cancelled', 'Cancelled'
    
    # Invoice number
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Invoice Number",
        help_text="Auto-generated: AG-YYYY-NNNN"
    )
    
    # Agency
    agency = models.ForeignKey(
        'employees.Agency',
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name="Agency"
    )
    
    # Period
    period_start = models.DateField(
        verbose_name="Period Start",
        help_text="First day of the billing period"
    )
    period_end = models.DateField(
        verbose_name="Period End",
        help_text="Last day of the billing period"
    )
    
    # Totals
    total_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Hours"
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Subtotal (excl. VAT)"
    )
    total_surcharges = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Surcharges"
    )
    vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('21.00'),
        verbose_name="VAT Rate (%)"
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="VAT Amount"
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total (incl. VAT)"
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
    issue_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Issue Date"
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Due Date"
    )
    paid_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Paid Date"
    )
    
    # Payment tracking
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Amount Paid"
    )
    bank_proof = models.FileField(
        upload_to='agency_invoices/bank_proofs/',
        blank=True,
        null=True,
        verbose_name="Bank Payment Proof",
        help_text="Upload bank transfer confirmation when marking as paid"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    internal_notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Internal Notes"
    )
    
    class Meta:
        verbose_name = 'Agency Invoice'
        verbose_name_plural = 'Agency Invoices'
        ordering = ['-period_start']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.agency.name}"
    
    @property
    def amount_due(self):
        return self.total - self.amount_paid
    
    @property
    def is_fully_paid(self):
        return self.amount_paid >= self.total
    
    def calculate_totals(self):
        """Recalculate all totals from line items."""
        from django.db.models import Sum
        
        agg = self.lines.aggregate(
            total_hours=Sum('hours'),
            total_base=Sum('base_amount'),
            total_surcharge=Sum('surcharge_amount'),
            total_line=Sum('total'),
        )
        
        self.total_hours = agg['total_hours'] or Decimal('0.00')
        self.subtotal = agg['total_base'] or Decimal('0.00')
        self.total_surcharges = agg['total_surcharge'] or Decimal('0.00')
        
        taxable = self.subtotal + self.total_surcharges
        self.vat_amount = (taxable * self.vat_rate / 100).quantize(Decimal('0.01'))
        self.total = taxable + self.vat_amount
        
        self.save(update_fields=[
            'total_hours', 'subtotal', 'total_surcharges',
            'vat_amount', 'total', 'updated_at'
        ])


# =============================================================================
# AGENCY INVOICE LINE
# =============================================================================

class AgencyInvoiceLine(BaseModel):
    """
    Line item on an agency invoice.
    
    Each line links to a specific WorkEntry to prevent double-billing.
    Once a WorkEntry is linked to an AgencyInvoiceLine, it cannot
    be included in another agency invoice.
    """
    
    invoice = models.ForeignKey(
        AgencyInvoice,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name="Agency Invoice"
    )
    
    # Links
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.PROTECT,
        related_name='agency_invoice_lines',
        verbose_name="Employee"
    )
    work_entry = models.OneToOneField(
        'worklogs.WorkEntry',
        on_delete=models.PROTECT,
        related_name='agency_invoice_line',
        verbose_name="Work Entry",
        help_text="Each work entry can only appear on one agency invoice (prevents double-billing)"
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        related_name='agency_invoice_lines',
        verbose_name="Project"
    )
    
    # Work details
    work_date = models.DateField(verbose_name="Work Date")
    hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Hours Worked"
    )
    
    # Billing
    base_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Base Rate (€/hr)",
        help_text="Agency's base hourly rate at time of invoicing"
    )
    base_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Base Amount (€)"
    )
    surcharge_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Surcharge (%)"
    )
    surcharge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Surcharge Amount (€)"
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Line Total (€)"
    )
    
    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Description"
    )
    
    class Meta:
        verbose_name = 'Agency Invoice Line'
        verbose_name_plural = 'Agency Invoice Lines'
        ordering = ['work_date', 'employee']
    
    def __str__(self):
        return f"{self.invoice}: {self.employee} - {self.work_date} ({self.hours}h)"
    
    def save(self, *args, **kwargs):
        """Auto-calculate totals."""
        self.base_amount = (self.hours * self.base_rate).quantize(Decimal('0.01'))
        self.surcharge_amount = (self.base_amount * self.surcharge_percentage / 100).quantize(Decimal('0.01'))
        self.total = self.base_amount + self.surcharge_amount
        super().save(*args, **kwargs)



# =============================================================================
# INCOMING (SUPPLIER / PURCHASE) INVOICES
# =============================================================================

class IncomingInvoice(VatClassifiableMixin, BaseModel):
    """
    An invoice *received* from a supplier or subcontractor.

    Distinct from ``apps.expenses.Expense``: an expense is money already spent
    and booked, whereas an incoming invoice is a payable with its own document
    number, due date and payment lifecycle. Marking one paid can optionally
    book a matching Expense so the finance overview stays complete.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Payment'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        DISPUTED = 'disputed', 'Disputed'
        CANCELLED = 'cancelled', 'Cancelled'

    invoice_number = models.CharField(
        max_length=100,
        verbose_name="Invoice Number",
        help_text="The number as printed on the supplier's invoice.",
    )
    vendor_name = models.CharField(max_length=200, verbose_name="Vendor Name")
    vendor_vat_number = models.CharField(
        max_length=50, blank=True, default='', verbose_name="Vendor VAT Number"
    )
    agency = models.ForeignKey(
        'employees.Agency',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='incoming_invoices',
        verbose_name="Agency",
        help_text="Set when the supplier is one of the employment agencies.",
    )

    description = models.TextField(blank=True, default='', verbose_name="Description")
    category = models.ForeignKey(
        'expenses.ExpenseCategory',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='incoming_invoices',
        verbose_name="Category",
    )

    invoice_date = models.DateField(verbose_name="Invoice Date")
    due_date = models.DateField(null=True, blank=True, verbose_name="Due Date")
    paid_date = models.DateField(null=True, blank=True, verbose_name="Paid Date")

    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal"
    )
    vat_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('21.00'), verbose_name="VAT Rate (%)"
    )
    vat_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="VAT Amount"
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Total"
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
        db_index=True, verbose_name="Status",
    )
    document = models.FileField(
        upload_to='incoming_invoices/%Y/%m/',
        null=True, blank=True,
        verbose_name="Document",
        help_text="Scan or PDF of the received invoice.",
    )
    notes = models.TextField(blank=True, default='', verbose_name="Notes")

    class Meta:
        verbose_name = 'Incoming Invoice'
        verbose_name_plural = 'Incoming Invoices'
        ordering = ['-invoice_date', '-created_at']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['vendor_name']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['vendor_name', 'invoice_number'],
                condition=models.Q(is_deleted=False),
                name='invoices_incominginvoice_unique_per_vendor',
            ),
        ]

    def __str__(self):
        return f"{self.vendor_name} — {self.invoice_number}"

    @property
    def is_overdue(self):
        from django.utils import timezone
        return bool(
            self.due_date
            and self.status in (self.Status.PENDING, self.Status.OVERDUE)
            and self.due_date < timezone.localdate()
        )

    @property
    def days_until_due(self):
        from django.utils import timezone
        if not self.due_date:
            return None
        return (self.due_date - timezone.localdate()).days

    def recalculate_totals(self):
        """Derive VAT and total from subtotal and rate."""
        self.vat_amount = (self.subtotal * self.vat_rate / Decimal('100')).quantize(Decimal('0.01'))
        self.total = self.subtotal + self.vat_amount
        return self

    def save(self, *args, **kwargs):
        self.recalculate_totals()
        # Keep the stored status honest so list filters and dashboards agree.
        if self.is_overdue and self.status == self.Status.PENDING:
            self.status = self.Status.OVERDUE
        super().save(*args, **kwargs)
