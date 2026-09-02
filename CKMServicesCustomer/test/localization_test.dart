import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ckm_services_customer/core/localization/app_strings.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('supported languages', () {
    test('Dutch is the default, because the customers are Dutch', () {
      expect(LocalizationProvider().currentLanguage, AppLanguage.dutch);
    });

    test('an unknown code falls back to Dutch, not English', () {
      expect(AppLanguage.fromCode('zz'), AppLanguage.dutch);
    });

    test('only Arabic is right-to-left', () {
      for (final language in AppLanguage.values) {
        expect(language.isRTL, language == AppLanguage.arabic,
            reason: '${language.code} direction');
      }
    });
  });

  group('translations', () {
    test('no string is left empty in any language', () {
      for (final language in AppLanguage.values) {
        final strings = AppStrings(language);
        for (final value in [
          strings.appName, strings.loading, strings.error, strings.retry,
          strings.cancel, strings.clear, strings.signIn, strings.signOut,
          strings.signOutConfirm, strings.email, strings.password,
          strings.usePinInstead, strings.projects, strings.noProjectsFound,
          strings.noWorkEntriesFound, strings.failedToLoadProject,
          strings.failedToLoadProjects, strings.failedToLoadImage,
          strings.filters, strings.tryAdjustingFilters, strings.selectPeriod,
          strings.viewAll, strings.export, strings.exportToExcel,
          strings.downloadExcelReport, strings.downloadWorkReport,
          strings.languageLabel,
        ]) {
          expect(value.trim(), isNotEmpty, reason: language.code);
        }
      }
    });

    test('each language really has its own wording', () {
      final wording = {
        for (final language in AppLanguage.values)
          language.code: AppStrings(language).signOut,
      };
      expect(wording.values.toSet().length, AppLanguage.values.length);
    });
  });

  group('persistence', () {
    test('the chosen language is remembered', () async {
      final provider = LocalizationProvider();
      await provider.setLanguage(AppLanguage.arabic);

      final reopened = LocalizationProvider();
      await reopened.load();
      expect(reopened.currentLanguage, AppLanguage.arabic);
    });

    test('a fresh install gets Dutch', () async {
      final provider = LocalizationProvider();
      await provider.load();
      expect(provider.currentLanguage, AppLanguage.dutch);
    });
  });

  testWidgets('context.strings follows the provider', (tester) async {
    final provider = LocalizationProvider();
    late BuildContext captured;

    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: provider,
      child: MaterialApp(home: Builder(builder: (context) {
        captured = context;
        return Text(context.strings.signOut);
      })),
    ));

    expect(find.text('Uitloggen'), findsOneWidget);

    await provider.setLanguage(AppLanguage.english);
    await tester.pump();
    expect(find.text('Sign Out'), findsOneWidget);
    // `strings` watches, so outside a build it must be read once instead.
    expect(captured.stringsOnce.signOut, 'Sign Out');
  });
}
