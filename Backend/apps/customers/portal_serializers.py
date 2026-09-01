"""
Customer Portal API - Read-only endpoints for customer mobile app.

Customers can:
- View their company profile
- Browse their projects
- See work entries (who worked, when, breaks, photos)
- Filter by date, employee name
- Track project progress

Security: All data is scoped to the authenticated customer's company only.
"""

from rest_framework import serializers
from apps.projects.models import Project, ProjectAssignment
from apps.worklogs.models import WorkEntry, WorkEntryPhoto
from apps.customers.models import Customer


# =============================================================================
# CUSTOMER PROFILE
# =============================================================================

from apps.core.media import signed_media_url

class CustomerProfileSerializer(serializers.ModelSerializer):
    """Customer's own company profile (read-only)."""
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'company_name', 'logo_url',
            'street_name', 'house_number', 'house_number_addition',
            'postcode', 'city', 'country', 'website',
        ]
    
    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and request:
            return signed_media_url(obj.logo, request)
        return None


# =============================================================================
# PHOTO SERIALIZER (Customer-facing)
# =============================================================================

class CustomerPhotoSerializer(serializers.ModelSerializer):
    """Photo serializer for customer portal - read-only."""
    photo_url = serializers.SerializerMethodField()
    photo_type_display = serializers.CharField(source='get_photo_type_display', read_only=True)
    
    class Meta:
        model = WorkEntryPhoto
        fields = [
            'id', 'photo_url', 'caption', 'photo_type',
            'photo_type_display', 'taken_at',
        ]
    
    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return signed_media_url(obj.photo, request)
        return None


# =============================================================================
# PROJECT SERIALIZERS (Customer-facing)
# =============================================================================

class CustomerProjectListSerializer(serializers.ModelSerializer):
    """Lightweight project listing for customer dashboard."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_work_days = serializers.SerializerMethodField()
    completed_work_days = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    active_employees_count = serializers.SerializerMethodField()
    latest_photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 'status_display',
            'location', 'location_address', 'location_city',
            'start_date', 'expected_end_date', 'actual_end_date',
            'total_work_days', 'completed_work_days', 'progress_percentage',
            'active_employees_count', 'latest_photo_url',
            'created_at',
        ]
    
    def get_total_work_days(self, obj):
        return obj.work_entries.exclude(
            status__in=['cancelled', 'no_show']
        ).values('work_date').distinct().count()
    
    def get_completed_work_days(self, obj):
        return obj.work_entries.filter(
            status='approved'
        ).values('work_date').distinct().count()
    
    def get_progress_percentage(self, obj):
        total = self.get_total_work_days(obj)
        completed = self.get_completed_work_days(obj)
        if total == 0:
            return 0
        return round((completed / total) * 100)
    
    def get_active_employees_count(self, obj):
        return obj.assignments.filter(is_active=True).count()
    
    def get_latest_photo_url(self, obj):
        request = self.context.get('request')
        latest_photo = WorkEntryPhoto.objects.filter(
            work_entry__project=obj
        ).order_by('-taken_at').first()
        if latest_photo and latest_photo.photo and request:
            return signed_media_url(latest_photo.photo, request)
        return None


class CustomerProjectDetailSerializer(CustomerProjectListSerializer):
    """Full project detail for customer view."""
    employees = serializers.SerializerMethodField()
    work_dates_summary = serializers.SerializerMethodField()
    
    class Meta(CustomerProjectListSerializer.Meta):
        fields = CustomerProjectListSerializer.Meta.fields + [
            'employees', 'work_dates_summary', 'notes',
        ]
    
    def get_employees(self, obj):
        """Return list of employees assigned to this project (first name + role only)."""
        assignments = obj.assignments.filter(is_active=True).select_related('employee')
        employees = []
        seen = set()
        for assignment in assignments:
            emp = assignment.employee
            if emp.id not in seen:
                seen.add(emp.id)
                employees.append({
                    'id': str(emp.id),
                    'first_name': emp.first_name,
                    'last_name_initial': emp.last_name[0] + '.' if emp.last_name else '',
                    'role': assignment.get_role_display(),
                })
        return employees
    
    def get_work_dates_summary(self, obj):
        """Return a summary of work dates with counts."""
        from django.db.models import Count
        dates = obj.work_entries.exclude(
            status__in=['cancelled', 'no_show']
        ).values('work_date').annotate(
            workers_count=Count('employee', distinct=True)
        ).order_by('-work_date')[:30]  # Last 30 dates
        
        return [
            {
                'date': str(d['work_date']),
                'workers_count': d['workers_count'],
            }
            for d in dates
        ]


# =============================================================================
# WORK ENTRY SERIALIZERS (Customer-facing — NO financial/personal data)
# =============================================================================

class CustomerWorkEntrySerializer(serializers.ModelSerializer):
    """
    Work entry for customer view.
    
    Shows: who worked, when, hours, breaks, photos
    Does NOT show: BSN, salary, address, financial data
    """
    # Employee info (privacy-respecting)
    employee_first_name = serializers.CharField(source='employee.first_name', read_only=True)
    employee_last_initial = serializers.SerializerMethodField()
    employee_role = serializers.SerializerMethodField()
    
    # Project info
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    # Time info
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    calculated_hours = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    display_time_range = serializers.CharField(read_only=True)
    
    # Break info
    break_duration_minutes = serializers.IntegerField(read_only=True)
    breaks = serializers.JSONField(read_only=True)
    
    # Status
    status_display = serializers.SerializerMethodField()
    
    # Photos
    photos = CustomerPhotoSerializer(many=True, read_only=True)
    photos_count = serializers.SerializerMethodField()
    
    # Shift info
    shift_name = serializers.CharField(source='shift_template.name', read_only=True, allow_null=True)
    
    class Meta:
        model = WorkEntry
        fields = [
            'id', 'work_date', 'status', 'status_display',
            # Employee (privacy-safe)
            'employee_first_name', 'employee_last_initial', 'employee_role',
            # Project
            'project_name',
            # Times
            'start_time', 'end_time', 'calculated_hours', 'display_time_range',
            # Breaks
            'break_duration_minutes', 'breaks',
            # Shift
            'shift_name',
            # Photos
            'photos', 'photos_count',
            # Notes (employee notes only)
            'notes',
            # Timestamps
            'created_at',
        ]
    
    def get_employee_last_initial(self, obj):
        if obj.employee and obj.employee.last_name:
            return obj.employee.last_name[0] + '.'
        return ''
    
    def get_employee_role(self, obj):
        """Get employee's role from the project assignment."""
        assignment = ProjectAssignment.objects.filter(
            project=obj.project,
            employee=obj.employee,
            is_active=True,
        ).first()
        if assignment:
            return assignment.get_role_display()
        return 'Worker'
    
    def get_start_time(self, obj):
        from zoneinfo import ZoneInfo
        amsterdam_tz = ZoneInfo('Europe/Amsterdam')
        if obj.actual_start_datetime:
            dt = obj.actual_start_datetime
            if dt.tzinfo:
                dt = dt.astimezone(amsterdam_tz)
            return dt.strftime('%H:%M')
        if obj.planned_start_time:
            return obj.planned_start_time.strftime('%H:%M')
        return None
    
    def get_end_time(self, obj):
        from zoneinfo import ZoneInfo
        amsterdam_tz = ZoneInfo('Europe/Amsterdam')
        if obj.actual_end_datetime:
            dt = obj.actual_end_datetime
            if dt.tzinfo:
                dt = dt.astimezone(amsterdam_tz)
            return dt.strftime('%H:%M')
        if obj.planned_end_time:
            return obj.planned_end_time.strftime('%H:%M')
        return None
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_photos_count(self, obj):
        return obj.photos.count() if hasattr(obj, 'photos') else 0
