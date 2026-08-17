"""Expenses Admin Configuration."""
from django.contrib import admin
from .models import ExpenseCategory, Expense, IncomeRecord


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category_type', 'is_active', 'sort_order']
    list_filter = ['category_type', 'is_active']
    search_fields = ['name', 'code']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['vendor_name', 'description', 'total_amount', 'expense_date', 'category', 'status']
    list_filter = ['status', 'category', 'payment_method', 'is_recurring']
    search_fields = ['vendor_name', 'description', 'reference_number']
    date_hierarchy = 'expense_date'


@admin.register(IncomeRecord)
class IncomeRecordAdmin(admin.ModelAdmin):
    list_display = ['description', 'payer_name', 'total_amount', 'received_date', 'source']
    list_filter = ['source']
    search_fields = ['description', 'payer_name']
    date_hierarchy = 'received_date'
