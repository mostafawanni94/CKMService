/// API Client - Network Layer
/// 
/// Handles all HTTP communication with the backend.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../storage/secure_storage.dart';

/// API Exception for handling errors
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? errors;

  ApiException(this.message, {this.statusCode, this.errors});

  @override
  String toString() => message;
}

/// API Response wrapper
class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool success;

  ApiResponse.success(this.data) : error = null, success = true;
  ApiResponse.error(this.error) : data = null, success = false;
}

/// Raised when the refresh token is gone or rejected and the user has to sign
/// in again. Listen for this to route back to the login screen.
class SessionExpiredException extends ApiException {
  SessionExpiredException()
      : super('Session expired. Please sign in again.', statusCode: 401);
}

/// Main API Client
class ApiClient {
  /// Base URL comes from --dart-define=API_BASE_URL; see [ApiConfig].
  final String baseUrl;
  final SecureStorage _storage;

  /// Invoked once when the session cannot be renewed, so the app can sign out.
  static void Function()? onSessionExpired;

  /// Guards against a burst of concurrent 401s each firing its own refresh.
  static Future<bool>? _inFlightRefresh;

  ApiClient({String? baseUrl, SecureStorage? storage})
      : baseUrl = baseUrl ?? ApiConfig.baseUrl,
        _storage = storage ?? SecureStorage();

  /// Exchange the refresh token for a new access token.
  ///
  /// Access tokens are short-lived now (one hour by default), so this runs
  /// routinely. Previously `AuthService.refreshToken()` existed but nothing
  /// ever called it, and the app simply broke when the token aged out.
  Future<bool> _refreshAccessToken() async {
    // Coalesce: if a refresh is already running, await that one.
    final pending = _inFlightRefresh;
    if (pending != null) return pending;

    final completer = Completer<bool>();
    _inFlightRefresh = completer.future;
    try {
      final refresh = await _storage.getRefreshToken();
      if (refresh == null || refresh.isEmpty) {
        completer.complete(false);
        return false;
      }

      final response = await http.post(
        Uri.parse('$baseUrl/auth/token/refresh/'),
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode({'refresh': refresh}),
      );

      if (response.statusCode != 200) {
        completer.complete(false);
        return false;
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final access = body['access'] as String?;
      if (access == null) {
        completer.complete(false);
        return false;
      }
      await _storage.saveAccessToken(access);

      // ROTATE_REFRESH_TOKENS is on server-side, so a new refresh token comes
      // back with the response and the old one is blacklisted. Store it or the
      // next refresh will present a revoked token.
      final rotated = body['refresh'] as String?;
      if (rotated != null && rotated.isNotEmpty) {
        await _storage.saveRefreshToken(rotated);
      }

      completer.complete(true);
      return true;
    } catch (_) {
      completer.complete(false);
      return false;
    } finally {
      _inFlightRefresh = null;
    }
  }

  /// Run [send], and if it comes back 401, refresh once and run it again.
  Future<dynamic> _withRefresh(
    Future<http.Response> Function() send, {
    bool requireAuth = true,
  }) async {
    var response = await send();
    if (response.statusCode == 401 && requireAuth) {
      if (await _refreshAccessToken()) {
        response = await send();
      } else {
        await _storage.clearAll();
        onSessionExpired?.call();
        throw SessionExpiredException();
      }
    }
    return _handleResponse(response);
  }

  /// Get authorization headers
  Future<Map<String, String>> _getHeaders({bool requireAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requireAuth) {
      final token = await _storage.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  /// Handle response
  dynamic _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    String message = 'Request failed';
    if (body is Map) {
      // Try to get error message from various DRF formats
      if (body.containsKey('detail')) {
        message = body['detail'].toString();
      } else if (body.containsKey('message')) {
        message = body['message'].toString();
      } else if (body.containsKey('non_field_errors')) {
        final errors = body['non_field_errors'];
        message = errors is List ? errors.join(', ') : errors.toString();
      } else {
        // Extract first field error for validation errors
        for (var key in body.keys) {
          final value = body[key];
          if (value is List && value.isNotEmpty) {
            message = value.first.toString();
            break;
          } else if (value is String) {
            message = value;
            break;
          }
        }
      }
    }

    throw ApiException(
      message,
      statusCode: response.statusCode,
      errors: body is Map ? Map<String, dynamic>.from(body) : null,
    );
  }

  /// GET request
  Future<dynamic> get(String endpoint, {bool requireAuth = true}) {
    return _withRefresh(
      () async => http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  /// POST request
  Future<dynamic> post(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) {
    return _withRefresh(
      () async => http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
        body: body != null ? jsonEncode(body) : null,
      ),
      requireAuth: requireAuth,
    );
  }

  /// PUT request
  Future<dynamic> put(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) {
    return _withRefresh(
      () async => http.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
        body: body != null ? jsonEncode(body) : null,
      ),
      requireAuth: requireAuth,
    );
  }

  /// PATCH request
  Future<dynamic> patch(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) {
    return _withRefresh(
      () async => http.patch(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
        body: body != null ? jsonEncode(body) : null,
      ),
      requireAuth: requireAuth,
    );
  }

  /// DELETE request
  Future<dynamic> delete(String endpoint, {bool requireAuth = true}) {
    return _withRefresh(
      () async => http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(requireAuth: requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  /// Upload file with multipart
  Future<dynamic> uploadFile(String endpoint, {
    required File file,
    required String fieldName,
    Map<String, String>? fields,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$endpoint'));

    request.files.add(await http.MultipartFile.fromPath(fieldName, file.path));
    
    if (fields != null) {
      request.fields.addAll(fields);
    }

    return _sendMultipart(request);
  }

  /// PATCH with files (multipart form data)
  Future<dynamic> patchWithFiles(String endpoint, {
    Map<String, String>? fields,
    Map<String, File>? files,
  }) async {
    final request = http.MultipartRequest('PATCH', Uri.parse('$baseUrl$endpoint'));

    // Add text fields
    if (fields != null) {
      request.fields.addAll(fields);
    }

    // Add files
    if (files != null) {
      for (var entry in files.entries) {
        request.files.add(await http.MultipartFile.fromPath(entry.key, entry.value.path));
      }
    }

    return _sendMultipart(request);
  }

  /// Send a multipart request, refreshing the token once on a 401.
  ///
  /// A `MultipartRequest` cannot be replayed after `send()`, so the caller's
  /// request is rebuilt from its own fields and files for the retry.
  Future<dynamic> _sendMultipart(http.MultipartRequest request) async {
    Future<http.Response> fire() async {
      final replay = http.MultipartRequest(request.method, request.url)
        ..fields.addAll(request.fields)
        ..files.addAll(request.files);
      final token = await _storage.getAccessToken();
      if (token != null) {
        replay.headers['Authorization'] = 'Bearer $token';
      }
      return http.Response.fromStream(await replay.send());
    }

    var response = await fire();
    if (response.statusCode == 401) {
      if (await _refreshAccessToken()) {
        response = await fire();
      } else {
        await _storage.clearAll();
        onSessionExpired?.call();
        throw SessionExpiredException();
      }
    }
    return _handleResponse(response);
  }
}
