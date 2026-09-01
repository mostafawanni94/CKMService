import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/widgets/app_widgets.dart';

/// Notification Settings Screen
/// 
/// Allows employees to manage their notification preferences.
/// Each employee has their own settings stored in their profile.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final ApiClient _api = ApiClient();
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  
  // Notification preferences
  bool _pushEnabled = true;
  bool _certificateExpiry = true;
  bool _contractExpiry = true;
  bool _worklogReminders = true;
  bool _shiftChanges = true;
  bool _approvals = true;
  
  @override
  void initState() {
    super.initState();
    _loadSettings();
  }
  
  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final response = await _api.get('/employees/profiles/my_notification_settings/');
      
      setState(() {
        _pushEnabled = response['push_notifications_enabled'] ?? true;
        _certificateExpiry = response['notify_certificate_expiry'] ?? true;
        _contractExpiry = response['notify_contract_expiry'] ?? true;
        _worklogReminders = response['notify_worklog_reminders'] ?? true;
        _shiftChanges = response['notify_shift_changes'] ?? true;
        _approvals = response['notify_approvals'] ?? true;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load settings';
        _isLoading = false;
      });
    }
  }
  
  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    
    try {
      await _api.put('/employees/profiles/update_notification_settings/', body: {
        'push_notifications_enabled': _pushEnabled,
        'notify_certificate_expiry': _certificateExpiry,
        'notify_contract_expiry': _contractExpiry,
        'notify_worklog_reminders': _worklogReminders,
        'notify_shift_changes': _shiftChanges,
        'notify_approvals': _approvals,
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Settings saved'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notification Settings'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          if (!_isLoading)
            TextButton(
              onPressed: _isSaving ? null : _saveSettings,
              child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
            ),
        ],
      ),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_error!, style: TextStyle(color: AppColors.error)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadSettings,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Master Toggle
                _buildMasterToggle(),
                const SizedBox(height: 24),
                
                // Category Settings
                if (_pushEnabled) ...[
                  _buildSectionHeader('Notification Categories'),
                  const SizedBox(height: 8),
                  _buildSettingCard(
                    icon: Icons.badge_outlined,
                    iconColor: Colors.green,
                    title: 'Certificate Expiry',
                    subtitle: 'Reminders when certificates are expiring',
                    value: _certificateExpiry,
                    onChanged: (v) => setState(() => _certificateExpiry = v),
                  ),
                  _buildSettingCard(
                    icon: Icons.description_outlined,
                    iconColor: Colors.blue,
                    title: 'Contract Expiry',
                    subtitle: 'Reminders when your contract is expiring',
                    value: _contractExpiry,
                    onChanged: (v) => setState(() => _contractExpiry = v),
                  ),
                  _buildSettingCard(
                    icon: Icons.access_time,
                    iconColor: Colors.orange,
                    title: 'Work Log Reminders',
                    subtitle: 'Reminders to log your work hours',
                    value: _worklogReminders,
                    onChanged: (v) => setState(() => _worklogReminders = v),
                  ),
                  _buildSettingCard(
                    icon: Icons.calendar_today,
                    iconColor: Colors.purple,
                    title: 'Shift Changes',
                    subtitle: 'Updates about your shift schedule',
                    value: _shiftChanges,
                    onChanged: (v) => setState(() => _shiftChanges = v),
                  ),
                  _buildSettingCard(
                    icon: Icons.check_circle_outline,
                    iconColor: AppColors.primary,
                    title: 'Approvals & Rejections',
                    subtitle: 'When your work logs are reviewed',
                    value: _approvals,
                    onChanged: (v) => setState(() => _approvals = v),
                  ),
                ],
              ],
            ),
    );
  }
  
  Widget _buildMasterToggle() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: _pushEnabled
            ? [AppColors.primary, AppColors.primary.withOpacity(0.8)]
            : [Colors.grey, Colors.grey.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _pushEnabled ? Icons.notifications_active : Icons.notifications_off,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Push Notifications',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  _pushEnabled ? 'Enabled' : 'Disabled',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _pushEnabled,
            onChanged: (v) => setState(() => _pushEnabled = v),
            activeColor: Colors.white,
            activeTrackColor: Colors.white.withOpacity(0.3),
          ),
        ],
      ),
    );
  }
  
  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      ),
    );
  }
  
  Widget _buildSettingCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value ? iconColor.withOpacity(0.3) : AppColors.border,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 24),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
          ),
        ),
        trailing: Switch(
          value: value,
          onChanged: onChanged,
          activeColor: iconColor,
        ),
      ),
    );
  }
}
