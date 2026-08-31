import 'package:ckm_customer_portal/core/config/api_config.dart';
import 'package:ckm_customer_portal/core/network/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ApiConfig', () {
    test('provides a development default when no override is supplied', () {
      expect(ApiConfig.baseUrl, isNotEmpty);
      expect(ApiConfig.baseUrl, startsWith('http'));
    });

    test('never ends with a trailing slash', () {
      expect(ApiConfig.baseUrl.endsWith('/'), isFalse);
    });

    test('is no longer pinned to a hardcoded LAN address', () {
      // The base URL used to be 'http://192.168.2.47:8000/api', which meant the
      // app only worked on one network and could not be released.
      expect(ApiConfig.baseUrl, isNot(contains('192.168.2.47')));
    });
  });

  group('ApiClient', () {
    test('reads its base URL from ApiConfig', () {
      expect(ApiClient.baseUrl, ApiConfig.baseUrl);
    });

    test('exposes a session-expiry hook the app shell can subscribe to', () {
      var called = false;
      ApiClient.onSessionExpired = () => called = true;
      ApiClient.onSessionExpired?.call();
      expect(called, isTrue);
      ApiClient.onSessionExpired = null;
    });
  });

  group('ApiException', () {
    test('carries the status code and message', () {
      final error = ApiException(statusCode: 401, message: 'Session expired');
      expect(error.statusCode, 401);
      expect(error.message, 'Session expired');
    });
  });
}
