/// Localization Service - Multi-language Support
/// 
/// Supports: English, Arabic, Russian
/// RTL support included for Arabic.

import 'package:flutter/material.dart';

/// Supported languages
enum AppLanguage {
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
      orElse: () => AppLanguage.english,
    );
  }
}

/// Localization Provider
class LocalizationProvider extends ChangeNotifier {
  AppLanguage _currentLanguage = AppLanguage.english;
  
  AppLanguage get currentLanguage => _currentLanguage;
  Locale get locale => Locale(_currentLanguage.code);
  bool get isRTL => _currentLanguage.isRTL;
  TextDirection get textDirection => isRTL ? TextDirection.rtl : TextDirection.ltr;

  void setLanguage(AppLanguage language) {
    _currentLanguage = language;
    notifyListeners();
  }

  void setLanguageByCode(String code) {
    setLanguage(AppLanguage.fromCode(code));
  }
}

/// App Strings - All translatable text
class AppStrings {
  final AppLanguage language;

  AppStrings(this.language);

  // ===================
  // COMMON
  // ===================
  String get appName => _t('CKM Services', 'سي كي إم للخدمات', 'CKM Services');
  String get loading => _t('Loading...', 'جاري التحميل...', 'Загрузка...');
  String get error => _t('Error', 'خطأ', 'Ошибка');
  String get success => _t('Success', 'نجاح', 'Успех');
  String get cancel => _t('Cancel', 'إلغاء', 'Отмена');
  String get save => _t('Save', 'حفظ', 'Сохранить');
  String get submit => _t('Submit', 'إرسال', 'Отправить');
  String get back => _t('Back', 'رجوع', 'Назад');
  String get next => _t('Next', 'التالي', 'Далее');
  String get done => _t('Done', 'تم', 'Готово');
  String get ok => _t('OK', 'حسناً', 'ОК');
  String get yes => _t('Yes', 'نعم', 'Да');
  String get no => _t('No', 'لا', 'Нет');
  String get required => _t('Required', 'مطلوب', 'Обязательно');
  String get optional => _t('Optional', 'اختياري', 'Необязательно');

  // ===================
  // AUTH
  // ===================
  String get login => _t('Login', 'تسجيل الدخول', 'Войти');
  String get logout => _t('Logout', 'تسجيل الخروج', 'Выйти');
  String get email => _t('Email', 'البريد الإلكتروني', 'Электронная почта');
  String get password => _t('Password', 'كلمة المرور', 'Пароль');
  String get forgotPassword => _t('Forgot Password?', 'نسيت كلمة المرور؟', 'Забыли пароль?');
  String get welcomeBack => _t('Welcome Back', 'مرحباً بعودتك', 'С возвращением');
  String get signInToContinue => _t(
    'Sign in to continue to CKM Services',
    'سجل الدخول للمتابعة إلى سي كي إم للخدمات',
    'Войдите, чтобы продолжить работу с CKM Services',
  );
  String get enterEmail => _t('Enter your email', 'أدخل بريدك الإلكتروني', 'Введите вашу электронную почту');
  String get enterPassword => _t('Enter your password', 'أدخل كلمة المرور', 'Введите ваш пароль');
  String get resetPassword => _t('Reset Password', 'إعادة تعيين كلمة المرور', 'Сбросить пароль');
  String get sendResetLink => _t('Send Reset Link', 'إرسال رابط إعادة التعيين', 'Отправить ссылку');
  String get checkYourEmail => _t('Check Your Email', 'تحقق من بريدك الإلكتروني', 'Проверьте вашу почту');
  String get changePassword => _t('Change Password', 'تغيير كلمة المرور', 'Сменить пароль');
  String get currentPassword => _t('Current Password', 'كلمة المرور الحالية', 'Текущий пароль');
  String get newPassword => _t('New Password', 'كلمة المرور الجديدة', 'Новый пароль');
  String get confirmPassword => _t('Confirm Password', 'تأكيد كلمة المرور', 'Подтвердите пароль');

  // ===================
  // PROFILE
  // ===================
  String get completeProfile => _t('Complete Your Profile', 'أكمل ملفك الشخصي', 'Заполните свой профиль');
  String get personalInfo => _t('Personal Information', 'المعلومات الشخصية', 'Личная информация');
  String get contactAddress => _t('Contact & Address', 'معلومات الاتصال والعنوان', 'Контакт и адрес');
  String get financialDetails => _t('Financial Details', 'التفاصيل المالية', 'Финансовые данные');
  String get identification => _t('Identification', 'الهوية', 'Идентификация');
  String get certificates => _t('Documents & Certificates', 'الوثائق والشهادات', 'Документы и сертификаты');
  String get firstName => _t('First Name', 'الاسم الأول', 'Имя');
  String get lastName => _t('Last Name', 'الاسم الأخير', 'Фамилия');
  String get prefix => _t('Prefix', 'البادئة', 'Приставка');
  String get gender => _t('Gender', 'الجنس', 'Пол');
  String get male => _t('Male', 'ذكر', 'Мужской');
  String get female => _t('Female', 'أنثى', 'Женский');
  String get other => _t('Other', 'آخر', 'Другой');
  String get dateOfBirth => _t('Date of Birth', 'تاريخ الميلاد', 'Дата рождения');
  String get birthplace => _t('Birthplace', 'مكان الولادة', 'Место рождения');
  String get bsn => _t('BSN (Dutch ID)', 'رقم الهوية الهولندي', 'BSN (Голландский ID)');
  String get phoneNumber => _t('Phone Number', 'رقم الهاتف', 'Номер телефона');
  String get address => _t('Address', 'العنوان', 'Адрес');
  String get street => _t('Street', 'الشارع', 'Улица');
  String get houseNumber => _t('House Number', 'رقم المنزل', 'Номер дома');
  String get city => _t('City', 'المدينة', 'Город');
  String get postcode => _t('Postcode', 'الرمز البريدي', 'Почтовый индекс');
  String get country => _t('Country', 'البلد', 'Страна');
  String get iban => _t('IBAN', 'رقم الحساب البنكي', 'IBAN');
  String get nationality => _t('Nationality', 'الجنسية', 'Национальность');
  String get documentType => _t('Document Type', 'نوع الوثيقة', 'Тип документа');
  String get documentNumber => _t('Document Number', 'رقم الوثيقة', 'Номер документа');
  String get expiryDate => _t('Expiry Date', 'تاريخ الانتهاء', 'Срок действия');
  String get addDocument => _t('Add Document', 'إضافة وثيقة', 'Добавить документ');
  String get uploadDocument => _t('Upload Document', 'تحميل الوثيقة', 'Загрузить документ');
  String get frontSide => _t('Front Side', 'الوجه الأمامي', 'Лицевая сторона');
  String get backSide => _t('Back Side', 'الوجه الخلفي', 'Обратная сторона');
  String get submitForApproval => _t('Submit for Approval', 'إرسال للموافقة', 'Отправить на утверждение');
  String get profileSubmitted => _t('Profile Submitted!', 'تم إرسال الملف الشخصي!', 'Профиль отправлен!');
  String get awaitingApproval => _t(
    'Your profile is under review.\nYou will be notified when approved.',
    'ملفك الشخصي قيد المراجعة.\nسيتم إعلامك عند الموافقة.',
    'Ваш профиль на рассмотрении.\nВы будете уведомлены о его утверждении.',
  );
  String get profilePending => _t('Profile Under Review', 'الملف قيد المراجعة', 'Профиль на рассмотрении');
  String get profileRejected => _t('Profile Rejected', 'تم رفض الملف', 'Профиль отклонен');
  String get fixAndResubmit => _t('Fix and Resubmit', 'تصحيح وإعادة الإرسال', 'Исправить и отправить снова');

  // ===================
  // CERTIFICATES
  // ===================
  String get vcaBasis => _t('VCA Basis Certificate', 'شهادة VCA الأساسية', 'Сертификат VCA Basis');
  String get vcaVol => _t('VCA V.O.L.', 'VCA V.O.L.', 'VCA V.O.L.');
  String get driversLicense => _t("Driver's License", 'رخصة القيادة', 'Водительские права');
  String get diplomaNumber => _t('Diploma Number', 'رقم الشهادة', 'Номер диплома');
  String get certificateNumber => _t('Certificate Number', 'رقم الشهادة', 'Номер сертификата');

  // ===================
  // HOME / DASHBOARD
  // ===================
  String get home => _t('Home', 'الرئيسية', 'Главная');
  String get work => _t('Work', 'العمل', 'Работа');
  String get earnings => _t('Earnings', 'الأرباح', 'Заработок');
  String get profile => _t('Profile', 'الملف الشخصي', 'Профиль');
  String hello(String name) => _t('Hello, $name!', 'مرحباً، $name!', 'Привет, $name!');
  String get quickActions => _t('Quick Actions', 'إجراءات سريعة', 'Быстрые действия');
  String get logWork => _t('Log Work', 'تسجيل العمل', 'Записать работу');
  String get requestAdvance => _t('Request Advance', 'طلب سلفة', 'Запросить аванс');
  String get yourAssignments => _t('Your Assignments', 'مهامك', 'Ваши задания');

  // ===================
  // WALLET
  // ===================
  String get walletBalance => _t('Wallet Balance', 'رصيد المحفظة', 'Баланс кошелька');
  String get totalEarnings => _t('Total Earnings', 'إجمالي الأرباح', 'Общий заработок');
  String get advances => _t('Advances', 'السلف', 'Авансы');
  String get pendingEarnings => _t('Pending Earnings', 'الأرباح المعلقة', 'Ожидаемый заработок');
  String get requestAmount => _t('Request Amount', 'مبلغ الطلب', 'Сумма запроса');
  String get reason => _t('Reason', 'السبب', 'Причина');

  // ===================
  // WORK LOGS
  // ===================
  String get myWork => _t('My Work', 'أعمالي', 'Моя работа');
  String get approved => _t('Approved', 'موافق عليه', 'Одобрено');
  String get pending => _t('Pending', 'قيد الانتظار', 'Ожидает');
  String get rejected => _t('Rejected', 'مرفوض', 'Отклонено');
  String get draft => _t('Draft', 'مسودة', 'Черновик');
  String get approvedHours => _t('Approved Hours', 'ساعات معتمدة', 'Одобренные часы');
  String get thisWeek => _t('This Week', 'هذا الأسبوع', 'Эта неделя');
  String get lastWeek => _t('Last Week', 'الأسبوع الماضي', 'Прошлая неделя');
  String get thisMonth => _t('This Month', 'هذا الشهر', 'Этот месяц');

  // ===================
  // INVOICES
  // ===================
  String get myEarnings => _t('My Earnings', 'أرباحي', 'Мои заработки');
  String get paid => _t('Paid', 'مدفوع', 'Оплачено');
  String get nextPayout => _t('Next Payout', 'الدفعة القادمة', 'Следующая выплата');
  String get upcomingPayments => _t('Upcoming Payments', 'المدفوعات القادمة', 'Предстоящие платежи');
  String get paymentHistory => _t('Payment History', 'سجل المدفوعات', 'История платежей');
  String get workBreakdown => _t('Work Breakdown', 'تفاصيل العمل', 'Разбивка работы');

  // ===================
  // SETTINGS
  // ===================
  String get settings => _t('Settings', 'الإعدادات', 'Настройки');
  String get languageLabel => _t('Language', 'اللغة', 'Язык');
  String get changeLanguage => _t('Change Language', 'تغيير اللغة', 'Сменить язык');
  String get notifications => _t('Notifications', 'الإشعارات', 'Уведомления');
  String get helpSupport => _t('Help & Support', 'المساعدة والدعم', 'Помощь и поддержка');
  String get contactAdmin => _t('Contact your administrator if you need help.', 
    'تواصل مع المسؤول إذا كنت بحاجة للمساعدة.',
    'Свяжитесь с администратором, если вам нужна помощь.');
  String get checkStatus => _t('Check Status', 'تحقق من الحالة', 'Проверить статус');
  String get pullToRefresh => _t('Pull down to refresh', 'اسحب للتحديث', 'Потяните вниз для обновления');

  // Helper method for translations
  String _t(String en, String ar, String ru) {
    switch (language) {
      case AppLanguage.arabic:
        return ar;
      case AppLanguage.russian:
        return ru;
      case AppLanguage.english:
      default:
        return en;
    }
  }
}

/// Extension to get strings in widgets
extension LocalizationContext on BuildContext {
  AppStrings get strings {
    // In real app, would get from Provider
    return AppStrings(AppLanguage.english);
  }
  
  bool get isRTL {
    // Check current language direction
    return Directionality.of(this) == TextDirection.rtl;
  }
}
