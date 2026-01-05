/// Work Log History Screen
/// 
/// Shows employee's work log history with earnings breakdown and status filters.

import 'package:flutter/material.dart';
import '../../data/worklog_service.dart';
import '../../../../core/widgets/app_widgets.dart';

class WorkLogHistoryScreen extends StatefulWidget {
  const WorkLogHistoryScreen({super.key});

  @override
  State<WorkLogHistoryScreen> createState() => _WorkLogHistoryScreenState();
}

class _WorkLogHistoryScreenState extends State<WorkLogHistoryScreen> with SingleTickerProviderStateMixin {
  final WorkLogService _service = WorkLogService();
  late TabController _tabController;
  
  List<WorkLogModel> _allLogs = [];
  bool _isLoading = true;
  DateTime _dateFrom = DateTime.now().subtract(const Duration(days: 30));
  DateTime _dateTo = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadWorkLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkLogs() async {
    setState(() => _isLoading = true);
    try {
      final logs = await _service.getMyWorkLogs();
      setState(() => _allLogs = logs);
    } catch (e) {
      debugPrint('Failed to load work logs: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  List<WorkLogModel> _filterByStatus(String? status) {
    return _allLogs.where((log) {
      final inDateRange = log.date.isAfter(_dateFrom.subtract(const Duration(days: 1))) &&
          log.date.isBefore(_dateTo.add(const Duration(days: 1)));
      if (!inDateRange) return false;
      if (status == null) return true;
      return log.status == status;
    }).toList();
  }

  double _calculateTotalEarnings(List<WorkLogModel> logs, {bool approvedOnly = true}) {
    return logs.where((l) => !approvedOnly || l.isApproved)
        .fold(0.0, (sum, log) => sum + (log.earnings?.total ?? 0));
  }

  @override
  Widget build(BuildContext context) {
    final allFiltered = _filterByStatus(null);
    final approved = _filterByStatus('approved');
    final pending = _filterByStatus('submitted');
    final rejected = _filterByStatus('rejected');
    
    final totalEarnings = _calculateTotalEarnings(approved);
    final pendingCount = pending.length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Work History'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: () => _showDateFilter(context),
            icon: const Icon(Icons.date_range),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(text: 'All (${allFiltered.length})'),
            Tab(text: 'Approved (${approved.length})'),
            Tab(text: 'Pending (${pending.length})'),
            Tab(text: 'Rejected (${rejected.length})'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Summary Card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Earnings', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(
                        '€${totalEarnings.toStringAsFixed(2)}',
                        style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                      ),
                      if (pendingCount > 0) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.amber,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$pendingCount pending',
                            style: const TextStyle(color: Colors.black87, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.euro, color: Colors.white, size: 32),
                ),
              ],
            ),
          ),
          
          // Logs List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildLogsList(allFiltered),
                      _buildLogsList(approved),
                      _buildLogsList(pending),
                      _buildLogsList(rejected),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogsList(List<WorkLogModel> logs) {
    if (logs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.work_outline, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No work logs found', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadWorkLogs,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: logs.length,
        itemBuilder: (context, index) {
          final log = logs[index];
          return _buildLogCard(log);
        },
      ),
    );
  }

  Widget _buildLogCard(WorkLogModel log) {
    final earnings = log.earnings?.total ?? 0;
    
    Color statusColor;
    IconData statusIcon;
    switch (log.status) {
      case 'approved':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'submitted':
        statusColor = Colors.amber;
        statusIcon = Icons.pending;
        break;
      case 'rejected':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.edit;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _showLogDetail(log),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Date
                Container(
                  width: 50,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        log.date.day.toString(),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                      Text(
                        _monthName(log.date.month),
                        style: const TextStyle(fontSize: 10, color: AppColors.primary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log.locationCity.isNotEmpty ? log.locationCity : 'Unknown Location',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${log.startTime} - ${log.endTime} (${log.hoursWorked.toStringAsFixed(1)}h)',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                
                // Earnings / Status
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (log.isApproved)
                      Text(
                        '€${earnings.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 16),
                      )
                    else
                      Row(
                        children: [
                          Icon(statusIcon, size: 16, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            log.status.toUpperCase(),
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _monthName(int month) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[month - 1];
  }

  void _showDateFilter(BuildContext context) {
    showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _dateFrom, end: _dateTo),
    ).then((range) {
      if (range != null) {
        setState(() {
          _dateFrom = range.start;
          _dateTo = range.end;
        });
      }
    });
  }

  void _showLogDetail(WorkLogModel log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Work Log Details',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            _detailRow('Date', '${log.date.day}/${log.date.month}/${log.date.year}'),
            _detailRow('Location', '${log.locationAddress}, ${log.locationCity}'),
            _detailRow('Time', '${log.startTime} - ${log.endTime}'),
            _detailRow('Break', '${log.breakMinutes} minutes'),
            _detailRow('Hours', '${log.hoursWorked.toStringAsFixed(2)} hours'),
            _detailRow('Status', log.status.toUpperCase()),
            if (log.earnings != null) ...[
              _detailRow('Base Hours', '${log.earnings!.baseHours.toStringAsFixed(1)}h × €${log.earnings!.baseRate.toStringAsFixed(2)}'),
              _detailRow('Base Pay', '€${log.earnings!.baseAmount.toStringAsFixed(2)}'),
              if (log.earnings!.allowances.isNotEmpty) ...[
                for (final a in log.earnings!.allowances)
                  _detailRow(a.name, '€${a.amount.toStringAsFixed(2)} (${a.hours.toStringAsFixed(1)}h)'),
              ],
              _detailRow('Total', '€${log.earnings!.total.toStringAsFixed(2)}'),
            ],
            if (log.notes != null && log.notes!.isNotEmpty)
              _detailRow('Notes', log.notes!),
            if (log.rejectionReason != null && log.rejectionReason!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red.shade700, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        log.rejectionReason!,
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
