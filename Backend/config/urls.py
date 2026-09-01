"""
Root URL configuration for the CKM Services API.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.core.media import serve_protected_media
from apps.employees.auth_views import (
    CKMTokenObtainPairView,
    password_change,
    password_reset_confirm,
    password_reset_request,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/token/', CKMTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/password-change/', password_change, name='password_change'),
    path('api/auth/password-reset/', password_reset_request, name='password_reset'),
    path('api/auth/password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),

    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Application APIs
    path('api/employees/', include('apps.employees.urls')),
    path('api/wallet/', include('apps.wallet.urls')),
    path('api/customers/', include('apps.customers.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/worklogs/', include('apps.worklogs.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/settings/', include('apps.core.urls')),
    path('api/customer-portal/', include('apps.customers.portal_urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/hr/', include('apps.hr.urls')),
    path('api/vat/', include('apps.vat.urls')),
]

# Media is NOT served by static(): MEDIA_ROOT holds ID documents, contracts and
# work photos, and static() applies no access control whatsoever. Every file is
# reached through a signed, expiring URL — see apps/core/media.py.
urlpatterns += [
    re_path(r'^media/(?P<path>.+)$', serve_protected_media, name='protected-media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
