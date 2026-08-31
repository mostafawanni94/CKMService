"""
Firebase Cloud Messaging push notifications (HTTP v1 API).

This module previously posted to ``https://fcm.googleapis.com/fcm/send`` with a
legacy server key. Google decommissioned that endpoint in July 2024, so every
push silently failed. It now uses the HTTP v1 API, which authenticates with an
OAuth2 access token minted from a service-account key.

Configuration lives on ``SystemConfig``:
- ``firebase_enabled``
- ``firebase_project_id``
- ``firebase_credentials_json`` (contents of the service-account key file)

``google-auth`` is imported lazily so the rest of the project still runs when
push is switched off and the library is absent.
"""

import json
import logging
import threading
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'
FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
REQUEST_TIMEOUT = 10

# Credentials are cached per process; refreshing them on every send would cost a
# network round trip to Google before each notification.
_credentials_lock = threading.Lock()
_credentials_cache = {'signature': None, 'credentials': None}


def get_firebase_config() -> Dict:
    """Read the Firebase settings from SystemConfig."""
    from apps.core.models import SystemConfig
    config = SystemConfig.objects.get_config()
    return {
        'enabled': config.firebase_enabled,
        'project_id': (config.firebase_project_id or '').strip(),
        'credentials_json': (config.firebase_credentials_json or '').strip(),
    }


def _get_access_token(credentials_json: str) -> Optional[str]:
    """Mint (or reuse) an OAuth2 access token for the FCM scope."""
    try:
        from google.oauth2 import service_account  # type: ignore
        from google.auth.transport.requests import Request  # type: ignore
    except ImportError:
        logger.error(
            'google-auth is not installed, so FCM HTTP v1 cannot authenticate. '
            'Install it with: pip install google-auth'
        )
        return None

    with _credentials_lock:
        if _credentials_cache['signature'] != credentials_json:
            try:
                info = json.loads(credentials_json)
            except json.JSONDecodeError:
                logger.error('firebase_credentials_json is not valid JSON.')
                return None
            try:
                creds = service_account.Credentials.from_service_account_info(
                    info, scopes=[FCM_SCOPE]
                )
            except Exception:
                logger.exception('Could not build Firebase service-account credentials.')
                return None
            _credentials_cache['signature'] = credentials_json
            _credentials_cache['credentials'] = creds

        creds = _credentials_cache['credentials']
        try:
            if not creds.valid:
                creds.refresh(Request())
        except Exception:
            logger.exception('Could not refresh the Firebase access token.')
            return None
        return creds.token


def send_to_user(
    user,
    title: str,
    message: str,
    data: Optional[Dict] = None,
    priority: str = 'normal',
) -> bool:
    """Send a push notification to every active device registered to ``user``."""
    from apps.notifications.device_models import DeviceRegistration

    config = get_firebase_config()
    if not config['enabled']:
        logger.debug('Firebase push notifications are disabled.')
        return False

    tokens = list(
        DeviceRegistration.objects
        .filter(user=user, is_active=True)
        .values_list('token', flat=True)
    )
    if not tokens:
        logger.debug('No device tokens registered for user %s.', user.pk)
        return False

    return send_to_tokens(tokens, title, message, data=data, priority=priority)


def send_to_tokens(
    tokens: List[str],
    title: str,
    message: str,
    data: Optional[Dict] = None,
    priority: str = 'normal',
) -> bool:
    """
    Send a notification to specific device tokens.

    HTTP v1 addresses one token per request, so this loops. Returns True when at
    least one delivery succeeded.
    """
    if not tokens:
        return False

    config = get_firebase_config()
    if not config['enabled']:
        return False

    project_id = config['project_id']
    if not project_id or not config['credentials_json']:
        logger.warning(
            'Firebase is enabled but project_id or credentials_json is missing; '
            'configure both under Settings.'
        )
        return False

    access_token = _get_access_token(config['credentials_json'])
    if not access_token:
        return False

    url = FCM_ENDPOINT.format(project_id=project_id)
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json; UTF-8',
    }
    android_priority = 'HIGH' if priority in ('high', 'urgent') else 'NORMAL'
    # HTTP v1 requires every data value to be a string.
    string_data = {str(k): str(v) for k, v in (data or {}).items()}

    succeeded = 0
    stale_tokens = []

    for token in tokens:
        payload = {
            'message': {
                'token': token,
                'notification': {'title': title, 'body': message},
                'data': string_data,
                'android': {
                    'priority': android_priority,
                    'notification': {'sound': 'default'},
                },
                'apns': {
                    'headers': {'apns-priority': '10' if android_priority == 'HIGH' else '5'},
                    'payload': {'aps': {'sound': 'default', 'badge': 1}},
                },
            }
        }
        try:
            response = requests.post(
                url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT
            )
        except requests.RequestException:
            logger.exception('FCM request failed for one token.')
            continue

        if response.status_code == 200:
            succeeded += 1
            continue

        # 404 UNREGISTERED / 400 INVALID_ARGUMENT on the token means it is dead.
        if response.status_code in (400, 403, 404):
            logger.info('FCM rejected a token (%s): %s', response.status_code, response.text[:200])
            if response.status_code == 404 or 'UNREGISTERED' in response.text:
                stale_tokens.append(token)
        else:
            logger.error('FCM error %s: %s', response.status_code, response.text[:200])

    if stale_tokens:
        _deactivate_tokens(stale_tokens)

    logger.info('FCM sent: %s/%s delivered.', succeeded, len(tokens))
    return succeeded > 0


def _deactivate_tokens(tokens: List[str]) -> None:
    """Retire tokens FCM reported as no longer registered."""
    from apps.notifications.device_models import DeviceRegistration

    updated = DeviceRegistration.objects.filter(token__in=tokens).update(is_active=False)
    if updated:
        logger.info('Deactivated %s stale device token(s).', updated)
