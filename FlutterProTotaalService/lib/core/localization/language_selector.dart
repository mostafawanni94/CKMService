/// Language Selector Widget
/// 
/// Allows user to change app language from anywhere.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app_strings.dart';
import '../widgets/app_widgets.dart';

/// Language Selector Button (for header/settings)
class LanguageSelector extends StatelessWidget {
  final bool compact;
  
  const LanguageSelector({super.key, this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Consumer<LocalizationProvider>(
      builder: (context, provider, _) {
        if (compact) {
          return PopupMenuButton<AppLanguage>(
            icon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.language, size: 20),
                const SizedBox(width: 4),
                Text(provider.currentLanguage.code.toUpperCase(), 
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
            onSelected: (language) => provider.setLanguage(language),
            itemBuilder: (context) => AppLanguage.values.map((lang) {
              final isSelected = lang == provider.currentLanguage;
              return PopupMenuItem(
                value: lang,
                child: Row(
                  children: [
                    if (isSelected) 
                      const Icon(Icons.check, size: 18, color: AppColors.primary)
                    else 
                      const SizedBox(width: 18),
                    const SizedBox(width: 12),
                    Text(lang.nativeName),
                    const SizedBox(width: 8),
                    Text('(${lang.englishName})', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
              );
            }).toList(),
          );
        }

        return _buildFullSelector(context, provider);
      },
    );
  }

  Widget _buildFullSelector(BuildContext context, LocalizationProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.language, color: AppColors.primary),
              SizedBox(width: 12),
              Text('Language', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          ...AppLanguage.values.map((lang) {
            final isSelected = lang == provider.currentLanguage;
            return GestureDetector(
              onTap: () => provider.setLanguage(lang),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : Colors.grey.shade200,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      lang.nativeName,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? AppColors.primary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '(${lang.englishName})',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                    if (lang.isRTL) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('RTL', style: TextStyle(fontSize: 10, color: Colors.orange)),
                      ),
                    ],
                    const Spacer(),
                    if (isSelected)
                      const Icon(Icons.check_circle, color: AppColors.primary),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

/// Show language selector as bottom sheet
void showLanguageSelector(BuildContext context) {
  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const LanguageSelector(),
          const SizedBox(height: 16),
        ],
      ),
    ),
  );
}
