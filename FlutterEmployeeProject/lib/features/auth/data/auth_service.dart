// Auth Service — Handles login/logout and session state

import 'package:flutter/foundation.dart';
import 'package:ckm_customer_portal/core/network/api_client.dart';

class AuthService extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  
  bool _isLoading = false;
  bool _isLoggedIn = false;
  String? _error;
  Map<String, dynamic>? _userProfile;
  
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  String? get error => _error;
  Map<String, dynamic>? get userProfile => _userProfile;
  
  /// Initialize — check if already logged in
  Future<void> init() async {
    await _api.init();
    _isLoggedIn = _api.isLoggedIn;
    
    if (_isLoggedIn) {
      try {
        await loadProfile();
      } catch (e) {
        // Token might be expired
        _isLoggedIn = false;
      }
    }
    notifyListeners();
  }
  
  /// Login with credentials
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      await _api.login(email, password);
      await loadProfile();
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection error. Please check your internet.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
  
  /// Load customer profile
  Future<void> loadProfile() async {
    try {
      _userProfile = await _api.get('/customer-portal/profile/');
    } catch (e) {
      debugPrint('Failed to load profile: $e');
    }
  }
  
  /// Logout
  Future<void> logout() async {
    await _api.logout();
    _isLoggedIn = false;
    _userProfile = null;
    notifyListeners();
  }
  
  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
