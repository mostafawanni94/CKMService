"""
Core views for system-wide configuration.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny

from apps.core.permissions import IsAdmin

from .models import SystemConfig
from .serializers import SystemConfigSerializer, SystemConfigPublicSerializer


class SystemConfigView(APIView):
    """
    API endpoint for system configuration.
    - GET: Any authenticated user can read config
    - PUT/PATCH: Only admin can update
    """

    def get_permissions(self):
        # The project's permission model is role-based. `IsAdminUser` checks
        # Django's `is_staff`, which an admin-role account created through the
        # dashboard does not have — so only a superuser could change the
        # company settings, and nobody would have been told why.
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        """Get current system configuration."""
        config = SystemConfig.objects.get_config()
        # Full configuration for an admin, the public subset for everyone else.
        # This used to test `is_staff`, so an admin-role account that was not
        # also a Django staff user silently received the public shape and could
        # not see the company identity it is responsible for.
        if getattr(request.user, 'is_admin', False) or request.user.is_staff:
            serializer = SystemConfigSerializer(config)
        else:
            serializer = SystemConfigPublicSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        """Update system configuration (admin only)."""
        config = SystemConfig.objects.get_config()
        serializer = SystemConfigSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Partial update of system configuration (admin only)."""
        config = SystemConfig.objects.get_config()
        serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SystemConfigPublicView(APIView):
    """
    Public system config endpoint for mobile apps.
    No authentication required - returns only non-sensitive settings.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Get public system configuration."""
        config = SystemConfig.objects.get_config()
        serializer = SystemConfigPublicSerializer(config)
        return Response(serializer.data)
