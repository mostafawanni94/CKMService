"""
Notifications reach the person they are about, and nobody else.

A notification carries a name, a project, an amount. Delivering one to the wrong
recipient leaks exactly the things the rest of the system is careful about.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import (
    attach_service_rate, make_customer, make_employee, make_project, make_service,
    make_user, make_work_entry,
)
from apps.notifications.models import Notification

MONDAY = date(2026, 8, 10)


class NotificationSetup(TestCase):
    def setUp(self):
        self.employee_a = make_employee(hourly_rate=Decimal('16.00'))
        self.employee_b = make_employee(hourly_rate=Decimal('19.00'))
        self.admin = make_user(email='n-admin@ckm.test', role='admin')

        self.for_a = Notification.objects.create(
            recipient=self.employee_a.user, notification_type='worklog_approved',
            category='worklogs', priority='normal',
            title='Uren goedgekeurd', message='Je uren van 10 augustus zijn goedgekeurd.')
        self.for_b = Notification.objects.create(
            recipient=self.employee_b.user, notification_type='worklog_rejected',
            category='worklogs', priority='high',
            title='Uren afgekeurd', message='Beta had een probleem met 10 augustus.')

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client


class DeliveryTests(NotificationSetup):
    def test_the_list_shows_only_your_own(self):
        response = self.client_for(self.employee_a.user).get(
            '/api/notifications/notifications/')
        self.assertEqual(response.status_code, 200)
        titles = {row['title'] for row in response.data['results']}
        self.assertEqual(titles, {'Uren goedgekeurd'})

    def test_another_persons_notification_is_refused(self):
        response = self.client_for(self.employee_a.user).get(
            f'/api/notifications/notifications/{self.for_b.pk}/')
        self.assertIn(response.status_code, (403, 404))

    def test_you_cannot_mark_someone_elses_as_read(self):
        client = self.client_for(self.employee_a.user)
        response = client.post(
            f'/api/notifications/notifications/{self.for_b.pk}/mark_read/', {},
            format='json')
        self.assertIn(response.status_code, (403, 404))
        self.for_b.refresh_from_db()
        self.assertFalse(self.for_b.is_read)

    def test_mark_all_read_only_touches_your_own(self):
        client = self.client_for(self.employee_a.user)
        response = client.post('/api/notifications/notifications/mark_all_read/', {},
                               format='json')
        self.assertEqual(response.status_code, 200)

        self.for_a.refresh_from_db()
        self.for_b.refresh_from_db()
        self.assertTrue(self.for_a.is_read)
        self.assertFalse(self.for_b.is_read, "another employee's was marked read")

    def test_the_unread_count_is_your_own(self):
        response = self.client_for(self.employee_a.user).get(
            '/api/notifications/notifications/unread_count/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get('unread_count',
                                           response.data.get('count')), 1)

    def test_a_customer_login_sees_no_employee_notifications(self):
        customer = make_customer()
        portal = make_user(email='n-portal@ckm.test', role='customer')
        portal.customer = customer
        portal.save()

        response = self.client_for(portal).get('/api/notifications/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)

    def test_an_admin_does_not_silently_read_everyones_inbox(self):
        """
        An admin has their own notifications. Seeing every employee's inbox by
        default would put private messages in the wrong place.
        """
        response = self.client_for(self.admin).get('/api/notifications/notifications/')
        self.assertEqual(response.status_code, 200)
        titles = {row['title'] for row in response.data['results']}
        self.assertNotIn('Uren afgekeurd', titles)

    def test_you_cannot_create_a_notification_for_someone_else(self):
        client = self.client_for(self.employee_a.user)
        response = client.post('/api/notifications/notifications/', {
            'recipient': str(self.employee_b.user.pk),
            'title': 'Injected', 'message': 'Should not arrive',
            'notification_type': 'info', 'category': 'system',
        }, format='json')
        self.assertIn(response.status_code, (403, 405, 400))
        self.assertFalse(Notification.objects.filter(title='Injected').exists())


class ApprovalNotificationTests(NotificationSetup):
    """The notification an approval sends goes to the right employee."""

    def setUp(self):
        super().setUp()
        self.customer = make_customer()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))

    def test_approving_notifies_the_employee_who_did_the_work(self):
        entry = make_work_entry(employee=self.employee_a, project=self.project,
                                service=self.service, work_date=MONDAY,
                                status='submitted')
        before = Notification.objects.filter(recipient=self.employee_b.user).count()

        self.client_for(self.admin).post(
            f'/api/worklogs/entries/{entry.pk}/approve/', {}, format='json')

        self.assertEqual(
            Notification.objects.filter(recipient=self.employee_b.user).count(),
            before, 'the wrong employee was notified')
        self.assertTrue(Notification.objects.filter(
            recipient=self.employee_a.user,
            notification_type='worklog_approved').exists())

    def test_a_rejection_reason_does_not_reach_anyone_else(self):
        entry = make_work_entry(employee=self.employee_a, project=self.project,
                                service=self.service, work_date=MONDAY,
                                status='submitted')
        self.client_for(self.admin).post(
            f'/api/worklogs/entries/{entry.pk}/reject/',
            {'reason': 'Hours do not match the site log.'}, format='json')

        for notification in Notification.objects.filter(
                recipient=self.employee_b.user):
            self.assertNotIn('site log', notification.message)


class FinanceNotificationTests(TestCase):
    """Finance alerts go to the back office, never to an employee or client."""

    def setUp(self):
        self.admin = make_user(email='f-admin@ckm.test', role='admin')
        self.finance = make_user(email='f-fin@ckm.test', role='finance')
        self.employee = make_employee()
        self.portal = make_user(email='f-portal@ckm.test', role='customer')

    def test_a_vat_alert_reaches_only_the_back_office(self):
        from apps.notifications.finance_notifications import (
            notify_unclassified_transactions,
        )
        from apps.invoices.models import IncomingInvoice
        from apps.vat.posting import post_all

        IncomingInvoice.objects.create(
            invoice_number='654646', vendor_name='8776', invoice_date=MONDAY,
            subtotal=Decimal('3000.00'), vat_rate=Decimal('21.00'),
            vat_treatment_code='NORMAL')
        post_all()
        notify_unclassified_transactions(as_of=MONDAY)

        recipients = set(Notification.objects.filter(
            notification_type='vat_requires_review'
        ).values_list('recipient__email', flat=True))
        self.assertEqual(recipients, {'f-admin@ckm.test', 'f-fin@ckm.test'})

    def test_an_overdue_invoice_alert_never_names_the_amount_to_an_employee(self):
        from apps.notifications.finance_notifications import notify_overdue_invoices

        notify_overdue_invoices(as_of=MONDAY)
        for notification in Notification.objects.filter(
                recipient__in=[self.employee.user, self.portal]):
            self.assertNotEqual(notification.notification_type, 'invoice_overdue')
