// API Client for Customer Portal
// Handles JWT authentication, token refresh, and API calls.

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  // Local testing URL (use Mac IP for physical devices, localhost for simulators)
  static const String baseUrl = 'http://192.168.2.47:8000/api';
  
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  String? _accessToken;
  String? _refreshToken;
  
  // Singleton
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();
  
  /// Initialize — load tokens from storage
  Future<void> init() async {
    _accessToken = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');
  }
  
  /// Login with email and password
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/token/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _accessToken = data['access'];
      _refreshToken = data['refresh'];
      await _storage.write(key: 'access_token', value: _accessToken);
      await _storage.write(key: 'refresh_token', value: _refreshToken);
      return data;
    } else {
      final error = jsonDecode(response.body);
      throw ApiException(
        statusCode: response.statusCode,
        message: error['detail'] ?? 'Login failed',
      );
    }
  }
  
  /// Logout — clear tokens
  Future<void> logout() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }
  
  /// Check if user is logged in
  bool get isLoggedIn => _accessToken != null;
  
  /// GET request
  Future<dynamic> get(String path) async {
    final response = await _authenticatedRequest('GET', path);
    return jsonDecode(response.body);
  }
  
  /// POST request
  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final response = await _authenticatedRequest('POST', path, body: body);
    return jsonDecode(response.body);
  }
  
  /// Download file (returns raw bytes) — used for Excel export
  Future<http.Response> downloadFile(String path) async {
    return await _authenticatedRequest('GET', path);
  }
  
  /// Get the full download URL with auth token for opening in browser/share
  String getDownloadUrl(String path) {
    return '$baseUrl$path';
  }
  
  String? get accessToken => _accessToken;
  
  /// Authenticated HTTP request with auto token refresh
  Future<http.Response> _authenticatedRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    var response = await _makeRequest(method, path, body: body);
    
    // Token expired — try refresh
    if (response.statusCode == 401 && _refreshToken != null) {
      final refreshed = await _refreshAccessToken();
      if (refreshed) {
        response = await _makeRequest(method, path, body: body);
      } else {
        throw ApiException(statusCode: 401, message: 'Session expired. Please login again.');
      }
    }
    
    if (response.statusCode >= 400) {
      String message = 'Request failed';
      try {
        final error = jsonDecode(response.body);
        message = error['detail'] ?? error['error'] ?? jsonEncode(error);
      } catch (_) {}
      throw ApiException(statusCode: response.statusCode, message: message);
    }
    
    return response;
  }
  
  Future<http.Response> _makeRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) {
    final uri = Uri.parse('$baseUrl$path');
    final headers = {
      'Content-Type': 'application/json',
      if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
    };
    
    switch (method) {
      case 'POST':
        return http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
      case 'PATCH':
        return http.patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
      default:
        return http.get(uri, headers: headers);
    }
  }
  
  Future<bool> _refreshAccessToken() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/token/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': _refreshToken}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _accessToken = data['access'];
        await _storage.write(key: 'access_token', value: _accessToken);
        return true;
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
    }
    return false;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  
  ApiException({required this.statusCode, required this.message});
  
  @override
  String toString() => 'ApiException($statusCode): $message';
}
