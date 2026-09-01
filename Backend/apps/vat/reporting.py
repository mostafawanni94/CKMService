"""
Finance reporting.

One place that answers "how is the business doing", built from the same records
the VAT return is built from. Nothing here re-derives VAT: box figures come from
`apps.vat.returns`, and everything else comes from the documents themselves.

The point of gathering it here is that the dashboard, the exports and the
accountant hand-off all read the same numbers.
"""

from datetime import date
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth

from .constants import ClassificationStatus
from .models import VatLedgerEntry, VatPeriod
from .returns import calculate_return, derive_status

ZERO = Value(Decimal('0.00'), output_field=DecimalField(max_digits=14, decimal_places=2))


def window_for(year, quarter=None, month=None):
    """The date range a report covers. A year, a quarter, or a month."""
    from datetime import timedelta

    if quarter:
        start_month = 3 * (quarter - 1) + 1
        start = date(year, start_month, 1)
        end = (date(year + 1, 1, 1) if quarter == 4 else date(year, start_month + 3, 1))
    elif month:
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    else:
        start, end = date(year, 1, 1), date(year + 1, 1, 1)
    return start, end - timedelta(days=1)


# ─────────────────────────────────────────────────────────────────────────────
# Revenue and costs
# ─────────────────────────────────────────────────────────────────────────────

def revenue(start, end):
    """
    What CKM invoiced, net of VAT and net of credit notes.

    Counts issued documents only. A draft is not revenue, and a credit note
    reduces it — which a plain sum over invoices would miss.
    """
    from apps.invoices.models import Invoice

    # An invoice counts as revenue once it has been issued — it has an issue
    # date and is no longer a draft. An invoice cancelled *after* issue was
    # still real revenue at the time; its credit note is what reverses it, so
    # excluding the invoice as well would subtract the same money twice.
    documents = Invoice.objects.filter(
        is_deleted=False,
        issue_date__gte=start, issue_date__lte=end,
    ).exclude(issue_date__isnull=True).exclude(
        status__in=[Invoice.Status.DRAFT, Invoice.Status.PENDING])

    invoices = documents.filter(document_type=Invoice.DocumentType.INVOICE)
    credits = documents.filter(document_type=Invoice.DocumentType.CREDIT_NOTE)

    invoiced = invoices.aggregate(
        net=Coalesce(Sum('subtotal'), ZERO),
        vat=Coalesce(Sum('vat_amount'), ZERO),
        gross=Coalesce(Sum('total'), ZERO),
        count=Count('id'))
    credited = credits.aggregate(
        net=Coalesce(Sum('subtotal'), ZERO),
        vat=Coalesce(Sum('vat_amount'), ZERO),
        gross=Coalesce(Sum('total'), ZERO),
        count=Count('id'))
    # Cancelled without a credit note: voided some other way. Worth reporting,
    # because it means revenue disappeared without a document explaining it.
    cancelled_uncredited = invoices.filter(
        status=Invoice.Status.CANCELLED, credit_notes__isnull=True).aggregate(
        net=Coalesce(Sum('subtotal'), ZERO))

    return {
        'invoiced_net': invoiced['net'],
        'invoiced_vat': invoiced['vat'],
        'invoiced_gross': invoiced['gross'],
        'invoice_count': invoiced['count'],
        'credited_net': abs(credited['net']),
        'credited_gross': abs(credited['gross']),
        'credit_note_count': credited['count'],
        'net_revenue': invoiced['net'] + credited['net'],
        'gross_revenue': invoiced['gross'] + credited['gross'],
        'cancelled_uncredited_net': cancelled_uncredited['net'],
    }


def costs(start, end):
    """Supplier invoices, agency invoices and expenses, net of VAT."""
    from apps.expenses.models import Expense
    from apps.invoices.models import AgencyInvoice, IncomingInvoice

    supplier = IncomingInvoice.objects.filter(
        is_deleted=False, invoice_date__gte=start, invoice_date__lte=end,
    ).aggregate(net=Coalesce(Sum('subtotal'), ZERO),
                vat=Coalesce(Sum('vat_amount'), ZERO),
                count=Count('id'))

    agency = AgencyInvoice.objects.filter(
        is_deleted=False, issue_date__gte=start, issue_date__lte=end,
    ).aggregate(net=Coalesce(Sum('subtotal'), ZERO),
                surcharges=Coalesce(Sum('total_surcharges'), ZERO),
                vat=Coalesce(Sum('vat_amount'), ZERO),
                count=Count('id'))

    expense = Expense.objects.filter(
        is_deleted=False, expense_date__gte=start, expense_date__lte=end,
    ).aggregate(net=Coalesce(Sum('amount_excl_vat'), ZERO),
                vat=Coalesce(Sum('vat_amount'), ZERO),
                count=Count('id'))

    agency_net = agency['net'] + agency['surcharges']
    return {
        'supplier_net': supplier['net'], 'supplier_vat': supplier['vat'],
        'supplier_count': supplier['count'],
        'agency_net': agency_net, 'agency_vat': agency['vat'],
        'agency_count': agency['count'],
        'expense_net': expense['net'], 'expense_vat': expense['vat'],
        'expense_count': expense['count'],
        'total_net': supplier['net'] + agency_net + expense['net'],
    }


def receivables(as_of=None):
    """What customers owe, and how late they are."""
    from datetime import timedelta

    from apps.invoices.models import Invoice

    as_of = as_of or date.today()
    outstanding = Invoice.objects.filter(
        is_deleted=False,
        document_type=Invoice.DocumentType.INVOICE,
        status__in=['sent', 'partially_paid', 'overdue'],
    ).annotate(outstanding=F('total') - F('amount_paid'))

    buckets = {'current': Decimal('0.00'), 'days_1_30': Decimal('0.00'),
               'days_31_60': Decimal('0.00'), 'days_61_90': Decimal('0.00'),
               'days_90_plus': Decimal('0.00')}
    total = Decimal('0.00')
    overdue_count = 0

    for invoice in outstanding.only('total', 'amount_paid', 'due_date'):
        amount = invoice.total - invoice.amount_paid
        if amount <= 0:
            continue
        total += amount
        days = (as_of - invoice.due_date).days if invoice.due_date else 0
        if days <= 0:
            buckets['current'] += amount
        else:
            overdue_count += 1
            if days <= 30:
                buckets['days_1_30'] += amount
            elif days <= 60:
                buckets['days_31_60'] += amount
            elif days <= 90:
                buckets['days_61_90'] += amount
            else:
                buckets['days_90_plus'] += amount

    return {'total_outstanding': total, 'overdue_count': overdue_count,
            'ageing': buckets, 'as_of': as_of}


def payables(as_of=None):
    """What CKM owes: suppliers, agencies and its own employees."""
    from apps.invoices.models import AgencyInvoice, IncomingInvoice
    from apps.wallet.services import summary as wallet_summary

    supplier = IncomingInvoice.objects.filter(
        is_deleted=False).exclude(status='paid').aggregate(
        total=Coalesce(Sum('total'), ZERO), count=Count('id'))
    agency = AgencyInvoice.objects.filter(
        is_deleted=False).exclude(status='paid').annotate(
        outstanding=F('total') - F('amount_paid')).aggregate(
        total=Coalesce(Sum('outstanding'), ZERO), count=Count('id'))
    wallets = wallet_summary()

    return {
        'supplier_outstanding': supplier['total'],
        'supplier_count': supplier['count'],
        'agency_outstanding': agency['total'],
        'agency_count': agency['count'],
        'employee_wallets': wallets['total_owed'],
        'total': supplier['total'] + agency['total'] + wallets['total_owed'],
    }


def monthly_series(year):
    """Revenue and costs by month, for the dashboard chart."""
    from apps.expenses.models import Expense
    from apps.invoices.models import Invoice

    revenue_by_month = dict(
        Invoice.objects.filter(
            is_deleted=False, issue_date__year=year,
            document_type=Invoice.DocumentType.INVOICE,
        ).exclude(status='cancelled')
        .annotate(month=TruncMonth('issue_date'))
        .values_list('month').annotate(total=Coalesce(Sum('subtotal'), ZERO))
        .values_list('month', 'total'))

    credits_by_month = dict(
        Invoice.objects.filter(
            is_deleted=False, issue_date__year=year,
            document_type=Invoice.DocumentType.CREDIT_NOTE)
        .annotate(month=TruncMonth('issue_date'))
        .values_list('month').annotate(total=Coalesce(Sum('subtotal'), ZERO))
        .values_list('month', 'total'))

    costs_by_month = dict(
        Expense.objects.filter(is_deleted=False, expense_date__year=year)
        .annotate(month=TruncMonth('expense_date'))
        .values_list('month').annotate(total=Coalesce(Sum('amount_excl_vat'), ZERO))
        .values_list('month', 'total'))

    series = []
    for month in range(1, 13):
        key = date(year, month, 1)
        earned = revenue_by_month.get(key, Decimal('0.00')) + \
            credits_by_month.get(key, Decimal('0.00'))
        spent = costs_by_month.get(key, Decimal('0.00'))
        series.append({
            'month': month,
            'label': key.strftime('%b'),
            'revenue': earned,
            'costs': spent,
            'margin': earned - spent,
        })
    return series


def customer_revenue(start, end, limit=10):
    """Who the revenue came from."""
    from apps.invoices.models import Invoice

    rows = (Invoice.objects.filter(
        is_deleted=False, issue_date__gte=start, issue_date__lte=end,
        document_type=Invoice.DocumentType.INVOICE,
    ).exclude(status='cancelled')
        .values('customer_id', 'customer__company_name')
        .annotate(net=Coalesce(Sum('subtotal'), ZERO), invoices=Count('id'))
        .order_by('-net')[:limit])
    return [{'customer_id': str(row['customer_id']),
             'customer': row['customer__company_name'],
             'net': row['net'], 'invoices': row['invoices']} for row in rows]


# ─────────────────────────────────────────────────────────────────────────────
# The dashboard
# ─────────────────────────────────────────────────────────────────────────────

def dashboard(year, quarter=None):
    """
    Everything the finance page shows, in one query set.

    The VAT figures come from the return calculator, so the dashboard cannot
    disagree with what would actually be filed.
    """
    start, end = window_for(year, quarter)

    vat = None
    periods = []
    for period in VatPeriod.objects.filter(year=year).order_by('quarter'):
        result = calculate_return(period)
        summary = {
            'id': str(period.pk), 'quarter': period.quarter,
            'label': str(period), 'status': derive_status(period),
            'is_closed': period.is_closed,
            'box_5a': result['box_5a'], 'box_5b': result['box_5b'],
            'vat_position': result['vat_position'], 'outcome': result['outcome'],
            'requires_review_count': result['requires_review_count'],
        }
        periods.append(summary)
        if quarter and period.quarter == quarter:
            vat = result

    earned = revenue(start, end)
    spent = costs(start, end)

    unresolved = VatLedgerEntry.objects.filter(
        is_deleted=False,
        classification_status=ClassificationStatus.REQUIRES_REVIEW,
        transaction_date__gte=start, transaction_date__lte=end,
    ).count()

    return {
        'year': year, 'quarter': quarter,
        'period_start': start, 'period_end': end,
        'revenue': earned,
        'costs': spent,
        'gross_margin': earned['net_revenue'] - spent['total_net'],
        'receivables': receivables(),
        'payables': payables(),
        'vat_periods': periods,
        'vat_return': vat,
        'requires_review_count': unresolved,
        'monthly': monthly_series(year),
        'top_customers': customer_revenue(start, end),
    }
