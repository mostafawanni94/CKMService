/// Work Log ViewModel
/// 
/// Manages work log state for the UI.

import 'package:flutter/foundation.dart';

import '../../data/worklog_service.dart';

enum WorkLogState { initial, loading, loaded, error }

class WorkLogViewModel extends ChangeNotifier {
  final WorkLogService _service;
  
  WorkLogState _state = WorkLogState.initial;
  List<WorkLogModel> _workLogs = [];
  String? _error;
  String _filterStatus = 'all';

  WorkLogViewModel({WorkLogService? service}) : _service = service ?? WorkLogService();

  // Getters
  WorkLogState get state => _state;
  List<WorkLogModel> get workLogs => _filteredWorkLogs;
  String? get error => _error;
  String get filterStatus => _filterStatus;

  List<WorkLogModel> get _filteredWorkLogs {
    if (_filterStatus == 'all') return _workLogs;
    return _workLogs.where((w) => w.status == _filterStatus).toList();
  }

  double get totalApprovedHours {
    return _workLogs.where((w) => w.isApproved).fold(0.0, (sum, w) => sum + w.hoursWorked);
  }

  int get pendingCount => _workLogs.where((w) => w.isPending).length;
  int get rejectedCount => _workLogs.where((w) => w.isRejected).length;

  // Actions
  void setFilter(String status) {
    _filterStatus = status;
    notifyListeners();
  }

  Future<void> loadWorkLogs({int? week, int? year}) async {
    _state = WorkLogState.loading;
    notifyListeners();

    try {
      _workLogs = await _service.getMyWorkLogs(week: week, year: year);
      _state = WorkLogState.loaded;
    } catch (e) {
      _error = e.toString();
      _state = WorkLogState.error;
    }
    notifyListeners();
  }

  Future<bool> submitWorkLog({
    required String assignmentId,
    required DateTime date,
    required String startTime,
    required String endTime,
    required int breakMinutes,
    String? notes,
  }) async {
    try {
      final workLog = await _service.submitWorkLog(
        assignmentId: assignmentId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        breakMinutes: breakMinutes,
        notes: notes,
      );
      _workLogs.insert(0, workLog);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }

  Future<bool> resubmitWorkLog(String id, Map<String, dynamic> updates) async {
    try {
      final updated = await _service.updateWorkLog(id, updates);
      await _service.submitForApproval(id);
      final index = _workLogs.indexWhere((w) => w.id == id);
      if (index >= 0) {
        _workLogs[index] = updated;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    }
  }
}
