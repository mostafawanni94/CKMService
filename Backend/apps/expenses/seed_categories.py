"""Seed default expense categories for Dutch business use."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.expenses.models import ExpenseCategory

CATEGORIES = [
    {'name': 'Office Rent', 'name_nl': 'Kantoorhuur', 'code': 'RENT', 'category_type': 'fixed', 'icon': 'building', 'color': '#3B82F6', 'sort_order': 1},
    {'name': 'Software Subscriptions', 'name_nl': 'Software Abonnementen', 'code': 'SOFTWARE', 'category_type': 'fixed', 'icon': 'monitor', 'color': '#8B5CF6', 'sort_order': 2},
    {'name': 'Insurance', 'name_nl': 'Verzekeringen', 'code': 'INSURANCE', 'category_type': 'fixed', 'icon': 'shield', 'color': '#10B981', 'sort_order': 3},
    {'name': 'Car / Fuel', 'name_nl': 'Auto / Brandstof', 'code': 'VEHICLE', 'category_type': 'variable', 'icon': 'car', 'color': '#F59E0B', 'sort_order': 4},
    {'name': 'Office Supplies', 'name_nl': 'Kantoorbenodigdheden', 'code': 'SUPPLIES', 'category_type': 'variable', 'icon': 'package', 'color': '#EC4899', 'sort_order': 5},
    {'name': 'Phone / Internet', 'name_nl': 'Telefoon / Internet', 'code': 'TELECOM', 'category_type': 'fixed', 'icon': 'phone', 'color': '#06B6D4', 'sort_order': 6},
    {'name': 'Accountant', 'name_nl': 'Accountant', 'code': 'ACCOUNTANT', 'category_type': 'fixed', 'icon': 'calculator', 'color': '#6366F1', 'sort_order': 7},
    {'name': 'Equipment', 'name_nl': 'Apparatuur', 'code': 'EQUIPMENT', 'category_type': 'variable', 'icon': 'wrench', 'color': '#EF4444', 'sort_order': 8},
    {'name': 'Travel', 'name_nl': 'Reiskosten', 'code': 'TRAVEL', 'category_type': 'variable', 'icon': 'plane', 'color': '#14B8A6', 'sort_order': 9},
    {'name': 'Marketing', 'name_nl': 'Marketing / Reclame', 'code': 'MARKETING', 'category_type': 'variable', 'icon': 'megaphone', 'color': '#F97316', 'sort_order': 10},
    {'name': 'Training', 'name_nl': 'Opleiding / Training', 'code': 'TRAINING', 'category_type': 'variable', 'icon': 'graduation-cap', 'color': '#A855F7', 'sort_order': 11},
    {'name': 'Bank Fees', 'name_nl': 'Bankkosten', 'code': 'BANK', 'category_type': 'fixed', 'icon': 'credit-card', 'color': '#64748B', 'sort_order': 12},
    {'name': 'Other', 'name_nl': 'Overig', 'code': 'OTHER', 'category_type': 'variable', 'icon': 'more-horizontal', 'color': '#9CA3AF', 'sort_order': 99},
]

created = 0
for cat_data in CATEGORIES:
    _, was_created = ExpenseCategory.objects.get_or_create(
        code=cat_data['code'],
        defaults=cat_data,
    )
    if was_created:
        created += 1

print(f"Seeded {created} expense categories ({len(CATEGORIES) - created} already existed).")
