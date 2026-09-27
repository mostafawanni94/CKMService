"""The expense form writes multipart, where every value is a string.

`Expense.vat_rate` is a DecimalField carrying choices, so DRF builds a
ChoiceField that passes the string straight through while still applying the
model's DecimalValidator — which calls `.as_tuple()` on it. Every submission
answered 500, at all three rates, so no expense could be recorded at all.
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testing import make_user
from apps.expenses.models import Expense, ExpenseCategory


class ExpenseCreationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(role='admin')
        cls.category = ExpenseCategory.objects.get(code='VEHICLE')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def post(self, **overrides):
        payload = {
            'category': str(self.category.id),
            'description': 'Euro 95 ongelood',
            'vendor_name': 'ESSO Leyweg 1',
            'expense_date': '2026-09-18',
            'payment_method': 'credit_card',
            'amount_excl_vat': '24.80',
            'vat_rate': '21.00',
        }
        payload.update(overrides)
        # multipart, exactly as the dashboard's FormData arrives.
        return self.client.post('/api/expenses/expenses/', payload, format='multipart')

    def test_the_form_can_record_an_expense_at_all(self):
        response = self.post()
        self.assertEqual(response.status_code, 201, response.content[:300])

    def test_every_offered_rate_is_accepted(self):
        for rate in ('0.00', '9.00', '21.00'):
            with self.subTest(rate=rate):
                self.assertEqual(self.post(vat_rate=rate).status_code, 201)

    def test_a_rate_that_is_not_offered_is_refused_not_crashed(self):
        response = self.post(vat_rate='17.50')
        self.assertEqual(response.status_code, 400)
        self.assertIn('vat_rate', response.json())

    def test_the_rate_is_stored_as_a_number_not_the_string_it_arrived_as(self):
        self.post(vat_rate='9.00')
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.vat_rate, Decimal('9.00'))

    def test_vat_and_total_are_derived_from_the_net_amount(self):
        self.post(amount_excl_vat='24.80', vat_rate='21.00')
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.vat_amount, Decimal('5.21'))
        self.assertEqual(expense.total_amount, Decimal('30.01'))

    def test_a_zero_rated_expense_carries_no_vat(self):
        self.post(amount_excl_vat='3.20', vat_rate='0.00')
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.vat_amount, Decimal('0.00'))
        self.assertEqual(expense.total_amount, Decimal('3.20'))


class DocumentFiguresTests(TestCase):
    """A Dutch till computes VAT as 21/121 of the gross; this model computed
    21/100 of the net. They disagree by a cent often enough that the books
    would drift from the receipts and the bank."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(role='admin')
        cls.category = ExpenseCategory.objects.get(code='SUPPLIES')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def post(self, **overrides):
        payload = {
            'category': str(self.category.id),
            'description': 'microvezel wonderdoek',
            'vendor_name': 'Action 1354 Spijkenisse',
            'expense_date': '2026-08-20',
            'payment_method': 'pin',
            'amount_excl_vat': '3.26',
            'vat_rate': '21.00',
        }
        payload.update(overrides)
        return self.client.post('/api/expenses/expenses/', payload, format='multipart')

    def test_the_receipts_own_figures_are_kept_when_given(self):
        # The Action receipt prints 3.26 + 0.69 = 3.95.
        self.post(vat_amount='0.69', total_amount='3.95')
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.vat_amount, Decimal('0.69'))
        self.assertEqual(expense.total_amount, Decimal('3.95'))

    def test_they_are_still_derived_when_the_form_sends_only_a_net_amount(self):
        self.post()
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.vat_amount, Decimal('0.68'))
        self.assertEqual(expense.total_amount, Decimal('3.94'))

    def test_a_correction_may_restate_the_figures(self):
        self.post()
        expense = Expense.objects.latest('created_at')
        response = self.client.patch(
            f'/api/expenses/expenses/{expense.id}/',
            {'vat_amount': '0.69', 'total_amount': '3.95'}, format='json')
        self.assertEqual(response.status_code, 200, response.content[:200])
        expense.refresh_from_db()
        self.assertEqual(expense.total_amount, Decimal('3.95'))

    def test_a_reverse_charged_purchase_records_what_the_supplier_charged(self):
        # LinkedIn Ireland invoices 43.38 at 0%; the 21% is self-accounted.
        self.post(amount_excl_vat='43.38', vat_rate='0.00',
                  vendor_name='LinkedIn Ireland', vat_treatment_code='EU_ACQUISITION')
        expense = Expense.objects.latest('created_at')
        self.assertEqual(expense.total_amount, Decimal('43.38'))
        self.assertEqual(expense.vat_treatment_code, 'EU_ACQUISITION')
