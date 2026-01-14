"""Add end_billing_week fields for cross-week shift support."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('worklogs', '0009_add_shift_assignment_to_worklog'),
    ]

    operations = [
        migrations.AddField(
            model_name='worklog',
            name='end_billing_week_number',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='End Billing Week Number'),
        ),
        migrations.AddField(
            model_name='worklog',
            name='end_billing_week_year',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='End Billing Week Year'),
        ),
    ]
