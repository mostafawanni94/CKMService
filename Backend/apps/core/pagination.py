"""
Custom pagination classes for API endpoints.
Allows flexible page sizes for efficient data loading.

All of these emit *relative* next/previous links via ``RelativeLinksMixin``.
DRF builds absolute links from the request it sees, and the dashboard reaches
the API through the Next.js proxy — so Django saw its own host and handed a
browser on :3000 links pointing at :8000. Following one bypassed the proxy,
tripped CORS, and in production would have exposed the internal backend
hostname. A relative link resolves against whatever origin the client is
already on, which is correct everywhere.
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.utils.urls import remove_query_param, replace_query_param


class RelativeLinksMixin:
    """Rewrite DRF's absolute pagination links as origin-relative paths."""

    def _relative(self, url):
        if not url:
            return None
        query = url.split('?', 1)[1] if '?' in url else ''
        path = self.request.path
        return f'{path}?{query}' if query else path

    def get_next_link(self):
        return self._relative(super().get_next_link())

    def get_previous_link(self):
        return self._relative(super().get_previous_link())


class StandardPagination(RelativeLinksMixin, PageNumberPagination):
    """
    Standard pagination with configurable page size.
    Default: 20 items per page
    Max: 100 items per page
    
    Usage: ?page=1&page_size=10
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SmallPagination(RelativeLinksMixin, PageNumberPagination):
    """
    Small pagination for mobile/lightweight requests.
    Default: 10 items per page
    Max: 50 items per page
    
    Usage: ?page=1&page_size=10
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargePagination(RelativeLinksMixin, PageNumberPagination):
    """
    Large pagination for admin dashboards.

    The cap is high because the worklogs board deliberately loads a whole
    period at once, and silently truncating financial data would be worse than
    a slow response. The per-row cost that made this dangerous (7 queries an
    entry) is now memoised away — see apps/worklogs/models.py.

    Pages that only need a window should use StandardPagination instead.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10000


class RelativePageNumberPagination(RelativeLinksMixin, PageNumberPagination):
    """The project-wide default. Same behaviour as StandardPagination."""

    page_size = 20
    page_size_query_param = 'page_size'
    # Capped deliberately: the dashboard was requesting page_size=9999, and every
    # row of a worklog list runs a per-minute money calculation.
    max_page_size = 200
