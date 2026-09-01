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
        dry_run = options['dry_run']

        entries = (
            WorkEntry.objects
            .filter(status=WorkEntry.Status.APPROVED, employee__isnull=False)
            .select_related('employee', 'project')
            .order_by('work_date')
        )
        if options.get('employee'):
            entries = entries.filter(employee_id=options['employee'])

        created = corrected = skipped = unpaid = 0

        for entry in entries:
            amount = entry.calculated_employee_payment or Decimal('0.00')
            if amount <= 0:
                unpaid += 1
                continue

            existing = WalletTransaction.objects.filter(
                reference_type='workentry',
                reference_id=entry.id,
                transaction_type=WalletTransaction.Type.EARNING,
            ).first()

            if existing:
                if existing.amount != amount:
                    corrected += 1
                    if not dry_run:
                        existing.amount = amount
                        existing.save()
                else:
                    skipped += 1
                continue

            created += 1
            if dry_run:
                continue

            with db_transaction.atomic():
                wallet, _ = Wallet.objects.get_or_create(employee=entry.employee)
                WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type=WalletTransaction.Type.EARNING,
                    amount=amount,
                    description=f'Work: {entry.project.name} ({entry.work_date})',
                    reference_type='workentry',
                    reference_id=entry.id,
                    created_by=entry.approved_by,
                )

        if not dry_run:
            for wallet in Wallet.objects.all():
                wallet.recalculate_balance()
                wallet.save()

        prefix = 'Would create' if dry_run else 'Created'
        self.stdout.write(self.style.SUCCESS(
            f'{prefix} {created}, corrected {corrected}, already correct {skipped}, '
            f'zero-pay (no hourly_rate) {unpaid}.'
        ))
