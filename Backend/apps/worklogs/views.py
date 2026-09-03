"""WorkEntry API Views - Unified Work Entry System."""

import logging
from datetime import date, timedelta
from decimal import Decimal
from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.db import models

from apps.core.permissions import IsAdmin, IsAdminOrSelf
from apps.employees.models import EmployeeProfile
from apps.core.pagination import LargePagination
from .models import Shift, WorkEntry, WorkEntryPhoto
from .serializers import (

    ShiftSerializer, ShiftCreateSerializer, ShiftFillDataSerializer, ShiftRejectionSerializer,
    WorkEntryListSerializer, WorkEntryDetailSerializer, WorkEntryCreateSerializer,
    WorkEntryFillDataSerializer, WorkEntryApprovalSerializer, WorkEntryRejectionSerializer,
    WorkEntryBulkCreateSerializer, WorkEntryPhotoSerializer, WorkEntryPhotoUploadSerializer,
)


logger = logging.getLogger(__name__)


# =============================================================================
# SHIFT VIEWSET (Legacy - kept for backward compatibility)
# =============================================================================

class ShiftViewSet(viewsets.ModelViewSet):
    """ViewSet for shift scheduling and management."""
    
    queryset = Shift.objects.select_related(
        'employee', 'project', 'supervisor', 'service', 'approved_by'
    ).order_by('-scheduled_date', 'scheduled_start_time')
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(employee__user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ShiftCreateSerializer
        if self.action == 'fill_data':
            return ShiftFillDataSerializer
        if self.action == 'reject':
            return ShiftRejectionSerializer
        return ShiftSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'destroy', 'approve', 'reject', 'pending']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def my_shifts(self, request):
        """Get employee's upcoming shifts."""
        from django.utils import timezone
        today = timezone.localdate()
        
        shifts = self.queryset.filter(
            employee__user=request.user,
            scheduled_date__gte=today,
        ).exclude(
            status__in=[Shift.Status.APPROVED, Shift.Status.CANCELLED]
        ).order_by('scheduled_date', 'scheduled_start_time')
        
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Mark shift as acknowledged."""
        shift = self.get_object()
        if shift.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your shift'}, status=status.HTTP_403_FORBIDDEN)
        shift.acknowledge()
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def fill_data(self, request, pk=None):
        """Employee fills actual work data."""
        shift = self.get_object()
        if shift.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your shift'}, status=status.HTTP_403_FORBIDDEN)
        if not shift.can_fill_data:
            return Response(
                {'error': 'Cannot fill data - only allowed on the scheduled day'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ShiftFillDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift.fill_data(serializer.validated_data)
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit shift for approval."""
        shift = self.get_object()
        if shift.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your shift'}, status=status.HTTP_403_FORBIDDEN)
        try:
            shift.submit()
            return Response(ShiftSerializer(shift).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Approve shift."""
        shift = self.get_object()
        try:
            work_log = shift.approve(request.user)
            return Response({
                'shift': ShiftSerializer(shift).data,
                'work_log_id': str(work_log.id) if work_log else None
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Reject shift with reason."""
        shift = self.get_object()
        serializer = ShiftRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            shift.reject(serializer.validated_data['reason'])
            return Response(ShiftSerializer(shift).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        """Get pending shifts."""
        pending = self.queryset.filter(status=Shift.Status.SUBMITTED)
        serializer = ShiftSerializer(pending, many=True)
        return Response(serializer.data)


# =============================================================================
# UNIFIED WORK ENTRY VIEWSET
# =============================================================================

class WorkEntryViewSet(viewsets.ModelViewSet):
    """
    Unified Work Entry ViewSet.
    
    Replaces separate ShiftAssignment and WorkLog views.
    Single source of truth for all work entries.
    """
    
    queryset = WorkEntry.objects.select_related(
        'employee', 'project', 'project__customer',
        'shift_template', 'planned_supervisor', 'agency',
        'service', 'approved_by'
    ).order_by('-work_date', '-actual_start_datetime')
    pagination_class = LargePagination
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin sees all, employees see their own
        if user.is_admin:
            queryset = self.queryset
        else:
            queryset = self.queryset.filter(employee__user=user)
        
        # Apply filters from query params
        params = self.request.query_params
        
        # Status filter — accepts one value or several, because the list page
        # offers a multi-select.
        status_values = [v for v in params.getlist('status') if v]
        if status_values:
            queryset = queryset.filter(status__in=status_values)

        # Free-text search over the columns the list page shows. Filtering here
        # rather than in the browser is what lets the page ask for one page at
        # a time instead of every row.
        search = (params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(employee__first_name__icontains=search)
                | Q(employee__last_name__icontains=search)
                | Q(project__name__icontains=search)
                | Q(project__customer__company_name__icontains=search)
            )
        
        # Status exclusion
        exclude_status = params.getlist('exclude_status')
        if exclude_status:
            queryset = queryset.exclude(status__in=exclude_status)
        
        # Date filters
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)
        
        # Include past entries (default: only today onwards for list views)
        # For detail actions (retrieve, update, destroy, approve, reject), always include past entries
        is_detail_action = self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'approve', 'reject']
        include_past = params.get('include_past', 'false').lower() == 'true'
        if not is_detail_action and not include_past and not start_date and not end_date:
            queryset = queryset.filter(work_date__gte=date.today())
        
        # Customer filter
        customer = params.get('customer')
        if customer:
            queryset = queryset.filter(project__customer_id=customer)
        
        # Project filter
        project = params.get('project')
        if project:
            queryset = queryset.filter(project_id=project)
        
        # Year filter (for calendar views)
        year = params.get('year')
        if year:
            queryset = queryset.filter(work_date__year=int(year))
        
        # Work date exact filter
        work_date = params.get('work_date')
        if work_date:
            queryset = queryset.filter(work_date=work_date)
        
        # Employee filter (for admin)
        employee_ids = params.getlist('employee')
        if employee_ids:
            queryset = queryset.filter(employee__user_id__in=employee_ids)
        
        # Supervisor (Outfolder/Rayon) filter
        supervisor = params.get('supervisor')
        if supervisor:
            queryset = queryset.filter(planned_supervisor_id=supervisor)
        
        # Week range filters - use work_date's ISO week for robust filtering
        # (billing_week fields might be NULL for newly created entries)
        week_year = params.get('week_year')
        week_number = params.get('week_number')
        
        # New cross-year range parameters
        week_start_year = params.get('week_start_year')
        week_start_number = params.get('week_start_number')
        week_end_year = params.get('week_end_year')
        week_end_number = params.get('week_end_number')
        
        # Legacy single-year range parameters (for backward compatibility)
        week_number_min = params.get('week_number_min')
        week_number_max = params.get('week_number_max')
        
        try:
            if week_start_year and week_start_number:
                # Cross-year range filter using date calculation
                from datetime import datetime, timedelta
                
                start_year = int(week_start_year)
                start_week = int(week_start_number)
                
                if week_end_year and week_end_number:
                    end_year = int(week_end_year)
                    end_week = int(week_end_number)
                else:
                    end_year = start_year
                    end_week = 53
                
                # Calculate start date (Monday of start week)
                # ISO week 1 is the week containing Jan 4
                start_date = datetime.strptime(f'{start_year}-W{start_week:02d}-1', '%G-W%V-%u').date()
                # Calculate end date (Sunday of end week)
                end_date = datetime.strptime(f'{end_year}-W{end_week:02d}-7', '%G-W%V-%u').date()
                
                # Filter by work_date within the calculated range
                queryset = queryset.filter(work_date__gte=start_date, work_date__lte=end_date)
                
            elif week_year and week_number:
                # Exact week match using date calculation
                from datetime import datetime
                year = int(week_year)
                wk = int(week_number)
                start_date = datetime.strptime(f'{year}-W{wk:02d}-1', '%G-W%V-%u').date()
                end_date = datetime.strptime(f'{year}-W{wk:02d}-7', '%G-W%V-%u').date()
                queryset = queryset.filter(work_date__gte=start_date, work_date__lte=end_date)
                
            elif week_year:
                # Legacy single-year range
                from datetime import datetime
                year = int(week_year)
                min_wk = int(week_number_min) if week_number_min else 1
                max_wk = int(week_number_max) if week_number_max else 53
                start_date = datetime.strptime(f'{year}-W{min_wk:02d}-1', '%G-W%V-%u').date()
                end_date = datetime.strptime(f'{year}-W{max_wk:02d}-7', '%G-W%V-%u').date()
                queryset = queryset.filter(work_date__gte=start_date, work_date__lte=end_date)
        except (ValueError, TypeError):
            pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkEntryDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return WorkEntryCreateSerializer
        if self.action == 'fill_data':
            return WorkEntryFillDataSerializer
        if self.action == 'approve':
            return WorkEntryApprovalSerializer
        if self.action == 'reject':
            return WorkEntryRejectionSerializer
        return WorkEntryListSerializer
    
    def get_permissions(self):
        if self.action in ['approve', 'reject', 'pending']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Create a work entry."""
        return super().create(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a work entry."""
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Totals over the whole filtered set, for a page that shows one page.

        The list page used to fetch every entry so it could add the hours up in
        the browser — the only reason it asked for 9999 rows. The same filters
        apply here as to the list, so the totals describe exactly the set the
        user is paging through, not just the rows on screen.

        The figures come from the same two model methods the list serializer
        uses for `surcharges_breakdown` and `hours_breakdown`, so a total can
        never disagree with the rows it covers.
        """
        entries = self.filter_queryset(self.get_queryset())

        count = 0
        hours = Decimal('0')
        night_hours = Decimal('0')
        base_amount = Decimal('0')
        surcharge_amount = Decimal('0')
        allowance_amount = Decimal('0')
        by_surcharge = {}

        def dec(value):
            return Decimal(str(value or 0))

        for entry in entries.iterator(chunk_size=500):
            breakdown = entry.get_hours_breakdown_detailed() or {}
            entry_hours = dec(entry.calculated_hours)

            count += 1
            hours += entry_hours
            night_hours += dec(breakdown.get('night_hours'))
            base_amount += entry_hours * dec(entry.get_service_rate())
            allowance_amount += dec(breakdown.get('total_allowances_amount'))

            for line in breakdown.get('surcharges') or []:
                surcharge_amount += dec(line.get('amount'))
                name = line.get('name') or 'Unknown'
                row = by_surcharge.setdefault(
                    name,
                    {'name': name, 'category': line.get('category'), 'hours': Decimal('0')})
                row['hours'] += dec(line.get('hours'))

        def money(value):
            return str(value.quantize(Decimal('0.01')))

        # The stat cards count by status over the same set, so one request
        # serves both them and the totals bar.
        # order_by() is cleared first: the list ordering would otherwise join
        # the GROUP BY and return one row per entry instead of one per status.
        status_counts = {
            row['status']: row['n']
            for row in entries.order_by().values('status').annotate(n=Count('id'))
        }

        return Response({
            'count': count,
            'status_counts': status_counts,
            'hours': money(hours),
            'night_hours': money(night_hours),
            'base_amount': money(base_amount),
            'surcharge_amount': money(surcharge_amount),
            'allowance_amount': money(allowance_amount),
            'total_amount': money(base_amount + surcharge_amount + allowance_amount),
            'surcharges': [
                {**row, 'hours': money(row['hours'])}
                for row in sorted(by_surcharge.values(), key=lambda r: r['name'])
            ],
        })

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Lightweight calendar endpoint — returns only dates and counts.
        
        Used by the Planning page to show dots/badges on the calendar
        without loading full work entry details.
        
        Query params: project (required), year (optional)
        Response: {"days": {"2026-02-12": 3, "2026-02-13": 1, ...}}
        """
        from django.db.models import Count
        
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        year = request.query_params.get('year', date.today().year)
        
        # Get employee filter if provided
        employee_ids = request.query_params.get('employee')
        
        qs = WorkEntry.objects.filter(
            project_id=project_id,
            work_date__year=int(year)
        )
        
        if employee_ids:
            ids = [eid.strip() for eid in employee_ids.split(',') if eid.strip()]
            qs = qs.filter(employee_id__in=ids)
        
        # Group by date and count
        counts = qs.values('work_date').annotate(count=Count('id')).order_by('work_date')
        
        days = {}
        for row in counts:
            days[str(row['work_date'])] = row['count']
        
        return Response({
            'days': days,
            'total_days': len(days),
        })
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create work entries in bulk (used by Planning page schedule).
        
        Creates one WorkEntry per employee per date.
        """
        serializer = WorkEntryBulkCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        
        return Response({
            'created_count': len(result['created']),
            'skipped_count': len(result['skipped']),
            'skipped': result['skipped'],
        }, status=status.HTTP_201_CREATED)
    
    # =========================================================================
    # LIST ACTIONS
    # =========================================================================
    
    @action(detail=False, methods=['get'])
    def my(self, request):
        """Get current user's work entries (for mobile app)."""
        user = request.user
        
        try:
            employee = EmployeeProfile.objects.get(user=user)
        except EmployeeProfile.DoesNotExist:
            return Response({'results': [], 'count': 0})
        
        queryset = self.queryset.filter(employee=employee)
        
        # Apply date filters
        params = request.query_params
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        include_past = params.get('include_past', 'false').lower() == 'true'
        
        # Exclude cancelled
        queryset = queryset.exclude(status='cancelled')
        
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        elif not include_past:
            queryset = queryset.filter(work_date__gte=date.today())
        
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)
        elif not include_past and not start_date:
            max_date = date.today() + timedelta(days=365)
            queryset = queryset.filter(work_date__lte=max_date)
        
        # Order by date
        queryset = queryset.order_by('work_date', 'planned_start_time')
        
        # Simple pagination
        page = int(params.get('page', 1))
        page_size = int(params.get('page_size', 20))
        total = queryset.count()
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        entries = queryset[start_idx:end_idx]
        serializer = WorkEntryListSerializer(entries, many=True)
        
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'has_more': end_idx < total,
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        """Get all entries pending approval (admin only)."""
        pending_statuses = ['submitted', 'pending']
        queryset = self.queryset.filter(status__in=pending_statuses)
        serializer = WorkEntryListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    # =========================================================================
    # EMPLOYEE ACTIONS
    # =========================================================================
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Employee confirms/acknowledges planned entry."""
        entry = self.get_object()
        
        if entry.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your entry'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            entry.confirm()
            return Response(WorkEntryDetailSerializer(entry).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def fill_data(self, request, pk=None):
        """Employee fills actual work times."""
        entry = self.get_object()
        
        if entry.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your entry'}, status=status.HTTP_403_FORBIDDEN)
        
        if not entry.can_fill_data:
            return Response(
                {'error': 'Cannot fill data - only allowed within 7 days and before approval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = WorkEntryFillDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        entry.actual_start_datetime = data['actual_start_datetime']
        entry.actual_end_datetime = data['actual_end_datetime']
        entry.breaks = data.get('breaks', [])
        entry.break_duration_minutes = data.get('break_duration_minutes', 0)
        entry.notes = data.get('notes', entry.notes)
        entry.status = WorkEntry.Status.DRAFT
        entry.save()
        
        return Response(WorkEntryDetailSerializer(entry).data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Employee submits entry for approval."""
        entry = self.get_object()
        
        if entry.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not your entry'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            entry.submit()
            self._notify_admins_entry_submitted(entry)
            return Response(WorkEntryDetailSerializer(entry).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # =========================================================================
    # ADMIN ACTIONS
    # =========================================================================
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Admin approves entry (can approve from any status)."""
        entry = self.get_object()
        
        # Skip if already approved
        if entry.status == 'approved':
            return Response({'error': 'Already approved'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = WorkEntryApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if serializer.validated_data.get('adjusted_hours'):
            entry.admin_adjusted_hours = serializer.validated_data['adjusted_hours']
        if serializer.validated_data.get('admin_notes'):
            entry.admin_notes = serializer.validated_data['admin_notes']
        
        entry.approve(request.user)
        self._create_wallet_earning(entry)
        self._notify_employee(entry, 'approved', 
            f"Your work entry for {entry.work_date} has been approved!")
        
        return Response(WorkEntryDetailSerializer(entry).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Admin rejects entry with reason (can reject from any status)."""
        entry = self.get_object()
        
        if entry.status == 'rejected':
            return Response({'error': 'Already rejected'}, status=status.HTTP_400_BAD_REQUEST)
        if entry.status == 'cancelled':
            return Response({'error': 'Cannot reject cancelled entries'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = WorkEntryRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason']
        
        was_approved = entry.status == WorkEntry.Status.APPROVED
        entry.reject(reason)
        if was_approved:
            # The wallet was credited on approval; withdrawing the approval has
            # to withdraw the credit, or the employee is paid for work that was
            # rejected.
            self._reverse_wallet_earning(entry, request.user)
        self._notify_employee(entry, 'rejected',
            f"Your work entry for {entry.work_date} needs revision. Reason: {reason}")
        
        return Response(WorkEntryDetailSerializer(entry).data)
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _reverse_wallet_earning(self, entry, actor=None):
        """Post a correcting movement when an approval is withdrawn."""
        from apps.wallet.services import reverse_work_entry

        try:
            return reverse_work_entry(entry, actor=actor)
        except Exception:
            logger.exception('Failed to reverse wallet credit for entry %s', entry.id)
            return None

    def _notify_admins_entry_submitted(self, entry):
        """Notify admins about new submission."""
        try:
            from apps.notifications.models import Notification
            from apps.employees.models import User
            
            for admin in User.objects.filter(is_staff=True, is_active=True):
                Notification.objects.create(
                    recipient=admin,
                    notification_type=Notification.Type.WORKLOG_SUBMITTED,
                    priority=Notification.Priority.NORMAL,
                    title=f"New Work Entry from {entry.employee.full_name}",
                    message=f"{entry.employee.full_name} submitted work entry for {entry.work_date} ({entry.calculated_hours}h).",
                    reference_type='workentry',
                    reference_id=entry.id,
                    action_url=f"/dashboard/worklogs?id={entry.id}"
                )
        except Exception as e:
            print(f"Failed to notify admins: {e}")
    
    def _notify_employee(self, entry, status_type, message):
        """Notify employee about entry status change."""
        try:
            from apps.notifications.models import Notification
            
            notification_type = (
                Notification.Type.WORKLOG_APPROVED if status_type == 'approved'
                else Notification.Type.WORKLOG_REJECTED
            )
            
            Notification.objects.create(
                recipient=entry.employee.user,
                notification_type=notification_type,
                priority=Notification.Priority.NORMAL if status_type == 'approved' else Notification.Priority.HIGH,
                title=f"Work Entry {status_type.title()}",
                message=message,
                reference_type='workentry',
                reference_id=entry.id,
                action_url=f"/app/entries/{entry.id}"
            )
        except Exception as e:
            print(f"Failed to notify employee: {e}")
    
    def _create_wallet_earning(self, entry):
        """
        Credit the employee's wallet for an approved work entry.

        The arithmetic and the idempotency both live in
        `apps.wallet.services`, so approval here, a bulk approval, and the
        backfill command all credit the same amount exactly once.
        """
        from apps.wallet.services import credit_work_entry

        try:
            return credit_work_entry(entry, actor=entry.approved_by)
        except Exception:
            # A wallet problem must never block an approval, but it must not
            # disappear either — this used to be a bare print().
            logger.exception('Failed to credit wallet for work entry %s', entry.id)
            return None

    # =========================================================================
    # PHOTO ACTIONS
    # =========================================================================
    
    @action(detail=True, methods=['post'], url_path='add_photo')
    def add_photo(self, request, pk=None):
        """Upload a photo to a work entry.
        
        Accepts multipart/form-data with:
        - photo: image file (required)
        - caption: text (optional)
        - photo_type: before/during/after/other (optional, default: after)
        """
        entry = self.get_object()
        
        # Only the employee who owns the entry or admin can upload
        if entry.employee.user != request.user and not request.user.is_admin:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = WorkEntryPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        photo = WorkEntryPhoto.objects.create(
            work_entry=entry,
            photo=serializer.validated_data['photo'],
            caption=serializer.validated_data.get('caption', ''),
            photo_type=serializer.validated_data.get('photo_type', 'after'),
            uploaded_by=request.user,
        )
        
        return Response(
            WorkEntryPhotoSerializer(photo, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'], url_path='photos')
    def list_photos(self, request, pk=None):
        """List all photos for a work entry."""
        entry = self.get_object()
        photos = entry.photos.all()
        serializer = WorkEntryPhotoSerializer(photos, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='photos/(?P<photo_id>[^/.]+)')
    def delete_photo(self, request, pk=None, photo_id=None):
        """Delete a specific photo from a work entry."""
        entry = self.get_object()
        
        try:
            photo = entry.photos.get(id=photo_id)
        except WorkEntryPhoto.DoesNotExist:
            return Response({'error': 'Photo not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only the uploader or admin can delete
        if photo.uploaded_by != request.user and not request.user.is_admin:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

