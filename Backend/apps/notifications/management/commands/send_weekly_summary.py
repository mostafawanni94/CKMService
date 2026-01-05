"""
Management command to send weekly summary emails.

Usage:
    python manage.py send_weekly_summary

This should be run every Monday via cron:
    0 8 * * 1 cd /path/to/project && python manage.py send_weekly_summary
    (Every Monday at 8 AM)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum
from decimal import Decimal

from apps.core.models import SystemConfig
from apps.employees.models import User


class Command(BaseCommand):
    help = 'Send weekly summary report to admins'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show summary without sending email',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        config = SystemConfig.objects.get_config()
        
        # Check if weekly summary is enabled
        if not getattr(config, 'weekly_summary_enabled', True):
            self.stdout.write(self.style.WARNING('Weekly summary is disabled'))
            return
        
        # Get date range (last 7 days)
        today = timezone.now().date()
        week_start = today - timedelta(days=7)
        week_end = today - timedelta(days=1)
        
        self.stdout.write(f'Generating summary for {week_start} to {week_end}')
        
        # Collect stats
        stats = self._collect_stats(week_start, week_end)
        
        if dry_run:
            self._print_summary(stats, week_start, week_end)
        else:
            self._send_summary_email(stats, week_start, week_end, config)
            self._create_summary_notification(stats)
        
        self.stdout.write(self.style.SUCCESS('Weekly summary completed'))
    
    def _collect_stats(self, week_start, week_end):
        """Collect statistics for the week (lightweight queries)."""
        from apps.worklogs.models import WorkLog
        from apps.employees.models import EmployeeProfile
        from apps.notifications.models import Notification
        
        stats = {}
        
        # WorkLog stats
        worklogs = WorkLog.objects.filter(
            work_date__gte=week_start,
            work_date__lte=week_end
        )
        stats['worklogs_total'] = worklogs.count()
        stats['worklogs_approved'] = worklogs.filter(status='approved').count()
        stats['worklogs_pending'] = worklogs.filter(status='submitted').count()
        stats['worklogs_rejected'] = worklogs.filter(status='rejected').count()
        
        # Total hours (only approved)
        approved_hours = worklogs.filter(status='approved').aggregate(
            total=Sum('admin_adjusted_hours')
        )['total'] or Decimal('0')
        stats['total_hours'] = float(approved_hours)
        
        # Employee stats
        stats['new_employees'] = User.objects.filter(
            created_at__date__gte=week_start,
            created_at__date__lte=week_end,
            is_staff=False
        ).count()
        
        stats['pending_profiles'] = EmployeeProfile.objects.filter(
            status='pending'
        ).count()
        
        # Notification stats
        stats['notifications_sent'] = Notification.objects.filter(
            created_at__date__gte=week_start,
            created_at__date__lte=week_end
        ).count()
        
        return stats
    
    def _print_summary(self, stats, week_start, week_end):
        """Print summary to console (dry run)."""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f'  WEEKLY SUMMARY: {week_start} - {week_end}')
        self.stdout.write('='*50)
        self.stdout.write(f'\n📝 Work Logs:')
        self.stdout.write(f'   Total: {stats["worklogs_total"]}')
        self.stdout.write(f'   Approved: {stats["worklogs_approved"]}')
        self.stdout.write(f'   Pending: {stats["worklogs_pending"]}')
        self.stdout.write(f'   Rejected: {stats["worklogs_rejected"]}')
        self.stdout.write(f'   Total Hours: {stats["total_hours"]:.1f}')
        self.stdout.write(f'\n👤 Employees:')
        self.stdout.write(f'   New This Week: {stats["new_employees"]}')
        self.stdout.write(f'   Profiles Pending: {stats["pending_profiles"]}')
        self.stdout.write(f'\n🔔 Notifications Sent: {stats["notifications_sent"]}')
        self.stdout.write('='*50 + '\n')
    
    def _send_summary_email(self, stats, week_start, week_end, config):
        """Send summary email to notification recipients."""
        from apps.notifications.email_service import EmailService
        
        if not config.smtp_enabled:
            self.stdout.write(self.style.WARNING('SMTP is disabled'))
            return
        
        recipients = config.notification_recipients or []
        if not recipients:
            self.stdout.write(self.style.WARNING('No recipients configured'))
            return
        
        subject = f'Weekly Summary: {week_start.strftime("%d %b")} - {week_end.strftime("%d %b %Y")}'
        
        # Build HTML content
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1E3A5F;">📊 Weekly Summary</h2>
            <p style="color: #6B7280;">{week_start.strftime("%d %b")} - {week_end.strftime("%d %b %Y")}</p>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">📝 Work Logs</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td>Total</td><td style="text-align: right; font-weight: bold;">{stats['worklogs_total']}</td></tr>
                    <tr><td>Approved</td><td style="text-align: right; color: #10B981;">{stats['worklogs_approved']}</td></tr>
                    <tr><td>Pending</td><td style="text-align: right; color: #F59E0B;">{stats['worklogs_pending']}</td></tr>
                    <tr><td>Rejected</td><td style="text-align: right; color: #EF4444;">{stats['worklogs_rejected']}</td></tr>
                    <tr style="border-top: 1px solid #D1D5DB;"><td>Total Hours</td><td style="text-align: right; font-weight: bold;">{stats['total_hours']:.1f}h</td></tr>
                </table>
            </div>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">👤 Employees</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td>New This Week</td><td style="text-align: right;">{stats['new_employees']}</td></tr>
                    <tr><td>Profiles Pending Approval</td><td style="text-align: right; color: #F59E0B;">{stats['pending_profiles']}</td></tr>
                </table>
            </div>
            
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
                This is an automated weekly summary from ProTotaalService
            </p>
        </div>
        """
        
        email_service = EmailService(config)
        for recipient in recipients:
            try:
                email_service.send_html_email(recipient, subject, html_content)
                self.stdout.write(f'  ✉️  Sent to {recipient}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ❌ Failed to send to {recipient}: {e}'))
    
    def _create_summary_notification(self, stats):
        """Create in-app notification for the weekly summary."""
        from apps.notifications.models import Notification
        
        admin = User.objects.filter(is_staff=True, is_active=True).first()
        if not admin:
            return
        
        Notification.objects.create(
            recipient=admin,
            notification_type='info',
            category='system',
            priority='low',
            title='Weekly Summary Available',
            message=f'Last week: {stats["worklogs_approved"]} worklogs approved ({stats["total_hours"]:.0f}h), {stats["new_employees"]} new employees',
            action_url='/dashboard/worklogs',
        )
