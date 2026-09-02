/// Localization for the customer portal.
///
/// Dutch is the default: the company, its customers and its paperwork are
/// Dutch, and a customer opening the portal for the first time should not have
/// to find a language switch before they can read it.
///
/// Arabic is right-to-left; the whole tree is mirrored for it in main.dart.

library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported languages
enum AppLanguage {
  dutch('nl', 'Nederlands', 'Dutch', false),
  english('en', 'English', 'English', false),
  arabic('ar', 'العربية', 'Arabic', true),
  russian('ru', 'Русский', 'Russian', false);

  final String code;
  final String nativeName;
  final String englishName;
  final bool isRTL;

  const AppLanguage(this.code, this.nativeName, this.englishName, this.isRTL);

  static AppLanguage fromCode(String code) {
    return AppLanguage.values.firstWhere(
      (lang) => lang.code == code,
      orElse: () => AppLanguage.dutch,
    );
  }
}

/// The language the user is reading in, remembered between launches.
class LocalizationProvider extends ChangeNotifier {
  static const _storageKey = 'app_language';

  AppLanguage _currentLanguage = AppLanguage.dutch;
  bool _loaded = false;

  AppLanguage get currentLanguage => _currentLanguage;
  Locale get locale => Locale(_currentLanguage.code);
  bool get isRTL => _currentLanguage.isRTL;
  TextDirection get textDirection => isRTL ? TextDirection.rtl : TextDirection.ltr;

  /// Has the stored choice been read yet? Until it has, the default shows.
  bool get isLoaded => _loaded;

  /// Read the stored choice. Call once at startup.
  ///
  /// Without this the app forgot the language on every launch, which made the
  /// switch feel broken rather than merely unfinished.
  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_storageKey);
      if (code != null) {
        _currentLanguage = AppLanguage.fromCode(code);
      }
    } catch (_) {
      // A device that will not give us preferences still gets Dutch.
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> setLanguage(AppLanguage language) async {
    if (language == _currentLanguage) return;
    _currentLanguage = language;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, language.code);
    } catch (_) {
      // The choice still applies for this session.
    }
  }

  Future<void> setLanguageByCode(String code) =>
      setLanguage(AppLanguage.fromCode(code));
}

/// App Strings — every translatable string in the customer portal.
class AppStrings {
  final AppLanguage language;

  AppStrings(this.language);

  String get appName => _t('CKM Services', 'CKM Services', 'سي كي إم للخدمات', 'CKM Services');
  String get loading => _t('Laden…', 'Loading...', 'جاري التحميل...', 'Загрузка...');
  String get error => _t('Fout', 'Error', 'خطأ', 'Ошибка');
  String get retry => _t('Opnieuw', 'Retry', 'إعادة المحاولة', 'Повторить');
  String get cancel => _t('Annuleren', 'Cancel', 'إلغاء', 'Отмена');
  String get clear => _t('Wissen', 'Clear', 'مسح', 'Очистить');
  String get signIn => _t('Inloggen', 'Sign In', 'تسجيل الدخول', 'Войти');
  String get signOut => _t('Uitloggen', 'Sign Out', 'تسجيل الخروج', 'Выйти');
  String get signOutConfirm => _t('Weet je zeker dat je wilt uitloggen?', 'Are you sure you want to sign out?', 'هل أنت متأكد من تسجيل الخروج؟', 'Вы уверены, что хотите выйти?');
  String get email => _t('E-mailadres', 'Email', 'البريد الإلكتروني', 'Электронная почта');
  String get password => _t('Wachtwoord', 'Password', 'كلمة المرور', 'Пароль');
  String get usePinInstead => _t('Gebruik in plaats daarvan een pincode', 'Use PIN instead', 'استخدم رمز PIN بدلاً من ذلك', 'Использовать PIN');
  String get projects => _t('Projecten', 'Projects', 'المشاريع', 'Проекты');
  String get noProjectsFound => _t('Geen projecten gevonden', 'No projects found', 'لم يتم العثور على مشاريع', 'Проекты не найдены');
  String get noWorkEntriesFound => _t('Geen werkuren gevonden', 'No work entries found', 'لم يتم العثور على سجلات عمل', 'Записи о работе не найдены');
  String get failedToLoadProject => _t('Project kon niet worden geladen', 'Failed to load project', 'تعذر تحميل المشروع', 'Не удалось загрузить проект');
  String get failedToLoadProjects => _t('Projecten konden niet worden geladen', 'Failed to load projects', 'تعذر تحميل المشاريع', 'Не удалось загрузить проекты');
  String get failedToLoadImage => _t('Afbeelding kon niet worden geladen', 'Failed to load image', 'تعذر تحميل الصورة', 'Не удалось загрузить изображение');
  String get filters => _t('Filters', 'Filters', 'عوامل التصفية', 'Фильтры');
  String get tryAdjustingFilters => _t('Pas je filters aan', 'Try adjusting your filters', 'حاول تعديل عوامل التصفية', 'Попробуйте изменить фильтры');
  String get selectPeriod => _t('Periode kiezen', 'Select Period', 'اختر الفترة', 'Выберите период');
  String get viewAll => _t('Alles bekijken', 'View All', 'عرض الكل', 'Показать все');
  String get export => _t('Exporteren', 'Export', 'تصدير', 'Экспорт');
  String get exportToExcel => _t('Exporteren naar Excel', 'Export to Excel', 'تصدير إلى Excel', 'Экспорт в Excel');
  String get downloadExcelReport => _t('Excel-rapport downloaden', 'Download Excel Report', 'تنزيل تقرير Excel', 'Скачать отчёт Excel');
  String get downloadWorkReport => _t('Werkrapport downloaden als .xlsx', 'Download work report as .xlsx', 'تنزيل تقرير العمل بصيغة .xlsx', 'Скачать отчёт о работе в .xlsx');
  String get languageLabel => _t('Taal', 'Language', 'اللغة', 'Язык');

  String _t(String nl, String en, String ar, String ru) {
    switch (language) {
      case AppLanguage.english:
        return en;
      case AppLanguage.arabic:
        return ar;
      case AppLanguage.russian:
        return ru;
      case AppLanguage.dutch:
        return nl;
    }
  }
}

/// Strings for the language the user actually chose.
///
/// This used to return English unconditionally, with a comment saying it would
/// read the provider "in a real app" — so every screen that used it stayed in
/// English no matter what the language switch said.
extension LocalizationContext on BuildContext {
  AppStrings get strings =>
      AppStrings(watch<LocalizationProvider>().currentLanguage);

  /// The same strings without subscribing to rebuilds — for callbacks.
  AppStrings get stringsOnce =>
      AppStrings(read<LocalizationProvider>().currentLanguage);

  bool get isRTL => Directionality.of(this) == TextDirection.rtl;
}
