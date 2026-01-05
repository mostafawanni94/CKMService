/// Notification Service - API calls for notifications
/// 
/// Handles fetching and managing notifications.

import '../../../core/network/api_client.dart';

/// Notification Model
class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['notification_type'] ?? 'info',
      isRead: json['is_read'] ?? false,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

/// Notification Service
class NotificationService {
  final ApiClient _api;

  NotificationService({ApiClient? api}) : _api = api ?? ApiClient();

  /// Get all notifications
  Future<List<NotificationModel>> getNotifications() async {
    final response = await _api.get('/notifications/');
    final results = response['results'] as List? ?? [];
    return results.map((n) => NotificationModel.fromJson(n)).toList();
  }

  /// Get unread count
  Future<int> getUnreadCount() async {
    final response = await _api.get('/notifications/unread_count/');
    return response['count'] ?? 0;
  }

  /// Mark as read
  Future<void> markAsRead(String id) async {
    await _api.post('/notifications/$id/mark_read/');
  }

  /// Mark all as read
  Future<void> markAllAsRead() async {
    await _api.post('/notifications/mark_all_read/');
  }
}
