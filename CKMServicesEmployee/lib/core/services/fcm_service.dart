/// Firebase Cloud Messaging (FCM) push notifications.
///
/// The whole implementation used to be commented out, so `initialize()` only
/// printed a debug line and no device ever registered a token — which is why
/// `Notification.push_sent` was always false server-side.
///
/// It is live now, and degrades gracefully: if the Firebase config files are
/// absent (`android/app/google-services.json`,
/// `ios/Runner/GoogleService-Info.plist`) `Firebase.initializeApp()` throws,
/// which is caught and logged. The app keeps working without push.
///
/// Remaining setup, once a Firebase project exists:
///   1. Download the two config files into the paths above.
///   2. In the dashboard under Settings, set the Firebase project id and paste
///      the service-account JSON, then enable push.
library;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../network/api_client.dart';

/// Background isolate handler. Must be a top-level function.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('FCM: background message ${message.messageId}');
}

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  FcmService._internal();

  static const _tokenPrefsKey = 'fcm_token';

  FirebaseMessaging? _messaging;
  String? _fcmToken;
  bool _available = false;

  final ApiClient _api = ApiClient();

  /// The current device token, or null when push is unavailable.
  String? get fcmToken => _fcmToken;

  /// True once Firebase initialised successfully on this device.
  bool get isAvailable => _available;

  /// Called when a notification is tapped; set this from the app shell to route.
  void Function(Map<String, dynamic> data)? onNotificationTap;

  /// Called for messages that arrive while the app is in the foreground.
  void Function(RemoteMessage message)? onForegroundMessage;

  /// Initialise Firebase and start listening. Safe to call when unconfigured.
  Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint(
        'FCM: Firebase is not configured on this build ($e). '
        'Push notifications are disabled; the app continues normally.',
      );
      _available = false;
      return;
    }

    _available = true;
    _messaging = FirebaseMessaging.instance;

    final settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('FCM: notification permission denied by the user.');
      return;
    }

    _fcmToken = await _messaging!.getToken();
    if (_fcmToken != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenPrefsKey, _fcmToken!);
    }

    _messaging!.onTokenRefresh.listen((newToken) async {
      _fcmToken = newToken;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenPrefsKey, newToken);
      await _registerTokenWithBackend(newToken);
    });

    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('FCM: foreground message ${message.messageId}');
      onForegroundMessage?.call(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    final initial = await _messaging!.getInitialMessage();
    if (initial != null) {
      _handleNotificationTap(initial);
    }

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }

  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('FCM: notification tapped ${message.messageId}');
    onNotificationTap?.call(Map<String, dynamic>.from(message.data));
  }

  /// Send this device's token to the backend so it can be targeted.
  Future<void> _registerTokenWithBackend(String token) async {
    try {
      await _api.post('/notifications/devices/register/', body: {
        'token': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
      });
      debugPrint('FCM: token registered with the backend.');
    } catch (e) {
      debugPrint('FCM: failed to register token: $e');
    }
  }

  Future<void> subscribeToTopic(String topic) async {
    if (!_available) return;
    await _messaging?.subscribeToTopic(topic);
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    if (!_available) return;
    await _messaging?.unsubscribeFromTopic(topic);
  }

  /// Register the token after a successful sign-in.
  ///
  /// Registration must happen *after* login, not during initialize(), because
  /// the endpoint is authenticated and binds the token to the signed-in user.
  Future<void> onUserLogin() async {
    if (!_available) return;
    _fcmToken ??= await _messaging?.getToken();
    final token = _fcmToken;
    if (token != null) {
      await _registerTokenWithBackend(token);
    }
  }

  /// Retire the token on sign-out so the next user does not inherit it.
  Future<void> onUserLogout() async {
    final token = _fcmToken;
    if (token == null) return;
    try {
      await _api.post('/notifications/devices/unregister/', body: {'token': token});
    } catch (e) {
      debugPrint('FCM: failed to unregister token: $e');
    }
  }
}

/// Global FCM service instance.
final fcmService = FcmService();
