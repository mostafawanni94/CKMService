"""
Django signals for automatic notification handling.

Triggers email sending when notifications are created based on SystemConfig rules.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

from .models import Notification
from .email_service import send_notification_email_if_enabled

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def handle_notification_created(sender, instance, created, **kwargs):
    """
    Handle notification creation.
    
    When a new notification is created:
    1. Check if email should be sent based on category and priority rules
    2. Send email if enabled
    """
    if not created:
        return
    
    # Don't send email if already sent (prevent duplicates)
    if instance.email_sent:
        return
    
    try:
        # Send email based on rules
        email_sent = send_notification_email_if_enabled(instance)
        if email_sent:
            logger.info(f"Email sent for notification {instance.id}")
    except Exception as e:
        logger.error(f"Failed to send email for notification {instance.id}: {e}")
