"""VAT API serializers."""

from rest_framework import serializers

from .models import (
    VatClassificationOverride, VatLedgerEntry, VatPeriod, VatReturnBox, VatTreatment,
)


class VatReturnBoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = VatReturnBox
        fields = ['id', 'code', 'name', 'description', 'direction',
                  'is_computed', 'is_active']


class VatTreatmentSerializer(serializers.ModelSerializer):
    output_box_code = serializers.CharField(source='output_box.code', read_only=True, default=None)
    input_box_code = serializers.CharField(source='input_box.code', read_only=True, default=None)

    class Meta:
        model = VatTreatment
        fields = ['id', 'code', 'name', 'description', 'rate',
                  'output_box_code', 'input_box_code', 'is_reverse_charge',
                  'requires_review', 'effective_from', 'effective_to', 'is_active']


class VatLedgerEntrySerializer(serializers.ModelSerializer):
    """
    A ledger entry with everything needed to answer "where did this come from?".
    """

    return_box_code = serializers.CharField(source='return_box.code', read_only=True, default=None)
    period_label = serializers.CharField(source='period.__str__', read_only=True)
    requires_review = serializers.BooleanField(read_only=True)

    class Meta:
        model = VatLedgerEntry
        fields = [
            'id', 'source_type', 'source_id', 'source_line_id', 'source_reference',
            'kind', 'invoice_date', 'transaction_date', 'tax_point_date',
            'period', 'period_label',
            'treatment_code', 'price_mode', 'vat_rate',
            'taxable_base', 'vat_amount', 'output_vat', 'input_vat',
            'deductible_vat', 'non_deductible_vat',
            'return_box_code', 'currency',
            'classification_status', 'requires_review', 'review_reason',
            'calculation_method', 'rules_version', 'is_locked',
            'created_at',
        ]
        read_only_fields = fields


class VatPeriodSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='__str__', read_only=True)
    is_closed = serializers.BooleanField(read_only=True)

    class Meta:
        model = VatPeriod
        fields = ['id', 'label', 'year', 'quarter', 'start_date', 'end_date',
                  'status', 'is_closed', 'finalized_at', 'finalized_by',
                  'locked_at', 'locked_by', 'reopened_at', 'reopen_reason',
                  'rules_version', 'notes']
        # Status is derived from the ledger, so it is never accepted from a client.
        read_only_fields = ['status', 'finalized_at', 'finalized_by', 'locked_at',
                            'locked_by', 'reopened_at', 'reopen_reason', 'rules_version']


class VatOverrideSerializer(serializers.ModelSerializer):
    resolved_by_email = serializers.EmailField(source='resolved_by.email', read_only=True)

    class Meta:
        model = VatClassificationOverride
        fields = ['id', 'entry', 'original_treatment_code', 'original_status',
                  'original_vat_amount', 'new_treatment_code', 'new_vat_amount',
                  'reason', 'resolved_by', 'resolved_by_email', 'resolved_at']
        read_only_fields = ['original_treatment_code', 'original_status',
                            'original_vat_amount', 'resolved_by', 'resolved_at']


class ResolveReviewSerializer(serializers.Serializer):
    """Payload for resolving a REQUIRES_REVIEW entry."""

    treatment_code = serializers.CharField()
    reason = serializers.CharField(
        help_text='Why this treatment is correct. Recorded permanently.')

    def validate_reason(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                'Give a real reason — this is the audit record for a tax decision.')
        return value.strip()
