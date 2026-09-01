// Glassmorphic Card Widget — Premium translucent card effect

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final VoidCallback? onTap;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius = 16,
    this.onTap,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(vertical: 6),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.cardDark.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: borderColor ?? AppTheme.dividerColor.withValues(alpha: 0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Status badge with color coding
class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: config.color.withValues(alpha: 0.3)),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          color: config.color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  _StatusConfig _getConfig(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return _StatusConfig('Active', AppTheme.accentGreen);
      case 'completed':
        return _StatusConfig('Completed', AppTheme.electricBlue);
      case 'draft':
        return _StatusConfig('Draft', AppTheme.textMuted);
      case 'approved':
        return _StatusConfig('Approved', AppTheme.accentGreen);
      case 'submitted':
      case 'pending':
        return _StatusConfig('Pending', AppTheme.accentGold);
      case 'rejected':
        return _StatusConfig('Rejected', AppTheme.accentRed);
      case 'on_hold':
        return _StatusConfig('On Hold', AppTheme.accentGold);
      case 'cancelled':
        return _StatusConfig('Cancelled', AppTheme.textMuted);
      case 'planned':
        return _StatusConfig('Planned', AppTheme.brightBlue);
      case 'confirmed':
        return _StatusConfig('Confirmed', AppTheme.accentGreen);
      default:
        return _StatusConfig(status, AppTheme.textSecondary);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  _StatusConfig(this.label, this.color);
}

/// Shimmer loading placeholder
class ShimmerLoading extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerLoading({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppTheme.cardLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Circular progress indicator with percentage
class ProgressRing extends StatelessWidget {
  final double percentage;
  final double size;
  final double strokeWidth;

  const ProgressRing({
    super.key,
    required this.percentage,
    this.size = 60,
    this.strokeWidth = 6,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: percentage / 100,
              strokeWidth: strokeWidth,
              backgroundColor: AppTheme.dividerColor.withValues(alpha: 0.3),
              valueColor: AlwaysStoppedAnimation<Color>(
                percentage >= 100
                    ? AppTheme.accentGreen
                    : percentage >= 50
                        ? AppTheme.electricBlue
                        : AppTheme.accentGold,
              ),
              strokeCap: StrokeCap.round,
            ),
          ),
          Text(
            '${percentage.round()}%',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: size * 0.22,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
