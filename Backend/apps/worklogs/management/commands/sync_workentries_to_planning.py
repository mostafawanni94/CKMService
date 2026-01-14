"""
Management command to sync WorkEntries with ProjectPlannedDay.
This ensures all existing work entries appear in the Planning calendar.
Run with: python manage.py sync_workentries_to_planning
"""

from django.core.management.base import BaseCommand
from apps.worklogs.models import WorkEntry
from apps.projects.models import ProjectPlannedDay, ProjectShiftTemplate


class Command(BaseCommand):
    help = 'Sync existing WorkEntries to ProjectPlannedDay for Planning visibility'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get all work entries
        entries = WorkEntry.objects.select_related('project', 'shift_template').all()
        
        created_templates = 0
        created_planned_days = 0
        
        for entry in entries:
            if not entry.project or not entry.work_date:
                continue
            
            # Ensure shift template exists
            template = entry.shift_template
            if not template:
                if dry_run:
                    self.stdout.write(f"Would create Manual Entry template for project {entry.project.name}")
                else:
                    template, created = ProjectShiftTemplate.objects.get_or_create(
                        project=entry.project,
                        name='Manual Entry',
                        defaults={
                            'start_time': '09:00:00',
                            'end_time': '17:00:00',
                            'color': '#6B7280',
                            'is_active': True,
                        }
                    )
                    if created:
                        created_templates += 1
                    
                    # Update the work entry with the template
                    entry.shift_template = template
                    entry.save(update_fields=['shift_template'])
            
            # Ensure ProjectPlannedDay exists
            if template:
                exists = ProjectPlannedDay.objects.filter(
                    shift_template=template,
                    date=entry.work_date
                ).exists()
                
                if not exists:
                    if dry_run:
                        self.stdout.write(f"Would create PlannedDay for {entry.work_date} ({template.name})")
                    else:
                        ProjectPlannedDay.objects.create(
                            shift_template=template,
                            date=entry.work_date,
                            required_workers=1,
                            supervisor=entry.planned_supervisor,
                        )
                        created_planned_days += 1
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes made'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Created {created_templates} templates and {created_planned_days} planned days'
            ))
