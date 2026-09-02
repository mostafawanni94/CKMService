"""
One quarter of trading, start to finish, through the API.

Customer → project → employee → assignment → approved work, day and night →
surcharge → employee earnings → wallet → billing → preview → VAT → invoice →
PDF → issue → ledger → period → reconciliation → accountant export. Then the
mistake: credit note → VAT correction → audit trail.

Each step is checked against the next, because the failures that matter live
between the apps rather than inside them.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import SystemConfig
from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user,
)

MONDAY = date(2026, 8, 10)          # ISO week 33
ISSUE_DATE = date(2026, 8, 17)


class QuarterOfTradingTests(TestCase):
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

        self.admin = make_user(email='cycle-admin@ckm.test', role='admin')
        self.back_office = APIClient()
        self.back_office.force_authenticate(self.admin)

        self.customer = make_customer(company_name='Kantoorpand Blaak',
                                      btw_number='NL812345678B01')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer, name='Dagelijkse schoonmaak')
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))

        self.employee = make_employee(hourly_rate=Decimal('16.00'),
                                      receives_surcharges=True)
        self.mobile = APIClient()
        self.mobile.force_authenticate(self.employee.user)

    def _approve(self, day, start, end, break_minutes):
        from apps.core.testing import make_work_entry

        entry = make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=MONDAY + timedelta(days=day), start=start, end=end,
            break_minutes=break_minutes, status='submitted')
        response = self.back_office.post(
            f'/api/worklogs/entries/{entry.pk}/approve/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        entry.refresh_from_db()
        return entry

    def test_the_whole_cycle(self):
        from apps.hr.models import PayrollPeriod, Payslip
        from apps.invoices.models import Invoice
        from apps.vat.models import VatLedgerEntry, VatPeriod
        from apps.vat.returns import calculate_return
        from apps.wallet.services import wallet_for

        # ── 1. two day shifts and one night shift, approved ──────────────
        self._approve(0, '09:00', '17:00', 30)          # 7.5h
        self._approve(1, '09:00', '17:00', 30)          # 7.5h
        self._approve(2, '02:00', '08:00', 0)           # 6h, 4 of them at night

        # ── 2. the employee's wallet, at their own rate ──────────────────
        wallet = wallet_for(self.employee)
        # (7.5 + 7.5 + 6) x 16 = 336, plus 4 night hours x 16 x 30% = 19.20
        self.assertEqual(wallet.balance, Decimal('355.20'))

        # and the mobile earnings screen agrees
        earnings = self.mobile.get('/api/invoices/pending-earnings/')
        self.assertEqual(earnings.status_code, 200)
        self.assertEqual(Decimal(earnings.data['total_pending_amount']),
                         Decimal('355.20'))

        # ── 3. preview: nothing created, the surcharge itemised ──────────
        preview = self.back_office.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.data['entry_count'], 3)
        # 300 + 300 + (240 + 48) = 888
        self.assertEqual(preview.data['subtotal'], Decimal('888.00'))
        self.assertEqual(preview.data['warnings'], [])
        night_line = next(row for row in preview.data['lines'] if row['surcharges'])
        self.assertEqual(night_line['surcharges'][0]['name'], 'Nachttoeslag')
        self.assertEqual(Invoice.objects.count(), 0)

        # ── 4. generate ──────────────────────────────────────────────────
        created = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(created.status_code, 201)
        invoice_id = created.data['invoice']['id']

        # ── 5. nothing blocks it ─────────────────────────────────────────
        gate = self.back_office.get(f'/api/invoices/invoices/{invoice_id}/blockers/')
        self.assertTrue(gate.data['can_issue'], gate.data['blockers'])

        # ── 6. issue: dated, PDF stored, VAT posted ──────────────────────
        issued = self.back_office.post(
            f'/api/invoices/invoices/{invoice_id}/issue/')
        self.assertEqual(issued.status_code, 200)

        invoice = Invoice.objects.get(pk=invoice_id)
        self.assertEqual(invoice.status, Invoice.Status.SENT)
        self.assertEqual(invoice.subtotal, Decimal('888.00'))
        self.assertEqual(invoice.vat_amount, Decimal('186.48'))
        self.assertEqual(invoice.total, Decimal('1074.48'))
        self.assertEqual(invoice.due_date, invoice.issue_date + timedelta(days=14))
        self.assertTrue(invoice.pdf_file)

        # ── 7. the document says what it must ────────────────────────────
        import io

        from PyPDF2 import PdfReader

        pdf = self.back_office.get(f'/api/invoices/invoices/{invoice_id}/pdf/')
        text = PdfReader(io.BytesIO(pdf.content)).pages[0].extract_text()
        for required in (invoice.invoice_number, 'KvK 42074970',
                         'BTW NL869591071B01', 'Nachttoeslag', 'Btw 21%'):
            self.assertIn(required, text, f'the invoice omits {required}')

        # ── 8. the ledger and the return agree with the document ─────────
        period = VatPeriod.for_date(invoice.issue_date)
        result = calculate_return(period)
        box_1a = next(box for box in result['boxes'] if box['code'] == '1a')
        self.assertEqual(box_1a['taxable_base'], invoice.subtotal)
        self.assertEqual(result['box_5a'], invoice.vat_amount)
        self.assertEqual(result['requires_review_count'], 0)

        # ── 9. the customer pays ─────────────────────────────────────────
        self.back_office.post(f'/api/invoices/invoices/{invoice_id}/record-payment/',
                              {'amount': str(invoice.total)}, format='json')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)

        # ── 10. payroll settles the wallet ───────────────────────────────
        payroll = PayrollPeriod.objects.create(
            name='Augustus 2026', start_date=MONDAY,
            end_date=MONDAY + timedelta(days=20))
        Payslip.objects.create(period=payroll, employee=self.employee,
                               net_pay=Decimal('355.20'))
        settled = self.back_office.post(
            f'/api/hr/payroll-periods/{payroll.pk}/mark_paid/', {}, format='json')
        self.assertEqual(settled.status_code, 200)
        self.assertEqual(wallet_for(self.employee).balance, Decimal('0.00'))

        # ── 11. reconciliation is clean, the quarter files ───────────────
        blockers = self.back_office.get(f'/api/vat/periods/{period.pk}/blockers/')
        self.assertTrue(blockers.data['can_finalize'], blockers.data['blockers'])

        finalized = self.back_office.post(f'/api/vat/periods/{period.pk}/finalize/')
        self.assertEqual(finalized.status_code, 200)

        snapshot = self.back_office.get(f'/api/vat/periods/{period.pk}/snapshot/')
        self.assertEqual(Decimal(snapshot.data['snapshot']['box_5a']),
                         Decimal('186.48'))

        # ── 12. the accountant's workbook ────────────────────────────────
        export = self.back_office.get(f'/api/vat/periods/{period.pk}/export/')
        self.assertEqual(export.status_code, 200)
        self.assertTrue(export.content.startswith(b'PK'))

        # ── 13. the audit trail records who did what ─────────────────────
        events = self.back_office.get(f'/api/vat/periods/{period.pk}/events/')
        kinds = {event['event'] for event in events.data}
        self.assertIn('FINALIZED', kinds)
        self.assertTrue(any(event['actor'] == self.admin.email
                            for event in events.data))

    def test_the_correction_path(self):
        """A mistake found after the quarter was filed."""
        from apps.invoices.models import Invoice
        from apps.vat.models import VatPeriod
        from apps.vat.returns import calculate_return

        self._approve(0, '09:00', '17:00', 30)
        created = self.back_office.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        invoice_id = created.data['invoice']['id']
        self.back_office.post(f'/api/invoices/invoices/{invoice_id}/issue/')

        invoice = Invoice.objects.get(pk=invoice_id)
        issued = (invoice.subtotal, invoice.vat_amount, invoice.total,
                  invoice.invoice_number)

        period = VatPeriod.for_date(invoice.issue_date)
        self.back_office.post(f'/api/vat/periods/{period.pk}/finalize/')
        filed = calculate_return(period)['box_5a']
        self.assertEqual(filed, Decimal('63.00'))

        # An admin reopens with a reason; the filed figures are kept.
        reopened = self.back_office.post(
            f'/api/vat/periods/{period.pk}/reopen/',
            {'reason': 'The accountant found a misclassified line.'}, format='json')
        self.assertEqual(reopened.status_code, 200)
        period.refresh_from_db()
        self.assertEqual(Decimal(period.filed_snapshot['box_5a']), filed)

        # The invoice is credited, never edited.
        credited = self.back_office.post(
            f'/api/invoices/invoices/{invoice_id}/credit-note/',
            {'reason': 'Billed to the wrong customer entirely.'}, format='json')
        self.assertEqual(credited.status_code, 201)
        note_number = credited.data['credit_note']['invoice_number']
        self.assertTrue(note_number.startswith('CN2026-'))

        invoice.refresh_from_db()
        self.assertEqual(
            (invoice.subtotal, invoice.vat_amount, invoice.total,
             invoice.invoice_number), issued,
            'the issued invoice was altered')

        # The correction reaches the return.
        self.assertEqual(calculate_return(period)['box_5a'], Decimal('0.00'))

        # And the whole story is on the record.
        events = self.back_office.get(f'/api/vat/periods/{period.pk}/events/')
        kinds = [event['event'] for event in events.data]
        self.assertIn('FINALIZED', kinds)
        self.assertIn('REOPENED', kinds)


class BoundaryTests(TestCase):
    """The refusals, from each role's own position."""

    def setUp(self):
        self.customer_a = make_customer(company_name='Alpha')
        self.customer_b = make_customer(company_name='Beta')
        self.employee_a = make_employee()
        self.employee_b = make_employee()

        self.portal_a = make_user(email='b-portal@a.test', role='customer')
        self.portal_a.customer = self.customer_a
        self.portal_a.save()

    def signed_in(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_customer_a_cannot_see_customer_b(self):
        project_b = make_project(customer=self.customer_b)
        response = self.signed_in(self.portal_a).get(
            f'/api/customer-portal/projects/{project_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_employee_a_cannot_see_employee_b(self):
        response = self.signed_in(self.employee_a.user).get(
            f'/api/employees/profiles/{self.employee_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_an_employee_cannot_reach_finance(self):
        client = self.signed_in(self.employee_a.user)
        for path in ('/api/invoices/invoices/', '/api/vat/dashboard/',
                     '/api/expenses/expenses/'):
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 403)

    def test_a_customer_cannot_reach_finance(self):
        client = self.signed_in(self.portal_a)
        for path in ('/api/invoices/invoices/', '/api/vat/dashboard/',
                     '/api/wallet/wallets/', '/api/hr/payslips/'):
            with self.subTest(path=path):
                self.assertIn(client.get(path).status_code, (403, 404))

    def test_operations_cannot_reach_finance_only_endpoints(self):
        client = self.signed_in(make_user(email='b-ops@ckm.test', role='operations'))
        for path in ('/api/invoices/invoices/', '/api/vat/periods/',
                     '/api/vat/dashboard/'):
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 403)
