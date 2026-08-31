/// Compile-time API configuration for the customer portal.
///
/// The base URL used to be a hardcoded LAN address
/// (`http://192.168.2.47:8000/api`), so the app only worked on one network and
/// could not be released at all. Supply it at build time instead:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.2.40:8000/api
///   flutter build apk --dart-define=API_BASE_URL=https://api.ckmservices.nl/api
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

class ApiConfig {
  const ApiConfig._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// Base URL for all API calls, including the `/api` prefix and no trailing slash.
  static String get baseUrl {
    if (_override.isNotEmpty) {
      return _stripTrailingSlash(_override);
    }
    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL was not provided for this release build. Rebuild with '
        '--dart-define=API_BASE_URL=https://your-api-host/api',
      );
    }
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:8000/api';
    }
    return 'http://127.0.0.1:8000/api';
  }

  static String _stripTrailingSlash(String value) =>
      value.endsWith('/') ? value.substring(0, value.length - 1) : value;
}
