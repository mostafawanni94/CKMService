"""Project Serializers."""

from rest_framework import serializers
from apps.employees.models import EmployeeProfile
from .models import (
    Project, ProjectAssignment, ProjectRequiredCertificate,
    ProjectShiftTemplate, ProjectPlannedDay
)


class ProjectRequiredCertificateSerializer(serializers.ModelSerializer):
    certificate_name = serializers.CharField(source='certificate_type.name', read_only=True)
    
    class Meta:
        model = ProjectRequiredCertificate
        fields = ['id', 'certificate_type', 'certificate_name', 'is_mandatory']


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    project_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectAssignment
        fields = [
            'id', 'project', 'project_info', 'employee', 'employee_name', 'role', 'role_display',
            'assignment_type', 'start_date', 'end_date', 'is_active', 'notes',
            'is_exception', 'exception_reason', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_project_info(self, obj):
        """Return project with customer info for Flutter."""
        if not obj.project:
            return None
        return {
            'id': obj.project.id,
            'name': obj.project.name,
            'location': obj.project.location,
            'address': obj.project.address,
            'city': obj.project.city,
            'customer': {
                'id': obj.project.customer.id,
                'company_name': obj.project.customer.company_name,
            } if obj.project.customer else None
        }


class ProjectListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    assignments_count = serializers.IntegerField(source='assignments.count', read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'location', 'location_address', 'location_postcode', 'location_city',
            'customer', 'customer_name', 'status', 'start_date', 'assignments_count', 'created_at'
        ]


class ProjectDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.company_name', read_only=True)
    outfolder_name = serializers.CharField(source='outfolder.full_name', read_only=True)
    assignments = ProjectAssignmentSerializer(many=True, read_only=True)
    required_certificates = ProjectRequiredCertificateSerializer(many=True, read_only=True)
    supervisors_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by',
                           'is_deleted', 'deleted_at', 'deleted_by']
    
    def get_supervisors_list(self, obj):
        return [{
            'id': str(s.id),
            'first_name': s.first_name,
            'last_name': s.last_name,
            'company_name': s.company_name,
            'contacts': [
                {'contact_type': c.contact_type, 'value': c.value}
                for c in s.contacts.all()
            ]
        } for s in obj.supervisors.all()]


# =============================================================================
# SHIFT PLANNING SERIALIZERS
# =============================================================================

class ProjectShiftTemplateSerializer(serializers.ModelSerializer):
    """Serializer for shift templates."""
    project_name = serializers.CharField(source='project.name', read_only=True)
    planned_days_count = serializers.IntegerField(source='planned_days.count', read_only=True)
    
    class Meta:
        model = ProjectShiftTemplate
        fields = [
            'id', 'project', 'project_name', 'name', 'start_time', 'end_time',
            'color', 'description', 'is_active', 'planned_days_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ShiftAssignment model has been removed - use WorkEntry instead
# See apps.worklogs.serializers.WorkEntryListSerializer


class ProjectPlannedDayListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing planned days.
    
    Returns only counts, not full work_entries, for better performance.
    Used in list actions where we only need to show summary info.
    """
    shift_name = serializers.CharField(source='shift_template.name', read_only=True)
    shift_color = serializers.CharField(source='shift_template.color', read_only=True)
    shift_start_time = serializers.TimeField(source='shift_template.start_time', read_only=True)
    shift_end_time = serializers.TimeField(source='shift_template.end_time', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True, default='')
    project_id = serializers.UUIDField(source='shift_template.project.id', read_only=True)
    project_name = serializers.CharField(source='shift_template.project.name', read_only=True)
    # Only counts, no full work_entries array - much lighter payload
    assigned_count = serializers.SerializerMethodField()
    is_fully_staffed = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectPlannedDay
        fields = [
            'id', 'shift_template', 'shift_name', 'shift_color', 'shift_start_time',
            'shift_end_time', 'date', 'supervisor', 'supervisor_name', 'required_workers',
            'notes', 'project_id', 'project_name', 'assigned_count',
            'is_fully_staffed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_assigned_count(self, obj):
        """Count work entries for this planned day."""
        from django.db.models import Q
        from apps.worklogs.models import WorkEntry
        
        project_id = obj.shift_template.project_id if obj.shift_template else None
        
        query = Q(shift_template=obj.shift_template, work_date=obj.date)
        if project_id:
            query |= Q(project_id=project_id, work_date=obj.date, shift_template__isnull=True)
        
        return WorkEntry.objects.filter(query).count()
    
    def get_is_fully_staffed(self, obj):
        """Check if we have enough workers assigned."""
        assigned = self.get_assigned_count(obj)
        return assigned >= obj.required_workers


class ProjectPlannedDaySerializer(serializers.ModelSerializer):
    """Detailed serializer for a single planned day.
    
    Includes full work_entries array with employee details.
    Used for retrieve actions when viewing a single shift.
    """
    shift_name = serializers.CharField(source='shift_template.name', read_only=True)
    shift_color = serializers.CharField(source='shift_template.color', read_only=True)
    shift_start_time = serializers.TimeField(source='shift_template.start_time', read_only=True)
    shift_end_time = serializers.TimeField(source='shift_template.end_time', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True, default='')
    project_id = serializers.UUIDField(source='shift_template.project.id', read_only=True)
    project_name = serializers.CharField(source='shift_template.project.name', read_only=True)
    # Work entries for this planned day (replaces old assignments)
    work_entries = serializers.SerializerMethodField()
    assigned_count = serializers.SerializerMethodField()
    is_fully_staffed = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectPlannedDay
        fields = [
            'id', 'shift_template', 'shift_name', 'shift_color', 'shift_start_time',
            'shift_end_time', 'date', 'supervisor', 'supervisor_name', 'required_workers',
            'notes', 'project_id', 'project_name', 'work_entries', 'assigned_count',
            'is_fully_staffed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_work_entries(self, obj):
        """Get work entries for this planned day from WorkEntry model.
        
        Matches entries by shift_template+date OR project+date for manual entries.
        """
        from django.db.models import Q
        from apps.worklogs.models import WorkEntry
        
        # Get project ID from shift template
        project_id = obj.shift_template.project_id if obj.shift_template else None
        
        # Query by shift_template OR by project+date (for manual entries)
        query = Q(shift_template=obj.shift_template, work_date=obj.date)
        if project_id:
            query |= Q(project_id=project_id, work_date=obj.date, shift_template__isnull=True)
        
        entries = WorkEntry.objects.filter(query).select_related('employee')[:10]
        return [{
            'id': str(e.id),
            'employee_id': str(e.employee.id),
            'employee_name': e.employee.full_name,
            'status': e.status,
            'calculated_hours': str(e.calculated_hours) if e.calculated_hours else '0',
        } for e in entries]
    
    def get_assigned_count(self, obj):
        """Count work entries for this planned day.
        
        Includes both scheduled entries and manual entries for the same project+date.
        """
        from django.db.models import Q
        from apps.worklogs.models import WorkEntry
        
        project_id = obj.shift_template.project_id if obj.shift_template else None
        
        query = Q(shift_template=obj.shift_template, work_date=obj.date)
        if project_id:
            query |= Q(project_id=project_id, work_date=obj.date, shift_template__isnull=True)
        
        return WorkEntry.objects.filter(query).count()
    
    def get_is_fully_staffed(self, obj):
        """Check if we have enough workers assigned."""
        assigned = self.get_assigned_count(obj)
        return assigned >= obj.required_workers



class ProjectPlannedDayBulkCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating planned days with employee assignments.
    
    Supports:
    - Creating multiple planned days at once
    - Optionally assigning employees to all created days
    - Smart notifications (only if 3 or fewer assignments created)
    """
    shift_template = serializers.PrimaryKeyRelatedField(queryset=ProjectShiftTemplate.objects.all())
    dates = serializers.ListField(child=serializers.DateField())
    employee_ids = serializers.ListField(
        child=serializers.UUIDField(),  # EmployeeProfile UUIDs
        required=False,
        default=[],
        help_text="Optional: EmployeeProfile UUIDs to assign to all created days"
    )
    supervisor = serializers.UUIDField(required=False, allow_null=True)
    service = serializers.IntegerField(required=False, allow_null=True, help_text="Service ID for pricing")
    location_override = serializers.CharField(required=False, allow_blank=True, max_length=500)
    required_workers = serializers.IntegerField(default=1, min_value=1)
    
    def validate_supervisor(self, value):
        if value:
            from apps.customers.models import Outfolder
            if not Outfolder.objects.filter(id=value).exists():
                raise serializers.ValidationError("Supervisor not found")
        return value
    
    def validate_employee_ids(self, value):
        """Validate that employee_ids are valid EmployeeProfile UUIDs."""
        if value:
            from apps.employees.models import EmployeeProfile
            profiles = EmployeeProfile.objects.filter(id__in=value)
            found_ids = {str(p.id) for p in profiles}
            for emp_id in value:
                if str(emp_id) not in found_ids:
                    raise serializers.ValidationError(f"Employee with ID {emp_id} not found")
        return value
    
    def create(self, validated_data):
        from apps.employees.models import EmployeeProfile
        from apps.worklogs.models import WorkEntry
        
        dates = validated_data.pop('dates')
        shift_template = validated_data['shift_template']
        employee_ids = validated_data.get('employee_ids', [])  # These are EmployeeProfile UUIDs
        created_days = []
        all_work_entries = []
        skipped_conflicts = []
        
        # Lookup EmployeeProfiles by their ID (UUID)
        profiles_by_id = {}
        if employee_ids:
            profiles = EmployeeProfile.objects.filter(id__in=employee_ids)
            profiles_by_id = {str(p.id): p for p in profiles}
        
        # Get supervisor if provided
        supervisor = None
        supervisor_id = validated_data.get('supervisor')
        if supervisor_id:
            from apps.customers.models import Outfolder
            try:
                supervisor = Outfolder.objects.get(id=supervisor_id)
            except Outfolder.DoesNotExist:
                pass
        
        # Get service if provided
        service = None
        service_id = validated_data.get('service')
        if service_id:
            from apps.customers.models import Service
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                pass
        
        # Get location override if provided
        location_override = validated_data.get('location_override', '')
        
        # Create planned days
        for date in dates:
            day, created = ProjectPlannedDay.objects.get_or_create(
                shift_template=shift_template,
                date=date,
                defaults={
                    'supervisor_id': supervisor_id,
                    'required_workers': max(validated_data.get('required_workers', 1), len(employee_ids))
                }
            )
            if created:
                created_days.append(day)
            
            # Create assignments and WorkEntry for this day
            for emp_id in employee_ids:
                profile = profiles_by_id.get(str(emp_id))
                if profile:
                    # Check if employee is already assigned to ANY shift on this date (same project)
                    existing_entry = WorkEntry.objects.filter(
                        employee=profile,
                        work_date=date,
                        project=shift_template.project
                    ).first()
                    
                    if existing_entry:
                        # Skip - employee already has a work entry on this date for this project
                        skipped_conflicts.append({
                            'employee': profile.full_name,
                            'date': str(date),
                            'existing_shift': existing_entry.shift_template.name if existing_entry.shift_template else 'Manual Entry'
                        })
                        continue
                    
                    # Create WorkEntry (unified table - single source of truth)
                    defaults = {
                        'project': shift_template.project,
                        'status': 'planned',
                        'planned_start_time': shift_template.start_time,
                        'planned_end_time': shift_template.end_time,
                        'planned_supervisor': supervisor,
                    }
                    # Add optional fields if provided
                    if service:
                        defaults['service'] = service
                    if location_override:
                        defaults['location_override'] = location_override
                    
                    work_entry, entry_created = WorkEntry.objects.get_or_create(
                        employee=profile,
                        work_date=date,
                        shift_template=shift_template,
                        defaults=defaults
                    )
                    if entry_created:
                        all_work_entries.append(work_entry)
        
        # Send notifications if 3 or fewer assignments created
        if len(all_work_entries) > 0 and len(all_work_entries) <= 3:
            self._send_assignment_notifications(all_work_entries)
        
        return created_days
    
    def _send_assignment_notifications(self, work_entries):
        """Send push notifications for newly created work entries."""
        try:
            from apps.notifications.models import Notification
            
            for entry in work_entries:
                Notification.objects.create(
                    recipient=entry.employee.user,
                    title="New Shift Assignment",
                    message=f"You have been assigned to {entry.shift_template.name if entry.shift_template else 'a shift'} on {entry.work_date.strftime('%A, %B %d, %Y')} at {entry.project.name}.",
                    notification_type='shift_assignment',
                    priority='normal',
                    reference_type='workentry',
                    reference_id=entry.id,
                )
        except Exception as e:
            # Don't fail the whole operation if notifications fail
            import logging
            logging.getLogger(__name__).warning(f"Failed to send shift notifications: {e}")


class BulkPlanSerializer(serializers.Serializer):
    """
    Advanced bulk planning with date patterns.
    
    Supports: weekdays, weekends, all, specific_days (mon, tue, wed, etc.)
    """
    shift_template_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    pattern = serializers.ChoiceField(
        choices=['weekdays', 'weekends', 'all', 'specific_days'],
        default='weekdays'
    )
    specific_days = serializers.ListField(
        child=serializers.ChoiceField(choices=['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
        required=False,
        default=[]
    )
    supervisor_id = serializers.UUIDField(required=False, allow_null=True)
    required_workers = serializers.IntegerField(default=1, min_value=1)
    skip_existing = serializers.BooleanField(default=True)
    
    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("start_date must be before end_date")
        
        # Validate shift template exists
        from apps.projects.models import ProjectShiftTemplate
        try:
            data['shift_template'] = ProjectShiftTemplate.objects.get(id=data['shift_template_id'])
        except ProjectShiftTemplate.DoesNotExist:
            raise serializers.ValidationError({"shift_template_id": "Shift template not found"})
        
        # Validate supervisor if provided
        if data.get('supervisor_id'):
            from apps.customers.models import Outfolder
            try:
                data['supervisor'] = Outfolder.objects.get(id=data['supervisor_id'])
            except Outfolder.DoesNotExist:
                raise serializers.ValidationError({"supervisor_id": "Supervisor not found"})
        else:
            data['supervisor'] = None
        
        # Require specific_days for specific_days pattern
        if data['pattern'] == 'specific_days' and not data.get('specific_days'):
            raise serializers.ValidationError({"specific_days": "Required when pattern is 'specific_days'"})
        
        return data
    
    def _day_matches_pattern(self, date, pattern, specific_days):
        """Check if a date matches the specified pattern."""
        weekday = date.weekday()  # 0=Monday, 6=Sunday
        weekday_names = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        
        if pattern == 'weekdays':
            return weekday < 5  # Mon-Fri
        elif pattern == 'weekends':
            return weekday >= 5  # Sat-Sun
        elif pattern == 'all':
            return True
        elif pattern == 'specific_days':
            return weekday_names[weekday] in specific_days
        return False
    
    def create(self, validated_data):
        from datetime import timedelta
        
        shift_template = validated_data['shift_template']
        start_date = validated_data['start_date']
        end_date = validated_data['end_date']
        pattern = validated_data['pattern']
        specific_days = validated_data.get('specific_days', [])
        supervisor = validated_data.get('supervisor')
        required_workers = validated_data.get('required_workers', 1)
        skip_existing = validated_data.get('skip_existing', True)
        
        created_days = []
        skipped_days = []
        current_date = start_date
        
        while current_date <= end_date:
            if self._day_matches_pattern(current_date, pattern, specific_days):
                if skip_existing:
                    day, created = ProjectPlannedDay.objects.get_or_create(
                        shift_template=shift_template,
                        date=current_date,
                        defaults={
                            'supervisor': supervisor,
                            'required_workers': required_workers
                        }
                    )
                    if created:
                        created_days.append(day)
                    else:
                        skipped_days.append(current_date)
                else:
                    day = ProjectPlannedDay.objects.create(
                        shift_template=shift_template,
                        date=current_date,
                        supervisor=supervisor,
                        required_workers=required_workers
                    )
                    created_days.append(day)
            
            current_date += timedelta(days=1)
        
        return {
            'created': created_days,
            'skipped': skipped_days
        }
