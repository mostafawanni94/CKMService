"""
Firebase Cloud Messaging (FCM) Push Notification Service.

Sends push notifications to mobile devices using Firebase.
The server key is stored in SystemConfig - configurable from settings page.

Usage:
    from apps.notifications.push_service import send_push_notification
    
    send_push_notification(
        user=employee.user,
        title="Certificate Expiring",
        message="Your VCA expires in 3 days",
        data={'action_url': '/profile/certificates'}
    )
"""

import requests
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

FCM_URL = 'https://fcm.googleapis.com/fcm/send'


def get_firebase_config():
    """Get Firebase configuration from SystemConfig."""
    from apps.core.models import SystemConfig
    config = SystemConfig.objects.get_config()
    return {
        'enabled': config.firebase_enabled,
        'server_key': config.firebase_server_key,
    }


def send_push_notification(
    user,
    title: str,
    message: str,
    data: Optional[Dict] = None,
    priority: str = 'normal'
) -> bool:
    """
    Send push notification to a specific user's devices.
    
    Args:
        user: User object - will send to all their registered devices
        title: Notification title
        message: Notification body
        data: Optional data payload (e.g., action_url, reference_id)
        priority: 'normal' or 'high'
    
    Returns:
        True if sent successfully, False otherwise
    """
    config = get_firebase_config()
    
    if not config['enabled']:
        logger.debug('Firebase push notifications are disabled')
        return False
    
    if not config['server_key']:
        logger.warning('Firebase server key not configured')
        return False
    
    # Get user's FCM tokens from DeviceRegistration
    from apps.notifications.device_models import DeviceRegistration
    tokens = list(DeviceRegistration.objects.filter(
        user=user,
        is_active=True
    ).values_list('token', flat=True))
    
    if not tokens:
        logger.debug(f'No FCM tokens found for user {user.id}')
        return False
    
    return send_to_tokens(
        tokens=tokens,
        title=title,
        message=message,
        data=data,
        priority=priority,
        server_key=config['server_key']
    )


def send_to_tokens(
    tokens: List[str],
    title: str,
    message: str,
    data: Optional[Dict] = None,
    priority: str = 'normal',
    server_key: str = None
) -> bool:
    """
    Send push notification to specific FCM tokens.
    
    Handles both single and multiple tokens.
    """
    if not tokens:
        return False
    
    if not server_key:
        config = get_firebase_config()
        server_key = config['server_key']
    
    if not server_key:
        logger.warning('Firebase server key not configured')
        return False
    
    headers = {
        'Authorization': f'key={server_key}',
        'Content-Type': 'application/json',
    }
    
    # FCM payload
    payload = {
        'notification': {
            'title': title,
            'body': message,
            'sound': 'default',
            'badge': 1,
        },
        'priority': 'high' if priority in ['high', 'urgent'] else 'normal',
        'data': data or {},
    }
    
    # Send to single token or multiple
    if len(tokens) == 1:
        payload['to'] = tokens[0]
    else:
        payload['registration_ids'] = tokens[:1000]  # FCM limit
    
    try:
        response = requests.post(FCM_URL, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            success_count = result.get('success', 0)
            failure_count = result.get('failure', 0)
            
            logger.info(f'FCM sent: {success_count} success, {failure_count} failed')
            
            # Handle invalid tokens
            if 'results' in result:
                _handle_token_errors(tokens, result['results'])
            
            return success_count > 0
        else:
            logger.error(f'FCM error: {response.status_code} - {response.text}')
            return False
            
    except Exception as e:
        logger.error(f'FCM request failed: {e}')
        return False


def _handle_token_errors(tokens: List[str], results: List[Dict]):
    """
    Handle FCM token errors - deactivate invalid tokens.
    """
    from apps.notifications.device_models import FCMDevice
    
    invalid_tokens = []
    for i, result in enumerate(results):
        if 'error' in result:
            error = result['error']
            if error in ['NotRegistered', 'InvalidRegistration']:
                if i < len(tokens):
                    invalid_tokens.append(tokens[i])
    
    if invalid_tokens:
        # Deactivate invalid tokens
        FCMDevice.objects.filter(registration_id__in=invalid_tokens).update(is_active=False)
        logger.info(f'Deactivated {len(invalid_tokens)} invalid FCM tokens')


def send_notification_push(notification) -> bool:
    """
    Send push notification for a Notification object.
    
    Convenience function that extracts data from Notification model.
    """
    return send_push_notification(
        user=notification.recipient,
        title=notification.title,
        message=notification.message,
        data={
            'notification_id': str(notification.id),
            'action_url': notification.action_url or '',
            'category': notification.category,
            'priority': notification.priority,
        },
        priority=notification.priority
    )
