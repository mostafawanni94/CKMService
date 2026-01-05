"""
Invoice models for Pro Totaal Service.

Handles:
- Weekly invoice generation
- Line items per project/employee
- Cost tracking (transport, clothes, extras)
- Margin calculation
"""

from decimal import Decimal

from django.db import models

from apps.core.models import BaseModel


# =============================================================================
# COST TYPE (Admin-defined, Extensible)
# =============================================================================

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

class Invoice(BaseModel):
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
    
    # Invoice number
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Invoice Number"
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
    
    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-week_year', '-week_number']
        unique_together = ['customer', 'week_year', 'week_number']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.customer}"
    
    @property
    def amount_due(self):
        return self.total - self.amount_paid
    
    def calculate_totals(self):
        """Recalculate all totals from line items."""
        from django.db.models import Sum
        
        # Sum labor charges
        labor_total = self.lines.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0.00')
        
        # Sum costs
        cost_total = self.costs.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0.00')
        
        # Sum allowances
        allowance_total = self.allowance_lines.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0.00')
        
        # Sum gratuities
        gratuity_total = self.gratuity_lines.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        self.subtotal = labor_total
        self.total_costs = cost_total
        self.total_allowances = allowance_total
        self.total_gratuities = gratuity_total
        
        # Calculate VAT on subtotal + allowances (gratuities typically not taxed)
        taxable = self.subtotal + self.total_allowances
        self.vat_amount = (taxable * self.vat_rate / 100).quantize(Decimal('0.01'))
        
        # Total including costs, allowances, gratuities, and VAT
        self.total = self.subtotal + self.total_costs + self.total_allowances + self.total_gratuities + self.vat_amount
        
        self.save(update_fields=[
            'subtotal', 'total_costs', 'total_allowances', 'total_gratuities', 
            'vat_amount', 'total', 'updated_at'
        ])


# =============================================================================
# INVOICE LINE (Labor Hours)
# =============================================================================

class InvoiceLine(BaseModel):
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
    
    class Meta:
        verbose_name = 'Invoice Line'
        verbose_name_plural = 'Invoice Lines'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.invoice}: {self.employee} - {self.quantity_hours}h"
    
    def save(self, *args, **kwargs):
        """Auto-calculate total."""
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
