// Projects Dashboard — Grid of customer's projects with search & filters

import 'package:flutter/material.dart';
import '../data/project_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/shared_widgets.dart';
import 'screens/project_detail_screen.dart';
import '../../../core/localization/app_strings.dart';

class ProjectsDashboard extends StatefulWidget {
  const ProjectsDashboard({super.key});

  @override
  State<ProjectsDashboard> createState() => _ProjectsDashboardState();
}

class _ProjectsDashboardState extends State<ProjectsDashboard> {
  final ProjectService _service = ProjectService();
  final _searchController = TextEditingController();
  
  List<Map<String, dynamic>> _projects = [];
  bool _isLoading = true;
  String? _error;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProjects() async {
    setState(() { _isLoading = true; _error = null; });
    
    try {
      final projects = await _service.getProjects(
        status: _statusFilter,
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
      );
      setState(() {
        _projects = projects;
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
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'My Projects',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_projects.length} projects',
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Search projects...',
                  prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: AppTheme.textMuted, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _loadProjects();
                          },
                        )
                      : null,
                ),
                onSubmitted: (_) => _loadProjects(),
              ),
            ),
            
            const SizedBox(height: 12),
            
            // Status filter chips
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildFilterChip('All', null),
                  _buildFilterChip('Active', 'active'),
                  _buildFilterChip('Completed', 'completed'),
                  _buildFilterChip('Draft', 'draft'),
                ],
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Project list
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.electricBlue))
                  : _error != null
                      ? _buildError()
                      : _projects.isEmpty
                          ? _buildEmpty()
                          : RefreshIndicator(
                              onRefresh: _loadProjects,
                              color: AppTheme.electricBlue,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                itemCount: _projects.length,
                                itemBuilder: (ctx, i) => _buildProjectCard(_projects[i]),
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String? value) {
    final isActive = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isActive,
        onSelected: (_) {
          setState(() => _statusFilter = value);
          _loadProjects();
        },
        backgroundColor: AppTheme.cardDark,
        selectedColor: AppTheme.electricBlue.withValues(alpha: 0.2),
        checkmarkColor: AppTheme.electricBlue,
        labelStyle: TextStyle(
          color: isActive ? AppTheme.electricBlue : AppTheme.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
        side: BorderSide(
          color: isActive ? AppTheme.electricBlue : AppTheme.dividerColor.withValues(alpha: 0.3),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  Widget _buildProjectCard(Map<String, dynamic> project) {
    final progress = (project['progress_percentage'] ?? 0).toDouble();
    
    return GlassCard(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProjectDetailScreen(
            projectId: project['id'],
            projectName: project['name'] ?? 'Project',
          ),
        ),
      ),
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              // Project icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.electricBlue.withValues(alpha: 0.2),
                      AppTheme.electricBlue.withValues(alpha: 0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.engineering_rounded,
                  color: AppTheme.electricBlue,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              
              // Name & location
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      project['name'] ?? '',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: AppTheme.textMuted),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            project['location_city'] ?? project['location'] ?? '',
                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Progress ring
              ProgressRing(percentage: progress, size: 48, strokeWidth: 4),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Stats row
          Row(
            children: [
              StatusBadge(status: project['status'] ?? 'draft'),
              const Spacer(),
              _buildMiniStat(Icons.calendar_today, '${project['total_work_days'] ?? 0} days'),
              const SizedBox(width: 16),
              _buildMiniStat(Icons.people_outline, '${project['active_employees_count'] ?? 0} workers'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppTheme.textMuted),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ],
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.folder_open_rounded, size: 64, color: AppTheme.textMuted.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text(context.strings.noProjectsFound, style: TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppTheme.accentRed),
          const SizedBox(height: 16),
          Text(context.strings.failedToLoadProjects, style: TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadProjects, child: Text(context.strings.retry)),
        ],
      ),
    );
  }
}
