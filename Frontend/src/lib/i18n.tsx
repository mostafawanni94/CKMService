'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translation type
type Translations = typeof en;

// English translations
const en = {
    // Common
    dashboard: 'Dashboard',
    employees: 'Employees',
    customers: 'Customers',
    projects: 'Projects',
    worklogs: 'Work Logs',
    invoices: 'Backoffice',
    wallet: 'Wallet',
    settings: 'Settings',
    logout: 'Logout',

    // Dashboard Home
    adminDashboard: 'Admin Dashboard',
    welcomeBack: 'Welcome back!',
    welcomeMessage: "Here's what's happening with your business today.",
    today: 'Today',
    overview: 'Overview',
    employeeManagement: 'Employee Management',
    business: 'Business',
    operations: 'Operations',
    system: 'System',
    allEmployees: 'All Employees',
    pendingApprovals: 'Pending Approvals',
    pendingEmployees: 'Pending Employees',
    pendingWorkLogs: 'Pending Work Logs',
    pendingAdvances: 'Pending Advances',
    totalPending: 'Total Pending',
    awaitingApproval: 'Awaiting approval',
    hoursToApprove: 'Hours to approve',
    moneyRequests: 'Money requests',
    actionsNeeded: 'Actions needed',
    reviewNow: 'Review now',
    allCaughtUp: 'All caught up!',
    quickActions: 'Quick Actions',

    // Quick action cards
    addEmployeeDesc: 'Create new employee account',
    addCustomerDesc: 'Register new customer',
    reviewWorkLogsDesc: 'Approve submitted hours',
    generateInvoiceDesc: 'Create customer invoice',

    // Getting started
    gettingStarted: 'Getting Started',
    completeSteps: 'Complete these steps to set up your system:',
    step1: 'Add your first Customer',
    step2: 'Create a Project for the customer',
    step3: 'Add Employees and share login credentials',
    step4: 'Assign employees to projects',
    step5: 'Employees submit work logs via mobile app',

    // System links
    systemLinks: 'System Links',
    djangoAdmin: 'Django Admin Panel',
    djangoAdminDesc: 'Advanced database management',
    apiDocs: 'API Documentation',
    apiDocsDesc: 'Swagger API reference',
    systemSettings: 'System Settings',
    systemSettingsDesc: 'Configure your preferences',

    // Employee page
    totalEmployees: 'Total Employees',
    active: 'Active',
    pending: 'Pending',
    incomplete: 'Incomplete',
    addEmployee: 'Add Employee',
    viewEmployee: 'View Employee',
    editProfile: 'Edit Profile',
    approve: 'Approve',
    reject: 'Reject',
    refresh: 'Refresh',
    search: 'Search',
    searchEmployees: 'Search employees...',
    manageProfiles: 'Manage employee profiles and approvals',
    noEmployeesFound: 'No employees found',
    clickAddEmployee: 'Click "Add Employee" to create one',

    // Create employee
    addNewEmployee: 'Add New Employee',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    temporaryPassword: 'Temporary Password',
    generate: 'Generate',
    createEmployee: 'Create Employee',
    cancel: 'Cancel',
    employeeCreated: 'Employee Created!',
    shareCredentials: 'Share these credentials with',
    copyCredentials: 'Copy Credentials',
    shareViaWhatsApp: 'Share via WhatsApp',
    done: 'Done',
    password: 'Password',
    employeeWillSetPassword: 'Employee will set their own password on first login',

    // Edit employee
    editEmployeeProfile: 'Edit Employee Profile',
    personalInformation: 'Personal Information',
    contactInformation: 'Contact Information',
    contractInformation: 'Contract Information',
    address: 'Address',
    streetAddress: 'Street Address',
    postcode: 'Postcode',
    city: 'City',
    phoneNumber: 'Phone Number',
    nationality: 'Nationality',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    phase: 'Phase',
    startDate: 'Start Date',
    endDate: 'End Date',
    notProvided: 'Not provided',

    // Customers
    addCustomer: 'Add Customer',
    companyName: 'Company Name',
    totalCustomers: 'Total Customers',
    manageCustomers: 'Manage customer accounts and contracts',
    noCustomersYet: 'No customers yet',
    addFirstCustomer: 'Add your first customer to get started',
    searchCustomers: 'Search customers...',
    inactive: 'Inactive',
    phone: 'Phone',

    // Status
    approved: 'Approved',
    rejected: 'Rejected',

    // Actions
    close: 'Close',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    creating: 'Creating...',
    copied: 'Copied!',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    assign: 'Assign',

    // Projects
    manageProjects: 'Manage work locations and assignments',
    newProject: 'New Project',
    totalProjects: 'Total Projects',
    completed: 'Completed',
    searchProjects: 'Search projects...',
    noProjectsYet: 'No projects yet. Add your first project from the admin panel.',
    started: 'Started',
    all: 'All',

    // Work logs
    reviewWorkLogs: 'Review Work Logs',
    manageWorkLogs: 'Review and approve employee work submissions',
    totalLogs: 'Total Logs',
    pendingApproval: 'Pending Approval',
    allWorkLogs: 'All Work Logs',
    employee: 'Employee',
    project: 'Project',
    date: 'Date',
    time: 'Time',
    hours: 'Hours',
    status: 'Status',
    actions: 'Actions',
    noPendingWorkLogs: 'No pending work logs to approve.',
    noWorkLogsFound: 'No work logs found.',
};

// Arabic translations
const ar: Translations = {
    dashboard: 'لوحة التحكم',
    employees: 'الموظفين',
    customers: 'العملاء',
    projects: 'المشاريع',
    worklogs: 'سجلات العمل',
    invoices: 'الفواتير',
    wallet: 'المحفظة',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',

    adminDashboard: 'لوحة تحكم المدير',
    welcomeBack: 'مرحباً بعودتك!',
    welcomeMessage: 'إليك ما يحدث في عملك اليوم.',
    today: 'اليوم',
    overview: 'نظرة عامة',
    employeeManagement: 'إدارة الموظفين',
    business: 'الأعمال',
    operations: 'العمليات',
    system: 'النظام',
    allEmployees: 'جميع الموظفين',
    pendingApprovals: 'الموافقات المعلقة',
    pendingEmployees: 'الموظفون المعلقون',
    pendingWorkLogs: 'سجلات العمل المعلقة',
    pendingAdvances: 'السلف المعلقة',
    totalPending: 'إجمالي المعلق',
    awaitingApproval: 'في انتظار الموافقة',
    hoursToApprove: 'ساعات للموافقة',
    moneyRequests: 'طلبات المال',
    actionsNeeded: 'إجراءات مطلوبة',
    reviewNow: 'مراجعة الآن',
    allCaughtUp: 'كل شيء محدث!',
    quickActions: 'إجراءات سريعة',

    addEmployeeDesc: 'إنشاء حساب موظف جديد',
    addCustomerDesc: 'تسجيل عميل جديد',
    reviewWorkLogsDesc: 'الموافقة على الساعات المقدمة',
    generateInvoiceDesc: 'إنشاء فاتورة للعميل',

    gettingStarted: 'البدء',
    completeSteps: 'أكمل هذه الخطوات لإعداد نظامك:',
    step1: 'أضف عميلك الأول',
    step2: 'أنشئ مشروعاً للعميل',
    step3: 'أضف موظفين وشارك بيانات الدخول',
    step4: 'عيّن الموظفين للمشاريع',
    step5: 'الموظفون يقدمون سجلات العمل عبر التطبيق',

    systemLinks: 'روابط النظام',
    djangoAdmin: 'لوحة تحكم Django',
    djangoAdminDesc: 'إدارة قاعدة البيانات المتقدمة',
    apiDocs: 'وثائق API',
    apiDocsDesc: 'مرجع Swagger API',
    systemSettings: 'إعدادات النظام',
    systemSettingsDesc: 'تكوين تفضيلاتك',

    totalEmployees: 'إجمالي الموظفين',
    active: 'نشط',
    pending: 'قيد الانتظار',
    incomplete: 'غير مكتمل',
    addEmployee: 'إضافة موظف',
    viewEmployee: 'عرض الموظف',
    editProfile: 'تعديل الملف الشخصي',
    approve: 'موافقة',
    reject: 'رفض',
    refresh: 'تحديث',
    search: 'بحث',
    searchEmployees: 'البحث عن موظفين...',
    manageProfiles: 'إدارة ملفات الموظفين والموافقات',
    noEmployeesFound: 'لم يتم العثور على موظفين',
    clickAddEmployee: 'انقر على "إضافة موظف" لإنشاء واحد',

    addNewEmployee: 'إضافة موظف جديد',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    temporaryPassword: 'كلمة مرور مؤقتة',
    generate: 'إنشاء',
    createEmployee: 'إنشاء موظف',
    cancel: 'إلغاء',
    employeeCreated: 'تم إنشاء الموظف!',
    shareCredentials: 'شارك بيانات الدخول مع',
    copyCredentials: 'نسخ بيانات الدخول',
    shareViaWhatsApp: 'مشاركة عبر واتساب',
    done: 'تم',
    password: 'كلمة المرور',
    employeeWillSetPassword: 'سيقوم الموظف بتعيين كلمة المرور الخاصة به عند أول تسجيل دخول',

    editEmployeeProfile: 'تعديل ملف الموظف',
    personalInformation: 'المعلومات الشخصية',
    contactInformation: 'معلومات الاتصال',
    contractInformation: 'معلومات العقد',
    address: 'العنوان',
    streetAddress: 'عنوان الشارع',
    postcode: 'الرمز البريدي',
    city: 'المدينة',
    phoneNumber: 'رقم الهاتف',
    nationality: 'الجنسية',
    saveChanges: 'حفظ التغييرات',
    saving: 'جاري الحفظ...',
    phase: 'المرحلة',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    notProvided: 'غير متوفر',

    addCustomer: 'إضافة عميل',
    companyName: 'اسم الشركة',
    totalCustomers: 'إجمالي العملاء',
    manageCustomers: 'إدارة حسابات العملاء والعقود',
    noCustomersYet: 'لا يوجد عملاء بعد',
    addFirstCustomer: 'أضف عميلك الأول للبدء',
    searchCustomers: 'البحث عن عملاء...',
    inactive: 'غير نشط',
    phone: 'الهاتف',

    approved: 'تمت الموافقة',
    rejected: 'مرفوض',

    close: 'إغلاق',
    view: 'عرض',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    creating: 'جاري الإنشاء...',
    copied: 'تم النسخ!',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    retry: 'إعادة المحاولة',
    assign: 'تعيين',

    manageProjects: 'إدارة مواقع العمل والتعيينات',
    newProject: 'مشروع جديد',
    totalProjects: 'إجمالي المشاريع',
    completed: 'مكتمل',
    searchProjects: 'البحث عن مشاريع...',
    noProjectsYet: 'لا توجد مشاريع بعد. أضف مشروعك الأول من لوحة الإدارة.',
    started: 'بدأ',
    all: 'الكل',

    reviewWorkLogs: 'مراجعة سجلات العمل',
    manageWorkLogs: 'مراجعة والموافقة على تقديمات العمل',
    totalLogs: 'إجمالي السجلات',
    pendingApproval: 'في انتظار الموافقة',
    allWorkLogs: 'كل سجلات العمل',
    employee: 'الموظف',
    project: 'المشروع',
    date: 'التاريخ',
    time: 'الوقت',
    hours: 'الساعات',
    status: 'الحالة',
    actions: 'الإجراءات',
    noPendingWorkLogs: 'لا توجد سجلات عمل معلقة للموافقة.',
    noWorkLogsFound: 'لم يتم العثور على سجلات عمل.',
};

// Ukrainian translations
const uk: Translations = {
    dashboard: 'Панель керування',
    employees: 'Працівники',
    customers: 'Клієнти',
    projects: 'Проекти',
    worklogs: 'Журнали роботи',
    invoices: 'Рахунки',
    wallet: 'Гаманець',
    settings: 'Налаштування',
    logout: 'Вийти',

    adminDashboard: 'Панель адміністратора',
    welcomeBack: 'З поверненням!',
    welcomeMessage: 'Ось що відбувається у вашому бізнесі сьогодні.',
    today: 'Сьогодні',
    overview: 'Огляд',
    employeeManagement: 'Управління працівниками',
    business: 'Бізнес',
    operations: 'Операції',
    system: 'Система',
    allEmployees: 'Всі працівники',
    pendingApprovals: 'Очікують схвалення',
    pendingEmployees: 'Працівники на очікуванні',
    pendingWorkLogs: 'Журнали роботи на очікуванні',
    pendingAdvances: 'Аванси на очікуванні',
    totalPending: 'Всього очікує',
    awaitingApproval: 'Очікує схвалення',
    hoursToApprove: 'Години для схвалення',
    moneyRequests: 'Запити коштів',
    actionsNeeded: 'Потрібні дії',
    reviewNow: 'Переглянути зараз',
    allCaughtUp: 'Все актуально!',
    quickActions: 'Швидкі дії',

    addEmployeeDesc: 'Створити новий обліковий запис працівника',
    addCustomerDesc: 'Зареєструвати нового клієнта',
    reviewWorkLogsDesc: 'Схвалити подані години',
    generateInvoiceDesc: 'Створити рахунок для клієнта',

    gettingStarted: 'Початок роботи',
    completeSteps: 'Виконайте ці кроки для налаштування системи:',
    step1: 'Додайте першого клієнта',
    step2: 'Створіть проект для клієнта',
    step3: 'Додайте працівників і поділіться обліковими даними',
    step4: 'Призначте працівників на проекти',
    step5: 'Працівники подають журнали роботи через додаток',

    systemLinks: 'Системні посилання',
    djangoAdmin: 'Панель адміністратора Django',
    djangoAdminDesc: 'Розширене управління базою даних',
    apiDocs: 'Документація API',
    apiDocsDesc: 'Довідник Swagger API',
    systemSettings: 'Системні налаштування',
    systemSettingsDesc: 'Налаштуйте свої параметри',

    totalEmployees: 'Всього працівників',
    active: 'Активні',
    pending: 'Очікують',
    incomplete: 'Незавершені',
    addEmployee: 'Додати працівника',
    viewEmployee: 'Переглянути працівника',
    editProfile: 'Редагувати профіль',
    approve: 'Схвалити',
    reject: 'Відхилити',
    refresh: 'Оновити',
    search: 'Пошук',
    searchEmployees: 'Пошук працівників...',
    manageProfiles: 'Керуйте профілями та схваленнями працівників',
    noEmployeesFound: 'Працівників не знайдено',
    clickAddEmployee: 'Натисніть "Додати працівника" для створення',

    addNewEmployee: 'Додати нового працівника',
    firstName: "Ім'я",
    lastName: 'Прізвище',
    email: 'Електронна пошта',
    temporaryPassword: 'Тимчасовий пароль',
    generate: 'Генерувати',
    createEmployee: 'Створити працівника',
    cancel: 'Скасувати',
    employeeCreated: 'Працівника створено!',
    shareCredentials: 'Поділіться обліковими даними з',
    copyCredentials: 'Копіювати дані',
    shareViaWhatsApp: 'Надіслати через WhatsApp',
    done: 'Готово',
    password: 'Пароль',
    employeeWillSetPassword: 'Працівник встановить власний пароль при першому вході',

    editEmployeeProfile: 'Редагувати профіль працівника',
    personalInformation: 'Особиста інформація',
    contactInformation: 'Контактна інформація',
    contractInformation: 'Інформація про контракт',
    address: 'Адреса',
    streetAddress: 'Вулиця',
    postcode: 'Поштовий індекс',
    city: 'Місто',
    phoneNumber: 'Номер телефону',
    nationality: 'Національність',
    saveChanges: 'Зберегти зміни',
    saving: 'Збереження...',
    phase: 'Фаза',
    startDate: 'Дата початку',
    endDate: 'Дата закінчення',
    notProvided: 'Не надано',

    addCustomer: 'Додати клієнта',
    companyName: 'Назва компанії',
    totalCustomers: 'Всього клієнтів',
    manageCustomers: 'Керуйте обліковими записами та контрактами клієнтів',
    noCustomersYet: 'Клієнтів ще немає',
    addFirstCustomer: 'Додайте першого клієнта для початку',
    searchCustomers: 'Пошук клієнтів...',
    inactive: 'Неактивний',
    phone: 'Телефон',

    approved: 'Схвалено',
    rejected: 'Відхилено',

    close: 'Закрити',
    view: 'Переглянути',
    edit: 'Редагувати',
    delete: 'Видалити',
    save: 'Зберегти',
    creating: 'Створення...',
    copied: 'Скопійовано!',
    loading: 'Завантаження...',
    error: 'Помилка',
    retry: 'Повторити',
    assign: 'Призначити',

    manageProjects: 'Керуйте робочими локаціями та призначеннями',
    newProject: 'Новий проект',
    totalProjects: 'Всього проектів',
    completed: 'Завершено',
    searchProjects: 'Пошук проектів...',
    noProjectsYet: 'Ще немає проектів. Додайте перший проект з панелі адміністратора.',
    started: 'Розпочато',
    all: 'Всі',

    reviewWorkLogs: 'Перегляд журналів роботи',
    manageWorkLogs: 'Перегляд та схвалення робочих записів',
    totalLogs: 'Всього записів',
    pendingApproval: 'Очікує схвалення',
    allWorkLogs: 'Всі журнали роботи',
    employee: 'Працівник',
    project: 'Проект',
    date: 'Дата',
    time: 'Час',
    hours: 'Години',
    status: 'Статус',
    actions: 'Дії',
    noPendingWorkLogs: 'Немає журналів роботи для схвалення.',
    noWorkLogsFound: 'Журналів роботи не знайдено.',
};

// Russian translations
const ru: Translations = {
    dashboard: 'Панель управления',
    employees: 'Сотрудники',
    customers: 'Клиенты',
    projects: 'Проекты',
    worklogs: 'Журналы работы',
    invoices: 'Счета',
    wallet: 'Кошелек',
    settings: 'Настройки',
    logout: 'Выйти',

    adminDashboard: 'Панель администратора',
    welcomeBack: 'С возвращением!',
    welcomeMessage: 'Вот что происходит в вашем бизнесе сегодня.',
    today: 'Сегодня',
    overview: 'Обзор',
    employeeManagement: 'Управление сотрудниками',
    business: 'Бизнес',
    operations: 'Операции',
    system: 'Система',
    allEmployees: 'Все сотрудники',
    pendingApprovals: 'Ожидают одобрения',
    pendingEmployees: 'Сотрудники на ожидании',
    pendingWorkLogs: 'Журналы работы на ожидании',
    pendingAdvances: 'Авансы на ожидании',
    totalPending: 'Всего ожидает',
    awaitingApproval: 'Ожидает одобрения',
    hoursToApprove: 'Часы для одобрения',
    moneyRequests: 'Запросы средств',
    actionsNeeded: 'Требуются действия',
    reviewNow: 'Просмотреть сейчас',
    allCaughtUp: 'Все актуально!',
    quickActions: 'Быстрые действия',

    addEmployeeDesc: 'Создать новую учетную запись сотрудника',
    addCustomerDesc: 'Зарегистрировать нового клиента',
    reviewWorkLogsDesc: 'Одобрить поданные часы',
    generateInvoiceDesc: 'Создать счет для клиента',

    gettingStarted: 'Начало работы',
    completeSteps: 'Выполните эти шаги для настройки системы:',
    step1: 'Добавьте первого клиента',
    step2: 'Создайте проект для клиента',
    step3: 'Добавьте сотрудников и поделитесь учетными данными',
    step4: 'Назначьте сотрудников на проекты',
    step5: 'Сотрудники подают журналы работы через приложение',

    systemLinks: 'Системные ссылки',
    djangoAdmin: 'Панель администратора Django',
    djangoAdminDesc: 'Расширенное управление базой данных',
    apiDocs: 'Документация API',
    apiDocsDesc: 'Справочник Swagger API',
    systemSettings: 'Системные настройки',
    systemSettingsDesc: 'Настройте ваши параметры',

    totalEmployees: 'Всего сотрудников',
    active: 'Активные',
    pending: 'Ожидают',
    incomplete: 'Незавершенные',
    addEmployee: 'Добавить сотрудника',
    viewEmployee: 'Просмотреть сотрудника',
    editProfile: 'Редактировать профиль',
    approve: 'Одобрить',
    reject: 'Отклонить',
    refresh: 'Обновить',
    search: 'Поиск',
    searchEmployees: 'Поиск сотрудников...',
    manageProfiles: 'Управляйте профилями и одобрениями сотрудников',
    noEmployeesFound: 'Сотрудники не найдены',
    clickAddEmployee: 'Нажмите "Добавить сотрудника" для создания',

    addNewEmployee: 'Добавить нового сотрудника',
    firstName: 'Имя',
    lastName: 'Фамилия',
    email: 'Электронная почта',
    temporaryPassword: 'Временный пароль',
    generate: 'Сгенерировать',
    createEmployee: 'Создать сотрудника',
    cancel: 'Отмена',
    employeeCreated: 'Сотрудник создан!',
    shareCredentials: 'Поделитесь учетными данными с',
    copyCredentials: 'Копировать данные',
    shareViaWhatsApp: 'Отправить через WhatsApp',
    done: 'Готово',
    password: 'Пароль',
    employeeWillSetPassword: 'Сотрудник установит собственный пароль при первом входе',

    editEmployeeProfile: 'Редактировать профиль сотрудника',
    personalInformation: 'Личная информация',
    contactInformation: 'Контактная информация',
    contractInformation: 'Информация о контракте',
    address: 'Адрес',
    streetAddress: 'Улица',
    postcode: 'Почтовый индекс',
    city: 'Город',
    phoneNumber: 'Номер телефона',
    nationality: 'Национальность',
    saveChanges: 'Сохранить изменения',
    saving: 'Сохранение...',
    phase: 'Фаза',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    notProvided: 'Не указано',

    addCustomer: 'Добавить клиента',
    companyName: 'Название компании',
    totalCustomers: 'Всего клиентов',
    manageCustomers: 'Управляйте учетными записями и контрактами клиентов',
    noCustomersYet: 'Клиентов пока нет',
    addFirstCustomer: 'Добавьте первого клиента для начала',
    searchCustomers: 'Поиск клиентов...',
    inactive: 'Неактивный',
    phone: 'Телефон',

    approved: 'Одобрено',
    rejected: 'Отклонено',

    close: 'Закрыть',
    view: 'Просмотреть',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    creating: 'Создание...',
    copied: 'Скопировано!',
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    assign: 'Назначить',

    manageProjects: 'Управляйте рабочими локациями и назначениями',
    newProject: 'Новый проект',
    totalProjects: 'Всего проектов',
    completed: 'Завершено',
    searchProjects: 'Поиск проектов...',
    noProjectsYet: 'Проектов пока нет. Добавьте первый проект из панели администратора.',
    started: 'Начат',
    all: 'Все',

    reviewWorkLogs: 'Просмотр журналов работы',
    manageWorkLogs: 'Просмотр и одобрение рабочих записей',
    totalLogs: 'Всего записей',
    pendingApproval: 'Ожидает одобрения',
    allWorkLogs: 'Все журналы работы',
    employee: 'Сотрудник',
    project: 'Проект',
    date: 'Дата',
    time: 'Время',
    hours: 'Часы',
    status: 'Статус',
    actions: 'Действия',
    noPendingWorkLogs: 'Нет журналов работы для одобрения.',
    noWorkLogsFound: 'Журналы работы не найдены.',
};

const translations: Record<string, Translations> = { en, ar, uk, ru };

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: keyof Translations) => string;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem('language') || 'en';
        setLanguageState(savedLang);

        // Apply RTL if needed
        if (savedLang === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        document.documentElement.lang = savedLang;
    }, []);

    const setLanguage = (lang: string) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);

        // Apply RTL
        if (lang === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        document.documentElement.lang = lang;
    };

    const t = (key: keyof Translations): string => {
        return translations[language]?.[key] || translations.en[key] || key;
    };

    const isRTL = language === 'ar';

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}

export type { Translations };
