/// App lock: biometric first, PIN as the fallback.
///
/// The app holds a long-lived refresh token, so possession of an unlocked phone
/// is otherwise enough to read someone's payslips, BSN and contracts. This adds
/// a second check that the person holding the device is the account holder.
///
/// Flow:
///   1. Face ID / fingerprint if the device has it enrolled.
///   2. PIN if biometrics are unavailable, not enrolled, permission was denied,
///      or the biometric attempt failed.
///
/// The PIN is never stored. Only a salted SHA-256 hash goes into secure storage,
/// so reading the keystore does not reveal it.
library;

import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;

/// Why an unlock attempt ended, so the UI knows what to show next.
enum UnlockResult {
  success,

  /// The user cancelled, or biometrics failed. Offer the PIN.
  needsPin,

  /// A PIN was required but none has been set up yet.
  needsPinSetup,

  /// Too many wrong PINs; the caller should sign the user out.
  lockedOut,

  failed,
}

class AppLockService extends ChangeNotifier {
  static const _enabledKey = 'app_lock_enabled';
  static const _pinHashKey = 'app_lock_pin_hash';
  static const _pinSaltKey = 'app_lock_pin_salt';
  static const _attemptsKey = 'app_lock_failed_attempts';

  static const maxPinAttempts = 5;
  static const pinLength = 5;

  final FlutterSecureStorage _storage;
  final LocalAuthentication _auth;

  AppLockService({FlutterSecureStorage? storage, LocalAuthentication? auth})
      : _storage = storage ?? const FlutterSecureStorage(),
        _auth = auth ?? LocalAuthentication();

  bool _isLocked = false;

  /// True while the app should be covered by the lock screen.
  bool get isLocked => _isLocked;

  // ── Preferences ──────────────────────────────────────────────────────────

  Future<bool> get isEnabled async =>
      (await _storage.read(key: _enabledKey)) == 'true';

  Future<void> setEnabled(bool value) async {
    await _storage.write(key: _enabledKey, value: value ? 'true' : 'false');
    if (!value) await _clearPin();
    notifyListeners();
  }

  Future<bool> get hasPin async => (await _storage.read(key: _pinHashKey)) != null;

  // ── Device capability ────────────────────────────────────────────────────

  /// Biometric types the device can actually use right now.
  Future<List<BiometricType>> availableBiometrics() async {
    try {
      if (!await _auth.isDeviceSupported()) return const [];
      if (!await _auth.canCheckBiometrics) return const [];
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return const [];
    }
  }

  /// A label for the button: "Face ID", "Fingerprint", or null when unavailable.
  Future<String?> biometricLabel() async {
    final types = await availableBiometrics();
    if (types.isEmpty) return null;
    if (types.contains(BiometricType.face)) return 'Face ID';
    if (types.contains(BiometricType.fingerprint) ||
        types.contains(BiometricType.strong)) {
      return 'Fingerprint';
    }
    return 'Biometrics';
  }

  // ── Unlocking ────────────────────────────────────────────────────────────

  /// Try biometrics. Falls back to the PIN for every failure mode.
  Future<UnlockResult> unlockWithBiometrics({
    String reason = 'Confirm it is you to open CKM Services',
  }) async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
      if (ok) {
        await _resetAttempts();
        _isLocked = false;
        notifyListeners();
        return UnlockResult.success;
      }
      return _pinFallback();
    } on PlatformException catch (e) {
      // No hardware, nothing enrolled, permission refused, or locked out after
      // too many biometric attempts — all mean "ask for the PIN instead".
      if (e.code == auth_error.notAvailable ||
          e.code == auth_error.notEnrolled ||
          e.code == auth_error.passcodeNotSet ||
          e.code == auth_error.lockedOut ||
          e.code == auth_error.permanentlyLockedOut) {
        debugPrint('AppLock: biometrics unusable (${e.code}); falling back to PIN');
      } else {
        debugPrint('AppLock: biometric error ${e.code}');
      }
      return _pinFallback();
    }
  }

  Future<UnlockResult> _pinFallback() async =>
      await hasPin ? UnlockResult.needsPin : UnlockResult.needsPinSetup;

  /// Check a PIN. Counts failures and reports lockout so the caller signs out.
  Future<UnlockResult> unlockWithPin(String pin) async {
    final salt = await _storage.read(key: _pinSaltKey);
    final expected = await _storage.read(key: _pinHashKey);
    if (salt == null || expected == null) return UnlockResult.needsPinSetup;

    if (_hash(pin, salt) == expected) {
      await _resetAttempts();
      _isLocked = false;
      notifyListeners();
      return UnlockResult.success;
    }

    final attempts = await _bumpAttempts();
    if (attempts >= maxPinAttempts) {
      await _clearPin();
      return UnlockResult.lockedOut;
    }
    return UnlockResult.failed;
  }

  Future<int> remainingAttempts() async =>
      maxPinAttempts - await _readAttempts();

  // ── PIN management ───────────────────────────────────────────────────────

  Future<void> setPin(String pin) async {
    final salt = _newSalt();
    await _storage.write(key: _pinSaltKey, value: salt);
    await _storage.write(key: _pinHashKey, value: _hash(pin, salt));
    await _resetAttempts();
    notifyListeners();
  }

  Future<void> _clearPin() async {
    await _storage.delete(key: _pinHashKey);
    await _storage.delete(key: _pinSaltKey);
    await _resetAttempts();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /// Re-lock, e.g. when the app is backgrounded.
  Future<void> lock() async {
    if (!await isEnabled) return;
    _isLocked = true;
    notifyListeners();
  }

  /// Called on sign-out: drop the PIN so the next user cannot reuse it.
  Future<void> reset() async {
    await _clearPin();
    await _storage.delete(key: _enabledKey);
    _isLocked = false;
    notifyListeners();
  }

  // ── Internals ────────────────────────────────────────────────────────────

  String _newSalt() {
    final rng = Random.secure();
    return base64Url.encode(List<int>.generate(16, (_) => rng.nextInt(256)));
  }

  String _hash(String pin, String salt) =>
      sha256.convert(utf8.encode('$salt:$pin')).toString();

  Future<int> _readAttempts() async =>
      int.tryParse(await _storage.read(key: _attemptsKey) ?? '0') ?? 0;

  Future<int> _bumpAttempts() async {
    final next = await _readAttempts() + 1;
    await _storage.write(key: _attemptsKey, value: '$next');
    return next;
  }

  Future<void> _resetAttempts() async =>
      _storage.write(key: _attemptsKey, value: '0');
}
