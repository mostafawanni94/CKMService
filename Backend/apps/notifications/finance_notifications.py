"""
Notifications for the things that cost money if nobody notices.

An invoice that went out and was never paid, a VAT quarter with a deadline
approaching, a transaction the engine could not classify, a supplier invoice
falling due — these are all silent until someone checks. This module makes them
speak.

Called from management commands run by cron, not from signals: they are about
the passage of time, not about something a user just did.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

logger = logging.getLogger(__name__)

# When a quarter's return is due: the last day of the month after the quarter.
FILING_DEADLINE_MONTH_OFFSET = 1


def _back_office_users():
    from apps.employees.models import User

    return User.objects.filter(
        is_active=True, role__in=['admin', 'finance']).only('id', 'email')


def _notify(recipients, *, notification_type, category, priority, title, message,
            reference_type='', reference_id=None, action_url=''):
    """Create one notification per recipient, and email it if enabled."""
    from apps.notifications.email_service import send_notification_email_if_enabled
    from apps.notifications.models import Notification

    created = []
    for user in recipients:
        try:
            notification = Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                category=category,
                priority=priority,
                title=title,
                message=message,
                reference_type=reference_type,
                reference_id=reference_id,
                action_url=action_url,
            )
            send_notification_email_if_enabled(notification)
            created.append(notification)
        except Exception:
            logger.exception('Could not notify %s about %s', user, title)
    return created


def _already_sent_today(notification_type, reference_id):
    """Cron runs daily; the same warning should not arrive daily."""
    from apps.notifications.models import Notification

    return Notification.objects.filter(
        notification_type=notification_type,
        reference_id=reference_id,
        created_at__date=timezone.localdate(),
    ).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Receivables
# ─────────────────────────────────────────────────────────────────────────────

def notify_overdue_invoices(as_of=None):
    """
    Warn about invoices that are past their due date.

    Only for invoices that became overdue today, plus a weekly reminder for
    anything more than 30 days late — enough to act on, not enough to ignore.
    """
    from apps.invoices.models import Invoice

    as_of = as_of or timezone.localdate()
    recipients = list(_back_office_users())
    if not recipients:
        return 0

    just_overdue = Invoice.objects.filter(
        is_deleted=False,
        document_type=Invoice.DocumentType.INVOICE,
        status__in=[Invoice.Status.SENT, Invoice.Status.PARTIALLY_PAID,
                    Invoice.Status.OVERDUE],
        due_date=as_of - timedelta(days=1),
    ).select_related('customer')

    sent = 0
    for invoice in just_overdue:
        if _already_sent_today('invoice_overdue', invoice.pk):
            continue
        outstanding = invoice.total - invoice.amount_paid
        _notify(
            recipients,
            notification_type='invoice_overdue',
            category='invoices',
            priority='high',
            title=f'Factuur {invoice.invoice_number} is vervallen',
            message=(f'{invoice.customer.company_name} heeft €{outstanding} nog niet '
                     f'betaald. Vervaldatum was {invoice.due_date}.'),
            reference_type='invoice',
            reference_id=invoice.pk,
            action_url=f'/dashboard/invoices/{invoice.pk}',
        )
        sent += 1

    # Weekly nudge on Monday for anything seriously late.
    if as_of.weekday() == 0:
        long_overdue = Invoice.objects.filter(
            is_deleted=False,
            document_type=Invoice.DocumentType.INVOICE,
            status__in=[Invoice.Status.OVERDUE, Invoice.Status.PARTIALLY_PAID],
            due_date__lt=as_of - timedelta(days=30),
        ).select_related('customer')
        total = sum((i.total - i.amount_paid for i in long_overdue), Decimal('0.00'))
        if long_overdue.exists():
            _notify(
                recipients,
                notification_type='invoice_overdue',
                category='invoices',
                priority='urgent',
                title=f'{long_overdue.count()} facturen meer dan 30 dagen vervallen',
                message=f'Totaal openstaand: €{total}.',
                action_url='/dashboard/finance/overview',
            )
            sent += 1

    return sent


def notify_supplier_invoices_due(as_of=None, days_ahead=3):
    """Warn before a supplier invoice falls due, not after."""
    from apps.invoices.models import IncomingInvoice

    as_of = as_of or timezone.localdate()
    recipients = list(_back_office_users())
    if not recipients:
        return 0

    due_soon = IncomingInvoice.objects.filter(
        is_deleted=False,
        due_date=as_of + timedelta(days=days_ahead),
    ).exclude(status='paid')

    sent = 0
    for invoice in due_soon:
        if _already_sent_today('supplier_invoice_due', invoice.pk):
            continue
        _notify(
            recipients,
            notification_type='supplier_invoice_due',
            category='invoices',
            priority='normal',
            title=f'Inkoopfactuur {invoice.invoice_number} vervalt {invoice.due_date}',
            message=f'{invoice.vendor_name}: €{invoice.total} te betalen.',
            reference_type='incoming_invoice',
            reference_id=invoice.pk,
            action_url='/dashboard/incoming-invoices',
        )
        sent += 1
    return sent


# ─────────────────────────────────────────────────────────────────────────────
# VAT
# ─────────────────────────────────────────────────────────────────────────────

def filing_deadline(period):
    """
    When a quarter's return is due: the last day of the following month.

    Q3 (jul–sep) is due 31 October. This is the statutory deadline for
    quarterly filing; the Belastingdienst may set a different one in writing,
    which is why the warning says "normally".
    """
    import calendar

    month = period.end_date.month + FILING_DEADLINE_MONTH_OFFSET
    year = period.end_date.year
    if month > 12:
        month -= 12
        year += 1
    return period.end_date.replace(
        year=year, month=month, day=calendar.monthrange(year, month)[1])


def notify_vat_deadline(as_of=None, warn_days=(21, 7, 2)):
    """Remind the back office that a quarter still has to be filed."""
    from apps.vat.constants import VatPeriodStatus
    from apps.vat.models import VatPeriod
    from apps.vat.returns import blockers_for, calculate_return, derive_status

    as_of = as_of or timezone.localdate()
    recipients = list(_back_office_users())
    if not recipients:
        return 0

    sent = 0
    for period in VatPeriod.objects.filter(end_date__lt=as_of).exclude(
            status__in=[VatPeriodStatus.FINALIZED, VatPeriodStatus.LOCKED]):
        deadline = filing_deadline(period)
        remaining = (deadline - as_of).days
        if remaining not in warn_days:
            continue
        if _already_sent_today('vat_deadline', period.pk):
            continue

        result = calculate_return(period)
        blockers = blockers_for(period)
        outcome = {'PAYABLE': 'te betalen', 'REFUNDABLE': 'terug te ontvangen',
                   'ZERO': 'saldo nihil'}[result['outcome']]
        detail = (f'Stand: €{abs(result["vat_position"])} {outcome}. ')
        if blockers:
            detail += ('Er staan nog punten open die eerst opgelost moeten worden: '
                       + '; '.join(b['message'] for b in blockers))
        else:
            detail += 'De aangifte kan worden vastgezet.'

        _notify(
            recipients,
            notification_type='vat_deadline',
            category='invoices',
            priority='urgent' if remaining <= 7 else 'high',
            title=f'Btw-aangifte {period} — nog {remaining} dagen',
            message=(f'De aangifte over {period} moet normaal gesproken vóór '
                     f'{deadline} zijn ingediend. {detail}'),
            reference_type='vat_period',
            reference_id=period.pk,
            action_url='/dashboard/finance/vat',
        )
        sent += 1
    return sent


def notify_unclassified_transactions(as_of=None, threshold=1):
    """
    Weekly: what the VAT engine refused to decide.

    These are the transactions that will be left out of a return until someone
    establishes the facts, so they are worth a standing reminder.
    """
    from apps.vat.constants import ClassificationStatus
    from apps.vat.models import VatLedgerEntry

    as_of = as_of or timezone.localdate()
    if as_of.weekday() != 0:          # Mondays only
        return 0

    recipients = list(_back_office_users())
    if not recipients:
        return 0

    unresolved = VatLedgerEntry.objects.filter(
        is_deleted=False,
        classification_status=ClassificationStatus.REQUIRES_REVIEW,
    )
    count = unresolved.count()
    if count < threshold:
        return 0

    # An unresolved entry carries the document's gross value: the split into
    # base and VAT is precisely what has not been established.
    total = sum((e.taxable_base for e in unresolved), Decimal('0.00'))
    _notify(
        recipients,
        notification_type='vat_requires_review',
        category='invoices',
        priority='high',
        title=f'{count} transactie(s) zonder vastgestelde btw-behandeling',
        message=(f'Samen €{total} aan documentwaarde. Deze blijven buiten de '
                 f'aangifte tot de feiten zijn vastgesteld.'),
        action_url='/dashboard/finance/vat',
    )
    return 1


def run_daily(as_of=None):
    """Everything the daily cron job should check. Returns what it sent."""
    return {
        'overdue_invoices': notify_overdue_invoices(as_of),
        'supplier_invoices_due': notify_supplier_invoices_due(as_of),
        'vat_deadline': notify_vat_deadline(as_of),
        'unclassified': notify_unclassified_transactions(as_of),
    }
