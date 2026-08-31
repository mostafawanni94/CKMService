"""Tests for supplier (incoming) invoices."""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import make_user
from apps.invoices.models import IncomingInvoice


class IncomingInvoiceModelTests(TestCase):
    def _make(self, **kwargs):
        defaults = dict(
            invoice_number='INV-001',
            vendor_name='Supplier BV',
            invoice_date=date(2026, 8, 1),
            subtotal=Decimal('100.00'),
            vat_rate=Decimal('21.00'),
        )
        defaults.update(kwargs)
        return IncomingInvoice.objects.create(**defaults)

    def test_vat_and_total_are_derived_from_subtotal(self):
        invoice = self._make()
        self.assertEqual(invoice.vat_amount, Decimal('21.00'))
        self.assertEqual(invoice.total, Decimal('121.00'))

    def test_a_zero_rate_leaves_the_total_equal_to_the_subtotal(self):
        invoice = self._make(vat_rate=Decimal('0.00'))
        self.assertEqual(invoice.vat_amount, Decimal('0.00'))
        self.assertEqual(invoice.total, Decimal('100.00'))

    def test_totals_are_recomputed_when_the_subtotal_changes(self):
        invoice = self._make()
        invoice.subtotal = Decimal('200.00')
        invoice.save()
        self.assertEqual(invoice.total, Decimal('242.00'))

    def test_a_past_due_pending_invoice_becomes_overdue(self):
        invoice = self._make(due_date=date.today() - timedelta(days=1))
        self.assertTrue(invoice.is_overdue)
        self.assertEqual(invoice.status, IncomingInvoice.Status.OVERDUE)

    def test_a_future_due_date_stays_pending(self):
        invoice = self._make(due_date=date.today() + timedelta(days=14))
        self.assertFalse(invoice.is_overdue)
        self.assertEqual(invoice.status, IncomingInvoice.Status.PENDING)
        self.assertEqual(invoice.days_until_due, 14)

    def test_the_same_number_cannot_repeat_for_one_vendor(self):
        from django.db.utils import IntegrityError
        self._make()
        with self.assertRaises(IntegrityError):
            self._make()

    def test_the_same_number_is_fine_for_a_different_vendor(self):
        self._make()
        other = self._make(vendor_name='Another BV')
        self.assertEqual(other.invoice_number, 'INV-001')


class IncomingInvoiceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(make_user(email='fin2@ckm.test', role='finance'))

    def test_create_derives_the_total(self):
        response = self.client.post('/api/invoices/incoming-invoices/', {
            'invoice_number': 'INV-100',
            'vendor_name': 'Supplier BV',
            'invoice_date': '2026-08-01',
            'subtotal': '250.00',
            'vat_rate': '21.00',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['total'], '302.50')

    def test_a_due_date_before_the_invoice_date_is_refused(self):
        response = self.client.post('/api/invoices/incoming-invoices/', {
            'invoice_number': 'INV-101',
            'vendor_name': 'Supplier BV',
            'invoice_date': '2026-08-10',
            'due_date': '2026-08-01',
            'subtotal': '10.00',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_mark_paid_stamps_the_paid_date(self):
        created = self.client.post('/api/invoices/incoming-invoices/', {
            'invoice_number': 'INV-102',
            'vendor_name': 'Supplier BV',
            'invoice_date': '2026-08-01',
            'subtotal': '10.00',
        }, format='json')
        invoice_id = created.data['id']

        response = self.client.post(
            f'/api/invoices/incoming-invoices/{invoice_id}/mark_paid/', {}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'paid')
        self.assertIsNotNone(response.data['paid_date'])

    def test_a_duplicate_number_for_one_vendor_is_a_400_not_a_500(self):
        payload = {
            'invoice_number': 'DUP-1',
            'vendor_name': 'Supplier BV',
            'invoice_date': '2026-08-01',
            'subtotal': '10.00',
        }
        self.assertEqual(
            self.client.post('/api/invoices/incoming-invoices/', payload, format='json').status_code,
            201,
        )
        second = self.client.post('/api/invoices/incoming-invoices/', payload, format='json')
        # The DB constraint alone surfaced as an IntegrityError (500).
        self.assertEqual(second.status_code, 400)

    def test_summary_money_is_a_two_decimal_string(self):
        self.client.post('/api/invoices/incoming-invoices/', {
            'invoice_number': 'FMT-1',
            'vendor_name': 'Supplier BV',
            'invoice_date': '2026-08-01',
            'subtotal': '302.50',
            'vat_rate': '0.00',
        }, format='json')
        response = self.client.get('/api/invoices/incoming-invoices/summary/')
        # A bare Decimal renders as 302.5; every money field in the API is a
        # two-decimal string.
        self.assertEqual(response.data['pending_total'], '302.50')

    def test_summary_totals_by_status(self):
        for number, subtotal in (('A', '100.00'), ('B', '200.00')):
            self.client.post('/api/invoices/incoming-invoices/', {
                'invoice_number': number,
                'vendor_name': 'Supplier BV',
                'invoice_date': '2026-08-01',
                'subtotal': subtotal,
                'vat_rate': '0.00',
            }, format='json')

        response = self.client.get('/api/invoices/incoming-invoices/summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_count'], 2)
        self.assertEqual(response.data['pending_total'], '300.00')
