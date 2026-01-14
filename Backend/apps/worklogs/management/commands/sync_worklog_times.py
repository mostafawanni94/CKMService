"""
Management command to sync all WorkLog times with their linked ShiftTemplates.
"""
from django.core.management.base import BaseCommand
from datetime import datetime, timedelta

from apps.worklogs.models import WorkLog


class Command(BaseCommand):
    help = 'Sync all WorkLog times with their linked ShiftTemplates'

    def handle(self, *args, **options):
        synced_count = 0
        error_count = 0
        
        # Get all WorkLogs that have a shift_assignment
        worklogs = WorkLog.objects.filter(
            shift_assignment__isnull=False
        ).select_related(
            'shift_assignment__planned_day__shift_template'
        )
        
        self.stdout.write(f"Found {worklogs.count()} WorkLogs with shift assignments")
        
        for worklog in worklogs:
            try:
                template = worklog.shift_assignment.planned_day.shift_template
                
                # Check if times are different
                if worklog.start_time != template.start_time or worklog.end_time != template.end_time:
                    old_start = worklog.start_time
                    old_end = worklog.end_time
                    
                    # Update times from template
                    worklog.start_time = template.start_time
                    worklog.end_time = template.end_time
                    
                    # Update datetime fields if work_date exists
                    if worklog.work_date:
                        worklog.start_datetime = datetime.combine(worklog.work_date, template.start_time)
                        
                        # Handle overnight shifts
                        end_date = worklog.work_date
                        if template.end_time < template.start_time:
                            end_date = worklog.work_date + timedelta(days=1)
                        worklog.end_datetime = datetime.combine(end_date, template.end_time)
                    
                    worklog.save()
                    synced_count += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ WorkLog {worklog.id}: {old_start}-{old_end} → {template.start_time}-{template.end_time}"
                        )
                    )
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"  ❌ WorkLog {worklog.id}: {str(e)}")
                )
        
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Synced {synced_count} WorkLogs"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"❌ Errors: {error_count}"))
