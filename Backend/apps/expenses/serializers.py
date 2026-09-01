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
    
    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'category_name', 'category_code', 'category_color',
            'description', 'vendor_name', 'amount_excl_vat', 'vat_rate',
            'vat_amount', 'total_amount', 'expense_date', 'payment_method',
            'payment_method_display', 'is_paid', 'paid_date', 'reference_number',
            'is_recurring', 'recurring_frequency', 'status', 'status_display',
            'has_receipt', 'created_at',
            'paid_by_employee', 'paid_by_employee_name', 'reimbursement_status',
            'reimbursed_at', 'incoming_invoice',
            'vat_treatment_code', 'deductible_percentage',
        ]
    
    def get_has_receipt(self, obj):
        return bool(obj.receipt_file)


class ExpenseDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    
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


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating expenses."""
    receipt_file = serializers.FileField(required=False, allow_null=True)
    
    class Meta:
        model = Expense
        fields = [
            'category', 'description', 'vendor_name',
            'amount_excl_vat', 'vat_rate', 'expense_date',
            'payment_method', 'is_paid', 'paid_date',
            'reference_number', 'receipt_file',
            'is_recurring', 'recurring_frequency',
            'status', 'notes',
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        
        # Auto-calculate VAT and total
        amount = validated_data.get('amount_excl_vat', Decimal('0'))
        vat_rate = validated_data.get('vat_rate', Decimal('21.00'))
        validated_data['vat_amount'] = (amount * vat_rate / 100).quantize(Decimal('0.01'))
        validated_data['total_amount'] = amount + validated_data['vat_amount']
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Recalculate VAT if amount changed
        amount = validated_data.get('amount_excl_vat', instance.amount_excl_vat)
        vat_rate = validated_data.get('vat_rate', instance.vat_rate)
        validated_data['vat_amount'] = (amount * vat_rate / 100).quantize(Decimal('0.01'))
        validated_data['total_amount'] = amount + validated_data['vat_amount']
        
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
