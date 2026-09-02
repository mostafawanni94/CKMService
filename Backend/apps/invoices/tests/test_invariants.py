"""
The eleven invariants an invoicing system has to keep.

Each of these guards something that costs real money or fails an audit if it
breaks. They are deliberately written against the outside of the system — the
service and the API — rather than against internals, so a refactor that
preserves behaviour keeps passing and one that does not, fails.
"""

import threading
from datetime import date, timedelta
from decimal import Decimal

from django.db import connections, transaction
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from apps.core.models import SystemConfig
from apps.core.testing import (
    attach_customer_surcharge, attach_service_rate, make_customer, make_employee,
    make_project, make_service, make_surcharge_type, make_user, make_work_entry,
)
from apps.invoices.billing import (
    BillingError, create_credit_note, generate_invoice, issue_blockers,
    issue_invoice, price_entry,
)
from apps.invoices.models import DocumentSeries, Invoice, InvoiceLine, InvoiceSequence
from apps.invoices.numbering import next_number
from apps.vat.models import VatLedgerEntry, VatPeriod

MONDAY = date(2026, 8, 10)          # ISO week 33 of 2026


def configure_company():
    config = SystemConfig.objects.get_config()
    config.company_legal_name = 'CKMcleaning VOF'
    config.company_kvk_number = '42074970'
    config.company_btw_number = 'NL869591071B01'
    config.company_iban = 'NL20INGB0119413256'
    config.company_address = 'Rilland Bathstraat 126'
    config.company_postal_code = '3086 ST'
    config.company_city = 'Rotterdam'
    config.save()
    return config


class SurchargeFixture:
    """
    A night shift with a 130% surcharge — 4 of its 6 hours fall in the window.

    A mixin rather than a base TestCase, so subclasses inherit the fixtures
    without also inheriting and re-running each other's tests.
    """

    def setUp(self):
        configure_company()
        self.user = make_user(email='inv@ckm.test', role='admin')
        self.customer = make_customer(company_name='Kantoorpand Blaak',
                                      btw_number='NL812345678B01')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self.night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, self.night, Decimal('130.00'))
        self.employee = make_employee(hourly_rate=Decimal('16.00'),
                                      receives_surcharges=True)

    def night_shift(self, day=0):
        return make_work_entry(
            employee=self.employee, project=self.project, service=self.service,
            work_date=MONDAY + timedelta(days=day),
            start='02:00', end='08:00', break_minutes=0)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Surcharges live in the data model, not only in the PDF
# ─────────────────────────────────────────────────────────────────────────────

class SurchargeIsStoredTests(SurchargeFixture, TestCase):
    def test_the_line_stores_the_surcharge_as_data(self):
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.get()

        # 6 hours at EUR 40 = 240, plus 4 night hours x 40 x 30% = 48.
        self.assertEqual(line.base_amount, Decimal('240.00'))
        self.assertEqual(line.surcharge_amount, Decimal('48.00'))
        self.assertEqual(line.allowance_amount, Decimal('0.00'))
        self.assertEqual(line.total, Decimal('288.00'))

    def test_the_breakdown_names_the_surcharge_and_the_hours_it_applied_to(self):
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        breakdown = invoice.lines.get().surcharge_breakdown

        self.assertEqual(len(breakdown), 1)
        self.assertEqual(breakdown[0]['name'], 'Nachttoeslag')
        self.assertEqual(Decimal(breakdown[0]['amount']), Decimal('48.00'))
        self.assertEqual(Decimal(breakdown[0]['hours']), Decimal('4.0'))

    def test_the_parts_add_up_to_the_line_total(self):
        self.night_shift()
        line = generate_invoice(
            self.customer, week=(2026, 33), actor=self.user).lines.get()
        self.assertEqual(
            line.base_amount + line.surcharge_amount + line.allowance_amount,
            line.total)

    def test_the_stored_breakdown_does_not_move_when_the_surcharge_does(self):
        """An issued line keeps the percentage it was billed at."""
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        line = invoice.lines.get()
        billed = (line.total, line.surcharge_amount, line.surcharge_breakdown)

        from apps.customers.models import CustomerSurcharge
        from apps.worklogs.models import clear_surcharge_caches
        CustomerSurcharge.objects.filter(surcharge_type=self.night).update(
            percentage=Decimal('200.00'))
        clear_surcharge_caches()

        line.refresh_from_db()
        self.assertEqual(
            (line.total, line.surcharge_amount, line.surcharge_breakdown), billed)


# ─────────────────────────────────────────────────────────────────────────────
# 2. One amount, all the way from the work entry to the VAT ledger
# ─────────────────────────────────────────────────────────────────────────────

class SurchargeFlowTests(SurchargeFixture, TestCase):
    def test_the_same_number_appears_at_every_stage(self):
        entry = self.night_shift()

        # Stage 1 — the work entry, the platform's pricing authority.
        entry_total = entry.calculated_price
        self.assertEqual(entry_total, Decimal('288.00'))

        # Stage 2 — what billing reads from it.
        self.assertEqual(price_entry(entry)['total'], entry_total)

        # Stage 3 — the invoice line.
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.get()
        self.assertEqual(line.total, entry_total)

        # Stage 4 — the invoice totals.
        self.assertEqual(invoice.subtotal, entry_total)
        self.assertEqual(invoice.vat_amount, Decimal('60.48'))     # 288 x 21%
        self.assertEqual(invoice.total, Decimal('348.48'))

        # Stage 5 — the VAT classification on the line.
        self.assertEqual(line.net_amount, entry_total)
        self.assertEqual(line.vat_amount, Decimal('60.48'))
        self.assertEqual(line.vat_return_box, '1a')

        # Stage 6 — the VAT ledger.
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        ledger = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        self.assertEqual(ledger.taxable_base, entry_total)
        self.assertEqual(ledger.vat_amount, Decimal('60.48'))

        # Stage 7 — the return.
        from apps.vat.returns import calculate_return
        result = calculate_return(VatPeriod.for_date(date(2026, 8, 17)))
        box_1a = next(box for box in result['boxes'] if box['code'] == '1a')
        self.assertEqual(box_1a['taxable_base'], entry_total)
        self.assertEqual(result['box_5a'], Decimal('60.48'))

    def test_the_surcharge_is_taxed_like_the_rest_of_the_line(self):
        """
        A surcharge is part of the consideration, so it carries the same VAT as
        the work. Excluding it would understate the output VAT by 21% of it.
        """
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.get()

        vat_on_base = (line.base_amount * Decimal('0.21')).quantize(Decimal('0.01'))
        vat_on_surcharge = (line.surcharge_amount * Decimal('0.21')).quantize(
            Decimal('0.01'))
        self.assertEqual(line.vat_amount, vat_on_base + vat_on_surcharge)

    def test_a_surcharged_line_survives_being_credited(self):
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        invoice.refresh_from_db()

        note = create_credit_note(invoice, reason='Billed to the wrong customer.',
                                  actor=self.user, issue_date=date(2026, 8, 20))
        credit = note.lines.get()
        self.assertEqual(credit.total, Decimal('-288.00'))
        self.assertEqual(credit.surcharge_amount, Decimal('-48.00'))
        self.assertEqual(credit.vat_amount, Decimal('-60.48'))

        from apps.vat.returns import calculate_return
        self.assertEqual(
            calculate_return(VatPeriod.for_date(date(2026, 8, 17)))['box_5a'],
            Decimal('0.00'))


# ─────────────────────────────────────────────────────────────────────────────
# 3 & 4. Numbering: safe under concurrency, never reused
# ─────────────────────────────────────────────────────────────────────────────

class ConcurrentNumberingTests(TransactionTestCase):
    """
    Two requests taking a number at the same time must not get the same one.

    `next_number` locks the sequence row for the duration of its transaction.
    On PostgreSQL that is SELECT FOR UPDATE; SQLite serialises writers with a
    database lock, which produces the same guarantee. The test asserts the
    guarantee rather than the mechanism.
    """

    reset_sequences = True

    def setUp(self):
        configure_company()

    def test_twenty_concurrent_callers_get_twenty_distinct_numbers(self):
        numbers, errors = [], []
        lock = threading.Lock()

        def take():
            try:
                # The retry the API applies: a writer that loses the lock waits
                # and tries again instead of failing the request.
                from apps.invoices.billing import retry_on_lock

                def once():
                    with transaction.atomic():
                        return next_number(DocumentSeries.INVOICE, 2026)

                number = retry_on_lock(once, attempts=8)
                with lock:
                    numbers.append(number)
            except Exception as exc:            # noqa: BLE001 - reported below
                with lock:
                    errors.append(repr(exc))
            finally:
                connections.close_all()

        threads = [threading.Thread(target=take) for _ in range(20)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # The guarantee: no two callers ever receive the same number. A caller
        # that loses the race and errors is safe — the request fails and can be
        # retried. Two invoices carrying the same number is not.
        self.assertEqual(len(set(numbers)), len(numbers),
                         f'duplicate numbers issued: {numbers}')

        # Whatever was handed out is a prefix of the series, with no gaps.
        self.assertEqual(
            sorted(numbers),
            [f'F2026-{index:03d}' for index in range(1, len(numbers) + 1)],
            f'the series has gaps: {sorted(numbers)}')

        # Every failure must be lock contention, never anything else.
        for error in errors:
            self.assertIn('locked', error.lower(), f'unexpected failure: {error}')

        print(f'\n    [concurrency] {len(numbers)}/20 succeeded, '
              f'{len(errors)} exhausted their retries, 0 duplicates')

    def test_the_stored_sequence_matches_what_was_handed_out(self):
        for _ in range(5):
            with transaction.atomic():
                next_number(DocumentSeries.INVOICE, 2026)
        row = InvoiceSequence.objects.get(series=DocumentSeries.INVOICE, year=2026)
        self.assertEqual(row.last_number, 5)

    def test_a_rolled_back_transaction_releases_its_number(self):
        """
        A failed create must not burn a number, or the series develops gaps that
        an auditor will ask about.
        """
        with transaction.atomic():
            next_number(DocumentSeries.INVOICE, 2026)

        try:
            with transaction.atomic():
                next_number(DocumentSeries.INVOICE, 2026)
                raise RuntimeError('the create failed after taking a number')
        except RuntimeError:
            pass

        with transaction.atomic():
            self.assertEqual(next_number(DocumentSeries.INVOICE, 2026), 'F2026-002')


class BillingFixture:
    """Shared fixtures. A mixin, not a base test case: subclassing a TestCase
    re-runs its tests against the subclass's setUp."""

    def setUp(self):
        configure_company()
        self.user = make_user(email='num@ckm.test', role='admin')
        self.customer = make_customer(btw_number='NL812345678B01')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))

    def _invoice(self, week, day):
        make_work_entry(employee=make_employee(), project=self.project,
                        service=self.service, work_date=MONDAY + timedelta(days=day))
        return generate_invoice(self.customer, week=week, actor=self.user)


class NumberReuseTests(BillingFixture, TestCase):
    """A number that has been handed out is never handed out again."""

    def test_deleting_a_draft_does_not_free_its_number(self):
        first = self._invoice((2026, 33), 0)
        self.assertEqual(first.invoice_number, 'F2026-001')
        first.lines.all().delete()
        first.delete()

        second = self._invoice((2026, 33), 1)
        self.assertEqual(second.invoice_number, 'F2026-002')

    def test_cancelling_an_invoice_does_not_free_its_number(self):
        first = self._invoice((2026, 33), 0)
        issue_invoice(first, actor=self.user, issue_date=date(2026, 8, 17))
        create_credit_note(first, reason='Cancelled in full after issue.',
                           actor=self.user, issue_date=date(2026, 8, 18))
        first.refresh_from_db()
        self.assertEqual(first.status, Invoice.Status.CANCELLED)

        replacement = self._invoice((2026, 33), 1)
        self.assertNotIn(replacement.invoice_number,
                         {'F2026-001'})
        self.assertEqual(replacement.invoice_number, 'F2026-002')

    def test_an_issued_invoice_cannot_be_deleted_through_the_api(self):
        invoice = self._invoice((2026, 33), 0)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        client = APIClient()
        client.force_authenticate(self.user)
        response = client.delete(f'/api/invoices/invoices/{invoice.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Invoice.objects.filter(pk=invoice.pk).exists())

    def test_a_cancelled_invoice_cannot_be_deleted_either(self):
        """Its number was consumed and the customer has the document."""
        invoice = self._invoice((2026, 33), 0)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        create_credit_note(invoice, reason='Cancelled in full after issue.',
                           actor=self.user, issue_date=date(2026, 8, 18))
        invoice.refresh_from_db()

        client = APIClient()
        client.force_authenticate(self.user)
        self.assertEqual(
            client.delete(f'/api/invoices/invoices/{invoice.pk}/').status_code, 400)

    def test_the_number_is_unique_in_the_database(self):
        from django.db.utils import IntegrityError

        invoice = self._invoice((2026, 33), 0)
        with self.assertRaises(IntegrityError):
            Invoice.objects.create(
                invoice_number=invoice.invoice_number, customer=self.customer,
                week_year=2026, week_number=40,
                week_start_date=MONDAY, week_end_date=MONDAY)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Credit notes: their own series, pointing at the original
# ─────────────────────────────────────────────────────────────────────────────

class CreditNoteSequenceTests(BillingFixture, TestCase):
    def test_credit_notes_number_in_their_own_series(self):
        first = self._invoice((2026, 33), 0)
        issue_invoice(first, actor=self.user, issue_date=date(2026, 8, 17))
        note = create_credit_note(first, reason='A written reason for crediting.',
                                  actor=self.user, issue_date=date(2026, 8, 18))

        self.assertEqual(note.invoice_number, 'CN2026-001')
        self.assertEqual(first.invoice_number, 'F2026-001')
        self.assertEqual(note.corrects, first)
        self.assertTrue(note.correction_reason)

    def test_the_two_series_advance_independently(self):
        first = self._invoice((2026, 33), 0)
        issue_invoice(first, actor=self.user, issue_date=date(2026, 8, 17))
        create_credit_note(first, reason='First credit, in full.',
                           actor=self.user, issue_date=date(2026, 8, 18))

        second = self._invoice((2026, 33), 1)
        issue_invoice(second, actor=self.user, issue_date=date(2026, 8, 19))
        note = create_credit_note(second, reason='Second credit, in full.',
                                  actor=self.user, issue_date=date(2026, 8, 20))

        self.assertEqual(second.invoice_number, 'F2026-002')
        self.assertEqual(note.invoice_number, 'CN2026-002')

    def test_a_credit_note_number_is_never_reused(self):
        first = self._invoice((2026, 33), 0)
        issue_invoice(first, actor=self.user, issue_date=date(2026, 8, 17))
        note = create_credit_note(first, reason='A written reason for crediting.',
                                  actor=self.user, issue_date=date(2026, 8, 18))

        client = APIClient()
        client.force_authenticate(self.user)
        self.assertEqual(
            client.delete(f'/api/invoices/invoices/{note.pk}/').status_code, 400)

        second = self._invoice((2026, 33), 1)
        issue_invoice(second, actor=self.user, issue_date=date(2026, 8, 19))
        again = create_credit_note(second, reason='Another written reason.',
                                   actor=self.user, issue_date=date(2026, 8, 20))
        self.assertEqual(again.invoice_number, 'CN2026-002')


# ─────────────────────────────────────────────────────────────────────────────
# 6. An issued invoice is immutable
# ─────────────────────────────────────────────────────────────────────────────

class ImmutabilityTests(BillingFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.invoice = self._invoice((2026, 33), 0)
        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.invoice.refresh_from_db()
        self.client_ = APIClient()
        self.client_.force_authenticate(self.user)

    def _snapshot(self):
        self.invoice.refresh_from_db()
        return (self.invoice.invoice_number, self.invoice.subtotal,
                self.invoice.vat_amount, self.invoice.total,
                self.invoice.issue_date, self.invoice.due_date,
                self.invoice.vat_rate, self.invoice.status,
                self.invoice.customer_id, self.invoice.notes)

    def test_the_figures_cannot_be_changed_through_the_api(self):
        before = self._snapshot()
        for payload in (
            {'subtotal': '9999.00'}, {'total': '9999.00'},
            {'vat_amount': '9999.00'}, {'invoice_number': 'HACKED'},
            {'issue_date': '2020-01-01'}, {'due_date': '2020-01-01'},
            {'vat_rate': '0.00'}, {'notes': 'rewritten'},
            {'week_year': 2020}, {'week_number': 1},
        ):
            with self.subTest(payload=payload):
                self.client_.patch(f'/api/invoices/invoices/{self.invoice.pk}/',
                                   payload, format='json')
                self.assertEqual(self._snapshot(), before)

    def test_an_issued_invoice_cannot_be_put_back_into_draft(self):
        """A draft can be deleted, so this was a route to deleting an issued one."""
        self.client_.patch(f'/api/invoices/invoices/{self.invoice.pk}/',
                           {'status': 'draft'}, format='json')
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.SENT)

    def test_the_amount_paid_cannot_be_set_by_hand(self):
        self.client_.patch(f'/api/invoices/invoices/{self.invoice.pk}/',
                           {'amount_paid': '9999.00'}, format='json')
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('0.00'))

    def test_changing_the_immutable_fields_is_reported_not_ignored(self):
        response = self.client_.patch(
            f'/api/invoices/invoices/{self.invoice.pk}/',
            {'vat_rate': '0.00'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('credit note', str(response.data).lower())

    def test_no_new_lines_can_be_added(self):
        from apps.invoices.billing import add_entry_line

        entry = make_work_entry(employee=make_employee(), project=self.project,
                                service=self.service, work_date=MONDAY + timedelta(days=2))
        with self.assertRaises(BillingError):
            add_entry_line(self.invoice, entry)

    def test_a_draft_can_still_be_edited(self):
        """Immutability starts at issue, not at creation."""
        draft = self._invoice((2026, 34), 7)
        response = self.client_.patch(f'/api/invoices/invoices/{draft.pk}/',
                                      {'notes': 'Still a draft.'}, format='json')
        self.assertEqual(response.status_code, 200)
        draft.refresh_from_db()
        self.assertEqual(draft.notes, 'Still a draft.')

    def test_editing_a_draft_does_not_return_a_server_error(self):
        """
        The weekly-uniqueness constraint is conditional, and DRF derives a
        validator from it that reads the condition fields out of the request. A
        PATCH does not carry them, so every partial update returned HTTP 500.
        """
        draft = self._invoice((2026, 35), 14)
        for payload in ({'notes': 'a'}, {'internal_notes': 'b'},
                        {'vat_rate': '9.00'}):
            with self.subTest(payload=payload):
                response = self.client_.patch(
                    f'/api/invoices/invoices/{draft.pk}/', payload, format='json')
                self.assertLess(response.status_code, 500, response.data)


# ─────────────────────────────────────────────────────────────────────────────
# 7 & 8. The two refusals
# ─────────────────────────────────────────────────────────────────────────────

class RefusalTests(TestCase):
    def setUp(self):
        configure_company()
        self.user = make_user(email='refuse@ckm.test', role='admin')
        self.customer = make_customer(btw_number='NL812345678B01')
        self.project = make_project(customer=self.customer)
        self.service = make_service(name='Schoonmaak')

    def _entry(self, day=0):
        return make_work_entry(
            employee=make_employee(), project=self.project, service=self.service,
            work_date=MONDAY + timedelta(days=day))

    def test_an_unestablished_treatment_is_null_not_zero_and_not_21_percent(self):
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self._entry()
        line = generate_invoice(
            self.customer, week=(2026, 33), actor=self.user).lines.get()

        self.assertEqual(line.vat_classification_status, 'REQUIRES_REVIEW')
        self.assertIsNone(line.vat_amount)
        self.assertIsNone(line.vat_rate)
        self.assertEqual(line.vat_return_box, '')
        self.assertTrue(line.vat_review_reason)

    def test_an_unestablished_treatment_blocks_issuing(self):
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self._entry()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        self.assertIn('VAT_REQUIRES_REVIEW',
                      [blocker['code'] for blocker in issue_blockers(invoice)])
        with self.assertRaises(BillingError):
            issue_invoice(invoice, actor=self.user)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertFalse(invoice.pdf_file)
        self.assertFalse(VatLedgerEntry.objects.exists())

    def test_a_missing_rate_blocks_issuing_and_never_produces_a_zero_invoice(self):
        self._entry()                                  # no rate configured
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        self.assertEqual(invoice.subtotal, Decimal('0.00'))
        self.assertIn('NO_RATE',
                      [blocker['code'] for blocker in issue_blockers(invoice)])
        with self.assertRaises(BillingError):
            issue_invoice(invoice, actor=self.user)
        invoice.refresh_from_db()
        self.assertIsNone(invoice.issue_date)

    def test_the_preview_warns_about_a_missing_rate_before_anything_is_created(self):
        self._entry()
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')

        self.assertEqual(response.data['subtotal'], Decimal('0.00'))
        self.assertEqual(response.data['warnings'][0]['code'], 'NO_RATE')
        self.assertEqual(Invoice.objects.count(), 0)

    def test_resolving_both_lets_the_invoice_through(self):
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self._entry()

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertEqual(issue_blockers(invoice), [])
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.SENT)


# ─────────────────────────────────────────────────────────────────────────────
# 9. The PDF is the stored document, rendered from persisted data
# ─────────────────────────────────────────────────────────────────────────────

class StoredDocumentTests(SurchargeFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.night_shift()
        self.invoice = generate_invoice(self.customer, week=(2026, 33),
                                        actor=self.user)
        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.invoice.refresh_from_db()

    def _stored_bytes(self):
        self.invoice.pdf_file.open('rb')
        content = self.invoice.pdf_file.read()
        self.invoice.pdf_file.close()
        return content

    def test_issuing_stores_the_pdf(self):
        self.assertTrue(self.invoice.pdf_file)
        self.assertIsNotNone(self.invoice.pdf_generated_at)
        self.assertTrue(self._stored_bytes().startswith(b'%PDF'))

    def test_the_stored_file_is_not_re_rendered(self):
        from apps.invoices.billing import render_pdf

        before = self._stored_bytes()
        name = self.invoice.pdf_file.name
        render_pdf(self.invoice)
        self.invoice.refresh_from_db()

        self.assertEqual(self.invoice.pdf_file.name, name)
        self.assertEqual(self._stored_bytes(), before)

    def test_the_api_returns_the_stored_file_not_a_fresh_render(self):
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get(f'/api/invoices/invoices/{self.invoice.pk}/pdf/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertEqual(response.content, self._stored_bytes())

    def test_the_document_carries_the_persisted_figures(self):
        import io

        from PyPDF2 import PdfReader

        text = PdfReader(io.BytesIO(self._stored_bytes())).pages[0].extract_text()
        self.assertIn(self.invoice.invoice_number, text)
        self.assertIn('288,00', text)          # the line total, surcharge included
        self.assertIn('Nachttoeslag', text)    # the surcharge, itemised
        self.assertIn('KvK 42074970', text)
        self.assertIn('BTW NL869591071B01', text)

    def test_changing_the_underlying_data_does_not_change_the_issued_document(self):
        before = self._stored_bytes()

        self.customer.company_name = 'Renamed After Issue B.V.'
        self.customer.save()
        from apps.customers.models import CustomerSurcharge
        CustomerSurcharge.objects.filter(surcharge_type=self.night).update(
            percentage=Decimal('300.00'))

        self.assertEqual(self._stored_bytes(), before)


# ─────────────────────────────────────────────────────────────────────────────
# 10. Reverse charge goes through the one VAT engine
# ─────────────────────────────────────────────────────────────────────────────

class ReverseChargeUsesTheEngineTests(SurchargeFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()

    def test_billing_calls_the_shared_classifier(self):
        """
        Not a separate code path: the same `classify_amount` that decides a
        supplier invoice decides this one.
        """
        from unittest.mock import patch

        with patch('apps.invoices.billing.classify_amount',
                   wraps=__import__('apps.vat.classification', fromlist=['x'])
                   .classify_amount) as classifier:
            self.night_shift()
            generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        self.assertTrue(classifier.called)
        self.assertEqual(classifier.call_args.kwargs['direction'], 'OUTPUT')

    def test_it_lands_in_the_shared_ledger_in_box_1e(self):
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        entry = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        self.assertEqual(entry.return_box.code, '1e')
        self.assertEqual(entry.vat_amount, Decimal('0.00'))
        self.assertEqual(entry.taxable_base, Decimal('288.00'))
        self.assertEqual(entry.classification_status, 'CLASSIFIED')

    def test_the_return_reports_it_in_1e_and_not_in_5a(self):
        from apps.vat.returns import calculate_return

        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        result = calculate_return(VatPeriod.for_date(date(2026, 8, 17)))
        boxes = {box['code']: box for box in result['boxes']}
        self.assertEqual(boxes['1e']['taxable_base'], Decimal('288.00'))
        self.assertEqual(boxes['1a']['taxable_base'], Decimal('0.00'))
        self.assertEqual(result['box_5a'], Decimal('0.00'))
        self.assertNotIn('5g', [box['code'] for box in result['boxes']])

    def test_there_is_no_second_vat_calculator_in_the_invoices_app(self):
        """
        A guard against the obvious future mistake: someone adding a rate
        multiplication to the billing code instead of asking the engine.
        """
        import re
        from pathlib import Path

        billing = Path(__file__).resolve().parents[1] / 'billing.py'
        source = billing.read_text()
        offenders = re.findall(r'\*\s*0\.21|/\s*1\.21|\*\s*1\.21|vat_rate\s*/\s*100',
                               source)
        self.assertEqual(offenders, [],
                         'billing.py is doing its own VAT arithmetic')

    def test_the_engine_still_refuses_when_the_facts_are_missing(self):
        self.project.is_physical_work_on_immovable_property = None
        self.project.save()
        self.night_shift()

        line = generate_invoice(
            self.customer, week=(2026, 33), actor=self.user).lines.get()
        self.assertEqual(line.vat_classification_status, 'REQUIRES_REVIEW')
        self.assertIn('Reverse charge cannot be established', line.vat_review_reason)


# ─────────────────────────────────────────────────────────────────────────────
# The invoice and the VAT return must never disagree
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceAndReturnAgreeTests(SurchargeFixture, TestCase):
    """
    Whatever VAT the customer is charged is the VAT that gets declared.

    Costs and allowances used to be billed to the customer, taxed at a flat rate
    on the invoice, and then left out of the VAT ledger entirely — so an invoice
    with billed transport collected VAT that the return never declared.
    """

    def _with_costs(self, cost=Decimal('50.00'), quantity=Decimal('2')):
        from apps.invoices.models import CostType, InvoiceCost

        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        cost_type = CostType.objects.create(
            name='Transport', code=f'T{invoice.pk.hex[:6]}', default_unit_price=cost)
        InvoiceCost.objects.create(
            invoice=invoice, cost_type=cost_type, project=self.project,
            employee=self.employee, description='Reiskosten',
            quantity=quantity, unit_price=cost)
        invoice.calculate_totals()
        invoice.refresh_from_db()
        return invoice

    def _declared(self, on_date=date(2026, 8, 17)):
        from apps.vat.returns import calculate_return

        return calculate_return(VatPeriod.for_date(on_date))

    def test_billed_costs_are_taxed_and_declared(self):
        invoice = self._with_costs()
        self.assertEqual(invoice.total_costs, Decimal('100.00'))
        # 288 of work + 100 of costs, all at 21%.
        self.assertEqual(invoice.vat_amount, Decimal('81.48'))

        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        result = self._declared()
        self.assertEqual(result['box_5a'], invoice.vat_amount)

    def test_the_taxable_base_reaches_box_1a_in_full(self):
        invoice = self._with_costs()
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        box_1a = next(box for box in self._declared()['boxes']
                      if box['code'] == '1a')
        self.assertEqual(box_1a['taxable_base'],
                         invoice.subtotal + invoice.total_costs)

    def test_costs_on_a_reverse_charged_invoice_are_not_taxed(self):
        """The extras follow the supply they are billed with."""
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()

        invoice = self._with_costs()
        self.assertEqual(invoice.vat_amount, Decimal('0.00'))

        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        result = self._declared()
        boxes = {box['code']: box for box in result['boxes']}
        self.assertEqual(result['box_5a'], Decimal('0.00'))
        self.assertEqual(boxes['1e']['taxable_base'], Decimal('388.00'))

    def test_gratuities_are_neither_taxed_nor_declared(self):
        """
        A tip passed to staff is not consideration for CKM's supply. Recorded
        here so the treatment is visible and can be challenged rather than
        being an accident of the code.
        """
        from apps.customers.models import Gratuity
        from apps.invoices.models import InvoiceGratuity

        invoice = self._with_costs()
        gratuity = Gratuity.objects.create(
            customer=self.customer, employee=self.employee,
            amount=Decimal('75.00'), date_received=MONDAY)
        InvoiceGratuity.objects.create(
            invoice=invoice, gratuity=gratuity, employee=self.employee,
            description='Kerstfooi', amount=Decimal('75.00'))
        invoice.calculate_totals()
        invoice.refresh_from_db()

        self.assertEqual(invoice.total_gratuities, Decimal('75.00'))
        self.assertEqual(invoice.vat_amount, Decimal('81.48'))   # unchanged
        self.assertEqual(invoice.total, Decimal('544.48'))       # 288+100+75+81.48

        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.assertEqual(self._declared()['box_5a'], Decimal('81.48'))

    def test_re_posting_does_not_duplicate_the_extras(self):
        from apps.vat.posting import post_invoice

        invoice = self._with_costs()
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        before = self._declared()['box_5a']

        post_invoice(invoice)
        post_invoice(invoice)
        self.assertEqual(self._declared()['box_5a'], before)
        self.assertEqual(
            VatLedgerEntry.objects.filter(source_type='InvoiceExtras').count(), 1)

    def test_an_invoice_with_no_extras_posts_nothing_extra(self):
        self.night_shift()
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.assertFalse(
            VatLedgerEntry.objects.filter(source_type='InvoiceExtras').exists())


    def test_the_pdf_shows_the_same_vat_the_return_declares(self):
        """
        The document, the invoice totals and the VAT ledger are three places
        that used to compute the extras' VAT separately.
        """
        import io

        from PyPDF2 import PdfReader

        from apps.invoices.pdf import build_invoice_pdf

        invoice = self._with_costs()
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        invoice.refresh_from_db()

        text = PdfReader(io.BytesIO(build_invoice_pdf(invoice))).pages[0].extract_text()
        self.assertIn('81,48', text)                         # the VAT charged
        self.assertIn('Btw 21% over', text)
        self.assertEqual(self._declared()['box_5a'], Decimal('81.48'))

    def test_a_reverse_charged_pdf_says_verlegd_over_the_full_amount(self):
        import io

        from PyPDF2 import PdfReader

        from apps.invoices.pdf import build_invoice_pdf

        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()

        invoice = self._with_costs()
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        invoice.refresh_from_db()

        text = PdfReader(io.BytesIO(build_invoice_pdf(invoice))).pages[0].extract_text()
        self.assertIn('Btw verlegd over', text)
        self.assertIn('388,00', text)      # work and costs together
        self.assertNotIn('Btw 21%', text)


    def test_a_mixed_invoice_with_extras_cannot_be_issued(self):
        """
        Some lines at 21%, some reverse charged: there is no single answer for
        the costs, so the invoice must not go out charging a VAT amount the
        return will not declare.
        """
        lent = make_project(customer=self.customer, name='Uitlening')
        lent.vat_treatment_code = 'REVERSE_CHARGE'
        lent.is_staff_lending_or_subcontracting = True
        lent.is_physical_work_on_immovable_property = True
        lent.save()
        make_work_entry(employee=make_employee(), project=lent,
                        service=self.service, work_date=MONDAY + timedelta(days=1))

        invoice = self._with_costs()
        codes = [blocker['code'] for blocker in issue_blockers(invoice)]
        self.assertIn('EXTRAS_TREATMENT_UNRESOLVED', codes)
        with self.assertRaises(BillingError):
            issue_invoice(invoice, actor=self.user)

    def test_stating_the_treatment_on_the_invoice_resolves_a_mixed_one(self):
        lent = make_project(customer=self.customer, name='Uitlening')
        lent.vat_treatment_code = 'REVERSE_CHARGE'
        lent.is_staff_lending_or_subcontracting = True
        lent.is_physical_work_on_immovable_property = True
        lent.save()
        make_work_entry(employee=make_employee(), project=lent,
                        service=self.service, work_date=MONDAY + timedelta(days=1))

        invoice = self._with_costs()
        invoice.vat_treatment_code = 'NORMAL'
        invoice.save()
        invoice.calculate_totals()
        invoice.refresh_from_db()

        self.assertNotIn('EXTRAS_TREATMENT_UNRESOLVED',
                         [blocker['code'] for blocker in issue_blockers(invoice)])
        self.assertEqual(invoice.extras_vat, Decimal('21.00'))

    def test_an_invoice_without_extras_is_unaffected_by_mixed_treatments(self):
        lent = make_project(customer=self.customer, name='Uitlening')
        lent.vat_treatment_code = 'REVERSE_CHARGE'
        lent.is_staff_lending_or_subcontracting = True
        lent.is_physical_work_on_immovable_property = True
        lent.save()
        self.night_shift()
        make_work_entry(employee=make_employee(), project=lent,
                        service=self.service, work_date=MONDAY + timedelta(days=1))

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertEqual(issue_blockers(invoice), [])
