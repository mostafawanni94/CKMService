"""
Post source documents into the VAT ledger.

Safe to re-run: entries are keyed on their source, so this reconciles rather
than duplicates. Source documents are never modified.
"""

from django.core.management.base import BaseCommand

from apps.vat.posting import post_all


class Command(BaseCommand):
    help = 'Classify source documents and post them to the VAT ledger.'

    def add_arguments(self, parser):
        parser.add_argument('--from', dest='start', help='Start date (YYYY-MM-DD).')
        parser.add_argument('--to', dest='end', help='End date (YYYY-MM-DD).')

    def handle(self, *args, **options):
        result = post_all(start_date=options.get('start'), end_date=options.get('end'))

        self.stdout.write(self.style.SUCCESS(
            f'Posted {len(result.entries)} ledger entries.'))
        if result.requires_review_count:
            self.stdout.write(self.style.WARNING(
                f'{result.requires_review_count} require review before filing.'))
        for note in result.skipped:
            self.stdout.write(f'  skipped: {note}')
        for error in result.errors:
            self.stdout.write(self.style.ERROR(f'  {error}'))
