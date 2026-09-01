/// Wraps the signed-in part of the app with the lock screen.
///
/// Locks at launch and again whenever the app has been in the background, so
/// handing someone an unlocked phone does not hand them the account.
library;

import 'package:flutter/material.dart';

import 'app_lock_screen.dart';
import 'app_lock_service.dart';

class AppLockGate extends StatefulWidget {
  const AppLockGate({
    super.key,
    required this.lock,
    required this.isSignedIn,
    required this.onSignOut,
    required this.child,
  });

  final AppLockService lock;
  final bool isSignedIn;
  final VoidCallback onSignOut;
  final Widget child;

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  bool _locked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didUpdateWidget(AppLockGate old) {
    super.didUpdateWidget(old);
    // A fresh sign-in re-arms the lock for the next background.
    if (widget.isSignedIn && !old.isSignedIn) _lock();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Lock on the way out, not on the way back in: by the time the app is
    // visible again the lock screen is already in place, so no content flashes.
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _lock();
    }
  }

  Future<void> _lock() async {
    if (!widget.isSignedIn || _locked) return;
    if (!await widget.lock.isEnabled) return;
    if (mounted) setState(() => _locked = true);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isSignedIn || !_locked) return widget.child;

    return AppLockScreen(
      lock: widget.lock,
      onUnlocked: () => setState(() => _locked = false),
      onSignOut: () {
        setState(() => _locked = false);
        widget.onSignOut();
      },
    );
  }
}
