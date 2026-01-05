"""Notification API Views."""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django_filters import rest_framework as filters

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationPagination(PageNumberPagination):
    """Pagination for notifications - 20 per page."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationFilter(filters.FilterSet):
    """Filter notifications by category, priority, and read status."""
    category = filters.CharFilter(field_name='category')
    priority = filters.CharFilter(field_name='priority')
    is_read = filters.BooleanFilter(field_name='is_read')
    
    class Meta:
        model = Notification
        fields = ['category', 'priority', 'is_read']


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for notifications with pagination and filters."""
    
    queryset = Notification.objects.order_by('-created_at')
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination
    filterset_class = NotificationFilter
    
    def get_queryset(self):
        return self.queryset.filter(recipient=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Allow users to delete their own notifications."""
        notification = self.get_object()
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications."""
        unread = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(unread)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(unread, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


class NotificationPreferenceViewSet(viewsets.ViewSet):
    """ViewSet for notification preferences."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get user's notification preferences."""
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref)
        return Response(serializer.data)
    
    def create(self, request):
        """Update user's notification preferences."""
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeviceRegistrationViewSet(viewsets.ViewSet):
    """ViewSet for FCM device registration."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='register')
    def register_device(self, request):
        """Register a device for push notifications."""
        from .device_models import DeviceRegistration
        
        token = request.data.get('token')
        platform = request.data.get('platform', 'android')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update device registration
        device, created = DeviceRegistration.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'platform': platform,
                'is_active': True
            }
        )
        
        return Response({
            'status': 'success',
            'created': created,
            'device_id': str(device.id)
        })
    
    @action(detail=False, methods=['post'], url_path='unregister')
    def unregister_device(self, request):
        """Unregister a device from push notifications."""
        from .device_models import DeviceRegistration
        
        token = request.data.get('token')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Deactivate or delete the device
        DeviceRegistration.objects.filter(token=token, user=request.user).update(is_active=False)
        
        return Response({'status': 'success'})
