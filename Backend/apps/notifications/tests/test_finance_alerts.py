"""
The alerts that catch what nobody is watching.

Each of these fires from a daily cron job, so the test is about the trigger
condition and about not repeating itself — an alert that arrives every day is
an alert nobody reads.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase

from apps.core.testing import (
    attach_service_rate, make_customer, make_employee, make_project, make_service,
    make_user, make_work_entry,
)
from apps.invoices.billing import generate_invoice, issue_invoice, mark_overdue
from apps.invoices.models import IncomingInvoice, Invoice
from apps.notifications.finance_notifications import (
    filing_deadline, notify_overdue_invoices, notify_supplier_invoices_due,
    notify_unclassified_transactions, notify_vat_deadline, run_daily,
)
from apps.notifications.models import Notification
from apps.vat.models import VatPeriod

MONDAY = date(2026, 8, 10)


class AlertSetup(TestCase):
    def setUp(self):
        self.admin = make_user(email='alerts-admin@ckm.test', role='admin')
        self.finance = make_user(email='alerts-finance@ckm.test', role='finance')
        make_user(email='alerts-employee@ckm.test', role='employee')

        self.customer = make_customer(company_name='Smaak voor Groen',
                                      btw_number='NL001538146B17')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))

    def issued(self, issue_date=MONDAY, day=0):
        make_work_entry(employee=make_employee(), project=self.project,
                        work_date=MONDAY + timedelta(days=day), service=self.service)
        invoice = generate_invoice(
            self.customer, start=MONDAY + timedelta(days=day),
            end=MONDAY + timedelta(days=day), actor=self.admin)
        issue_invoice(invoice, actor=self.admin, issue_date=issue_date)
        invoice.refresh_from_db()
        return invoice


class OverdueInvoiceTests(AlertSetup):
    def test_an_invoice_that_just_became_overdue_is_reported(self):
        invoice = self.issued()                       # due 24 August
        sent = notify_overdue_invoices(as_of=invoice.due_date + timedelta(days=1))
        self.assertEqual(sent, 1)
        notification = Notification.objects.filter(
            notification_type='invoice_overdue').first()
        self.assertIn(invoice.invoice_number, notification.title)

    def test_only_the_back_office_is_told(self):
        invoice = self.issued()
        notify_overdue_invoices(as_of=invoice.due_date + timedelta(days=1))
        recipients = set(Notification.objects.filter(
            notification_type='invoice_overdue').values_list(
            'recipient__email', flat=True))
        self.assertEqual(recipients, {'alerts-admin@ckm.test', 'alerts-finance@ckm.test'})

    def test_the_same_invoice_is_not_reported_twice_in_a_day(self):
        invoice = self.issued()
        as_of = invoice.due_date + timedelta(days=1)
        notify_overdue_invoices(as_of=as_of)
        notify_overdue_invoices(as_of=as_of)
        self.assertEqual(
            Notification.objects.filter(notification_type='invoice_overdue').count(), 2)

    def test_a_paid_invoice_is_not_reported(self):
        from apps.invoices.billing import record_payment

        invoice = self.issued()
        record_payment(invoice, invoice.total)
        self.assertEqual(
            notify_overdue_invoices(as_of=invoice.due_date + timedelta(days=1)), 0)

    def test_mark_overdue_flags_the_status(self):
        invoice = self.issued()
        mark_overdue(as_of=invoice.due_date + timedelta(days=1))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.OVERDUE)


class SupplierInvoiceTests(AlertSetup):
    def test_a_supplier_invoice_is_flagged_before_it_falls_due(self):
        IncomingInvoice.objects.create(
            invoice_number='SUP-77', vendor_name='Makro', invoice_date=MONDAY,
            due_date=MONDAY + timedelta(days=10), subtotal=Decimal('200.00'),
            vat_rate=Decimal('21.00'), vat_amount=Decimal('42.00'),
            total=Decimal('242.00'))
        sent = notify_supplier_invoices_due(as_of=MONDAY + timedelta(days=7))
        self.assertEqual(sent, 1)

    def test_a_paid_supplier_invoice_is_not_flagged(self):
        IncomingInvoice.objects.create(
            invoice_number='SUP-78', vendor_name='Makro', invoice_date=MONDAY,
            due_date=MONDAY + timedelta(days=10), subtotal=Decimal('200.00'),
            vat_rate=Decimal('21.00'), total=Decimal('242.00'), status='paid')
        self.assertEqual(
            notify_supplier_invoices_due(as_of=MONDAY + timedelta(days=7)), 0)


class VatDeadlineTests(AlertSetup):
    def test_the_deadline_is_the_end_of_the_following_month(self):
        period = VatPeriod.for_date(date(2026, 8, 12))       # Q3
        self.assertEqual(filing_deadline(period), date(2026, 10, 31))

    def test_a_year_end_quarter_rolls_into_january(self):
        period = VatPeriod.for_date(date(2026, 11, 12))      # Q4
        self.assertEqual(filing_deadline(period), date(2027, 1, 31))

    def test_a_reminder_arrives_at_the_warning_marks(self):
        self.issued()
        period = VatPeriod.for_date(MONDAY)
        deadline = filing_deadline(period)
        sent = notify_vat_deadline(as_of=deadline - timedelta(days=7))
        self.assertEqual(sent, 1)
        notification = Notification.objects.filter(
            notification_type='vat_deadline').first()
        self.assertIn('nog 7 dagen', notification.title)

    def test_no_reminder_on_a_day_that_is_not_a_warning_mark(self):
        self.issued()
        period = VatPeriod.for_date(MONDAY)
        self.assertEqual(
            notify_vat_deadline(as_of=filing_deadline(period) - timedelta(days=15)), 0)

    def test_a_filed_quarter_is_not_chased(self):
        from apps.vat.returns import finalize

        self.issued()
        period = VatPeriod.for_date(MONDAY)
        finalize(period, actor=self.admin)
        self.assertEqual(
            notify_vat_deadline(as_of=filing_deadline(period) - timedelta(days=7)), 0)

    def test_the_reminder_names_what_is_blocking_the_filing(self):
        IncomingInvoice.objects.create(
            invoice_number='654646', vendor_name='8776', invoice_date=MONDAY,
            subtotal=Decimal('3000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL')
        from apps.vat.posting import post_all
        post_all()

        period = VatPeriod.for_date(MONDAY)
        notify_vat_deadline(as_of=filing_deadline(period) - timedelta(days=7))
        notification = Notification.objects.filter(
            notification_type='vat_deadline').first()
        self.assertIn('open', notification.message)


class UnclassifiedTests(AlertSetup):
    def test_a_weekly_reminder_for_unresolved_transactions(self):
        IncomingInvoice.objects.create(
            invoice_number='654646', vendor_name='8776', invoice_date=MONDAY,
            subtotal=Decimal('3000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL')
        from apps.vat.posting import post_all
        post_all()

        self.assertEqual(notify_unclassified_transactions(as_of=MONDAY), 1)
        notification = Notification.objects.filter(
            notification_type='vat_requires_review').first()
        # The gross document value: an unresolved entry has no established
        # split between base and VAT.
        self.assertIn('3630.00', notification.message)

    def test_nothing_is_sent_on_other_days(self):
        IncomingInvoice.objects.create(
            invoice_number='654647', vendor_name='8776', invoice_date=MONDAY,
            subtotal=Decimal('3000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL')
        from apps.vat.posting import post_all
        post_all()
        self.assertEqual(
            notify_unclassified_transactions(as_of=MONDAY + timedelta(days=1)), 0)

    def test_nothing_is_sent_when_everything_is_resolved(self):
        self.assertEqual(notify_unclassified_transactions(as_of=MONDAY), 0)


class DailyRunTests(AlertSetup):
    def test_the_daily_run_reports_what_it_sent(self):
        result = run_daily(as_of=MONDAY)
        self.assertEqual(set(result), {'overdue_invoices', 'supplier_invoices_due',
                                       'vat_deadline', 'unclassified'})

    def test_the_management_command_runs(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command('finance_alerts', '--date', '2026-08-10', stdout=out)
        self.assertIn('flagged overdue', out.getvalue())


class DeviceRegistrationTests(TestCase):
    """
    Push notifications need somewhere to store the device token.

    The model was declared in its own module and never imported into
    models.py, so Django never built its table and every registration call
    failed with "no such table" — no device could receive a push.
    """

    def setUp(self):
        from rest_framework.test import APIClient

        self.employee = make_employee()
        self.client = APIClient()
        self.client.force_authenticate(self.employee.user)

    def test_a_device_can_register(self):
        response = self.client.post('/api/notifications/devices/register/', {
            'token': 'fcm-token-abc123', 'platform': 'android',
        }, format='json')
        self.assertIn(response.status_code, (200, 201))

        from apps.notifications.device_models import DeviceRegistration
        device = DeviceRegistration.objects.get(token='fcm-token-abc123')
        self.assertEqual(device.user, self.employee.user)
        self.assertTrue(device.is_active)

    def test_registering_the_same_token_twice_updates_it(self):
        from apps.notifications.device_models import DeviceRegistration

        for _ in range(2):
            self.client.post('/api/notifications/devices/register/', {
                'token': 'fcm-token-xyz', 'platform': 'ios',
            }, format='json')
        self.assertEqual(
            DeviceRegistration.objects.filter(token='fcm-token-xyz').count(), 1)

    def test_a_device_can_unregister(self):
        from apps.notifications.device_models import DeviceRegistration

        self.client.post('/api/notifications/devices/register/', {
            'token': 'fcm-token-bye', 'platform': 'android'}, format='json')
        response = self.client.post('/api/notifications/devices/unregister/',
                                    {'token': 'fcm-token-bye'}, format='json')
        self.assertIn(response.status_code, (200, 204))
        device = DeviceRegistration.objects.filter(token='fcm-token-bye').first()
        if device is not None:
            self.assertFalse(device.is_active)
