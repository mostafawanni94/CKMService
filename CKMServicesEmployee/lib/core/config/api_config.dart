/// Compile-time API configuration.
///
/// The base URL used to be hardcoded to `http://127.0.0.1:8000/api`, which
/// meant the app could not be built for anything but the iOS simulator without
/// editing source. It is now supplied at build time:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.2.40:8000/api
///   flutter build apk --dart-define=API_BASE_URL=https://api.ckmservices.nl/api
///
/// When nothing is supplied, a sensible per-platform development default is
/// used: 10.0.2.2 on Android (the emulator's alias for the host machine) and
/// 127.0.0.1 elsewhere.
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
      // The Android emulator reaches the host machine on 10.0.2.2.
      return 'http://10.0.2.2:8000/api';
    }
    return 'http://127.0.0.1:8000/api';
  }

  static String _stripTrailingSlash(String value) =>
      value.endsWith('/') ? value.substring(0, value.length - 1) : value;
}
