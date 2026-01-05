"""
Management command to check for expiring certificates AND contracts.

Sends notifications to:
- ADMIN: for awareness
- EMPLOYEE: to renew their certificates/contracts

Usage:
    python manage.py check_expiring_certificates
    python manage.py check_expiring_certificates --dry-run

Cron (daily at 7 AM):
    0 7 * * * cd /path/to/project && python manage.py check_expiring_certificates
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from apps.core.models import SystemConfig
from apps.certificates.models import EmployeeCertificate
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = 'Check for expiring certificates and contracts, notify both admin and employee'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without creating notifications',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        config = SystemConfig.objects.get_config()
        
        if not config.notify_certificate_expiry:
            self.stdout.write(self.style.WARNING('Certificate expiry notifications are disabled'))
            return
        
        expiry_days = config.certificate_expiry_days or 30
        today = timezone.now().date()
        warning_date = today + timedelta(days=expiry_days)
        
        total_notifications = 0
        
        # 1. Check CERTIFICATES
        self.stdout.write('\n📋 Checking Certificates...')
        total_notifications += self._check_certificates(today, warning_date, dry_run)
        
        # 2. Check CONTRACTS
        self.stdout.write('\n📄 Checking Contracts...')
        total_notifications += self._check_contracts(today, warning_date, dry_run)
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n[DRY RUN] Would create {total_notifications} notifications'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Done! Created {total_notifications} notifications'))
    
    def _get_priority(self, days_remaining):
        """Get notification priority based on days remaining."""
        if days_remaining <= 0:
            return 'urgent'
        elif days_remaining <= 3:
            return 'urgent'
        elif days_remaining <= 7:
            return 'high'
        elif days_remaining <= 14:
            return 'normal'
        else:
            return 'low'
    
    def _check_certificates(self, today, warning_date, dry_run):
        """Check certificate expiry and notify both admin and employee."""
        from apps.employees.models import User
        
        # Find expiring certificates
        expiring = EmployeeCertificate.objects.filter(
            expiry_date__isnull=False,
            expiry_date__lte=warning_date,
            expiry_date__gte=today - timedelta(days=7),  # Include recently expired
        ).select_related('employee', 'employee__user', 'certificate_type')
        
        count = 0
        
        for cert in expiring:
            days = (cert.expiry_date - today).days
            priority = self._get_priority(days)
            is_expired = days < 0
            
            # Skip if notified in last 3 days
            if self._already_notified('certificate', cert.id):
                continue
            
            employee_name = cert.employee.full_name or str(cert.employee)
            cert_name = cert.certificate_type.name
            date_str = cert.expiry_date.strftime('%d/%m/%Y')
            
            # Professional messages based on days remaining
            if is_expired:
                days_ago = abs(days)
                if days_ago == 1:
                    title = f'⚠️ {cert_name} Expired Yesterday'
                    msg_employee = f'Your {cert_name} expired yesterday ({date_str}). Renew immediately to stay compliant.'
                else:
                    title = f'⚠️ {cert_name} Expired'
                    msg_employee = f'Your {cert_name} expired {days_ago} days ago ({date_str}). Renew immediately.'
                msg_admin = f'{employee_name}\'s {cert_name} expired on {date_str}'
            elif days == 0:
                title = f'🔴 {cert_name} Expires Today!'
                msg_employee = f'Your {cert_name} expires TODAY ({date_str}). Take action now!'
                msg_admin = f'{employee_name}\'s {cert_name} expires TODAY'
            elif days == 1:
                title = f'🟠 {cert_name} Expires Tomorrow'
                msg_employee = f'Your {cert_name} expires tomorrow ({date_str}). Please renew soon.'
                msg_admin = f'{employee_name}\'s {cert_name} expires tomorrow'
            elif days <= 7:
                title = f'🟡 {cert_name} - {days} Days Left'
                msg_employee = f'Your {cert_name} expires in {days} days ({date_str}). Plan your renewal.'
                msg_admin = f'{employee_name}\'s {cert_name} expires in {days} days ({date_str})'
            else:
                title = f'{cert_name} - {days} Days Until Expiry'
                msg_employee = f'Your {cert_name} expires in {days} days ({date_str}).'
                msg_admin = f'{employee_name}\'s {cert_name} expires in {days} days ({date_str})'
            
            if dry_run:
                self.stdout.write(f'  [DRY RUN] {cert_name} for {employee_name} - {days}d ({priority})')
            else:
                # Notify ADMIN
                admin = User.objects.filter(is_staff=True, is_active=True).first()
                if admin:
                    Notification.objects.create(
                        recipient=admin,
                        notification_type='certificate_expired' if is_expired else 'certificate_expiring',
                        category='certificates',
                        priority=priority,
                        title=title,
                        message=msg_admin,
                        reference_type='employee_certificate',
                        reference_id=cert.id,
                        action_url=f'/dashboard/employees/{cert.employee.id}',
                    )
                    count += 1
                
                # Notify EMPLOYEE (if has user account)
                if cert.employee.user:
                    notification = Notification.objects.create(
                        recipient=cert.employee.user,
                        notification_type='certificate_expired' if is_expired else 'certificate_expiring',
                        category='certificates',
                        priority=priority,
                        title=title,
                        message=msg_employee,
                        reference_type='employee_certificate',
                        reference_id=cert.id,
                        action_url='/profile/certificates',
                    )
                    count += 1
                    
                    # Send email to employee
                    from apps.notifications.email_service import send_notification_email_if_enabled
                    send_notification_email_if_enabled(notification)
                
                self.stdout.write(self.style.SUCCESS(f'  ✅ {cert_name} for {employee_name}'))
        
        self.stdout.write(f'  → Created {count} certificate notifications')
        return count
    
    def _check_contracts(self, today, warning_date, dry_run):
        """Check contract expiry and notify both admin and employee."""
        from apps.employees.models import User, EmployeeProfile
        
        # Find expiring contracts
        expiring = EmployeeProfile.objects.filter(
            contract_end_date__isnull=False,
            contract_end_date__lte=warning_date,
            contract_end_date__gte=today - timedelta(days=7),
            status='approved',  # Only active employees
        ).select_related('user')
        
        count = 0
        
        for profile in expiring:
            days = (profile.contract_end_date - today).days
            priority = self._get_priority(days)
            is_expired = days < 0
            
            # Skip if notified in last 3 days
            if self._already_notified('contract', profile.id):
                continue
            
            employee_name = profile.full_name
            date_str = profile.contract_end_date.strftime('%d/%m/%Y')
            
            if is_expired:
                title = '⚠️ Contract EXPIRED'
                msg_admin = f'{employee_name}\'s contract expired on {date_str}'
                msg_employee = f'Your contract expired on {date_str}. Contact HR!'
            else:
                title = 'Contract Expiring Soon'
                msg_admin = f'{employee_name}\'s contract expires in {days} days ({date_str})'
                msg_employee = f'Your contract expires in {days} days ({date_str}). Contact HR!'
            
            if dry_run:
                self.stdout.write(f'  [DRY RUN] Contract for {employee_name} - {days}d ({priority})')
            else:
                # Notify ADMIN
                admin = User.objects.filter(is_staff=True, is_active=True).first()
                if admin:
                    Notification.objects.create(
                        recipient=admin,
                        notification_type='contract_expired' if is_expired else 'contract_expiring',
                        category='employees',
                        priority=priority,
                        title=title,
                        message=msg_admin,
                        reference_type='employee_profile',
                        reference_id=profile.id,
                        action_url=f'/dashboard/employees/{profile.id}',
                    )
                    count += 1
                
                # Notify EMPLOYEE
                if profile.user:
                    notification = Notification.objects.create(
                        recipient=profile.user,
                        notification_type='contract_expired' if is_expired else 'contract_expiring',
                        category='employees',
                        priority=priority,
                        title=title,
                        message=msg_employee,
                        reference_type='employee_profile',
                        reference_id=profile.id,
                        action_url='/profile',
                    )
                    count += 1
                    
                    # Send email to employee
                    from apps.notifications.email_service import send_notification_email_if_enabled
                    send_notification_email_if_enabled(notification)
                
                self.stdout.write(self.style.SUCCESS(f'  ✅ Contract for {employee_name}'))
        
        self.stdout.write(f'  → Created {count} contract notifications')
        return count
    
    def _already_notified(self, item_type, item_id):
        """Check if we already sent a notification in the last 3 days."""
        ref_type = 'employee_certificate' if item_type == 'certificate' else 'employee_profile'
        return Notification.objects.filter(
            reference_type=ref_type,
            reference_id=item_id,
            created_at__gte=timezone.now() - timedelta(days=3),
        ).exists()

