"""Expense & Finance Serializers."""
from decimal import Decimal
from rest_framework import serializers
from .models import ExpenseCategory, Expense, IncomeRecord
from apps.core.media import signed_media_url


class ExpenseCategorySerializer(serializers.ModelSerializer):
    expense_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpenseCategory
        fields = [
            'id', 'name', 'name_nl', 'code', 'description',
            'category_type', 'icon', 'color', 'is_active',
            'sort_order', 'expense_count',
        ]
    
    def get_expense_count(self, obj):
        return obj.expenses.count()


class ExpenseListSerializer(serializers.ModelSerializer):
    paid_by_employee_name = serializers.CharField(
        source='paid_by_employee.full_name', read_only=True, default=None)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    has_receipt = serializers.SerializerMethodField()
    # The list carries the link too, so the stored invoice can be opened from
    # the table without a round trip to the detail endpoint. Signing is pure
    # computation — no extra query per row.
    receipt_url = serializers.SerializerMethodField()
    receipt_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'category_name', 'category_code', 'category_color',
            'description', 'vendor_name', 'amount_excl_vat', 'vat_rate',
            'vat_amount', 'total_amount', 'expense_date', 'payment_method',
            'payment_method_display', 'is_paid', 'paid_date', 'reference_number',
            'is_recurring', 'recurring_frequency', 'status', 'status_display',
            'has_receipt', 'receipt_url', 'receipt_name', 'created_at',
            'paid_by_employee', 'paid_by_employee_name', 'reimbursement_status',
            'reimbursed_at', 'incoming_invoice',
            'vat_treatment_code', 'deductible_percentage',
        ]

    def get_has_receipt(self, obj):
        return bool(obj.receipt_file)

    def get_receipt_url(self, obj):
        return signed_media_url(obj.receipt_file, self.context.get('request'))

    def get_receipt_name(self, obj):
        return obj.receipt_file.name.rsplit('/', 1)[-1] if obj.receipt_file else None


class ExpenseDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    receipt_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = '__all__'

    def get_receipt_url(self, obj):
        if obj.receipt_file:
            request = self.context.get('request')
            if request:
                return signed_media_url(obj.receipt_file, request)
            return obj.receipt_file.url
        return None

    def get_receipt_name(self, obj):
        return obj.receipt_file.name.rsplit('/', 1)[-1] if obj.receipt_file else None


class VatRateField(serializers.ChoiceField):
    """The VAT rate: one of a fixed set, but stored as a decimal.

    `Expense.vat_rate` is a DecimalField that carries `choices`, so DRF builds
    a ChoiceField for it — and a ChoiceField hands the raw string on. It also
    copies the model's DecimalValidator, which calls `.as_tuple()`. A string
    has no such method, so every write raised AttributeError and the API
    answered 500 — including the dashboard's own expense form, for all three
    rates.

    Coercing to Decimal here satisfies the validator while the choice list
    keeps rejecting rates that are not 0, 9 or 21 percent.
    """

    def to_internal_value(self, data):
        return Decimal(super().to_internal_value(data))


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating expenses."""
    receipt_file = serializers.FileField(required=False, allow_null=True)
    vat_rate = VatRateField(
        choices=Expense._meta.get_field('vat_rate').choices, required=False)
    # Optional: supply them to record what the document prints, or leave them
    # out and let Expense.save() derive them from the net amount and the rate.
    vat_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False)
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False)
    
    class Meta:
        model = Expense
        fields = [
            'category', 'description', 'vendor_name',
            'amount_excl_vat', 'vat_rate', 'vat_amount', 'total_amount',
            'expense_date',
            'payment_method', 'is_paid', 'paid_date',
            'reference_number', 'receipt_file',
            'is_recurring', 'recurring_frequency',
            'status', 'notes',
            # Without these the VAT panel's PATCH answered 200 and changed
            # nothing, so an expense could never be anything but UNKNOWN and
            # every one of them sat in "requires review" for ever.
            'vat_treatment_code', 'deductible_percentage', 'vat_notes',
            'is_staff_lending_or_subcontracting',
            'is_physical_work_on_immovable_property',
            'invoice_states_reverse_charge',
            'majority_work_in_own_workshop',
            'lent_to_subcontractor_working_own_premises',
            'ancillary_to_goods_sold', 'is_design_work', 'is_guarding_or_rental',
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        
        # A caller that read the VAT off the document keeps it; otherwise
        # Expense.save() derives it from the net amount and the rate.
        instance = Expense(**validated_data)
        instance.amounts_stated_on_document = (
            'vat_amount' in validated_data or 'total_amount' in validated_data)
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        instance.amounts_stated_on_document = (
            'vat_amount' in validated_data or 'total_amount' in validated_data)
        return super().update(instance, validated_data)


class IncomeRecordListSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    invoice_number = serializers.SerializerMethodField()
    
    class Meta:
        model = IncomeRecord
        fields = [
            'id', 'source', 'source_display', 'description', 'payer_name',
            'amount_excl_vat', 'vat_amount', 'total_amount',
            'received_date', 'payment_method', 'reference_number',
            'invoice_number', 'created_at',
        ]
    
    def get_invoice_number(self, obj):
        if obj.customer_invoice:
            return obj.customer_invoice.invoice_number
        return None


class IncomeRecordDetailSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    payment_proof_url = serializers.SerializerMethodField()
    
    class Meta:
        model = IncomeRecord
        fields = '__all__'
    
    def get_payment_proof_url(self, obj):
        if obj.payment_proof:
            request = self.context.get('request')
            if request:
                return signed_media_url(obj.payment_proof, request)
            return obj.payment_proof.url
        return None


class IncomeRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeRecord
        fields = [
            'source', 'customer_invoice', 'description', 'payer_name',
            'amount_excl_vat', 'vat_amount', 'total_amount',
            'received_date', 'payment_method', 'reference_number',
            'payment_proof', 'notes',
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class FinancialSummarySerializer(serializers.Serializer):
    """Read-only summary for financial overview."""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=14, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_vat_collected = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_vat_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    vat_due = serializers.DecimalField(max_digits=14, decimal_places=2)
    expenses_by_category = serializers.ListField()
    monthly_breakdown = serializers.ListField()
