# CKM Services — Platform Guide

Dutch staffing / facility-services platform. Employees log hours against
customer projects, back-office staff approve them, and the system turns approved
hours into customer invoices, agency invoices, payslips and employee wallet
earnings.

Locale is `nl-nl`, timezone `Europe/Amsterdam`, currency EUR. The operational
week runs **Monday 06:00 → Sunday 06:00**.

---

## ⚠️ Read this first: the Flutter directory names are inverted

| Directory | What it actually is | pubspec `name` |
|---|---|---|
| `FlutterProTotaalService/` | **Employee mobile app** (~19k LOC) | `pro_totaal_service` |
| `FlutterEmployeeProject/` | **Customer portal app** (~3k LOC) | `ckm_customer_portal` |

A rebrand from "Pro Totaal Service" to CKM Services (commit `71bcdcc`) renamed
the product but not the folders. Always confirm via `pubspec.yaml` before
editing. When someone says "the employee app" they mean
`FlutterProTotaalService/`.

---

## Layout

```
Backend/                  Django 6 + DRF — the single source of truth
Frontend/                 Next.js 16 + React 19 admin dashboard
FlutterProTotaalService/  Employee mobile app
FlutterEmployeeProject/   Customer portal app
docker-compose.yml        Postgres + gunicorn + Next, production-shaped
.github/workflows/ci.yml  Backend tests, frontend build, Flutter analyze
```

## Running it

```bash
# Backend  (http://localhost:8000)
cd Backend
cp .env.example .env          # then set SECRET_KEY
source venv/bin/activate
python manage.py migrate
python manage.py runserver

# Frontend (http://localhost:3000) — proxies /api to the backend
cd Frontend
cp .env.example .env.local
npm install && npm run dev

# Mobile — base URL must be supplied at build time
cd FlutterProTotaalService
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api   # Android emulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api  # iOS simulator
```

```bash
# Whole stack, production-shaped
SECRET_KEY=$(openssl rand -base64 48) docker compose up --build
```

## Checks

```bash
cd Backend   && python manage.py check && python manage.py makemigrations --check --dry-run && python manage.py test
cd Frontend  && npx tsc --noEmit && npm run build
cd FlutterProTotaalService && flutter analyze && flutter test
```

---

## Backend

Ten apps under `Backend/apps/`:

| App | Owns |
|---|---|
| `core` | Abstract base models (UUID, timestamps, soft delete, audit), `SystemConfig`, **shared permission classes**, test factories |
| `employees` | `User`, `EmployeeProfile`, agencies, contract & rate history, surcharge/allowance types, auth views |
| `customers` | Customers, outfolders, services, per-customer rates and surcharges, gratuities, customer portal |
| `projects` | Projects, assignments, shift templates, planned days |
| `worklogs` | `Shift`, `WorkEntry`, photos, Excel export — **the financial core** |
| `invoices` | Customer invoices, agency invoices, incoming (supplier) invoices, pending earnings |
| `hr` | Leave types & requests, payroll periods, payslips, derived attendance |
| `expenses` | Expense categories, expenses, income records |
| `wallet` | Employee wallet, transactions, advance requests |
| `certificates` | Certificate types, employee certificates, VCA |
| `notifications` | In-app notifications, email (SMTP), FCM push, preferences |

### Permissions

All permission classes live in **`apps/core/permissions.py`** — never redefine
them in a views module.

| Class | Roles |
|---|---|
| `IsAdmin` | `admin` |
| `IsFinanceStaff` | `admin`, `finance` |
| `IsOperationsStaff` | `admin`, `operations` |
| `IsBackOffice` | `admin`, `finance`, `operations` |
| `IsEmployee` | `employee` |
| `IsCustomerUser` | `customer` **and** linked to a Customer |
| `IsAdminOrSelf` | object-level: admin, or the owner |

### Money lives in `WorkEntry`

`apps/worklogs/models.py` decides what a customer is billed and what an employee
is paid, with minute-level, highest-surcharge-wins arithmetic:

- `calculated_hours` — worked span minus breaks, handles overnight shifts
- `get_applicable_surcharges` / `_surcharge_applies` / `_calculate_time_overlap`
- `calculated_price` — customer side, uses `CustomerServiceRate`
- `calculated_employee_payment` — employee side, uses `EmployeeProfile.hourly_rate`,
  and only adds surcharges when `receives_surcharges` is set
- `get_employee_hours_breakdown` — the shape payroll consumes

**Changing any of these requires a test.** See
`apps/worklogs/tests/test_calculations.py`.

`billing_week_year` / `billing_week_number` are derived in `save()` and invoice
generation filters on them — an entry without them is invisible to invoicing.

---

## API

Everything under `/api/`, JWT via SimpleJWT, one `DefaultRouter` per app.
OpenAPI schema at `/api/schema/`, Swagger at `/api/docs/`.

```
/api/auth/          token/ · token/refresh/ · token/verify/
                    password-change/ · password-reset/ · password-reset/confirm/
/api/employees/     users · profiles · agencies · contract-types · document-types
                    surcharge-types · allowance-types · wallets · customer-users
                    profiles/me/ · profiles/upload_document/ · profiles/my_assignments/
                    profiles/contracts/
/api/customers/     customers · outfolders · services · gratuities · worklog-customers
/api/projects/      projects · assignments · shift-templates · planned-days
/api/worklogs/      entries · shifts · export/customer/   (bare "" aliases entries)
/api/invoices/      invoices · agency-invoices · incoming-invoices
                    cost-types · rates · pending-earnings
/api/hr/            leave-types · leave-requests · payroll-periods · payslips · attendance
/api/expenses/      categories · expenses · income
/api/wallet/        wallets · advances
/api/certificates/  types · employee-certificates
/api/notifications/ notifications · preferences · devices
/api/settings/      config/ · config/public/
/api/customer-portal/ profile/ · projects/ · projects/<id>/{entries,calendar,export}
```

### Trailing slashes are load-bearing

`APPEND_SLASH = False`, because Next.js proxies paths verbatim and a Django
redirect would fight it. **Every client path must match the router exactly**,
trailing slash included. Contract tests in
`apps/employees/tests/test_api_contract.py` pin the paths the mobile apps call —
add to that list when a client starts calling a new endpoint.

Note the doubled segment: the notifications router is registered *under* the
`/api/notifications/` prefix, so the list endpoint is
`/api/notifications/notifications/`.

---

## Authentication

```
POST /api/auth/token/  {email, password}
  → {access, refresh, user: {id, email, role, is_first_login}}
```

The access token carries `role`, `email` and `is_first_login` claims
(`CKMTokenObtainPairSerializer`). Lifetimes come from the environment and
default to 1 hour / 30 days. Refresh tokens **rotate and the old one is
blacklisted** (`token_blacklist` is installed), so every client must store the
new refresh token that comes back from `/auth/token/refresh/`.

All three clients refresh transparently on a 401 and coalesce concurrent
refreshes:

| Client | Storage | Entry point |
|---|---|---|
| Dashboard | `localStorage` via `src/lib/auth.ts` | `apiFetch` in `src/hooks/useApi.ts` |
| Employee app | `flutter_secure_storage` | `ApiClient._withRefresh` |
| Customer portal | `flutter_secure_storage` | `ApiClient._authenticatedRequest` |

Roles decide what the dashboard *renders*; the API decides what is *permitted*.
Never rely on the client for authorization.

---

## Frontend conventions

**One API client.** Import `apiFetch` / `apiGet` / `apiMutate` / `apiUpload` /
`apiDownload` from `@/hooks/useApi`. Never call `fetch` with a hand-built
`Authorization` header, and never read `localStorage` for a token — use
`@/lib/auth`.

**Page shape.** Thin page → view-model hook → feature components → shared UI:

```
src/app/dashboard/expenses/page.tsx      ~68 lines, composition only
src/hooks/useExpenses.ts                 state, fetching, derived values
src/components/features/expenses/…       presentational pieces
src/components/ui/shared.tsx             Button, Input, DataTable, Modal, StatCard…
src/styles/tokens.ts                     colors, spacing, typography
```

`src/app/dashboard/hr/*` and `src/app/dashboard/incoming-invoices/` are the
newest examples of this shape. Several older pages are still 1,500–2,800 lines
with inline styles; when you touch one, extract its data layer into a hook
rather than adding to it.

`@tanstack/react-query` is wired up in `src/app/providers.tsx`. New hooks should
prefer `useQuery`; the existing `useFetch`/`useMutation` helpers still work.

`src/proxy.ts` (Next 16's renamed middleware) redirects unauthenticated
navigation using a non-credential `ckm_session` cookie hint.

---

## Gotchas

- `SystemConfig` is a runtime singleton (`SystemConfig.objects.get_config()`) —
  SMTP, Firebase, company details and `frontend_url` are configured in the dashboard,
  not in `.env`.
- Creating an `employee`-role `User` auto-creates a placeholder
  `EmployeeProfile` via a `post_save` signal. Update that row; do not create a
  second one.
- Push notifications need `google-services.json` / `GoogleService-Info.plist`
  plus a Firebase project id and service-account JSON in Settings. Without them
  `FcmService.initialize()` logs and no-ops — the app still runs.
- FCM uses the **HTTP v1** API. The legacy `fcm/send` endpoint was shut down in
  2024; do not reintroduce server keys.
- Scheduled jobs are management commands driven by cron — see
  `DEPLOYMENT_NOTIFICATIONS.md`. There is no Celery, despite what old
  requirements pins suggested.
- `Backend/requirements.txt` lists **direct dependencies only**. Add a package
  there the moment you import it.

## Testing

Factories live in `apps/core/testing/` — `make_employee`, `make_work_entry`,
`make_customer`, `attach_service_rate`, `attach_customer_surcharge` and friends.
`EmployeeProfile` has 18 required fields; use the factory.

```bash
python manage.py test                      # everything
python manage.py test apps.worklogs        # the money paths
python manage.py test apps.hr              # payroll and leave
```
