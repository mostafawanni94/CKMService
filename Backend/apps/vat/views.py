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

from apps.core.permissions import IsAdmin, IsFinanceStaff

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
    """
    Filing periods.

    Status is derived from the ledger, never set by hand: a period cannot claim
    to be ready while something is unresolved.
    """

    queryset = VatPeriod.objects.filter(is_deleted=False)
    serializer_class = VatPeriodSerializer
    permission_classes = [IsFinanceStaff]
    filterset_fields = ['year', 'quarter', 'status']

    @action(detail=False, methods=['post'], url_path='ensure')
    def ensure(self, request):
        """Create the four quarters of a year. Idempotent."""
        from .returns import ensure_periods
        year = int(request.data.get('year') or timezone.now().year)
        created = ensure_periods(year)
        return Response({
            'year': year,
            'created': [str(p) for p in created],
            'periods': VatPeriodSerializer(
                VatPeriod.objects.filter(year=year).order_by('quarter'), many=True).data,
        })

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Backwards-compatible summary."""
        return Response(summarise(self.get_object()))

    @action(detail=True, methods=['get', 'post'], url_path='return')
    def vat_return(self, request, pk=None):
        """
        The full return: every box, the derived 5a and 5b, and the position.

        POST refreshes the derived status first.
        """
        from .returns import calculate_return, refresh_status

        period = self.get_object()
        if request.method == 'POST':
            refresh_status(period, actor=request.user)
            period.refresh_from_db()
        return Response(calculate_return(period))

    @action(detail=True, methods=['get'], url_path=r'boxes/(?P<box_code>[0-9a-z]+)')
    def box_entries(self, request, pk=None, box_code=None):
        """Drill-down: the ledger entries behind one box."""
        from .returns import entries_for_box

        entries = entries_for_box(self.get_object(), box_code)
        page = self.paginate_queryset(entries)
        serializer = VatLedgerEntrySerializer(
            page if page is not None else entries, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response({'box': box_code, 'count': entries.count(),
                         'results': serializer.data})

    @action(detail=True, methods=['get'])
    def reconciliation(self, request, pk=None):
        return Response(status_for(self.get_object()))

    @action(detail=True, methods=['get'])
    def blockers(self, request, pk=None):
        """Everything standing between this period and being filed."""
        from .returns import blockers_for

        blockers = blockers_for(self.get_object())
        return Response({'can_finalize': not blockers, 'blockers': blockers})

    @action(detail=True, methods=['get'])
    def snapshot(self, request, pk=None):
        """The figures exactly as filed."""
        period = self.get_object()
        if not period.filed_snapshot:
            return Response({'detail': 'This period has not been filed.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({
            'period': str(period),
            'finalized_at': period.finalized_at,
            'finalized_by': getattr(period.finalized_by, 'email', None),
            'rules_version': period.rules_version,
            'snapshot': period.filed_snapshot,
        })

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """The audit trail for this period."""
        from .models import VatPeriodEvent

        events = VatPeriodEvent.objects.filter(period=self.get_object())
        return Response([
            {'event': e.event, 'detail': e.detail,
             'actor': getattr(e.actor, 'email', None),
             'at': e.created_at}
            for e in events
        ])

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        from .returns import FinalizationBlocked, finalize as do_finalize

        try:
            period = do_finalize(self.get_object(), actor=request.user,
                                 note=request.data.get('note', ''))
        except FinalizationBlocked as exc:
            return Response({'detail': str(exc), 'blockers': exc.blockers},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(period).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        from .returns import FinalizationBlocked, lock as do_lock

        try:
            period = do_lock(self.get_object(), actor=request.user)
        except FinalizationBlocked as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(period).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reopen(self, request, pk=None):
        """
        Reopen a filed period. Admin only, reason required, fully audited.

        A locked period cannot be reopened — corrections go to an open period.
        """
        from .returns import FinalizationBlocked, reopen as do_reopen

        try:
            period = do_reopen(self.get_object(), actor=request.user,
                               reason=request.data.get('reason', ''))
        except FinalizationBlocked as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(period).data)
