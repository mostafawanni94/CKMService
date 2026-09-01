# Field-Level Encryption — Key Management

BSN, IBAN, identity-document numbers and driving-licence numbers are encrypted
at rest. This document is the operational runbook for the key.

> **The encryption key must be backed up separately from the database.**
> A database restored without the matching key cannot decrypt these fields.
> Storing the key inside the same backup defeats the purpose of encrypting.

## What is encrypted

| Model | Fields |
|---|---|
| `employees.EmployeeProfile` | `bsn`, `iban`, `document_number`, `drivers_license_number` |
| `employees.Agency` | `iban` |
| `customers.Customer` | `iban`, `g_rekening` |

`btw_number` and `kvk_number` are deliberately **not** encrypted: they are
publicly registered business identifiers and are printed on invoices.

## Mechanism

Fernet (AES-128-CBC + HMAC-SHA256) via `MultiFernet`, from the `cryptography`
package. Encryption is **randomised**, not deterministic — the same IBAN stored
twice produces different ciphertext. None of these fields is searched, filtered,
ordered or unique anywhere in the codebase, so no weaker deterministic scheme is
needed.

Ciphertext is stored with an `enc$v1$` prefix so a partially migrated table can
be read without guessing.

## Initial setup

```bash
cd Backend
python manage.py generate_encryption_key
```

Put the printed key in `Backend/.env`:

```
FIELD_ENCRYPTION_KEYS=<key>
```

`.env` is gitignored — verified. The key is never written to the database, the
source tree, or the logs.

Then encrypt any existing plaintext:

```bash
python manage.py encrypt_sensitive_fields --dry-run   # inspect first
python manage.py encrypt_sensitive_fields             # apply
python manage.py encrypt_sensitive_fields --verify    # confirm
```

The command is resumable and idempotent: rows already encrypted are skipped, and
each write is read straight back and verified inside its transaction. A row that
fails verification rolls back and aborts the run rather than leaving unreadable
data.

## Backup

Two separate backups, in two separate places:

1. **Database** — your normal dump.
2. **Key** — a password manager, a sealed envelope, or a secrets manager.

If both live in the same place, an attacker who obtains the backup obtains the
plaintext, and encryption has bought you nothing.

## Restore

1. Restore the database.
2. Set `FIELD_ENCRYPTION_KEYS` to the key that was in use when the dump was taken.
3. `python manage.py encrypt_sensitive_fields --verify`

If verify reports failures, the key does not match the data. **Do not re-run the
encrypt command** — encrypting again over unreadable values destroys the
originals. Find the correct key.

## Rotation

`FIELD_ENCRYPTION_KEYS` is a comma-separated list. The **first** key encrypts;
**all** of them decrypt.

```bash
# 1. generate the new key
python manage.py generate_encryption_key

# 2. put it FIRST, keep the old one
FIELD_ENCRYPTION_KEYS=<new>,<old>

# 3. re-encrypt everything under the new key
python manage.py encrypt_sensitive_fields --rotate
python manage.py encrypt_sensitive_fields --verify

# 4. only now drop the old key
FIELD_ENCRYPTION_KEYS=<new>
```

Keep the old key until step 4 has been verified. Removing it early makes
anything not yet rotated unreadable.

## Failure behaviour

- **Key missing, `DEBUG=False`** — the process refuses to start. It never
  generates a key automatically: a fresh key would silently make all existing
  encrypted data permanently unreadable.
- **Key present but malformed** — `ImproperlyConfigured`, without the key in the
  message.
- **Wrong key for a stored value** — raises rather than returning the raw
  ciphertext, so a key-management failure is loud instead of leaking tokens into
  the UI.

## API exposure

Encryption protects the database, not the API. `MaskedSensitiveFieldsMixin`
masks these fields on output unless the reader is entitled:

| Reader | Sees |
|---|---|
| `admin`, `finance` | Full values — payroll and payment need the real IBAN |
| The employee themselves | Their own full values |
| `operations`, everyone else | `*********` / `NL91 **** **** **** 00` |

Masking is output-only, so it can never be written back into the model.
