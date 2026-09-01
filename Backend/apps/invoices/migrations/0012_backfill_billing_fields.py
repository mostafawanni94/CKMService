"""
Bring existing invoices in line with the new billing fields.

Nothing about an existing invoice's money changes. Period dates are filled in
from the week they already record, lines are marked as service lines with the
work date they already imply, and their totals are marked explicit so that
saving one can no longer silently recompute it from hours x rate.
"""

from django.db import migrations
from django.db.models import F


def forwards(apps, schema_editor):
    Invoice = apps.get_model('invoices', 'Invoice')
    InvoiceLine = apps.get_model('invoices', 'InvoiceLine')

    Invoice.objects.filter(period_start__isnull=True).update(
        period_start=F('week_start_date'))
    Invoice.objects.filter(period_end__isnull=True).update(
        period_end=F('week_end_date'))

    # A line's work date is the entry's, when we still have the entry.
    for line in InvoiceLine.objects.select_related('work_entry').iterator():
        changed = []
        if line.work_date is None:
            if line.work_entry_id and getattr(line.work_entry, 'work_date', None):
                line.work_date = line.work_entry.work_date
            else:
                line.work_date = line.invoice.week_start_date
            changed.append('work_date')
        if not line.total_is_explicit:
            line.total_is_explicit = True
            changed.append('total_is_explicit')
        if changed:
            line.save(update_fields=changed)

    # Sequences must know about numbers already issued, or a new invoice could
    # be given a number a customer has already received.
    InvoiceSequence = apps.get_model('invoices', 'InvoiceSequence')
    import re
    highest = {}
    for number, doc_type in Invoice.objects.values_list('invoice_number', 'document_type'):
        match = re.search(r'(\d{4})-(\d+)$', number or '')
        if not match:
            continue
        year, sequence = int(match.group(1)), int(match.group(2))
        series = 'credit_note' if doc_type == 'credit_note' else 'invoice'
        key = (series, year)
        highest[key] = max(highest.get(key, 0), sequence)
    for (series, year), last in highest.items():
        row, _ = InvoiceSequence.objects.get_or_create(
            series=series, year=year, defaults={'last_number': last})
        if row.last_number < last:
            row.last_number = last
            row.save(update_fields=['last_number'])


def backwards(apps, schema_editor):
    """Nothing to undo: the fields themselves are removed by the schema migration."""


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0011_invoicesequence'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
