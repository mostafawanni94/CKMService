"""
Set the company's legal identity on the one record that holds it.

`SystemConfig` is a singleton and the single source of truth: the invoice PDF,
the credit note, the accountant's export and the finance pages all read from it.
Nothing here is written into application code, and nothing creates a second
configuration record.

    python manage.py set_company_identity            # apply the registered values
    python manage.py set_company_identity --show     # print what is stored
    python manage.py set_company_identity --iban 'NL.. ....'   # override one value

The IBAN is stored through `EncryptedCharField`, so it is ciphertext at rest and
never appears in the public settings endpoint.
"""

from django.core.management.base import BaseCommand

# As registered with the KvK. Kept here rather than in a migration so that
# correcting a detail is a command someone runs, not a schema change.
REGISTERED = {
    'company_name': 'CKM Services',
    'company_legal_name': 'CKM Services',
    'company_address': 'Rilland Bathstraat 126',
    'company_postal_code': '3086 ST',
    'company_city': 'Rotterdam',
    'company_country': 'Netherlands',
    'company_kvk_number': '42074970',
    'company_btw_number': 'NL869591071B01',
    'company_iban': 'NL20 INGB 0119 4132 56',
}

PRIMARY_EMAIL = 'info@ckmservices.nl'

# Shown masked, because a terminal is a place people paste from.
SENSITIVE = {'company_iban'}


class Command(BaseCommand):
    help = "Set the company's legal identity on SystemConfig."

    def add_arguments(self, parser):
        parser.add_argument('--show', action='store_true',
                            help='Print what is stored and change nothing.')
        for field in REGISTERED:
            parser.add_argument(f'--{field.removeprefix("company_").replace("_", "-")}',
                                dest=field, help=f'Override {field}.')

    def handle(self, *args, **options):
        from apps.core.encryption import mask_iban
        from apps.core.models import SystemConfig

        config = SystemConfig.objects.get_config()

        if options['show']:
            for field in REGISTERED:
                value = getattr(config, field) or '(not set)'
                if field in SENSITIVE and value != '(not set)':
                    value = mask_iban(value)
                self.stdout.write(f'  {field:24} {value}')
            self.stdout.write(
                f'  {"company_emails":24} {", ".join(config.contact_emails) or "(none)"}')
            self.stdout.write(
                f'  {"company_phones":24} {", ".join(config.contact_phones) or "(none)"}')
            return

        changed = []
        for field, registered in REGISTERED.items():
            value = options.get(field) or registered
            if getattr(config, field) != value:
                setattr(config, field, value)
                changed.append(field)

        # Add the primary address without disturbing any others, and without
        # adding a second copy of one already stored under the other key.
        if PRIMARY_EMAIL not in config.contact_emails:
            config.company_emails = [
                {'label': 'Info', 'email': PRIMARY_EMAIL},
                *(config.company_emails or []),
            ]
            changed.append('company_emails')

        if not changed:
            self.stdout.write('Already up to date; nothing written.')
            return

        config.save()
        self.stdout.write(self.style.SUCCESS(
            f'Updated {len(changed)} field(s) on the single SystemConfig record: '
            f'{", ".join(changed)}.'))
        self.stdout.write(
            'The IBAN is encrypted at rest and is not exposed by '
            '/api/settings/config/public/.')
