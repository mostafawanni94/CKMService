/// Profile Service - API calls for profile management
/// 
/// Handles profile completion and submission.

import 'dart:io';
import '../../../core/network/api_client.dart';

class ProfileService {
  final ApiClient _api;

  ProfileService({ApiClient? api}) : _api = api ?? ApiClient();

  /// Get current profile
  Future<Map<String, dynamic>> getMyProfile() async {
    return await _api.get('/employees/profiles/my_profile/');
  }

  /// Update profile with text data only
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    return await _api.patch('/employees/profiles/complete_profile/', body: data);
  }

  /// Update profile with files (multipart form data)
  Future<Map<String, dynamic>> updateProfileWithFiles({
    required Map<String, String> fields,
    Map<String, File>? files,
  }) async {
    return await _api.patchWithFiles(
      '/employees/profiles/complete_profile/',
      fields: fields,
      files: files,
    );
  }

  /// Submit profile for approval
  Future<Map<String, dynamic>> submitForApproval() async {
    return await _api.post('/employees/profiles/submit/');
  }

  /// Get available certificate types
  Future<List<Map<String, dynamic>>> getCertificateTypes() async {
    final response = await _api.get('/certificates/types/');
    final results = response['results'] as List? ?? [];
    return results.cast<Map<String, dynamic>>();
  }

  /// Get available document types
  Future<List<Map<String, dynamic>>> getDocumentTypes() async {
    final response = await _api.get('/employees/document-types/');
    final results = response['results'] as List? ?? [];
    return results.cast<Map<String, dynamic>>();
  }

  /// Upload document
  Future<Map<String, dynamic>> uploadDocument(String path, String type) async {
    return await _api.uploadFile(
      '/employees/documents/',
      file: File(path),
      fieldName: 'file',
      fields: {'type': type},
    );
  }
}
