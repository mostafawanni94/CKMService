/// Invoices Screen - View earnings and payment history
/// 
/// Shows paid/pending invoices with details.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../viewmodels/invoice_viewmodel.dart';
import '../../data/invoice_service.dart';
import '../../../../core/widgets/app_widgets.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    // Defer data loading to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InvoiceViewModel>().loadInvoices();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Earnings'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Modern Pill-Style Tabs
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                _buildTabButton(0, 'All'),
                const SizedBox(width: 8),
                _buildTabButton(1, 'Pending'),
                const SizedBox(width: 8),
                _buildTabButton(2, 'Paid'),
              ],
            ),
          ),
          // Tab Content
          Expanded(
            child: Consumer<InvoiceViewModel>(
              builder: (context, vm, _) {
                return IndexedStack(
                  index: _selectedTab,
                  children: [
                    // All Tab
                    _buildAllTab(vm),
                    // Pending Tab
                    _buildPendingTab(vm),
                    // Paid Tab
                    _buildPaidTab(vm),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(int index, String label) {
    final isSelected = _selectedTab == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTab = index;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(25),
          boxShadow: isSelected
              ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildAllTab(InvoiceViewModel vm) {
    final allInvoices = [...vm.pendingInvoices, ...vm.paidInvoices];
    if (allInvoices.isEmpty) {
      return const EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No invoices yet',
        message: 'Your invoices will appear here',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: allInvoices.length,
      itemBuilder: (_, i) => _InvoiceCard(
        invoice: allInvoices[i],
        isPaid: allInvoices[i].isPaid,
        onTap: () => _showInvoiceDetails(allInvoices[i]),
      ),
    );
  }

  Widget _buildPendingTab(InvoiceViewModel vm) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Next Payout Card
          _buildNextPayoutCard(vm),
          const SizedBox(height: 24),
          
          // Pending Invoices
          const Text('Upcoming Payments', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          
          if (vm.pendingInvoices.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text('No pending invoices', style: TextStyle(color: AppColors.textSecondary)),
              ),
            )
          else
            ...vm.pendingInvoices.map((invoice) => _InvoiceCard(
              invoice: invoice,
              onTap: () => _showInvoiceDetails(invoice),
            )),
        ],
      ),
    );
  }

  Widget _buildNextPayoutCard(InvoiceViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.orange.shade600, Colors.orange.shade400],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.schedule, color: Colors.white70),
              const SizedBox(width: 8),
              const Text('Next Payout', style: TextStyle(color: Colors.white70)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '€ ${vm.totalPendingEarnings.toStringAsFixed(2)}',
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Based on ${vm.totalApprovedHours.toStringAsFixed(1)} approved hours',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildPaidTab(InvoiceViewModel vm) {
    if (vm.paidInvoices.isEmpty) {
      return const EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No payments yet',
        message: 'Your completed payments will appear here',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: vm.paidInvoices.length,
      itemBuilder: (_, i) => _InvoiceCard(
        invoice: vm.paidInvoices[i],
        isPaid: true,
        onTap: () => _showInvoiceDetails(vm.paidInvoices[i]),
      ),
    );
  }

  void _showInvoiceDetails(EmployeeInvoiceModel invoice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => _InvoiceDetailsSheet(
          invoice: invoice,
          scrollController: controller,
        ),
      ),
    );
  }
}

/// Invoice Card Widget
class _InvoiceCard extends StatelessWidget {
  final EmployeeInvoiceModel invoice;
  final bool isPaid;
  final VoidCallback onTap;

  const _InvoiceCard({
    required this.invoice,
    this.isPaid = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(
              color: isPaid ? AppColors.success : Colors.orange,
              width: 4,
            ),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
        ),
        child: Row(
          children: [
            // Status Icon
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isPaid ? AppColors.success : Colors.orange).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isPaid ? Icons.check_circle : Icons.schedule,
                color: isPaid ? AppColors.success : Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invoice.weekLabel, style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(invoice.dateRange, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('${invoice.totalHours}h worked', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            
            // Amount
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '€${invoice.netEarnings.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isPaid ? AppColors.success : AppColors.textPrimary,
                  ),
                ),
                if (isPaid && invoice.paidDate != null)
                  Text(
                    'Paid ${invoice.paidDate!.day}/${invoice.paidDate!.month}',
                    style: const TextStyle(color: AppColors.success, fontSize: 11),
                  ),
              ],
            ),
            
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

/// Invoice Details Bottom Sheet
class _InvoiceDetailsSheet extends StatelessWidget {
  final EmployeeInvoiceModel invoice;
  final ScrollController scrollController;

  const _InvoiceDetailsSheet({
    required this.invoice,
    required this.scrollController,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        children: [
          // Handle
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invoice.weekLabel, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text(invoice.dateRange, style: const TextStyle(color: AppColors.textSecondary)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: invoice.isPaid ? AppColors.success.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Icon(
                      invoice.isPaid ? Icons.check_circle : Icons.schedule,
                      size: 16,
                      color: invoice.isPaid ? AppColors.success : Colors.orange,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      invoice.isPaid ? 'Paid' : 'Pending',
                      style: TextStyle(
                        color: invoice.isPaid ? AppColors.success : Colors.orange,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Earnings Summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _buildRow('Total Hours', '${invoice.totalHours}h'),
                _buildRow('Hourly Rate', '€${invoice.hourlyRate.toStringAsFixed(2)}'),
                const Divider(),
                _buildRow('Gross Earnings', '€${invoice.grossEarnings.toStringAsFixed(2)}'),
                _buildRow('Deductions', '-€${invoice.deductions.toStringAsFixed(2)}', isNegative: true),
                const Divider(),
                _buildRow('Net Earnings', '€${invoice.netEarnings.toStringAsFixed(2)}', isBold: true),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Work Breakdown
          const Text('Work Breakdown', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...invoice.lines.map((line) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(line.projectName, style: const TextStyle(fontWeight: FontWeight.w500)),
                      Text(line.description, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${line.hours}h', style: const TextStyle(color: AppColors.textSecondary)),
                    Text('€${line.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false, bool isNegative = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isNegative ? AppColors.error : null,
            ),
          ),
        ],
      ),
    );
  }
}
