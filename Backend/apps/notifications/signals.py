"""
Signals for automatic notification fan-out.

Creating a Notification row now delivers it on every enabled channel: email
(subject to the SystemConfig category rules) and push (subject to the
recipient's own preferences). Push existed as a service module but nothing ever
called it, so ``Notification.push_sent`` was always False.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .email_service import send_notification_email_if_enabled
from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


def _in_quiet_hours(preference) -> bool:
    """True when the recipient has asked not to be disturbed right now."""
    if not preference or not preference.quiet_hours_enabled:
        return False
    if not (preference.quiet_hours_start and preference.quiet_hours_end):
        return False

    from django.utils import timezone
    now = timezone.localtime().time()
    start, end = preference.quiet_hours_start, preference.quiet_hours_end
    if start <= end:
        return start <= now < end
    # Window wraps past midnight, e.g. 22:00 → 07:00.
    return now >= start or now < end


def _send_push(notification) -> bool:
    """Deliver a notification as a push message, honouring user preferences."""
    from .push_service import send_to_user

    preference = NotificationPreference.objects.filter(
        user=notification.recipient
    ).first()

    if preference and not preference.push_enabled:
        return False

    # Urgent notifications override quiet hours; everything else waits.
    if notification.priority != 'urgent' and _in_quiet_hours(preference):
        logger.debug('Skipping push for %s: recipient is in quiet hours.', notification.id)
        return False

    return send_to_user(
        notification.recipient,
        title=notification.title,
        message=notification.message,
        data={
            'notification_id': notification.id,
            'category': notification.category,
            'reference_type': notification.reference_type or '',
            'reference_id': notification.reference_id or '',
            'action_url': notification.action_url or '',
        },
        priority=notification.priority,
    )


@receiver(post_save, sender=Notification)
def handle_notification_created(sender, instance, created, **kwargs):
    """Fan a newly created notification out to email and push."""
    if not created:
        return

    updated_fields = []

    if not instance.email_sent:
        try:
            if send_notification_email_if_enabled(instance):
                instance.email_sent = True
                updated_fields.append('email_sent')
        except Exception:
            logger.exception('Failed to send email for notification %s', instance.id)

    if not instance.push_sent:
        try:
            if _send_push(instance):
                instance.push_sent = True
                updated_fields.append('push_sent')
        except Exception:
            logger.exception('Failed to send push for notification %s', instance.id)

    if updated_fields:
        # update_fields keeps this out of the post_save recursion path, since
        # the handler returns early unless `created` is True.
        Notification.objects.filter(pk=instance.pk).update(
            **{field: getattr(instance, field) for field in updated_fields}
        )
