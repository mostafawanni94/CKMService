"""
Expenses & Finance Models.

Tracks all business expenses, income records, and provides
data for Dutch tax filing (Aangifte / BTW).

Key features:
- Expense categories (configurable)
- Receipt upload with OCR extraction
- Income tracking (auto-populated from paid invoices + manual entries)
- Payment tracking per expense
"""

from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


# =============================================================================
# EXPENSE CATEGORY
# =============================================================================

from apps.vat.mixins import VatClassifiableMixin

class ExpenseCategory(VatClassifiableMixin, BaseModel):
    """
    Admin-configurable expense categories.
    Pre-seeded with Dutch business categories.
    """
    
    class CategoryType(models.TextChoices):
        FIXED = 'fixed', 'Fixed (Recurring)'
        VARIABLE = 'variable', 'Variable (One-time)'
    
    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Category Name"
    )
    name_nl = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name="Dutch Name",
        help_text="Dutch translation for reports"
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Code",
        help_text="Short code, e.g. RENT, SOFTWARE"
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name="Description"
    )
    category_type = models.CharField(
        max_length=20,
        choices=CategoryType.choices,
        default=CategoryType.VARIABLE,
        verbose_name="Type"
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        default='receipt',
        verbose_name="Icon Name",
        help_text="Lucide icon name for UI display"
    )
    color = models.CharField(
        max_length=10,
        blank=True,
        default='#6B7280',
        verbose_name="Color"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active"
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name="Sort Order"
    )
    
    class Meta:
        verbose_name = 'Expense Category'
        verbose_name_plural = 'Expense Categories'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


# =============================================================================
# EXPENSE
# =============================================================================

class Expense(VatClassifiableMixin, BaseModel):
    """
    Business expense record with receipt upload and OCR extraction.
    
    Workflow:
        1. Admin uploads receipt (photo/PDF)
        2. OCR extracts vendor, amount, date → auto-fills form
        3. Admin reviews, edits if needed, and saves
        4. Expense appears in financial overview and Aangifte export
    """
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
    
    class PaymentMethod(models.TextChoices):
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CASH = 'cash', 'Cash'
        PIN = 'pin', 'Pin / Debit Card'
        CREDIT_CARD = 'credit_card', 'Credit Card'
        DIRECT_DEBIT = 'direct_debit', 'Automatische Incasso'
        IDEAL = 'ideal', 'iDEAL'
        OTHER = 'other', 'Other'
    
    class VATRate(models.TextChoices):
        ZERO = '0.00', '0% (Vrijgesteld)'
        LOW = '9.00', '9% (Laag tarief)'
        HIGH = '21.00', '21% (Standaard)'
    
    # Category
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Category"
    )
    
    # Details
    description = models.CharField(
        max_length=500,
        verbose_name="Description"
    )
    vendor_name = models.CharField(
        max_length=300,
        verbose_name="Vendor / Supplier",
        help_text="Who you paid (e.g., KPN, Ziggo, Albert Heijn)"
    )
    
    # Financial
    amount_excl_vat = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Amount (excl. BTW)"
    )
    vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        choices=VATRate.choices,
        default=Decimal('21.00'),
        verbose_name="BTW Rate (%)"
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="BTW Amount"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total Amount (incl. BTW)"
    )
    
    # Dates
    expense_date = models.DateField(
        verbose_name="Expense Date",
        db_index=True
    )
    
    # Payment
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BANK_TRANSFER,
        verbose_name="Payment Method"
    )
    is_paid = models.BooleanField(
        default=True,
        verbose_name="Is Paid",
        help_text="Whether this expense has been paid"
    )
    paid_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Paid Date"
    )
    
    # Reference
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Reference / Invoice Number",
        help_text="Vendor's invoice or reference number"
    )
    
    # Receipt
    receipt_file = models.FileField(
        upload_to='expenses/receipts/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Receipt / Bill",
        help_text="Upload receipt image or PDF"
    )
    
    # OCR data (stored for reference)
    ocr_extracted_data = models.JSONField(
        blank=True,
        null=True,
        verbose_name="OCR Extracted Data",
        help_text="Raw OCR extraction result for reference"
    )
    ocr_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="OCR Confidence (%)"
    )
    
    # Recurring
    is_recurring = models.BooleanField(
        default=False,
        verbose_name="Recurring Expense"
    )
    recurring_frequency = models.CharField(
        max_length=20,
        blank=True,
        default='',
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('yearly', 'Yearly'),
        ],
        verbose_name="Recurring Frequency"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPROVED,
        db_index=True,
        verbose_name="Status"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    class Meta:
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        ordering = ['-expense_date']
    
    def __str__(self):
        return f"{self.vendor_name} - €{self.total_amount} ({self.expense_date})"
    
    def save(self, *args, **kwargs):
        """Auto-calculate VAT and total."""
        if self.amount_excl_vat:
            self.vat_amount = (self.amount_excl_vat * self.vat_rate / 100).quantize(Decimal('0.01'))
            self.total_amount = self.amount_excl_vat + self.vat_amount
        super().save(*args, **kwargs)


# =============================================================================
# INCOME RECORD
# =============================================================================

class IncomeRecord(BaseModel):
    """
    Income tracking — auto-populated from paid invoices + manual entries.
    
    When a customer invoice is marked as PAID, an IncomeRecord is
    automatically created to track the income. Manual entries can
    also be added for other income sources.
    """
    
    class Source(models.TextChoices):
        CUSTOMER_INVOICE = 'customer_invoice', 'Customer Invoice'
        AGENCY_INVOICE = 'agency_invoice', 'Agency Invoice (Incoming)'
        OTHER = 'other', 'Other Income'
    
    # Source
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.OTHER,
        verbose_name="Source"
    )
    
    # Link to invoice (for auto-populated records)
    customer_invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='income_records',
        verbose_name="Customer Invoice"
    )
    
    # Details
    description = models.CharField(
        max_length=500,
        verbose_name="Description"
    )
    payer_name = models.CharField(
        max_length=300,
        blank=True,
        default='',
        verbose_name="Payer / Source",
        help_text="Who paid you"
    )
    
    # Financial
    amount_excl_vat = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Amount (excl. BTW)"
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="BTW Amount"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total Amount (incl. BTW)"
    )
    
    # Date
    received_date = models.DateField(
        verbose_name="Received Date",
        db_index=True
    )
    
    # Payment
    payment_method = models.CharField(
        max_length=20,
        choices=Expense.PaymentMethod.choices,
        default=Expense.PaymentMethod.BANK_TRANSFER,
        verbose_name="Payment Method"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Reference Number"
    )
    
    # Proof
    payment_proof = models.FileField(
        upload_to='income/proofs/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Payment Proof",
        help_text="Bank transfer confirmation"
    )
    
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    class Meta:
        verbose_name = 'Income Record'
        verbose_name_plural = 'Income Records'
        ordering = ['-received_date']
    
    def __str__(self):
        return f"{self.description} - €{self.total_amount} ({self.received_date})"
