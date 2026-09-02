"""
Turning approved work into invoices.

The scenarios are CKM's: a week of cleaning at an office, a night shift with a
surcharge, a lent worker whose supply is reverse charged, and a mistake that has
to be credited after the invoice has gone out.
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
from apps.invoices.billing import (
    BillingError, billable_entries, create_credit_note, generate_invoice,
    issue_blockers, issue_invoice, price_entry, record_payment,
)
from apps.invoices.models import DocumentSeries, Invoice, InvoiceLine, InvoiceSequence
from apps.invoices.numbering import next_number, peek_number
from apps.vat.models import VatLedgerEntry, VatPeriod
from apps.worklogs.models import WorkEntry

MONDAY = date(2026, 8, 10)      # ISO week 33 of 2026


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


class BillingSetup(TestCase):
    """A customer who pays €40/hour for cleaning, and one week of work."""

    def setUp(self):
        configure_company()
        self.user = make_user(email='bill@ckm.test', role='admin')
        self.customer = make_customer(company_name='Smaak voor Groen',
                                      btw_number='NL001538146B17')
        self.customer.vat_treatment_code = 'NORMAL'
        self.customer.save()
        self.project = make_project(customer=self.customer, name='Kantoor Rotterdam')
        self.service = make_service(name='Schoonmaak')
        attach_service_rate(self.customer, self.service, Decimal('40.00'))
        self.employee = make_employee()

    def work(self, day=0, start='09:00', end='17:00', **kwargs):
        return make_work_entry(
            employee=self.employee, project=self.project,
            work_date=MONDAY + timedelta(days=day),
            start=start, end=end, service=self.service, **kwargs)


class SelectionTests(BillingSetup):
    def test_only_approved_work_is_billable(self):
        self.work(0)
        self.work(1, status='submitted')
        self.work(2, status='draft')
        self.assertEqual(billable_entries(self.customer, week=(2026, 33)).count(), 1)

    def test_a_period_can_span_weeks(self):
        self.work(0)
        self.work(9)     # the following week
        found = billable_entries(
            self.customer, start=MONDAY, end=MONDAY + timedelta(days=13))
        self.assertEqual(found.count(), 2)

    def test_a_project_narrows_the_selection(self):
        other = make_project(customer=self.customer, name='Depot')
        self.work(0)
        make_work_entry(employee=self.employee, project=other,
                        work_date=MONDAY, service=self.service)
        self.assertEqual(
            billable_entries(self.customer, week=(2026, 33), project=self.project).count(), 1)

    def test_billed_work_drops_out_of_the_selection(self):
        self.work(0)
        generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertEqual(billable_entries(self.customer, week=(2026, 33)).count(), 0)


class PricingTests(BillingSetup):
    def test_hours_at_the_customer_rate(self):
        entry = self.work(0)                       # 09:00-17:00 less 30 min
        priced = price_entry(entry)
        self.assertEqual(priced['hours'], Decimal('7.50'))
        self.assertEqual(priced['rate'], Decimal('40.00'))
        self.assertEqual(priced['total'], Decimal('300.00'))

    def test_a_surcharge_is_priced_and_itemised(self):
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))
        entry = self.work(0, start='02:00', end='08:00', break_minutes=0)

        priced = price_entry(entry)
        self.assertTrue(priced['surcharges'], 'the surcharge should be itemised')
        self.assertGreater(priced['surcharge_amount'], Decimal('0.00'))
        self.assertEqual(priced['total'], entry.calculated_price)

    def test_the_line_carries_the_surcharge_breakdown_to_the_invoice(self):
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))
        self.work(0, start='02:00', end='08:00', break_minutes=0)

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertTrue(line.surcharge_breakdown)
        self.assertEqual(line.surcharge_breakdown[0]['name'], 'Nachttoeslag')
        self.assertEqual(line.total, line.base_amount + line.surcharge_amount
                         + line.allowance_amount)

    def test_saving_a_line_does_not_recompute_a_billed_total(self):
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))
        self.work(0, start='02:00', end='08:00', break_minutes=0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        line = invoice.lines.first()
        billed = line.total
        line.description = 'Renamed'
        line.save()
        line.refresh_from_db()
        self.assertEqual(line.total, billed)


class DuplicateBillingTests(BillingSetup):
    def test_a_work_entry_cannot_be_billed_twice(self):
        entry = self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        second = Invoice.objects.create(
            invoice_number='F2026-TEST', customer=self.customer,
            week_year=2026, week_number=34,
            week_start_date=MONDAY, week_end_date=MONDAY)
        from apps.invoices.billing import add_entry_line
        with self.assertRaises(BillingError):
            add_entry_line(second, entry)

    def test_the_database_refuses_a_duplicate_even_without_the_service(self):
        from django.db.utils import IntegrityError

        entry = self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        second = Invoice.objects.create(
            invoice_number='F2026-TEST2', customer=self.customer,
            week_year=2026, week_number=35,
            week_start_date=MONDAY, week_end_date=MONDAY)
        with self.assertRaises(IntegrityError):
            InvoiceLine.objects.create(
                invoice=second, project=self.project, employee=self.employee,
                work_entry=entry, quantity_hours=Decimal('1'),
                hourly_rate=Decimal('1'))

    def test_a_second_invoice_for_the_same_week_is_refused(self):
        self.work(0)
        generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.work(1)
        with self.assertRaises(BillingError) as caught:
            generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertIn('already covers week', str(caught.exception))

    def test_a_cancelled_invoice_does_not_block_a_replacement(self):
        self.work(0)
        first = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        first.status = Invoice.Status.CANCELLED
        first.save()
        first.lines.update(is_deleted=True)

        replacement = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertNotEqual(replacement.pk, first.pk)

    def test_nothing_to_bill_is_an_error_not_an_empty_invoice(self):
        with self.assertRaises(BillingError):
            generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertEqual(Invoice.objects.count(), 0)


class NumberingTests(TestCase):
    def setUp(self):
        configure_company()

    def test_numbers_are_sequential_per_year_and_series(self):
        self.assertEqual(next_number(DocumentSeries.INVOICE, 2026), 'F2026-001')
        self.assertEqual(next_number(DocumentSeries.INVOICE, 2026), 'F2026-002')
        self.assertEqual(next_number(DocumentSeries.CREDIT_NOTE, 2026), 'CN2026-001')
        self.assertEqual(next_number(DocumentSeries.INVOICE, 2027), 'F2027-001')

    def test_peek_does_not_consume(self):
        peek_number(DocumentSeries.INVOICE, 2026)
        self.assertEqual(next_number(DocumentSeries.INVOICE, 2026), 'F2026-001')

    def test_a_deleted_invoice_does_not_free_its_number(self):
        first = next_number(DocumentSeries.INVOICE, 2026)
        InvoiceSequence.objects.get(series=DocumentSeries.INVOICE, year=2026)
        second = next_number(DocumentSeries.INVOICE, 2026)
        self.assertNotEqual(first, second)

    def test_existing_numbers_are_adopted(self):
        from apps.invoices.numbering import adopt_existing_numbers

        customer = make_customer()
        Invoice.objects.create(
            invoice_number='F2026-009', customer=customer, week_year=2026,
            week_number=33, week_start_date=MONDAY, week_end_date=MONDAY)
        adopt_existing_numbers()
        self.assertEqual(next_number(DocumentSeries.INVOICE, 2026), 'F2026-010')


class VatOnInvoiceTests(BillingSetup):
    def test_ordinary_cleaning_is_charged_at_21_percent(self):
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertEqual(line.vat_classification_status, 'CLASSIFIED')
        self.assertEqual(line.vat_rate, Decimal('21.00'))
        self.assertEqual(line.vat_amount, Decimal('63.00'))
        self.assertEqual(line.vat_return_box, '1a')
        self.assertEqual(invoice.vat_amount, Decimal('63.00'))
        self.assertEqual(invoice.total, Decimal('363.00'))

    def test_an_unstated_treatment_is_held_for_review_not_assumed(self):
        self.customer.vat_treatment_code = 'UNKNOWN'
        self.customer.save()
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertEqual(line.vat_classification_status, 'REQUIRES_REVIEW')
        self.assertIsNone(line.vat_amount)
        self.assertTrue(line.vat_review_reason)

    def test_a_line_held_for_review_blocks_issuing(self):
        self.customer.vat_treatment_code = 'UNKNOWN'
        self.customer.save()
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        blockers = issue_blockers(invoice)
        self.assertEqual(blockers[0]['code'], 'VAT_REQUIRES_REVIEW')
        with self.assertRaises(BillingError):
            issue_invoice(invoice, actor=self.user)

    def test_lent_labour_on_immovable_property_is_reverse_charged(self):
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(0)

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertEqual(line.vat_return_box, '1e')
        self.assertEqual(line.vat_amount, Decimal('0.00'))
        self.assertEqual(invoice.total, Decimal('300.00'))
        self.assertTrue(invoice.has_reverse_charged_lines)

    def test_reverse_charge_without_the_facts_is_held_not_zero_rated(self):
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.save()          # facts left unstated on purpose
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertEqual(line.vat_classification_status, 'REQUIRES_REVIEW')
        self.assertIn('Reverse charge cannot be established', line.vat_review_reason)

    def test_reverse_charge_without_a_customer_vat_number_is_refused(self):
        """
        Reverse charge shifts the VAT to the customer, which is only possible
        if the customer has a VAT number. Without one the engine holds the line
        rather than zero-rating it, and the invoice cannot be issued.
        """
        self.customer.btw_number = ''
        self.customer.save()
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(0)

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        line = invoice.lines.first()
        self.assertEqual(line.vat_classification_status, 'REQUIRES_REVIEW')
        self.assertIsNone(line.vat_amount)
        self.assertEqual([b['code'] for b in issue_blockers(invoice)],
                         ['VAT_REQUIRES_REVIEW'])

    def test_the_missing_vat_number_blocker_guards_a_hand_set_treatment(self):
        """Defence in depth for a line whose box was set outside the engine."""
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        invoice.lines.update(vat_return_box='1e')
        self.customer.btw_number = ''
        self.customer.save()
        invoice.refresh_from_db()
        codes = [b['code'] for b in issue_blockers(invoice)]
        self.assertIn('MISSING_CUSTOMER_VAT_NUMBER', codes)

    def test_one_invoice_can_carry_both_treatments(self):
        lent = make_project(customer=self.customer, name='Uitlening')
        lent.vat_treatment_code = 'REVERSE_CHARGE'
        lent.is_staff_lending_or_subcontracting = True
        lent.is_physical_work_on_immovable_property = True
        lent.save()

        self.work(0)
        make_work_entry(employee=make_employee(), project=lent,
                        work_date=MONDAY + timedelta(days=1), service=self.service)

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        boxes = sorted(invoice.lines.values_list('vat_return_box', flat=True))
        self.assertEqual(boxes, ['1a', '1e'])
        self.assertEqual(invoice.vat_amount, Decimal('63.00'))   # only the 21% line


class IssuingTests(BillingSetup):
    def setUp(self):
        super().setUp()
        self.work(0)
        self.invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

    def test_issuing_dates_the_invoice_and_sets_the_due_date(self):
        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.SENT)
        self.assertEqual(self.invoice.issue_date, date(2026, 8, 17))
        self.assertEqual(self.invoice.due_date, date(2026, 8, 31))

    def test_issuing_renders_and_stores_the_pdf(self):
        issue_invoice(self.invoice, actor=self.user)
        self.invoice.refresh_from_db()
        self.assertTrue(self.invoice.pdf_file)
        self.invoice.pdf_file.open('rb')
        self.assertTrue(self.invoice.pdf_file.read().startswith(b'%PDF'))
        self.invoice.pdf_file.close()

    def test_issuing_posts_the_vat_to_the_ledger(self):
        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 17))
        entry = VatLedgerEntry.objects.get(source_type='InvoiceLine')
        self.assertEqual(entry.vat_amount, Decimal('63.00'))
        self.assertEqual(entry.period, VatPeriod.for_date(date(2026, 8, 17)))

    def test_an_issued_invoice_takes_no_new_lines(self):
        from apps.invoices.billing import add_entry_line

        issue_invoice(self.invoice, actor=self.user)
        entry = self.work(1)
        with self.assertRaises(BillingError):
            add_entry_line(self.invoice, entry)

    def test_an_issued_invoice_cannot_be_issued_again(self):
        issue_invoice(self.invoice, actor=self.user)
        with self.assertRaises(BillingError):
            issue_invoice(self.invoice, actor=self.user)

    def test_payment_moves_the_status_without_touching_the_figures(self):
        issue_invoice(self.invoice, actor=self.user)
        self.invoice.refresh_from_db()
        total = self.invoice.total

        record_payment(self.invoice, Decimal('100.00'))
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PARTIALLY_PAID)
        self.assertEqual(self.invoice.total, total)

        record_payment(self.invoice, total - Decimal('100.00'))
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PAID)

    def test_overdue_is_flagged_by_date(self):
        from apps.invoices.billing import mark_overdue

        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 1))
        self.assertEqual(mark_overdue(as_of=date(2026, 9, 1)), 1)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.OVERDUE)


class CreditNoteTests(BillingSetup):
    def setUp(self):
        super().setUp()
        self.work(0)
        self.invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(self.invoice, actor=self.user, issue_date=date(2026, 8, 17))
        self.invoice.refresh_from_db()

    def test_a_credit_note_is_its_own_document(self):
        note = create_credit_note(
            self.invoice, reason='Hours were billed to the wrong project.',
            actor=self.user)
        self.assertEqual(note.document_type, Invoice.DocumentType.CREDIT_NOTE)
        self.assertTrue(note.invoice_number.startswith('CN2026-'))
        self.assertEqual(note.corrects, self.invoice)
        self.assertEqual(note.total, Decimal('-363.00'))

    def test_the_original_is_never_altered(self):
        before = (self.invoice.subtotal, self.invoice.vat_amount, self.invoice.total)
        create_credit_note(self.invoice, reason='A written reason for the credit.',
                           actor=self.user)
        self.invoice.refresh_from_db()
        self.assertEqual(
            (self.invoice.subtotal, self.invoice.vat_amount, self.invoice.total), before)
        self.assertEqual(self.invoice.lines.filter(is_deleted=False).count(), 1)

    def test_crediting_in_full_settles_the_original(self):
        create_credit_note(self.invoice, reason='Cancelled after issue, in full.',
                           actor=self.user)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.CANCELLED)
        self.assertEqual(self.invoice.net_of_credits, Decimal('0.00'))

    def test_the_credit_reaches_the_vat_return(self):
        create_credit_note(self.invoice, reason='Cancelled after issue, in full.',
                           actor=self.user)
        from apps.vat.returns import calculate_return
        result = calculate_return(VatPeriod.for_date(date(2026, 8, 17)))
        self.assertEqual(result['box_5a'], Decimal('0.00'))

    def test_a_partial_credit_leaves_the_invoice_standing(self):
        self.work(7)
        self.work(8)
        second = generate_invoice(self.customer, week=(2026, 34), actor=self.user)
        issue_invoice(second, actor=self.user, issue_date=date(2026, 8, 24))
        second.refresh_from_db()

        note = create_credit_note(
            second, reason='One of the two lines was billed in error.',
            line_ids=[second.lines.first().pk], actor=self.user)
        second.refresh_from_db()
        self.assertEqual(second.status, Invoice.Status.SENT)
        self.assertEqual(note.lines.count(), 1)

    def test_a_draft_cannot_be_credited(self):
        self.work(7)
        draft = generate_invoice(self.customer, week=(2026, 34), actor=self.user)
        with self.assertRaises(BillingError):
            create_credit_note(draft, reason='This should not be possible.',
                               actor=self.user)

    def test_a_credit_note_requires_a_reason(self):
        with self.assertRaises(BillingError):
            create_credit_note(self.invoice, reason='oops', actor=self.user)

    def test_a_credit_note_cannot_be_credited(self):
        note = create_credit_note(self.invoice, reason='A proper written reason.',
                                  actor=self.user)
        with self.assertRaises(BillingError):
            create_credit_note(note, reason='Another proper written reason.',
                               actor=self.user)


class PdfTests(BillingSetup):
    def setUp(self):
        super().setUp()
        night = make_surcharge_type(name='Nachttoeslag')
        attach_customer_surcharge(self.customer, night, Decimal('130.00'))
        self.work(0)
        self.work(1, start='02:00', end='08:00', break_minutes=0)
        self.invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

    def test_the_pdf_renders(self):
        from apps.invoices.pdf import build_invoice_pdf

        content = build_invoice_pdf(self.invoice)
        self.assertTrue(content.startswith(b'%PDF'))
        self.assertGreater(len(content), 2000)

    def test_dutch_money_formatting(self):
        from apps.invoices.pdf import euro

        self.assertEqual(euro(Decimal('1234.5')), '€ 1.234,50')
        self.assertEqual(euro(Decimal('-211.75')), '-€ 211,75')
        self.assertEqual(euro(Decimal('0')), '€ 0,00')

    def test_dutch_dates(self):
        from apps.invoices.pdf import nl_date

        self.assertEqual(nl_date(date(2026, 8, 12)), '12 augustus 2026')

    def _pdf_text(self, invoice):
        import io

        from PyPDF2 import PdfReader

        from apps.invoices.pdf import build_invoice_pdf

        return PdfReader(io.BytesIO(build_invoice_pdf(invoice))).pages[0].extract_text()

    def test_an_ordinary_invoice_states_the_rate_and_the_amounts(self):
        text = self._pdf_text(self.invoice)
        self.assertIn('FACTUUR', text)
        self.assertIn('Btw 21%', text)
        self.assertIn('CKMcleaning VOF', text)
        self.assertIn('KvK 42074970', text)
        self.assertIn('BTW NL869591071B01', text)
        self.assertNotIn('verlegd', text.lower())

    def test_a_reverse_charged_invoice_says_btw_verlegd_and_shows_no_vat(self):
        """
        The wording and the customer's VAT number are what make the shift
        lawful. An invoice that merely charges 0% is not a reverse-charged
        invoice — it looks like an unexplained zero rate.
        """
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(2)
        invoice = generate_invoice(
            self.customer, start=MONDAY + timedelta(days=2),
            end=MONDAY + timedelta(days=2), actor=self.user)

        self.assertTrue(invoice.has_reverse_charged_lines)
        text = self._pdf_text(invoice)
        self.assertIn('Btw verlegd', text)
        self.assertIn('NL001538146B17', text)          # the customer's number
        self.assertNotIn('Btw 21%', text)
        self.assertNotIn('Btw 0%', text)

    def test_the_treatment_survives_being_issued(self):
        """
        Issuing re-posts the invoice to the VAT ledger. The facts that decided
        the treatment live on the project, so unless the line records them, the
        re-post reclassifies it as unresolved and wipes the box — turning a
        reverse-charged invoice into an unexplained 0%.
        """
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(3)
        invoice = generate_invoice(
            self.customer, start=MONDAY + timedelta(days=3),
            end=MONDAY + timedelta(days=3), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))
        invoice.refresh_from_db()

        line = invoice.lines.first()
        self.assertEqual(line.vat_return_box, '1e')
        self.assertEqual(line.vat_classification_status, 'CLASSIFIED')
        self.assertTrue(invoice.has_reverse_charged_lines)
        self.assertIn('Btw verlegd', self._pdf_text(invoice))

    def test_the_ledger_agrees_with_the_issued_document(self):
        from apps.vat.models import VatLedgerEntry

        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(4)
        invoice = generate_invoice(
            self.customer, start=MONDAY + timedelta(days=4),
            end=MONDAY + timedelta(days=4), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        entry = VatLedgerEntry.objects.get(source_type='InvoiceLine',
                                           source_id=str(invoice.pk))
        self.assertEqual(entry.classification_status, 'CLASSIFIED')
        self.assertEqual(entry.return_box.code, '1e')

    def test_a_later_change_to_the_project_does_not_restate_an_issued_invoice(self):
        """The issued document records the facts it was classified under."""
        self.project.vat_treatment_code = 'REVERSE_CHARGE'
        self.project.is_staff_lending_or_subcontracting = True
        self.project.is_physical_work_on_immovable_property = True
        self.project.save()
        self.work(5)
        invoice = generate_invoice(
            self.customer, start=MONDAY + timedelta(days=5),
            end=MONDAY + timedelta(days=5), actor=self.user)
        issue_invoice(invoice, actor=self.user, issue_date=date(2026, 8, 17))

        # Somebody decides this project is ordinary cleaning after all.
        self.project.vat_treatment_code = 'NORMAL'
        self.project.is_staff_lending_or_subcontracting = False
        self.project.save()

        invoice.refresh_from_db()
        self.assertTrue(invoice.has_reverse_charged_lines)
        self.assertEqual(invoice.lines.first().vat_return_box, '1e')


class InvoiceApiTests(BillingSetup):
    def setUp(self):
        super().setUp()
        self.work(0)
        self.client = APIClient()
        self.client.force_authenticate(make_user(email='fin@inv.test', role='finance'))

    def test_preview_shows_what_would_be_billed_without_creating_it(self):
        response = self.client.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['entry_count'], 1)
        self.assertEqual(response.data['subtotal'], Decimal('300.00'))
        self.assertEqual(Invoice.objects.count(), 0)

    def test_generate_then_issue_then_pdf(self):
        created = self.client.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')
        self.assertEqual(created.status_code, 201)
        invoice_id = created.data['invoice']['id']

        blockers = self.client.get(f'/api/invoices/invoices/{invoice_id}/blockers/')
        self.assertTrue(blockers.data['can_issue'])

        issued = self.client.post(f'/api/invoices/invoices/{invoice_id}/issue/')
        self.assertEqual(issued.status_code, 200)
        self.assertEqual(issued.data['invoice']['status'], 'sent')

        pdf = self.client.get(f'/api/invoices/invoices/{invoice_id}/pdf/')
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf['Content-Type'], 'application/pdf')
        self.assertTrue(pdf.content.startswith(b'%PDF'))

    def test_generate_by_period(self):
        response = self.client.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
            'period_start': '2026-08-10', 'period_end': '2026-08-16',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['invoice']['billing_mode'], 'period')

    def test_generate_needs_either_a_week_or_a_period(self):
        response = self.client.post('/api/invoices/invoices/generate/', {
            'customer_id': str(self.customer.pk),
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_the_credit_note_endpoint(self):
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user)
        response = self.client.post(
            f'/api/invoices/invoices/{invoice.pk}/credit-note/',
            {'reason': 'Billed to the wrong customer entirely.'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['credit_note']['document_type'], 'credit_note')

    def test_an_issued_invoice_cannot_be_deleted(self):
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        issue_invoice(invoice, actor=self.user)
        response = self.client.delete(f'/api/invoices/invoices/{invoice.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Invoice.objects.filter(pk=invoice.pk).exists())

    def test_other_roles_are_refused(self):
        for role in ('operations', 'employee', 'customer'):
            client = APIClient()
            client.force_authenticate(make_user(email=f'{role}@inv.test', role=role))
            response = client.get('/api/invoices/invoices/')
            self.assertEqual(response.status_code, 403, f'{role} reached invoices')


class ZeroRateTests(BillingSetup):
    """
    Work priced at nothing is reported, not billed.

    `get_service_rate` returns 0 when the customer has no configured rate for
    the service. Quietly invoicing a month of work at zero is worse than
    refusing to invoice it — the customer pays nothing and nobody notices.
    """

    def setUp(self):
        super().setUp()
        self.unpriced = make_service(name='Glasbewassing')   # no rate attached

    def test_the_preview_warns_before_anything_is_created(self):
        make_work_entry(employee=self.employee, project=self.project,
                        work_date=MONDAY, service=self.unpriced)

        client = APIClient()
        client.force_authenticate(self.user)
        response = client.post('/api/invoices/invoices/preview/', {
            'customer_id': str(self.customer.pk),
            'week_year': 2026, 'week_number': 33,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['subtotal'], Decimal('0.00'))
        self.assertEqual(response.data['warnings'][0]['code'], 'NO_RATE')
        self.assertIn('Glasbewassing', response.data['warnings'][0]['message'])
        self.assertFalse(response.data['lines'][0]['has_rate'])

    def test_a_zero_rate_line_blocks_issuing(self):
        make_work_entry(employee=self.employee, project=self.project,
                        work_date=MONDAY, service=self.unpriced)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)

        codes = [blocker['code'] for blocker in issue_blockers(invoice)]
        self.assertIn('NO_RATE', codes)
        with self.assertRaises(BillingError):
            issue_invoice(invoice, actor=self.user)

    def test_setting_the_rate_unblocks_it(self):
        entry = make_work_entry(employee=self.employee, project=self.project,
                                work_date=MONDAY, service=self.unpriced)
        attach_service_rate(self.customer, self.unpriced, Decimal('30.00'))

        from apps.worklogs.models import clear_surcharge_caches
        clear_surcharge_caches()

        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertEqual(invoice.lines.first().hourly_rate, Decimal('30.00'))
        self.assertEqual([b['code'] for b in issue_blockers(invoice)], [])

    def test_a_priced_line_is_never_flagged(self):
        self.work(0)
        invoice = generate_invoice(self.customer, week=(2026, 33), actor=self.user)
        self.assertNotIn('NO_RATE',
                         [b['code'] for b in issue_blockers(invoice)])
