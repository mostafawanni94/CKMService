// Work Day Screen — Shows all workers, hours, breaks, and photos for a specific day

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shared_widgets.dart';
import 'photo_gallery_screen.dart';

class WorkDayScreen extends StatelessWidget {
  final String projectId;
  final String projectName;
  final String workDate;
  final List<Map<String, dynamic>> entries;

  const WorkDayScreen({
    super.key,
    required this.projectId,
    required this.projectName,
    required this.workDate,
    required this.entries,
  });

  @override
  Widget build(BuildContext context) {
    final parsedDate = DateTime.tryParse(workDate);
    final dateStr = parsedDate != null
        ? DateFormat('EEEE, d MMMM yyyy').format(parsedDate)
        : workDate;

    // Collect all photos from all entries
    final allPhotos = <Map<String, dynamic>>[];
    for (final entry in entries) {
      final photos = (entry['photos'] as List?) ?? [];
      for (final photo in photos) {
        allPhotos.add({
          ...photo as Map<String, dynamic>,
          'employee_name': entry['employee_first_name'] ?? 'Unknown',
        });
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.primaryNavy,
      appBar: AppBar(
        title: Text(dateStr, style: const TextStyle(fontSize: 16)),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        children: [
          // Day summary
          _buildDaySummary(),
          const SizedBox(height: 16),
          
          // Photos section
          if (allPhotos.isNotEmpty) ...[
            _buildPhotosSection(context, allPhotos),
            const SizedBox(height: 16),
          ],
          
          // Individual worker entries
          const Text(
            'Workers',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          
          ...entries.map((entry) => _buildWorkerCard(context, entry)),
          
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildDaySummary() {
    double totalHours = 0;
    int totalPhotos = 0;
    for (final e in entries) {
      totalHours += double.tryParse(e['calculated_hours']?.toString() ?? '0') ?? 0;
      totalPhotos += (e['photos_count'] ?? 0) as int;
    }

    return GlassCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatColumn(Icons.people_outline, '${entries.length}', 'Workers'),
          Container(width: 1, height: 40, color: AppTheme.dividerColor.withValues(alpha: 0.3)),
          _buildStatColumn(Icons.schedule, totalHours.toStringAsFixed(1), 'Total Hours'),
          Container(width: 1, height: 40, color: AppTheme.dividerColor.withValues(alpha: 0.3)),
          _buildStatColumn(Icons.photo_camera, '$totalPhotos', 'Photos'),
        ],
      ),
    );
  }

  Widget _buildStatColumn(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, size: 22, color: AppTheme.electricBlue),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildPhotosSection(BuildContext context, List<Map<String, dynamic>> allPhotos) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.photo_library_outlined, size: 18, color: AppTheme.electricBlue),
            const SizedBox(width: 6),
            Text(
              'Photos (${allPhotos.length})',
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PhotoGalleryScreen(photos: allPhotos),
                ),
              ),
              child: const Text('View All', style: TextStyle(color: AppTheme.electricBlue, fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        
        // Photo grid preview
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: allPhotos.length > 5 ? 5 : allPhotos.length,
            itemBuilder: (ctx, i) {
              final photo = allPhotos[i];
              return GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PhotoGalleryScreen(photos: allPhotos, initialIndex: i),
                  ),
                ),
                child: Container(
                  width: 100,
                  height: 100,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.dividerColor.withValues(alpha: 0.3)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          photo['photo_url'] ?? '',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppTheme.cardLight,
                            child: const Icon(Icons.broken_image, color: AppTheme.textMuted),
                          ),
                        ),
                        // Overlay with photo count badge on last visible
                        if (i == 4 && allPhotos.length > 5)
                          Container(
                            color: Colors.black54,
                            child: Center(
                              child: Text(
                                '+${allPhotos.length - 5}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildWorkerCard(BuildContext context, Map<String, dynamic> entry) {
    final hours = double.tryParse(entry['calculated_hours']?.toString() ?? '0') ?? 0;
    final breakMins = entry['break_duration_minutes'] ?? 0;
    final photos = (entry['photos'] as List?) ?? [];
    final breaks = (entry['breaks'] as List?) ?? [];
    
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Employee header
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.electricBlue.withValues(alpha: 0.2),
                child: Text(
                  (entry['employee_first_name'] ?? '?')[0].toUpperCase(),
                  style: const TextStyle(
                    color: AppTheme.electricBlue,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${entry['employee_first_name'] ?? ''} ${entry['employee_last_initial'] ?? ''}',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      entry['employee_role'] ?? 'Worker',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              StatusBadge(status: entry['status'] ?? 'planned'),
            ],
          ),
          
          const SizedBox(height: 14),
          
          // Time details
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.cardLight.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                _buildDetailRow(Icons.login, 'Started', entry['start_time'] ?? '—'),
                const SizedBox(height: 8),
                _buildDetailRow(Icons.logout, 'Finished', entry['end_time'] ?? '—'),
                const SizedBox(height: 8),
                _buildDetailRow(Icons.timer_outlined, 'Total Hours', '${hours.toStringAsFixed(1)} hrs'),
                if (breakMins > 0) ...[
                  const SizedBox(height: 8),
                  _buildDetailRow(Icons.coffee_outlined, 'Break', '$breakMins min'),
                ],
                if (breaks.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ...breaks.map<Widget>((brk) {
                    final b = brk as Map<String, dynamic>;
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: _buildDetailRow(
                        Icons.pause_circle_outline,
                        'Pause',
                        '${b['start'] ?? '—'} - ${b['end'] ?? '—'}',
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),
          
          // Notes
          if (entry['notes'] != null && entry['notes'].toString().isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.note_outlined, size: 14, color: AppTheme.textMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    entry['notes'],
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
          
          // Inline photos
          if (photos.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 70,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: photos.length,
                itemBuilder: (ctx, i) {
                  final photo = photos[i] as Map<String, dynamic>;
                  return GestureDetector(
                    onTap: () {
                      final allWithName = photos.map<Map<String, dynamic>>((p) => {
                        ...(p as Map<String, dynamic>),
                        'employee_name': entry['employee_first_name'] ?? 'Unknown',
                      }).toList();
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PhotoGalleryScreen(photos: allWithName, initialIndex: i),
                        ),
                      );
                    },
                    child: Container(
                      width: 70,
                      height: 70,
                      margin: const EdgeInsets.only(right: 6),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          photo['photo_url'] ?? '',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppTheme.cardLight,
                            child: const Icon(Icons.broken_image, color: AppTheme.textMuted, size: 18),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.electricBlue),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
