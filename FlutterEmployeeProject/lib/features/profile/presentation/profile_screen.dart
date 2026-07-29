// Profile Screen — Customer company info, change password, logout

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/data/auth_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/shared_widgets.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final profile = authService.userProfile;

    return Scaffold(
      backgroundColor: AppTheme.primaryNavy,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          children: [
            const Text(
              'Profile',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 24),
            
            // Company info card
            GlassCard(
              child: Column(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppTheme.electricBlue.withValues(alpha: 0.2),
                    child: Text(
                      (profile?['company_name'] ?? '?')[0].toUpperCase(),
                      style: const TextStyle(
                        color: AppTheme.electricBlue,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    profile?['company_name'] ?? 'Customer',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: AppTheme.dividerColor, height: 1),
                  const SizedBox(height: 12),
                  
                  // Address
                  if (profile?['city'] != null)
                    _buildInfoRow(Icons.location_on_outlined, _buildAddress(profile!)),
                  if (profile?['website'] != null && profile!['website'].toString().isNotEmpty)
                    _buildInfoRow(Icons.language_outlined, profile['website']),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // App info
            GlassCard(
              child: Column(
                children: [
                  _buildMenuItem(Icons.info_outline, 'App Version', subtitle: '1.0.0'),
                  const Divider(color: AppTheme.dividerColor, height: 1),
                  _buildMenuItem(Icons.support_agent_outlined, 'Contact Support'),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Logout button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _showLogoutDialog(context),
                icon: const Icon(Icons.logout, color: AppTheme.accentRed),
                label: const Text('Sign Out', style: TextStyle(color: AppTheme.accentRed)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.accentRed),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Footer
            const Center(
              child: Text(
                '© 2026 CKM Services B.V.\nAll rights reserved',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTheme.electricBlue),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, {String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.textSecondary),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
          const Spacer(),
          if (subtitle != null)
            Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
        ],
      ),
    );
  }

  String _buildAddress(Map<String, dynamic> profile) {
    final parts = [
      if (profile['street_name'] != null) '${profile['street_name']} ${profile['house_number'] ?? ''}'.trim(),
      if (profile['postcode'] != null) profile['postcode'],
      if (profile['city'] != null) profile['city'],
    ];
    return parts.join(', ');
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out', style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text('Are you sure you want to sign out?', style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthService>().logout();
            },
            child: const Text('Sign Out', style: TextStyle(color: AppTheme.accentRed)),
          ),
        ],
      ),
    );
  }
}
