/// CKM Services - Main Entry Point
/// 
/// App with MVVM architecture, Provider state management, multi-language support.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

// Core
import 'core/widgets/app_widgets.dart';
import 'core/localization/app_strings.dart';

// Features
import 'features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/auth/presentation/screens/change_password_screen.dart';
import 'features/wallet/presentation/viewmodels/wallet_viewmodel.dart';
import 'features/invoices/presentation/viewmodels/invoice_viewmodel.dart';
import 'features/home/presentation/screens/home_screen.dart';
import 'features/profile/presentation/screens/profile_completion_screen.dart';
import 'features/profile/presentation/screens/pending_approval_screen.dart';
import 'core/network/api_client.dart';
import 'core/services/fcm_service.dart';
import 'core/security/app_lock_gate.dart';
import 'core/security/app_lock_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  // Push notifications. This is a no-op (with a debug log) when the Firebase
  // config files are absent, so it is safe to call unconditionally.
  await fcmService.initialize();

  runApp(const CKMServicesEmployeeApp());
}

class CKMServicesEmployeeApp extends StatelessWidget {
  const CKMServicesEmployeeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocalizationProvider()..load()),
        ChangeNotifierProvider(create: (_) {
          final auth = AuthViewModel();
          // An unrecoverable 401 anywhere in the app now signs the user out
          // instead of leaving screens stuck on a silent failure.
          ApiClient.onSessionExpired = auth.handleSessionExpired;
          return auth;
        }),
        ChangeNotifierProvider(create: (_) => WalletViewModel()),
        ChangeNotifierProvider(create: (_) => InvoiceViewModel()),
      ],
      child: Consumer<LocalizationProvider>(
        builder: (context, localization, _) {
          return MaterialApp(
            title: context.strings.appName,
            debugShowCheckedModeBanner: false,
            theme: _buildTheme(),
            
            // Dutch first: the company, its customers and its paperwork are
            // Dutch. Arabic is right-to-left and mirrors the whole tree below.
            locale: localization.locale,
            supportedLocales: const [
              Locale('nl'), // Nederlands
              Locale('en'), // English
              Locale('ar'), // العربية (RTL)
              Locale('ru'), // Русский
            ],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            
            // RTL support for Arabic
            builder: (context, child) {
              return Directionality(
                textDirection: localization.textDirection,
                child: child!,
              );
            },
            
            home: const AppRoot(),
          );
        },
      ),
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.secondary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      fontFamily: 'SF Pro Display',
    );
  }
}

/// App Root - Handles authentication state navigation
class AppRoot extends StatefulWidget {
  const AppRoot({super.key});

  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthViewModel>().initialize();
    });
  }

  final _appLock = AppLockService();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthViewModel>(
      builder: (context, auth, _) {
        // Everything behind sign-in sits under the lock gate: biometrics on
        // launch and after every background, with a PIN fallback.
        return AppLockGate(
          lock: _appLock,
          isSignedIn: auth.state == AuthState.authenticated,
          onSignOut: () => auth.logout(),
          child: _screenFor(auth),
        );
      },
    );
  }

  Widget _screenFor(AuthViewModel auth) {
    switch (auth.state) {
          // Loading states
          case AuthState.initial:
          case AuthState.loading:
            return const _SplashScreen();
          
          // Fully authenticated - has access to app
          case AuthState.authenticated:
            return const HomeScreen();
          
          // First login - must change password
          case AuthState.needsPasswordChange:
            return const ChangePasswordScreen();
          
          // Profile incomplete or rejected - needs to complete/fix form
          case AuthState.firstLogin:
          case AuthState.profileRejected:
            return const ProfileCompletionScreen();
          
          // Profile submitted - waiting for admin approval
          case AuthState.profilePending:
            return const PendingApprovalScreen();
          
          // Not logged in or error
          case AuthState.unauthenticated:
          case AuthState.error:
            return const LoginScreen();
    }
  }
}

/// Splash Screen
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  'CKM', 
                  style: TextStyle(
                    color: AppColors.primary, 
                    fontSize: 32, 
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 3,
            ),
            const SizedBox(height: 24),
            Text(
              context.strings.appName,
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
