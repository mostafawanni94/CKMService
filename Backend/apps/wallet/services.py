"""
The employee wallet, as a ledger.

Everything that moves money for an employee goes through here: approved work
credits the wallet, an advance debits it, a payslip settles it, and an
approved expense reimbursement credits it. Each movement is keyed on what
caused it, so re-running any of those does not pay anyone twice.

The wallet is a derived view of its transactions, never a number someone types.
"""

import logging
from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Wallet, WalletTransaction

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')


class WalletError(Exception):
    """A wallet movement that cannot be made."""


def wallet_for(employee):
    wallet, _ = Wallet.objects.get_or_create(employee=employee)
    return wallet


@db_transaction.atomic
def post(employee, *, amount, transaction_type, description, reference_type='',
         reference_id=None, actor=None, notes=''):
    """
    Record one movement, once.

    Keyed on (wallet, type, reference); posting the same movement again updates
    the amount rather than adding a second one, which is what makes approval
    and payroll safe to re-run.
    """
    if employee is None:
        raise WalletError('A wallet movement needs an employee.')

    amount = Decimal(amount).quantize(CENT)
    wallet = wallet_for(employee)

    lookup = {
        'wallet': wallet,
        'transaction_type': transaction_type,
        'reference_type': reference_type,
        'reference_id': reference_id,
    }
    if reference_type and reference_id:
        existing = WalletTransaction.objects.filter(**lookup).first()
        if existing:
            if existing.amount != amount:
                existing.amount = amount
                existing.description = description
                existing.save()
                wallet.recalculate_balance()
            return existing

    movement = WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type=transaction_type,
        amount=amount,
        description=description,
        notes=notes,
        reference_type=reference_type,
        reference_id=reference_id,
        status=WalletTransaction.Status.COMPLETED,
        created_by=actor,
    )
    return movement


# ─────────────────────────────────────────────────────────────────────────────
# What creates wallet movements
# ─────────────────────────────────────────────────────────────────────────────

def credit_work_entry(entry, actor=None):
    """
    Credit an approved work entry.

    Priced with `calculated_employee_payment`: the employee's own rate, with
    surcharges only where they are entitled to them. Returns None when the
    entry pays nothing, which almost always means the employee has no hourly
    rate on file — worth reporting rather than silently crediting zero.
    """
    if entry.employee_id is None:
        return None

    amount = entry.calculated_employee_payment or Decimal('0.00')
    if amount <= 0:
        logger.info(
            'Work entry %s is approved but pays 0. Is the hourly rate set for %s?',
            entry.pk, entry.employee_id)
        return None

    project = entry.project.name if entry.project else 'Werk'
    return post(
        entry.employee,
        amount=amount,
        transaction_type=WalletTransaction.Type.EARNING,
        description=f'{project} ({entry.work_date})',
        reference_type='workentry',
        reference_id=entry.pk,
        actor=actor,
    )


def reverse_work_entry(entry, actor=None):
    """
    Undo the credit for an entry that is no longer approved.

    The earning is not deleted — a wallet is a ledger. A correcting entry of
    the opposite sign is posted, so the history shows what happened.
    """
    original = WalletTransaction.objects.filter(
        wallet__employee_id=entry.employee_id,
        reference_type='workentry', reference_id=entry.pk,
        transaction_type=WalletTransaction.Type.EARNING,
    ).first()
    if original is None or original.amount == 0:
        return None

    return post(
        entry.employee,
        amount=-original.amount,
        transaction_type=WalletTransaction.Type.ADJUSTMENT,
        description=f'Correctie: goedkeuring ingetrokken ({entry.work_date})',
        reference_type='workentry_reversal',
        reference_id=entry.pk,
        actor=actor,
    )


def settle_payslip(payslip, actor=None):
    """
    A payslip pays out what the wallet has been accruing.

    Posted as a single negative movement referencing the payslip, so the wallet
    shows what is still owed rather than growing forever.
    """
    amount = payslip.net_pay or Decimal('0.00')
    if amount <= 0:
        return None

    return post(
        payslip.employee,
        amount=-amount,
        transaction_type=WalletTransaction.Type.PAYOUT,
        description=f'Uitbetaling loonstrook {payslip.period}',
        reference_type='payslip',
        reference_id=payslip.pk,
        actor=actor,
    )


def reimburse_expense(expense, employee, actor=None):
    """Credit an employee for an expense they paid for out of pocket."""
    amount = expense.total_amount or Decimal('0.00')
    if amount <= 0:
        return None

    return post(
        employee,
        amount=amount,
        transaction_type=WalletTransaction.Type.REIMBURSEMENT,
        description=f'Onkostenvergoeding: {expense.description}',
        reference_type='expense',
        reference_id=expense.pk,
        actor=actor,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Reporting
# ─────────────────────────────────────────────────────────────────────────────

def summary(employee=None):
    """
    What the company owes its employees.

    Used by the finance dashboard: an unpaid wallet balance is a liability, and
    it should be visible next to the money customers owe us.
    """
    wallets = Wallet.objects.select_related('employee', 'employee__user')
    if employee is not None:
        wallets = wallets.filter(employee=employee)

    totals = wallets.aggregate(
        balance=Sum('balance'),
        earnings=Sum('total_earnings'),
        advances=Sum('total_advances'),
    )
    return {
        'wallet_count': wallets.count(),
        'total_owed': totals['balance'] or Decimal('0.00'),
        'total_earned': totals['earnings'] or Decimal('0.00'),
        'total_advanced': totals['advances'] or Decimal('0.00'),
        'as_of': timezone.now(),
    }


def rebuild(employee=None):
    """
    Recompute every wallet from its transactions.

    A repair tool, not part of the normal path. Returns what changed, so a
    silent drift shows up rather than being papered over.
    """
    wallets = Wallet.objects.all()
    if employee is not None:
        wallets = wallets.filter(employee=employee)

    changes = []
    for wallet in wallets:
        before = wallet.balance
        wallet.recalculate_balance()
        if wallet.balance != before:
            changes.append({
                'employee': str(wallet.employee),
                'was': before,
                'now': wallet.balance,
            })
    return changes
