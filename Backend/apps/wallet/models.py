"""
Wallet models for Pro Totaal Service.

Handles:
- Ledger-based wallet (all movements recorded)
- Employee earnings from approved work
- Advance requests and approvals
- Adjustments and deductions
"""

from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel, TimeStampedModel


# =============================================================================
# WALLET (Employee Wallet)
# =============================================================================

class Wallet(TimeStampedModel):
    """
    Employee wallet - maintains current balance.
    
    Balance can be:
    - Positive (earnings exceed advances)
    - Zero
    - Negative (advances exceed earnings, debt)
    
    All changes are recorded in WalletTransaction for audit.
    """
    
    employee = models.OneToOneField(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='wallet',
        verbose_name="Employee"
    )
    
    # Current balance (cached, calculated from transactions)
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Current Balance"
    )
    
    # Total earnings (for statistics)
    total_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Earnings"
    )
    
    # Total advances taken
    total_advances = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Advances"
    )
    
    class Meta:
        verbose_name = 'Wallet'
        verbose_name_plural = 'Wallets'
    
    def __str__(self):
        return f"Wallet: {self.employee} (€{self.balance})"
    
    def recalculate_balance(self):
        """Recalculate balance from all transactions."""
        from django.db.models import Sum
        
        totals = self.transactions.aggregate(
            total=Sum('amount')
        )
        self.balance = totals['total'] or Decimal('0.00')
        
        # Calculate earnings and advances separately
        earnings = self.transactions.filter(
            transaction_type__in=[
                WalletTransaction.Type.EARNING,
                WalletTransaction.Type.BONUS,
                WalletTransaction.Type.REIMBURSEMENT,
            ]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        advances = abs(self.transactions.filter(
            transaction_type=WalletTransaction.Type.ADVANCE
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00'))
        
        self.total_earnings = earnings
        self.total_advances = advances
        self.save(update_fields=['balance', 'total_earnings', 'total_advances', 'updated_at'])
        
        return self.balance


# =============================================================================
# WALLET TRANSACTION (Ledger Entry)
# =============================================================================

class WalletTransaction(BaseModel):
    """
    Immutable ledger entry for wallet changes.
    
    Every financial movement is recorded:
    - Earnings (from approved work logs)
    - Advances (employee requests, admin approves)
    - Adjustments (admin corrections)
    - Deductions (if any)
    
    Transaction amount:
    - Positive = money in (earnings, reimbursements)
    - Negative = money out (advances, deductions)
    """
    
    class Type(models.TextChoices):
        EARNING = 'earning', 'Earning'
        ADVANCE = 'advance', 'Advance (Loan)'
        ADJUSTMENT = 'adjustment', 'Adjustment'
        DEDUCTION = 'deduction', 'Deduction'
        BONUS = 'bonus', 'Bonus'
        REIMBURSEMENT = 'reimbursement', 'Reimbursement'
        PAYOUT = 'payout', 'Payout'
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name="Wallet"
    )
    
    # Transaction details
    transaction_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        verbose_name="Transaction Type",
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Amount",
        help_text="Positive = credit, Negative = debit"
    )
    
    # Description
    description = models.CharField(
        max_length=255,
        verbose_name="Description"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Notes"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        verbose_name="Status"
    )
    
    # Reference to source (work log, advance request, etc.)
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Reference Type",
        help_text="E.g., worklog, advance_request"
    )
    reference_id = models.UUIDField(
        blank=True,
        null=True,
        verbose_name="Reference ID"
    )
    
    # Balance after this transaction (for quick history view)
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Balance After"
    )
    
    class Meta:
        verbose_name = 'Wallet Transaction'
        verbose_name_plural = 'Wallet Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        sign = '+' if self.amount >= 0 else ''
        return f"{self.wallet.employee}: {sign}€{self.amount} ({self.get_transaction_type_display()})"
    
    def save(self, *args, **kwargs):
        """Update wallet balance after saving."""
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and self.status == self.Status.COMPLETED:
            # Update balance_after
            self.wallet.recalculate_balance()
            self.balance_after = self.wallet.balance
            super().save(update_fields=['balance_after'])


# =============================================================================
# ADVANCE REQUEST
# =============================================================================

class AdvanceRequest(BaseModel):
    """
    Employee request for advance (loan from wallet).
    
    Workflow:
    1. Employee submits request (amount + reason)
    2. Admin approves or rejects
    3. Approval creates negative wallet transaction
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'
    
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='advance_requests',
        verbose_name="Employee"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Requested Amount"
    )
    reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Reason"
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Status"
    )
    
    # Approval
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Processed At"
    )
    processed_by = models.ForeignKey(
        'employees.User',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='processed_advance_requests',
        verbose_name="Processed By"
    )
    rejection_reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Rejection Reason"
    )
    
    # Link to wallet transaction (after approval)
    wallet_transaction = models.OneToOneField(
        WalletTransaction,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='advance_request',
        verbose_name="Wallet Transaction"
    )
    
    class Meta:
        verbose_name = 'Advance Request'
        verbose_name_plural = 'Advance Requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.employee} - €{self.amount} ({self.get_status_display()})"
    
    def approve(self, admin_user):
        """Approve the advance request and create wallet transaction."""
        if self.status != self.Status.PENDING:
            raise ValueError('Request already processed')
        
        # Create negative wallet transaction
        wallet = self.employee.wallet
        transaction = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.Type.ADVANCE,
            amount=-self.amount,  # Negative because it's a debit
            description=f"Advance: {self.reason[:100]}" if self.reason else "Advance",
            reference_type='advance_request',
            reference_id=self.id,
            status=WalletTransaction.Status.COMPLETED,
            created_by=admin_user
        )
        
        self.status = self.Status.APPROVED
        self.processed_at = timezone.now()
        self.processed_by = admin_user
        self.wallet_transaction = transaction
        self.save()
        
        return transaction
    
    def reject(self, admin_user, reason=''):
        """Reject the advance request."""
        if self.status != self.Status.PENDING:
            raise ValueError('Request already processed')
        
        self.status = self.Status.REJECTED
        self.processed_at = timezone.now()
        self.processed_by = admin_user
        self.rejection_reason = reason
        self.save()
