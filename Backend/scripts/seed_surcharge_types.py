"""
Seed script for Surcharge Types (Day Payment Types)

Based on Netherlands work schedule - Weekend = Friday 21:30 -> Monday 06:00

This creates the following surcharge types:
1. Weekend Night Start: Friday 21:30 - 23:59
2. Weekend Full Days: Saturday & Sunday (all day)  
3. Weekend Morning End: Monday 00:00 - 06:00
4. Night Shift: Mon-Thu 21:30 - 06:00
5. Public Holidays (Morning): All NL holidays 07:00-18:00
6. Public Holidays (Night): All NL holidays 18:00-07:00

Run with: cd Backend && source venv/bin/activate && python manage.py shell < scripts/seed_surcharge_types.py
"""

import django
import os
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.employees.models import SurchargeType

# All NL Public Holidays (MM-DD format)
NL_PUBLIC_HOLIDAYS = [
    '01-01',  # New Year's Day
    '04-18',  # Good Friday (variable)
    '04-20',  # Easter Sunday (variable)
    '04-21',  # Easter Monday (variable)
    '04-27',  # King's Day
    '05-05',  # Liberation Day
    '05-29',  # Ascension Day (variable)
    '06-08',  # Whit Sunday (variable)
    '06-09',  # Whit Monday (variable)
    '12-25',  # Christmas Day
    '12-26',  # Second Christmas Day
]

SURCHARGE_TYPES = [
    # Weekend = Friday 21:30 -> Monday 06:00
    {
        'name': 'Weekend Night Start (Friday)',
        'category': 'weekend',
        'description': 'Weekend surcharge starts Friday 21:30',
        'time_from': '21:30',
        'time_to': '23:59',
        'days_of_week': [4],  # Friday only
        'specific_dates': [],
        'is_active': True,
        'sort_order': 1,
    },
    {
        'name': 'Weekend Full Days',
        'category': 'weekend',
        'description': 'Weekend surcharge for Saturday and Sunday (all day)',
        'time_from': None,
        'time_to': None,
        'days_of_week': [5, 6],  # Saturday=5, Sunday=6
        'specific_dates': [],
        'is_active': True,
        'sort_order': 2,
    },
    {
        'name': 'Weekend Morning End (Monday)',
        'category': 'weekend',
        'description': 'Weekend surcharge ends Monday 06:00',
        'time_from': '00:00',
        'time_to': '06:00',
        'days_of_week': [0],  # Monday only
        'specific_dates': [],
        'is_active': True,
        'sort_order': 3,
    },
    # Night Shift = Mon-Thu nights (Friday night is part of weekend)
    {
        'name': 'Night Shift',
        'category': 'night_shift',
        'description': 'Night shift surcharge for Mon-Thu, 21:30-06:00',
        'time_from': '21:30',
        'time_to': '06:00',
        'days_of_week': [0, 1, 2, 3],  # Monday-Thursday
        'specific_dates': [],
        'is_active': True,
        'sort_order': 4,
    },
    # Public Holidays
    {
        'name': 'Public Holidays (Morning)',
        'category': 'holiday',
        'description': 'Public holiday surcharge - morning shift 07:00-18:00',
        'time_from': '07:00',
        'time_to': '18:00',
        'days_of_week': [],
        'specific_dates': NL_PUBLIC_HOLIDAYS,
        'is_active': True,
        'sort_order': 5,
    },
    {
        'name': 'Public Holidays (Night)',
        'category': 'holiday',
        'description': 'Public holiday surcharge - night shift 18:00-07:00',
        'time_from': '18:00',
        'time_to': '07:00',
        'days_of_week': [],
        'specific_dates': NL_PUBLIC_HOLIDAYS,
        'is_active': True,
        'sort_order': 6,
    },
]

def seed_surcharge_types():
    # Clear all existing surcharge types (optional - uncomment to reset)
    # SurchargeType.objects.all().delete()
    # print("Cleared all existing surcharge types")
    
    created_count = 0
    updated_count = 0
    
    for st_data in SURCHARGE_TYPES:
        st, created = SurchargeType.objects.update_or_create(
            name=st_data['name'],
            defaults=st_data
        )
        if created:
            created_count += 1
            print(f"Created: {st.name}")
        else:
            updated_count += 1
            print(f"Updated: {st.name}")
    
    print(f"\n✅ Summary: Created {created_count}, Updated {updated_count}")
    print(f"📊 Total surcharge types: {SurchargeType.objects.count()}")
    print("\nAll surcharge types:")
    for st in SurchargeType.objects.all().order_by('sort_order'):
        print(f"  - {st.name} ({st.category})")

if __name__ == '__main__':
    seed_surcharge_types()
else:
    seed_surcharge_types()
