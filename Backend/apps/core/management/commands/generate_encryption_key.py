"""Generate a Fernet key for FIELD_ENCRYPTION_KEYS."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Print a new field-encryption key. Store it in .env and back it up separately.'

    def handle(self, *args, **options):
        from cryptography.fernet import Fernet

        key = Fernet.generate_key().decode()
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(key))
        self.stdout.write('')
        self.stdout.write(
            'Put this in Backend/.env as:\n'
            '    FIELD_ENCRYPTION_KEYS=' + key + '\n\n'
            'Then back the key up SOMEWHERE OTHER THAN THE DATABASE BACKUP.\n'
            'A database restored without this key cannot decrypt BSN, IBAN or\n'
            'document numbers. Storing the key alongside the dump defeats the\n'
            'purpose of encrypting at all.\n\n'
            'To rotate later, put the NEW key first and keep the old one:\n'
            '    FIELD_ENCRYPTION_KEYS=<new>,<old>\n'
            'then run:  python manage.py encrypt_sensitive_fields --rotate'
        )
