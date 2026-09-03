// Project Detail Screen — Progress, team, work days, and Excel export
// Premium dark theme with glassmorphism and professional UX

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../data/project_service.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shared_widgets.dart';
import '../../../work_entries/presentation/screens/work_day_screen.dart';
import '../../../../core/localization/app_strings.dart';

class ProjectDetailScreen extends StatefulWidget {
  final String projectId;
  final String projectName;

  const ProjectDetailScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final ProjectService _service = ProjectService();
  
  Map<String, dynamic>? _project;
  List<Map<String, dynamic>> _entries = [];
  bool _isLoading = true;
  String? _error;
  
  // Filters
  final _nameFilterController = TextEditingController();
  DateTime? _dateFrom;
  DateTime? _dateTo;

  // Export
  bool _isExporting = false;
  DateTime? _exportFrom;
  DateTime? _exportTo;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _nameFilterController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    
    try {
      final project = await _service.getProjectDetail(widget.projectId);
      final entriesResp = await _service.getProjectEntries(
        widget.projectId,
        dateFrom: _dateFrom != null ? DateFormat('yyyy-MM-dd').format(_dateFrom!) : null,
        dateTo: _dateTo != null ? DateFormat('yyyy-MM-dd').format(_dateTo!) : null,
        employeeName: _nameFilterController.text.isNotEmpty ? _nameFilterController.text : null,
        pageSize: 50,
      );
      
      setState(() {
        _project = project;
        _entries = (entriesResp['results'] as List? ?? []).cast<Map<String, dynamic>>();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryNavy,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: AppTheme.deepNavy,
            surfaceTintColor: Colors.transparent,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.arrow_back_ios_new, size: 16, color: Colors.white),
              ),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              // Export button in app bar
              Container(
                margin: const EdgeInsets.only(right: 12),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _showExportDialog,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF10B981).withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.download_rounded, size: 16, color: Colors.white),
                          SizedBox(width: 6),
                          Text(context.strings.export, style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          )),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 56, bottom: 16, right: 80),
              title: Text(
                widget.projectName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.electricBlue.withValues(alpha: 0.15),
                      AppTheme.deepNavy,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.electricBlue))
            : _error != null
                ? _buildErrorState()
                : RefreshIndicator(
                    onRefresh: _loadData,
                    color: AppTheme.electricBlue,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      children: [
                        _buildStatsRow(),
                        const SizedBox(height: 16),
                        _buildProjectInfo(),
                        const SizedBox(height: 16),
                        _buildTeamSection(),
                        const SizedBox(height: 16),
                        _buildFilters(),
                        const SizedBox(height: 16),
                        _buildWorkEntries(),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: AppTheme.accentRed.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, size: 32, color: AppTheme.accentRed),
            ),
            const SizedBox(height: 16),
            Text(context.strings.failedToLoadProject, style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(_error ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(context.strings.retry),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Stats Row ────────────────────────────────────────────────────
  Widget _buildStatsRow() {
    if (_project == null) return const SizedBox.shrink();
    
    final totalDays = _project!['total_work_days'] ?? 0;
    final completedDays = _project!['completed_work_days'] ?? 0;
    final totalHours = _project!['total_hours'] ?? 0;
    final employeeCount = (_project!['employees'] as List?)?.length ?? 0;

    return Row(
      children: [
        _buildStatCard('Days', '$completedDays/$totalDays', Icons.calendar_today_rounded, const Color(0xFF3B82F6)),
        const SizedBox(width: 10),
        _buildStatCard('Hours', totalHours.toString(), Icons.schedule_rounded, const Color(0xFF8B5CF6)),
        const SizedBox(width: 10),
        _buildStatCard('Team', '$employeeCount', Icons.people_rounded, const Color(0xFF10B981)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(
              color: color,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            )),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  // ─── Project Info ─────────────────────────────────────────────────
  Widget _buildProjectInfo() {
    if (_project == null) return const SizedBox.shrink();
    
    final progress = (_project!['progress_percentage'] ?? 0).toDouble();

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ProgressRing(percentage: progress, size: 56, strokeWidth: 5),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        StatusBadge(status: _project!['status'] ?? 'draft'),
                        const Spacer(),
                        Text(
                          '${progress.toStringAsFixed(0)}%',
                          style: const TextStyle(
                            color: AppTheme.electricBlue,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Progress bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress / 100,
                        backgroundColor: AppTheme.dividerColor.withValues(alpha: 0.3),
                        valueColor: const AlwaysStoppedAnimation(AppTheme.electricBlue),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          const Divider(color: AppTheme.dividerColor, height: 1),
          const SizedBox(height: 12),
          
          // Location
          if (_project!['location_address'] != null || _project!['location_city'] != null)
            _buildInfoRow(
              Icons.location_on_rounded,
              [_project!['location_address'], _project!['location_city']]
                  .where((e) => e != null && e.toString().isNotEmpty)
                  .join(', '),
            ),
          
          // Dates
          _buildInfoRow(
            Icons.date_range_rounded,
            _formatDateRange(_project!['start_date'], _project!['expected_end_date']),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: AppTheme.electricBlue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Icon(icon, size: 14, color: AppTheme.electricBlue),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  // ─── Team Section ─────────────────────────────────────────────────
  Widget _buildTeamSection() {
    final employees = (_project?['employees'] as List?) ?? [];
    if (employees.isEmpty) return const SizedBox.shrink();
    
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: const Icon(Icons.people_rounded, size: 14, color: Color(0xFF10B981)),
              ),
              const SizedBox(width: 10),
              Text(
                'Team Members (${employees.length})',
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: employees.map<Widget>((emp) {
              final name = '${emp['first_name'] ?? ''} ${emp['last_name_initial'] ?? ''}'.trim();
              final initial = (emp['first_name'] ?? '?')[0].toUpperCase();
              final colors = [
                const Color(0xFF3B82F6), const Color(0xFF8B5CF6),
                const Color(0xFF10B981), const Color(0xFFF59E0B),
                const Color(0xFFEF4444), const Color(0xFF06B6D4),
              ];
              final color = colors[name.hashCode % colors.length];
              
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: color.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 13,
                      backgroundColor: color.withValues(alpha: 0.2),
                      child: Text(initial, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 8),
                    Text(name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ─── Filters ──────────────────────────────────────────────────────
  Widget _buildFilters() {
    final hasFilters = _dateFrom != null || _dateTo != null || _nameFilterController.text.isNotEmpty;
    
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: const Icon(Icons.filter_alt_rounded, size: 14, color: Color(0xFFF59E0B)),
              ),
              const SizedBox(width: 10),
              Text(context.strings.filters, style: TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
              const Spacer(),
              if (hasFilters)
                TextButton.icon(
                  icon: const Icon(Icons.clear_all, size: 16),
                  label: Text(context.strings.clear, style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.textMuted,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: () {
                    setState(() { _dateFrom = null; _dateTo = null; _nameFilterController.clear(); });
                    _loadData();
                  },
                ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Employee name search
          TextField(
            controller: _nameFilterController,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: context.strings.searchByEmployeeName,
              prefixIcon: Icon(Icons.person_search_rounded, size: 18, color: AppTheme.textMuted),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              isDense: true,
            ),
            onSubmitted: (_) => _loadData(),
          ),
          const SizedBox(height: 10),
          
          // Date filters
          Row(
            children: [
              Expanded(child: _buildDateButton('From Date', _dateFrom, (d) => setState(() { _dateFrom = d; _loadData(); }))),
              const SizedBox(width: 8),
              Expanded(child: _buildDateButton('To Date', _dateTo, (d) => setState(() { _dateTo = d; _loadData(); }))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDateButton(String label, DateTime? value, Function(DateTime?) onChanged) {
    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: value ?? DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (context, child) {
            return Theme(
              data: AppTheme.darkTheme.copyWith(
                colorScheme: const ColorScheme.dark(
                  primary: AppTheme.electricBlue,
                  surface: AppTheme.cardDark,
                ),
              ),
              child: child!,
            );
          },
        );
        onChanged(date);
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.cardLight.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: value != null ? AppTheme.electricBlue.withValues(alpha: 0.4) : AppTheme.dividerColor.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today_rounded, size: 14, color: value != null ? AppTheme.electricBlue : AppTheme.textMuted),
            const SizedBox(width: 8),
            Text(
              value != null ? DateFormat('dd/MM/yyyy').format(value) : label,
              style: TextStyle(
                color: value != null ? AppTheme.textPrimary : AppTheme.textMuted,
                fontSize: 13,
                fontWeight: value != null ? FontWeight.w500 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Work Entries ─────────────────────────────────────────────────
  Widget _buildWorkEntries() {
    if (_entries.isEmpty) {
      return GlassCard(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: AppTheme.textMuted.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.work_off_outlined, size: 28, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                ),
                const SizedBox(height: 12),
                Text(context.strings.noWorkEntriesFound, style: TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(context.strings.tryAdjustingFilters, style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
            ),
          ),
        ),
      );
    }

    // Group entries by date
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final entry in _entries) {
      final date = entry['work_date'] ?? '';
      grouped.putIfAbsent(date, () => []);
      grouped[date]!.add(entry);
    }

    final sortedDates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(7),
              ),
              child: const Icon(Icons.list_alt_rounded, size: 14, color: Color(0xFF8B5CF6)),
            ),
            const SizedBox(width: 10),
            Text(
              'Work Days (${_entries.length} entries)',
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        ...sortedDates.map((date) {
          final dayEntries = grouped[date]!;
          final parsedDate = DateTime.tryParse(date);
          final hours = _totalHours(dayEntries);
          final photos = _totalPhotos(dayEntries);

          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => WorkDayScreen(
                      projectId: widget.projectId,
                      projectName: widget.projectName,
                      workDate: date,
                      entries: dayEntries,
                    ),
                  ),
                ),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.dividerColor.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date header row
                      Row(
                        children: [
                          Container(
                            width: 40, height: 40,
                            decoration: BoxDecoration(
                              color: AppTheme.electricBlue.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  parsedDate != null ? DateFormat('dd').format(parsedDate) : '--',
                                  style: const TextStyle(color: AppTheme.electricBlue, fontSize: 15, fontWeight: FontWeight.w800, height: 1),
                                ),
                                Text(
                                  parsedDate != null ? DateFormat('MMM').format(parsedDate).toUpperCase() : '',
                                  style: const TextStyle(color: AppTheme.electricBlue, fontSize: 9, fontWeight: FontWeight.w600, height: 1.2),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  parsedDate != null ? DateFormat('EEEE').format(parsedDate) : date,
                                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  dayEntries.map((e) => e['employee_first_name'] ?? '').where((n) => n.isNotEmpty).join(', '),
                                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 20),
                        ],
                      ),
                      
                      const SizedBox(height: 10),
                      // Stats chips
                      Row(
                        children: [
                          _buildChip(Icons.people_rounded, '${dayEntries.length}', 'workers'),
                          const SizedBox(width: 8),
                          _buildChip(Icons.schedule_rounded, hours, 'hours'),
                          if (photos > 0) ...[
                            const SizedBox(width: 8),
                            _buildChip(Icons.photo_camera_rounded, '$photos', 'photos'),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildChip(IconData icon, String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.primaryNavy.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppTheme.textMuted),
          const SizedBox(width: 4),
          Text('$value ', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
        ],
      ),
    );
  }

  // ─── Excel Export Dialog ──────────────────────────────────────────
  void _showExportDialog() {
    _exportFrom = _dateFrom ?? DateTime.now().subtract(const Duration(days: 30));
    _exportTo = _dateTo ?? DateTime.now();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return Container(
            padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(ctx).padding.bottom + 24),
            decoration: const BoxDecoration(
              color: AppTheme.cardDark,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(top: BorderSide(color: Color(0xFF10B981), width: 2)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.dividerColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Header
                Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.table_chart_rounded, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.strings.exportToExcel, style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        )),
                        SizedBox(height: 2),
                        Text(context.strings.downloadWorkReport, style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 13,
                        )),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Project name
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryNavy.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.business_rounded, size: 16, color: AppTheme.electricBlue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.projectName,
                          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                
                // Date range pickers
                Text(context.strings.selectPeriod, style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                
                Row(
                  children: [
                    Expanded(
                      child: _buildExportDatePicker(
                        ctx,
                        'From',
                        _exportFrom!,
                        (d) => setDialogState(() => _exportFrom = d),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(Icons.arrow_forward, size: 16, color: AppTheme.textMuted),
                    ),
                    Expanded(
                      child: _buildExportDatePicker(
                        ctx,
                        'To',
                        _exportTo!,
                        (d) => setDialogState(() => _exportTo = d),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                
                // Quick period buttons
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildQuickPeriod('Last 7 days', 7, setDialogState),
                    _buildQuickPeriod('Last 30 days', 30, setDialogState),
                    _buildQuickPeriod('Last 90 days', 90, setDialogState),
                    _buildQuickPeriod('This month', -1, setDialogState),
                    _buildQuickPeriod('Last month', -2, setDialogState),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Export button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isExporting ? null : () => _handleExport(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: _isExporting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.download_rounded, size: 20),
                              SizedBox(width: 8),
                              Text(context.strings.downloadExcelReport, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildExportDatePicker(BuildContext ctx, String label, DateTime value, Function(DateTime) onChanged) {
    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: ctx,
          initialDate: value,
          firstDate: DateTime(2020),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (context, child) => Theme(
            data: AppTheme.darkTheme.copyWith(
              colorScheme: const ColorScheme.dark(primary: Color(0xFF10B981), surface: AppTheme.cardDark),
            ),
            child: child!,
          ),
        );
        if (date != null) onChanged(date);
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.primaryNavy.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            const SizedBox(height: 2),
            Text(
              DateFormat('dd MMM yyyy').format(value),
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickPeriod(String label, int days, StateSetter setDialogState) {
    return InkWell(
      onTap: () {
        final now = DateTime.now();
        if (days == -1) {
          // This month
          setDialogState(() {
            _exportFrom = DateTime(now.year, now.month, 1);
            _exportTo = now;
          });
        } else if (days == -2) {
          // Last month
          final lastMonth = DateTime(now.year, now.month - 1, 1);
          setDialogState(() {
            _exportFrom = lastMonth;
            _exportTo = DateTime(now.year, now.month, 0);
          });
        } else {
          setDialogState(() {
            _exportFrom = now.subtract(Duration(days: days));
            _exportTo = now;
          });
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppTheme.primaryNavy.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.dividerColor.withValues(alpha: 0.3)),
        ),
        child: Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ),
    );
  }

  Future<void> _handleExport(BuildContext dialogContext) async {
    if (_exportFrom == null || _exportTo == null) return;
    
    setState(() => _isExporting = true);
    
    try {
      final bytes = await _service.exportExcel(
        widget.projectId,
        DateFormat('yyyy-MM-dd').format(_exportFrom!),
        DateFormat('yyyy-MM-dd').format(_exportTo!),
      );
      
      // Save to temp directory
      final dir = await getTemporaryDirectory();
      final safeName = widget.projectName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = 'WorkReport_${safeName}_${DateFormat('yyyyMMdd').format(_exportFrom!)}_${DateFormat('yyyyMMdd').format(_exportTo!)}.xlsx';
      final file = File('${dir.path}/$fileName');
      await file.writeAsBytes(bytes);
      
      if (!mounted) return;
      if (dialogContext.mounted) Navigator.pop(dialogContext);
      
      // Share the file
      await Share.shareXFiles(
        [XFile(file.path)],
        subject: 'Work Report - ${widget.projectName}',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Export failed: ${e.toString()}'),
          backgroundColor: AppTheme.accentRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  String _totalHours(List<Map<String, dynamic>> entries) {
    double total = 0;
    for (final e in entries) {
      total += double.tryParse(e['calculated_hours']?.toString() ?? '0') ?? 0;
    }
    return total.toStringAsFixed(1);
  }

  int _totalPhotos(List<Map<String, dynamic>> entries) {
    int total = 0;
    for (final e in entries) {
      total += (e['photos_count'] ?? 0) as int;
    }
    return total;
  }

  String _formatDateRange(String? start, String? end) {
    final s = start != null ? DateFormat('d MMM yyyy').format(DateTime.parse(start)) : '—';
    final e = end != null ? DateFormat('d MMM yyyy').format(DateTime.parse(end)) : 'Ongoing';
    return '$s → $e';
  }
}
