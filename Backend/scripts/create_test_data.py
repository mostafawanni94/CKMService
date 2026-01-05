"""
Test Data Creation Script

Run this to create test data for development:
    python manage.py shell < scripts/create_test_data.py
"""

from django.utils import timezone
from datetime import timedelta
import random

# Import models
from apps.employees.models import User, EmployeeProfile, DocumentType
from apps.customers.models import Customer
from apps.projects.models import Project, ProjectAssignment
from apps.worklogs.models import WorkLog
from apps.wallet.models import Wallet, WalletTransaction, AdvanceRequest
from apps.certificates.models import CertificateType, EmployeeCertificate

print("Creating test data for Pro Totaal Service...")

# =============================================================================
# DOCUMENT TYPES & CERTIFICATE TYPES
# =============================================================================

print("Creating document types...")
doc_types = ['Passport', 'ID Card', 'Residence Permit', 'Driver License']
for name in doc_types:
    DocumentType.objects.get_or_create(name=name)

print("Creating certificate types...")
cert_types = [
    {
        'name': 'VCA Basis',
        'description': 'Basic safety certificate for working in construction and industrial environments',
        'is_active': True,
        'is_required': True,
        'has_expiry': True,
        'has_diploma_number': True,
        'sort_order': 1,
    },
    {
        'name': 'VCA VOL',
        'description': 'Full safety certificate for operational supervision in construction and industrial environments',
        'is_active': True,
        'is_required': False,
        'has_expiry': True,
        'has_diploma_number': True,
        'sort_order': 2,
    },
    {
        'name': 'Rijbewijs B',
        'description': "Driver's license category B for passenger vehicles",
        'is_active': True,
        'is_required': False,
        'has_expiry': True,
        'has_diploma_number': True,
        'sort_order': 3,
    },
    {
        'name': 'BHV',
        'description': 'Emergency response officer certificate (Bedrijfshulpverlening)',
        'is_active': True,
        'is_required': False,
        'has_expiry': True,
        'has_diploma_number': True,
        'sort_order': 4,
    },
    {
        'name': 'Heftruck',
        'description': 'Forklift operator license for warehouse and logistics work',
        'is_active': True,
        'is_required': False,
        'has_expiry': True,
        'has_diploma_number': True,
        'sort_order': 5,
    },
    {
        'name': 'EHBO',
        'description': 'First aid certificate (Eerste Hulp Bij Ongelukken)',
        'is_active': False,
        'is_required': False,
        'has_expiry': True,
        'has_diploma_number': False,
        'sort_order': 6,
    },
]
for cert_data in cert_types:
    name = cert_data.pop('name')
    CertificateType.objects.update_or_create(
        name=name,
        defaults=cert_data
    )
    print(f"  Created/Updated: {name}")

# =============================================================================
# ADMIN USER
# =============================================================================

print("Creating admin user...")
admin, created = User.objects.get_or_create(
    email='admin@prototaalservice.nl',
    defaults={
        'is_admin': True,
        'is_staff': True,
        'is_superuser': True,
    }
)
if created:
    admin.set_password('admin123')
    admin.save()
    print("  Created admin: admin@prototaalservice.nl / admin123")

# =============================================================================
# TEST EMPLOYEES
# =============================================================================

print("Creating test employees...")
employees_data = [
    ('jan.devries@test.nl', 'Jan', 'de Vries', 'approved'),
    ('maria.santos@test.nl', 'Maria', 'Santos', 'approved'),
    ('ahmed.hassan@test.nl', 'Ahmed', 'Hassan', 'approved'),
    ('sophie.jansen@test.nl', 'Sophie', 'Jansen', 'pending_approval'),
    ('peter.dejong@test.nl', 'Peter', 'de Jong', 'incomplete'),
]

for email, first, last, status in employees_data:
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'is_admin': False}
    )
    if created:
        user.set_password('test123')
        user.save()
    
    profile, _ = EmployeeProfile.objects.get_or_create(
        user=user,
        defaults={
            'first_name': first,
            'last_name': last,
            'initials': f'{first[0]}{last[0]}',
            'status': status,
            'gender': random.choice(['male', 'female']),
            'date_of_birth': timezone.now().date() - timedelta(days=random.randint(7000, 15000)),
            'birthplace': 'Amsterdam',
            'bsn': f'{random.randint(100000000, 999999999)}',
            'phone_number': f'+31 6 {random.randint(10000000, 99999999)}',
            'address': f'Teststraat {random.randint(1, 100)}',
            'postcode': f'{random.randint(1000, 9999)} AB',
            'city': random.choice(['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag']),
            'iban': f'NL{random.randint(10, 99)}TEST0{random.randint(100000000, 999999999)}',
            'nationality': 'Dutch',
        }
    )
    print(f"  Created: {email} ({status})")

# =============================================================================
# CUSTOMERS
# =============================================================================

print("Creating customers...")
customers_data = [
    ('Clean Solutions BV', 'Industrieweg 45', 'Amsterdam'),
    ('Industrial Services', 'Havenstraat 12', 'Rotterdam'),
    ('Office Maintenance BV', 'Businesspark 8', 'Utrecht'),
    ('Factory Clean NL', 'Industrielaan 22', 'Eindhoven'),
    ('Tech Campus Services', 'Innovation Drive 1', 'Amsterdam'),
]

for name, address, city in customers_data:
    customer, _ = Customer.objects.get_or_create(
        name=name,
        defaults={
            'address': address,
            'city': city,
            'postcode': f'{random.randint(1000, 9999)} AB',
            'phone': f'+31 20 {random.randint(1000000, 9999999)}',
            'email': f'info@{name.lower().replace(" ", "")}.nl',
        }
    )
    print(f"  Created: {name}")

# =============================================================================
# PROJECTS
# =============================================================================

print("Creating projects...")
for customer in Customer.objects.all():
    project, _ = Project.objects.get_or_create(
        name=f'{customer.name} - Main Contract',
        customer=customer,
        defaults={
            'address': customer.address,
            'city': customer.city,
            'hourly_rate': random.choice([18.50, 20.00, 22.50, 25.00]),
            'is_active': True,
        }
    )
    print(f"  Created: {project.name}")

# =============================================================================
# WALLETS
# =============================================================================

print("Creating wallets...")
for profile in EmployeeProfile.objects.filter(status='approved'):
    wallet, _ = Wallet.objects.get_or_create(
        employee=profile,
        defaults={'balance': random.choice([0, 50, 100, 250, -50, -100])}
    )
    print(f"  Created wallet for: {profile.first_name}")

print("\n✅ Test data created successfully!")
print("\nTest accounts:")
print("  Admin: admin@prototaalservice.nl / admin123")
print("  Employee: jan.devries@test.nl / test123")
print("  Employee: maria.santos@test.nl / test123")
