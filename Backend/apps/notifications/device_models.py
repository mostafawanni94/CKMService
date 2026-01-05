"""
Device registration model for push notifications.
"""

from django.db import models
from apps.core.models import BaseModel


class DeviceRegistration(BaseModel):
    """
    Store FCM tokens for push notifications.
    """
    
    class Platform(models.TextChoices):
        IOS = 'ios', 'iOS'
        ANDROID = 'android', 'Android'
        WEB = 'web', 'Web'
    
    user = models.ForeignKey(
        'employees.User',
        on_delete=models.CASCADE,
        related_name='devices',
        verbose_name="User"
    )
    token = models.CharField(
        max_length=500,
        unique=True,
        verbose_name="FCM Token"
    )
    platform = models.CharField(
        max_length=10,
        choices=Platform.choices,
        default=Platform.ANDROID,
        verbose_name="Platform"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active"
    )
    
    class Meta:
        verbose_name = 'Device Registration'
        verbose_name_plural = 'Device Registrations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.platform} ({self.token[:20]}...)"
