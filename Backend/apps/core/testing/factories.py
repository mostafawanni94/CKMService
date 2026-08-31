"""
Minimal object factories for tests.

EmployeeProfile alone has 18 required fields, so building one inline in every
test would bury the thing under test. These helpers fill the boring fields with
valid defaults and let each test override only what it cares about.
"""

import itertools
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

__all__ = [
    'make_user', 'make_employee', 'make_customer', 'make_project',
    'make_service', 'make_surcharge_type', 'make_work_entry',
    'make_leave_type', 'tiny_image',
    'attach_service_rate', 'attach_customer_surcharge',
]

# Monotonic suffix so repeated factory calls in one test do not collide on the
# unique constraints (User.email, Service.code, LeaveType.code, BSN).
_counter = itertools.count(1)


def _next():
    return next(_counter)


# A 1x1 GIF: the smallest thing that satisfies an ImageField.
_GIF_BYTES = (
    b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!'
    b'\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00'
    b'\x00\x02\x02D\x01\x00;'
)


def tiny_image(name='doc.gif'):
    return SimpleUploadedFile(name, _GIF_BYTES, content_type='image/gif')


def make_user(email=None, role='employee', password='TestPass!234', **kwargs):
    from apps.employees.models import User
    email = email or f'user{_next()}@example.com'
    return User.objects.create_user(email=email, password=password, role=role, **kwargs)


def make_employee(
    email=None,
    hourly_rate=Decimal('20.00'),
    receives_surcharges=True,
    user=None,
    **kwargs,
):
    """
    An approved employee with a complete profile.

    A post_save signal on User already creates a placeholder EmployeeProfile for
    every employee-role account, so this fills that row in rather than creating
    a second one (which would trip the OneToOne constraint).
    """
    from apps.employees.models import DocumentType, EmployeeProfile

    index = _next()
    user = user or make_user(email=email or f'employee{index}@example.com', role='employee')
    document_type, _ = DocumentType.objects.get_or_create(
        name='Paspoort', defaults={'is_active': True},
    )
    values = dict(
        first_name='Test',
        last_name='Employee',
        initials='T.E.',
        gender='male',
        date_of_birth=date(1990, 1, 1),
        birthplace='Amsterdam',
        bsn=f'{100000000 + index}',
        document_type=document_type,
        document_number=f'NL{100000 + index}',
        document_expiry_date=date.today() + timedelta(days=365),
        id_document_front=tiny_image('front.gif'),
        id_document_back=tiny_image('back.gif'),
        phone_number='0612345678',
        postcode='1011AB',
        city='Amsterdam',
        iban='NL91ABNA0417164300',
        nationality='Dutch',
        hourly_rate=hourly_rate,
        receives_surcharges=receives_surcharges,
        status='approved',
    )
    values.update(kwargs)

    profile = EmployeeProfile.objects.filter(user=user).first()
    if profile is None:
        return EmployeeProfile.objects.create(user=user, **values)

    for field, value in values.items():
        setattr(profile, field, value)
    profile.save()
    return profile


def make_customer(company_name=None, **kwargs):
    from apps.customers.models import Customer
    defaults = dict(
        company_name=company_name or f'Acme BV {_next()}',
        address='Hoofdstraat 1',
        postcode='1011AB',
        city='Amsterdam',
    )
    defaults.update(kwargs)
    return Customer.objects.create(**defaults)


def make_service(name=None, code=None, **kwargs):
    from apps.customers.models import Service
    index = _next()
    return Service.objects.create(
        name=name or f'Service {index}', code=code or f'SVC{index}', **kwargs,
    )


def make_project(customer=None, name='Project A', location='Amsterdam', **kwargs):
    from apps.projects.models import Project
    customer = customer or make_customer()
    defaults = dict(customer=customer, name=name, location=location)
    defaults.update(kwargs)
    return Project.objects.create(**defaults)


def make_surcharge_type(
    name=None,
    category='night_shift',
    time_from=time(0, 0),
    time_to=time(6, 0),
    days_of_week=None,
    **kwargs,
):
    """
    A surcharge *window*. The percentage lives on the customer link, not here —
    see `attach_customer_surcharge`.
    """
    from apps.employees.models import SurchargeType
    defaults = dict(
        name=name or f'Surcharge {_next()}',
        category=category,
        time_from=time_from,
        time_to=time_to,
        days_of_week=days_of_week if days_of_week is not None else [],
        is_active=True,
    )
    defaults.update(kwargs)
    return SurchargeType.objects.create(**defaults)


def attach_service_rate(customer, service, price=Decimal('40.00'), apply_surcharges=True):
    """Set what `customer` pays per hour for `service`."""
    from apps.customers.models import CustomerServiceRate
    return CustomerServiceRate.objects.create(
        customer=customer, service=service, price=price,
        is_active=True, apply_surcharges=apply_surcharges,
    )


def attach_customer_surcharge(customer, surcharge_type, percentage=Decimal('30.00')):
    """Set the percentage `customer` pays for `surcharge_type`."""
    from apps.customers.models import CustomerSurcharge
    return CustomerSurcharge.objects.create(
        customer=customer, surcharge_type=surcharge_type,
        percentage=percentage, is_enabled=True,
    )


def make_work_entry(
    employee=None,
    project=None,
    work_date=None,
    start='09:00',
    end='17:00',
    break_minutes=30,
    status='approved',
    **kwargs,
):
    """A work entry with actual start/end datetimes in the local timezone."""
    from apps.worklogs.models import WorkEntry

    employee = employee or make_employee()
    project = project or make_project()
    work_date = work_date or date.today()

    def _dt(value):
        hour, minute = (int(part) for part in value.split(':'))
        naive = timezone.datetime.combine(work_date, time(hour, minute))
        return timezone.make_aware(naive)

    start_dt = _dt(start)
    end_dt = _dt(end)
    if end_dt <= start_dt:  # overnight shift
        end_dt += timedelta(days=1)

    defaults = dict(
        employee=employee,
        project=project,
        work_date=work_date,
        actual_start_datetime=start_dt,
        actual_end_datetime=end_dt,
        break_duration_minutes=break_minutes,
        status=status,
    )
    defaults.update(kwargs)
    return WorkEntry.objects.create(**defaults)


def make_leave_type(name='Vakantie', code=None, **kwargs):
    from apps.hr.models import LeaveType
    defaults = dict(name=name, code=code or f'LV{_next()}', is_paid=True, is_active=True)
    defaults.update(kwargs)
    return LeaveType.objects.create(**defaults)
