/// Updated Wallet Widget with Color Logic
/// 
/// Green = positive, Orange = zero/pending, Red = negative

import 'package:flutter/material.dart';
import 'app_widgets.dart';

/// Wallet Balance Widget with Color Indicator
class WalletBalanceWidget extends StatelessWidget {
  final double balance;
  final bool compact;
  final bool hideBalance;
  final VoidCallback? onTap;

  const WalletBalanceWidget({
    super.key,
    required this.balance,
    this.compact = false,
    this.hideBalance = false,
    this.onTap,
  });

  Color get _balanceColor {
    if (balance > 0) return AppColors.success; // Green
    if (balance == 0) return Colors.orange;     // Orange  
    return AppColors.error;                      // Red
  }

  Color get _backgroundColor {
    if (balance > 0) return AppColors.success.withOpacity(0.1);
    if (balance == 0) return Colors.orange.withOpacity(0.1);
    return AppColors.error.withOpacity(0.1);
  }

  IconData get _icon {
    if (balance > 0) return Icons.trending_up;
    if (balance == 0) return Icons.remove;
    return Icons.trending_down;
  }

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _backgroundColor,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(_icon, size: 14, color: _balanceColor),
              const SizedBox(width: 4),
              Text(
                '€${balance.toStringAsFixed(2)}',
                style: TextStyle(
                  color: _balanceColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Card design when hideBalance is true (for home screen)
    if (hideBalance) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_balance_wallet, color: Colors.orange, size: 28),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Wallet Balance', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    SizedBox(height: 4),
                    Text('Tap to view earnings', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      );
    }

    // Standard card with balance visible
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _backgroundColor,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.account_balance_wallet, color: _balanceColor),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Wallet Balance', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    '€ ${balance.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: _balanceColor,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}

/// User Avatar Widget with Initials/Photo
class UserAvatar extends StatelessWidget {
  final String? photoUrl;
  final String firstName;
  final String lastName;
  final double size;
  final double? walletBalance;

  const UserAvatar({
    super.key,
    this.photoUrl,
    required this.firstName,
    required this.lastName,
    this.size = 48,
    this.walletBalance,
  });

  String get _initials {
    final first = firstName.isNotEmpty ? firstName[0] : '';
    final last = lastName.isNotEmpty ? lastName[0] : '';
    return '$first$last'.toUpperCase();
  }

  Color get _walletColor {
    if (walletBalance == null) return Colors.transparent;
    if (walletBalance! > 0) return AppColors.success;
    if (walletBalance! == 0) return Colors.orange;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
            image: photoUrl != null
                ? DecorationImage(image: NetworkImage(photoUrl!), fit: BoxFit.cover)
                : null,
          ),
          child: photoUrl == null
              ? Center(
                  child: Text(
                    _initials,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: size * 0.4,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                )
              : null,
        ),
        // Wallet indicator dot
        if (walletBalance != null)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: size * 0.3,
              height: size * 0.3,
              decoration: BoxDecoration(
                color: _walletColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}
