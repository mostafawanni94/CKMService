// Project Service — API calls for customer portal projects

import 'package:ckm_customer_portal/core/network/api_client.dart';

class ProjectService {
  final ApiClient _api = ApiClient();

  /// Get all projects for this customer
  Future<List<Map<String, dynamic>>> getProjects({String? status, String? search}) async {
    String url = '/customer-portal/projects/?';
    if (status != null) url += 'status=$status&';
    if (search != null && search.isNotEmpty) url += 'search=$search&';
    
    final response = await _api.get(url);
    final results = response['results'] as List? ?? [];
    return results.cast<Map<String, dynamic>>();
  }

  /// Get project detail
  Future<Map<String, dynamic>> getProjectDetail(String projectId) async {
    return await _api.get('/customer-portal/projects/$projectId/');
  }

  /// Get work entries for a project
  Future<Map<String, dynamic>> getProjectEntries(
    String projectId, {
    String? dateFrom,
    String? dateTo,
    String? employeeName,
    String? status,
    String? workDate,
    int page = 1,
    int pageSize = 20,
  }) async {
    String url = '/customer-portal/projects/$projectId/entries/?page=$page&page_size=$pageSize';
    if (dateFrom != null) url += '&date_from=$dateFrom';
    if (dateTo != null) url += '&date_to=$dateTo';
    if (employeeName != null && employeeName.isNotEmpty) url += '&employee_name=$employeeName';
    if (status != null) url += '&status=$status';
    if (workDate != null) url += '&work_date=$workDate';
    
    return await _api.get(url);
  }

  /// Get single work entry detail
  Future<Map<String, dynamic>> getEntryDetail(String entryId) async {
    return await _api.get('/customer-portal/entries/$entryId/');
  }

  /// Get calendar data for a project
  Future<Map<String, dynamic>> getProjectCalendar(String projectId, {int? year, int? month}) async {
    String url = '/customer-portal/projects/$projectId/calendar/?';
    if (year != null) url += 'year=$year&';
    if (month != null) url += 'month=$month&';
    return await _api.get(url);
  }

  /// Download Excel report for a project — returns raw bytes
  Future<List<int>> exportExcel(String projectId, String dateFrom, String dateTo) async {
    final response = await _api.downloadFile(
      '/customer-portal/projects/$projectId/export/?date_from=$dateFrom&date_to=$dateTo',
    );
    return response.bodyBytes;
  }
}
