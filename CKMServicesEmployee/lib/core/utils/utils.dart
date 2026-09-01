/// Utility Functions
/// 
/// Common utilities used across the app.

import 'package:intl/intl.dart';

/// Date Formatting
class DateUtils {
  static String formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy').format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  static String formatTime(DateTime date) {
    return DateFormat('HH:mm').format(date);
  }

  static String formatWeek(int year, int week) {
    return 'Week $week, $year';
  }

  static String timeAgo(DateTime date) {
    final difference = DateTime.now().difference(date);
    if (difference.inDays > 7) return formatDate(date);
    if (difference.inDays > 0) return '${difference.inDays}d ago';
    if (difference.inHours > 0) return '${difference.inHours}h ago';
    if (difference.inMinutes > 0) return '${difference.inMinutes}m ago';
    return 'Just now';
  }
}

/// Currency Formatting
class CurrencyUtils {
  static String formatEuro(double amount) {
    return '€ ${amount.toStringAsFixed(2)}';
  }

  static String formatEuroCompact(double amount) {
    if (amount >= 1000) {
      return '€${(amount / 1000).toStringAsFixed(1)}k';
    }
    return '€${amount.toStringAsFixed(0)}';
  }
}

/// Validation Utilities
class ValidationUtils {
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  static bool isValidPhone(String phone) {
    return RegExp(r'^\+?[0-9]{10,14}$').hasMatch(phone.replaceAll(' ', ''));
  }

  static bool isValidBSN(String bsn) {
    if (bsn.length != 9) return false;
    if (!RegExp(r'^\d{9}$').hasMatch(bsn)) return false;
    int sum = 0;
    for (int i = 0; i < 8; i++) {
      sum += int.parse(bsn[i]) * (9 - i);
    }
    sum -= int.parse(bsn[8]);
    return sum % 11 == 0;
  }

  static bool isValidIBAN(String iban) {
    final cleaned = iban.replaceAll(' ', '').toUpperCase();
    if (cleaned.length < 15 || cleaned.length > 34) return false;
    return RegExp(r'^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$').hasMatch(cleaned);
  }
}
