"""
Migration to remove ShiftAssignment and ProjectPlannedDay.

Now that all planning data uses the unified WorkEntry table,
these legacy tables can be safely removed.

Tables removed:
- projects_shiftassignment
- projects_projectplannedday (only if no longer referenced)
"""

from django.db import migrations


class Migration(migrations.Migration):
    """Remove ShiftAssignment after migration to unified WorkEntry."""

    dependencies = [
        ('projects', '0003_projectshifttemplate_projectplannedday_and_more'),
        ('worklogs', '0013_delete_legacy_tables'),  # Must run after worklog cleanup
    ]

    operations = [
        migrations.DeleteModel(
            name='ShiftAssignment',
        ),
    ]
