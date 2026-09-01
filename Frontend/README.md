# CKM Services — Dashboard

Back-office dashboard for the CKM Services platform. Next.js 16 (App Router),
React 19, TypeScript.

Part of a larger platform — see the [root README](../README.md) for the whole
picture.

## Running it

```bash
npm install
cp .env.example .env.local     # BACKEND_API_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
```

The Django API must be running. Next proxies `/api` and `/media` to
`BACKEND_API_URL`, so the browser only talks to one origin and there is no CORS
in development.

| Variable | Purpose |
|---|---|
| `BACKEND_API_URL` | Where Next proxies `/api` and `/media`. Server-side only. |
| `NEXT_PUBLIC_API_URL` | Leave unset. Only for calling the API on another origin directly, which then needs CORS on the backend. |

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
npm run check:api    # API-client invariants — see below
npx tsc --noEmit     # type check
```

## Layout

```
src/
├── app/
│   ├── page.tsx              public marketing page
│   ├── login/ · logout/
│   └── dashboard/            42 routes, grouped by domain
├── components/
│   ├── layout/dashboard.tsx  shell, role-filtered navigation
│   ├── ui/shared.tsx         Button, Input, DataTable, Modal, StatCard…
│   └── features/             per-domain presentational pieces
├── hooks/
│   ├── useApi.ts             THE API client — every request goes through it
│   └── use*.ts               one view-model hook per page
├── lib/
│   ├── auth.ts               tokens, JWT claims, role helpers
│   ├── api.ts                typed domain methods (delegates to useApi)
│   └── i18n.tsx              EN · AR (RTL) · UK · RU
├── styles/tokens.ts          colors, spacing, typography
└── proxy.ts                  edge guard for /dashboard (Next 16's middleware)
```

## Page shape

Thin page → view-model hook → feature components → shared UI. `dashboard/hr/*`,
`dashboard/incoming-invoices/` and `dashboard/expenses/` are the reference
examples:

```tsx
export default function ExpensesPage() {
  const vm = useExpenses();          // all state and fetching lives here
  return (
    <DashboardLayout>
      <PageHeader title="Expenses" … />
      <ExpenseTable expenses={vm.expenses} loading={vm.loading} … />
    </DashboardLayout>
  );
}
```

Several older pages are still 1,500–2,800 lines with their data layer inline and
hardcoded colors. When you touch one, extract the data layer into a hook rather
than adding to it.

## Data fetching

Import from `@/hooks/useApi`:

```ts
import {
  apiGet, apiGetAll, apiMutate, apiFetch, apiUpload, apiDownload,
} from '@/hooks/useApi';

const page = await apiGet<Paginated<Employee>>('/employees/profiles/');
const everyone = await apiGetAll<Employee>('/employees/profiles/');
await apiMutate('/hr/leave-requests/123/approve/', 'POST', { notes: 'ok' });
```

**A list needs `apiGetAll` or a pagination control — never both halves of
neither.** DRF pages at 20. A page that reads `data.results` and stops shows the
first twenty rows with no way to reach the rest; twelve pages in this dashboard
were doing exactly that, including the reports page, which was computing
earnings totals from whatever twenty work logs came back first. `apiGetAll`
follows the `next` link with a guard; a list long enough to hit that guard wants
a pagination control instead.

`apiFetch` attaches the bearer token, refreshes it transparently on a 401
(coalescing concurrent refreshes), and stores the rotated refresh token. Errors
come back as readable messages via `readApiError()`, including DRF field errors.

**Never** build an `Authorization` header by hand, and **never** read
`localStorage` for a token — use `@/lib/auth`.

`@tanstack/react-query` is wired up in `app/providers.tsx`; new hooks should
prefer `useQuery`. The existing `useFetch`/`useMutation` helpers still work.

## Money and VAT

The browser never computes either. Amounts, VAT rates, boxes and positions all
come from the backend already decided; the dashboard's job is to show them and
to say clearly when something has *not* been decided. A line whose VAT treatment
nobody has established is shown as "vast te stellen", not as 21%.

Set a customer's or a project's VAT facts through `VatSettingsPanel`
(`components/features/vat/`), which saves itself against any detail endpoint.

## Language

`@/lib/i18n` holds the tables for Dutch (the default), English, Arabic (RTL),
Ukrainian and Russian. `useLanguage()` gives `t`, `language`, `setLanguage` and
`isRTL`; the choice is stored in `localStorage` and applied to
`document.documentElement`. Add a language by adding a table and an entry in
`availableLanguages` — the settings picker is driven by that list, so it can
never offer a language with no strings.

## `npm run check:api`

Enforces two invariants a type-checker cannot see, both learned the hard way:

1. **`apiFetch` must never call itself.** A codemod once rewrote the raw `fetch`
   inside the client onto `apiFetch`; every request blew the stack, and it
   type-checked and built cleanly.
2. **Our API goes through `apiFetch`; third-party APIs use plain `fetch`.**
   `apiFetch` carries the user's token, so an external URL would leak it. The
   PDOK postcode lookup is the one legitimate plain-`fetch` caller.

Blocking in CI.

## Auth

`proxy.ts` redirects unauthenticated navigation at the edge using a
non-credential `ckm_session` cookie hint — the edge runtime cannot read
localStorage, so it cannot verify a session itself. `app/dashboard/layout.tsx`
then checks expiry and role client-side.

Both are presentation only. The API enforces permissions on every request.
