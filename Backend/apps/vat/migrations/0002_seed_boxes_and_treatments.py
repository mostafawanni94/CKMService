"""
Seed the Dutch BTW return boxes and the VAT rules in force for CKMcleaning.

Only the boxes relevant to a domestic Dutch cleaning company are activated. The
rest are created but inactive, so enabling them later needs configuration, not a
schema change — and so no box has to be invented at that point.

There is deliberately no 5g. It is not a rubriek; the payable/refundable figure
is derived as 5a - 5b.
"""

from decimal import Decimal

from django.db import migrations

ACTIVE_FOR_CKM = {'1a', '1b', '1e', '2a', '5a', '5b'}

BOXES = [
    ('1a', 'Leveringen/diensten belast met hoog tarief', 'OUTPUT', False),
    ('1b', 'Leveringen/diensten belast met laag tarief', 'OUTPUT', False),
    ('1c', 'Leveringen/diensten belast met overige tarieven behalve 0%', 'OUTPUT', False),
    ('1d', 'Privegebruik', 'OUTPUT', False),
    ('1e', 'Leveringen/diensten belast met 0% of niet bij u belast', 'OUTPUT', False),
    ('2a', 'Verleggingsregelingen binnenland', 'OUTPUT', False),
    ('3a', 'Leveringen naar landen buiten de EU (uitvoer)', 'OUTPUT', False),
    ('3b', 'Leveringen naar of diensten in landen binnen de EU', 'OUTPUT', False),
    ('3c', 'Installatie/afstandsverkopen binnen de EU', 'OUTPUT', False),
    ('4a', 'Leveringen/diensten uit landen buiten de EU', 'OUTPUT', False),
    ('4b', 'Leveringen/diensten uit landen binnen de EU', 'OUTPUT', False),
    ('5a', 'Verschuldigde omzetbelasting', 'OUTPUT', True),
    ('5b', 'Voorbelasting', 'INPUT', True),
]


def seed(apps, schema_editor):
    Box = apps.get_model('vat', 'VatReturnBox')
    Treatment = apps.get_model('vat', 'VatTreatment')

    boxes = {}
    for code, name, direction, computed in BOXES:
        boxes[code], _ = Box.objects.get_or_create(
            code=code,
            defaults={
                'name': name,
                'direction': direction,
                'is_computed': computed,
                'is_active': code in ACTIVE_FOR_CKM,
            },
        )

    start = '2020-01-01'
    rules = [
        # code, name, rate, output box, input box, out?, in?, rc?, review?
        ('NORMAL', 'Normal 21% (hoog tarief)', '21.00', '1a', '5b', True, True, False, False),
        ('VAT_INCLUDED', 'Normal 21%, price includes VAT', '21.00', '1a', '5b', True, True, False, False),
        ('ZERO_RATE', 'Zero rated (0%)', '0.00', '1e', None, True, False, False, False),
        ('EXEMPT', 'Exempt (vrijgesteld)', '0.00', '1e', None, False, False, False, False),
        ('REVERSE_CHARGE', 'Reverse charge (btw verlegd) 21%', '21.00', '1e', '5b', True, True, True, False),
        ('OUT_OF_SCOPE', 'Outside the scope of VAT', '0.00', None, None, False, False, False, False),
        # Anything landing here is held for a person by construction.
        ('UNKNOWN', 'Unknown treatment', '0.00', None, None, False, False, False, True),
    ]

    for (code, name, rate, out_box, in_box,
         creates_out, creates_in, is_rc, needs_review) in rules:
        Treatment.objects.get_or_create(
            code=code,
            effective_from=start,
            defaults={
                'name': name,
                'rate': Decimal(rate),
                'output_box': boxes.get(out_box),
                'input_box': boxes.get(in_box),
                'creates_output_vat': creates_out,
                'creates_input_vat': creates_in,
                'is_reverse_charge': is_rc,
                'requires_review': needs_review,
                'is_active': True,
            },
        )

    # The 9% rate exists in Dutch VAT even though cleaning is normally 21%.
    # Configured but inactive, so using it is a decision rather than a change.
    Treatment.objects.get_or_create(
        code='NORMAL', effective_from=start, rate=Decimal('9.00'),
        defaults={
            'name': 'Normal 9% (laag tarief)',
            'output_box': boxes.get('1b'),
            'input_box': boxes.get('5b'),
            'creates_output_vat': True,
            'creates_input_vat': True,
            'is_active': False,
        },
    )


def unseed(apps, schema_editor):
    apps.get_model('vat', 'VatTreatment').objects.all().delete()
    apps.get_model('vat', 'VatReturnBox').objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [('vat', '0001_initial')]
    operations = [migrations.RunPython(seed, unseed)]
