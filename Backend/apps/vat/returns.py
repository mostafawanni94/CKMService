"""
The quarterly BTW return.

One service, used by the management command, the API and later the dashboard —
so there is exactly one place where a return figure is computed. `summarise()`
in ledger.py now delegates here rather than keeping a second implementation.

Every figure is derived from the ledger and carries the ids of the entries
behind it, so nothing in the return is a total without a trail.
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from .constants import (
    CLOSED_PERIOD_STATUSES, ClassificationStatus, RETURN_BOXES,
    VAT_RULES_VERSION, VatPeriodStatus,
)
from .models import VatLedgerEntry, VatPeriod, VatPeriodEvent, VatReturnBox, to_cents


class FinalizationBlocked(Exception):
    """Raised when a period is not in a state to be filed."""

    def __init__(self, message, blockers=None):
        super().__init__(message)
        self.blockers = blockers or []


def _entries(period):
    return VatLedgerEntry.objects.filter(period=period, is_deleted=False)


def calculate_return(period, include_entry_ids=False):
    """
    Compute the return for a period.

    5a is the VAT owed — output VAT plus reverse-charge VAT declared. 5b is the
    deductible input VAT. The final position is 5a - 5b; it is not a box, and
    there is no 5g.
    """
    entries = _entries(period)

    # Per-box aggregation in SQL, not Python.
    rows = (
        entries.exclude(return_box__isnull=True)
        .values('return_box__code', 'return_box__name', 'return_box__direction')
        .annotate(
            taxable_base=Sum('taxable_base'),
            vat_amount=Sum('vat_amount'),
            entry_count=Count('id'),
            source_count=Count('source_id', distinct=True),
        )
        .order_by('return_box__code')
    )
    aggregated = {r['return_box__code']: r for r in rows}

    boxes = []
    for code, name, direction in RETURN_BOXES:
        box = VatReturnBox.objects.filter(code=code).first()
        row = aggregated.get(code)
        boxes.append({
            'code': code,
            'name': name,
            'direction': str(direction),
            'is_active': bool(box.is_active) if box else False,
            'is_computed': bool(box.is_computed) if box else False,
            'taxable_base': to_cents(row['taxable_base'] or 0) if row else Decimal('0.00'),
            'vat_amount': to_cents(row['vat_amount'] or 0) if row else Decimal('0.00'),
            'entry_count': row['entry_count'] if row else 0,
            'source_count': row['source_count'] if row else 0,
        })

    totals = entries.aggregate(
        output=Sum('output_vat'),
        deductible=Sum('deductible_vat'),
        non_deductible=Sum('non_deductible_vat'),
        input_total=Sum('input_vat'),
    )

    box_5a = to_cents(totals['output'] or 0)
    box_5b = to_cents(totals['deductible'] or 0)
    position = to_cents(box_5a - box_5b)

    # 5a and 5b are computed, so their rows show the derived figure.
    for box in boxes:
        if box['code'] == '5a':
            box['vat_amount'] = box_5a
        elif box['code'] == '5b':
            box['vat_amount'] = box_5b

    unresolved = entries.filter(
        classification_status=ClassificationStatus.REQUIRES_REVIEW)

    result = {
        'period': str(period),
        'period_id': str(period.pk),
        'year': period.year,
        'quarter': period.quarter,
        'start_date': period.start_date.isoformat(),
        'end_date': period.end_date.isoformat(),
        'status': period.status,
        'boxes': boxes,
        'box_5a': box_5a,
        'box_5b': box_5b,
        'vat_position': position,
        'outcome': ('PAYABLE' if position > 0
                    else 'REFUNDABLE' if position < 0
                    else 'ZERO'),
        'amount_payable': position if position > 0 else Decimal('0.00'),
        'amount_refundable': -position if position < 0 else Decimal('0.00'),
        'non_deductible_vat': to_cents(totals['non_deductible'] or 0),
        'input_vat_total': to_cents(totals['input_total'] or 0),
        'entry_count': entries.count(),
        'requires_review_count': unresolved.count(),
        'rules_version': VAT_RULES_VERSION,
        'calculated_at': timezone.now().isoformat(),
    }

    if include_entry_ids:
        by_box = {}
        for entry in entries.exclude(return_box__isnull=True).values('id', 'return_box__code'):
            by_box.setdefault(entry['return_box__code'], []).append(str(entry['id']))
        result['entry_ids_by_box'] = by_box

    return result


def entries_for_box(period, box_code):
    """The ledger entries behind one box — the drill-down."""
    return (
        _entries(period)
        .filter(return_box__code=box_code)
        .select_related('return_box', 'treatment')
        .order_by('tax_point_date')
    )


def derive_status(period):
    """
    What state the period is really in, read from the ledger.

    Not settable by hand: a period cannot be marked ready while something is
    unresolved or reconciliation is failing.
    """
    if period.status in CLOSED_PERIOD_STATUSES:
        return period.status

    from .reconciliation import status_for

    if _entries(period).filter(
            classification_status=ClassificationStatus.REQUIRES_REVIEW).exists():
        return VatPeriodStatus.REVIEW_REQUIRED

    if not status_for(period)['is_clean']:
        return VatPeriodStatus.REVIEW_REQUIRED

    if not _entries(period).exists():
        return VatPeriodStatus.OPEN

    return VatPeriodStatus.READY_TO_FINALIZE


def refresh_status(period, actor=None):
    """Recompute and store the derived status."""
    derived = derive_status(period)
    if derived != period.status:
        period.status = derived
        period.save(update_fields=['status', 'updated_at'])
        VatPeriodEvent.objects.create(
            period=period, event=VatPeriodEvent.Event.RECALCULATED,
            detail=f'Status is now {derived}.', actor=actor)
    return period


def blockers_for(period):
    """Everything standing between this period and being filed."""
    from .reconciliation import status_for

    blockers = []

    unresolved = _entries(period).filter(
        classification_status=ClassificationStatus.REQUIRES_REVIEW)
    count = unresolved.count()
    if count:
        blockers.append({
            'code': 'REQUIRES_REVIEW',
            'message': f'{count} transaction{"s" if count != 1 else ""} require review.',
            'count': count,
            'entries': [
                {'id': str(e.pk), 'source': e.source_reference or e.source_id,
                 'amount': str(e.taxable_base), 'reason': e.review_reason}
                for e in unresolved[:50]
            ],
        })

    reconciliation = status_for(period)
    for finding in reconciliation['findings']:
        if finding['severity'] == 'error' and finding['code'] != 'REQUIRES_REVIEW':
            blockers.append({
                'code': finding['code'],
                'message': finding['message'],
                'count': 1,
                'entries': [],
            })

    return blockers


def finalize(period, actor, note=''):
    """
    File a period: snapshot the figures and lock every entry behind them.

    Refused while anything is unresolved, because a return should not be filed
    over known problems. The refusal is checked and recorded outside the
    transaction, so a blocked attempt still leaves an audit trail; the filing
    itself is atomic, so a failure part-way leaves the period as it was.
    """
    if period.status in CLOSED_PERIOD_STATUSES:
        raise FinalizationBlocked(f'{period} is already {period.get_status_display().lower()}.')

    blockers = blockers_for(period)
    if blockers:
        VatPeriodEvent.objects.create(
            period=period, event=VatPeriodEvent.Event.BLOCKED,
            detail='Finalization refused.',
            payload=_jsonable({'blockers': blockers}), actor=actor)
        raise FinalizationBlocked(
            'This period cannot be finalized yet.', blockers=blockers)

    return _file(period, actor, note)


@transaction.atomic
def _file(period, actor, note):
    snapshot = calculate_return(period, include_entry_ids=True)

    period.filed_snapshot = _jsonable(snapshot)
    period.status = VatPeriodStatus.FINALIZED
    period.finalized_at = timezone.now()
    period.finalized_by = actor
    period.rules_version = snapshot['rules_version']
    if note:
        period.notes = f'{period.notes}\n{note}'.strip()
    period.save()

    # Freeze the entries the snapshot was taken from.
    _entries(period).update(is_locked=True)

    VatPeriodEvent.objects.create(
        period=period, event=VatPeriodEvent.Event.FINALIZED,
        detail=f'Filed: 5a {snapshot["box_5a"]}, 5b {snapshot["box_5b"]}, '
               f'{snapshot["outcome"].lower()} {abs(snapshot["vat_position"])}.',
        payload=period.filed_snapshot, actor=actor)

    return period


@transaction.atomic
def lock(period, actor):
    """Lock a filed period. Nothing may be posted into it afterwards."""
    if period.status != VatPeriodStatus.FINALIZED:
        raise FinalizationBlocked('Only a finalized period can be locked.')

    period.status = VatPeriodStatus.LOCKED
    period.locked_at = timezone.now()
    period.locked_by = actor
    period.save(update_fields=['status', 'locked_at', 'locked_by', 'updated_at'])

    VatPeriodEvent.objects.create(
        period=period, event=VatPeriodEvent.Event.LOCKED,
        detail='Period locked.', actor=actor)
    return period


@transaction.atomic
def reopen(period, actor, reason):
    """
    Reopen a finalized period.

    Deliberately awkward: it needs an explicit reason, it is audited, and the
    filed snapshot is kept untouched so what was submitted remains recoverable.
    A locked period cannot be reopened at all — corrections go to a later
    period instead.
    """
    if period.status == VatPeriodStatus.LOCKED:
        raise FinalizationBlocked(
            f'{period} is locked. Post a correction to an open period rather than '
            'reopening a filed return.')
    if period.status != VatPeriodStatus.FINALIZED:
        raise FinalizationBlocked('Only a finalized period can be reopened.')
    if not reason or len(reason.strip()) < 15:
        raise FinalizationBlocked(
            'Reopening a filed VAT return requires a written reason.')

    period.status = VatPeriodStatus.REVIEW_REQUIRED
    period.reopened_at = timezone.now()
    period.reopened_by = actor
    period.reopen_reason = reason.strip()
    # filed_snapshot is deliberately left in place.
    period.save()

    _entries(period).update(is_locked=False)

    VatPeriodEvent.objects.create(
        period=period, event=VatPeriodEvent.Event.REOPENED,
        detail=reason.strip(), payload=period.filed_snapshot, actor=actor)
    return period


def _jsonable(value):
    """Decimals to strings, so a snapshot survives JSON without losing precision."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    return value


def ensure_periods(year):
    """Create the four quarters of a year if they are not there yet."""
    import datetime

    created = []
    for quarter in (1, 2, 3, 4):
        anchor = datetime.date(year, 3 * (quarter - 1) + 1, 1)
        period = VatPeriod.for_date(anchor)
        if period.events.filter(event=VatPeriodEvent.Event.CREATED).exists():
            continue
        VatPeriodEvent.objects.create(
            period=period, event=VatPeriodEvent.Event.CREATED,
            detail=f'{period} created ({period.start_date} to {period.end_date}).')
        created.append(period)
    return created
