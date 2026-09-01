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
| **`FlutterProTotaalService/`** | **Employee** mobile app | Flutter 3 · Provider | ~19k LOC |
| **`FlutterEmployeeProject/`** | **Customer portal** app | Flutter 3 · Provider | ~3k LOC |

> ### ⚠️ The two Flutter directory names are inverted
>
> `FlutterProTotaalService/` is the **employee** app (`pubspec name: pro_totaal_service`).
> `FlutterEmployeeProject/` is the **customer portal** (`pubspec name: ckm_customer_portal`).
>
> A rebrand from "Pro Totaal Service" to CKM Services renamed the product but not
> the folders. Check `pubspec.yaml` before editing either one.

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
cd FlutterProTotaalService            # employee app
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

### Finance
Outgoing invoices, agency invoices, incoming (supplier) payables, expenses and
income records, and an `Aangifte` Excel export for the quarterly VAT return.

### HR
Leave types and requests with overlap validation, payroll periods that build
payslips from approved work entries, and attendance derived from work entries
plus approved leave.

### Employees, on mobile
Assignments (location and time only — never the customer or the commercial
detail), shifts, worklogs with photo upload, wallet and advances, payslips,
push notifications. English, Arabic (RTL) and Russian.

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
cd FlutterProTotaalService && flutter analyze && flutter test
cd FlutterEmployeeProject && flutter analyze && flutter test
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
| [DOCUMENTATION.md](DOCUMENTATION.md) | Per-endpoint API reference |
| [DEPLOYMENT_NOTIFICATIONS.md](DEPLOYMENT_NOTIFICATIONS.md) | Cron jobs and email setup |
| `/api/docs/` | Live Swagger UI |

## Known gaps

- 211 pre-existing ESLint errors (mostly `any` and React 19's
  `set-state-in-effect`). Lint runs in CI but is non-blocking until the count
  comes down.
- The largest dashboard pages still carry their data layer inline and use inline
  styles rather than the token system.
- No frontend test runner yet; coverage is type-checking, the build, and the
  API-client guard.
