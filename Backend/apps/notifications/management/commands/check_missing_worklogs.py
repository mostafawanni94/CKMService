"""
Management command to remind employees about missing work logs.

Finds employees who had shifts but haven't submitted work logs for those dates.

Usage:
    python manage.py check_missing_worklogs
    python manage.py check_missing_worklogs --days=5  # Custom threshold
    python manage.py check_missing_worklogs --dry-run

Cron (daily at 10 AM):
    0 10 * * * cd /path/to/Backend && python manage.py check_missing_worklogs
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q


class Command(BaseCommand):
    help = 'Remind employees about missing work logs for past shifts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Days after shift before sending reminder (default: 3)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview only, do not create notifications',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(f'Checking for missing worklogs (shifts {days}+ days ago)...')
        
        today = timezone.now().date()
        cutoff_date = today - timedelta(days=days)
        
        count = self._check_missing_worklogs(cutoff_date, today, dry_run)
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Would create {count} reminders'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Created {count} missing worklog reminders'))
    
    def _check_missing_worklogs(self, cutoff_date, today, dry_run):
        """
        Find shifts that happened but employee didn't submit worklog.
        
        Logic:
        1. Find completed shifts (past dates)
        2. Check if worklog exists for that employee + date
        3. If not → send reminder
        """
        from apps.shifts.models import Shift
        from apps.worklogs.models import WorkLog
        from apps.notifications.models import Notification
        from apps.employees.models import EmployeeProfile
        
        count = 0
        
        # Find shifts that ended, cutoff_date <= shift_date < today
        # Only shifts that are "confirmed" or "completed"
        past_shifts = Shift.objects.filter(
            work_date__gte=cutoff_date,
            work_date__lt=today,
            status__in=['confirmed', 'completed', 'in_progress'],
        ).select_related('employee', 'employee__user')
        
        self.stdout.write(f'  Found {past_shifts.count()} past shifts to check')
        
        for shift in past_shifts:
            if not shift.employee:
                continue
            
            employee = shift.employee
            shift_date = shift.work_date
            
            # Check if worklog exists for this employee + date
            worklog_exists = WorkLog.objects.filter(
                employee=employee,
                work_date=shift_date,
            ).exists()
            
            if worklog_exists:
                continue  # Already logged
            
            # Check if we already sent a reminder for this shift
            already_reminded = Notification.objects.filter(
                notification_type='worklog_missing',
                reference_type='shift',
                reference_id=shift.id,
                created_at__gte=timezone.now() - timedelta(days=3),  # Don't spam
            ).exists()
            
            if already_reminded:
                continue
            
            # Check user preferences
            employee_user = employee.user
            if employee_user:
                from apps.notifications.notification_triggers import should_notify_user
                if not should_notify_user(employee_user, 'worklog_stale_pending'):
                    continue
            
            days_ago = (today - shift_date).days
            date_str = shift_date.strftime('%d/%m/%Y')
            employee_name = employee.full_name or str(employee)
            
            if dry_run:
                self.stdout.write(f'  📝 {employee_name}: missing worklog for {date_str} ({days_ago}d ago)')
            else:
                if employee_user:
                    notification = Notification.objects.create(
                        recipient=employee_user,
                        notification_type='worklog_missing',
                        category='worklogs',
                        priority='normal',
                        title='Log Your Hours',
                        message=f'You worked on {date_str} but haven\'t logged your hours yet. Tap to complete.',
                        reference_type='shift',
                        reference_id=shift.id,
                        action_url=f'/worklogs/add?date={shift_date.isoformat()}',
                    )
                    
                    # Send push notification / email if enabled
                    from apps.notifications.email_service import send_notification_email_if_enabled
                    send_notification_email_if_enabled(notification)
                    
                    self.stdout.write(self.style.SUCCESS(f'  ✅ Reminder sent to {employee_name} for {date_str}'))
            
            count += 1
        
        return count
