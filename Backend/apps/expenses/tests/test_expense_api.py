"""The expense form writes multipart, where every value is a string.

`Expense.vat_rate` is a DecimalField carrying choices, so DRF builds a
ChoiceField that passes the string straight through while still applying the
model's DecimalValidator — which calls `.as_tuple()` on it. Every submission
answered 500, at all three rates, so no expense could be recorded at all.
"""

from decimal import Decimal

from django.core.files.base import ContentFile
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


class ExpenseTotalsTests(TestCase):
    """The header cards must describe the whole filtered set, not the page.

    The list is paged at 20 by default. Summing the rows in the browser made
    the Expenses page report "20 expenses / EUR 311.77" for a year that held
    54 and EUR 1,573.74 — the count was simply the page size.
    """

    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(role='admin')
        vehicle = ExpenseCategory.objects.get(code='VEHICLE')
        cls.marketing = ExpenseCategory.objects.get(code='MARKETING')
        for i in range(30):
            Expense.objects.create(
                category=vehicle, description='Euro 95', vendor_name=f'ESSO {i}',
                expense_date='2026-09-18', payment_method='credit_card',
                amount_excl_vat=Decimal('10.00'), vat_rate=Decimal('21.00'))
        for i in range(5):
            Expense.objects.create(
                category=cls.marketing, description='Flyers',
                vendor_name=f'Vistaprint {i}', expense_date='2026-08-14',
                payment_method='ideal', amount_excl_vat=Decimal('100.00'),
                vat_rate=Decimal('21.00'))
        # A different year, to prove the filter is applied.
        Expense.objects.create(
            category=vehicle, description='Euro 95', vendor_name='ESSO old',
            expense_date='2025-01-05', payment_method='credit_card',
            amount_excl_vat=Decimal('999.00'), vat_rate=Decimal('21.00'))

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def totals(self, query=''):
        r = self.client.get('/api/expenses/expenses/totals/' + query)
        self.assertEqual(r.status_code, 200)
        return r.json()

    def test_totals_cover_every_row_not_just_the_first_page(self):
        listing = self.client.get('/api/expenses/expenses/?year=2026').json()
        self.assertEqual(len(listing['results']), 20, 'default page is 20')
        self.assertEqual(listing['count'], 35)

        totals = self.totals('?year=2026')
        self.assertEqual(totals['count'], 35)
        # 30 x 12.10 + 5 x 121.00
        self.assertEqual(Decimal(totals['total_incl_vat']), Decimal('968.00'))
        self.assertEqual(Decimal(totals['total_excl_vat']), Decimal('800.00'))
        self.assertEqual(Decimal(totals['total_vat']), Decimal('168.00'))

    def test_totals_do_not_move_between_pages(self):
        first = self.totals('?year=2026&page=1&page_size=20')
        last = self.totals('?year=2026&page=2&page_size=20')
        self.assertEqual(first, last)

    def test_totals_follow_the_same_filters_as_the_list(self):
        listing = self.client.get(
            f'/api/expenses/expenses/?year=2026&category={self.marketing.id}').json()
        totals = self.totals(f'?year=2026&category={self.marketing.id}')
        self.assertEqual(totals['count'], listing['count'])
        self.assertEqual(Decimal(totals['total_incl_vat']), Decimal('605.00'))

        search = self.client.get('/api/expenses/expenses/?year=2026&search=Vistaprint').json()
        self.assertEqual(self.totals('?year=2026&search=Vistaprint')['count'],
                         search['count'])

    def test_year_filter_excludes_other_years(self):
        self.assertEqual(self.totals('?year=2025')['count'], 1)
        self.assertEqual(Decimal(self.totals('?year=2025')['total_incl_vat']),
                         Decimal('1208.79'))

    def test_category_breakdown_groups_rather_than_listing_each_row(self):
        by_cat = {c['code']: c for c in self.totals('?year=2026')['by_category']}
        self.assertEqual(by_cat['VEHICLE']['count'], 30)
        self.assertEqual(by_cat['MARKETING']['count'], 5)
        self.assertEqual(Decimal(by_cat['MARKETING']['total']), Decimal('605.00'))

    def test_empty_set_reports_zero_not_null(self):
        totals = self.totals('?year=2026&search=nothing-matches-this')
        self.assertEqual(totals['count'], 0)
        self.assertEqual(Decimal(totals['total_incl_vat']), Decimal('0.00'))

    def test_money_is_a_string_so_it_survives_json(self):
        """A bare Decimal renders as a float: EUR 1208.79 -> 1208.7899999999999."""
        totals = self.totals('?year=2025')
        self.assertIsInstance(totals['total_incl_vat'], str)
        self.assertEqual(totals['total_incl_vat'], '1208.79')


class ExpenseReceiptLinkTests(TestCase):
    """The stored document has to be reachable from the list and the form.

    The edit modal offered an upload box and nothing else, so an invoice that
    was already filed could not be read back or saved off — the only way to
    the file was the detail endpoint, which the page never called.
    """

    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(role='admin')
        cls.category = ExpenseCategory.objects.get(code='VEHICLE')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def make(self, receipt=None):
        expense = Expense.objects.create(
            category=self.category, description='Euro 95', vendor_name='ESSO',
            expense_date='2026-09-18', payment_method='credit_card',
            amount_excl_vat=Decimal('24.80'), vat_rate=Decimal('21.00'))
        if receipt:
            expense.receipt_file.save(receipt, ContentFile(b'%PDF-1.4 test'), save=True)
        return expense

    def test_list_row_carries_a_signed_link_and_a_name(self):
        self.make('bon.pdf')
        row = self.client.get('/api/expenses/expenses/').json()['results'][0]
        self.assertTrue(row['has_receipt'])
        self.assertIn('/media/', row['receipt_url'])
        self.assertIn('sig=', row['receipt_url'], 'unsigned media links are refused')
        self.assertTrue(row['receipt_name'].endswith('.pdf'))

    def test_detail_carries_the_name_too(self):
        expense = self.make('factuur.pdf')
        body = self.client.get(f'/api/expenses/expenses/{expense.id}/').json()
        self.assertIn('sig=', body['receipt_url'])
        self.assertTrue(body['receipt_name'].endswith('.pdf'))

    def test_an_expense_without_a_document_reports_null_not_a_broken_link(self):
        self.make()
        row = self.client.get('/api/expenses/expenses/').json()['results'][0]
        self.assertFalse(row['has_receipt'])
        self.assertIsNone(row['receipt_url'])
        self.assertIsNone(row['receipt_name'])
