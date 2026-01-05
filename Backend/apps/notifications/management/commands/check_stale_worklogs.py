"""
Management command to check for stale worklogs.

Finds worklogs that have been pending or rejected for too long
and sends reminder notifications.

Usage:
    python manage.py check_stale_worklogs
    python manage.py check_stale_worklogs --days=5  # Custom threshold
    python manage.py check_stale_worklogs --dry-run  # Preview only

Cron (daily at 9 AM):
    0 9 * * * cd /path/to/Backend && python manage.py check_stale_worklogs
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Check for stale worklogs and send reminders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Number of days before worklog is considered stale (default: 3)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without creating notifications',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(f'Checking for stale worklogs (>{days} days)...')
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        pending_count = self._check_pending_worklogs(cutoff_date, dry_run)
        rejected_count = self._check_rejected_worklogs(cutoff_date, dry_run)
        
        total = pending_count + rejected_count
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Would create {total} notifications'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created {total} stale worklog notifications'))
    
    def _check_pending_worklogs(self, cutoff_date, dry_run):
        """
        Find worklogs submitted but not approved for too long.
        Notify ADMIN to take action.
        """
        from apps.worklogs.models import WorkLog
        from apps.notifications.models import Notification
        from apps.employees.models import User
        
        stale_pending = WorkLog.objects.filter(
            status='submitted',
            submitted_at__lt=cutoff_date,
        ).select_related('employee', 'employee__user')
        
        count = 0
        admin = User.objects.filter(is_staff=True, is_active=True).first()
        
        if not admin:
            self.stdout.write(self.style.WARNING('No admin user found'))
            return 0
        
        for worklog in stale_pending:
            # Check if reminder already sent today
            already_notified = Notification.objects.filter(
                notification_type='worklog_stale_pending',
                reference_type='worklog',
                reference_id=worklog.id,
                created_at__date=timezone.now().date(),
            ).exists()
            
            if already_notified:
                continue
            
            days_pending = (timezone.now() - worklog.submitted_at).days
            employee_name = str(worklog.employee) if worklog.employee else 'Unknown'
            work_date = worklog.work_date.strftime('%d/%m/%Y') if worklog.work_date else 'N/A'
            
            if dry_run:
                self.stdout.write(f'  📋 Pending {days_pending}d: {employee_name} - {work_date}')
            else:
                notification = Notification.objects.create(
                    recipient=admin,
                    notification_type='worklog_stale_pending',
                    category='worklogs',
                    priority='high',
                    title=f'Work Log Pending {days_pending} Days',
                    message=f'{employee_name}\'s work log for {work_date} awaits approval',
                    reference_type='worklog',
                    reference_id=worklog.id,
                    action_url='/dashboard/worklogs?status=submitted',
                )
                
                # Send email
                from apps.notifications.email_service import send_notification_email_if_enabled
                send_notification_email_if_enabled(notification)
            
            count += 1
        
        self.stdout.write(f'  → Found {count} stale pending worklogs')
        return count
    
    def _check_rejected_worklogs(self, cutoff_date, dry_run):
        """
        Find worklogs rejected but not revised for too long.
        Notify EMPLOYEE to fix and resubmit.
        """
        from apps.worklogs.models import WorkLog
        from apps.notifications.models import Notification
        
        stale_rejected = WorkLog.objects.filter(
            status='rejected',
            updated_at__lt=cutoff_date,
        ).select_related('employee', 'employee__user')
        
        count = 0
        
        for worklog in stale_rejected:
            employee_user = worklog.employee.user if worklog.employee else None
            if not employee_user:
                continue
            
            # Check if reminder already sent today
            already_notified = Notification.objects.filter(
                notification_type='worklog_stale_rejected',
                reference_type='worklog',
                reference_id=worklog.id,
                created_at__date=timezone.now().date(),
            ).exists()
            
            if already_notified:
                continue
            
            days_rejected = (timezone.now() - worklog.updated_at).days
            work_date = worklog.work_date.strftime('%d/%m/%Y') if worklog.work_date else 'N/A'
            
            if dry_run:
                self.stdout.write(f'  ❌ Rejected {days_rejected}d: {worklog.employee} - {work_date}')
            else:
                notification = Notification.objects.create(
                    recipient=employee_user,
                    notification_type='worklog_stale_rejected',
                    category='worklogs',
                    priority='high',
                    title=f'Reminder: Rejected Work Log',
                    message=f'Your work log for {work_date} was rejected {days_rejected} days ago. Please revise and resubmit.',
                    reference_type='worklog',
                    reference_id=worklog.id,
                    action_url=f'/dashboard/worklogs/{worklog.id}',
                )
                
                from apps.notifications.email_service import send_notification_email_if_enabled
                send_notification_email_if_enabled(notification)
            
            count += 1
        
        self.stdout.write(f'  → Found {count} stale rejected worklogs')
        return count
