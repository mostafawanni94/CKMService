"""
Encrypt sensitive fields that are still stored as plaintext, and re-encrypt
under a new key during rotation.

Deliberately a management command rather than a data migration:

* it can be dry-run and inspected before it touches anything;
* it is resumable — a row already encrypted is skipped, so an interrupted run
  is simply re-run;
* it needs the encryption key, and a migration that silently no-ops without one
  would leave half a table in clear text.

No sensitive value is ever written to stdout or the log. Only counts are
reported.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from apps.core.encryption import PREFIX, decrypt, encrypt, is_encrypted

# (app_label, model, [field, ...])
TARGETS = [
    ('employees', 'EmployeeProfile',
     ['bsn', 'document_number', 'iban', 'drivers_license_number']),
    ('employees', 'Agency', ['iban']),
    ('customers', 'Customer', ['iban', 'g_rekening']),
]


class Command(BaseCommand):
    help = 'Encrypt plaintext sensitive fields, or re-encrypt them under a new key.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change; write nothing.')
        parser.add_argument('--rotate', action='store_true',
                            help='Re-encrypt already-encrypted values under the '
                                 'first key in FIELD_ENCRYPTION_KEYS.')
        parser.add_argument('--verify', action='store_true',
                            help='Only check that every stored value decrypts.')

    def handle(self, *args, **options):
        from django.apps import apps as dj

        dry_run = options['dry_run']
        rotate = options['rotate']
        verify_only = options['verify']

        # Fail before touching anything if the key is unusable.
        try:
            encrypt('probe')
        except Exception as exc:
            raise CommandError(f'Encryption is not usable: {exc}')

        totals = {'encrypted': 0, 'rotated': 0, 'already': 0, 'blank': 0, 'failed': 0}

        # Read and write the raw columns with SQL. Going through the ORM would
        # run the field's own from_db_value/get_prep_value, which decrypts on
        # read and encrypts on write — so the command could never see what is
        # actually stored, and could not tell plaintext from ciphertext.
        for app_label, model_name, fields in TARGETS:
            Model = dj.get_model(app_label, model_name)
            table = Model._meta.db_table
            pk_col = Model._meta.pk.column
            columns = {f: Model._meta.get_field(f).column for f in fields}
            col_list = ', '.join(columns[f] for f in fields)

            with connection.cursor() as cursor:
                cursor.execute(f'SELECT {pk_col}, {col_list} FROM {table}')
                rows = cursor.fetchall()

            for row in rows:
                pk, values = row[0], row[1:]
                changes = {}

                for field, stored in zip(fields, values):
                    column = columns[field]

                    if stored is None or stored == '':
                        totals['blank'] += 1
                        continue

                    if is_encrypted(stored):
                        try:
                            plain = decrypt(stored)
                        except Exception:
                            totals['failed'] += 1
                            self.stderr.write(self.style.ERROR(
                                f'  cannot decrypt {model_name}.{field} pk={pk}'))
                            continue
                        if rotate:
                            changes[column] = (encrypt(plain), plain)
                            totals['rotated'] += 1
                        else:
                            totals['already'] += 1
                        continue

                    # Legacy plaintext.
                    if verify_only:
                        totals['failed'] += 1
                        self.stderr.write(self.style.WARNING(
                            f'  still plaintext: {model_name}.{field} pk={pk}'))
                        continue
                    changes[column] = (encrypt(stored), stored)
                    totals['encrypted'] += 1

                if not changes or dry_run or verify_only:
                    continue

                with transaction.atomic():
                    assignments = ', '.join(f'{c} = %s' for c in changes)
                    params = [ciphertext for ciphertext, _ in changes.values()] + [pk]
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f'UPDATE {table} SET {assignments} WHERE {pk_col} = %s', params)

                    # Read the stored bytes straight back and confirm they
                    # decrypt to exactly what was there before. A row that fails
                    # aborts the whole command inside its transaction, so the
                    # original value is rolled back rather than left unreadable.
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f'SELECT {", ".join(changes)} FROM {table} WHERE {pk_col} = %s',
                            [pk])
                        written = cursor.fetchone()

                    for (column, (_, original)), value in zip(changes.items(), written):
                        if not is_encrypted(value) or decrypt(value) != original:
                            raise CommandError(
                                f'Verification failed for {model_name}.{column} '
                                f'pk={pk}. The change was rolled back.'
                            )

        verb = 'Would encrypt' if dry_run else 'Encrypted'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} {totals["encrypted"]}, rotated {totals["rotated"]}, '
            f'already encrypted {totals["already"]}, blank {totals["blank"]}, '
            f'failed {totals["failed"]}.'
        ))
        if totals['failed']:
            raise CommandError('Some values could not be processed. See above.')
