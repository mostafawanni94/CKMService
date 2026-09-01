"""
Convert surcharge percentages from "uplift on top" to "percentage OF the rate".

Old meaning: 30 => rate + 30%  =>  EUR 10/h billed at EUR 13/h
New meaning: 130 => rate x 1.30 =>  EUR 10/h billed at EUR 13/h

The conversion is X -> 100 + X, which is exactly behaviour-preserving:

    old total = base + base * X/100 = base * (100 + X)/100
    new total = base * Y/100          where Y = 100 + X

so no customer is billed a different amount. Only the notation changes, to
match how the business states it ("night shift is 150%" meaning EUR 10 -> EUR 15).

Rows already at or above 100 are left alone: they were entered under the new
meaning, and doubling them would be wrong.
"""

from decimal import Decimal

from django.db import migrations

THRESHOLD = Decimal('100')


def uplift_to_rate_percentage(apps, schema_editor):
    for label, model_name in [
        ('customers', 'CustomerSurcharge'),
        ('customers', 'CustomerServiceSurcharge'),
        ('customers', 'CustomerAllowanceSurcharge'),
        ('employees', 'AgencySurcharge'),
    ]:
        Model = apps.get_model(label, model_name)
        for row in Model.objects.all():
            if row.percentage is not None and row.percentage < THRESHOLD:
                row.percentage = row.percentage + THRESHOLD
                row.save(update_fields=['percentage'])


def rate_percentage_to_uplift(apps, schema_editor):
    for label, model_name in [
        ('customers', 'CustomerSurcharge'),
        ('customers', 'CustomerServiceSurcharge'),
        ('customers', 'CustomerAllowanceSurcharge'),
        ('employees', 'AgencySurcharge'),
    ]:
        Model = apps.get_model(label, model_name)
        for row in Model.objects.all():
            if row.percentage is not None and row.percentage >= THRESHOLD:
                row.percentage = row.percentage - THRESHOLD
                row.save(update_fields=['percentage'])


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0021_surcharge_percent_of_rate'),
        ('employees', '0015_surcharge_percent_of_rate'),
    ]

    operations = [
        migrations.RunPython(uplift_to_rate_percentage, rate_percentage_to_uplift),
    ]
