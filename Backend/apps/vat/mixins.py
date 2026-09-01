"""
Shared VAT-classification fields for source documents.

Abstract, so Agency, AgencyInvoice, IncomingInvoice and Expense declare the same
facts once. Every fact is nullable on purpose: null means "nobody has stated
this", which is what makes the engine hold a transaction for review instead of
inventing an answer.
"""

from decimal import Decimal

from django.db import models

from .constants import VatTreatmentCode


class VatClassifiableMixin(models.Model):
    """Facts a document can supply to the classification engine."""

    vat_treatment_code = models.CharField(
        max_length=30,
        choices=VatTreatmentCode.choices,
        default=VatTreatmentCode.UNKNOWN,
        verbose_name='VAT treatment',
        help_text='Defaults to UNKNOWN. Nothing is assumed to be 21%.',
    )

    # --- reverse-charge facts (tri-state: null = not established) ----------
    is_staff_lending_or_subcontracting = models.BooleanField(
        null=True, blank=True,
        verbose_name='Staff lending or subcontracting?',
        help_text='Leave unset if unknown; the transaction is then held for review.',
    )
    is_physical_work_on_immovable_property = models.BooleanField(
        null=True, blank=True,
        verbose_name='Physical work on immovable property?',
        help_text='The condition the Dutch reverse-charge scheme turns on.',
    )
    invoice_states_reverse_charge = models.BooleanField(
        null=True, blank=True,
        verbose_name='Invoice states "btw verlegd"?',
        help_text='Evidence, not a conclusion: wording alone does not decide the treatment.',
    )

    # --- the verified exceptions ------------------------------------------
    majority_work_in_own_workshop = models.BooleanField(null=True, blank=True)
    lent_to_subcontractor_working_own_premises = models.BooleanField(null=True, blank=True)
    ancillary_to_goods_sold = models.BooleanField(null=True, blank=True)
    is_design_work = models.BooleanField(null=True, blank=True)
    is_guarding_or_rental = models.BooleanField(null=True, blank=True)

    # --- deductibility -----------------------------------------------------
    deductible_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name='Deductible VAT (%)',
        help_text='Null means not established — full deduction is never assumed.',
    )

    vat_notes = models.TextField(
        blank=True, default='',
        help_text='Evidence for the classification: invoice wording, what the work was.',
    )

    class Meta:
        abstract = True

    def build_reverse_charge_facts(self, counterparty_vat_number=None, fallback=None):
        """
        Assemble the facts for the engine, falling back to a related default.

        `fallback` is typically the Agency: a per-agency posture that an
        individual invoice can override. A fact set on the invoice always wins;
        null on both means unresolved, and the engine will say so.
        """
        from .classification import ReverseChargeFacts

        def pick(attr):
            own = getattr(self, attr, None)
            if own is not None:
                return own
            return getattr(fallback, attr, None) if fallback is not None else None

        return ReverseChargeFacts(
            is_staff_lending_or_subcontracting=pick('is_staff_lending_or_subcontracting'),
            is_physical_work_on_immovable_property=pick(
                'is_physical_work_on_immovable_property'),
            counterparty_vat_number=counterparty_vat_number,
            majority_work_in_own_workshop=pick('majority_work_in_own_workshop'),
            lent_to_subcontractor_working_own_premises=pick(
                'lent_to_subcontractor_working_own_premises'),
            ancillary_to_goods_sold=pick('ancillary_to_goods_sold'),
            is_design_work=pick('is_design_work'),
            is_guarding_or_rental=pick('is_guarding_or_rental'),
        )

    def effective_treatment_code(self, fallback=None):
        """This document's treatment, or the related default when it has none."""
        if self.vat_treatment_code and self.vat_treatment_code != VatTreatmentCode.UNKNOWN:
            return self.vat_treatment_code
        if fallback is not None:
            code = getattr(fallback, 'vat_treatment_code', None)
            if code and code != VatTreatmentCode.UNKNOWN:
                return code
        return VatTreatmentCode.UNKNOWN

    def effective_deductible_percentage(self, fallback=None):
        """Deductibility, or None when nobody has established it."""
        if self.deductible_percentage is not None:
            return self.deductible_percentage
        if fallback is not None:
            return getattr(fallback, 'deductible_percentage', None)
        return None
