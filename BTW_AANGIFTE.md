# BTW / VAT — how it works and how to file

CKMcleaning VOF files **quarterly**, on the **factuurstelsel**: a transaction
belongs to the quarter of its *invoice date*, never its payment date.

## The one rule everything else follows

**Nothing is guessed.** A transaction whose VAT treatment nobody has established
is recorded as `REQUIRES_REVIEW`. It stays out of the return, it blocks the
quarter from being filed, and it appears on the work list until someone states
the facts. An unknown treatment is never quietly turned into 21%, into 0%, or
into "exempt".

## The rubrieken

The return has thirteen boxes: 1a, 1b, 1c, 1d, 1e, 2a, 3a, 3b, 3c, 4a, 4b, 5a
and 5b. **There is no rubriek 5g** — an older Excel export used "5g" as a label
for "af te dragen / terug te vragen", which is a total, not a box. The code
refuses to emit it (`FORBIDDEN_BOX_CODES` in `apps/vat/constants.py`).

- **5a** = VAT owed: output VAT plus reverse-charge VAT you declare yourself
- **5b** = deductible input VAT (voorbelasting)
- The position is 5a − 5b. Positive means payable, negative refundable.

## Verleggingsregeling (domestic reverse charge)

Cleaning is a covered sector. When CKM **lends staff or subcontracts** for
**physical work on immovable property**, the VAT shifts to the customer:

- CKM's own invoice shows no VAT and states **"Btw verlegd"** with the
  customer's BTW number → **rubriek 1e**
- An agency lending workers to CKM invoices the same way; CKM then declares the
  VAT in **2a** and, if deductible, claims it in **5b**

Both conditions must be established before the engine will apply it. If either
is unstated, the line is held for review — it is *not* zero-rated on a guess.

### The exceptions that switch it back off

Reverse charge does **not** apply when:

1. the majority of the work is done in the supplier's own workshop
2. the worker is lent to a subcontractor working on their own premises
3. the service is ancillary to goods being sold
4. the work is design work
5. the work is guarding or rental

Each is a field on the document, the project or the customer. Setting any of
them to true takes the supply out of the scheme.

## Where the facts live

Most specific wins, and a fact set nowhere stays unset:

```
Invoice / IncomingInvoice / AgencyInvoice / Expense   ← most specific
  → Project
    → Customer / Agency / ExpenseCategory             ← the default posture
```

Set them in the dashboard on the customer or the project. A customer whose work
is always ordinary cleaning gets `NORMAL`; a project that is always lent labour
on a building site gets `REVERSE_CHARGE` plus the two facts.

## Filing a quarter

1. **Dashboard → Finance → BTW Aangifte**, pick the year and the quarter.
2. Clear the blockers. Every unresolved transaction is listed with the reason
   the engine could not decide it. Fix the source document, not the ledger.
3. When "Nothing is unresolved" appears, press **Finalize**. The figures are
   snapshotted, every ledger entry behind them is locked, and the event is
   recorded against your name.
4. **Export** the workbook for the accountant: the return, every transaction
   behind every box, anything still to be established, and the quarter's
   documents.
5. File with the Belastingdienst using the figures from the snapshot.
6. **Lock** the period once it has been filed. A locked period cannot be
   reopened; corrections go to an open period.

Deadlines: normally the last day of the month after the quarter (Q3 → 31
October). The system warns at 21, 7 and 2 days, naming what is still blocking.

## Corrections

A filed return is never edited.

- **Before filing** — fix the source document and recalculate.
- **After filing, not yet locked** — an admin can reopen with a written reason.
  The filed snapshot is kept; the reopening is audited.
- **After locking** — post a correction into an open period. It is a new ledger
  entry carrying the offsetting amounts and a reference to what it corrects.
  The original is never modified or deleted, and both are visible.

An invoice already sent to a customer is corrected the same way: with a
**credit note**, its own numbered document, never by editing the invoice.

## What needs your accountant's confirmation

The engine encodes the published rules. These are judgement calls it will not
make for you:

- **Deductibility of a mixed-use purchase.** A phone, a car, a meal. The system
  holds the input VAT until you state a percentage, because assuming 100%
  overstates your voorbelasting.
- **Whether a specific job is "physical work on immovable property".** Cleaning
  an office is; consultancy about cleaning is not. The engine asks; it does not
  decide.
- **Invoice F2026-009** (Smaak voor Groen, EUR 175 + EUR 36.75 = EUR 211.75,
  described as "Organisatiewerkzaamheden"): a worker lent to a gardening
  business — also a covered sector — billed at 21%. If that supply was lent
  labour for physical work, it should have been reverse charged. It has been
  left exactly as issued and is flagged for your accountant to confirm. Nothing
  has been changed automatically.
- **Any historical invoice issued before this system.** Numbers were adopted so
  new ones cannot collide, but their VAT treatment was not reclassified.

## Where the code is

| File | What it decides |
|---|---|
| `apps/vat/constants.py` | The thirteen boxes, treatment codes, rules version |
| `apps/vat/classification.py` | Whether reverse charge applies, and the exceptions |
| `apps/vat/ledger.py` | Idempotent posting, keyed on source identity |
| `apps/vat/posting.py` | Reading each document type into the ledger |
| `apps/vat/returns.py` | **The single return calculator.** Nothing else computes VAT |
| `apps/vat/reconciliation.py` | Six checks run before a quarter can be filed |
| `apps/vat/corrections.py` | Offsetting entries after a period is closed |
| `apps/vat/reporting.py` | The finance dashboard, built from the same records |
| `apps/vat/exports.py` | The accountant's workbook |

Rules version: **2026.1**. Every filed snapshot records the version it was
calculated under, so a later rule change cannot silently restate a filed return.
