# CKM Services — API

Django 6 + DRF REST API. The single source of truth for the platform: the
dashboard and both mobile apps are clients of this.

Part of a larger platform — see the [root README](../README.md).

## Running it

```bash
python3.13 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
# paste that into SECRET_KEY

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver          # http://localhost:8000
```

- Swagger UI — `/api/docs/`
- OpenAPI schema — `/api/schema/`
- Django admin — `/admin/`

### Configuration

`DEBUG` defaults to **off**. With `DEBUG=False`, `SECRET_KEY` and
`ALLOWED_HOSTS` are required and the process refuses to start without them —
a missing `.env` used to silently produce a debug server with a known signing
key and `ALLOWED_HOSTS = ['*']`.

| Variable | Notes |
|---|---|
| `DEBUG` | Defaults to `False` |
| `SECRET_KEY` | Required when `DEBUG=False` |
| `ALLOWED_HOSTS` | Required when `DEBUG=False`; `'*'` is rejected |
| `DATABASE_ENGINE` | `sqlite` (dev) or `postgresql` |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Needed when the dashboard is on another origin |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | Default 60 |
| `REFRESH_TOKEN_LIFETIME_DAYS` | Default 30 |

SMTP, Firebase, company details and the public dashboard URL are **not** here —
they live in `SystemConfig`, edited at runtime under dashboard Settings.

## Apps

| App | Owns |
|---|---|
| `core` | Abstract bases (UUID, timestamps, soft delete, audit), `SystemConfig`, shared permissions, pagination, test factories |
| `employees` | `User`, `EmployeeProfile`, agencies, contract and rate history, surcharge/allowance types, auth views |
| `customers` | Customers, outfolders, services, per-customer rates and surcharges, gratuities, customer portal |
| `projects` | Projects, assignments, shift templates, planned days |
| `worklogs` | `Shift`, `WorkEntry`, photos, Excel export — **the financial core** |
| `invoices` | Customer, agency and incoming invoices; pending earnings |
| `hr` | Leave types and requests, payroll periods, payslips, derived attendance |
| `expenses` | Expense categories, expenses, income records |
| `wallet` | Employee wallet, transactions, advance requests |
| `vat` | BTW treatments, ledger, quarterly periods, returns, reporting, exports |
| `certificates` | Certificate types, employee certificates, VCA |
| `notifications` | In-app, email (SMTP) and FCM push |

## Where the money is decided

`apps/worklogs/models.py` — `WorkEntry` decides both what the customer is billed
and what the employee is paid, with minute-level, highest-surcharge-wins
arithmetic:

- `calculated_hours` — worked span minus breaks, handles overnight shifts
- `get_applicable_surcharges` / `_surcharge_applies` / `_calculate_time_overlap`
- `calculated_price` — customer side, via `CustomerServiceRate`
- `calculated_employee_payment` — employee side, via `EmployeeProfile.hourly_rate`,
  and only adds surcharges when `receives_surcharges` is set
- `get_employee_hours_breakdown` — the shape payroll consumes

**Changing any of these requires a test.** See
`apps/worklogs/tests/test_calculations.py`.

`billing_week_year` / `billing_week_number` are derived in `save()`, and invoice
generation filters on them — an entry without them is invisible to invoicing.
`agency` is derived the same way, from the employee's agency assignment covering
the work date, so a transfer never re-bills history to the new agency.

### Billing — `apps/invoices/billing.py`

The only path from approved work to a customer invoice.

```
billable_entries → price_entry → generate_invoice
                 → issue_blockers → issue_invoice → create_credit_note
```

- A work entry is billed once. Enforced by a partial unique constraint on
  `InvoiceLine.work_entry`, not only by the service.
- Numbers come from `numbering.next_number`, a row locked for the transaction.
  Never `count() + 1`: that races and reuses numbers after a deletion.
- Issued documents are never edited. `create_credit_note` writes a separate
  numbered document with negative lines pointing at the original.
- Numbering survives concurrency: the sequence row is locked for the
  transaction, and the API retries a lost lock rather than failing the request.
  20 simultaneous callers get 20 distinct numbers with no gaps.
- `pdf.py` renders the invoice with everything the Wet OB requires, including
  "btw verlegd" and the customer's BTW number.

### VAT — `apps/vat/`

`returns.calculate_return` is the **only** place a return is computed. Rules:

- An unestablished treatment is `REQUIRES_REVIEW` — never 21%, never 0%.
- The period follows the invoice date (factuurstelsel), never the payment.
- There is no rubriek 5g; `FORBIDDEN_BOX_CODES` enforces it.
- Filing snapshots the figures and locks the entries. Corrections are new
  offsetting entries in an open period.

See [../BTW_AANGIFTE.md](../BTW_AANGIFTE.md).

### The wallet — `apps/wallet/services.py`

Every movement is keyed on what caused it — a work entry, a payslip, an expense
— so approval, payroll and the backfill command can all be re-run without paying
anyone twice. A partial unique constraint enforces it in the database too.

## Permissions

All permission classes live in `apps/core/permissions.py`. Never redefine them
in a views module.

| Class | Roles |
|---|---|
| `IsAdmin` | `admin` |
| `IsFinanceStaff` | `admin`, `finance` |
| `IsOperationsStaff` | `admin`, `operations` |
| `IsBackOffice` | `admin`, `finance`, `operations` |
| `IsEmployee` | `employee` |
| `IsCustomerUser` | `customer` **and** linked to a Customer |
| `IsAdminOrSelf` | object-level: admin, or the owner |

## API surface

```
/api/auth/          token/ · token/refresh/ · token/verify/
                    password-change/ · password-reset/ · password-reset/confirm/
/api/employees/     users · profiles · agencies · contract-types · document-types
                    surcharge-types · allowance-types · wallets · customer-users
                    profiles/me/ · profiles/upload_document/
                    profiles/my_assignments/ · profiles/contracts/
/api/customers/     customers · outfolders · services · gratuities · worklog-customers
/api/projects/      projects · assignments · shift-templates · planned-days
/api/worklogs/      entries · shifts · export/customer/   (bare "" aliases entries)
/api/invoices/      invoices · agency-invoices · incoming-invoices
                    cost-types · rates · pending-earnings
/api/hr/            leave-types · leave-requests · payroll-periods · payslips · attendance
/api/expenses/      categories · expenses · income
/api/wallet/        wallets · advances
/api/certificates/  types · employee-certificates
/api/notifications/ notifications · preferences · devices/register|unregister
/api/settings/      config/ · config/public/
/api/customer-portal/ profile/ · projects/ · projects/<id>/{entries,calendar,export}
```

Note the doubled segment: the notifications router is registered *under* the
`/api/notifications/` prefix, so the list endpoint is
`/api/notifications/notifications/`.

### Trailing slashes are load-bearing

`APPEND_SLASH = False`, because the Next.js proxy forwards paths verbatim and a
Django redirect would fight it. Client paths must match the router exactly.
`apps/employees/tests/test_api_contract.py` pins the 34 URLs the clients call —
extend that list when a client starts using a new endpoint.

## Tests

```bash
python manage.py test                            # the whole suite
python manage.py test apps.worklogs              # the money maths
python manage.py test apps.invoices              # billing, PDFs, credit notes
python manage.py test apps.vat                   # classification, returns, filing
python manage.py test apps.wallet                # employee money
python manage.py test apps.hr                    # payroll and leave

python manage.py test apps.core.tests.test_end_to_end    # the whole cycle
python manage.py test apps.core.tests.test_security      # access and encryption
python manage.py test apps.core.tests.test_performance   # query-count guards
python manage.py test apps.core.tests.test_schema        # schema invariants
```

The `test_schema` module holds the invariants a financial database has to keep:
no money stored as a float, every foreign key indexed, every model ordered,
financial relations `PROTECT` rather than `CASCADE`, and no model changed
without a migration.

Factories live in `apps/core/testing/` — `make_employee`, `make_work_entry`,
`make_customer`, `attach_service_rate`, `attach_customer_surcharge`.
`EmployeeProfile` has 18 required fields; use the factory.

Creating an `employee`-role `User` auto-creates a placeholder `EmployeeProfile`
via a `post_save` signal. Update that row rather than creating a second one.

## Dependencies

`requirements.txt` lists **direct dependencies only** — pip resolves the rest.
Mirroring `pip freeze` let the list drift, and hid the fact that `openpyxl`,
`reportlab`, `PyPDF2` and `requests` were imported but never declared, so a
clean install crashed. Add a package the moment you import it.

There is no Celery. Scheduled work is management commands driven by cron — see
[DEPLOYMENT_NOTIFICATIONS.md](../DEPLOYMENT_NOTIFICATIONS.md).

```
check_expiring_certificates    check_stale_worklogs      check_missing_worklogs
send_weekly_summary            cleanup_notifications     cleanup_deleted_records
fix_invalid_breaks             sync_worklog_times        sync_workentries_to_planning
```

## Deployment

```bash
# from the repo root
SECRET_KEY=$(openssl rand -base64 48) docker compose up --build
```

Runs Postgres + gunicorn + Next, applying migrations and collecting static on
start. `Backend/Dockerfile` builds the API image on its own if you deploy the
pieces separately.
