// CKM Customer Portal — Main Entry Point
// A professional, customer-facing mobile app for viewing
// project progress, work entries, and employee photos.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_service.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/projects/presentation/projects_dashboard.dart';
import 'features/profile/presentation/profile_screen.dart';
import 'core/security/app_lock_gate.dart';
import 'core/security/app_lock_service.dart';
import 'core/localization/app_strings.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set status bar style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppTheme.deepNavy,
  ));
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()..init()),
        ChangeNotifierProvider(create: (_) => LocalizationProvider()..load()),
      ],
      child: CKMCustomerPortalApp(),
    ),
  );
}

class CKMCustomerPortalApp extends StatelessWidget {
  CKMCustomerPortalApp({super.key});

  final _appLock = AppLockService();

  @override
  Widget build(BuildContext context) {
    // Arabic is right-to-left, so the whole tree is mirrored for it.
    final localization = context.watch<LocalizationProvider>();
    return MaterialApp(
      title: 'CKM Customer Portal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      locale: localization.locale,
      builder: (context, child) => Directionality(
        textDirection: localization.textDirection,
        child: child ?? const SizedBox.shrink(),
      ),
      home: Consumer<AuthService>(
        builder: (ctx, auth, _) {
          // Behind sign-in everything sits under the lock gate: biometrics on
          // launch and after every background, with a PIN fallback.
          return AppLockGate(
            lock: _appLock,
            isSignedIn: auth.isLoggedIn,
            onSignOut: auth.logout,
            child: auth.isLoggedIn ? const MainShell() : const LoginScreen(),
          );
        },
      ),
    );
  }
}

/// Main navigation shell with bottom tab bar
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    ProjectsDashboard(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppTheme.deepNavy,
          border: Border(
            top: BorderSide(color: AppTheme.dividerColor.withValues(alpha: 0.3)),
          ),
        ),
        child: SafeArea(
          child: SizedBox(
            height: 65,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, Icons.dashboard_rounded, 'Projects'),
                _buildNavItem(1, Icons.person_outline_rounded, 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                icon,
                size: 24,
                color: isActive ? AppTheme.electricBlue : AppTheme.textMuted,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppTheme.electricBlue : AppTheme.textMuted,
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
