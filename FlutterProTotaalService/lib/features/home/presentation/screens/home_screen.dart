/// Home Screen - Updated with Avatar, Wallet Colors, Assignments
/// 
/// Employee dashboard with data isolation.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../../../wallet/presentation/screens/advance_request_screen.dart';
import '../../../invoices/presentation/viewmodels/invoice_viewmodel.dart';
import '../../../invoices/presentation/screens/work_logs_screen.dart';
import '../../../invoices/presentation/screens/log_work_screen.dart';
import '../../../invoices/presentation/screens/invoices_screen.dart';
import '../../../shifts/data/shift_service.dart';
import '../../../shifts/presentation/screens/my_shifts_screen.dart';
import '../../../shifts/presentation/screens/shift_detail_screen.dart';
import '../../../settings/presentation/screens/notification_settings_screen.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/widgets/wallet_widgets.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Defer data loading to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    context.read<WalletViewModel>().loadWallet();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const _DashboardTab(),
          const WorkLogsScreen(),
          const InvoicesScreen(),
          const _ProfileTab(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: Colors.grey.shade400,
        elevation: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.access_time_outlined), activeIcon: Icon(Icons.access_time), label: 'Work'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), activeIcon: Icon(Icons.receipt_long), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

/// Dashboard Tab with Avatar and Wallet
class _DashboardTab extends StatelessWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthViewModel>();
    final wallet = context.watch<WalletViewModel>();

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          context.read<WalletViewModel>().loadWallet();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Avatar + Wallet Indicator
              Row(
                children: [
                  // User Avatar with wallet color indicator
                  UserAvatar(
                    firstName: auth.user?.firstName ?? 'User',
                    lastName: auth.user?.lastName ?? '',
                    size: 56,
                    walletBalance: wallet.balance,
                  ),
                  const SizedBox(width: 16),
                  
                  // Greeting
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${auth.user?.firstName ?? 'User'}!',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const Text('Pro Totaal Service', style: TextStyle(color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Wallet Card (simplified - balance hidden, shown inside wallet page)
              WalletBalanceWidget(
                balance: wallet.balance,
                hideBalance: true,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const InvoicesScreen()),
                ),
              ),
              const SizedBox(height: 24),

              // Quick Actions
              const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.add_circle_outline,
                      title: 'Log Work',
                      color: AppColors.primary,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LogWorkScreen())),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.calendar_month_outlined,
                      title: 'My Shifts',
                      color: const Color(0xFF7C3AED),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyShiftsScreen())),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.payments_outlined,
                      title: 'Advance',
                      color: AppColors.accent,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdvanceRequestScreen())),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Upcoming Shifts (dynamic from API)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Upcoming Shifts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyShiftsScreen())),
                    child: Text('View All', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Dynamic Shifts List
              const _UpcomingShiftsList(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Quick Action Card
class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({required this.icon, required this.title, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 12),
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Assignment Card - Location Only (Data Isolation)
class _AssignmentCard extends StatelessWidget {
  final String locationAddress;
  final String locationCity;
  final String date;
  final String time;
  final String status;

  const _AssignmentCard({
    required this.locationAddress,
    required this.locationCity,
    required this.date,
    required this.time,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = status == 'Active';
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: isActive ? AppColors.success : AppColors.primary, width: 4)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isActive ? AppColors.success : AppColors.primary).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.location_on, color: isActive ? AppColors.success : AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(locationAddress, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 4),
                Text(locationCity, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 12, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(date, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    const SizedBox(width: 12),
                    Icon(Icons.access_time, size: 12, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(time, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
          StatusBadge(status: status),
        ],
      ),
    );
  }
}

/// Profile Tab
class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthViewModel>();
    
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            
            // Avatar
            UserAvatar(
              firstName: auth.user?.firstName ?? 'User',
              lastName: auth.user?.lastName ?? '',
              size: 100,
            ),
            const SizedBox(height: 16),
            Text(
              auth.user?.fullName ?? 'User',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(auth.user?.email ?? '', style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 32),

            // Profile sections (read-only for employee after approval)
            _buildProfileItem(context, Icons.person_outline, 'Personal Information', 'View your details', null),
            _buildProfileItem(context, Icons.badge_outlined, 'Documents', 'ID, certificates', null),
            _buildProfileItem(context, Icons.notifications_outlined, 'Notifications', 'Manage preferences', 
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationSettingsScreen()))),
            _buildProfileItem(context, Icons.help_outline, 'Help & Support', 'Contact admin', null),
            const SizedBox(height: 24),

            // Logout
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showLogoutDialog(context),
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Logout', style: TextStyle(color: AppColors.error)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileItem(BuildContext context, IconData icon, String title, String subtitle, VoidCallback? onTap) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        onTap: onTap ?? () {},
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthViewModel>().logout();
            },
            child: const Text('Logout', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}

/// Upcoming Shifts List - Dynamic from API
class _UpcomingShiftsList extends StatefulWidget {
  const _UpcomingShiftsList();

  @override
  State<_UpcomingShiftsList> createState() => _UpcomingShiftsListState();
}

class _UpcomingShiftsListState extends State<_UpcomingShiftsList> {
  final ShiftService _shiftService = ShiftService();
  List<Shift> _shifts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadShifts();
  }

  Future<void> _loadShifts() async {
    try {
      final shifts = await _shiftService.getMyShifts();
      setState(() {
        _shifts = shifts.take(3).toList(); // Show max 3 on home
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (_shifts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
        ),
        child: Column(
          children: [
            Icon(Icons.calendar_today_outlined, size: 40, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              'No upcoming shifts',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.grey[600]),
            ),
            const SizedBox(height: 4),
            Text(
              'Your scheduled shifts will appear here',
              style: TextStyle(fontSize: 13, color: Colors.grey[400]),
            ),
          ],
        ),
      );
    }

    return Column(
      children: _shifts.map((shift) => _buildShiftCard(shift)).toList(),
    );
  }

  Widget _buildShiftCard(Shift shift) {
    final isToday = shift.isToday;
    
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ShiftDetailScreen(shift: shift),
          ),
        ).then((_) => _loadShifts());
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(
              color: isToday ? const Color(0xFF10B981) : Color(shift.statusColor),
              width: 4,
            ),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isToday ? const Color(0xFF10B981) : Color(shift.statusColor)).withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.calendar_today_rounded,
                color: isToday ? const Color(0xFF10B981) : Color(shift.statusColor),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          shift.projectName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      if (isToday)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'TODAY',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (!isToday) ...[
                        Icon(Icons.event_rounded, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          '${shift.scheduledDate.day}/${shift.scheduledDate.month}',
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (shift.scheduledStartTime != null && shift.scheduledEndTime != null) ...[
                        Icon(Icons.access_time_rounded, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          '${shift.scheduledStartTime!.substring(0, 5)} - ${shift.scheduledEndTime!.substring(0, 5)}',
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}
