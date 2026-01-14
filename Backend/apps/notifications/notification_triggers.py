"""
Notification Triggers for automatic notification creation.

This module contains signals that listen to model changes
and create notifications + send emails accordingly.

IMPORTANT: These signals are designed to be lightweight:
- Only create ONE notification per event (not per admin)
- Use efficient database queries with .only() and .exists()
- No heavy processing - just notification creation
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


def should_notify_user(user, notification_type):
    """
    Check if user wants to receive a specific notification type.
    
    Returns True if:
    - User has push_notifications_enabled = True
    - User has the specific notification type enabled
    
    Always returns True for HIGH PRIORITY notifications (critical items).
    """
    try:
        if not user or not hasattr(user, 'employee_profile'):
            return True  # Can't check, default to notify
        
        profile = user.employee_profile
        
        # Master toggle
        if not getattr(profile, 'push_notifications_enabled', True):
            return False
        
        # Map notification types to preference fields
        preference_map = {
            'certificate_expiring': 'notify_certificate_expiry',
            'certificate_expired': 'notify_certificate_expiry',
            'contract_expiring': 'notify_contract_expiry',
            'contract_expired': 'notify_contract_expiry',
            'worklog_stale_pending': 'notify_worklog_reminders',
            'worklog_stale_rejected': 'notify_worklog_reminders',
            'worklog_approved': 'notify_approvals',
            'worklog_rejected': 'notify_approvals',  # But HIGH priority overrides
            'profile_rejected': 'notify_approvals',  # But HIGH priority overrides
            'shift_updated': 'notify_shift_changes',
            'shift_cancelled': 'notify_shift_changes',
        }
        
        pref_field = preference_map.get(notification_type)
        if pref_field:
            return getattr(profile, pref_field, True)
        
        return True  # Unknown type, default to notify
        
    except Exception:
        return True  # Error checking, default to notify


# ==============================================================================
# EMPLOYEE NOTIFICATION: New User Created
# ==============================================================================

@receiver(post_save, sender='employees.User')
def notify_new_user_created(sender, instance, created, **kwargs):
    """
    Notify admins when a new employee user is created.
    
    Conditions:
    - Only on creation (not updates)
    - Only for non-admin users (employees)
    """
    if not created:
        return
    
    # Skip admin users
    if instance.is_staff or instance.is_superuser:
        return
    
    try:
        from apps.core.models import SystemConfig
        from apps.notifications.models import Notification
        
        config = SystemConfig.objects.get_config()
        
        # Check if this notification type is enabled
        if not getattr(config, 'email_on_employees', True):
            return
        
        # Get first admin to receive notification (lightweight)
        admin = sender.objects.filter(is_staff=True, is_active=True).only('id').first()
        if not admin:
            return
        
        # Create notification
        notification = Notification.objects.create(
            recipient=admin,
            notification_type='credentials_created',
            category='employees',
            priority='normal',
            title='New Employee Registered',
            message=f'New user account created: {instance.email}',
            reference_type='user',
            reference_id=instance.id,
            action_url='/dashboard/employees',
        )
        
        # Send email (async-friendly, lightweight)
        from apps.notifications.email_service import send_notification_email_if_enabled
        send_notification_email_if_enabled(notification)
        
        logger.info(f'Notification created for new user: {instance.email}')
        
    except Exception as e:
        logger.error(f'Failed to create notification for new user: {e}')


# ==============================================================================
# WORKLOG NOTIFICATION: Submitted for Approval
# ==============================================================================

@receiver(post_save, sender='worklogs.WorkEntry')
def notify_worklog_submitted(sender, instance, created, **kwargs):
    """
    Notify admins when a work entry is submitted for approval.
    
    Conditions:
    - Only when status changes to 'submitted'
    - Avoid duplicate notifications using update_fields check
    """
    # Skip if not submitted status
    if instance.status != 'submitted':
        return
    
    # For new worklogs that are submitted on creation (rare)
    # or for updates where status was changed
    if created and instance.status == 'submitted':
        pass  # New and submitted - create notification
    elif not created:
        # Check if this is a status update by looking at update_fields
        # If there's no submitted_at, it means status just changed
        if not instance.submitted_at:
            return
        # Only notify if submitted within last 5 seconds (just changed)
        from django.utils import timezone
        from datetime import timedelta
        if instance.submitted_at < timezone.now() - timedelta(seconds=5):
            return
    else:
        return
    
    try:
        from apps.core.models import SystemConfig
        from apps.notifications.models import Notification
        from apps.employees.models import User
        
        config = SystemConfig.objects.get_config()
        
        # Check if worklog notifications are enabled
        if not getattr(config, 'email_on_worklogs', True):
            return
        
        # Check if notification already exists for this worklog submission
        existing = Notification.objects.filter(
            notification_type='worklog_submitted',
            reference_type='worklog',
            reference_id=instance.id,
        ).exists()
        
        if existing:
            return
        
        # Get first admin
        admin = User.objects.filter(is_staff=True, is_active=True).only('id').first()
        if not admin:
            return
        
        # Get employee name
        employee_name = str(instance.employee) if instance.employee else 'Unknown'
        work_date = instance.work_date.strftime('%d/%m/%Y') if instance.work_date else 'N/A'
        
        # Create notification
        notification = Notification.objects.create(
            recipient=admin,
            notification_type='worklog_submitted',
            category='worklogs',
            priority='normal',
            title='Work Log Pending Approval',
            message=f'{employee_name} submitted a work log for {work_date}',
            reference_type='worklog',
            reference_id=instance.id,
            action_url=f'/dashboard/worklogs?status=submitted',
        )
        
        # Send email
        from apps.notifications.email_service import send_notification_email_if_enabled
        send_notification_email_if_enabled(notification)
        
        logger.info(f'Notification created for worklog submission: {instance.id}')
        
    except Exception as e:
        logger.error(f'Failed to create worklog notification: {e}')


# ==============================================================================
# EMPLOYEE PROFILE: Submitted for Approval
# ==============================================================================

@receiver(post_save, sender='employees.EmployeeProfile')
def notify_profile_submitted(sender, instance, created, **kwargs):
    """
    Notify admins when employee profile is submitted for approval.
    """
    if instance.status != 'pending':
        return
    
    # Only on update (not creation)
    if created:
        return
    
    try:
        from apps.core.models import SystemConfig
        from apps.notifications.models import Notification
        from apps.employees.models import User
        
        config = SystemConfig.objects.get_config()
        
        if not getattr(config, 'email_on_employees', True):
            return
        
        # Check for existing notification
        existing = Notification.objects.filter(
            notification_type='profile_submitted',
            reference_type='employee_profile',
            reference_id=instance.id,
        ).exists()
        
        if existing:
            return
        
        admin = User.objects.filter(is_staff=True, is_active=True).only('id').first()
        if not admin:
            return
        
        notification = Notification.objects.create(
            recipient=admin,
            notification_type='profile_submitted',
            category='employees',
            priority='normal',
            title='Profile Pending Approval',
            message=f'{instance.full_name} submitted their profile for approval',
            reference_type='employee_profile',
            reference_id=instance.id,
            action_url=f'/dashboard/employees/{instance.id}',
        )
        
        from apps.notifications.email_service import send_notification_email_if_enabled
        send_notification_email_if_enabled(notification)
        
        logger.info(f'Notification created for profile submission: {instance.id}')
        
    except Exception as e:
        logger.error(f'Failed to create profile notification: {e}')


# ==============================================================================
# WORKLOG NOTIFICATION: Rejected (HIGH PRIORITY)
# ==============================================================================

@receiver(post_save, sender='worklogs.WorkEntry')
def notify_worklog_rejected(sender, instance, created, **kwargs):
    """
    Notify employee when their work entry is rejected.
    
    HIGH PRIORITY - Employee needs to take action!
    """
    if created:
        return
    
    if instance.status != 'rejected':
        return
    
    # Only notify if rejection is recent (within 10 seconds)
    from django.utils import timezone
    from datetime import timedelta
    if instance.updated_at < timezone.now() - timedelta(seconds=10):
        return
    
    try:
        from apps.notifications.models import Notification
        from apps.employees.models import User
        
        # Check if notification already exists
        existing = Notification.objects.filter(
            notification_type='worklog_rejected',
            reference_type='worklog',
            reference_id=instance.id,
        ).exists()
        
        if existing:
            return
        
        # Get employee's user account
        employee_user = instance.employee.user if instance.employee else None
        if not employee_user:
            return
        
        work_date = instance.work_date.strftime('%d/%m/%Y') if instance.work_date else 'N/A'
        rejection_reason = instance.rejection_reason[:100] if instance.rejection_reason else 'No reason provided'
        
        # Create notification for employee (HIGH priority)
        notification = Notification.objects.create(
            recipient=employee_user,
            notification_type='worklog_rejected',
            category='worklogs',
            priority='high',  # HIGH PRIORITY!
            title='Work Log Rejected',
            message=f'Your work log for {work_date} was rejected: {rejection_reason}',
            reference_type='worklog',
            reference_id=instance.id,
            action_url=f'/dashboard/worklogs/{instance.id}',
        )
        
        from apps.notifications.email_service import send_notification_email_if_enabled
        send_notification_email_if_enabled(notification)
        
        logger.info(f'High priority notification created for rejected worklog: {instance.id}')
        
    except Exception as e:
        logger.error(f'Failed to create worklog rejection notification: {e}')


# ==============================================================================
# EMPLOYEE PROFILE: Rejected (HIGH PRIORITY)
# ==============================================================================

@receiver(post_save, sender='employees.EmployeeProfile')
def notify_profile_rejected(sender, instance, created, **kwargs):
    """
    Notify employee when their profile is rejected.
    
    HIGH PRIORITY - Employee needs to fix and resubmit!
    """
    if created:
        return
    
    if instance.status != 'rejected':
        return
    
    try:
        from apps.notifications.models import Notification
        
        # Check if notification already exists
        existing = Notification.objects.filter(
            notification_type='profile_rejected',
            reference_type='employee_profile',
            reference_id=instance.id,
        ).exists()
        
        if existing:
            return
        
        # Get employee's user account
        employee_user = instance.user if instance.user else None
        if not employee_user:
            return
        
        rejection_reason = instance.rejection_reason[:100] if instance.rejection_reason else 'No reason provided'
        
        # Create notification for employee (HIGH priority)
        notification = Notification.objects.create(
            recipient=employee_user,
            notification_type='profile_rejected',
            category='employees',
            priority='high',  # HIGH PRIORITY!
            title='Profile Rejected',
            message=f'Your profile was rejected: {rejection_reason}. Please update and resubmit.',
            reference_type='employee_profile',
            reference_id=instance.id,
            action_url='/profile',
        )
        
        from apps.notifications.email_service import send_notification_email_if_enabled
        send_notification_email_if_enabled(notification)
        
        logger.info(f'High priority notification created for rejected profile: {instance.id}')
        
    except Exception as e:
        logger.error(f'Failed to create profile rejection notification: {e}')


# ==============================================================================
# WORKLOG NOTIFICATION: Approved (Normal priority - for employee)
# ==============================================================================

@receiver(post_save, sender='worklogs.WorkEntry')
def notify_worklog_approved(sender, instance, created, **kwargs):
    """
    Notify employee when their work entry is approved.
    
    Normal priority - just informational.
    """
    if created:
        return
    
    if instance.status != 'approved':
        return
    
    # Only notify if approval is recent
    if not instance.approved_at:
        return
    
    from django.utils import timezone
    from datetime import timedelta
    if instance.approved_at < timezone.now() - timedelta(seconds=10):
        return
    
    try:
        from apps.notifications.models import Notification
        
        # Check if notification already exists
        existing = Notification.objects.filter(
            notification_type='worklog_approved',
            reference_type='worklog',
            reference_id=instance.id,
        ).exists()
        
        if existing:
            return
        
        employee_user = instance.employee.user if instance.employee else None
        if not employee_user:
            return
        
        work_date = instance.work_date.strftime('%d/%m/%Y') if instance.work_date else 'N/A'
        hours = instance.billable_hours
        
        # Create notification for employee
        Notification.objects.create(
            recipient=employee_user,
            notification_type='worklog_approved',
            category='worklogs',
            priority='low',
            title='Work Log Approved',
            message=f'Your work log for {work_date} ({hours}h) has been approved!',
            reference_type='worklog',
            reference_id=instance.id,
            action_url=f'/dashboard/worklogs/{instance.id}',
        )
        
        logger.info(f'Notification created for approved worklog: {instance.id}')
        
    except Exception as e:
        logger.error(f'Failed to create worklog approval notification: {e}')
