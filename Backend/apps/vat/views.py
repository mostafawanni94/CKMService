"""
VAT API.

Read access is limited to finance and admin; resolving a classification or
finalising a period is admin/finance only. Employees and customers get nothing
here — company VAT position is not theirs to see.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsFinanceStaff

from .constants import ClassificationStatus, VatPeriodStatus
from .ledger import summarise
from .models import (
    VatClassificationOverride, VatLedgerEntry, VatPeriod, VatReturnBox, VatTreatment,
)
from .reconciliation import status_for
from .serializers import (
    ResolveReviewSerializer, VatLedgerEntrySerializer, VatPeriodSerializer,
    VatReturnBoxSerializer, VatTreatmentSerializer,
)


class VatReturnBoxViewSet(viewsets.ReadOnlyModelViewSet):
    """The Dutch BTW rubrieken. Read-only: these are law, not configuration."""

    queryset = VatReturnBox.objects.all()
    serializer_class = VatReturnBoxSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['is_active', 'direction']


class VatTreatmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VatTreatment.objects.select_related('output_box', 'input_box')
    serializer_class = VatTreatmentSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['code', 'is_active', 'is_reverse_charge']


class VatLedgerEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    The ledger. Read-only by design — an entry is changed by reposting its
    source or by recording an override, never by editing it directly.
    """

    serializer_class = VatLedgerEntrySerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['period', 'kind', 'classification_status',
                        'source_type', 'treatment_code', 'is_locked']
    search_fields = ['source_reference', 'source_id']
    ordering_fields = ['tax_point_date', 'vat_amount', 'created_at']

    def get_queryset(self):
        return (VatLedgerEntry.objects
                .filter(is_deleted=False)
                .select_related('period', 'treatment', 'return_box')
                .prefetch_related('overrides'))

    @action(detail=False, methods=['get'], url_path='review_queue')
    def review_queue(self, request):
        """Everything a person still has to decide."""
        queryset = self.filter_queryset(
            self.get_queryset().filter(
                classification_status=ClassificationStatus.REQUIRES_REVIEW))
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response({'count': queryset.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """
        Record a human decision on a flagged entry.

        The original classification is preserved in an override row; it is never
        overwritten.
        """
        entry = self.get_object()
        if entry.is_locked:
            return Response(
                {'detail': 'This entry is locked because its period was filed. '
                           'Post a correction instead.'},
                status=status.HTTP_400_BAD_REQUEST)

        payload = ResolveReviewSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        from .classification import classify_amount

        new_code = payload.validated_data['treatment_code']
        result = classify_amount(
            entry.taxable_base, new_code, entry.tax_point_date,
            price_mode=entry.price_mode,
            direction='INPUT' if entry.input_vat or entry.kind.startswith('RC') else 'OUTPUT',
        )
        if result.requires_review:
            return Response(
                {'detail': f'That treatment still cannot be applied: {result.reason}'},
                status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            VatClassificationOverride.objects.create(
                entry=entry,
                original_treatment_code=entry.treatment_code,
                original_status=entry.classification_status,
                original_vat_amount=entry.vat_amount,
                new_treatment_code=new_code,
                new_vat_amount=result.vat_amount,
                reason=payload.validated_data['reason'],
                resolved_by=request.user,
            )
            entry.treatment = result.treatment
            entry.treatment_code = result.treatment_code
            entry.vat_rate = result.vat_rate
            entry.taxable_base = result.taxable_base
            entry.vat_amount = result.vat_amount
            entry.return_box = (
                VatReturnBox.objects.filter(code=result.return_box_code).first()
                if result.return_box_code else None)
            if entry.kind == VatLedgerEntry.Kind.SALE:
                entry.output_vat = result.vat_amount
            else:
                entry.input_vat = result.vat_amount
                entry.deductible_vat = result.vat_amount
            entry.classification_status = ClassificationStatus.MANUALLY_RESOLVED
            entry.review_reason = ''
            entry.calculation_method = (
                f'{result.calculation} Resolved manually by {request.user.email}.')
            entry.save()

        return Response(self.get_serializer(entry).data)


class VatPeriodViewSet(viewsets.ModelViewSet):
    queryset = VatPeriod.objects.filter(is_deleted=False)
    serializer_class = VatPeriodSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['year', 'quarter', 'status']

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """The return figures, derived from the ledger."""
        return Response(summarise(self.get_object()))

    @action(detail=True, methods=['get'])
    def reconciliation(self, request, pk=None):
        return Response(status_for(self.get_object()))

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        Freeze a period.

        Refused while anything is unresolved or reconciliation reports an error:
        a return should not be filed over known problems.
        """
        period = self.get_object()
        if period.is_closed:
            return Response({'detail': f'{period} is already {period.status.lower()}.'},
                            status=status.HTTP_400_BAD_REQUEST)

        reconciliation = status_for(period)
        if not reconciliation['is_clean']:
            return Response(
                {'detail': 'Resolve the reconciliation errors first.',
                 'reconciliation': reconciliation},
                status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            snapshot = summarise(period)
            period.filed_snapshot = {
                k: (str(v) if hasattr(v, 'quantize') else v)
                for k, v in snapshot.items() if k != 'boxes'
            }
            period.filed_snapshot['boxes'] = {
                code: {kk: str(vv) for kk, vv in box.items()}
                for code, box in snapshot['boxes'].items()
            }
            period.status = VatPeriodStatus.FINALIZED
            period.finalized_at = timezone.now()
            period.finalized_by = request.user
            period.rules_version = snapshot['rules_version']
            period.save()

            # Freeze the entries so a later source edit cannot rewrite the filing.
            VatLedgerEntry.objects.filter(period=period).update(is_locked=True)

        return Response(self.get_serializer(period).data)
