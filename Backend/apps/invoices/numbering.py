"""
Invoice numbering.

A Dutch invoice number must be unique and sequential per series. The previous
implementation used `Invoice.objects.count() + 1`, which races under concurrency
and reuses a number after a deletion — two things a tax authority will not
accept. Numbers now come from a row that is locked for the duration of the
transaction, so two simultaneous requests cannot receive the same one.
"""

from django.db import transaction

from .models import DocumentSeries, InvoiceSequence


def _prefix_for(series):
    from apps.core.models import SystemConfig

    config = SystemConfig.objects.get_config()
    if series == DocumentSeries.CREDIT_NOTE:
        return config.credit_note_number_prefix or 'CN'
    return config.invoice_number_prefix or 'F'


@transaction.atomic
def next_number(series, year, digits=3):
    """
    Reserve and return the next number in a series.

    Must be called inside the transaction that creates the document: the row
    lock is held until commit, so a rollback releases the number rather than
    leaving a gap.
    """
    sequence, _ = InvoiceSequence.objects.get_or_create(series=series, year=year)
    sequence = InvoiceSequence.objects.select_for_update().get(pk=sequence.pk)
    sequence.last_number += 1
    sequence.save(update_fields=['last_number', 'updated_at'])
    return f'{_prefix_for(series)}{year}-{sequence.last_number:0{digits}d}'


def peek_number(series, year, digits=3):
    """What the next number would be, without reserving it. For previews only."""
    sequence = InvoiceSequence.objects.filter(series=series, year=year).first()
    last = sequence.last_number if sequence else 0
    return f'{_prefix_for(series)}{year}-{last + 1:0{digits}d}'


def adopt_existing_numbers():
    """
    Bring the sequences up to date with numbers already in the database.

    Run once after deploying, and again after importing historical invoices, so
    a newly issued number can never collide with one already sent to a customer.
    """
    import re

    from .models import Invoice

    highest = {}
    for number, doc_type in Invoice.objects.values_list('invoice_number', 'document_type'):
        match = re.search(r'(\d{4})-(\d+)$', number or '')
        if not match:
            continue
        year, sequence = int(match.group(1)), int(match.group(2))
        series = (DocumentSeries.CREDIT_NOTE if doc_type == 'credit_note'
                  else DocumentSeries.INVOICE)
        key = (series, year)
        highest[key] = max(highest.get(key, 0), sequence)

    for (series, year), last in highest.items():
        row, _ = InvoiceSequence.objects.get_or_create(series=series, year=year)
        if row.last_number < last:
            row.last_number = last
            row.save(update_fields=['last_number', 'updated_at'])
    return highest
