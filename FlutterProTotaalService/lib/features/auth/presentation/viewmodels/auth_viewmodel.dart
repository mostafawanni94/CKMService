/// Auth ViewModel - MVVM Pattern
/// 
/// Handles authentication state and business logic.

import 'package:flutter/foundation.dart';
import '../../data/auth_service.dart';
import '../../../../core/network/api_client.dart';

/// Authentication state
enum AuthState {
  initial,
  loading,
  authenticated,
  unauthenticated,
  needsPasswordChange, // First login - must change temp password
  firstLogin, // Incomplete profile - needs to complete form
  profileRejected, // Rejected by admin - needs to fix and resubmit
  profilePending, // Waiting for admin approval
  error,
}

/// Auth ViewModel
class AuthViewModel extends ChangeNotifier {
  final AuthService _authService;

  AuthState _state = AuthState.initial;
  UserModel? _user;
  String? _error;
  bool _isPasswordResetSent = false;

  AuthViewModel({AuthService? authService})
      : _authService = authService ?? AuthService();

  // Getters
  AuthState get state => _state;
  UserModel? get user => _user;
  String? get error => _error;
  bool get isPasswordResetSent => _isPasswordResetSent;
  bool get isLoading => _state == AuthState.loading;
  bool get isAuthenticated => _state == AuthState.authenticated;
  bool get needsProfileCompletion => _state == AuthState.firstLogin || _state == AuthState.profileRejected;
  bool get isProfilePending => _state == AuthState.profilePending;
  bool get needsPasswordChange => _state == AuthState.needsPasswordChange;

  /// Get the appropriate state based on user profile status
  AuthState _getStateForUser(UserModel user) {
    // Check if password change is required (first login with temp password)
    if (user.mustChangePassword) {
      return AuthState.needsPasswordChange;
    }
    if (user.isApproved) {
      return AuthState.authenticated;
    } else if (user.isRejected) {
      return AuthState.profileRejected;
    } else if (user.isPending) {
      return AuthState.profilePending;
    } else {
      // incomplete or first login
      return AuthState.firstLogin;
    }
  }

  /// Initialize - Check if user is already logged in
  Future<void> initialize() async {
    _state = AuthState.loading;
    notifyListeners();

    try {
      final isLoggedIn = await _authService.isLoggedIn();
      if (isLoggedIn) {
        _user = await _authService.getCurrentUser();
        _state = _getStateForUser(_user!);
      } else {
        _state = AuthState.unauthenticated;
      }
    } catch (e) {
      _state = AuthState.unauthenticated;
    }

    notifyListeners();
  }

  /// Login with email and password
  Future<bool> login(String email, String password) async {
    _state = AuthState.loading;
    _error = null;
    notifyListeners();

    try {
      _user = await _authService.login(email, password);
      _state = _getStateForUser(_user!);
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      // Clean error from API - keep state as unauthenticated to prevent page rebuild
      _error = e.message;
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      // Network or other errors
      String message = e.toString();
      if (message.contains('SocketException') || message.contains('Connection refused')) {
        _error = 'Cannot connect to server. Please check your connection.';
      } else if (message.contains('Exception: ')) {
        _error = message.replaceFirst('Exception: ', '');
      } else {
        _error = 'Login failed. Please try again.';
      }
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  /// Change password (for first-time login)
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    _state = AuthState.loading;
    _error = null;
    notifyListeners();

    try {
      await _authService.changePassword(currentPassword, newPassword);
      // After changing password, update user state
      if (_user != null) {
        _user = _user!.copyWith(mustChangePassword: false);
        _state = _getStateForUser(_user!);
      }
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _state = AuthState.needsPasswordChange;
      notifyListeners();
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _state = AuthState.unauthenticated;
    notifyListeners();
  }

  /// Request password reset
  Future<bool> requestPasswordReset(String email) async {
    _state = AuthState.loading;
    _error = null;
    _isPasswordResetSent = false;
    notifyListeners();

    try {
      await _authService.requestPasswordReset(email);
      _isPasswordResetSent = true;
      _state = AuthState.unauthenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _state = AuthState.error;
      notifyListeners();
      return false;
    }
  }

  /// Mark profile as complete (used after onboarding submission)
  void markProfileSubmitted() {
    if (_user != null) {
      _state = AuthState.profilePending;
      notifyListeners();
    }
  }

  /// Mark profile as approved (when admin approves)
  void markProfileApproved() {
    if (_user != null) {
      _state = AuthState.authenticated;
      notifyListeners();
    }
  }

  /// Clear error
  void clearError() {
    _error = null;
    if (_state == AuthState.error) {
      _state = AuthState.unauthenticated;
    }
    notifyListeners();
  }

  /// Reset password sent flag
  void resetPasswordSentFlag() {
    _isPasswordResetSent = false;
    notifyListeners();
  }
}
