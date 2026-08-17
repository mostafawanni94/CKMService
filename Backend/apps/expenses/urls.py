"""Expenses URL Configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseCategoryViewSet, ExpenseViewSet, IncomeRecordViewSet

router = DefaultRouter()
router.register(r'categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'income', IncomeRecordViewSet, basename='income-record')

urlpatterns = [path('', include(router.urls))]
