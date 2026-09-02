# Deployment

What has to be true before this system handles real money.

## 1. Secrets — never in Git, never in the database

Three values must come from the environment, and the backend refuses to start
without them when `DEBUG` is off:

```bash
SECRET_KEY=...                 # python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
FIELD_ENCRYPTION_KEYS=...      # python manage.py generate_encryption_key
ALLOWED_HOSTS=api.ckmservices.nl
```

**Back the encryption key up separately from the database.** A dump restored
without it cannot decrypt BSN, IBAN or document numbers — the data is not
recoverable by any other means. See [Backend/ENCRYPTION.md](Backend/ENCRYPTION.md)
for rotation.

Keep `.env` outside the repository. `apps/core/tests/test_deployment.py` fails
if a key is ever written into `settings.py` or a `.env` becomes tracked.

## 2. Database

PostgreSQL in production:

```bash
DATABASE_ENGINE=postgresql
POSTGRES_DB=ckmservices
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_HOST=...
```

SQLite is for development only. The invoice-numbering sequence relies on
`SELECT FOR UPDATE`, which PostgreSQL implements properly; SQLite serialises
writers with a database lock and the billing service retries around it.

```bash
python manage.py migrate
python manage.py makemigrations --check --dry-run   # must report no changes
```

## 3. Before the first invoice

Two things must be configured or invoicing will refuse to proceed. That refusal
is deliberate — the alternative is a system that guesses.

1. **Settings → Facturatie en bedrijfsgegevens** — legal name, KvK number, BTW
   number, IBAN, postcode, city, payment terms. A Dutch invoice is not valid
   without them and the PDF prints exactly what is there.
2. **A VAT treatment on every customer**, and on any project that differs. Until
   it is set, every line is held for review and no invoice can be issued.

```bash
python manage.py seed_expense_categories      # idempotent
python manage.py createsuperuser
```

## 4. Scheduled jobs

Cron, not Celery.

```cron
0  7 * * *  cd /srv/ckm/Backend && venv/bin/python manage.py finance_alerts
0  8 * * *  cd /srv/ckm/Backend && venv/bin/python manage.py check_expiring_certificates
0  9 * * 1  cd /srv/ckm/Backend && venv/bin/python manage.py send_weekly_summary
30 2 * * *  cd /srv/ckm/Backend && venv/bin/python manage.py cleanup_notifications
0  3 * * 0  cd /srv/ckm/Backend && venv/bin/python manage.py prune_orphan_media   # reports only
```

`finance_alerts` flags overdue invoices and warns about VAT deadlines at 21, 7
and 2 days with the blockers named. `prune_orphan_media` never deletes unless
given `--delete`.

## 5. Media and documents

Uploaded documents are **not** public files. They are served through
`apps/core/media.py`, which signs a URL with a 30-minute expiry; an unsigned or
forged path gets a 403, and traversal gets a 404.

Media lives on disk under `MEDIA_ROOT`. Back it up with the database — an
invoice PDF is the customer's copy and a contract is evidence.

## 6. Backup and recovery

Three things, and all three are needed together:

| | Why |
|---|---|
| The database | Every record |
| `MEDIA_ROOT` | Issued invoices, contracts, ID documents, work photos |
| `FIELD_ENCRYPTION_KEYS` | Without it the encrypted fields in a restored dump are unreadable |

Store the key somewhere the database backup is not. A backup that contains both
is a single point of compromise.

To verify a restore actually works:

```bash
python manage.py shell -c "
from apps.employees.models import EmployeeProfile
row = EmployeeProfile.objects.exclude(bsn='').first()
print('decrypts:', bool(row and row.bsn))"
```

If that prints `False` on a restored database, the key does not match the data.
**Stop and find the right key before anyone writes to the system.**

## 7. Filed VAT periods

A finalized period is snapshotted and its ledger entries are locked. Do not
restore a partial backup over a filed quarter: the snapshot is what was
submitted to the Belastingdienst, and it must keep matching what was filed.

Corrections after filing go to an open period as new offsetting entries. See
[BTW_AANGIFTE.md](BTW_AANGIFTE.md).

## 8. Checks before going live

```bash
cd Backend
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py test

cd ../Frontend
npx tsc --noEmit && npm run check:api && npm test && npm run build

cd ../CKMServicesEmployee  && flutter analyze && flutter test
cd ../CKMServicesCustomer  && flutter analyze
```

## 9. Push notifications

FCM **HTTP v1** with a service account. Needs `google-services.json` /
`GoogleService-Info.plist` in the mobile apps, plus a Firebase project id and
service-account JSON in Settings. Without them the service logs and no-ops; the
apps still run. Do not reintroduce legacy server keys — that endpoint was shut
down in 2024.
