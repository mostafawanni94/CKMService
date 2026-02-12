"""Project API Views."""

from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.views import IsAdmin
from apps.employees.models import EmployeeProfile
from .models import Project, ProjectAssignment, ProjectShiftTemplate, ProjectPlannedDay
from .serializers import (
    ProjectListSerializer, ProjectDetailSerializer,
    ProjectAssignmentSerializer, ProjectShiftTemplateSerializer,
    ProjectPlannedDaySerializer, ProjectPlannedDayListSerializer,
    ProjectPlannedDayBulkCreateSerializer, BulkPlanSerializer,
)




class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for project management."""
    
    queryset = Project.objects.select_related(
        'customer', 'outfolder'
    ).prefetch_related('assignments', 'required_certificates').order_by('-created_at')
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectDetailSerializer
    
    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        # Handle multiple supervisors from request
        supervisors = self.request.data.get('supervisors', [])
        if supervisors:
            project.supervisors.set(supervisors)
    
    def perform_update(self, serializer):
        project = serializer.save(updated_by=self.request.user)
        # Handle multiple supervisors from request
        supervisors = self.request.data.get('supervisors')
        if supervisors is not None:
            project.supervisors.set(supervisors)
    
    @action(detail=True, methods=['get'])
    def eligible_employees(self, request, pk=None):
        """Get employees eligible for this project based on certificates."""
        project = self.get_object()
        required_certs = project.required_certificates.filter(
            is_mandatory=True
        ).values_list('certificate_type_id', flat=True)
        
        # Get approved employees with required certificates
        employees = EmployeeProfile.objects.filter(
            status=EmployeeProfile.ProfileStatus.APPROVED
        )
        
        # Filter by certificates if any required
        if required_certs:
            employees = employees.filter(
                certificates__certificate_type_id__in=required_certs,
                certificates__status='verified'
            ).distinct()
        
        from apps.employees.serializers import EmployeeProfileListSerializer
        serializer = EmployeeProfileListSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active projects."""
        active = self.queryset.filter(status=Project.Status.ACTIVE)
        serializer = ProjectListSerializer(active, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def shift_templates(self, request, pk=None):
        """Get shift templates for a project."""
        project = self.get_object()
        templates = project.shift_templates.filter(is_active=True)
        serializer = ProjectShiftTemplateSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def planned_days(self, request, pk=None):
        """Get planned days for a project with optional date filtering."""
        project = self.get_object()
        days = ProjectPlannedDay.objects.filter(
            shift_template__project=project
        ).select_related('shift_template', 'supervisor').prefetch_related('assignments__employee')
        
        # Optional date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            days = days.filter(date__gte=start_date)
        if end_date:
            days = days.filter(date__lte=end_date)
        
        serializer = ProjectPlannedDaySerializer(days, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def bulk_plan(self, request, pk=None):
        """
        Bulk create planned days with pattern support.
        
        Patterns:
        - weekdays: Monday through Friday
        - weekends: Saturday and Sunday
        - all: Every day
        - specific_days: Only specified days (mon, tue, wed, thu, fri, sat, sun)
        
        Example request:
        {
            "shift_template_id": "uuid-here",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "pattern": "weekdays",
            "required_workers": 1,
            "skip_existing": true
        }
        """
        project = self.get_object()
        
        # Validate shift template belongs to this project
        shift_template_id = request.data.get('shift_template_id')
        if shift_template_id:
            try:
                template = ProjectShiftTemplate.objects.get(id=shift_template_id, project=project)
            except ProjectShiftTemplate.DoesNotExist:
                return Response(
                    {'error': 'Shift template not found or does not belong to this project'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = BulkPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        
        return Response({
            'created_count': len(result['created']),
            'skipped_count': len(result['skipped']),
            'message': f"Created {len(result['created'])} days, skipped {len(result['skipped'])} existing days",
            'created_days': [{'date': str(d.date), 'id': str(d.id)} for d in result['created'][:20]],  # First 20
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def bulk_clear(self, request, pk=None):
        """
        Delete planned days within a date range.
        
        Example request:
        {
            "start_date": "2025-01-01",
            "end_date": "2025-03-31",
            "shift_template_id": "optional-uuid"  // If not provided, clears all templates
        }
        """
        project = self.get_object()
        
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        shift_template_id = request.data.get('shift_template_id')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        days_to_delete = ProjectPlannedDay.objects.filter(
            shift_template__project=project,
            date__gte=start_date,
            date__lte=end_date
        )
        
        if shift_template_id:
            days_to_delete = days_to_delete.filter(shift_template_id=shift_template_id)
        
        # Cascade delete associated work entries
        from apps.worklogs.models import WorkEntry
        work_entries_deleted = 0
        for day in days_to_delete:
            count, _ = WorkEntry.objects.filter(
                shift_template=day.shift_template,
                work_date=day.date
            ).delete()
            work_entries_deleted += count
        
        count = days_to_delete.count()
        days_to_delete.delete()
        
        return Response({
            'deleted_count': count,
            'work_entries_deleted': work_entries_deleted,
            'message': f"Deleted {count} planned days and {work_entries_deleted} work entries"
        })


class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for project assignments."""
    
    queryset = ProjectAssignment.objects.select_related(
        'project', 'employee'
    ).order_by('-created_at')
    serializer_class = ProjectAssignmentSerializer
    permission_classes = [IsAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        # TODO: Create notification for employee
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my(self, request):
        """Get current employee's project assignments."""
        from apps.employees.models import EmployeeProfile
        try:
            profile = EmployeeProfile.objects.get(user=request.user)
            assignments = ProjectAssignment.objects.filter(
                employee=profile
            ).select_related('project', 'project__customer')
            serializer = self.get_serializer(assignments, many=True)
            return Response(serializer.data)
        except EmployeeProfile.DoesNotExist:
            return Response([])


# =============================================================================
# SHIFT PLANNING VIEWSETS
# =============================================================================

class ProjectShiftTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing shift templates."""
    
    queryset = ProjectShiftTemplate.objects.select_related('project').order_by('start_time')
    serializer_class = ProjectShiftTemplateSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProjectPlannedDayViewSet(viewsets.ModelViewSet):
    """ViewSet for managing planned days."""
    
    queryset = ProjectPlannedDay.objects.select_related(
        'shift_template', 'supervisor'
    ).order_by('date')  # Removed assignments - now using WorkEntry
    serializer_class = ProjectPlannedDaySerializer
    permission_classes = [IsAdmin]
    pagination_class = None  # Disable pagination - calendar needs all days
    
    def get_serializer_class(self):
        """Use lightweight list serializer for list, detailed for single item."""
        if self.action == 'list':
            return ProjectPlannedDayListSerializer
        return ProjectPlannedDaySerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(shift_template__project_id=project_id)
        # Filter by shift template
        template_id = self.request.query_params.get('shift_template')
        if template_id:
            qs = qs.filter(shift_template_id=template_id)
        # Filter by year
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(date__year=int(year))
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        # Filter by employee(s) — comma-separated IDs
        employee_ids = self.request.query_params.get('employee')
        if employee_ids:
            from apps.worklogs.models import WorkEntry
            ids = [eid.strip() for eid in employee_ids.split(',') if eid.strip()]
            qs = qs.filter(
                date__in=WorkEntry.objects.filter(
                    employee_id__in=ids
                ).values('work_date'),
                shift_template__in=WorkEntry.objects.filter(
                    employee_id__in=ids
                ).values('shift_template')
            )
        return qs
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to cascade delete associated WorkEntry records."""
        from apps.worklogs.models import WorkEntry
        
        instance = self.get_object()
        # Delete associated work entries
        WorkEntry.objects.filter(
            shift_template=instance.shift_template,
            work_date=instance.date
        ).delete()
        # Then delete the planned day
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple planned days at once."""
        serializer = ProjectPlannedDayBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created_days = serializer.save()
        return Response({
            'created_count': len(created_days),
            'days': ProjectPlannedDaySerializer(created_days, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Delete multiple planned days and their associated work entries."""
        from apps.worklogs.models import WorkEntry
        
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete associated work entries for each planned day
        days_to_delete = ProjectPlannedDay.objects.filter(id__in=ids)
        work_entries_deleted = 0
        for day in days_to_delete:
            count, _ = WorkEntry.objects.filter(
                shift_template=day.shift_template,
                work_date=day.date
            ).delete()
            work_entries_deleted += count
        
        deleted_count, _ = days_to_delete.delete()
        return Response({
            'deleted_count': deleted_count,
            'work_entries_deleted': work_entries_deleted
        })
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Lightweight calendar endpoint - returns only dates and colors.
        
        Optimized for year view, minimal data transfer.
        Query params:
            - project: required project ID
            - year: optional year (defaults to current)
            - month: optional month for month-only view
        
        Response: {
            "days": {
                "2025-01-15": {"color": "#10B981", "count": 1},
                "2025-01-16": {"color": "#3B82F6", "count": 2}
            },
            "total_days": 25,
            "total_with_staff": 20
        }
        """
        from datetime import date
        
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        qs = ProjectPlannedDay.objects.filter(
            shift_template__project_id=project_id
        ).select_related('shift_template').only(
            'date', 'shift_template__color', 'required_workers'
        )
        # Note: assigned_count now calculated per day using WorkEntry
        
        # Filter by year
        if year:
            qs = qs.filter(date__year=int(year))
        else:
            qs = qs.filter(date__year=date.today().year)
        
        # Filter by month if specified
        if month:
            qs = qs.filter(date__month=int(month))
        
        # Build lightweight response - using WorkEntry for counts
        from django.db.models import Q
        from apps.worklogs.models import WorkEntry
        days = {}
        total_with_staff = 0
        
        for day in qs:
            date_str = day.date.isoformat()
            # Count work entries for this day - include shift_template matches and manual entries
            query = Q(shift_template=day.shift_template, work_date=day.date)
            if day.shift_template and day.shift_template.project_id:
                query |= Q(project_id=day.shift_template.project_id, work_date=day.date, shift_template__isnull=True)
            assigned_count = WorkEntry.objects.filter(query).count()
            is_staffed = assigned_count >= day.required_workers
            
            if date_str in days:
                days[date_str]['count'] += 1
            else:
                days[date_str] = {
                    'color': day.shift_template.color,
                    'count': 1,
                    'staffed': is_staffed,
                }
            
            if is_staffed:
                total_with_staff += 1
        
        return Response({
            'days': days,
            'total_days': len(days),
            'total_with_staff': total_with_staff,
        })
    
    @action(detail=False, methods=['get'])
    def unassigned_shifts(self, request):
        """Get shifts that have no employees assigned yet.
        
        Returns data formatted similarly to WorkEntry for display on Work Logs page.
        Used to show empty shifts that need employee assignments.
        """
        from django.db.models import Q
        from apps.worklogs.models import WorkEntry
        
        # Get all planned days
        qs = self.get_queryset()
        
        # Apply project filter if provided
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(shift_template__project_id=project_id)
        
        # Apply date filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        
        # Filter to only those with no work entries
        unassigned = []
        for day in qs:
            query = Q(shift_template=day.shift_template, work_date=day.date)
            if day.shift_template and day.shift_template.project_id:
                query |= Q(project_id=day.shift_template.project_id, work_date=day.date, shift_template__isnull=True)
            
            if not WorkEntry.objects.filter(query).exists():
                unassigned.append({
                    'id': str(day.id),
                    'type': 'unassigned_shift',  # Marker to distinguish from work entries
                    'work_date': day.date.isoformat(),
                    'project': str(day.shift_template.project_id) if day.shift_template else None,
                    'project_name': day.shift_template.project.name if day.shift_template and day.shift_template.project else None,
                    'customer_name': day.shift_template.project.customer.name if day.shift_template and day.shift_template.project and day.shift_template.project.customer else None,
                    'shift_template': str(day.shift_template_id) if day.shift_template else None,
                    'shift_name': day.shift_template.name if day.shift_template else 'Shift',
                    'shift_color': day.shift_template.color if day.shift_template else '#6B7280',
                    'start_time': day.shift_template.start_time.strftime('%H:%M') if day.shift_template and day.shift_template.start_time else None,
                    'end_time': day.shift_template.end_time.strftime('%H:%M') if day.shift_template and day.shift_template.end_time else None,
                    'status': 'unassigned',
                    'employee': None,
                    'employee_name': 'No employee assigned',
                    'required_workers': day.required_workers,
                })
        
        return Response({
            'results': unassigned,
            'count': len(unassigned)
        })


# ShiftAssignmentViewSet has been removed - use WorkEntryViewSet instead
# See apps.worklogs.views.WorkEntryViewSet

