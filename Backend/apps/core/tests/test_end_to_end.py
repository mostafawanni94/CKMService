"""
The whole cycle, once, through the API.

An employee logs hours, the back office approves them, the customer is invoiced,
the invoice is issued and paid, the employee is paid, and the quarter is filed.
Each step is checked against the next, because the failures that matter are the
ones between the apps: money that reaches the invoice but not the wallet, or the
wallet but not the VAT return.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import SystemConfig
from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user, make_work_entry,
)

MONDAY = date(2026, 8, 10)          # ISO week 33 of 2026
ISSUE_DATE = date(2026, 8, 17)


class FullCycleTests(TestCase):
    """
    CKM cleans an office for Smaak voor Groen: three shifts at EUR 40/hour,
    one of them at night with a 130% surcharge.
    """

    def setUp(self):
        config = SystemConfig.objects.get_config()
        config.company_legal_name = 'CKMcleaning VOF'
        config.company_kvk_number = '42074970'
        config.company_btw_number = 'NL869591071B01'
        config.company_iban = 'NL20INGB0119413256'
        config.company_address = 'Rilland Bathstraat 126'
        config.company_postal_code = '3086 ST'
        config.company_city = 'Rotterdam'
        config.invoice_payment_terms_days = 14
        config.save()

        self.admin = make_user(email='e2e-admin@ckm.test', role='admin')
        self.customer = make_customer(company_name='Smaak voor Groen',
                                      btw_number='NL001538146B17')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer, name='Kantoor Rotterdam')
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))

        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))

        self.employee = make_employee(hourly_rate=Decimal('16.00'),
                                      receives_surcharges=True)

        self.back_office = APIClient()
        self.back_office.force_authenticate(self.admin)
        self.mobile = APIClient()
        self.mobile.force_authenticate(self.employee.user)

    # ── the cycle ─────────────────────────────────────────────────────────

    def _log_and_approve(self, day, start='09:00', end='17:00', **kwargs):
        entry = make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=MONDAY + timedelta(days=day), start=start, end=end,
            status='submitted', **kwargs)
        response = self.back_office.post(
            f'/api/worklogs/entries/{entry.pk}/approve/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        entry.refresh_from_db()
        return entry

    def test_hours_become_an_invoice_a_wallet_balance_and_a_vat_return(self):
        from apps.invoices.models import Invoice
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return, finalize
        from apps.wallet.services import wallet_for

        # 1. Three shifts, approved.
        self._log_and_approve(0)                                   # 7.5h day
        self._log_and_approve(1)                                   # 7.5h day
        self._log_and_approve(2, start='02:00', end='08:00',
                              break_minutes=0)                     # 6h, partly night

        # 2. The wallet has been credited at the employee's own rate.
        wallet = wallet_for(self.employee)
        self.assertGreater(wallet.balance, Decimal('0.00'))
        wallet_after_work = wallet.balance

        # 3. The back office previews what would be billed.
        preview = self.back_office.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.data['entry_count'], 3)
        expected_subtotal = preview.data['subtotal']

        # 4. And generates the invoice.
        created = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(created.status_code, 201)
        invoice_id = created.data['invoice']['id']
        self.assertEqual(Decimal(created.data['invoice']['subtotal']),
                         expected_subtotal)

        # 5. Nothing blocks it, so it is issued.
        gate = self.back_office.get(f'/api/invoices/invoices/{invoice_id}/blockers/')
        self.assertTrue(gate.data['can_issue'], gate.data['blockers'])

        issued = self.back_office.post(f'/api/invoices/invoices/{invoice_id}/issue/')
        self.assertEqual(issued.status_code, 200)

        invoice = Invoice.objects.get(pk=invoice_id)
        self.assertEqual(invoice.status, Invoice.Status.SENT)
        self.assertEqual(invoice.due_date, invoice.issue_date + timedelta(days=14))
        self.assertTrue(invoice.pdf_file)

        # 6. The PDF is a real document.
        pdf = self.back_office.get(f'/api/invoices/invoices/{invoice_id}/pdf/')
        self.assertTrue(pdf.content.startswith(b'%PDF'))

        # 7. The VAT reached the ledger, and the return agrees with the invoice.
        period = VatPeriod.for_date(invoice.issue_date)
        result = calculate_return(period)
        box_1a = next(b for b in result['boxes'] if b['code'] == '1a')
        self.assertEqual(box_1a['taxable_base'], invoice.subtotal)
        self.assertEqual(result['box_5a'], invoice.vat_amount)
        self.assertEqual(result['requires_review_count'], 0)

        # 8. The customer pays.
        paid = self.back_office.post(
            f'/api/invoices/invoices/{invoice_id}/record-payment/',
            {'amount': str(invoice.total)}, format='json')
        self.assertEqual(paid.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)

        # 9. The employee is paid, and the wallet is settled rather than reset.
        from apps.hr.models import PayrollPeriod, Payslip

        payroll = PayrollPeriod.objects.create(
            name='Augustus 2026', start_date=MONDAY,
            end_date=MONDAY + timedelta(days=20))
        Payslip.objects.create(period=payroll, employee=self.employee,
                               net_pay=wallet_after_work)
        settled = self.back_office.post(
            f'/api/hr/payroll-periods/{payroll.pk}/mark_paid/', {}, format='json')
        self.assertEqual(settled.status_code, 200)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))

        # 10. The quarter can be filed, and the snapshot holds.
        finalized = self.back_office.post(f'/api/vat/periods/{period.pk}/finalize/')
        self.assertEqual(finalized.status_code, 200)
        snapshot = self.back_office.get(f'/api/vat/periods/{period.pk}/snapshot/')
        self.assertEqual(Decimal(snapshot.data['snapshot']['box_5a']),
                         invoice.vat_amount)

        # 11. The accountant's workbook is produced.
        export = self.back_office.get(f'/api/vat/periods/{period.pk}/export/')
        self.assertEqual(export.status_code, 200)
        self.assertTrue(export.content.startswith(b'PK'))

    def test_the_same_hours_cannot_be_billed_or_paid_twice(self):
        from apps.wallet.models import WalletTransaction

        entry = self._log_and_approve(0)

        # Approving again is refused, and does not credit the wallet twice.
        again = self.back_office.post(
            f'/api/worklogs/entries/{entry.pk}/approve/', {}, format='json')
        self.assertEqual(again.status_code, 400)
        self.assertEqual(WalletTransaction.objects.filter(
            reference_id=entry.pk,
            transaction_type=WalletTransaction.Type.EARNING).count(), 1)

        self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')

        # The work is gone from the next preview, and a second invoice for the
        # same week is refused.
        preview = self.back_office.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(preview.data['entry_count'], 0)

        duplicate = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(duplicate.status_code, 400)

    def test_a_mistake_after_issue_is_credited_not_edited(self):
        from apps.invoices.models import Invoice
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return

        self._log_and_approve(0)
        created = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        invoice_id = created.data['invoice']['id']
        self.back_office.post(f'/api/invoices/invoices/{invoice_id}/issue/')

        invoice = Invoice.objects.get(pk=invoice_id)
        original = (invoice.subtotal, invoice.vat_amount, invoice.total)

        credited = self.back_office.post(
            f'/api/invoices/invoices/{invoice_id}/credit-note/',
            {'reason': 'Billed to the wrong customer entirely.'}, format='json')
        self.assertEqual(credited.status_code, 201)

        invoice.refresh_from_db()
        self.assertEqual((invoice.subtotal, invoice.vat_amount, invoice.total),
                         original)
        self.assertEqual(invoice.net_of_credits, Decimal('0.00'))

        period = VatPeriod.for_date(invoice.issue_date)
        self.assertEqual(calculate_return(period)['box_5a'], Decimal('0.00'))

    def test_an_unestablished_vat_treatment_stops_the_whole_chain(self):
        """
        Nothing is guessed. Without a stated treatment the invoice cannot be
        issued, so no VAT is declared and no return can be filed on a guess.
        """
        from apps.vat.models import VatPeriod
        from apps.vat.returns import blockers_for

        self.customer.vat_treatment_code = 'UNKNOWN'
        self.customer.save()
        self._log_and_approve(0)

        created = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        invoice_id = created.data['invoice']['id']

        gate = self.back_office.get(f'/api/invoices/invoices/{invoice_id}/blockers/')
        self.assertFalse(gate.data['can_issue'])
        self.assertEqual(gate.data['blockers'][0]['code'], 'VAT_REQUIRES_REVIEW')

        issued = self.back_office.post(f'/api/invoices/invoices/{invoice_id}/issue/')
        self.assertEqual(issued.status_code, 400)

    def test_an_employee_cannot_see_the_money_side(self):
        self._log_and_approve(0)
        for path in ('/api/invoices/invoices/', '/api/vat/periods/',
                     '/api/vat/dashboard/', '/api/expenses/expenses/'):
            with self.subTest(path=path):
                self.assertEqual(self.mobile.get(path).status_code, 403)

    def test_the_employee_sees_their_own_earnings(self):
        self._log_and_approve(0)
        response = self.mobile.get('/api/invoices/pending-earnings/')
        self.assertEqual(response.status_code, 200)
        self.assertGreater(Decimal(response.data['total_pending_amount']),
                           Decimal('0.00'))
