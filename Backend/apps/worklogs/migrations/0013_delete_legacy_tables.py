"""
Migration to remove legacy tables (WorkLog and related models).

Now that all systems use the unified WorkEntry table, these legacy tables
can be safely removed.

Tables removed:
- worklogs_worklog
- worklogs_worklogallowance  
- worklogs_worklogphoto

The WorkEntry table keeps all data.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Remove legacy tables after migration to unified WorkEntry."""

    dependencies = [
        ('worklogs', '0012_migrate_existing_data'),
        ('projects', '0003_projectshifttemplate_projectplannedday_and_more'),
    ]

    operations = [
        # First, remove the work_log FK from Shift (must be done before deleting WorkLog)
        migrations.RemoveField(
            model_name='shift',
            name='work_log',
        ),
        # Add work_entry FK to Shift (replacing work_log)
        migrations.AddField(
            model_name='shift',
            name='work_entry',
            field=models.OneToOneField(
                blank=True, 
                null=True, 
                on_delete=django.db.models.deletion.SET_NULL, 
                related_name='source_shift', 
                to='worklogs.workentry', 
                verbose_name='Created Work Entry'
            ),
        ),
        
        # Remove the legacy FK fields from WorkEntry
        migrations.RemoveField(
            model_name='workentry',
            name='legacy_worklog',
        ),
        migrations.RemoveField(
            model_name='workentry',
            name='legacy_shift_assignment',
        ),
        
        # Remove WorkLog related tables
        migrations.DeleteModel(
            name='WorkLogPhoto',
        ),
        migrations.DeleteModel(
            name='WorkLogAllowance', 
        ),
        migrations.DeleteModel(
            name='WorkLog',
        ),
    ]
