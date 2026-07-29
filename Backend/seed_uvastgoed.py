"""
Seed script: Create dummy data for U Vastgoed customer demo.
Run: cd Backend && venv/bin/python seed_uvastgoed.py
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, time, timedelta, datetime
from decimal import Decimal
from django.utils import timezone
from apps.customers.models import Customer
from apps.employees.models import User, EmployeeProfile
from apps.projects.models import Project, ProjectAssignment
from apps.worklogs.models import WorkEntry

print("=" * 60)
print("🏗️  Seeding U Vastgoed demo data...")
print("=" * 60)

# ─── 1. CREATE CUSTOMER ───────────────────────────────────────
customer, created = Customer.objects.get_or_create(
    company_name='U Vastgoed',
    defaults={
        'address': 'Herengracht 450',
        'street_name': 'Herengracht',
        'house_number': '450',
        'city': 'Amsterdam',
        'postcode': '1017 CA',
        'country': 'Netherlands',
        'kvk_number': '12345678',
        'btw_number': 'NL123456789B01',
        'website': 'https://uvastgoed.nl',
    }
)
print(f"✅ {'Created' if created else 'Found'} customer: {customer.company_name} (ID: {customer.id})")

# ─── 2. CREATE EMPLOYEES ──────────────────────────────────────
employee_data = [
    {'first_name': 'Ahmed', 'last_name': 'Bakker', 'email': 'ahmed.b@ckm-demo.nl'},
    {'first_name': 'Kevin', 'last_name': 'de Vries', 'email': 'kevin.dv@ckm-demo.nl'},
    {'first_name': 'Mohammed', 'last_name': 'Jansen', 'email': 'mohammed.j@ckm-demo.nl'},
    {'first_name': 'Peter', 'last_name': 'Smit', 'email': 'peter.s@ckm-demo.nl'},
    {'first_name': 'Stefan', 'last_name': 'van Dijk', 'email': 'stefan.vd@ckm-demo.nl'},
]

employees = []
for emp_data in employee_data:
    user, u_created = User.objects.get_or_create(
        email=emp_data['email'],
        defaults={
            'first_name': emp_data['first_name'],
            'last_name': emp_data['last_name'],
            'role': 'employee',
        }
    )
    if u_created:
        user.set_password('DemoPass123!')
        user.save()
    
    employee, e_created = EmployeeProfile.objects.get_or_create(
        user=user,
        defaults={
            'first_name': emp_data['first_name'],
            'last_name': emp_data['last_name'],
            'email': emp_data['email'],
            'status': 'approved',
        }
    )
    employees.append(employee)
    print(f"  👷 {'Created' if e_created else 'Found'} employee: {emp_data['first_name']} {emp_data['last_name']}")

print(f"✅ {len(employees)} employees ready")

# ─── 3. CREATE PROJECTS ───────────────────────────────────────
projects_data = [
    {
        'name': 'Renovatie Kantoorpand Herengracht',
        'status': 'active',
        'location': 'Amsterdam',
        'location_address': 'Herengracht 450',
        'location_city': 'Amsterdam',
        'start_date': date(2026, 3, 1),
        'expected_end_date': date(2026, 9, 30),
        'emp_indices': [0, 1, 2, 3],
    },
    {
        'name': 'Onderhoud Appartementen Zuidas',
        'status': 'active',
        'location': 'Amsterdam',
        'location_address': 'Gustav Mahlerlaan 22',
        'location_city': 'Amsterdam',
        'start_date': date(2026, 5, 15),
        'expected_end_date': date(2026, 12, 31),
        'emp_indices': [1, 2, 4],
    },
    {
        'name': 'Badkamer Renovatie Jordaan',
        'status': 'completed',
        'location': 'Amsterdam',
        'location_address': 'Prinsengracht 180',
        'location_city': 'Amsterdam',
        'start_date': date(2026, 1, 10),
        'expected_end_date': date(2026, 4, 30),
        'emp_indices': [0, 3],
    },
    {
        'name': 'Nieuwbouw Woningen IJburg',
        'status': 'active',
        'location': 'Amsterdam',
        'location_address': 'IJburglaan 500',
        'location_city': 'Amsterdam',
        'start_date': date(2026, 6, 1),
        'expected_end_date': date(2027, 3, 31),
        'emp_indices': [0, 1, 2, 3, 4],
    },
]

projects = []
for p_data in projects_data:
    emp_indices = p_data.pop('emp_indices')
    project, p_created = Project.objects.get_or_create(
        name=p_data['name'],
        customer=customer,
        defaults=p_data,
    )
    
    # Create ProjectAssignment for each employee
    for idx in emp_indices:
        ProjectAssignment.objects.get_or_create(
            project=project,
            employee=employees[idx],
            defaults={
                'role': 'worker',
                'assignment_type': 'long_term',
                'start_date': project.start_date or date(2026, 1, 1),
                'is_active': True,
            }
        )
    
    projects.append(project)
    print(f"  📋 {'Created' if p_created else 'Found'} project: {p_data['name']} ({p_data['status']})")

print(f"✅ {len(projects)} projects ready")

# ─── 4. CREATE WORK ENTRIES ───────────────────────────────────
print("\n📝 Creating work entries...")
today = date.today()
entries_created = 0

for project in projects:
    assigned = list(ProjectAssignment.objects.filter(project=project, is_active=True).select_related('employee'))
    
    if project.status == 'completed':
        start_range = project.start_date or date(2026, 1, 10)
        days_range = 40
    else:
        start_range = today - timedelta(days=25)
        days_range = 25
    
    for day_offset in range(days_range):
        work_date = start_range + timedelta(days=day_offset)
        if work_date.weekday() >= 5:  # Skip weekends
            continue
        
        for i, assignment in enumerate(assigned):
            if (day_offset + i) % 4 == 3:  # ~75% attendance
                continue
            
            emp = assignment.employee
            start_hour = 7 + (abs(hash(f"{emp.id}{work_date}")) % 2)
            end_hour = start_hour + 8 + (abs(hash(f"{work_date}{emp.id}")) % 2)
            end_hour = min(end_hour, 18)
            
            break_start = time(12, 0)
            break_end = time(12, 30)
            
            entry, e_created = WorkEntry.objects.get_or_create(
                employee=emp,
                project=project,
                work_date=work_date,
                defaults={
                    'planned_start_time': time(start_hour, 0),
                    'planned_end_time': time(end_hour, 0),
                    'actual_start_datetime': timezone.make_aware(datetime(work_date.year, work_date.month, work_date.day, start_hour, 0)),
                    'actual_end_datetime': timezone.make_aware(datetime(work_date.year, work_date.month, work_date.day, end_hour, 0)),
                    'breaks': [{'start': '12:00', 'end': '12:30'}],
                    'break_duration_minutes': 30,
                    'status': 'approved',
                }
            )
            if e_created:
                entries_created += 1

print(f"✅ {entries_created} work entries created")

# ─── 5. CREATE PORTAL USER ────────────────────────────────────
portal_email = 'portal@uvastgoed.nl'
portal_password = 'UVastgoed2026!'

portal_user, pu_created = User.objects.get_or_create(
    email=portal_email,
    defaults={
        'first_name': 'Mark',
        'last_name': 'van der Berg',
        'role': 'customer',
        'customer': customer,
        'is_first_login': False,
    }
)
portal_user.set_password(portal_password)
portal_user.save()

print(f"\n✅ {'Created' if pu_created else 'Updated'} portal user")
print("\n" + "=" * 60)
print("🎉 DONE! Customer portal credentials:")
print("=" * 60)
print(f"   📧 Email:    {portal_email}")
print(f"   🔑 Password: {portal_password}")
print("=" * 60)
print(f"\n   🏢 Customer: {customer.company_name}")
print(f"   📋 Projects: {len(projects)}")
print(f"   👷 Employees: {len(employees)}")
print(f"   📝 Work entries: {entries_created}")
print("=" * 60)
