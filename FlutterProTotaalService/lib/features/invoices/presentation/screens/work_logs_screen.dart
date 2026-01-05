/// Work Logs Screen - Enhanced History View
/// 
/// Shows work history with status tabs, earnings, and filtering.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../viewmodels/invoice_viewmodel.dart';
import '../../data/invoice_service.dart';
import '../../../../core/widgets/app_widgets.dart';

class WorkLogsScreen extends StatefulWidget {
  const WorkLogsScreen({super.key});

  @override
  State<WorkLogsScreen> createState() => _WorkLogsScreenState();
}

class _WorkLogsScreenState extends State<WorkLogsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InvoiceViewModel>().loadWorkLogs();
    });
  }

  void _onTabChanged() {
    final vm = context.read<InvoiceViewModel>();
    switch (_tabController.index) {
      case 0: vm.setWorkLogFilter(WorkLogFilter.all); break;
      case 1: vm.setWorkLogFilter(WorkLogFilter.approved); break;
      case 2: vm.setWorkLogFilter(WorkLogFilter.pending); break;
      case 3: vm.setWorkLogFilter(WorkLogFilter.rejected); break;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Work History'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _showDateRangePicker,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Approved'),
            Tab(text: 'Pending'),
            Tab(text: 'Rejected'),
          ],
        ),
      ),
      body: Consumer<InvoiceViewModel>(
        builder: (context, vm, _) {
          if (vm.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return Column(
            children: [
              // Earnings Summary
              _buildEarningsSummary(vm),
              
              // Date Filter Display
              if (_startDate != null && _endDate != null)
                _buildDateFilterChip(),
              
              // Work Logs List
              Expanded(
                child: vm.filteredWorkLogs.isEmpty
                    ? EmptyState(
                        icon: Icons.work_off_outlined,
                        title: _getEmptyStateTitle(vm.workLogFilter),
                        message: _getEmptyStateMessage(vm.workLogFilter),
                      )
                    : RefreshIndicator(
                        onRefresh: () => vm.loadWorkLogs(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: vm.filteredWorkLogs.length,
                          itemBuilder: (_, i) => _WorkLogCard(
                            workLog: vm.filteredWorkLogs[i],
                            onTap: () => _showWorkLogDetails(vm.filteredWorkLogs[i]),
                          ),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEarningsSummary(InvoiceViewModel vm) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _SummaryItem(
                label: 'Approved',
                value: '€${vm.totalApprovedEarnings.toStringAsFixed(2)}',
                icon: Icons.check_circle,
                iconColor: Colors.greenAccent,
              ),
              Container(width: 1, height: 50, color: Colors.white24),
              _SummaryItem(
                label: 'Pending',
                value: '€${vm.totalPendingEarnings.toStringAsFixed(2)}',
                icon: Icons.schedule,
                iconColor: Colors.orangeAccent,
              ),
            ],
          ),
          if (vm.pendingCount > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.info_outline, color: Colors.orangeAccent, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    '${vm.pendingCount} pending approval',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDateFilterChip() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Chip(
            label: Text(
              '${_formatDate(_startDate!)} - ${_formatDate(_endDate!)}',
              style: const TextStyle(fontSize: 12),
            ),
            deleteIcon: const Icon(Icons.close, size: 16),
            onDeleted: () {
              setState(() {
                _startDate = null;
                _endDate = null;
              });
              context.read<InvoiceViewModel>().setDateFilter(DateFilter.thisWeek);
            },
            backgroundColor: AppColors.primary.withOpacity(0.1),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) => '${date.day}/${date.month}/${date.year}';

  String _getEmptyStateTitle(WorkLogFilter filter) {
    switch (filter) {
      case WorkLogFilter.approved: return 'No approved logs';
      case WorkLogFilter.pending: return 'No pending logs';
      case WorkLogFilter.rejected: return 'No rejected logs';
      default: return 'No work logs';
    }
  }

  String _getEmptyStateMessage(WorkLogFilter filter) {
    switch (filter) {
      case WorkLogFilter.approved: return 'Your approved work will appear here';
      case WorkLogFilter.pending: return 'Logs awaiting approval will appear here';
      case WorkLogFilter.rejected: return 'Logs that need editing will appear here';
      default: return 'Start logging your work to see history';
    }
  }

  Future<void> _showDateRangePicker() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _startDate != null && _endDate != null
          ? DateTimeRange(start: _startDate!, end: _endDate!)
          : null,
    );
    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      context.read<InvoiceViewModel>().setDateFilter(
        DateFilter.custom,
        start: picked.start,
        end: picked.end,
      );
    }
  }

  void _showWorkLogDetails(WorkLogModel log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _WorkLogDetailsSheet(workLog: log),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;

  const _SummaryItem({
    required this.label,
    required this.value,
    required this.icon,
    this.iconColor = Colors.white70,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: iconColor, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}

/// Work Log Card with full details
class _WorkLogCard extends StatelessWidget {
  final WorkLogModel workLog;
  final VoidCallback onTap;

  const _WorkLogCard({required this.workLog, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: _statusColor, width: 4)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Customer + Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      workLog.customerName.isNotEmpty ? workLog.customerName : workLog.projectName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusBadge(),
                ],
              ),
              const SizedBox(height: 8),
              
              // Project name (if different from customer)
              if (workLog.projectName.isNotEmpty && workLog.customerName.isNotEmpty)
                Text(
                  workLog.projectName,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
              
              const SizedBox(height: 12),
              
              // Date + Time + Hours
              Row(
                children: [
                  _buildInfoChip(Icons.calendar_today, _formatDate(workLog.workDate)),
                  const SizedBox(width: 12),
                  _buildInfoChip(Icons.access_time, '${workLog.startTime.substring(0, 5)} - ${workLog.endTime.substring(0, 5)}'),
                  const SizedBox(width: 12),
                  _buildInfoChip(Icons.timelapse, '${workLog.billableHours.toStringAsFixed(1)}h'),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Earnings (only for approved)
              if (workLog.isDone && workLog.estimatedEarnings != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.euro, color: AppColors.success, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        '${workLog.estimatedEarnings!.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // Pending status message
              if (workLog.isPending)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.hourglass_empty, color: Colors.orange, size: 16),
                      SizedBox(width: 4),
                      Text(
                        'Awaiting admin approval',
                        style: TextStyle(color: Colors.orange, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              
              // Rejection reason
              if (workLog.needsEdit && workLog.rejectionReason != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber, color: AppColors.error, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          workLog.rejectionReason!,
                          style: const TextStyle(color: AppColors.error, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color get _statusColor {
    if (workLog.isDone) return AppColors.success;
    if (workLog.isPending) return Colors.orange;
    if (workLog.needsEdit) return AppColors.error;
    return Colors.grey;
  }

  Widget _buildStatusBadge() {
    Color bgColor;
    Color textColor;
    
    if (workLog.isDone) {
      bgColor = AppColors.success.withOpacity(0.1);
      textColor = AppColors.success;
    } else if (workLog.isPending) {
      bgColor = Colors.orange.withOpacity(0.1);
      textColor = Colors.orange;
    } else if (workLog.needsEdit) {
      bgColor = AppColors.error.withOpacity(0.1);
      textColor = AppColors.error;
    } else {
      bgColor = Colors.grey.withOpacity(0.1);
      textColor = Colors.grey;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        workLog.statusLabel,
        style: TextStyle(color: textColor, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
      ],
    );
  }

  String _formatDate(DateTime date) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[date.weekday - 1]}, ${date.day}/${date.month}';
  }
}

/// Work Log Details Bottom Sheet
class _WorkLogDetailsSheet extends StatelessWidget {
  final WorkLogModel workLog;

  const _WorkLogDetailsSheet({required this.workLog});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
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
            const SizedBox(height: 20),
            
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.work, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        workLog.customerName.isNotEmpty ? workLog.customerName : workLog.projectName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      if (workLog.projectName.isNotEmpty && workLog.customerName.isNotEmpty)
                        Text(workLog.projectName, style: TextStyle(color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            // Details Grid
            _buildDetailRow('Date', _formatFullDate(workLog.workDate)),
            _buildDetailRow('Time', '${workLog.startTime.substring(0, 5)} - ${workLog.endTime.substring(0, 5)}'),
            _buildDetailRow('Hours', '${workLog.billableHours.toStringAsFixed(1)} hours'),
            if (workLog.supervisorName != null)
              _buildDetailRow('Supervisor', workLog.supervisorName!),
            if (workLog.serviceName != null)
              _buildDetailRow('Service', workLog.serviceName!),
            if (workLog.location != null && workLog.location!.isNotEmpty)
              _buildDetailRow('Location', workLog.location!),
            _buildDetailRow('Status', workLog.statusLabel),
            
            if (workLog.isDone && workLog.estimatedEarnings != null) ...[
              const Divider(height: 32),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    const Text('Estimated Earnings', style: TextStyle(color: AppColors.success, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text(
                      '€${workLog.estimatedEarnings!.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            
            if (workLog.notes != null && workLog.notes!.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('Notes', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(workLog.notes!),
              ),
            ],
            
            if (workLog.needsEdit && workLog.rejectionReason != null) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.warning_amber, color: AppColors.error, size: 20),
                        const SizedBox(width: 8),
                        const Text(
                          'Correction Required',
                          style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(workLog.rejectionReason!, style: const TextStyle(color: AppColors.error)),
                  ],
                ),
              ),
            ],
            
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
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

  String _formatFullDate(DateTime date) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[date.weekday - 1]}, ${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
