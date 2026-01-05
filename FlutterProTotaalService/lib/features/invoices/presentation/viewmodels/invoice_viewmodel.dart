/// Invoice ViewModel - MVVM Pattern
/// 
/// Handles invoice and work log state with filtering.

import 'package:flutter/foundation.dart';
import '../../data/invoice_service.dart';

/// Filter options
enum WorkLogFilter { all, pending, approved, rejected, draft }
enum DateFilter { thisWeek, lastWeek, thisMonth, custom }

class InvoiceViewModel extends ChangeNotifier {
  final InvoiceService _service;

  List<WorkLogModel> _workLogs = [];
  List<EmployeeInvoiceModel> _invoices = [];
  Map<String, dynamic>? _pendingEarnings;
  
  bool _isLoading = false;
  String? _error;
  
  WorkLogFilter _workLogFilter = WorkLogFilter.all;
  DateFilter _dateFilter = DateFilter.thisWeek;
  DateTime? _customStartDate;
  DateTime? _customEndDate;
  int? _selectedWeekYear;
  int? _selectedWeekNumber;

  InvoiceViewModel({InvoiceService? service})
      : _service = service ?? InvoiceService();

  // Getters
  List<WorkLogModel> get workLogs => _workLogs;
  List<EmployeeInvoiceModel> get invoices => _invoices;
  Map<String, dynamic>? get pendingEarnings => _pendingEarnings;
  bool get isLoading => _isLoading;
  String? get error => _error;
  WorkLogFilter get workLogFilter => _workLogFilter;
  DateFilter get dateFilter => _dateFilter;

  // Computed getters
  List<WorkLogModel> get filteredWorkLogs {
    return _workLogs.where((log) {
      switch (_workLogFilter) {
        case WorkLogFilter.pending:
          return log.isPending;
        case WorkLogFilter.approved:
          return log.isDone;
        case WorkLogFilter.rejected:
          return log.needsEdit;
        case WorkLogFilter.draft:
          return log.isDraft;
        case WorkLogFilter.all:
        default:
          return true;
      }
    }).toList();
  }

  List<EmployeeInvoiceModel> get paidInvoices =>
      _invoices.where((i) => i.isPaid).toList();

  List<EmployeeInvoiceModel> get pendingInvoices =>
      _invoices.where((i) => i.isPending || i.isSent).toList();

  double get totalApprovedEarnings {
    return _workLogs
        .where((w) => w.isDone)
        .fold(0.0, (sum, w) => sum + (w.estimatedEarnings ?? 0));
  }

  double get totalPendingEarnings {
    return _workLogs
        .where((w) => w.isPending)
        .fold(0.0, (sum, w) => sum + (w.estimatedEarnings ?? 0));
  }

  int get pendingCount => _workLogs.where((w) => w.isPending).length;

  double get totalApprovedHours {
    return _workLogs
        .where((w) => w.isDone)
        .fold(0.0, (sum, w) => sum + w.billableHours);
  }

  /// Set work log filter
  void setWorkLogFilter(WorkLogFilter filter) {
    _workLogFilter = filter;
    notifyListeners();
  }

  /// Set date filter
  void setDateFilter(DateFilter filter, {DateTime? start, DateTime? end}) {
    _dateFilter = filter;
    _customStartDate = start;
    _customEndDate = end;
    loadWorkLogs();
  }

  /// Set week filter
  void setWeekFilter(int year, int week) {
    _selectedWeekYear = year;
    _selectedWeekNumber = week;
    loadWorkLogs();
  }

  /// Clear week filter
  void clearWeekFilter() {
    _selectedWeekYear = null;
    _selectedWeekNumber = null;
    loadWorkLogs();
  }

  /// Load work logs
  Future<void> loadWorkLogs() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      DateTime? startDate;
      DateTime? endDate;
      
      // Calculate date range based on filter
      final now = DateTime.now();
      switch (_dateFilter) {
        case DateFilter.thisWeek:
          startDate = now.subtract(Duration(days: now.weekday - 1));
          endDate = startDate.add(const Duration(days: 6));
          break;
        case DateFilter.lastWeek:
          startDate = now.subtract(Duration(days: now.weekday + 6));
          endDate = startDate.add(const Duration(days: 6));
          break;
        case DateFilter.thisMonth:
          startDate = DateTime(now.year, now.month, 1);
          endDate = DateTime(now.year, now.month + 1, 0);
          break;
        case DateFilter.custom:
          startDate = _customStartDate;
          endDate = _customEndDate;
          break;
      }

      _workLogs = await _service.getMyWorkLogs(
        weekYear: _selectedWeekYear,
        weekNumber: _selectedWeekNumber,
        startDate: startDate,
        endDate: endDate,
      );
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load invoices
  Future<void> loadInvoices() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _invoices = await _service.getMyInvoices();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load pending earnings preview
  Future<void> loadPendingEarnings() async {
    try {
      _pendingEarnings = await _service.getPendingEarnings();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Submit work log for approval
  Future<bool> submitWorkLog(String id) async {
    try {
      await _service.submitWorkLog(id);
      await loadWorkLogs();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Update work log (when it was rejected)
  Future<bool> updateWorkLog(String id, Map<String, dynamic> data) async {
    try {
      await _service.updateWorkLog(id, data);
      await loadWorkLogs();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
