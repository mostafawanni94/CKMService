"""
Sending invoices and credit notes to customers.

Delivery is recorded on the document, so "did we send it, and to whom" is a
question the database answers rather than someone's memory of an email client.
"""

import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


def _body(invoice, config):
    from .pdf import euro, nl_date

    company = config.company_legal_name or config.company_name
    is_credit = invoice.is_credit_note
    heading = 'Creditnota' if is_credit else 'Factuur'

    if is_credit:
        ask = (f'Hierbij ontvangt u creditnota <strong>{invoice.invoice_number}</strong> '
               f'ter waarde van <strong>{euro(abs(invoice.total))}</strong>'
               + (f', behorend bij factuur {invoice.corrects.invoice_number}'
                  if invoice.corrects else '') + '.')
    else:
        ask = (f'Hierbij ontvangt u factuur <strong>{invoice.invoice_number}</strong> '
               f'ter waarde van <strong>{euro(invoice.total)}</strong>'
               + (f', te voldoen vóór {nl_date(invoice.due_date)}'
                  if invoice.due_date else '') + '.')

    period = ''
    if invoice.period_start and invoice.period_end:
        period = (f'<p style="margin:0 0 16px;color:#475569">Prestatieperiode: '
                  f'{nl_date(invoice.period_start)} t/m {nl_date(invoice.period_end)}.</p>')

    verlegd = ''
    if invoice.has_reverse_charged_lines:
        verlegd = ('<p style="margin:0 0 16px;color:#475569">Op deze factuur is de '
                   'btw verlegd naar u als afnemer.</p>')

    return f"""
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;
            max-width:560px;margin:0 auto;color:#0F172A">
  <h2 style="color:#1E3A5F;margin:0 0 4px">{heading} {invoice.invoice_number}</h2>
  <p style="margin:0 0 20px;color:#64748B">{company}</p>
  <p style="margin:0 0 16px">Beste {invoice.customer.company_name},</p>
  <p style="margin:0 0 16px">{ask}</p>
  {period}
  {verlegd}
  <p style="margin:0 0 16px">De {heading.lower()} vindt u als bijlage bij deze e-mail.</p>
  <p style="margin:24px 0 0;color:#64748B;font-size:13px">
    Met vriendelijke groet,<br/>{company}
  </p>
</div>
"""


def email_invoice(invoice, recipient, actor=None):
    """
    Send the document to one address, with the stored PDF attached.

    Returns False when email is not configured, so the caller can say so
    instead of silently reporting success.
    """
    from apps.core.models import SystemConfig
    from apps.notifications.email_service import EmailService

    from .billing import render_pdf

    config = SystemConfig.objects.get_config()
    service = EmailService.from_config()
    if not service.is_configured():
        logger.warning('Invoice %s not sent: SMTP is not configured.',
                       invoice.invoice_number)
        return False

    render_pdf(invoice)
    invoice.pdf_file.open('rb')
    content = invoice.pdf_file.read()
    invoice.pdf_file.close()

    heading = 'Creditnota' if invoice.is_credit_note else 'Factuur'
    company = config.company_legal_name or config.company_name
    sent = service.send_email(
        recipients=[recipient],
        subject=f'{heading} {invoice.invoice_number} — {company}',
        html_content=_body(invoice, config),
        attachments=[(f'{invoice.invoice_number}.pdf', content, 'application/pdf')],
    )

    if sent:
        invoice.sent_at = timezone.now()
        invoice.sent_to = recipient
        invoice.updated_by = actor
        invoice.save(update_fields=['sent_at', 'sent_to', 'updated_by', 'updated_at'])
    return sent
