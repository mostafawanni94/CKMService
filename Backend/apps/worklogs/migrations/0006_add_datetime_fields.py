# Generated migration for adding datetime fields to WorkLog and time fields to WorkLogAllowance

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('worklogs', '0005_add_shift_model'),
    ]

    operations = [
        # Add start_datetime field with a default (will be populated from work_date + start_time)
        migrations.AddField(
            model_name='worklog',
            name='start_datetime',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Start Date/Time',
                db_index=True,
                help_text='When employee started working'
            ),
        ),
        # Add end_datetime field
        migrations.AddField(
            model_name='worklog',
            name='end_datetime',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='End Date/Time',
                help_text='When employee finished working'
            ),
        ),
        # Make work_date nullable (for backward compatibility)
        migrations.AlterField(
            model_name='worklog',
            name='work_date',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='Work Date',
                db_index=True,
                help_text='Auto-populated from start_datetime for backward compatibility'
            ),
        ),
        # Make start_time nullable
        migrations.AlterField(
            model_name='worklog',
            name='start_time',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='Start Time'
            ),
        ),
        # Make end_time nullable
        migrations.AlterField(
            model_name='worklog',
            name='end_time',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='End Time'
            ),
        ),
        # Add start_time to WorkLogAllowance for From/To time tracking
        migrations.AddField(
            model_name='worklogallowance',
            name='start_time',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='From Time',
                help_text='When this allowance started applying'
            ),
        ),
        # Add end_time to WorkLogAllowance
        migrations.AddField(
            model_name='worklogallowance',
            name='end_time',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='To Time',
                help_text='When this allowance stopped applying'
            ),
        ),
    ]
