"""Seed the expense categories.

Every expense needs a category, so a fresh install with none cannot record its
first receipt. These were entered by hand once and lived only in one database;
as a migration they arrive with the schema, the way the BTW rubrieken do.

Matching is on `code`, so running this twice changes nothing, and a category
an operator has renamed or deactivated is left alone.
"""

from django.db import migrations

CATEGORIES = [
    {'code': 'RENT', 'name': 'Office Rent', 'name_nl': 'Kantoorhuur',
     'category_type': 'fixed', 'icon': 'building', 'color': '#3B82F6',
     'sort_order': 1},
    {'code': 'SOFTWARE', 'name': 'Software Subscriptions', 'name_nl': 'Software Abonnementen',
     'category_type': 'fixed', 'icon': 'monitor', 'color': '#8B5CF6',
     'sort_order': 2},
    {'code': 'INSURANCE', 'name': 'Insurance', 'name_nl': 'Verzekeringen',
     'category_type': 'fixed', 'icon': 'shield', 'color': '#10B981',
     'sort_order': 3},
    {'code': 'VEHICLE', 'name': 'Car / Fuel', 'name_nl': 'Auto / Brandstof',
     'category_type': 'variable', 'icon': 'car', 'color': '#F59E0B',
     'sort_order': 4},
    {'code': 'SUPPLIES', 'name': 'Office Supplies', 'name_nl': 'Kantoorbenodigdheden',
     'category_type': 'variable', 'icon': 'package', 'color': '#EC4899',
     'sort_order': 5},
    {'code': 'TELECOM', 'name': 'Phone / Internet', 'name_nl': 'Telefoon / Internet',
     'category_type': 'fixed', 'icon': 'phone', 'color': '#06B6D4',
     'sort_order': 6},
    {'code': 'ACCOUNTANT', 'name': 'Accountant', 'name_nl': 'Accountant',
     'category_type': 'fixed', 'icon': 'calculator', 'color': '#6366F1',
     'sort_order': 7},
    {'code': 'EQUIPMENT', 'name': 'Equipment', 'name_nl': 'Apparatuur',
     'category_type': 'variable', 'icon': 'wrench', 'color': '#EF4444',
     'sort_order': 8},
    {'code': 'TRAVEL', 'name': 'Travel', 'name_nl': 'Reiskosten',
     'category_type': 'variable', 'icon': 'plane', 'color': '#14B8A6',
     'sort_order': 9},
    {'code': 'MARKETING', 'name': 'Marketing', 'name_nl': 'Marketing / Reclame',
     'category_type': 'variable', 'icon': 'megaphone', 'color': '#F97316',
     'sort_order': 10},
    {'code': 'TRAINING', 'name': 'Training', 'name_nl': 'Opleiding / Training',
     'category_type': 'variable', 'icon': 'graduation-cap', 'color': '#A855F7',
     'sort_order': 11},
    {'code': 'BANK', 'name': 'Bank Fees', 'name_nl': 'Bankkosten',
     'category_type': 'fixed', 'icon': 'credit-card', 'color': '#64748B',
     'sort_order': 12},
    {'code': 'OTHER', 'name': 'Other', 'name_nl': 'Overig',
     'category_type': 'variable', 'icon': 'more-horizontal', 'color': '#9CA3AF',
     'sort_order': 99},
]


def seed(apps, schema_editor):
    ExpenseCategory = apps.get_model('expenses', 'ExpenseCategory')
    for row in CATEGORIES:
        ExpenseCategory.objects.get_or_create(code=row['code'], defaults=row)


def unseed(apps, schema_editor):
    """Remove only the untouched seeds; a category in use is left in place."""
    ExpenseCategory = apps.get_model('expenses', 'ExpenseCategory')
    Expense = apps.get_model('expenses', 'Expense')
    used = set(Expense.objects.values_list('category_id', flat=True))
    ExpenseCategory.objects.filter(
        code__in=[r['code'] for r in CATEGORIES]).exclude(id__in=used).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0003_expense_incoming_invoice_expense_paid_by_employee_and_more'),
    ]

    operations = [migrations.RunPython(seed, unseed)]

