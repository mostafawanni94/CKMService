/// Employee Assignment Service - Data Isolation
/// 
/// Shows only location, date, time - NO client/project details.

import '../../../core/network/api_client.dart';

/// Work Assignment Model (Employee View - Isolated)
class WorkAssignmentModel {
  final String id;
  final String locationAddress;
  final String locationCity;
  final DateTime date;
  final String? dateRange;
  final String expectedStartTime;
  final String expectedEndTime;
  final String? instructions;
  final String status;

  WorkAssignmentModel({
    required this.id,
    required this.locationAddress,
    required this.locationCity,
    required this.date,
    this.dateRange,
    required this.expectedStartTime,
    required this.expectedEndTime,
    this.instructions,
    required this.status,
  });

  factory WorkAssignmentModel.fromJson(Map<String, dynamic> json) {
    return WorkAssignmentModel(
      id: json['id'],
      locationAddress: json['location_address'] ?? '',
      locationCity: json['location_city'] ?? '',
      date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
      dateRange: json['date_range'],
      expectedStartTime: json['expected_start_time'] ?? '',
      expectedEndTime: json['expected_end_time'] ?? '',
      instructions: json['instructions'],
      status: json['status'] ?? 'assigned',
    );
  }

  bool get isActive => status == 'active';
  bool get isUpcoming => date.isAfter(DateTime.now());
  
  String get formattedDate {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[date.weekday - 1]}, ${date.day}/${date.month}/${date.year}';
  }
}

/// Assignment Service
class AssignmentService {
  final ApiClient _api;

  AssignmentService({ApiClient? api}) : _api = api ?? ApiClient();

  /// Get my assignments (employee sees only location, no client/project)
  Future<List<WorkAssignmentModel>> getMyAssignments() async {
    final response = await _api.get('/employees/my-assignments/');
    final results = response['results'] as List? ?? [];
    return results.map((a) => WorkAssignmentModel.fromJson(a)).toList();
  }
}
