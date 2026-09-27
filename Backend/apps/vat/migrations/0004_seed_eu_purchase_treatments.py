"""Treatments for buying goods and services from abroad.

The seeded REVERSE_CHARGE covers the domestic verleggingsregeling: work you
supply to a Dutch customer, output in rubriek 1e. It is the wrong instrument
for a purchase. When an EU supplier invoices this company at 0% and says the
buyer accounts for the VAT — LinkedIn Ireland, Google, Microsoft — the
acquisition belongs in rubriek 4b, and a supplier outside the EU in 4a.

Both work the same way: the company owes the Dutch rate on the net amount and,
being entitled to deduct it, reclaims the same amount in 5b. The declaration
nets to nil while the acquisition still appears in the right rubriek, which is
what the Belastingdienst asks for.
"""

from datetime import date
from decimal import Decimal

from django.db import migrations

TREATMENTS = [
    {
        'code': 'EU_ACQUISITION',
        'name': 'Purchase from within the EU (verlegd naar u) 21%',
        'description': (
            'Goods or services bought from a supplier in another EU country '
            'who charged 0% because the buyer accounts for the VAT. Declared '
            'in rubriek 4b and deducted in 5b.'
        ),
        'output_box': '4b',
        'rate': Decimal('21.00'),
    },
    {
        'code': 'IMPORT_ACQUISITION',
        'name': 'Purchase from outside the EU (verlegd naar u) 21%',
        'description': (
            'Goods or services bought from a supplier outside the EU where the '
            'VAT is accounted for by the buyer. Declared in rubriek 4a and '
            'deducted in 5b.'
        ),
        'output_box': '4a',
        'rate': Decimal('21.00'),
    },
]


def seed(apps, schema_editor):
    VatTreatment = apps.get_model('vat', 'VatTreatment')
    VatReturnBox = apps.get_model('vat', 'VatReturnBox')

    voorbelasting = VatReturnBox.objects.get(code='5b')
    for row in TREATMENTS:
        VatTreatment.objects.get_or_create(
            code=row['code'],
            rate=row['rate'],
            defaults={
                'name': row['name'],
                'description': row['description'],
                'output_box': VatReturnBox.objects.get(code=row['output_box']),
                'input_box': voorbelasting,
                'creates_output_vat': True,
                'creates_input_vat': True,
                'is_reverse_charge': True,
                'default_deductible_percentage': Decimal('100.00'),
                'requires_review': False,
                # Matches the seeded treatments, which all start here.
                'effective_from': date(2020, 1, 1),
                'is_active': True,
            },
        )


def unseed(apps, schema_editor):
    VatTreatment = apps.get_model('vat', 'VatTreatment')
    VatTreatment.objects.filter(
        code__in=[r['code'] for r in TREATMENTS]).delete()


class Migration(migrations.Migration):

    dependencies = [('vat', '0003_period_lifecycle')]

    operations = [migrations.RunPython(seed, unseed)]
