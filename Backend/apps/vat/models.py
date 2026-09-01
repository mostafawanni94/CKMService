"""
VAT domain models: the rules, the periods and the ledger.

The ledger is derived. Source documents keep owning their own money; a ledger
entry records how a VAT figure was reached, and can always be rebuilt from its
source. Nothing here is a second source of truth for an amount.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel

from .constants import (
    CLOSED_PERIOD_STATUSES, ClassificationStatus, FORBIDDEN_BOX_CODES,
    PriceMode, VatDirection, VatPeriodStatus, VatTreatmentCode,
)

#: Every money figure is quantised to cents with ROUND_HALF_UP, the convention
#: Dutch invoices use. Rounding happens once, at the line, and totals are summed
#: from already-rounded lines so the invoice never disagrees with its own rows.
CENTS = Decimal('0.01')


def to_cents(value):
    return Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)


# =============================================================================
# RULES
# =============================================================================

class VatReturnBox(TimeStampedModel):
    """A section of the Dutch BTW return."""

    code = models.CharField(max_length=4, unique=True, verbose_name='Rubriek')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    direction = models.CharField(max_length=10, choices=VatDirection.choices)
    is_computed = models.BooleanField(
        default=False,
        help_text='Derived from other boxes (5a, 5b) rather than fed by transactions.',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Boxes that do not apply to this company stay inactive but present, '
                  'so enabling them later needs no schema change.',
    )

    class Meta:
        verbose_name = 'VAT return box'
        verbose_name_plural = 'VAT return boxes'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.name}'

    def clean(self):
        if self.code in FORBIDDEN_BOX_CODES:
            raise ValidationError({
                'code': f'"{self.code}" is not a rubriek on the Dutch BTW return. '
                        'The payable/refundable figure is derived as 5a - 5b.'
            })

    def save(self, *args, **kwargs):
        self.full_clean(exclude=None) if not kwargs.pop('skip_clean', False) else None
        super().save(*args, **kwargs)


class VatTreatment(TimeStampedModel):
    """
    One VAT rule, effective-dated.

    Rate and box mapping live here rather than in code, so a future Dutch rate
    change is a new row with a new effective date — historical entries keep
    pointing at the rule that actually applied to them.
    """

    code = models.CharField(max_length=30, choices=VatTreatmentCode.choices)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')

    rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='VAT rate (%)',
    )

    # Where a transaction under this rule is reported.
    output_box = models.ForeignKey(
        VatReturnBox, on_delete=models.PROTECT, null=True, blank=True,
        related_name='treatments_output',
        help_text='Sales box, or the box the recipient declares reverse-charged VAT in.',
    )
    input_box = models.ForeignKey(
        VatReturnBox, on_delete=models.PROTECT, null=True, blank=True,
        related_name='treatments_input',
        help_text='Deduction box, normally 5b.',
    )

    creates_output_vat = models.BooleanField(default=False)
    creates_input_vat = models.BooleanField(default=False)
    is_reverse_charge = models.BooleanField(default=False)
    default_deductible_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100.00'),
        help_text='Portion of input VAT normally deductible under this rule.',
    )
    requires_review = models.BooleanField(
        default=False,
        help_text='Anything classified under this rule is held for a human.',
    )

    effective_from = models.DateField()
    effective_to = models.DateField(
        null=True, blank=True, help_text='Null means still in force.')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'VAT treatment'
        ordering = ['code', '-effective_from']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(effective_to__isnull=True)
                          | models.Q(effective_to__gte=models.F('effective_from')),
                name='vat_treatment_effective_range',
            ),
        ]

    def __str__(self):
        return f'{self.code} {self.rate}% (from {self.effective_from})'

    @classmethod
    def resolve(cls, code, on_date=None):
        """The rule for `code` in force on `on_date`. None when there is none."""
        on_date = on_date or timezone.localdate()
        return (
            cls.objects.filter(code=code, is_active=True, effective_from__lte=on_date)
            .filter(models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=on_date))
            .order_by('-effective_from')
            .first()
        )


# =============================================================================
# PERIODS
# =============================================================================

class VatPeriod(BaseModel):
    """A filing period. CKM files quarterly."""

    year = models.PositiveIntegerField()
    quarter = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='1-4. Null for a yearly period.')
    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=20, choices=VatPeriodStatus.choices,
        default=VatPeriodStatus.DRAFT, db_index=True)

    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey(
        'employees.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='finalized_vat_periods')

    #: The figures exactly as filed. Kept so a later change to a source document
    #: cannot silently rewrite what was submitted.
    filed_snapshot = models.JSONField(null=True, blank=True)
    rules_version = models.CharField(max_length=20, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = 'VAT period'
        ordering = ['-year', '-quarter']
        constraints = [
            models.UniqueConstraint(
                fields=['year', 'quarter'],
                condition=models.Q(is_deleted=False),
                name='vat_period_unique_year_quarter',
            ),
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F('start_date')),
                name='vat_period_end_after_start',
            ),
        ]

    def __str__(self):
        return f'{self.year} Q{self.quarter}' if self.quarter else str(self.year)

    @property
    def is_closed(self):
        return self.status in CLOSED_PERIOD_STATUSES

    @classmethod
    def quarter_for(cls, on_date):
        """(year, quarter, start, end) for the quarter containing `on_date`."""
        import datetime
        quarter = (on_date.month - 1) // 3 + 1
        start_month = 3 * (quarter - 1) + 1
        start = datetime.date(on_date.year, start_month, 1)
        end_month = start_month + 2
        last_day = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][end_month - 1]
        if end_month == 2 and (on_date.year % 4 == 0 and
                               (on_date.year % 100 != 0 or on_date.year % 400 == 0)):
            last_day = 29
        return on_date.year, quarter, start, datetime.date(on_date.year, end_month, last_day)

    @classmethod
    def for_date(cls, on_date, create=True):
        """The quarterly period a tax point falls in."""
        year, quarter, start, end = cls.quarter_for(on_date)
        if create:
            period, _ = cls.objects.get_or_create(
                year=year, quarter=quarter,
                defaults={'start_date': start, 'end_date': end},
            )
            return period
        return cls.objects.filter(year=year, quarter=quarter).first()


# =============================================================================
# LEDGER
# =============================================================================

class VatLedgerEntry(BaseModel):
    """
    One VAT-relevant fact, with everything needed to reconstruct it.

    Identified by (source_type, source_id, source_line_id, kind) so reprocessing
    the same document updates its entry instead of adding another.
    """

    class Kind(models.TextChoices):
        SALE = 'SALE', 'Sale (output)'
        PURCHASE = 'PURCHASE', 'Purchase (input)'
        REVERSE_CHARGE_OUTPUT = 'RC_OUTPUT', 'Reverse-charge VAT declared'
        REVERSE_CHARGE_INPUT = 'RC_INPUT', 'Reverse-charge VAT deducted'
        CORRECTION = 'CORRECTION', 'Correction'

    # --- where it came from ---
    source_type = models.CharField(max_length=50, db_index=True)
    source_id = models.CharField(max_length=64, db_index=True)
    source_line_id = models.CharField(max_length=64, blank=True, default='')
    source_reference = models.CharField(
        max_length=120, blank=True, default='',
        help_text='Human-readable, e.g. the invoice number.')

    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)

    # --- dates ---
    invoice_date = models.DateField(null=True, blank=True)
    transaction_date = models.DateField()
    tax_point_date = models.DateField(
        db_index=True,
        help_text='The date that decides the period. Under factuurstelsel this is '
                  'the invoice date, never the payment date.')
    period = models.ForeignKey(
        VatPeriod, on_delete=models.PROTECT, related_name='entries', db_index=True)

    # --- the money ---
    treatment = models.ForeignKey(
        VatTreatment, on_delete=models.PROTECT, null=True, blank=True,
        related_name='ledger_entries')
    treatment_code = models.CharField(max_length=30, choices=VatTreatmentCode.choices)
    price_mode = models.CharField(
        max_length=20, choices=PriceMode.choices, default=PriceMode.EXCLUDING_VAT)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    taxable_base = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    output_vat = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    input_vat = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    deductible_vat = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    non_deductible_vat = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    return_box = models.ForeignKey(
        VatReturnBox, on_delete=models.PROTECT, null=True, blank=True,
        related_name='entries')

    currency = models.CharField(max_length=3, default='EUR')

    # --- how it was decided ---
    classification_status = models.CharField(
        max_length=20, choices=ClassificationStatus.choices,
        default=ClassificationStatus.CLASSIFIED, db_index=True)
    review_reason = models.TextField(
        blank=True, default='',
        help_text='Why a human is needed. Always populated when review is required.')
    calculation_method = models.TextField(
        blank=True, default='',
        help_text='Plain-language record of how the figures were reached.')
    rules_version = models.CharField(max_length=20, blank=True, default='')

    #: Frozen when the period is finalised; a locked entry is never recalculated.
    is_locked = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = 'VAT ledger entry'
        verbose_name_plural = 'VAT ledger entries'
        ordering = ['tax_point_date', 'source_reference']
        indexes = [
            models.Index(fields=['period', 'kind']),
            models.Index(fields=['period', 'classification_status']),
            models.Index(fields=['source_type', 'source_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['source_type', 'source_id', 'source_line_id', 'kind'],
                condition=models.Q(is_deleted=False),
                name='vat_ledger_unique_source',
            ),
        ]

    def __str__(self):
        return f'{self.kind} {self.source_reference or self.source_id} — {self.vat_amount}'

    @property
    def requires_review(self):
        return self.classification_status == ClassificationStatus.REQUIRES_REVIEW


class VatClassificationOverride(TimeStampedModel):
    """
    A human decision recorded against a ledger entry.

    The automated classification is never erased — the original and the
    replacement are both kept, with who changed it and why.
    """

    entry = models.ForeignKey(
        VatLedgerEntry, on_delete=models.CASCADE, related_name='overrides')

    original_treatment_code = models.CharField(max_length=30)
    original_status = models.CharField(max_length=20)
    original_vat_amount = models.DecimalField(max_digits=14, decimal_places=2)

    new_treatment_code = models.CharField(max_length=30, choices=VatTreatmentCode.choices)
    new_vat_amount = models.DecimalField(max_digits=14, decimal_places=2)

    reason = models.TextField()
    resolved_by = models.ForeignKey(
        'employees.User', on_delete=models.PROTECT, related_name='vat_overrides')
    resolved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'VAT classification override'
        ordering = ['-resolved_at']

    def __str__(self):
        return f'{self.original_treatment_code} -> {self.new_treatment_code}'
