"""
Custom pagination classes for API endpoints.
Allows flexible page sizes for efficient data loading.
"""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Standard pagination with configurable page size.
    Default: 20 items per page
    Max: 100 items per page
    
    Usage: ?page=1&page_size=10
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SmallPagination(PageNumberPagination):
    """
    Small pagination for mobile/lightweight requests.
    Default: 10 items per page
    Max: 50 items per page
    
    Usage: ?page=1&page_size=10
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargePagination(PageNumberPagination):
    """
    Large pagination for admin dashboards.
    Default: 50 items per page
    Max: 200 items per page
    
    Usage: ?page=1&page_size=100
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
