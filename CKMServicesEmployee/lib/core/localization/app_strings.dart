/// Localization — the languages CKM's people actually speak.
///
/// Dutch is the default: the company, its customers and its paperwork are
/// Dutch, and an employee opening the app for the first time should not have
/// to find a language switch before they can read it.
///
/// Arabic is right-to-left; the whole tree is mirrored for it in main.dart.

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

/// App Strings - All translatable text
class AppStrings {
  final AppLanguage language;

  AppStrings(this.language);

  // ===================
  // COMMON
  // ===================
  String get appName => _t('CKM Services', 'CKM Services', 'سي كي إم للخدمات', 'CKM Services');
  String get loading => _t('Laden…', 'Loading...', 'جاري التحميل...', 'Загрузка...');
  String get error => _t('Fout', 'Error', 'خطأ', 'Ошибка');
  String get success => _t('Gelukt', 'Success', 'نجاح', 'Успех');
  String get cancel => _t('Annuleren', 'Cancel', 'إلغاء', 'Отмена');
  String get save => _t('Opslaan', 'Save', 'حفظ', 'Сохранить');
  String get submit => _t('Versturen', 'Submit', 'إرسال', 'Отправить');
  String get back => _t('Terug', 'Back', 'رجوع', 'Назад');
  String get next => _t('Volgende', 'Next', 'التالي', 'Далее');
  String get done => _t('Klaar', 'Done', 'تم', 'Готово');
  String get ok => _t('OK', 'OK', 'حسناً', 'ОК');
  String get yes => _t('Ja', 'Yes', 'نعم', 'Да');
  String get no => _t('Nee', 'No', 'لا', 'Нет');
  String get required => _t('Verplicht', 'Required', 'مطلوب', 'Обязательно');
  String get optional => _t('Optioneel', 'Optional', 'اختياري', 'Необязательно');

  // ===================
  // AUTH
  // ===================
  String get login => _t('Inloggen', 'Login', 'تسجيل الدخول', 'Войти');
  String get logout => _t('Uitloggen', 'Logout', 'تسجيل الخروج', 'Выйти');
  String get email => _t('E-mailadres', 'Email', 'البريد الإلكتروني', 'Электронная почта');
  String get password => _t('Wachtwoord', 'Password', 'كلمة المرور', 'Пароль');
  String get forgotPassword => _t('Wachtwoord vergeten?', 'Forgot Password?', 'نسيت كلمة المرور؟', 'Забыли пароль?');
  String get welcomeBack => _t('Welkom terug', 'Welcome Back', 'مرحباً بعودتك', 'С возвращением');
  String get signInToContinue => _t('Log in om verder te gaan met CKM Services', 
    'Sign in to continue to CKM Services',
    'سجل الدخول للمتابعة إلى سي كي إم للخدمات',
    'Войдите, чтобы продолжить работу с CKM Services',
  );
  String get enterEmail => _t('Vul je e-mailadres in', 'Enter your email', 'أدخل بريدك الإلكتروني', 'Введите вашу электронную почту');
  String get enterPassword => _t('Vul je wachtwoord in', 'Enter your password', 'أدخل كلمة المرور', 'Введите ваш пароль');
  String get resetPassword => _t('Wachtwoord opnieuw instellen', 'Reset Password', 'إعادة تعيين كلمة المرور', 'Сбросить пароль');
  String get sendResetLink => _t('Herstellink versturen', 'Send Reset Link', 'إرسال رابط إعادة التعيين', 'Отправить ссылку');
  String get checkYourEmail => _t('Controleer je e-mail', 'Check Your Email', 'تحقق من بريدك الإلكتروني', 'Проверьте вашу почту');
  String get changePassword => _t('Wachtwoord wijzigen', 'Change Password', 'تغيير كلمة المرور', 'Сменить пароль');
  String get currentPassword => _t('Huidig wachtwoord', 'Current Password', 'كلمة المرور الحالية', 'Текущий пароль');
  String get newPassword => _t('Nieuw wachtwoord', 'New Password', 'كلمة المرور الجديدة', 'Новый пароль');
  String get confirmPassword => _t('Wachtwoord bevestigen', 'Confirm Password', 'تأكيد كلمة المرور', 'Подтвердите пароль');

  // ===================
  // PROFILE
  // ===================
  String get completeProfile => _t('Maak je profiel compleet', 'Complete Your Profile', 'أكمل ملفك الشخصي', 'Заполните свой профиль');
  String get personalInfo => _t('Persoonlijke gegevens', 'Personal Information', 'المعلومات الشخصية', 'Личная информация');
  String get contactAddress => _t('Contact en adres', 'Contact & Address', 'معلومات الاتصال والعنوان', 'Контакт и адрес');
  String get financialDetails => _t('Financiële gegevens', 'Financial Details', 'التفاصيل المالية', 'Финансовые данные');
  String get identification => _t('Identificatie', 'Identification', 'الهوية', 'Идентификация');
  String get certificates => _t('Documenten en certificaten', 'Documents & Certificates', 'الوثائق والشهادات', 'Документы и сертификаты');
  String get firstName => _t('Voornaam', 'First Name', 'الاسم الأول', 'Имя');
  String get lastName => _t('Achternaam', 'Last Name', 'الاسم الأخير', 'Фамилия');
  String get prefix => _t('Tussenvoegsel', 'Prefix', 'البادئة', 'Приставка');
  String get gender => _t('Geslacht', 'Gender', 'الجنس', 'Пол');
  String get male => _t('Man', 'Male', 'ذكر', 'Мужской');
  String get female => _t('Vrouw', 'Female', 'أنثى', 'Женский');
  String get other => _t('Anders', 'Other', 'آخر', 'Другой');
  String get dateOfBirth => _t('Geboortedatum', 'Date of Birth', 'تاريخ الميلاد', 'Дата рождения');
  String get birthplace => _t('Geboorteplaats', 'Birthplace', 'مكان الولادة', 'Место рождения');
  String get bsn => _t('BSN', 'BSN (Dutch ID)', 'رقم الهوية الهولندي', 'BSN (Голландский ID)');
  String get phoneNumber => _t('Telefoonnummer', 'Phone Number', 'رقم الهاتف', 'Номер телефона');
  String get address => _t('Adres', 'Address', 'العنوان', 'Адрес');
  String get street => _t('Straat', 'Street', 'الشارع', 'Улица');
  String get houseNumber => _t('Huisnummer', 'House Number', 'رقم المنزل', 'Номер дома');
  String get city => _t('Plaats', 'City', 'المدينة', 'Город');
  String get postcode => _t('Postcode', 'Postcode', 'الرمز البريدي', 'Почтовый индекс');
  String get country => _t('Land', 'Country', 'البلد', 'Страна');
  String get iban => _t('IBAN', 'IBAN', 'رقم الحساب البنكي', 'IBAN');
  String get nationality => _t('Nationaliteit', 'Nationality', 'الجنسية', 'Национальность');
  String get documentType => _t('Soort document', 'Document Type', 'نوع الوثيقة', 'Тип документа');
  String get documentNumber => _t('Documentnummer', 'Document Number', 'رقم الوثيقة', 'Номер документа');
  String get expiryDate => _t('Vervaldatum', 'Expiry Date', 'تاريخ الانتهاء', 'Срок действия');
  String get addDocument => _t('Document toevoegen', 'Add Document', 'إضافة وثيقة', 'Добавить документ');
  String get uploadDocument => _t('Document uploaden', 'Upload Document', 'تحميل الوثيقة', 'Загрузить документ');
  String get frontSide => _t('Voorkant', 'Front Side', 'الوجه الأمامي', 'Лицевая сторона');
  String get backSide => _t('Achterkant', 'Back Side', 'الوجه الخلفي', 'Обратная сторона');
  String get submitForApproval => _t('Ter goedkeuring versturen', 'Submit for Approval', 'إرسال للموافقة', 'Отправить на утверждение');
  String get profileSubmitted => _t('Profiel verstuurd!', 'Profile Submitted!', 'تم إرسال الملف الشخصي!', 'Профиль отправлен!');
  String get awaitingApproval => _t('Je profiel wordt beoordeeld.\nJe krijgt bericht zodra het is goedgekeurd.', 
    'Your profile is under review.\nYou will be notified when approved.',
    'ملفك الشخصي قيد المراجعة.\nسيتم إعلامك عند الموافقة.',
    'Ваш профиль на рассмотрении.\nВы будете уведомлены о его утверждении.',
  );
  String get profilePending => _t('Profiel in behandeling', 'Profile Under Review', 'الملف قيد المراجعة', 'Профиль на рассмотрении');
  String get profileRejected => _t('Profiel afgekeurd', 'Profile Rejected', 'تم رفض الملف', 'Профиль отклонен');
  String get fixAndResubmit => _t('Aanpassen en opnieuw versturen', 'Fix and Resubmit', 'تصحيح وإعادة الإرسال', 'Исправить и отправить снова');

  // ===================
  // CERTIFICATES
  // ===================
  String get vcaBasis => _t('VCA Basis-certificaat', 'VCA Basis Certificate', 'شهادة VCA الأساسية', 'Сертификат VCA Basis');
  String get vcaVol => _t('VCA V.O.L.', 'VCA V.O.L.', 'VCA V.O.L.', 'VCA V.O.L.');
  String get driversLicense => _t('Rijbewijs', "Driver's License", 'رخصة القيادة', 'Водительские права');
  String get diplomaNumber => _t('Diplomanummer', 'Diploma Number', 'رقم الشهادة', 'Номер диплома');
  String get certificateNumber => _t('Certificaatnummer', 'Certificate Number', 'رقم الشهادة', 'Номер сертификата');

  // ===================
  // HOME / DASHBOARD
  // ===================
  String get home => _t('Start', 'Home', 'الرئيسية', 'Главная');
  String get work => _t('Werk', 'Work', 'العمل', 'Работа');
  String get earnings => _t('Verdiensten', 'Earnings', 'الأرباح', 'Заработок');
  String get profile => _t('Profiel', 'Profile', 'الملف الشخصي', 'Профиль');
  String hello(String name) => _t('Hallo, $name!', 'Hello, $name!', 'مرحباً، $name!', 'Привет, $name!');
  String get quickActions => _t('Snelle acties', 'Quick Actions', 'إجراءات سريعة', 'Быстрые действия');
  String get logWork => _t('Uren invoeren', 'Log Work', 'تسجيل العمل', 'Записать работу');
  String get requestAdvance => _t('Voorschot aanvragen', 'Request Advance', 'طلب سلفة', 'Запросить аванс');
  String get yourAssignments => _t('Jouw opdrachten', 'Your Assignments', 'مهامك', 'Ваши задания');

  // ===================
  // WALLET
  // ===================
  String get walletBalance => _t('Saldo', 'Wallet Balance', 'رصيد المحفظة', 'Баланс кошелька');
  String get totalEarnings => _t('Totaal verdiend', 'Total Earnings', 'إجمالي الأرباح', 'Общий заработок');
  String get advances => _t('Voorschotten', 'Advances', 'السلف', 'Авансы');
  String get pendingEarnings => _t('Nog uit te betalen', 'Pending Earnings', 'الأرباح المعلقة', 'Ожидаемый заработок');
  String get requestAmount => _t('Bedrag', 'Request Amount', 'مبلغ الطلب', 'Сумма запроса');
  String get reason => _t('Reden', 'Reason', 'السبب', 'Причина');

  // ===================
  // WORK LOGS
  // ===================
  String get myWork => _t('Mijn werk', 'My Work', 'أعمالي', 'Моя работа');
  String get approved => _t('Goedgekeurd', 'Approved', 'موافق عليه', 'Одобрено');
  String get pending => _t('In behandeling', 'Pending', 'قيد الانتظار', 'Ожидает');
  String get rejected => _t('Afgekeurd', 'Rejected', 'مرفوض', 'Отклонено');
  String get draft => _t('Concept', 'Draft', 'مسودة', 'Черновик');
  String get approvedHours => _t('Goedgekeurde uren', 'Approved Hours', 'ساعات معتمدة', 'Одобренные часы');
  String get thisWeek => _t('Deze week', 'This Week', 'هذا الأسبوع', 'Эта неделя');
  String get lastWeek => _t('Vorige week', 'Last Week', 'الأسبوع الماضي', 'Прошлая неделя');
  String get thisMonth => _t('Deze maand', 'This Month', 'هذا الشهر', 'Этот месяц');

  // ===================
  // INVOICES
  // ===================
  String get myEarnings => _t('Mijn verdiensten', 'My Earnings', 'أرباحي', 'Мои заработки');
  String get paid => _t('Betaald', 'Paid', 'مدفوع', 'Оплачено');
  String get nextPayout => _t('Volgende uitbetaling', 'Next Payout', 'الدفعة القادمة', 'Следующая выплата');
  String get upcomingPayments => _t('Komende betalingen', 'Upcoming Payments', 'المدفوعات القادمة', 'Предстоящие платежи');
  String get paymentHistory => _t('Betaalgeschiedenis', 'Payment History', 'سجل المدفوعات', 'История платежей');
  String get workBreakdown => _t('Urenspecificatie', 'Work Breakdown', 'تفاصيل العمل', 'Разбивка работы');

  // ===================
  // SETTINGS
  // ===================
  String get settings => _t('Instellingen', 'Settings', 'الإعدادات', 'Настройки');
  String get languageLabel => _t('Taal', 'Language', 'اللغة', 'Язык');
  String get changeLanguage => _t('Taal wijzigen', 'Change Language', 'تغيير اللغة', 'Сменить язык');
  String get notifications => _t('Meldingen', 'Notifications', 'الإشعارات', 'Уведомления');
  String get helpSupport => _t('Hulp en ondersteuning', 'Help & Support', 'المساعدة والدعم', 'Помощь и поддержка');
  String get contactAdmin => _t('Neem contact op met je beheerder als je hulp nodig hebt.', 'Contact your administrator if you need help.', 
    'تواصل مع المسؤول إذا كنت بحاجة للمساعدة.',
    'Свяжитесь с администратором, если вам нужна помощь.');
  String get checkStatus => _t('Status bekijken', 'Check Status', 'تحقق من الحالة', 'Проверить статус');
  String get pullToRefresh => _t('Trek omlaag om te vernieuwen', 'Pull down to refresh', 'اسحب للتحديث', 'Потяните вниз для обновления');

  // ===================
  // SCREEN COPY
  // ===================
  String get retry => _t('Opnieuw', 'Retry', 'إعادة المحاولة', 'Повторить');
  String get add => _t('Toevoegen', 'Add', 'إضافة', 'Добавить');
  String get select => _t('Selecteren', 'Select', 'اختيار', 'Выбрать');
  String get start => _t('Start', 'Start', 'البداية', 'Начало');
  String get end => _t('Einde', 'End', 'النهاية', 'Конец');
  String get time => _t('Tijd', 'Time', 'الوقت', 'Время');
  String get signOut => _t('Afmelden', 'Sign out', 'تسجيل الخروج', 'Выйти');
  String get viewAll => _t('Alles bekijken', 'View All', 'عرض الكل', 'Показать все');
  String get loadMore => _t('Meer laden', 'Load more', 'تحميل المزيد', 'Загрузить ещё');
  String get workHistory => _t('Werkgeschiedenis', 'Work History', 'سجل العمل', 'История работы');
  String get workTime => _t('Werktijd', 'Work Time', 'وقت العمل', 'Рабочее время');
  String get totalHours => _t('Totaal uren', 'Total Hours', 'إجمالي الساعات', 'Всего часов');
  String get upcomingShifts => _t('Komende diensten', 'Upcoming Shifts', 'المناوبات القادمة', 'Предстоящие смены');
  String get fillWorkLog => _t('Uren invullen', 'Fill Work Log', 'تعبئة سجل العمل', 'Заполнить учёт часов');
  String get addPhoto => _t('Foto toevoegen', 'Add Photo', 'إضافة صورة', 'Добавить фото');
  String get addCertificate => _t('Certificaat toevoegen', 'Add Certificate', 'إضافة شهادة', 'Добавить сертификат');
  String get uploadCertificate => _t('Certificaat uploaden', 'Upload Certificate', 'رفع شهادة', 'Загрузить сертификат');
  String get allowances => _t('Toeslagen', 'Allowances', 'البدلات', 'Надбавки');
  String get submitShift => _t('Dienst versturen?', 'Submit Shift?', 'إرسال المناوبة؟', 'Отправить смену?');
  String get submittedToday => _t('Vandaag ingediend', 'Submitted Today', 'مُقدَّم اليوم', 'Отправлено сегодня');
  String get today => _t('VANDAAG', 'TODAY', 'اليوم', 'СЕГОДНЯ');
  String get settingsSaved => _t('Instellingen opgeslagen', 'Settings saved', 'تم حفظ الإعدادات', 'Настройки сохранены');
  String get usePinInstead => _t('Gebruik in plaats daarvan een pincode', 'Use PIN instead', 'استخدم رمز PIN بدلاً من ذلك', 'Использовать PIN');
  String get tapToViewEarnings => _t('Tik om verdiensten te bekijken', 'Tap to view earnings', 'اضغط لعرض الأرباح', 'Нажмите, чтобы увидеть заработок');
  String get profileSubmittedMessage => _t('Profiel ter goedkeuring verstuurd!', 'Profile submitted for approval!', 'تم إرسال الملف للموافقة!', 'Профиль отправлен на утверждение!');
  String get workLogSubmittedMessage => _t('Werkuren ter goedkeuring verstuurd', 'Work log submitted for approval', 'تم إرسال سجل العمل للموافقة', 'Учёт часов отправлен на утверждение');
  String get pleaseSelectProject => _t('Selecteer een project', 'Please select a project', 'يرجى اختيار مشروع', 'Пожалуйста, выберите проект');
  String get completePersonalInfoFirst => _t('Vul eerst je persoonlijke gegevens in', 'Please complete Personal Information first', 'يرجى إكمال المعلومات الشخصية أولاً', 'Сначала заполните личные данные');
  String get uploadFrontAndBack => _t('Upload voor- en achterkant, of één pdf', 'Upload front and back, or a single PDF', 'ارفع الوجهين أو ملف PDF واحد', 'Загрузите обе стороны или один PDF');
  String get selectCertificateType => _t('Kies een certificaattype en upload de documenten', 'Select certificate type and upload documents', 'اختر نوع الشهادة وارفع المستندات', 'Выберите тип сертификата и загрузите документы');
  String get tapAddToAddAllowances => _t('Tik op "Toevoegen" om toeslagen toe te voegen', 'Tap "Add" to add allowances', 'اضغط "إضافة" لإضافة البدلات', 'Нажмите «Добавить», чтобы добавить надбавки');

  /// Pick the string for the active language.
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
