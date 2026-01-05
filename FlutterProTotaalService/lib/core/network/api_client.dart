/// API Client - Network Layer
/// 
/// Handles all HTTP communication with the backend.

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
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

/// Main API Client
class ApiClient {
  // For Android Emulator: 10.0.2.2 maps to host machine's localhost
  // For iOS Simulator: use localhost or 127.0.0.1
  // For real device: use your Mac's IP address (e.g., 192.168.x.x)
  // TODO: For production, use _prodBaseUrl. For development with real device, use your Mac's IP.
  // Your Mac's current IP: 192.168.2.40 (run `ipconfig getifaddr en0` to check)
  static String get _devBaseUrl {
    // For real devices on same WiFi: use Mac's IP address (192.168.x.x)
    // For Android Emulator: 10.0.2.2 maps to host machine's localhost
    // For iOS Simulator: use localhost or 127.0.0.1
    if (Platform.isIOS) {
      return 'http://localhost:8000/api'; // iOS Simulator
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000/api'; // Android Emulator
    }
    return 'http://localhost:8000/api';
  }
  static const String _prodBaseUrl = 'https://api.prototaalservice.nl/api';
  
  final String baseUrl;
  final SecureStorage _storage;
  
  ApiClient({String? baseUrl, SecureStorage? storage})
      : baseUrl = baseUrl ?? _devBaseUrl,
        _storage = storage ?? SecureStorage();

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
  Future<dynamic> get(String endpoint, {bool requireAuth = true}) async {
    final headers = await _getHeaders(requireAuth: requireAuth);
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  /// POST request
  Future<dynamic> post(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) async {
    final headers = await _getHeaders(requireAuth: requireAuth);
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// PUT request
  Future<dynamic> put(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) async {
    final headers = await _getHeaders(requireAuth: requireAuth);
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// PATCH request
  Future<dynamic> patch(String endpoint, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) async {
    final headers = await _getHeaders(requireAuth: requireAuth);
    final response = await http.patch(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// DELETE request
  Future<dynamic> delete(String endpoint, {bool requireAuth = true}) async {
    final headers = await _getHeaders(requireAuth: requireAuth);
    final response = await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );
    return _handleResponse(response);
  }

  /// Upload file with multipart
  Future<dynamic> uploadFile(String endpoint, {
    required File file,
    required String fieldName,
    Map<String, String>? fields,
  }) async {
    final token = await _storage.getAccessToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$endpoint'));
    
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    request.files.add(await http.MultipartFile.fromPath(fieldName, file.path));
    
    if (fields != null) {
      request.fields.addAll(fields);
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }

  /// PATCH with files (multipart form data)
  Future<dynamic> patchWithFiles(String endpoint, {
    Map<String, String>? fields,
    Map<String, File>? files,
  }) async {
    final token = await _storage.getAccessToken();
    final request = http.MultipartRequest('PATCH', Uri.parse('$baseUrl$endpoint'));
    
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

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

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }
}
