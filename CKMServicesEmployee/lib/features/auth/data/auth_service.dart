/// Auth Service - Authentication API Calls
/// 
/// Handles login, logout, token refresh, and password reset.

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';

/// User model from API
class UserModel {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final bool isFirstLogin;
  final bool mustChangePassword; // True if first login with temp password
  final String profileStatus; // incomplete, pending, approved, rejected
  final String? rejectionReason;

  UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.isFirstLogin,
    this.mustChangePassword = false,
    this.profileStatus = 'incomplete',
    this.rejectionReason,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      role: json['role'] ?? 'employee',
      isFirstLogin: json['is_first_login'] ?? true,
      mustChangePassword: json['must_change_password'] ?? json['is_first_login'] ?? false,
      profileStatus: json['status'] ?? json['profile_status'] ?? 'incomplete',
      rejectionReason: json['rejection_reason'],
    );
  }

  /// Create a copy with updated fields
  UserModel copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    bool? isFirstLogin,
    bool? mustChangePassword,
    String? profileStatus,
    String? rejectionReason,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      isFirstLogin: isFirstLogin ?? this.isFirstLogin,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      profileStatus: profileStatus ?? this.profileStatus,
      rejectionReason: rejectionReason ?? this.rejectionReason,
    );
  }

  String get fullName => '$firstName $lastName'.trim();
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();
  
  bool get isRejected => profileStatus == 'rejected';
  bool get isPending => profileStatus == 'pending';
  bool get isApproved => profileStatus == 'approved';
  bool get isIncomplete => profileStatus == 'incomplete';
  bool get needsProfileCompletion => isIncomplete || isRejected;
}

/// Auth Service
class AuthService {
  final ApiClient _api;
  final SecureStorage _storage;

  AuthService({ApiClient? api, SecureStorage? storage})
      : _api = api ?? ApiClient(),
        _storage = storage ?? SecureStorage();

  /// Login with email and password
  Future<UserModel> login(String email, String password) async {
    final response = await _api.post(
      '/auth/token/',
      body: {'email': email, 'password': password},
      requireAuth: false,
    );

    // Save tokens
    await _storage.saveTokens(
      accessToken: response['access'],
      refreshToken: response['refresh'],
    );

    // Get user profile
    return await getCurrentUser();
  }

  /// Get current user profile
  Future<UserModel> getCurrentUser() async {
    final response = await _api.get('/employees/profiles/my_profile/');
    
    // Backend returns profile with nested 'user' object
    // We need to merge user data with profile-level fields like 'status'
    final userData = response['user'] ?? {};
    
    // Merge profile-level fields with user data
    final mergedData = <String, dynamic>{
      ...Map<String, dynamic>.from(userData),
      // Profile-level fields that user data doesn't have
      'status': response['status'],
      'profile_status': response['status'],
      'first_name': response['first_name'] ?? userData['first_name'] ?? '',
      'last_name': response['last_name'] ?? userData['last_name'] ?? '',
      'rejection_reason': response['rejection_reason'],
    };
    
    return UserModel.fromJson(mergedData);
  }

  /// Logout
  Future<void> logout() async {
    await _storage.clearAll();
  }

  /// Refresh token
  Future<bool> refreshToken() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _api.post(
        '/auth/token/refresh/',
        body: {'refresh': refreshToken},
        requireAuth: false,
      );

      await _storage.saveAccessToken(response['access']);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Request password reset (forgot password)
  Future<void> requestPasswordReset(String email) async {
    await _api.post(
      '/auth/password-reset/',
      body: {'email': email},
      requireAuth: false,
    );
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await _storage.hasTokens();
  }

  /// Change password (for first login or user request)
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.post(
      '/auth/password-change/',
      body: {
        'current_password': oldPassword,
        'new_password': newPassword,
      },
    );
  }
}
