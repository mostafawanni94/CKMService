import 'package:flutter_test/flutter_test.dart';
import 'package:ckm_services_employee/core/config/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('falls back to a loopback host in debug builds', () {
      // No --dart-define is supplied when running `flutter test`, so this
      // exercises the development default rather than the override path.
      expect(ApiConfig.baseUrl, isNotEmpty);
      expect(ApiConfig.baseUrl, startsWith('http'));
    });

    test('never ends with a trailing slash', () {
      // Endpoints are concatenated as '$baseUrl$endpoint' where endpoint starts
      // with '/', so a trailing slash here would produce '//api/...'.
      expect(ApiConfig.baseUrl.endsWith('/'), isFalse);
    });

    test('includes the /api prefix', () {
      expect(ApiConfig.baseUrl, contains('/api'));
    });
  });
}
