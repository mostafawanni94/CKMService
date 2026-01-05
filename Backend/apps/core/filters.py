"""
Professional reusable filter system for Pro Totaal Service.

Provides base filter classes that can be extended for any model.
Supports date ranges, search, status, and custom filtering.
"""

import django_filters
from django.db.models import Q
from django_filters import rest_framework as filters


class BaseFilter(filters.FilterSet):
    """
    Base filter class with common filtering capabilities.
    Extend this for any model to get standard filtering out of the box.
    
    Usage:
        class CustomerFilter(BaseFilter):
            class Meta(BaseFilter.Meta):
                model = Customer
                fields = BaseFilter.Meta.fields + ['company_name', 'country']
    """
    
    # Date range filters
    created_after = filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        help_text='Filter records created after this date'
    )
    created_before = filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        help_text='Filter records created before this date'
    )
    updated_after = filters.DateTimeFilter(
        field_name='updated_at',
        lookup_expr='gte',
        help_text='Filter records updated after this date'
    )
    updated_before = filters.DateTimeFilter(
        field_name='updated_at',
        lookup_expr='lte',
        help_text='Filter records updated before this date'
    )
    
    # Include deleted records (admin only)
    include_deleted = filters.BooleanFilter(
        method='filter_include_deleted',
        help_text='Include soft-deleted records (admin only)'
    )
    
    class Meta:
        fields = ['created_after', 'created_before', 'updated_after', 'updated_before']
    
    def filter_include_deleted(self, queryset, name, value):
        """Include soft-deleted records if requested."""
        if value and hasattr(self.request, 'user') and self.request.user.is_staff:
            return queryset.model.all_objects.all()
        return queryset


class StatusFilter(BaseFilter):
    """
    Filter for models with status field.
    Use for employees, projects, invoices, etc.
    """
    status = filters.CharFilter(
        field_name='status',
        lookup_expr='exact',
        help_text='Filter by exact status'
    )
    status_in = filters.CharFilter(
        method='filter_status_in',
        help_text='Filter by multiple statuses (comma-separated)'
    )
    exclude_status = filters.CharFilter(
        method='filter_exclude_status',
        help_text='Exclude specific statuses (comma-separated)'
    )
    
    def filter_status_in(self, queryset, name, value):
        """Filter by multiple status values."""
        statuses = [s.strip() for s in value.split(',')]
        return queryset.filter(status__in=statuses)
    
    def filter_exclude_status(self, queryset, name, value):
        """Exclude specific status values."""
        statuses = [s.strip() for s in value.split(',')]
        return queryset.exclude(status__in=statuses)


class SearchFilter(filters.FilterSet):
    """
    Mixin for full-text search across multiple fields.
    
    Usage:
        class CustomerFilter(SearchFilter, BaseFilter):
            search_fields = ['company_name', 'email', 'phone']
            
            class Meta(BaseFilter.Meta):
                model = Customer
    """
    search = filters.CharFilter(
        method='filter_search',
        help_text='Search across multiple fields'
    )
    
    # Override in subclass
    search_fields = []
    
    def filter_search(self, queryset, name, value):
        """Search across defined fields."""
        if not value or not self.search_fields:
            return queryset
        
        query = Q()
        for field in self.search_fields:
            query |= Q(**{f'{field}__icontains': value})
        
        return queryset.filter(query)


class DateRangeFilter(filters.FilterSet):
    """
    Advanced date range filtering for specific date fields.
    
    Usage:
        class ContractFilter(DateRangeFilter):
            date_field = 'contract_end_date'
    """
    date_from = filters.DateFilter(
        method='filter_date_from',
        help_text='Records with date >= this value'
    )
    date_to = filters.DateFilter(
        method='filter_date_to',
        help_text='Records with date <= this value'
    )
    
    # Override in subclass
    date_field = 'created_at'
    
    def filter_date_from(self, queryset, name, value):
        return queryset.filter(**{f'{self.date_field}__gte': value})
    
    def filter_date_to(self, queryset, name, value):
        return queryset.filter(**{f'{self.date_field}__lte': value})


class WeeklyFilter(filters.FilterSet):
    """
    Week-based filtering for Pro Totaal Service.
    Follows business rule: Monday 06:00 → Sunday 06:00
    """
    week_year = filters.NumberFilter(
        method='filter_week_year',
        help_text='Filter by ISO year'
    )
    week_number = filters.NumberFilter(
        method='filter_week_number',
        help_text='Filter by ISO week number (1-53)'
    )
    
    # Override in subclass
    week_date_field = 'created_at'
    
    def filter_week_year(self, queryset, name, value):
        return queryset.filter(**{f'{self.week_date_field}__iso_year': value})
    
    def filter_week_number(self, queryset, name, value):
        return queryset.filter(**{f'{self.week_date_field}__week': value})


class AmountRangeFilter(filters.FilterSet):
    """
    Filter for models with monetary amounts.
    Use for wallet transactions, invoices, etc.
    """
    amount_min = filters.NumberFilter(
        method='filter_amount_min',
        help_text='Minimum amount'
    )
    amount_max = filters.NumberFilter(
        method='filter_amount_max',
        help_text='Maximum amount'
    )
    
    # Override in subclass
    amount_field = 'amount'
    
    def filter_amount_min(self, queryset, name, value):
        return queryset.filter(**{f'{self.amount_field}__gte': value})
    
    def filter_amount_max(self, queryset, name, value):
        return queryset.filter(**{f'{self.amount_field}__lte': value})


# =============================================================================
# REUSABLE ORDERING MIXIN
# =============================================================================

class OrderingMixin:
    """
    Mixin to add consistent ordering options.
    
    Add this to your filter class:
        class MyFilter(OrderingMixin, BaseFilter):
            ordering_fields = ['created_at', 'name', 'status']
    """
    ordering = filters.OrderingFilter(
        fields=(
            ('created_at', 'created'),
            ('updated_at', 'updated'),
        ),
        help_text='Order by field (prefix with - for descending)'
    )
