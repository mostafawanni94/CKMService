/// Pro Totaal Service - Main Entry Point
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  runApp(const ProTotaalServiceApp());
}

class ProTotaalServiceApp extends StatelessWidget {
  const ProTotaalServiceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocalizationProvider()),
        ChangeNotifierProvider(create: (_) => AuthViewModel()),
        ChangeNotifierProvider(create: (_) => WalletViewModel()),
        ChangeNotifierProvider(create: (_) => InvoiceViewModel()),
      ],
      child: Consumer<LocalizationProvider>(
        builder: (context, localization, _) {
          return MaterialApp(
            title: 'Pro Totaal Service',
            debugShowCheckedModeBanner: false,
            theme: _buildTheme(),
            
            // Localization - Now supports English, Arabic, Russian
            locale: localization.locale,
            supportedLocales: const [
              Locale('en'), // English
              Locale('ar'), // Arabic (RTL)
              Locale('ru'), // Russian
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

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthViewModel>(
      builder: (context, auth, _) {
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
      },
    );
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
                  'PTS', 
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
              'Pro Totaal Service',
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
