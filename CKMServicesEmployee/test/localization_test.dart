/// The language layer.
///
/// Dutch is the default because the company, its customers and its paperwork
/// are Dutch, and `context.strings` used to return English whatever the user
/// had chosen — which made the language switch look broken.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ckm_services_employee/core/localization/app_strings.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('supported languages', () {
    test('Dutch is available and is the default', () {
      expect(AppLanguage.values.map((l) => l.code), contains('nl'));
      expect(LocalizationProvider().currentLanguage, AppLanguage.dutch);
    });

    test('an unknown code falls back to Dutch, not English', () {
      expect(AppLanguage.fromCode('fr'), AppLanguage.dutch);
    });

    test('only Arabic is right-to-left', () {
      final rtl = AppLanguage.values.where((l) => l.isRTL).map((l) => l.code);
      expect(rtl, ['ar']);
    });
  });

  group('translations', () {
    test('every language has its own wording for a common string', () {
      final byLanguage = {
        for (final language in AppLanguage.values)
          language.code: AppStrings(language).logWork,
      };
      expect(byLanguage['nl'], 'Uren invoeren');
      expect(byLanguage['en'], 'Log Work');
      expect(byLanguage.values.toSet().length, AppLanguage.values.length,
          reason: 'a language is falling through to another one');
    });

    test('interpolation survives translation', () {
      expect(AppStrings(AppLanguage.dutch).hello('Mustafa'), 'Hallo, Mustafa!');
      expect(AppStrings(AppLanguage.english).hello('Mustafa'), 'Hello, Mustafa!');
    });

    test('no string is left empty in any language', () {
      for (final language in AppLanguage.values) {
        final strings = AppStrings(language);
        for (final value in [
          strings.appName, strings.login, strings.logout, strings.profile,
          strings.earnings, strings.settings, strings.walletBalance,
          strings.approved, strings.pending, strings.rejected,
          strings.completeProfile, strings.submitForApproval,
        ]) {
          expect(value.trim(), isNotEmpty,
              reason: 'empty string for ${language.code}');
        }
      }
    });
  });

  group('persistence', () {
    test('the chosen language is remembered', () async {
      final provider = LocalizationProvider();
      await provider.setLanguage(AppLanguage.arabic);

      final reopened = LocalizationProvider();
      await reopened.load();
      expect(reopened.currentLanguage, AppLanguage.arabic);
      expect(reopened.isRTL, isTrue);
      expect(reopened.textDirection, TextDirection.rtl);
    });

    test('a fresh install gets Dutch', () async {
      final provider = LocalizationProvider();
      await provider.load();
      expect(provider.currentLanguage, AppLanguage.dutch);
      expect(provider.isLoaded, isTrue);
    });
  });

  testWidgets('context.strings follows the provider, not a hardcoded default',
      (tester) async {
    final provider = LocalizationProvider();
    late AppStrings seen;

    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: provider,
      child: MaterialApp(
        home: Builder(builder: (context) {
          seen = context.strings;
          return const SizedBox.shrink();
        }),
      ),
    ));
    expect(seen.login, 'Inloggen');

    await provider.setLanguage(AppLanguage.english);
    await tester.pump();
    expect(seen.login, 'Login');

    await provider.setLanguage(AppLanguage.russian);
    await tester.pump();
    expect(seen.login, 'Войти');
  });
}
