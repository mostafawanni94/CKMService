import 'package:flutter_test/flutter_test.dart';
import 'package:pro_totaal_service/core/network/api_client.dart';

void main() {
  group('ApiException', () {
    test('stringifies to its message', () {
      final error = ApiException('Something broke', statusCode: 500);
      expect(error.toString(), 'Something broke');
      expect(error.statusCode, 500);
    });

    test('carries field errors from a DRF validation response', () {
      final error = ApiException(
        'Invalid',
        statusCode: 400,
        errors: {'email': ['This field is required.']},
      );
      expect(error.errors!['email'], isA<List<dynamic>>());
    });
  });

  group('SessionExpiredException', () {
    test('is an ApiException carrying 401', () {
      final error = SessionExpiredException();
      expect(error, isA<ApiException>());
      expect(error.statusCode, 401);
      expect(error.toString(), contains('sign in again'));
    });
  });

  group('ApiClient', () {
    test('uses ApiConfig when no base URL is supplied', () {
      expect(ApiClient().baseUrl, isNotEmpty);
    });

    test('accepts an explicit base URL for tests and staging builds', () {
      expect(
        ApiClient(baseUrl: 'https://staging.example.com/api').baseUrl,
        'https://staging.example.com/api',
      );
    });

    test('exposes a session-expiry hook the app shell can subscribe to', () {
      var called = false;
      ApiClient.onSessionExpired = () => called = true;
      ApiClient.onSessionExpired?.call();
      expect(called, isTrue);
      ApiClient.onSessionExpired = null;
    });
  });
}
