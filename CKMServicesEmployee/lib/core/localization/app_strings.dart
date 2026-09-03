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

  // ===================
  // SCREEN COPY
  // ===================
  String get noUpcomingShifts => _t('Geen komende diensten', 'No Upcoming Shifts', 'لا توجد مناوبات قادمة', 'Нет предстоящих смен');
  String get scheduledShiftsAppearHere => _t('Je ingeplande diensten verschijnen hier', 'Your scheduled shifts will appear here', 'ستظهر مناوباتك المجدولة هنا', 'Здесь появятся ваши смены');
  String get noShiftsAtTheMoment => _t('Je hebt momenteel geen ingeplande diensten.\nKijk later nog eens!', 'You have no scheduled shifts at the moment.\nCheck back later!', 'ليس لديك مناوبات مجدولة حالياً.\nتحقق لاحقاً!', 'Сейчас у вас нет запланированных смен.\nЗагляните позже!');
  String get myShifts => _t('Mijn diensten', 'My Shifts', 'مناوباتي', 'Мои смены');
  String get mySchedule => _t('Mijn rooster', 'My Schedule', 'جدولي', 'Мой график');
  String get loadingSchedule => _t('Je rooster laden...', 'Loading your schedule...', 'جارٍ تحميل جدولك...', 'Загрузка вашего графика...');
  String get failedToLoadSchedule => _t('Rooster kon niet worden geladen', 'Failed to load schedule', 'تعذر تحميل الجدول', 'Не удалось загрузить график');
  String get loadingShifts => _t('Diensten laden...', 'Loading shifts...', 'جارٍ تحميل المناوبات...', 'Загрузка смен...');
  String get failedToLoadShifts => _t('Diensten konden niet worden geladen', 'Failed to load shifts', 'تعذر تحميل المناوبات', 'Не удалось загрузить смены');
  String get optionalSuffix => _t(' (optioneel)', ' (optional)', ' (اختياري)', ' (необязательно)');
  String get optionalLabel => _t('(optioneel)', '(optional)', '(اختياري)', '(необязательно)');
  String get allowancesToeslag => _t('Toeslagen', 'Allowances', 'البدلات', 'Надбавки');
  String get hoursLabel => _t('Uren: ', 'Hours: ', 'الساعات: ', 'Часы: ');
  String get breaks => _t('Pauzes', 'Breaks', 'الاستراحات', 'Перерывы');
  String get addBreak => _t('Pauze toevoegen', 'Add Break', 'إضافة استراحة', 'Добавить перерыв');
  String get noBreaksAdded => _t('Geen pauzes toegevoegd', 'No breaks added', 'لم تتم إضافة استراحات', 'Перерывы не добавлены');
  String get noBreaksAddedHint => _t('Geen pauzes toegevoegd. Tik op "+ Pauze toevoegen".', 'No breaks added. Tap "+ Add Break" to add one.', 'لم تتم إضافة استراحات. اضغط "+ إضافة استراحة".', 'Перерывы не добавлены. Нажмите «+ Добавить перерыв».');
  String get totalBreakTime => _t('Totale pauzetijd', 'Total Break Time', 'إجمالي وقت الاستراحة', 'Общее время перерыва');
  String get totalWorkingHours => _t('TOTAAL GEWERKTE UREN', 'TOTAL WORKING HOURS', 'إجمالي ساعات العمل', 'ВСЕГО РАБОЧИХ ЧАСОВ');
  String get fillActualWorkTimes => _t('Werkelijke werktijden invullen', 'Fill Actual Work Times', 'تعبئة أوقات العمل الفعلية', 'Заполнить фактическое время');
  String get tapToFillActualTimes => _t('Tik om je werkelijke werktijden in te vullen', 'Tap to fill your actual work times', 'اضغط لتعبئة أوقات عملك الفعلية', 'Нажмите, чтобы указать фактическое время');
  String get location => _t('Locatie', 'Location', 'الموقع', 'Местоположение');
  String get notes => _t('Notities', 'Notes', 'ملاحظات', 'Заметки');
  String get notesOptional => _t('Notities (optioneel)', 'Notes (optional)', 'ملاحظات (اختياري)', 'Заметки (необязательно)');
  String get selectNationality => _t('Nationaliteit kiezen', 'Select Nationality', 'اختر الجنسية', 'Выберите гражданство');
  String get searchCountries => _t('Landen zoeken...', 'Search countries...', 'ابحث عن الدول...', 'Поиск стран...');
  String get uploadImage => _t('Afbeelding uploaden', 'Upload Image', 'رفع صورة', 'Загрузить изображение');
  String get chooseHowToAddImage => _t('Kies hoe je je afbeelding wilt toevoegen', 'Choose how you want to add your image', 'اختر كيف تريد إضافة صورتك', 'Выберите способ добавления изображения');
  String get tapToUpload => _t('Tik om te uploaden', 'Tap to upload', 'اضغط للرفع', 'Нажмите для загрузки');
  String get cameraOrGallery => _t('Camera of galerij', 'Camera or Gallery', 'الكاميرا أو المعرض', 'Камера или галерея');
  String get camera => _t('Camera', 'Camera', 'الكاميرا', 'Камера');
  String get gallery => _t('Galerij', 'Gallery', 'المعرض', 'Галерея');
  String get orSeparator => _t('OF', 'OR', 'أو', 'ИЛИ');
  String get close => _t('Sluiten', 'Close', 'إغلاق', 'Закрыть');
  String get licenseCategories => _t('Rijbewijscategorieën', 'License Categories', 'فئات الرخصة', 'Категории удостоверения');
  String get passwordChangedSuccessfully => _t('Wachtwoord gewijzigd!', 'Password changed successfully!', 'تم تغيير كلمة المرور!', 'Пароль изменён!');
  String get createNewPassword => _t('Nieuw wachtwoord aanmaken', 'Create New Password', 'إنشاء كلمة مرور جديدة', 'Создать новый пароль');
  String get temporaryPasswordMustChange => _t('Je tijdelijke wachtwoord moet om veiligheidsredenen\nworden gewijzigd.', 'Your temporary password must be changed\nfor security reasons.', 'يجب تغيير كلمة المرور المؤقتة\nلأسباب أمنية.', 'Временный пароль нужно изменить\nиз соображений безопасности.');
  String get logoutAndTryLater => _t('Uitloggen en later proberen', 'Logout & Try Later', 'تسجيل الخروج والمحاولة لاحقاً', 'Выйти и попробовать позже');
  String get forgotPasswordHelp => _t('Geen probleem! Vul het e-mailadres van je account in en we sturen je instructies om je wachtwoord opnieuw in te stellen.', 'No worries! Enter the email address associated with your account and we\'ll send you instructions to reset your password.', 'لا تقلق! أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك تعليمات إعادة تعيين كلمة المرور.', 'Ничего страшного! Введите адрес почты вашей учётной записи, и мы вышлем инструкции для сброса пароля.');
  String get loginFailed => _t('Inloggen mislukt', 'Login Failed', 'فشل تسجيل الدخول', 'Ошибка входа');
  String get loginFailedMessage => _t('Je gebruikersnaam of wachtwoord klopt niet.\nControleer je gegevens en probeer het opnieuw.', 'Your username or password is incorrect.\nPlease check your credentials and try again.', 'اسم المستخدم أو كلمة المرور غير صحيحة.\nتحقق من بياناتك وحاول مرة أخرى.', 'Неверное имя пользователя или пароль.\nПроверьте данные и повторите попытку.');
  String get tryAgain => _t('Opnieuw proberen', 'Try Again', 'حاول مرة أخرى', 'Повторить');
  String get copyrightLine => _t('© 2026 CKM Services', '© 2026 CKM Services', '© 2026 CKM Services', '© 2026 CKM Services');
  String get confirmLogout => _t('Weet je zeker dat je wilt uitloggen?', 'Are you sure you want to logout?', 'هل أنت متأكد من تسجيل الخروج؟', 'Вы уверены, что хотите выйти?');
  String get noPendingInvoices => _t('Geen openstaande facturen', 'No pending invoices', 'لا توجد فواتير معلقة', 'Нет ожидающих счетов');
  String get noInvoicesYet => _t('Nog geen facturen', 'No invoices yet', 'لا توجد فواتير بعد', 'Счетов пока нет');
  String get noPaymentsYet => _t('Nog geen betalingen', 'No payments yet', 'لا توجد مدفوعات بعد', 'Платежей пока нет');
  String get openInMaps => _t('Openen in Kaarten', 'Open in Maps', 'افتح في الخرائط', 'Открыть в картах');
  String get viewInMaps => _t('Bekijken in Kaarten', 'View in Maps', 'عرض في الخرائط', 'Показать на картах');
  String get openInGoogleMaps => _t('Openen in Google Maps', 'Open in Google Maps', 'افتح في خرائط Google', 'Открыть в Google Картах');
  String get openInAppleMaps => _t('Openen in Apple Maps', 'Open in Apple Maps', 'افتح في خرائط Apple', 'Открыть в Apple Картах');
  String get navigateWithWaze => _t('Navigeren met Waze', 'Navigate with Waze', 'التنقل عبر Waze', 'Навигация через Waze');
  String get navigateWith => _t('Navigeren met', 'Navigate With', 'التنقل بواسطة', 'Навигация через');
  String get googleMaps => _t('Google Maps', 'Google Maps', 'خرائط Google', 'Google Карты');
  String get appleMaps => _t('Apple Maps', 'Apple Maps', 'خرائط Apple', 'Apple Карты');
  String get waze => _t('Waze', 'Waze', 'Waze', 'Waze');
  String get getDirections => _t('Route', 'Get Directions', 'الاتجاهات', 'Маршрут');
  String get workLogSubmittedAddAnother => _t('Werkuren verstuurd! Je kunt nog een regel toevoegen.', 'Work log submitted! You can add another entry.', 'تم إرسال سجل العمل! يمكنك إضافة سجل آخر.', 'Учёт часов отправлен! Можно добавить ещё запись.');
  String get workLogSubmittedTitle => _t('Werkuren verstuurd!', 'Work Log Submitted!', 'تم إرسال سجل العمل!', 'Учёт часов отправлен!');
  String get customEllipsis => _t('Aangepast...', 'Custom...', 'مخصص...', 'Другое...');
  String get customOrOther => _t('Aangepast / overig', 'Custom / Other', 'مخصص / أخرى', 'Другое');
  String get noWorklogsForDay => _t('Nog geen werkuren ingediend voor deze dag', 'No worklogs submitted for this day yet', 'لم يتم تقديم سجلات عمل لهذا اليوم بعد', 'За этот день записи ещё не поданы');
  String get photos => _t('Foto\'s', 'Photos', 'الصور', 'Фотографии');
  String get noPhotosAdded => _t('Nog geen foto\'s toegevoegd', 'No photos added yet', 'لم تتم إضافة صور بعد', 'Фотографии ещё не добавлены');
  String get noResultsFound => _t('Geen resultaten gevonden', 'No results found', 'لم يتم العثور على نتائج', 'Ничего не найдено');
  String get customer => _t('Klant', 'Customer', 'العميل', 'Клиент');
  String get project => _t('Project', 'Project', 'المشروع', 'Проект');
  String get supervisor => _t('Leidinggevende', 'Supervisor', 'المشرف', 'Руководитель');
  String get awaitingAdminApproval => _t('Wacht op goedkeuring door de beheerder', 'Awaiting admin approval', 'في انتظار موافقة المسؤول', 'Ожидает утверждения администратором');
  String get profileAwaitingApproval => _t('Je profiel is verstuurd en wacht op\ngoedkeuring door de beheerder.', 'Your profile has been submitted and is\nawaiting admin approval.', 'تم إرسال ملفك وهو في انتظار\nموافقة المسؤول.', 'Ваш профиль отправлен и ожидает\nутверждения администратором.');
  String get correctionRequired => _t('Correctie vereist', 'Correction Required', 'مطلوب تصحيح', 'Требуется исправление');
  String get markAllRead => _t('Alles als gelezen markeren', 'Mark all read', 'وضع علامة مقروء على الكل', 'Отметить всё прочитанным');
  String get contactAdminForHelp => _t('Neem contact op met je beheerder voor hulp', 'Contact your administrator for assistance', 'تواصل مع المسؤول للمساعدة', 'Обратитесь к администратору за помощью');
  String get needHelpContactAdmin => _t('Hulp nodig? Neem contact op met de beheerder', 'Need Help? Contact Admin', 'تحتاج مساعدة؟ تواصل مع المسؤول', 'Нужна помощь? Свяжитесь с администратором');
  String get completeIdDocumentFirst => _t('Vul eerst het onderdeel Identiteitsbewijs in', 'Please complete ID Document section first', 'يرجى إكمال قسم وثيقة الهوية أولاً', 'Сначала заполните раздел «Удостоверение»');
  String get bankingDetailsSecure => _t('Je bankgegevens worden versleuteld opgeslagen.', 'Your banking details are encrypted and secure.', 'بياناتك المصرفية مشفرة وآمنة.', 'Ваши банковские данные зашифрованы и защищены.');
  String get addCertificatesHint => _t('Voeg certificaten toe die je hebt, zoals VCA Basis, VCA VOL, BHV, heftruck enzovoort.', 'Add any certificates you have, such as VCA Basis, VCA VOL, BHV, Forklift, etc.', 'أضف أي شهادات لديك مثل VCA Basis أو VCA VOL أو BHV أو الرافعة الشوكية.', 'Добавьте имеющиеся сертификаты: VCA Basis, VCA VOL, BHV, погрузчик и т. п.');
  String get noCertificatesAdded => _t('Nog geen certificaten toegevoegd', 'No certificates added yet', 'لم تتم إضافة شهادات بعد', 'Сертификаты ещё не добавлены');
  String get tapButtonToAddCertificates => _t('Tik op de knop hieronder om je certificaten toe te voegen', 'Tap the button below to add your certificates', 'اضغط الزر أدناه لإضافة شهاداتك', 'Нажмите кнопку ниже, чтобы добавить сертификаты');
  String get certificateTypeRequired => _t('Certificaattype *', 'Certificate Type *', 'نوع الشهادة *', 'Тип сертификата *');
  String get certificateNumberRequired => _t('Certificaatnummer *', 'Certificate Number *', 'رقم الشهادة *', 'Номер сертификата *');
  String get expiryDateRequired => _t('Vervaldatum *', 'Expiry Date *', 'تاريخ الانتهاء *', 'Срок действия *');
  String get uploadCertificateRequired => _t('Certificaat uploaden *', 'Upload Certificate *', 'رفع الشهادة *', 'Загрузить сертификат *');
  String get enterCertificateNumber => _t('Vul het certificaatnummer in', 'Enter certificate number', 'أدخل رقم الشهادة', 'Введите номер сертификата');
  String get notificationSettings => _t('Meldingsinstellingen', 'Notification Settings', 'إعدادات الإشعارات', 'Настройки уведомлений');
  String get pushNotifications => _t('Pushmeldingen', 'Push Notifications', 'الإشعارات الفورية', 'Пуш-уведомления');
  String get certificateExpiry => _t('Vervaldatum certificaat', 'Certificate Expiry', 'انتهاء الشهادة', 'Истечение сертификата');
  String get certificateExpiryHint => _t('Herinneringen wanneer certificaten verlopen', 'Reminders when certificates are expiring', 'تذكيرات عند اقتراب انتهاء الشهادات', 'Напоминания об истечении сертификатов');
  String get contractExpiry => _t('Vervaldatum contract', 'Contract Expiry', 'انتهاء العقد', 'Истечение договора');
  String get contractExpiryHint => _t('Herinneringen wanneer je contract verloopt', 'Reminders when your contract is expiring', 'تذكيرات عند اقتراب انتهاء عقدك', 'Напоминания об истечении договора');
  String get workLogReminders => _t('Herinneringen voor werkuren', 'Work Log Reminders', 'تذكيرات سجل العمل', 'Напоминания об учёте часов');
  String get workLogRemindersHint => _t('Herinneringen om je uren in te vullen', 'Reminders to log your work hours', 'تذكيرات لتسجيل ساعات عملك', 'Напоминания записать рабочие часы');
  String get shiftChanges => _t('Wijzigingen in diensten', 'Shift Changes', 'تغييرات المناوبات', 'Изменения смен');
  String get shiftChangesHint => _t('Updates over je dienstrooster', 'Updates about your shift schedule', 'تحديثات عن جدول مناوباتك', 'Обновления вашего графика смен');
  String get approvalsAndRejections => _t('Goedkeuringen en afwijzingen', 'Approvals & Rejections', 'الموافقات والرفض', 'Утверждения и отклонения');
  String get approvalsHint => _t('Wanneer je werkuren zijn beoordeeld', 'When your work logs are reviewed', 'عند مراجعة سجلات عملك', 'Когда ваши записи проверены');
  String get noNotifications => _t('Geen meldingen', 'No Notifications', 'لا توجد إشعارات', 'Нет уведомлений');
  String get customerUpper => _t('KLANT', 'CUSTOMER', 'العميل', 'КЛИЕНТ');
  String get requirementsUpper => _t('EISEN', 'REQUIREMENTS', 'المتطلبات', 'ТРЕБОВАНИЯ');
  String get locationUpper => _t('LOCATIE', 'LOCATION', 'الموقع', 'МЕСТО');
  String get supervisorUpper => _t('LEIDINGGEVENDE', 'SUPERVISOR', 'المشرف', 'РУКОВОДИТЕЛЬ');
  String get notesUpper => _t('NOTITIES', 'NOTES', 'ملاحظات', 'ЗАМЕТКИ');
  String get timeUpper => _t('TIJD', 'TIME', 'الوقت', 'ВРЕМЯ');
  String get statusUpper => _t('STATUS', 'STATUS', 'الحالة', 'СТАТУС');
  String get call => _t('Bellen', 'Call', 'اتصال', 'Позвонить');
  String get logWorkHours => _t('Werkuren invoeren', 'Log Work Hours', 'تسجيل ساعات العمل', 'Записать рабочие часы');
  String get workDate => _t('Werkdatum', 'Work Date', 'تاريخ العمل', 'Дата работы');
  String get submitWorkLog => _t('Werkuren versturen', 'Submit Work Log', 'إرسال سجل العمل', 'Отправить учёт часов');
  String get shiftDetails => _t('Dienstgegevens', 'Shift Details', 'تفاصيل المناوبة', 'Детали смены');
  String get supervisorContact => _t('Contact leidinggevende', 'Supervisor Contact', 'التواصل مع المشرف', 'Контакт руководителя');
  String get instructions => _t('Instructies', 'Instructions', 'التعليمات', 'Инструкции');
  String get upcomingShift => _t('Komende dienst', 'Upcoming Shift', 'المناوبة القادمة', 'Предстоящая смена');
  String get submitShiftWarning => _t('Na versturen kun je deze dienst niet meer bewerken. Je leidinggevende beoordeelt en keurt hem goed.', 'Once submitted, you cannot edit this shift. Your supervisor will review and approve it.', 'بعد الإرسال لا يمكنك تعديل هذه المناوبة. سيراجعها مشرفك ويعتمدها.', 'После отправки смену изменить нельзя. Руководитель проверит и утвердит её.');
  String get cannotEditOnceSubmitted => _t('Na versturen kun je deze dienst niet meer bewerken. ', 'Once submitted, you cannot edit this shift. ', 'بعد الإرسال لا يمكنك تعديل هذه المناوبة. ', 'После отправки смену изменить нельзя. ');
  String get submitOnScheduledDateOnly => _t('Werkuren kunnen alleen op de geplande werkdatum worden ingediend', 'Work hours can only be submitted on the scheduled work date', 'لا يمكن تقديم ساعات العمل إلا في تاريخ العمل المجدول', 'Часы можно подать только в запланированный рабочий день');
  String get yourSubmittedTimes => _t('Je ingediende tijden', 'Your Submitted Times', 'الأوقات التي قدمتها', 'Отправленное вами время');
  String get shiftRejected => _t('Dienst afgekeurd', 'Shift Rejected', 'تم رفض المناوبة', 'Смена отклонена');
  String get saveDraft => _t('Concept opslaan', 'Save Draft', 'حفظ المسودة', 'Сохранить черновик');
  String get requestSubmitted => _t('Aanvraag verstuurd!', 'Request Submitted!', 'تم إرسال الطلب!', 'Запрос отправлен!');
  String get advanceRequestHint => _t('Vraag een voorschot aan op je verdiensten. Maximaal € 5.000. Onder voorbehoud van goedkeuring door de beheerder.', 'Request an advance on your earnings. Maximum €5,000. Subject to admin approval.', 'اطلب سلفة على أرباحك. الحد الأقصى ٥٠٠٠ يورو. تخضع لموافقة المسؤول.', 'Запросите аванс из вашего заработка. Максимум 5000 €. По согласованию с администратором.');
  String get amountEuro => _t('Bedrag (€)', 'Amount (€)', 'المبلغ (€)', 'Сумма (€)');
  String get reasonForRequest => _t('Reden van aanvraag', 'Reason for Request', 'سبب الطلب', 'Причина запроса');
  String get rejectionReason => _t('Reden van afwijzing', 'Rejection Reason', 'سبب الرفض', 'Причина отклонения');
  String get advance => _t('Voorschot', 'Advance', 'سلفة', 'Аванс');
  String get dateLabel => _t('Datum', 'Date', 'التاريخ', 'Дата');
  String get breakMinutes => _t('Pauze (minuten)', 'Break (minutes)', 'الاستراحة (دقائق)', 'Перерыв (минуты)');
  String get noAllowancesAddedHint => _t('Geen toeslagen toegevoegd. Tik op "Toevoegen" om bijzondere toeslagen op te nemen.', 'No allowances added. Tap "Add" to include special allowances.', 'لم تتم إضافة بدلات. اضغط "إضافة" لتضمين البدلات الخاصة.', 'Надбавки не добавлены. Нажмите «Добавить», чтобы включить особые надбавки.');
  String get allowanceType => _t('Toeslagtype', 'Allowance Type', 'نوع البدل', 'Тип надбавки');
  String get customAllowanceName => _t('Naam aangepaste toeslag', 'Custom Allowance Name', 'اسم البدل المخصص', 'Название надбавки');
  String get customName => _t('Aangepaste naam', 'Custom Name', 'الاسم المخصص', 'Своё название');
  String get serviceType => _t('Diensttype', 'Service Type', 'نوع الخدمة', 'Тип услуги');
  String get typeLabel => _t('Type', 'Type', 'النوع', 'Тип');
  String get shiftType => _t('Diensttype', 'Shift Type', 'نوع المناوبة', 'Тип смены');
  String get workLocation => _t('Werklocatie', 'Work Location', 'موقع العمل', 'Место работы');
  String get startTime => _t('Starttijd', 'Start Time', 'وقت البدء', 'Время начала');
  String get endTime => _t('Eindtijd', 'End Time', 'وقت الانتهاء', 'Время окончания');
  String get startTimeRequired => _t('Starttijd *', 'Start Time *', 'وقت البدء *', 'Время начала *');
  String get endTimeRequired => _t('Eindtijd *', 'End Time *', 'وقت الانتهاء *', 'Время окончания *');
  String get breakStart => _t('Begin pauze', 'Break Start', 'بداية الاستراحة', 'Начало перерыва');
  String get breakEnd => _t('Einde pauze', 'Break End', 'نهاية الاستراحة', 'Конец перерыва');
  String get addNotesAboutWork => _t('Voeg notities over je werk toe...', 'Add any notes about your work...', 'أضف ملاحظات عن عملك...', 'Добавьте заметки о работе...');
  String get addNotesAboutShift => _t('Voeg notities over deze dienst toe...', 'Add any notes about this shift...', 'أضف ملاحظات عن هذه المناوبة...', 'Добавьте заметки об этой смене...');
  String get enterPersonalDetails => _t('Vul je persoonlijke gegevens in', 'Enter your personal details', 'أدخل بياناتك الشخصية', 'Введите свои личные данные');
  String get idDocument => _t('Identiteitsbewijs', 'ID Document', 'وثيقة الهوية', 'Удостоверение личности');
  String get uploadIdentificationDocument => _t('Upload je identiteitsbewijs', 'Upload your identification document', 'ارفع وثيقة هويتك', 'Загрузите удостоверение личности');
  String get addDrivingLicenseOptional => _t('Voeg je rijbewijs toe (optioneel)', 'Add your driving license (optional)', 'أضف رخصة القيادة (اختياري)', 'Добавьте водительское удостоверение (необязательно)');
  String get addWorkCertificates => _t('Voeg je werkcertificaten toe', 'Add your work certificates', 'أضف شهادات عملك', 'Добавьте рабочие сертификаты');
  String get emailAddressLabel => _t('E-mailadres', 'Email Address', 'عنوان البريد الإلكتروني', 'Адрес эл. почты');


  // ===================
  // SCREEN COPY
  // ===================
  String get noUpcomingShiftsLower => _t('Geen komende diensten', 'No upcoming shifts', 'لا توجد مناوبات قادمة', 'Нет предстоящих смен');
  String get allowancesWithDutch => _t('Toeslagen', 'Allowances (Toeslag)', 'البدلات', 'Надбавки');
  String get notesOptionalCap => _t('Notities (optioneel)', 'Notes (Optional)', 'ملاحظات (اختياري)', 'Заметки (необязательно)');
  String get certificatesPlain => _t('Certificaten', 'Certificates', 'الشهادات', 'Сертификаты');

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
