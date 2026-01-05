"""
Wallet Serializers.

Serializers for wallet transactions and advance requests.
"""

from decimal import Decimal
from rest_framework import serializers

from .models import Wallet, WalletTransaction, AdvanceRequest


class WalletTransactionSerializer(serializers.ModelSerializer):
    """Serializer for wallet transactions (read-only ledger)."""
    
    transaction_type_display = serializers.CharField(
        source='get_transaction_type_display',
        read_only=True
    )
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'transaction_type', 'transaction_type_display',
            'amount', 'description', 'notes', 'status',
            'balance_after', 'reference_type', 'reference_id',
            'created_at'
        ]
        read_only_fields = fields  # All fields are read-only (immutable ledger)


class WalletSerializer(serializers.ModelSerializer):
    """Serializer for employee wallet."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    recent_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'employee_name', 'balance', 'total_earnings',
            'total_advances', 'recent_transactions', 'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_recent_transactions(self, obj):
        """Get last 10 transactions."""
        transactions = obj.transactions.order_by('-created_at')[:10]
        return WalletTransactionSerializer(transactions, many=True).data


class AdvanceRequestSerializer(serializers.ModelSerializer):
    """Serializer for advance/debt requests."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.CharField(
        source='processed_by.email',
        read_only=True,
        default=None
    )
    
    class Meta:
        model = AdvanceRequest
        fields = [
            'id', 'employee', 'employee_name', 'amount', 'reason',
            'status', 'status_display', 'processed_at', 'processed_by',
            'processed_by_name', 'rejection_reason', 'created_at'
        ]
        read_only_fields = [
            'id', 'employee', 'status', 'processed_at', 'processed_by',
            'rejection_reason', 'created_at'
        ]


class AdvanceRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating advance requests."""
    
    class Meta:
        model = AdvanceRequest
        fields = ['amount', 'reason']
    
    def validate_amount(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError('Amount must be positive.')
        if value > Decimal('5000'):
            raise serializers.ValidationError('Maximum advance is €5000.')
        return value


class AdvanceApprovalSerializer(serializers.Serializer):
    """Serializer for approving advance request."""
    pass  # No additional fields needed


class AdvanceRejectionSerializer(serializers.Serializer):
    """Serializer for rejecting advance request."""
    
    reason = serializers.CharField(min_length=5, max_length=500)


class WalletAdjustmentSerializer(serializers.Serializer):
    """Serializer for admin wallet adjustments."""
    
    ADJUSTMENT_TYPES = [
        ('bonus', 'Bonus'),
        ('deduction', 'Deduction'),
        ('reimbursement', 'Reimbursement'),
        ('adjustment', 'Manual Adjustment'),
    ]
    
    adjustment_type = serializers.ChoiceField(choices=ADJUSTMENT_TYPES)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    
    def validate_amount(self, value):
        if value == Decimal('0'):
            raise serializers.ValidationError('Amount cannot be zero.')
        return value
