"""
Wallet API Views.

ViewSets for wallet management and advance requests.
"""

from decimal import Decimal
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.views import IsAdmin
from .models import Wallet, WalletTransaction, AdvanceRequest
from .serializers import (
    WalletSerializer, WalletTransactionSerializer,
    AdvanceRequestSerializer, AdvanceRequestCreateSerializer,
    AdvanceApprovalSerializer, AdvanceRejectionSerializer,
    WalletAdjustmentSerializer,
)


class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing wallets.
    
    Employees can only view their own wallet.
    Admin can view all wallets.
    """
    
    queryset = Wallet.objects.select_related('employee').order_by('-created_at')
    serializer_class = WalletSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        # Employee can only see their own wallet
        return self.queryset.filter(employee__user=user)
    
    @action(detail=False, methods=['get'])
    def my_wallet(self, request):
        """Get current user's wallet."""
        try:
            wallet = Wallet.objects.get(employee__user=request.user)
            serializer = WalletSerializer(wallet)
            return Response(serializer.data)
        except Wallet.DoesNotExist:
            return Response(
                {'error': 'Wallet not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """Get all transactions for a wallet."""
        wallet = self.get_object()
        transactions = wallet.transactions.order_by('-created_at')
        
        # Pagination
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = WalletTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def adjust(self, request, pk=None):
        """
        Admin creates a manual wallet adjustment.
        
        POST /api/wallet/wallets/{id}/adjust/
        {
            "adjustment_type": "bonus",
            "amount": 100.00,
            "description": "Performance bonus",
            "notes": "Q4 2024 bonus"
        }
        """
        wallet = self.get_object()
        serializer = WalletAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        adjustment_type = data['adjustment_type']
        amount = data['amount']
        
        # Determine if positive or negative
        if adjustment_type == 'deduction':
            amount = -abs(amount)
        else:
            amount = abs(amount)
        
        # Map adjustment type to transaction type
        type_mapping = {
            'bonus': WalletTransaction.Type.BONUS,
            'deduction': WalletTransaction.Type.DEDUCTION,
            'reimbursement': WalletTransaction.Type.REIMBURSEMENT,
            'adjustment': WalletTransaction.Type.ADJUSTMENT,
        }
        
        transaction = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=type_mapping[adjustment_type],
            amount=amount,
            description=data['description'],
            notes=data.get('notes', ''),
            status=WalletTransaction.Status.COMPLETED,
            created_by=request.user
        )
        
        return Response({
            'status': 'success',
            'message': 'Wallet adjusted',
            'transaction': WalletTransactionSerializer(transaction).data,
            'new_balance': wallet.balance
        })


class AdvanceRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for advance/debt requests.
    
    Employees can create and view their own requests.
    Admin can approve/reject all requests.
    """
    
    queryset = AdvanceRequest.objects.select_related(
        'employee', 'processed_by'
    ).order_by('-created_at')
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        # Employee can only see their own requests
        return self.queryset.filter(employee__user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AdvanceRequestCreateSerializer
        if self.action == 'approve':
            return AdvanceApprovalSerializer
        if self.action == 'reject':
            return AdvanceRejectionSerializer
        return AdvanceRequestSerializer
    
    def perform_create(self, serializer):
        """Create advance request for current user."""
        from apps.employees.models import EmployeeProfile
        
        try:
            employee = EmployeeProfile.objects.get(user=self.request.user)
        except EmployeeProfile.DoesNotExist:
            raise serializers.ValidationError('Employee profile not found.')
        
        serializer.save(
            employee=employee,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """
        Admin approves advance request.
        Creates negative wallet transaction.
        
        POST /api/wallet/advances/{id}/approve/
        """
        advance_request = self.get_object()
        
        if advance_request.status != AdvanceRequest.Status.PENDING:
            return Response(
                {'error': 'Request already processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            transaction = advance_request.approve(request.user)
            return Response({
                'status': 'success',
                'message': 'Advance approved',
                'advance': AdvanceRequestSerializer(advance_request).data,
                'transaction': WalletTransactionSerializer(transaction).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """
        Admin rejects advance request.
        
        POST /api/wallet/advances/{id}/reject/
        {
            "reason": "Exceeds monthly limit"
        }
        """
        advance_request = self.get_object()
        
        if advance_request.status != AdvanceRequest.Status.PENDING:
            return Response(
                {'error': 'Request already processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AdvanceRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        advance_request.reject(
            request.user,
            serializer.validated_data['reason']
        )
        
        return Response({
            'status': 'success',
            'message': 'Advance rejected',
            'advance': AdvanceRequestSerializer(advance_request).data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        """Get all pending advance requests (admin only)."""
        pending = self.queryset.filter(status=AdvanceRequest.Status.PENDING)
        serializer = AdvanceRequestSerializer(pending, many=True)
        return Response(serializer.data)
