"""
Invoice and credit-note PDFs.

A Dutch invoice is a legal document, not a report. Article 35a of the Wet OB
requires the supplier's name, address and BTW-identificatienummer, the
customer's name and address, a sequential number, the issue date, the date the
service was supplied, a description, the taxable amount per rate, the rate, and
the VAT. A reverse-charged invoice must additionally carry the customer's BTW
number and the words "btw verlegd", and must not show VAT.

Everything printed here comes from stored data. The PDF never computes VAT.
"""

from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from apps.vat.constants import VatTreatmentCode

# CKM's own colours, kept in one place so the document reads as one design.
INK = colors.HexColor('#0F172A')
MUTED = colors.HexColor('#64748B')
RULE = colors.HexColor('#E2E8F0')
BRAND = colors.HexColor('#1E3A5F')
BAND = colors.HexColor('#F1F5F9')

MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
             'augustus', 'september', 'oktober', 'november', 'december']


def nl_date(value):
    if not value:
        return ''
    return f'{value.day} {MONTHS_NL[value.month - 1]} {value.year}'


def euro(value):
    """Dutch money formatting: 1.234,56."""
    amount = Decimal(value or 0).quantize(Decimal('0.01'))
    negative = amount < 0
    whole, _, cents = f'{abs(amount):.2f}'.partition('.')
    grouped = ''
    while len(whole) > 3:
        grouped = '.' + whole[-3:] + grouped
        whole = whole[:-3]
    text = f'€ {whole}{grouped},{cents}'
    return f'-{text}' if negative else text


def _trim_number(value):
    """'130.0' -> '130', '4.50' -> '4,5' — as a Dutch reader expects."""
    try:
        text = f'{Decimal(str(value)).normalize():f}'
    except Exception:
        return str(value)
    return text.replace('.', ',')


def _styles():
    base = getSampleStyleSheet()
    return {
        'title': ParagraphStyle('title', parent=base['Normal'], fontName='Helvetica-Bold',
                                fontSize=22, leading=26, textColor=BRAND),
        'h': ParagraphStyle('h', parent=base['Normal'], fontName='Helvetica-Bold',
                            fontSize=8, leading=11, textColor=MUTED,
                            spaceAfter=3),
        'body': ParagraphStyle('body', parent=base['Normal'], fontName='Helvetica',
                               fontSize=9, leading=13, textColor=INK),
        'small': ParagraphStyle('small', parent=base['Normal'], fontName='Helvetica',
                                fontSize=7.5, leading=10, textColor=MUTED),
        'cell': ParagraphStyle('cell', parent=base['Normal'], fontName='Helvetica',
                               fontSize=8.5, leading=11, textColor=INK),
        'cellb': ParagraphStyle('cellb', parent=base['Normal'], fontName='Helvetica-Bold',
                                fontSize=8.5, leading=11, textColor=INK),
        'num': ParagraphStyle('num', parent=base['Normal'], fontName='Helvetica',
                              fontSize=8.5, leading=11, textColor=INK, alignment=TA_RIGHT),
        'notice': ParagraphStyle('notice', parent=base['Normal'], fontName='Helvetica-Bold',
                                 fontSize=9, leading=13, textColor=BRAND),
    }


def _company_block(config, style):
    lines = [config.company_legal_name or config.company_name]
    if config.company_address:
        lines += [part for part in config.company_address.splitlines() if part.strip()]
    postal = ' '.join(filter(None, [config.company_postal_code, config.company_city]))
    if postal:
        lines.append(postal)
    if config.company_country:
        lines.append(config.company_country)
    # Read through the model's accessors: the settings page and this template
    # disagreed about the key name, so a phone entered in Settings was simply
    # missing from every invoice.
    emails = config.contact_emails
    phones = config.contact_phones
    if phones:
        lines.append(phones[0])
    if emails:
        lines.append(emails[0])
    if config.company_website:
        lines.append(config.company_website)
    return Paragraph('<br/>'.join(lines), style)


def _customer_block(invoice, style):
    customer = invoice.customer
    lines = [f'<b>{customer.company_name}</b>']
    street = ' '.join(filter(None, [
        customer.street_name or '',
        customer.house_number or '',
        customer.house_number_addition or ''])).strip()
    lines.append(street or (customer.address or ''))
    postal = ' '.join(filter(None, [customer.postcode or '', customer.city or '']))
    if postal.strip():
        lines.append(postal)
    if customer.country and customer.country.lower() not in ('netherlands', 'nederland'):
        lines.append(customer.country)
    if getattr(customer, 'btw_number', ''):
        lines.append(f'BTW: {customer.btw_number}')
    if getattr(customer, 'kvk_number', ''):
        lines.append(f'KvK: {customer.kvk_number}')
    return Paragraph('<br/>'.join(lines), style)


def _meta_table(invoice, config, style):
    is_credit = invoice.is_credit_note
    rows = [
        [Paragraph('Creditnotanummer' if is_credit else 'Factuurnummer', style['h']),
         Paragraph(f'<b>{invoice.invoice_number}</b>', style['cell'])],
        [Paragraph('Datum', style['h']),
         Paragraph(nl_date(invoice.issue_date), style['cell'])],
    ]
    if invoice.period_start and invoice.period_end:
        period = (nl_date(invoice.period_start) if invoice.period_start == invoice.period_end
                  else f'{nl_date(invoice.period_start)} t/m {nl_date(invoice.period_end)}')
        rows.append([Paragraph('Prestatieperiode', style['h']),
                     Paragraph(period, style['cell'])])
    if not is_credit and invoice.due_date:
        rows.append([Paragraph('Vervaldatum', style['h']),
                     Paragraph(nl_date(invoice.due_date), style['cell'])])
    if is_credit and invoice.corrects:
        rows.append([Paragraph('Betreft factuur', style['h']),
                     Paragraph(invoice.corrects.invoice_number, style['cell'])])
    if invoice.project:
        rows.append([Paragraph('Project', style['h']),
                     Paragraph(str(invoice.project.name), style['cell'])])

    table = Table(rows, colWidths=[32 * mm, 43 * mm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def _line_rows(invoice, style):
    """One row per line, with the surcharges that produced it shown beneath."""
    header = [
        Paragraph('Datum', style['h']), Paragraph('Omschrijving', style['h']),
        Paragraph('Uren', style['h']), Paragraph('Tarief', style['h']),
        Paragraph('Bedrag', style['h']),
    ]
    rows = [header]
    detail_rows = []

    for line in invoice.lines.filter(is_deleted=False).select_related(
            'employee', 'employee__user', 'project'):
        rows.append([
            Paragraph(line.work_date.strftime('%d-%m-%Y') if line.work_date else '',
                      style['cell']),
            Paragraph(line.description or '', style['cell']),
            Paragraph(f'{line.quantity_hours:.2f}'.replace('.', ','), style['num']),
            Paragraph(euro(line.hourly_rate), style['num']),
            Paragraph(euro(line.total), style['num']),
        ])
        for surcharge in (line.surcharge_breakdown or []):
            name = surcharge.get('name', 'Toeslag')
            # Helvetica has no arrow glyph, and a missing glyph prints as a
            # black box on the customer's invoice.
            percentage = _trim_number(surcharge.get('percentage', ''))
            hours = _trim_number(surcharge.get('hours', ''))
            rows.append([
                Paragraph('', style['cell']),
                Paragraph(f'<font color="#64748B">&#183; {name} '
                          f'({percentage}% over {hours} uur)</font>', style['small']),
                Paragraph('', style['num']), Paragraph('', style['num']),
                Paragraph(f'<font color="#64748B">{euro(surcharge.get("amount", 0))}'
                          f'</font>', style['small']),
            ])
            detail_rows.append(len(rows) - 1)

    for cost in invoice.costs.all():
        rows.append([
            Paragraph('', style['cell']),
            Paragraph(cost.description or str(cost.cost_type), style['cell']),
            Paragraph(f'{cost.quantity:.2f}'.replace('.', ','), style['num']),
            Paragraph(euro(cost.unit_price), style['num']),
            Paragraph(euro(cost.total), style['num']),
        ])
    for allowance in invoice.allowance_lines.all():
        rows.append([
            Paragraph('', style['cell']),
            Paragraph(allowance.description or allowance.allowance_name, style['cell']),
            Paragraph(f'{allowance.quantity_hours:.2f}'.replace('.', ','), style['num']),
            Paragraph(euro(allowance.hourly_rate), style['num']),
            Paragraph(euro(allowance.total), style['num']),
        ])
    for gratuity in invoice.gratuity_lines.all():
        rows.append([
            Paragraph('', style['cell']),
            Paragraph(gratuity.description or str(gratuity.gratuity), style['cell']),
            Paragraph('', style['num']), Paragraph('', style['num']),
            Paragraph(euro(gratuity.amount), style['num']),
        ])

    return rows, detail_rows


def _vat_summary(invoice):
    """
    Taxable amount per rate, straight from the lines.

    A Dutch invoice must show the total per rate. Reverse-charged lines are
    listed at their net amount with no VAT, which is what "btw verlegd" means.
    """
    buckets = {}
    for line in invoice.lines.filter(is_deleted=False):
        net = line.net_amount if line.net_amount is not None else line.total
        vat = line.vat_amount or Decimal('0.00')
        reverse = line.vat_return_box == '1e'
        key = ('verlegd' if reverse else
               (f'{line.vat_rate:.0f}' if line.vat_rate is not None else 'onbekend'))
        bucket = buckets.setdefault(key, {'net': Decimal('0.00'), 'vat': Decimal('0.00'),
                                          'reverse': reverse, 'rate': line.vat_rate})
        bucket['net'] += net
        bucket['vat'] += vat

    # Costs and allowances, on the same terms the invoice totals and the VAT
    # ledger use. This used to apply a flat rate here, which is a third place
    # deciding the same thing and a third chance to disagree.
    extras = invoice.extras_taxable
    if extras:
        extras_vat = invoice.extras_vat
        reverse = invoice.extras_treatment_code() == VatTreatmentCode.REVERSE_CHARGE
        key = ('verlegd' if reverse
               else (f'{invoice.vat_rate:.0f}' if extras_vat else 'onbekend'))
        bucket = buckets.setdefault(key, {'net': Decimal('0.00'), 'vat': Decimal('0.00'),
                                          'reverse': reverse, 'rate': invoice.vat_rate})
        bucket['net'] += extras
        bucket['vat'] += extras_vat

    return buckets


def _totals_table(invoice, config, style):
    buckets = _vat_summary(invoice)
    rows = [[Paragraph('Subtotaal', style['cell']),
             Paragraph(euro(invoice.subtotal + invoice.total_costs
                            + invoice.total_allowances), style['num'])]]

    for key, bucket in sorted(buckets.items()):
        if bucket['reverse']:
            rows.append([
                Paragraph(f'Btw verlegd over {euro(bucket["net"])}', style['cell']),
                Paragraph(euro(0), style['num'])])
        elif key == 'onbekend':
            rows.append([
                Paragraph('Btw (nog vast te stellen)', style['cell']),
                Paragraph(euro(bucket['vat']), style['num'])])
        else:
            rows.append([
                Paragraph(f'Btw {key}% over {euro(bucket["net"])}', style['cell']),
                Paragraph(euro(bucket['vat']), style['num'])])

    if invoice.total_gratuities:
        rows.append([Paragraph('Fooi', style['cell']),
                     Paragraph(euro(invoice.total_gratuities), style['num'])])

    rows.append([Paragraph('<b>Totaal</b>', style['cellb']),
                 Paragraph(f'<b>{euro(invoice.total)}</b>', style['num'])])

    table = Table(rows, colWidths=[60 * mm, 30 * mm], hAlign='RIGHT')
    table.setStyle(TableStyle([
        ('LINEABOVE', (0, -1), (-1, -1), 0.8, BRAND),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, -1), (-1, -1), BAND),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table


def build_invoice_pdf(invoice):
    """Render an invoice or credit note and return the PDF bytes."""
    from apps.core.models import SystemConfig

    config = SystemConfig.objects.get_config()
    style = _styles()
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=22 * mm,
        title=f'{invoice.invoice_number} — {invoice.customer.company_name}',
        author=config.company_legal_name or config.company_name,
        subject='Creditnota' if invoice.is_credit_note else 'Factuur',
    )

    story = []

    # ── Header: logo and title ───────────────────────────────────────────
    logo_cell = ''
    if config.company_logo:
        try:
            logo = Image(config.company_logo.path)
            ratio = logo.imageHeight / float(logo.imageWidth or 1)
            logo.drawWidth = 38 * mm
            logo.drawHeight = 38 * mm * ratio
            logo_cell = logo
        except Exception:
            logo_cell = Paragraph(
                f'<b>{config.company_legal_name or config.company_name}</b>',
                style['title'])
    else:
        logo_cell = Paragraph(
            f'<b>{config.company_legal_name or config.company_name}</b>', style['title'])

    heading = 'CREDITNOTA' if invoice.is_credit_note else 'FACTUUR'
    header = Table(
        [[logo_cell, Paragraph(heading, style['title'])]],
        colWidths=[95 * mm, 79 * mm])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story += [header, Spacer(1, 8 * mm)]

    # ── Addresses and document meta ──────────────────────────────────────
    addresses = Table([[
        _company_block(config, style['body']),
        _customer_block(invoice, style['body']),
        _meta_table(invoice, config, style),
    ]], colWidths=[58 * mm, 56 * mm, 60 * mm])
    addresses.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (-1, 0), (-1, 0), 0),
    ]))
    story += [addresses, Spacer(1, 8 * mm)]

    # ── Lines ────────────────────────────────────────────────────────────
    rows, detail_rows = _line_rows(invoice, style)
    table = Table(rows, colWidths=[22 * mm, 82 * mm, 16 * mm, 25 * mm, 29 * mm],
                  repeatRows=1)
    line_style = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.8, BRAND),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for index in range(1, len(rows)):
        if index not in detail_rows:
            line_style.append(('LINEBELOW', (0, index), (-1, index), 0.4, RULE))
    table.setStyle(TableStyle(line_style))
    story += [table, Spacer(1, 6 * mm)]

    # ── Totals ───────────────────────────────────────────────────────────
    story.append(_totals_table(invoice, config, style))

    # ── Legally required notices ─────────────────────────────────────────
    notices = []
    if invoice.has_reverse_charged_lines:
        wording = config.invoice_reverse_charge_text or 'Btw verlegd'
        vat_number = (invoice.customer.btw_number or '').strip()
        notices.append(Paragraph(
            f'{wording}. Btw-identificatienummer afnemer: {vat_number or "—"}.',
            style['notice']))
    if invoice.is_credit_note and invoice.correction_reason:
        notices.append(Paragraph(
            f'Reden creditering: {invoice.correction_reason}', style['body']))
    if invoice.notes:
        notices.append(Paragraph(invoice.notes, style['body']))
    if notices:
        story.append(Spacer(1, 6 * mm))
        story.append(KeepTogether(notices))

    if not invoice.is_credit_note:
        payment = [
            Paragraph('Betaling', style['h']),
            Paragraph(
                f'Wij verzoeken u het totaalbedrag van <b>{euro(invoice.total)}</b> '
                f'{"uiterlijk " + nl_date(invoice.due_date) + " " if invoice.due_date else ""}'
                f'over te maken op {config.company_iban or "—"} '
                f'ten name van {config.company_legal_name or config.company_name}, '
                f'onder vermelding van factuurnummer {invoice.invoice_number}.',
                style['body']),
        ]
        story.append(Spacer(1, 8 * mm))
        story.append(KeepTogether(payment))

    if config.invoice_footer_text:
        story += [Spacer(1, 6 * mm), Paragraph(config.invoice_footer_text, style['small'])]

    def decorate(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, 16 * mm, A4[0] - 18 * mm, 16 * mm)
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(MUTED)
        identity = ' · '.join(filter(None, [
            config.company_legal_name or config.company_name,
            f'KvK {config.company_kvk_number}' if config.company_kvk_number else '',
            f'BTW {config.company_btw_number}' if config.company_btw_number else '',
            f'IBAN {config.company_iban}' if config.company_iban else '',
        ]))
        canvas.drawString(18 * mm, 11 * mm, identity)
        canvas.drawRightString(A4[0] - 18 * mm, 11 * mm,
                               f'Pagina {document.page}')
        canvas.restoreState()

    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()
