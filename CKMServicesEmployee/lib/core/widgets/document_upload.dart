import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';

/// EU Driver's License Categories
const List<Map<String, String>> driverLicenseCategories = [
  {'code': 'AM', 'name': 'Moped', 'icon': '🛵'},
  {'code': 'A1', 'name': 'Light Motorcycle', 'icon': '🏍️'},
  {'code': 'A2', 'name': 'Medium Motorcycle', 'icon': '🏍️'},
  {'code': 'A', 'name': 'Motorcycle', 'icon': '🏍️'},
  {'code': 'B1', 'name': 'Light Vehicle', 'icon': '🚗'},
  {'code': 'B', 'name': 'Car', 'icon': '🚗'},
  {'code': 'C1', 'name': 'Medium Truck', 'icon': '🚛'},
  {'code': 'C', 'name': 'Large Truck', 'icon': '🚛'},
  {'code': 'D1', 'name': 'Minibus', 'icon': '🚌'},
  {'code': 'D', 'name': 'Bus', 'icon': '🚌'},
  {'code': 'BE', 'name': 'Car + Trailer', 'icon': '🚗'},
  {'code': 'C1E', 'name': 'Medium Truck + Trailer', 'icon': '🚛'},
  {'code': 'CE', 'name': 'Large Truck + Trailer', 'icon': '🚛'},
  {'code': 'D1E', 'name': 'Minibus + Trailer', 'icon': '🚌'},
  {'code': 'DE', 'name': 'Bus + Trailer', 'icon': '🚌'},
  {'code': 'T', 'name': 'Tractor', 'icon': '🚜'},
];

/// Shows a choice dialog for camera or gallery
Future<String?> showImageSourceDialog(BuildContext context) async {
  return showModalBottomSheet<String>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (context) => Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Text(
            'Upload Image',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E3A5F),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Choose how you want to add your image',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _SourceOption(
                  icon: Icons.camera_alt_rounded,
                  label: 'Camera',
                  color: const Color(0xFF1E3A5F),
                  onTap: () => Navigator.pop(context, 'camera'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _SourceOption(
                  icon: Icons.photo_library_rounded,
                  label: 'Gallery',
                  color: const Color(0xFF16A34A),
                  onTap: () => Navigator.pop(context, 'gallery'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    ),
  );
}

class _SourceOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SourceOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Upload box widget with view/delete options - Professional Design
class DocumentUploadBox extends StatelessWidget {
  final String label;
  final String? imagePath;
  final VoidCallback onTap;
  final VoidCallback? onDelete;
  final VoidCallback? onView;

  const DocumentUploadBox({
    super.key,
    required this.label,
    required this.imagePath,
    required this.onTap,
    this.onDelete,
    this.onView,
  });

  @override
  Widget build(BuildContext context) {
    final hasImage = imagePath != null && imagePath!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: hasImage ? Colors.green.shade50 : const Color(0xFF1E3A5F).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(
                hasImage ? Icons.verified : Icons.badge_outlined,
                color: hasImage ? Colors.green : const Color(0xFF1E3A5F),
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: hasImage ? Colors.green.shade700 : const Color(0xFF374151),
              ),
            ),
            if (hasImage) ...[
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  '✓',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: 130,
            decoration: BoxDecoration(
              gradient: hasImage
                  ? null
                  : LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.grey.shade50,
                        Colors.grey.shade100,
                      ],
                    ),
              borderRadius: BorderRadius.circular(16),
              border: hasImage
                  ? Border.all(color: Colors.green, width: 2)
                  : null,
              boxShadow: hasImage
                  ? [
                      BoxShadow(
                        color: Colors.green.withOpacity(0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            child: hasImage
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.file(
                          File(imagePath!),
                          fit: BoxFit.cover,
                        ),
                      ),
                      // Gradient overlay
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.black.withOpacity(0.3),
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Action buttons
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Row(
                          children: [
                            if (onView != null)
                              _ActionButton(
                                icon: Icons.fullscreen,
                                color: Colors.white,
                                bgColor: Colors.blue,
                                onTap: onView!,
                              ),
                            const SizedBox(width: 6),
                            if (onDelete != null)
                              _ActionButton(
                                icon: Icons.delete_outline,
                                color: Colors.white,
                                bgColor: Colors.red,
                                onTap: onDelete!,
                              ),
                          ],
                        ),
                      ),
                    ],
                  )
                : CustomPaint(
                    painter: _DashedBorderPainter(
                      color: Colors.grey.shade400,
                      strokeWidth: 1.5,
                      gap: 6,
                      radius: 16,
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF1E3A5F), Color(0xFF2E5A8F)],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF1E3A5F).withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.add_photo_alternate_outlined,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Tap to upload',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF374151),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Camera or Gallery',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

/// Dashed border painter for professional look
class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double gap;
  final double radius;

  _DashedBorderPainter({
    required this.color,
    required this.strokeWidth,
    required this.gap,
    required this.radius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        Radius.circular(radius),
      ));

    final dashPath = Path();
    double distance = 0;
    for (final metric in path.computeMetrics()) {
      while (distance < metric.length) {
        dashPath.addPath(
          metric.extractPath(distance, distance + gap),
          Offset.zero,
        );
        distance += gap * 2;
      }
    }

    canvas.drawPath(dashPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: bgColor.withOpacity(0.4),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, color: color, size: 18),
      ),
    );
  }
}

/// Divider with OR text
class OrDivider extends StatelessWidget {
  const OrDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        children: [
          Expanded(child: Divider(color: Colors.grey.shade300)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'OR',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
              ),
            ),
          ),
          Expanded(child: Divider(color: Colors.grey.shade300)),
        ],
      ),
    );
  }
}

/// Upload PDF button
class UploadPdfButton extends StatelessWidget {
  final String? pdfPath;
  final VoidCallback onTap;
  final VoidCallback? onDelete;

  const UploadPdfButton({
    super.key,
    required this.pdfPath,
    required this.onTap,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final hasPdf = pdfPath != null && pdfPath!.isNotEmpty;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: hasPdf ? Colors.green.shade50 : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasPdf ? Colors.green : Colors.grey.shade200,
            width: hasPdf ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              hasPdf ? Icons.check_circle : Icons.picture_as_pdf_rounded,
              color: hasPdf ? Colors.green : const Color(0xFF1E3A5F),
              size: 22,
            ),
            const SizedBox(width: 10),
            Text(
              hasPdf ? 'PDF Uploaded' : 'Upload PDF',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: hasPdf ? Colors.green : const Color(0xFF1E3A5F),
              ),
            ),
            if (hasPdf && onDelete != null) ...[
              const Spacer(),
              GestureDetector(
                onTap: onDelete,
                child: const Icon(Icons.close, color: Colors.red, size: 20),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Document upload section with front/back and PDF option
class DocumentUploadSection extends StatelessWidget {
  final String? frontPath;
  final String? backPath;
  final String? pdfPath;
  final Function(String) onFrontUploaded;
  final Function(String) onBackUploaded;
  final Function(String) onPdfUploaded;
  final VoidCallback? onFrontDelete;
  final VoidCallback? onBackDelete;
  final VoidCallback? onPdfDelete;

  const DocumentUploadSection({
    super.key,
    this.frontPath,
    this.backPath,
    this.pdfPath,
    required this.onFrontUploaded,
    required this.onBackUploaded,
    required this.onPdfUploaded,
    this.onFrontDelete,
    this.onBackDelete,
    this.onPdfDelete,
  });

  Future<void> _pickImage(BuildContext context, Function(String) onUploaded) async {
    final source = await showImageSourceDialog(context);
    if (source == null) return;

    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 85,
    );

    if (image != null) {
      onUploaded(image.path);
    }
  }

  Future<void> _pickPdf(Function(String) onUploaded) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (result != null && result.files.single.path != null) {
      onUploaded(result.files.single.path!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: DocumentUploadBox(
                label: 'Front Side',
                imagePath: frontPath,
                onTap: () => _pickImage(context, onFrontUploaded),
                onDelete: onFrontDelete,
                onView: frontPath != null ? () => _showImageViewer(context, frontPath!) : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DocumentUploadBox(
                label: 'Back Side',
                imagePath: backPath,
                onTap: () => _pickImage(context, onBackUploaded),
                onDelete: onBackDelete,
                onView: backPath != null ? () => _showImageViewer(context, backPath!) : null,
              ),
            ),
          ],
        ),
        const OrDivider(),
        UploadPdfButton(
          pdfPath: pdfPath,
          onTap: () => _pickPdf(onPdfUploaded),
          onDelete: onPdfDelete,
        ),
      ],
    );
  }

  void _showImageViewer(BuildContext context, String path) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(File(path)),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close),
              label: const Text('Close'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.grey.shade800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Driver's license categories selector
class LicenseCategoriesSelector extends StatelessWidget {
  final List<String> selectedCategories;
  final Function(List<String>) onChanged;

  const LicenseCategoriesSelector({
    super.key,
    required this.selectedCategories,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'License Categories',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: driverLicenseCategories.map((cat) {
            final isSelected = selectedCategories.contains(cat['code']);
            return GestureDetector(
              onTap: () {
                final updated = List<String>.from(selectedCategories);
                if (isSelected) {
                  updated.remove(cat['code']);
                } else {
                  updated.add(cat['code']!);
                }
                onChanged(updated);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF1E3A5F) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF1E3A5F) : Colors.grey.shade300,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(cat['icon']!, style: const TextStyle(fontSize: 16)),
                    const SizedBox(width: 6),
                    Text(
                      cat['code']!,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
