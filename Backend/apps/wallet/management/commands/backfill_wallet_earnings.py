"""
Credit wallets for approved work entries that never produced a transaction.

Earnings are only written when an entry is approved *through the API*. Entries
approved before that hook existed, imported, or seeded directly into the
database left the wallet empty — 199 approved entries had produced a single
transaction.

Idempotent: an entry that already has an EARNING transaction is skipped, and one
whose amount has since changed is corrected rather than duplicated.
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from apps.wallet.models import Wallet, WalletTransaction
from apps.worklogs.models import WorkEntry


class Command(BaseCommand):
    help = 'Create missing wallet earnings for approved work entries.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change without writing.')
        parser.add_argument('--employee', help='Limit to one employee id.')

    def handle(self, *args, **options):
        """
        Credit every approved entry that has not been credited yet.

        Batched: one transaction per chunk and one balance recalculation per
        wallet. Row-by-row this cost about eight queries per entry, which on a
        year of history is tens of thousands of round trips.
        """
        from apps.wallet.services import credit_work_entries

        dry_run = options['dry_run']

        entries = (
            WorkEntry.objects
            .filter(status=WorkEntry.Status.APPROVED, employee__isnull=False)
            .select_related('employee', 'employee__user', 'project',
                            'project__customer', 'service')
            .order_by('work_date')
        )
        if options.get('employee'):
            entries = entries.filter(employee_id=options['employee'])

        if dry_run:
            already = set(WalletTransaction.objects.filter(
                reference_type='workentry',
                transaction_type=WalletTransaction.Type.EARNING,
            ).values_list('reference_id', flat=True))

            would_create = would_correct = unpaid = correct = 0
            for entry in entries.iterator(chunk_size=500):
                amount = entry.calculated_employee_payment or Decimal('0.00')
                if amount <= 0:
                    unpaid += 1
                elif entry.id not in already:
                    would_create += 1
                else:
                    correct += 1

            self.stdout.write(self.style.SUCCESS(
                f'Would create {would_create}, already present {correct}, '
                f'zero-pay (no hourly_rate) {unpaid}.'))
            return

        created = corrected = skipped = 0
        batch = []
        for entry in entries.iterator(chunk_size=500):
            batch.append(entry)
            if len(batch) >= 500:
                result = credit_work_entries(batch)
                created += result['credited']
                corrected += result['corrected']
                skipped += result['skipped']
                batch = []

        if batch:
            result = credit_work_entries(batch)
            created += result['credited']
            corrected += result['corrected']
            skipped += result['skipped']

        self.stdout.write(self.style.SUCCESS(
            f'Created {created}, corrected {corrected}, '
            f'zero-pay (no hourly_rate) {skipped}.'))
