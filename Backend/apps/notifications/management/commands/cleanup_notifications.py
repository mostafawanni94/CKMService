"""
Management command to clean up old notifications.

Usage:
    python manage.py cleanup_notifications --days=90

This command can be run periodically via cron:
    0 3 * * 0 cd /path/to/project && python manage.py cleanup_notifications --days=90
    (Runs every Sunday at 3 AM, deletes notifications older than 90 days)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.notifications.models import Notification


class Command(BaseCommand):
    help = 'Delete old notifications to keep database clean'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete notifications older than X days (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--keep-unread',
            action='store_true',
            help='Keep unread notifications even if old',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        keep_unread = options['keep_unread']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(f'Finding notifications older than {days} days (before {cutoff_date.date()})')
        
        # Build query
        queryset = Notification.objects.filter(created_at__lt=cutoff_date)
        
        if keep_unread:
            queryset = queryset.filter(is_read=True)
            self.stdout.write('Keeping unread notifications')
        
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No notifications to delete'))
            return
        
        self.stdout.write(f'Found {count} notifications to delete')
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Would delete {count} notifications'))
            
            # Show breakdown
            by_category = queryset.values('category').annotate(
                total=models_Count('id')
            ).order_by('-total')
            
            self.stdout.write('\nBreakdown by category:')
            for item in by_category:
                self.stdout.write(f"  • {item['category']}: {item['total']}")
        else:
            # Delete in batches to avoid memory issues
            batch_size = 1000
            deleted_total = 0
            
            while True:
                # Get batch of IDs
                batch_ids = list(queryset.values_list('id', flat=True)[:batch_size])
                if not batch_ids:
                    break
                
                # Delete batch
                deleted, _ = Notification.objects.filter(id__in=batch_ids).delete()
                deleted_total += deleted
                self.stdout.write(f'  Deleted batch: {deleted} notifications')
            
            self.stdout.write(self.style.SUCCESS(f'\n✅ Deleted {deleted_total} old notifications'))


# Import for annotation
from django.db.models import Count as models_Count
