/// System Configuration Service
/// 
/// Fetches and caches system configuration settings from the backend.
/// Config is refreshed on app open if stale (> 24 hours).

import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/network/api_client.dart';

/// System configuration model
class SystemConfig {
  final String weekStartsOn;
  final String weekStartHour;
  final int defaultBreakMinutes;
  final String companyName;
  final DateTime? updatedAt;
  final DateTime cachedAt;

  SystemConfig({
    required this.weekStartsOn,
    required this.weekStartHour,
    required this.defaultBreakMinutes,
    required this.companyName,
    this.updatedAt,
    required this.cachedAt,
  });

  factory SystemConfig.fromJson(Map<String, dynamic> json) {
    return SystemConfig(
      weekStartsOn: json['week_starts_on'] ?? 'monday',
      weekStartHour: json['week_start_hour'] ?? '06:00',
      defaultBreakMinutes: json['default_break_minutes'] ?? 30,
      companyName: json['company_name'] ?? 'Pro Totaal Service',
      updatedAt: json['updated_at'] != null 
          ? DateTime.tryParse(json['updated_at']) 
          : null,
      cachedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'week_starts_on': weekStartsOn,
    'week_start_hour': weekStartHour,
    'default_break_minutes': defaultBreakMinutes,
    'company_name': companyName,
    'updated_at': updatedAt?.toIso8601String(),
    'cached_at': cachedAt.toIso8601String(),
  };

  /// Default config used when API is unavailable
  static SystemConfig defaultConfig() {
    return SystemConfig(
      weekStartsOn: 'monday',
      weekStartHour: '06:00',
      defaultBreakMinutes: 30,
      companyName: 'Pro Totaal Service',
      cachedAt: DateTime.now(),
    );
  }

  /// Check if config is stale (older than 24 hours)
  bool get isStale {
    final staleDuration = const Duration(hours: 24);
    return DateTime.now().difference(cachedAt) > staleDuration;
  }

  /// Week starts on Monday (ISO 8601)
  bool get weekStartsOnMonday => weekStartsOn.toLowerCase() == 'monday';

  /// Get week start hour as integer (e.g., 6 for "06:00")
  int get weekStartHourInt {
    try {
      return int.parse(weekStartHour.split(':')[0]);
    } catch (_) {
      return 6;
    }
  }
}

/// System Configuration Service with caching
class SystemConfigService {
  static const String _cacheKey = 'system_config';
  
  final ApiClient _api;
  SystemConfig? _cachedConfig;

  SystemConfigService({ApiClient? api}) : _api = api ?? ApiClient();

  /// Get config from cache or API
  /// Call this on app startup
  Future<SystemConfig> getConfig({bool forceRefresh = false}) async {
    // Return memory cache if available and not forcing refresh
    if (_cachedConfig != null && !_cachedConfig!.isStale && !forceRefresh) {
      return _cachedConfig!;
    }

    // Try to load from SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    final cachedJson = prefs.getString(_cacheKey);

    if (cachedJson != null && !forceRefresh) {
      try {
        final json = jsonDecode(cachedJson);
        final config = SystemConfig(
          weekStartsOn: json['week_starts_on'] ?? 'monday',
          weekStartHour: json['week_start_hour'] ?? '06:00',
          defaultBreakMinutes: json['default_break_minutes'] ?? 30,
          companyName: json['company_name'] ?? 'Pro Totaal Service',
          updatedAt: json['updated_at'] != null 
              ? DateTime.tryParse(json['updated_at'])
              : null,
          cachedAt: json['cached_at'] != null 
              ? DateTime.parse(json['cached_at'])
              : DateTime.now().subtract(const Duration(days: 2)),
        );

        // If not stale, use cached version
        if (!config.isStale) {
          _cachedConfig = config;
          return config;
        }
      } catch (_) {
        // Parse error, fetch fresh
      }
    }

    // Fetch from API
    return await _fetchFromApi(prefs);
  }

  /// Fetch fresh config from API
  Future<SystemConfig> _fetchFromApi(SharedPreferences prefs) async {
    try {
      // Try public endpoint first (no auth required)
      final response = await _api.get('/settings/config/public/', requireAuth: false);
      
      if (response != null) {
        final config = SystemConfig.fromJson(response);
        _cachedConfig = config;
        
        // Save to SharedPreferences
        await prefs.setString(_cacheKey, jsonEncode(config.toJson()));
        
        return config;
      }
    } catch (e) {
      // API error, try authenticated endpoint
      try {
        final response = await _api.get('/settings/config/');
        if (response != null) {
          final config = SystemConfig.fromJson(response);
          _cachedConfig = config;
          await prefs.setString(_cacheKey, jsonEncode(config.toJson()));
          return config;
        }
      } catch (_) {
        // Both endpoints failed
      }
    }

    // Return default if all fails
    final defaultConfig = SystemConfig.defaultConfig();
    _cachedConfig = defaultConfig;
    return defaultConfig;
  }

  /// Force refresh config from API
  Future<SystemConfig> refreshConfig() async {
    return getConfig(forceRefresh: true);
  }

  /// Clear cached config (e.g., on logout)
  Future<void> clearCache() async {
    _cachedConfig = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cacheKey);
  }

  /// Get current cached config (synchronous, returns null if not loaded)
  SystemConfig? get currentConfig => _cachedConfig;
}

/// Global singleton instance
final systemConfigService = SystemConfigService();
