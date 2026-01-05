"""
Employee signals.

Auto-create EmployeeProfile when a User is created.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, EmployeeProfile, DocumentType


@receiver(post_save, sender=User)
def create_employee_profile(sender, instance, created, **kwargs):
    """
    Auto-create an EmployeeProfile when a new User is created.
    Only for employee role users, not admins.
    """
    if created and instance.role == User.Role.EMPLOYEE:
        # Check if profile already exists (shouldn't but just in case)
        if not hasattr(instance, 'profile'):
            # Get or create a default document type
            doc_type, _ = DocumentType.objects.get_or_create(
                name='ID Card',
                defaults={'description': 'National ID Card', 'is_active': True}
            )
            
            EmployeeProfile.objects.create(
                user=instance,
                first_name=instance.first_name or 'New',
                last_name=instance.last_name or 'Employee',
                initials=f"{(instance.first_name or 'N')[0]}{(instance.last_name or 'E')[0]}",
                gender='prefer_not_to_say',
                date_of_birth='2000-01-01',  # Placeholder - employee will update
                birthplace='Unknown',
                bsn='000000000',  # Placeholder - employee will update
                document_type=doc_type,
                document_number='PENDING',
                document_expiry_date='2030-01-01',  # Placeholder
                id_document_front='',
                id_document_back='',
                phone_number='0000000000',
                street_address='Not provided',
                postcode='0000AA',
                city='Unknown',
                iban='NL00BANK0000000000',  # Placeholder
                nationality='Not provided',
                status=EmployeeProfile.ProfileStatus.INCOMPLETE,
            )
