# CKM Services

Staffing and facility-services platform for the Dutch market. Employees log
hours against customer projects, back-office staff approve them, and the system
turns approved hours into customer invoices, agency invoices, payslips and
employee wallet earnings.

Locale `nl-NL`, timezone `Europe/Amsterdam`, currency EUR. The operational week
runs **Monday 06:00 → Sunday 06:00**.

---

## The four applications

| | What it is | Stack | Size |
|---|---|---|---|
| **`Backend/`** | REST API — the single source of truth | Django 6 · DRF 3.16 · Python 3.13 | ~22k LOC, 11 apps, 67 models |
| **`Frontend/`** | Back-office dashboard | Next.js 16 · React 19 · TypeScript | ~43k LOC, 42 routes |
| **`CKMServicesEmployee/`** | **Employee** mobile app | Flutter 3 · Provider | ~19k LOC |
| **`CKMServicesCustomer/`** | **Customer portal** app | Flutter 3 · Provider | ~3k LOC |

---

## Quick start

Everything is driven by environment files; nothing is hardcoded.

### Backend — http://localhost:8000

```bash
cd Backend
python3.13 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# set SECRET_KEY — required whenever DEBUG=False
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Dashboard — http://localhost:3000

```bash
cd Frontend
npm install
cp .env.example .env.local     # BACKEND_API_URL=http://localhost:8000
npm run dev
```

The dashboard proxies `/api` and `/media` to Django, so the browser only ever
talks to one origin and there is no CORS in development.

### Mobile apps

The API base URL is supplied at build time — there is no default in a release
build, on purpose.

```bash
cd CKMServicesEmployee            # employee app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api    # Android emulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api   # iOS simulator
flutter build apk --dart-define=API_BASE_URL=https://api.ckmservices.nl/api
```

### Whole stack, production-shaped

Postgres + gunicorn + Next, close to how it runs in production:

```bash
SECRET_KEY=$(openssl rand -base64 48) docker compose up --build
```

---

## What the platform does

### Operations
Employee lifecycle (invite → complete profile → submit → approve, with rate and
contract history), customers with per-service rates and surcharges, projects
with shift templates and day planning, certificates with expiry tracking.

### Time and money
`WorkEntry` is the financial core: an 11-state workflow and minute-level,
highest-surcharge-wins arithmetic that decides both what the customer is billed
and what the employee is paid. Approved hours flow into customer invoices,
agency invoices, payslips and wallet earnings.

### Billing
One service (`apps/invoices/billing.py`) turns approved work into invoices, for
a week or an arbitrary period, optionally for one project. It prices from
`WorkEntry.calculated_price` so nothing re-derives a rate, itemises every
surcharge on the line so the customer can see the working, and bills each work
entry exactly once — enforced by a database constraint as well as by the code.
Invoice numbers come from a locked sequence, never a row count.

Issuing an invoice dates it, renders a Dutch PDF with ReportLab and posts the
VAT. Issued documents are never edited: a mistake becomes a **credit note**, its
own numbered document pointing at what it corrects.

### BTW / VAT
A full quarterly VAT subsystem — classification, ledger, periods, returns,
reconciliation, filing and locking. **Nothing is guessed:** a supply whose
treatment nobody has established is held for review, kept out of the return, and
blocks the quarter from being filed. Reverse charge (verleggingsregeling) is
applied only when both conditions are established and no exception applies.

`apps/vat/returns.py` is the single return calculator; the dashboard, the
exports and the filing all call it, so they cannot disagree. See
[BTW_AANGIFTE.md](BTW_AANGIFTE.md).

### Finance reporting
Revenue net of credit notes, costs by source, aged receivables, payables
including what the company owes its own employees, and a four-sheet accountant's
workbook per quarter.

### HR
Leave types and requests with overlap validation, payroll periods that build
payslips from approved work entries, and attendance derived from work entries
plus approved leave.

### Employees, on mobile
Assignments (location and time only — never the customer or the commercial
detail), shifts, worklogs with photo upload, wallet and advances, payslips,
push notifications. **Dutch** (default), English, Arabic (RTL) and Russian.

### Customers, on mobile
Read-only view of their own projects, work entries, calendars, employee photos
and Excel exports.

---

## Architecture

```
                    ┌───────────────────────────┐
  Dashboard ────────│  Next.js  (proxies /api)  │──┐
  (browser)         └───────────────────────────┘  │
                                                   ▼
  Employee app ──────────────────────────►  ┌──────────────┐
  (Flutter, JWT)                            │  Django REST │──── PostgreSQL
                                            │     API      │     (SQLite in dev)
  Customer portal ───────────────────────►  └──────────────┘
  (Flutter, JWT)
```

Everything lives behind `/api/`, documented at **`/api/docs/`** (Swagger) with
the OpenAPI schema at `/api/schema/`.

### Authentication

```
POST /api/auth/token/  {email, password}
  → {access, refresh, user: {id, email, role, is_first_login}}
```

Access tokens carry `role`, `email` and `is_first_login`. Lifetimes come from
the environment and default to **1 hour / 30 days**. Refresh tokens rotate and
the old one is blacklisted, so **every client must store the new refresh token**
returned by `/auth/token/refresh/`. All three clients refresh transparently on a
401 and coalesce concurrent refreshes.

### Roles

| Role | Reach |
|---|---|
| `admin` | Everything |
| `finance` | Invoices, payables, expenses, payroll |
| `operations` | Employees, customers, projects, worklogs, leave, attendance |
| `employee` | Own profile, assignments, shifts, worklogs, wallet, payslips (mobile) |
| `customer` | Own projects and work entries (portal) |

Roles decide what the dashboard *renders*; the API decides what is *permitted*.
Permission classes live in `Backend/apps/core/permissions.py` — never redefine
them in a views module.

### Trailing slashes are load-bearing

`APPEND_SLASH = False`, because Next forwards paths verbatim and a Django
redirect would fight it. Every client path must match the router exactly. The
contract test in `apps/employees/tests/test_api_contract.py` pins the 34 URLs
the clients call — add to that list when a client starts using a new endpoint.

---

## Checks

```bash
# Backend
cd Backend
python manage.py check
python manage.py makemigrations --check --dry-run   # models vs migrations
python manage.py test                                # 71 tests

# Dashboard
cd Frontend
npx tsc --noEmit
npm run check:api     # API-client invariants (see below)
npm run build

# Mobile
cd CKMServicesEmployee && flutter analyze && flutter test
cd CKMServicesCustomer && flutter analyze && flutter test
```

CI runs all of this on every push — `.github/workflows/ci.yml`.

### `npm run check:api`

Enforces two invariants that a type-checker cannot see, both learned the hard
way:

1. **`apiFetch` must never call itself.** A codemod once rewrote the raw `fetch`
   inside the client onto `apiFetch`, making every request in the dashboard blow
   the stack. It type-checked and built cleanly.
2. **Our API goes through `apiFetch`; third-party APIs use plain `fetch`.**
   `apiFetch` attaches the user's bearer token, so pointing it at an external
   host would hand that token away.

---

## Conventions

### Backend
- `apps/core/models.py` provides the abstract bases: UUID PKs, timestamps, soft
  delete, audit fields.
- `SystemConfig` is a runtime singleton (`SystemConfig.objects.get_config()`) —
  SMTP, Firebase, company details and the public dashboard URL are configured in
  the dashboard, not in `.env`.
- `requirements.txt` lists **direct dependencies only**. Add a package the
  moment you import it.
- Test factories live in `apps/core/testing/`. `EmployeeProfile` has 18 required
  fields; use `make_employee()`.
- Creating an `employee`-role `User` auto-creates a placeholder
  `EmployeeProfile` via a signal. Update that row; don't create a second one.

### Frontend
Thin page → view-model hook → feature components → shared UI:

```
src/app/dashboard/expenses/page.tsx    composition only, ~68 lines
src/hooks/useExpenses.ts               state, fetching, derived values
src/components/features/expenses/…     presentational pieces
src/components/ui/shared.tsx           Button, Input, DataTable, Modal, StatCard…
src/styles/tokens.ts                   colors, spacing, typography
```

`src/app/dashboard/hr/*` and `src/app/dashboard/incoming-invoices/` are the
newest examples. Several older pages are still 1,500–2,800 lines with inline
styles; when you touch one, extract its data layer into a hook rather than
adding to it.

Import `apiFetch` / `apiGet` / `apiMutate` / `apiUpload` / `apiDownload` from
`@/hooks/useApi`. Never build an `Authorization` header by hand, and never read
`localStorage` for a token — use `@/lib/auth`.

---

## Scheduled jobs

Management commands driven by cron; there is no Celery. See
[DEPLOYMENT_NOTIFICATIONS.md](DEPLOYMENT_NOTIFICATIONS.md).

```
check_expiring_certificates    check_stale_worklogs      check_missing_worklogs
send_weekly_summary            cleanup_notifications     cleanup_deleted_records
finance_alerts                 seed_expense_categories
```

`finance_alerts` runs daily: it flags invoices whose due date has passed, and
warns about invoices that just fell overdue, supplier invoices about to fall
due, VAT filing deadlines at 21/7/2 days with the blockers named, and a Monday
summary of transactions the VAT engine could not classify.

```bash
0 7 * * *  cd Backend && venv/bin/python manage.py finance_alerts
```

## Push notifications

FCM **HTTP v1** (the legacy `fcm/send` endpoint was decommissioned in 2024 —
don't reintroduce server keys). Requires `google-services.json` /
`GoogleService-Info.plist` in the mobile apps, plus a Firebase project id and
service-account JSON under dashboard Settings. Without them the service logs and
no-ops; the apps still run.

---

## Documentation

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Architecture, conventions and gotchas — start here |
| [BTW_AANGIFTE.md](BTW_AANGIFTE.md) | How VAT is decided, and how to file a quarter |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Secrets, database, cron, backup and recovery |
| [ENCRYPTION.md](ENCRYPTION.md) | The field-encryption key: configuring, backing up, rotating |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Per-endpoint API reference |
| [DEPLOYMENT_NOTIFICATIONS.md](DEPLOYMENT_NOTIFICATIONS.md) | Cron jobs and email setup |
| `/api/docs/` | Live Swagger UI |

## Before you invoice anyone

Two things must be set, or invoicing will not work:

1. **Settings → Facturatie en bedrijfsgegevens** — the legal name, KvK number,
   BTW number and IBAN. A Dutch invoice is not valid without them, and the PDF
   prints whatever is there.
2. **The VAT treatment on each customer** (and on any project that differs).
   Until it is set, every line is held for review and no invoice can be issued.
   This is deliberate: the alternative is a system that guesses your VAT.

## Known gaps

- 211 pre-existing ESLint errors (mostly `any` and React 19's
  `set-state-in-effect`). Lint runs in CI but is non-blocking until the count
  comes down.
- The largest dashboard pages still carry their data layer inline and use inline
  styles rather than the token system. New pages follow
  page → hook → components.
- The employee app's screens are still written in English rather than reading
  from the translation table; the table, the switch and the persistence all
  work, so the remaining job is per-screen.
- No frontend test runner yet; coverage is type-checking, the build, and the
  API-client guard. The backend carries the test weight.
