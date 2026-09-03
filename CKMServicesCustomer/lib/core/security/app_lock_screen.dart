/// The screen shown while the app is locked.
///
/// Prompts biometrics on open, and falls back to a PIN pad whenever biometrics
/// are unavailable, refused, or fail.
library;

import 'package:flutter/material.dart';

import 'app_lock_service.dart';
import '../../core/localization/app_strings.dart';

class AppLockScreen extends StatefulWidget {
  const AppLockScreen({
    super.key,
    required this.lock,
    required this.onUnlocked,
    required this.onSignOut,
  });

  final AppLockService lock;
  final VoidCallback onUnlocked;

  /// Called after too many wrong PINs, or when the user gives up.
  final VoidCallback onSignOut;

  @override
  State<AppLockScreen> createState() => _AppLockScreenState();
}

class _AppLockScreenState extends State<AppLockScreen> {
  final _pinController = TextEditingController();
  bool _showPin = false;
  bool _settingUp = false;
  bool _busy = false;
  String? _error;
  String? _biometricLabel;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    _biometricLabel = await widget.lock.biometricLabel();
    if (mounted) setState(() {});
    await _tryBiometrics();
  }

  Future<void> _tryBiometrics() async {
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    final result = await widget.lock.unlockWithBiometrics();
    if (!mounted) return;
    setState(() => _busy = false);
    _handle(result);
  }

  Future<void> _submitPin() async {
    final pin = _pinController.text.trim();
    if (pin.length < AppLockService.pinLength) {
      setState(() => _error = 'Enter your ${AppLockService.pinLength}-digit PIN.');
      return;
    }

    setState(() { _busy = true; _error = null; });
    if (_settingUp) {
      await widget.lock.setPin(pin);
      if (!mounted) return;
      setState(() => _busy = false);
      widget.onUnlocked();
      return;
    }

    final result = await widget.lock.unlockWithPin(pin);
    if (!mounted) return;
    setState(() => _busy = false);
    _pinController.clear();
    if (result == UnlockResult.failed) {
      final left = await widget.lock.remainingAttempts();
      if (mounted) {
        setState(() => _error = 'Wrong PIN. $left attempt${left == 1 ? '' : 's'} left.');
      }
      return;
    }
    _handle(result);
  }

  void _handle(UnlockResult result) {
    switch (result) {
      case UnlockResult.success:
        widget.onUnlocked();
      case UnlockResult.needsPin:
        setState(() { _showPin = true; _settingUp = false; });
      case UnlockResult.needsPinSetup:
        setState(() { _showPin = true; _settingUp = true; });
      case UnlockResult.lockedOut:
        widget.onSignOut();
      case UnlockResult.failed:
        setState(() => _error = 'Could not verify. Try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A5F),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 56, color: Colors.white),
                const SizedBox(height: 20),
                Text(
                  _settingUp ? 'Set a PIN' : 'CKM Services is locked',
                  style: const TextStyle(
                      color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  _settingUp
                      ? 'Choose a ${AppLockService.pinLength}-digit PIN to use when '
                          'biometrics are unavailable.'
                      : 'Confirm it is you to continue.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 28),

                if (_showPin) ...[
                  TextField(
                    controller: _pinController,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    maxLength: AppLockService.pinLength,
                    textAlign: TextAlign.center,
                    autofocus: true,
                    style: const TextStyle(
                        color: Colors.white, fontSize: 24, letterSpacing: 12),
                    decoration: InputDecoration(
                      counterText: '',
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: (_) => _submitPin(),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : _submitPin,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1E3A5F),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(_settingUp ? 'Save PIN' : 'Unlock'),
                    ),
                  ),
                ] else
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _tryBiometrics,
                      icon: const Icon(Icons.fingerprint),
                      label: Text(_busy
                          ? 'Verifying…'
                          : 'Unlock with ${_biometricLabel ?? 'biometrics'}'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1E3A5F),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),

                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Text(_error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFFFFB4A9), fontSize: 13)),
                ],

                const SizedBox(height: 20),
                if (!_showPin && _biometricLabel != null)
                  TextButton(
                    onPressed: _busy ? null : () async {
                      _handle(await widget.lock.hasPin
                          ? UnlockResult.needsPin
                          : UnlockResult.needsPinSetup);
                    },
                    child: Text(context.strings.usePinInstead,
                        style: TextStyle(color: Colors.white70)),
                  ),
                TextButton(
                  onPressed: widget.onSignOut,
                  child: Text(context.strings.signOutLower,
                      style: TextStyle(color: Colors.white54)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
