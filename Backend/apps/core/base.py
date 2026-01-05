"""
Base models module.
Import from here for convenience.
"""

from apps.core.models import (
    TimeStampedModel,
    UUIDModel,
    SoftDeleteModel,
    AuditModel,
    BaseModel,
    StatusChoices,
)

__all__ = [
    'TimeStampedModel',
    'UUIDModel',
    'SoftDeleteModel',
    'AuditModel',
    'BaseModel',
    'StatusChoices',
]
