"""
Management command to hard-delete soft-deleted records older than 1 year.

Run via cron job daily:
    python manage.py cleanup_deleted_records

Or with --dry-run to see what would be deleted:
    python manage.py cleanup_deleted_records --dry-run
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.employees.models import EmployeeProfile, User


class Command(BaseCommand):
    help = 'Hard delete soft-deleted records older than the retention period (default: 1 year)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Number of days after soft delete before hard delete (default: 365)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--model',
            type=str,
            choices=['all', 'employees'],
            default='all',
            help='Which models to clean up (default: all)'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        model_choice = options['model']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(
            f"Looking for records soft-deleted before {cutoff_date.date()} ({days} days ago)"
        )
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No records will be deleted'))
        
        total_deleted = 0
        
        # Clean up EmployeeProfiles
        if model_choice in ['all', 'employees']:
            total_deleted += self._cleanup_model(
                EmployeeProfile,
                cutoff_date,
                dry_run,
                related_cleanup=self._cleanup_employee_user
            )
        
        # Add more models here as needed:
        # if model_choice in ['all', 'projects']:
        #     total_deleted += self._cleanup_model(Project, cutoff_date, dry_run)
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'DRY RUN: Would delete {total_deleted} records')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {total_deleted} records')
            )

    def _cleanup_model(self, model_class, cutoff_date, dry_run, related_cleanup=None):
        """Clean up a specific model's soft-deleted records."""
        model_name = model_class.__name__
        
        # Query for old soft-deleted records
        old_deleted = model_class.all_objects.filter(
            is_deleted=True,
            deleted_at__lt=cutoff_date
        )
        
        count = old_deleted.count()
        
        if count == 0:
            self.stdout.write(f'{model_name}: No records to delete')
            return 0
        
        self.stdout.write(f'{model_name}: Found {count} records to delete')
        
        if not dry_run:
            with transaction.atomic():
                # Run related cleanup if provided
                if related_cleanup:
                    for obj in old_deleted:
                        related_cleanup(obj)
                
                # Hard delete the records
                old_deleted.hard_delete()
            
            self.stdout.write(self.style.SUCCESS(f'{model_name}: Deleted {count} records'))
        
        return count

    def _cleanup_employee_user(self, profile):
        """
        Clean up the User account when an EmployeeProfile is hard-deleted.
        Only deletes if the user has no other important data.
        """
        user = profile.user
        
        # Check if user has any non-deleted related data we need to keep
        # For now, we'll just log but not delete the user
        # You may want to delete the user if they have no other roles
        self.stdout.write(
            f'  - Employee: {profile.full_name} (User: {user.email}) will be removed'
        )
        
        # Optionally delete the user account too:
        # if user.role == User.Role.EMPLOYEE:
        #     user.delete()
