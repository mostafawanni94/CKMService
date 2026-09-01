/// Complete Profile Form - Beautiful 3-Card Design
/// 
/// First login experience with 3 beautiful cards:
/// 1. Personal Information
/// 2. ID Document & Identification  
/// 3. Certificates

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/widgets/country_picker.dart';
import '../../../../core/widgets/document_upload.dart';
import '../../../../core/localization/app_strings.dart';
import 'package:intl/intl.dart';
import '../../data/profile_service.dart';

class ProfileCompletionScreen extends StatefulWidget {
  const ProfileCompletionScreen({super.key});

  @override
  State<ProfileCompletionScreen> createState() => _ProfileCompletionScreenState();
}

class _ProfileCompletionScreenState extends State<ProfileCompletionScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _pageController = PageController();
  int _currentCard = 0;
  bool _isSubmitting = false;

  // ==============================
  // CARD 1: Personal Information
  // ==============================
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _prefixController = TextEditingController();
  String? _gender;
  DateTime? _dateOfBirth;
  final _birthplaceController = TextEditingController();
  final _bsnController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _houseNumberController = TextEditingController();
  final _postcodeController = TextEditingController();
  final _cityController = TextEditingController();
  String _country = 'Netherlands';
  final _ibanController = TextEditingController();
  String? _nationality;

  // ==============================
  // CARD 2: ID Document
  // ==============================
  String? _idDocumentType;
  final _idNumberController = TextEditingController();
  DateTime? _idIssueDate;
  DateTime? _idExpiryDate;
  String? _idFrontPath;
  String? _idBackPath;
  String? _idPdfPath;

  // ==============================
  // CARD 2b: Driver's License
  // ==============================
  final _dlNumberController = TextEditingController();
  DateTime? _dlIssueDate;
  DateTime? _dlExpiryDate;
  String? _dlFrontPath;
  String? _dlBackPath;
  String? _dlPdfPath;
  List<String> _dlCategories = [];

  // ==============================
  // CARD 3: Certificates
  // ==============================
  final _vcaDiplomaController = TextEditingController();
  bool _hasVcaVol = false;
  List<Map<String, dynamic>> _addedCertificates = [];
  List<Map<String, dynamic>> _availableCertificateTypes = [];
  bool _isLoadingCertTypes = true;

  @override
  void initState() {
    super.initState();
    _loadCertificateTypes();
  }

  Future<void> _loadCertificateTypes() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _availableCertificateTypes = [
        {'id': '1', 'name': 'VCA Basis', 'description': 'Basic safety certificate', 'required': true},
        {'id': '2', 'name': 'VCA VOL', 'description': 'Full safety certificate', 'required': false},
        {'id': '3', 'name': 'Rijbewijs', 'description': 'Driver\'s license', 'required': false},
        {'id': '4', 'name': 'BHV', 'description': 'Emergency response', 'required': false},
        {'id': '5', 'name': 'Heftruck', 'description': 'Forklift license', 'required': false},
      ];
      _isLoadingCertTypes = false;
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _prefixController.dispose();
    _birthplaceController.dispose();
    _bsnController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _houseNumberController.dispose();
    _postcodeController.dispose();
    _cityController.dispose();
    _ibanController.dispose();
    _idNumberController.dispose();
    _dlNumberController.dispose();
    _vcaDiplomaController.dispose();
    super.dispose();
  }

  String get _initials {
    final first = _firstNameController.text.isNotEmpty ? _firstNameController.text[0] : '';
    final last = _lastNameController.text.isNotEmpty ? _lastNameController.text[0] : '';
    return '$first$last'.toUpperCase();
  }

  /// Validate Dutch BSN number (11-test)
  String? _validateBsn(String value) {
    if (value.isEmpty) return 'Please enter your BSN';
    if (value.length != 9 || !RegExp(r'^\d{9}$').hasMatch(value)) {
      return 'BSN must be exactly 9 digits';
    }
    // 11-test validation
    int total = 0;
    for (int i = 0; i < 9; i++) {
      int digit = int.parse(value[i]);
      int multiplier = i < 8 ? (9 - i) : -1;
      total += digit * multiplier;
    }
    if (total % 11 != 0) {
      return 'Invalid BSN number (fails 11-test)';
    }
    return null; // Valid
  }

  /// Validate IBAN format
  String? _validateIban(String value) {
    if (value.isEmpty) return 'Please enter your IBAN';
    final cleanIban = value.replaceAll(' ', '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return 'IBAN must be 15-34 characters';
    }
    if (!RegExp(r'^[A-Z]{2}').hasMatch(cleanIban)) {
      return 'IBAN must start with country code (e.g. NL)';
    }
    return null; // Valid
  }

  bool _validateCurrentCard() {
    switch (_currentCard) {
      case 0: // Personal Information
        return _firstNameController.text.isNotEmpty &&
            _lastNameController.text.isNotEmpty &&
            _gender != null &&
            _dateOfBirth != null &&
            _validateBsn(_bsnController.text) == null &&  // Use 11-test
            _phoneController.text.isNotEmpty &&
            _streetController.text.isNotEmpty &&
            _postcodeController.text.isNotEmpty &&
            _cityController.text.isNotEmpty &&
            _validateIban(_ibanController.text) == null &&  // Use IBAN validation
            _nationality != null;
      case 1: // ID Document
        return _idDocumentType != null &&
            _idNumberController.text.isNotEmpty &&
            _idIssueDate != null &&
            _idExpiryDate != null &&
            ((_idFrontPath != null && _idBackPath != null) || _idPdfPath != null);
      case 2: // Certificates
        return true; // Optional
      default:
        return true;
    }
  }

  void _nextCard() {
    // Check validation before allowing navigation
    if (!_validateCurrentCard()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(_getValidationErrorMessage()),
              ),
            ],
          ),
          backgroundColor: Colors.red.shade600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      return; // Block navigation
    }
    
    if (_currentCard < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }
  
  String _getValidationErrorMessage() {
    switch (_currentCard) {
      case 0:
        if (_firstNameController.text.isEmpty) return 'Please enter your first name';
        if (_lastNameController.text.isEmpty) return 'Please enter your last name';
        if (_gender == null) return 'Please select your gender';
        if (_dateOfBirth == null) return 'Please enter your date of birth';
        // BSN validation with 11-test
        final bsnError = _validateBsn(_bsnController.text);
        if (bsnError != null) return bsnError;
        if (_phoneController.text.isEmpty) return 'Please enter your phone number';
        if (_streetController.text.isEmpty) return 'Please enter your street';
        if (_postcodeController.text.isEmpty) return 'Please enter your postcode';
        if (_cityController.text.isEmpty) return 'Please enter your city';
        // IBAN validation
        final ibanError = _validateIban(_ibanController.text);
        if (ibanError != null) return ibanError;
        if (_nationality == null) return 'Please select your nationality';
        return 'Please fill all required fields';
      case 1:
        if (_idDocumentType == null) return 'Please select document type';
        if (_idNumberController.text.isEmpty) return 'Please enter document number';
        if (_idIssueDate == null) return 'Please select issue date';
        if (_idExpiryDate == null) return 'Please select expiry date';
        if (_idFrontPath == null && _idPdfPath == null) return 'Please upload ID document';
        return 'Please complete ID document section';
      default:
        return 'Please fill all required fields';
    }
  }

  void _previousCard() {
    if (_currentCard > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _submit() async {
    // Validate all required cards before submission
    // Check Card 0 (Personal Info)
    final originalCard = _currentCard;
    _currentCard = 0;
    if (!_validateCurrentCard()) {
      _currentCard = originalCard;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.white),
              SizedBox(width: 12),
              Text('Please complete Personal Information first'),
            ],
          ),
          backgroundColor: Colors.red.shade600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      // Navigate to card 0
      _pageController.animateToPage(0, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      return;
    }
    
    // Check Card 1 (ID Document)
    _currentCard = 1;
    if (!_validateCurrentCard()) {
      _currentCard = originalCard;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.white),
              SizedBox(width: 12),
              Text('Please complete ID Document section first'),
            ],
          ),
          backgroundColor: Colors.red.shade600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      // Navigate to card 1
      _pageController.animateToPage(1, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      return;
    }
    
    _currentCard = originalCard;
    
    setState(() => _isSubmitting = true);
    
    try {
      final profileService = ProfileService();
      
      // Collect profile data as string fields for multipart
      final dateFormatter = DateFormat('yyyy-MM-dd');
      final fields = <String, String>{};
      
      // Add text fields (only non-null values)
      fields['first_name'] = _firstNameController.text;
      fields['last_name'] = _lastNameController.text;
      if (_prefixController.text.isNotEmpty) fields['prefix_name'] = _prefixController.text;
      fields['initials'] = '${_firstNameController.text.isNotEmpty ? _firstNameController.text[0] : ''}${_lastNameController.text.isNotEmpty ? _lastNameController.text[0] : ''}';
      if (_gender != null) fields['gender'] = _gender!.toLowerCase();
      if (_dateOfBirth != null) fields['date_of_birth'] = dateFormatter.format(_dateOfBirth!);
      if (_birthplaceController.text.isNotEmpty) fields['birthplace'] = _birthplaceController.text;
      fields['bsn'] = _bsnController.text;
      fields['phone_number'] = _phoneController.text;
      fields['address'] = '${_streetController.text} ${_houseNumberController.text}';
      fields['postcode'] = _postcodeController.text;
      fields['city'] = _cityController.text;
      fields['iban'] = _ibanController.text;
      if (_nationality != null) fields['nationality'] = _nationality!;
      if (_idDocumentType != null) fields['document_type_name'] = _idDocumentType!.toLowerCase().replaceAll(' ', '_');
      if (_idNumberController.text.isNotEmpty) fields['document_number'] = _idNumberController.text;
      if (_idExpiryDate != null) fields['document_expiry_date'] = dateFormatter.format(_idExpiryDate!);
      fields['has_drivers_license'] = _dlCategories.isNotEmpty.toString();
      
      // Collect files
      final files = <String, File>{};
      if (_idFrontPath != null) files['id_document_front'] = File(_idFrontPath!);
      if (_idBackPath != null) files['id_document_back'] = File(_idBackPath!);
      if (_idPdfPath != null) files['id_document_pdf'] = File(_idPdfPath!);
      if (_dlFrontPath != null) files['drivers_license_front'] = File(_dlFrontPath!);
      if (_dlBackPath != null) files['drivers_license_back'] = File(_dlBackPath!);
      
      // Update profile with files
      await profileService.updateProfileWithFiles(
        fields: fields,
        files: files.isNotEmpty ? files : null,
      );
      
      // Submit for approval
      await profileService.submitForApproval();
      
      if (mounted) {
        context.read<AuthViewModel>().markProfileSubmitted();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                const Text('Profile submitted for approval!'),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text('Error: ${e.toString()}')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authViewModel = context.watch<AuthViewModel>();
    final user = authViewModel.user;
    final isRejected = user?.isRejected ?? false;
    final rejectionReason = user?.rejectionReason;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(isRejected, rejectionReason),
            
            // Progress Indicator
            _buildProgressIndicator(),
            
            // Cards
            Expanded(
              child: Form(
                key: _formKey,
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (index) => setState(() => _currentCard = index),
                  children: [
                    _buildPersonalInfoCard(),
                    _buildIdDocumentCard(),
                    _buildCertificatesCard(),
                  ],
                ),
              ),
            ),
            
            // Navigation Buttons
            _buildNavigationButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isRejected, String? rejectionReason) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primary.withOpacity(0.7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _initials.isEmpty ? '?' : _initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              
              // Title
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isRejected ? 'Fix Your Profile' : 'Complete Your Profile',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Step ${_currentCard + 1} of 3',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Logout
              IconButton(
                onPressed: () => context.read<AuthViewModel>().logout(),
                icon: Icon(Icons.logout, color: Colors.grey.shade400),
              ),
            ],
          ),
          
          // Rejection Banner
          if (isRejected && rejectionReason != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.red.shade600, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      rejectionReason,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: List.generate(3, (index) {
          final isCompleted = index < _currentCard;
          final isCurrent = index == _currentCard;
          
          return Expanded(
            child: Row(
              children: [
                // Circle
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isCompleted || isCurrent ? AppColors.primary : Colors.grey.shade200,
                    shape: BoxShape.circle,
                    boxShadow: isCurrent ? [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ] : null,
                  ),
                  child: Center(
                    child: isCompleted
                        ? const Icon(Icons.check, color: Colors.white, size: 18)
                        : Icon(
                            _getCardIcon(index),
                            color: isCurrent ? Colors.white : Colors.grey.shade400,
                            size: 18,
                          ),
                  ),
                ),
                
                // Connector line
                if (index < 2)
                  Expanded(
                    child: Container(
                      height: 3,
                      margin: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: isCompleted ? AppColors.primary : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  IconData _getCardIcon(int index) {
    switch (index) {
      case 0: return Icons.person_outline;
      case 1: return Icons.badge_outlined;
      case 2: return Icons.workspace_premium_outlined;
      default: return Icons.circle_outlined;
    }
  }

  // ==============================
  // CARD 1: Personal Information
  // ==============================
  Widget _buildPersonalInfoCard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: _buildCard(
        title: 'Personal Information',
        subtitle: 'Enter your personal details',
        icon: Icons.person_outline,
        color: Colors.blue,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name Row
            Row(
              children: [
                Expanded(child: _buildTextField('First Name *', _firstNameController, Icons.person_outline)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Last Name *', _lastNameController, Icons.person_outline)),
              ],
            ),
            const SizedBox(height: 16),
            
            _buildTextField('Prefix (optional)', _prefixController, Icons.text_fields, hint: 'e.g. van, de'),
            const SizedBox(height: 20),
            
            // Gender
            _buildLabel('Gender *'),
            const SizedBox(height: 8),
            Row(
              children: ['Male', 'Female', 'Other'].map((g) {
                final isSelected = _gender == g;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _gender = g),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        gradient: isSelected ? LinearGradient(
                          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
                        ) : null,
                        color: isSelected ? null : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: isSelected ? [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ] : null,
                      ),
                      child: Text(
                        g,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            
            // Date of Birth
            _buildDateField('Date of Birth *', _dateOfBirth, (date) => setState(() => _dateOfBirth = date)),
            const SizedBox(height: 16),
            
            _buildTextField('Birthplace', _birthplaceController, Icons.location_city),
            const SizedBox(height: 16),
            
            _buildTextField('BSN (Dutch ID) *', _bsnController, Icons.badge_outlined, 
              keyboardType: TextInputType.number, hint: '123456789'),
            const SizedBox(height: 16),
            
            _buildTextField('Phone Number *', _phoneController, Icons.phone_outlined,
              keyboardType: TextInputType.phone, hint: '+31 6 12345678'),
            const SizedBox(height: 20),
            
            // Address Section
            _buildSectionTitle('Address'),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(flex: 3, child: _buildTextField('Street *', _streetController, Icons.home_outlined)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Nr *', _houseNumberController, null)),
              ],
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(child: _buildTextField('Postcode *', _postcodeController, null, hint: '1234 AB')),
                const SizedBox(width: 12),
                Expanded(flex: 2, child: _buildTextField('City *', _cityController, Icons.location_city)),
              ],
            ),
            const SizedBox(height: 16),
            
            _buildDropdownField('Country *', _country, ['Netherlands', 'Belgium', 'Germany'], 
              (v) => setState(() => _country = v!)),
            const SizedBox(height: 20),
            
            // Financial Section
            _buildSectionTitle('Financial Details'),
            const SizedBox(height: 12),
            
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.security, color: Colors.green.shade600, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your banking details are encrypted and secure.',
                      style: TextStyle(fontSize: 12, color: Colors.green.shade700),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            
            _buildTextField('IBAN *', _ibanController, Icons.account_balance_outlined, 
              hint: 'NL00 BANK 0000 0000 00'),
            const SizedBox(height: 16),
            
            CountryPickerField(
              label: 'Nationality',
              value: _nationality,
              onChanged: (v) => setState(() => _nationality = v),
              required: true,
            ),
          ],
        ),
      ),
    );
  }

  // ==============================
  // CARD 2: ID Document & Driver's License
  // ==============================
  Widget _buildIdDocumentCard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // ID Document Card
          _buildCard(
            title: 'ID Document',
            subtitle: 'Upload your identification document',
            icon: Icons.badge_outlined,
            color: Colors.purple,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDropdownField('Document Type *', _idDocumentType, 
                  ['Passport', 'ID Card', 'Residence Permit'],
                  (v) => setState(() => _idDocumentType = v)),
                const SizedBox(height: 16),
                
                _buildTextField('Document Number *', _idNumberController, Icons.numbers,
                  hint: 'Enter document number'),
                const SizedBox(height: 16),
                
                // Issue and Expiry Dates
                Row(
                  children: [
                    Expanded(
                      child: _buildDateField('Issue Date *', _idIssueDate, 
                        (date) => setState(() => _idIssueDate = date)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateField('Expiry Date *', _idExpiryDate, 
                        (date) => setState(() => _idExpiryDate = date), 
                        minDate: DateTime.now()),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Upload Section Title
                _buildSectionTitle('Upload ID Document'),
                const SizedBox(height: 8),
                Text(
                  'Upload front and back, or a single PDF',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 16),
                
                // Document Upload Section with Front/Back/PDF
                DocumentUploadSection(
                  frontPath: _idFrontPath,
                  backPath: _idBackPath,
                  pdfPath: _idPdfPath,
                  onFrontUploaded: (path) => setState(() => _idFrontPath = path),
                  onBackUploaded: (path) => setState(() => _idBackPath = path),
                  onPdfUploaded: (path) => setState(() => _idPdfPath = path),
                  onFrontDelete: () => setState(() => _idFrontPath = null),
                  onBackDelete: () => setState(() => _idBackPath = null),
                  onPdfDelete: () => setState(() => _idPdfPath = null),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Driver's License Card
          _buildCard(
            title: 'Driver\'s License',
            subtitle: 'Add your driving license (optional)',
            icon: Icons.directions_car_outlined,
            color: Colors.teal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTextField('License Number', _dlNumberController, Icons.credit_card,
                  hint: 'Enter license number'),
                const SizedBox(height: 16),
                
                // Issue and Expiry Dates
                Row(
                  children: [
                    Expanded(
                      child: _buildDateField('Issue Date', _dlIssueDate, 
                        (date) => setState(() => _dlIssueDate = date)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateField('Expiry Date', _dlExpiryDate, 
                        (date) => setState(() => _dlExpiryDate = date), 
                        minDate: DateTime.now()),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // License Categories
                LicenseCategoriesSelector(
                  selectedCategories: _dlCategories,
                  onChanged: (cats) => setState(() => _dlCategories = cats),
                ),
                const SizedBox(height: 24),
                
                // Upload Section
                _buildSectionTitle('Upload License'),
                const SizedBox(height: 8),
                Text(
                  'Upload front and back, or a single PDF',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 16),
                
                DocumentUploadSection(
                  frontPath: _dlFrontPath,
                  backPath: _dlBackPath,
                  pdfPath: _dlPdfPath,
                  onFrontUploaded: (path) => setState(() => _dlFrontPath = path),
                  onBackUploaded: (path) => setState(() => _dlBackPath = path),
                  onPdfUploaded: (path) => setState(() => _dlPdfPath = path),
                  onFrontDelete: () => setState(() => _dlFrontPath = null),
                  onBackDelete: () => setState(() => _dlBackPath = null),
                  onPdfDelete: () => setState(() => _dlPdfPath = null),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==============================
  // CARD 3: Certificates
  // ==============================
  Widget _buildCertificatesCard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: _buildCard(
        title: 'Certificates',
        subtitle: 'Add your work certificates',
        icon: Icons.workspace_premium_outlined,
        color: Colors.orange,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info about certificates
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade600, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Add any certificates you have, such as VCA Basis, VCA VOL, BHV, Forklift, etc.',
                      style: TextStyle(fontSize: 13, color: Colors.blue.shade700),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            
            // Added certificates list
            if (_addedCertificates.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Icon(Icons.folder_open_outlined, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text(
                      'No certificates added yet',
                      style: TextStyle(fontSize: 15, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap the button below to add your certificates',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              )
            else
              ...List.generate(_addedCertificates.length, (index) {
                final cert = _addedCertificates[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.verified, color: Colors.green.shade600, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cert['type'] ?? 'Certificate', 
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                            if (cert['number'] != null)
                              Text('No: ${cert['number']}', 
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                            if (cert['expiryDate'] != null)
                              Text('Expires: ${cert['expiryDate']}', 
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.delete_outline, color: Colors.red.shade400),
                        onPressed: () => setState(() => _addedCertificates.removeAt(index)),
                      ),
                    ],
                  ),
                );
              }),
            
            const SizedBox(height: 16),
            
            // Add Certificate Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _showAddCertificateSheet,
                icon: const Icon(Icons.add_circle_outline),
                label: const Text('Add Certificate'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddCertificateSheet() {
    String? selectedType;
    final numberController = TextEditingController();
    DateTime? expiryDate;
    String? frontPath;
    String? backPath;
    String? pdfPath;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Add Certificate', 
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E3A5F))),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close, color: Color(0xFF6B7280)),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFF3F4F6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Select certificate type and upload documents',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
                const SizedBox(height: 24),
                
                // Certificate Type Selection
                Text('Certificate Type *', 
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _availableCertificateTypes.map((type) {
                    final isSelected = selectedType == type['name'];
                    return GestureDetector(
                      onTap: () => setSheetState(() => selectedType = type['name']),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF1E3A5F) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF1E3A5F) : Colors.grey.shade300,
                          ),
                        ),
                        child: Text(
                          type['name'] ?? '',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: isSelected ? Colors.white : Colors.grey.shade700,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                
                // Certificate Number
                Text('Certificate Number *', 
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                TextField(
                  controller: numberController,
                  decoration: InputDecoration(
                    hintText: 'Enter certificate number',
                    hintStyle: TextStyle(color: Colors.grey.shade400),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Expiry Date
                Text('Expiry Date *', 
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 365)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
                    );
                    if (date != null) setSheetState(() => expiryDate = date);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today_outlined, color: Colors.grey.shade500, size: 20),
                        const SizedBox(width: 12),
                        Text(
                          expiryDate != null 
                            ? '${expiryDate!.day}/${expiryDate!.month}/${expiryDate!.year}'
                            : 'Select expiry date',
                          style: TextStyle(
                            color: expiryDate != null ? Colors.grey.shade800 : Colors.grey.shade400,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Document Upload Section
                Text('Upload Certificate *', 
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                Text('Upload front and back, or a single PDF',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                const SizedBox(height: 12),
                
                DocumentUploadSection(
                  frontPath: frontPath,
                  backPath: backPath,
                  pdfPath: pdfPath,
                  onFrontUploaded: (path) => setSheetState(() => frontPath = path),
                  onBackUploaded: (path) => setSheetState(() => backPath = path),
                  onPdfUploaded: (path) => setSheetState(() => pdfPath = path),
                  onFrontDelete: () => setSheetState(() => frontPath = null),
                  onBackDelete: () => setSheetState(() => backPath = null),
                  onPdfDelete: () => setSheetState(() => pdfPath = null),
                ),
                const SizedBox(height: 24),
                
                // Add Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    // Require: type, number, expiry AND (front+back OR pdf)
                    onPressed: (selectedType != null && 
                               numberController.text.isNotEmpty && 
                               expiryDate != null &&
                               ((frontPath != null && backPath != null) || pdfPath != null)) 
                      ? () {
                          setState(() {
                            _addedCertificates.add({
                              'type': selectedType,
                              'number': numberController.text,
                              'expiryDate': '${expiryDate!.day}/${expiryDate!.month}/${expiryDate!.year}',
                              'frontPath': frontPath,
                              'backPath': backPath,
                              'pdfPath': pdfPath,
                            });
                          });
                          Navigator.pop(context);
                        } 
                      : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A5F),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      disabledBackgroundColor: Colors.grey.shade200,
                    ),
                    child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Add Certificate', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ]),
                ),
                )],
            ),
          ),
        ),
      ),
    );
  }

  // ==============================
  // HELPER WIDGETS
  // ==============================
  
  Widget _buildCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withOpacity(0.1), color.withOpacity(0.05)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
                      Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Card Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: child,
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData? icon, {
    TextInputType? keyboardType,
    String? hint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400),
            prefixIcon: icon != null ? Icon(icon, color: AppColors.primary, size: 20) : null,
            filled: true,
            fillColor: Colors.grey.shade50,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildLabel(String text) {
    final isRequired = text.endsWith('*');
    return Row(
      children: [
        Text(
          isRequired ? text.substring(0, text.length - 2) : text,
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        if (isRequired) Text(' *', style: TextStyle(color: Colors.red.shade400, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildSectionTitle(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppColors.textPrimary,
      ),
    );
  }

  Widget _buildDateField(String label, DateTime? value, Function(DateTime) onChanged, {DateTime? minDate}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: value ?? DateTime.now(),
              firstDate: minDate ?? DateTime(1940),
              lastDate: minDate != null ? DateTime(2100) : DateTime.now(),
            );
            if (date != null) onChanged(date);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Text(
                  value != null ? '${value.day}/${value.month}/${value.year}' : 'Select date',
                  style: TextStyle(
                    color: value != null ? AppColors.textPrimary : Colors.grey.shade400,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField(String label, String? value, List<String> items, Function(String?) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              hint: Text('Select', style: TextStyle(color: Colors.grey.shade400)),
              isExpanded: true,
              icon: Icon(Icons.keyboard_arrow_down, color: Colors.grey.shade400),
              items: items.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadBox(String label, String? path, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: path != null ? Colors.green.shade50 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: path != null ? Colors.green.shade300 : Colors.grey.shade300,
            style: path != null ? BorderStyle.solid : BorderStyle.solid,
          ),
        ),
        child: Column(
          children: [
            Icon(
              path != null ? Icons.check_circle : Icons.cloud_upload_outlined,
              size: 32,
              color: path != null ? Colors.green.shade600 : Colors.grey.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: path != null ? Colors.green.shade700 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCertificateSection(String title, String subtitle, bool required, {required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                        if (required) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.red.shade100,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('Required', style: TextStyle(fontSize: 10, color: Colors.red.shade700, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ],
                    ),
                    Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildNavigationButtons() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Back Button
          if (_currentCard > 0)
            OutlinedButton(
              onPressed: _previousCard,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                side: BorderSide(color: Colors.grey.shade300),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Back'),
            ),
          if (_currentCard > 0) const SizedBox(width: 12),
          
          // Next/Submit Button
          Expanded(
            child: PrimaryButton(
              text: _currentCard == 2 ? 'Submit Profile' : 'Continue',
              onPressed: _isSubmitting ? null : () {
                if (_currentCard == 2) {
                  _submit();
                } else {
                  _nextCard();
                }
              },
              isLoading: _isSubmitting,
            ),
          ),
        ],
      ),
    );
  }
}
