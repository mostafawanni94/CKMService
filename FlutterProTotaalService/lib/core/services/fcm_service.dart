/// Firebase Cloud Messaging (FCM) Service
/// 
/// Handles push notification registration, receiving, and display.
/// 
/// Setup required:
/// 1. Add firebase_messaging and firebase_core to pubspec.yaml
/// 2. Configure Firebase project and add google-services.json (Android)
/// 3. Configure Firebase project and add GoogleService-Info.plist (iOS)
/// 4. Call FcmService.initialize() in main.dart

import 'dart:convert';
import 'package:flutter/foundation.dart';
// Uncomment these when firebase packages are added:
// import 'package:firebase_core/firebase_core.dart';
// import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/network/api_client.dart';

/// Background message handler - must be top-level function
// Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
//   await Firebase.initializeApp();
//   debugPrint('Background message: ${message.messageId}');
// }

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  FcmService._internal();

  // FirebaseMessaging? _messaging;
  String? _fcmToken;
  final ApiClient _api = ApiClient();

  /// Get the current FCM token
  String? get fcmToken => _fcmToken;

  /// Initialize FCM - call this in main.dart after Firebase.initializeApp()
  Future<void> initialize() async {
    // When Firebase is configured, uncomment:
    /*
    _messaging = FirebaseMessaging.instance;

    // Request permission (iOS)
    NotificationSettings settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('FCM: User granted permission');
    }

    // Get FCM token
    _fcmToken = await _messaging!.getToken();
    debugPrint('FCM Token: $_fcmToken');
    
    // Save token locally
    if (_fcmToken != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', _fcmToken!);
    }

    // Listen for token refresh
    _messaging!.onTokenRefresh.listen((newToken) {
      _fcmToken = newToken;
      _registerTokenWithBackend(newToken);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was opened from notification
    RemoteMessage? initialMessage = await _messaging!.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    // Set background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    */

    debugPrint('FCM Service: Firebase not configured yet. Add firebase packages to pubspec.yaml');
  }

  /// Register FCM token with backend
  Future<void> _registerTokenWithBackend(String token) async {
    try {
      await _api.post('/notifications/devices/register/', body: {
        'token': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
      });
      debugPrint('FCM: Token registered with backend');
    } catch (e) {
      debugPrint('FCM: Failed to register token: $e');
    }
  }

  /// Handle foreground messages
  void _handleForegroundMessage(dynamic message) {
    // When Firebase is configured, message will be RemoteMessage type
    debugPrint('FCM: Foreground message received');
    
    // Show local notification
    // You can use flutter_local_notifications package for this
    /*
    final notification = message.notification;
    if (notification != null) {
      // Show local notification banner
      _showLocalNotification(
        title: notification.title ?? 'Notification',
        body: notification.body ?? '',
        payload: jsonEncode(message.data),
      );
    }
    */
  }

  /// Handle notification tap
  void _handleNotificationTap(dynamic message) {
    debugPrint('FCM: Notification tapped');
    
    // Navigate based on notification data
    /*
    final data = message.data;
    if (data.containsKey('type')) {
      switch (data['type']) {
        case 'worklog':
          // Navigate to worklog
          break;
        case 'certificate':
          // Navigate to certificates
          break;
        default:
          // Navigate to notifications
          break;
      }
    }
    */
  }

  /// Subscribe to a topic (e.g., 'employees', 'worklogs')
  Future<void> subscribeToTopic(String topic) async {
    // await _messaging?.subscribeToTopic(topic);
    debugPrint('FCM: Subscribed to topic: $topic');
  }

  /// Unsubscribe from a topic
  Future<void> unsubscribeFromTopic(String topic) async {
    // await _messaging?.unsubscribeFromTopic(topic);
    debugPrint('FCM: Unsubscribed from topic: $topic');
  }

  /// Called when user logs in - register token
  Future<void> onUserLogin() async {
    if (_fcmToken != null) {
      await _registerTokenWithBackend(_fcmToken!);
    }
  }

  /// Called when user logs out - unregister token
  Future<void> onUserLogout() async {
    try {
      await _api.post('/notifications/devices/unregister/', body: {
        'token': _fcmToken,
      });
    } catch (_) {}
  }
}

/// Global FCM service instance
final fcmService = FcmService();
