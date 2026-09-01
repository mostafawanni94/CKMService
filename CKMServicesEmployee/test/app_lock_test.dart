import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ckm_services_employee/core/security/app_lock_service.dart';

/// In-memory stand-in so the tests do not touch the platform keystore.
class _MemoryStorage extends FlutterSecureStorage {
  const _MemoryStorage(this._store);
  final Map<String, String> _store;

  @override
  Future<String?> read({required String key, /* ignored */ dynamic iOptions,
      dynamic aOptions, dynamic lOptions, dynamic webOptions,
      dynamic mOptions, dynamic wOptions}) async => _store[key];

  @override
  Future<void> write({required String key, required String? value,
      dynamic iOptions, dynamic aOptions, dynamic lOptions, dynamic webOptions,
      dynamic mOptions, dynamic wOptions}) async {
    if (value == null) { _store.remove(key); } else { _store[key] = value; }
  }

  @override
  Future<void> delete({required String key, dynamic iOptions, dynamic aOptions,
      dynamic lOptions, dynamic webOptions, dynamic mOptions,
      dynamic wOptions}) async => _store.remove(key);
}

void main() {
  late Map<String, String> store;
  late AppLockService lock;

  setUp(() {
    store = {};
    lock = AppLockService(storage: _MemoryStorage(store));
  });

  group('PIN storage', () {
    test('the PIN is never stored in clear text', () async {
      await lock.setPin('13579');
      expect(store.values.contains('13579'), isFalse);
      expect(store['app_lock_pin_hash'], isNotNull);
      expect(store['app_lock_pin_hash'], isNot(contains('13579')));
    });

    test('two identical PINs hash differently thanks to the salt', () async {
      await lock.setPin('13579');
      final first = store['app_lock_pin_hash'];
      await lock.setPin('13579');
      expect(store['app_lock_pin_hash'], isNot(first));
    });

    test('the correct PIN unlocks', () async {
      await lock.setPin('13579');
      expect(await lock.unlockWithPin('13579'), UnlockResult.success);
    });

    test('a wrong PIN fails without unlocking', () async {
      await lock.setPin('13579');
      expect(await lock.unlockWithPin('00000'), UnlockResult.failed);
    });
  });

  group('brute force', () {
    test('the PIN is cleared and the user locked out after 5 wrong tries', () async {
      await lock.setPin('13579');
      for (var i = 1; i < AppLockService.maxPinAttempts; i++) {
        expect(await lock.unlockWithPin('00000'), UnlockResult.failed);
      }
      expect(await lock.unlockWithPin('00000'), UnlockResult.lockedOut);
      expect(await lock.hasPin, isFalse);
    });

    test('a correct PIN resets the attempt counter', () async {
      await lock.setPin('13579');
      await lock.unlockWithPin('00000');
      await lock.unlockWithPin('00000');
      await lock.unlockWithPin('13579');
      expect(await lock.remainingAttempts(), AppLockService.maxPinAttempts);
    });
  });

  group('preferences', () {
    test('the lock is off until it is switched on', () async {
      expect(await lock.isEnabled, isFalse);
      await lock.setEnabled(true);
      expect(await lock.isEnabled, isTrue);
    });

    test('turning the lock off forgets the PIN', () async {
      await lock.setPin('13579');
      await lock.setEnabled(false);
      expect(await lock.hasPin, isFalse);
    });

    test('reset clears everything, so the next user cannot reuse the PIN', () async {
      await lock.setEnabled(true);
      await lock.setPin('13579');
      await lock.reset();
      expect(await lock.hasPin, isFalse);
      expect(await lock.isEnabled, isFalse);
    });

    test('unlocking with no PIN set asks for setup', () async {
      expect(await lock.unlockWithPin('13579'), UnlockResult.needsPinSetup);
    });
  });
}
