"""
PDF Generator for Employee Document Export.

Generates the Werkgeversverklaring (employer declaration) and combines
with selected employee documents into a single PDF.
"""

import io
from datetime import datetime, timedelta
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.pdfgen import canvas
from PIL import Image as PILImage


def generate_werkgeversverklaring(employee, output_buffer):
    """
    Generate the Werkgeversverklaring (employer declaration) page.
    
    Args:
        employee: EmployeeProfile instance
        output_buffer: BytesIO buffer to write PDF to
    """
    c = canvas.Canvas(output_buffer, pagesize=A4)
    width, height = A4
    
    # Header - Company letterhead text
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(2*cm, height - 2*cm, "Afdrukken op briefpapier van CKM Services")
    
    # Date info (right side)
    today = datetime.now()
    valid_until = today + timedelta(days=365)
    
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 2*cm, height - 3*cm, f"Datum:          {today.strftime('%d-%m-%Y')}")
    c.drawRightString(width - 2*cm, height - 3.5*cm, f"Geldig t/m      {valid_until.strftime('%d-%m-%Y')}")
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 7*cm, "WERKGEVERSVERKLARING")
    
    # Greeting
    c.setFont("Helvetica", 11)
    y_pos = height - 9*cm
    c.drawString(2*cm, y_pos, "Geachte heer/mevrouw,")
    
    # Declaration text
    y_pos -= 1*cm
    c.drawString(2*cm, y_pos, "Hierbij verklaren wij als CKM Services, gevestigd te Rotterdam het volgende :")
    
    y_pos -= 0.8*cm
    c.drawString(2*cm, y_pos, "De onderstaande medewerker is bij ons")
    
    # Employee details table
    y_pos -= 2*cm
    
    # Build full name
    full_name = f"{employee.first_name}"
    if employee.prefix_name:
        full_name += f" {employee.prefix_name}"
    full_name += f" {employee.last_name}"
    
    # Build address
    address = ""
    if employee.street_name:
        address = f"{employee.street_name} {employee.house_number}"
        if employee.house_number_addition:
            address += employee.house_number_addition
    elif employee.street_address:
        address = employee.street_address
    
    # Get document type name
    doc_type_name = ""
    if employee.document_type:
        doc_type_name = employee.document_type.name
    
    # Employee info rows
    details = [
        ("Naam", full_name),
        ("Roepnaam", employee.first_name),
        ("Achternaam", f"{employee.prefix_name} {employee.last_name}".strip() if employee.prefix_name else employee.last_name),
        ("Geslacht", "M" if employee.gender == "male" else "V" if employee.gender == "female" else "-"),
        ("Adres", address or "-"),
        ("Post code en Woonplaats", f"{employee.postcode} {employee.city}" if employee.postcode else "-"),
        ("Geboortedatum", employee.date_of_birth.strftime('%d-%m-%Y') if employee.date_of_birth else "-"),
        ("Geboorteplaats", employee.birthplace or "-"),
        ("Soort legitimatie", doc_type_name or "-"),
        ("Documentnummer", employee.document_number or "-"),
        ("Geldig t/m", employee.document_expiry_date.strftime('%d-%m-%Y') if employee.document_expiry_date else "-"),
        ("BSN Nummer", f"{employee.bsn[:4]}-{employee.bsn[4:6]}-{employee.bsn[6:]}" if employee.bsn and len(employee.bsn) == 9 else employee.bsn or "-"),
    ]
    
    c.setFont("Helvetica", 11)
    label_x = 2*cm
    value_x = 8*cm
    
    for label, value in details:
        c.drawString(label_x, y_pos, label)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(value_x, y_pos, str(value))
        c.setFont("Helvetica", 11)
        y_pos -= 0.7*cm
    
    # Closing text
    y_pos -= 1*cm
    c.drawString(2*cm, y_pos, "Vertrouwende u hiermede voldoende te hebben geïnformeerd.")
    y_pos -= 0.5*cm
    c.drawString(2*cm, y_pos, "Met vriendelijke groet,")
    
    # Signature area
    y_pos -= 1.5*cm
    c.drawString(2*cm, y_pos, "De heer Abdulrahman Alsayah")
    y_pos -= 0.5*cm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2*cm, y_pos, "CKM Services")
    
    # Company stamp placeholder (right side)
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 3*cm, y_pos + 1*cm, "Bedrijfsstempel")
    
    # Draw a circle for stamp area
    stamp_x = width - 5*cm
    stamp_y = y_pos - 1*cm
    c.setStrokeColor(colors.grey)
    c.circle(stamp_x, stamp_y, 2*cm, stroke=1, fill=0)
    
    c.save()


def add_image_to_pdf(image_path, output_buffer, title=None):
    """
    Add an image file as a PDF page.
    
    Args:
        image_path: Path to the image file
        output_buffer: BytesIO buffer to write PDF to
        title: Optional title for the page
    """
    try:
        # Open image with PIL to get dimensions
        with PILImage.open(image_path) as img:
            img_width, img_height = img.size
            
        c = canvas.Canvas(output_buffer, pagesize=A4)
        width, height = A4
        
        # Add title if provided
        y_offset = 0
        if title:
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(width/2, height - 2*cm, title)
            y_offset = 2*cm
        
        # Calculate scaling to fit A4 with margins
        margin = 2*cm
        max_width = width - 2*margin
        max_height = height - 2*margin - y_offset
        
        # Scale image to fit
        scale_x = max_width / img_width
        scale_y = max_height / img_height
        scale = min(scale_x, scale_y, 1)  # Don't upscale
        
        new_width = img_width * scale
        new_height = img_height * scale
        
        # Center the image
        x = (width - new_width) / 2
        y = (height - new_height - y_offset) / 2
        
        c.drawImage(str(image_path), x, y, width=new_width, height=new_height)
        c.save()
        return True
    except Exception as e:
        print(f"Error adding image to PDF: {e}")
        return False


def merge_pdfs(pdf_buffers):
    """
    Merge multiple PDF buffers into one.
    
    Args:
        pdf_buffers: List of BytesIO buffers containing PDFs
        
    Returns:
        BytesIO buffer with merged PDF
    """
    from PyPDF2 import PdfMerger
    
    merger = PdfMerger()
    
    for pdf_buffer in pdf_buffers:
        pdf_buffer.seek(0)
        merger.append(pdf_buffer)
    
    output = io.BytesIO()
    merger.write(output)
    merger.close()
    output.seek(0)
    
    return output


def generate_employee_document_pdf(employee, document_types):
    """
    Generate a complete PDF with Werkgeversverklaring and selected documents.
    
    Args:
        employee: EmployeeProfile instance
        document_types: List of document type strings to include
        
    Returns:
        BytesIO buffer containing the complete PDF
    """
    pdf_buffers = []
    
    # Always start with Werkgeversverklaring
    declaration_buffer = io.BytesIO()
    generate_werkgeversverklaring(employee, declaration_buffer)
    declaration_buffer.seek(0)
    pdf_buffers.append(declaration_buffer)
    
    # Document field mappings
    document_fields = {
        'id_document_front': ('id_document_front', 'ID Document (Front)'),
        'id_document_back': ('id_document_back', 'ID Document (Back)'),
        'id_document_pdf': ('id_document_pdf', 'ID Document'),
        'drivers_license_front': ('drivers_license_front', "Driver's License (Front)"),
        'drivers_license_back': ('drivers_license_back', "Driver's License (Back)"),
        'contract_document': ('contract_document', 'Contract Document'),
    }
    
    # Add selected documents
    for doc_type in document_types:
        if doc_type.startswith('certificate_'):
            # Handle certificates
            cert_id = doc_type.replace('certificate_', '')
            try:
                from apps.certificates.models import EmployeeCertificate
                cert = EmployeeCertificate.objects.get(id=cert_id, employee=employee)
                if cert.certificate_file:
                    file_path = cert.certificate_file.path
                    if file_path.lower().endswith('.pdf'):
                        # For PDF files, read directly
                        with open(file_path, 'rb') as f:
                            pdf_buffer = io.BytesIO(f.read())
                            pdf_buffers.append(pdf_buffer)
                    else:
                        # For images, convert to PDF
                        img_buffer = io.BytesIO()
                        if add_image_to_pdf(file_path, img_buffer, cert.certificate_type.name):
                            img_buffer.seek(0)
                            pdf_buffers.append(img_buffer)
            except Exception as e:
                print(f"Error processing certificate {cert_id}: {e}")
                
        elif doc_type in document_fields:
            field_name, title = document_fields[doc_type]
            field = getattr(employee, field_name, None)
            if field and field.name:
                file_path = field.path
                if file_path.lower().endswith('.pdf'):
                    with open(file_path, 'rb') as f:
                        pdf_buffer = io.BytesIO(f.read())
                        pdf_buffers.append(pdf_buffer)
                else:
                    img_buffer = io.BytesIO()
                    if add_image_to_pdf(file_path, img_buffer, title):
                        img_buffer.seek(0)
                        pdf_buffers.append(img_buffer)
    
    # Merge all PDFs
    if len(pdf_buffers) == 1:
        pdf_buffers[0].seek(0)
        return pdf_buffers[0]
    
    return merge_pdfs(pdf_buffers)


def get_available_documents(employee):
    """
    Get list of available documents for an employee.
    
    Args:
        employee: EmployeeProfile instance
        
    Returns:
        List of dicts with document info: {key, label, available}
    """
    documents = []
    
    # ID Documents
    documents.append({
        'key': 'id_document_front',
        'label': 'ID Document (Front)',
        'available': bool(employee.id_document_front and employee.id_document_front.name)
    })
    documents.append({
        'key': 'id_document_back', 
        'label': 'ID Document (Back)',
        'available': bool(employee.id_document_back and employee.id_document_back.name)
    })
    if employee.id_document_pdf and employee.id_document_pdf.name:
        documents.append({
            'key': 'id_document_pdf',
            'label': 'ID Document (PDF)',
            'available': True
        })
    
    # Driver's License
    if employee.has_drivers_license:
        documents.append({
            'key': 'drivers_license_front',
            'label': "Driver's License (Front)",
            'available': bool(employee.drivers_license_front and employee.drivers_license_front.name)
        })
        documents.append({
            'key': 'drivers_license_back',
            'label': "Driver's License (Back)", 
            'available': bool(employee.drivers_license_back and employee.drivers_license_back.name)
        })
    
    # Contract
    documents.append({
        'key': 'contract_document',
        'label': 'Contract Document',
        'available': bool(employee.contract_document and employee.contract_document.name)
    })
    
    # Certificates
    from apps.certificates.models import EmployeeCertificate
    certificates = EmployeeCertificate.objects.filter(
        employee=employee
    ).select_related('certificate_type')
    
    for cert in certificates:
        documents.append({
            'key': f'certificate_{cert.id}',
            'label': cert.certificate_type.name,
            'available': bool(cert.certificate_file and cert.certificate_file.name)
        })
    
    return documents
