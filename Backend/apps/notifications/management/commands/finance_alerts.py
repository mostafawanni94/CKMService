"""
Daily finance alerts.

Run from cron, once a day:

    0 7 * * *  cd /srv/ckm/Backend && venv/bin/python manage.py finance_alerts

Also flags invoices whose due date has passed, so the status is correct before
anyone looks at the dashboard.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send finance notifications and flag overdue invoices.'

    def add_arguments(self, parser):
        parser.add_argument('--date', help='Run as if it were this date (YYYY-MM-DD).')
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be sent without sending it.')

    def handle(self, *args, **options):
        from datetime import date

        from apps.invoices.billing import mark_overdue
        from apps.notifications.finance_notifications import run_daily

        as_of = (date.fromisoformat(options['date']) if options.get('date')
                 else timezone.localdate())

        if options['dry_run']:
            self.stdout.write(f'Dry run for {as_of}; nothing will be sent.')
            return

        flagged = mark_overdue(as_of=as_of)
        sent = run_daily(as_of)

        self.stdout.write(self.style.SUCCESS(
            f'{as_of}: {flagged} invoice(s) flagged overdue. '
            + ', '.join(f'{key}={value}' for key, value in sent.items())))
