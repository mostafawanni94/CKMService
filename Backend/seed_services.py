
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.customers.models import Service

services = [
    {'name': 'Certificate (Diploma)', 'description': 'Processing fees for diplomas'},
    {'name': 'VOG', 'description': 'Certificate of Conduct processing'},
    {'name': 'Safety Gear', 'description': 'Provided safety equipment billing'},
]

for s in services:
    obj, created = Service.objects.get_or_create(name=s['name'], defaults=s)
    if created:
        print(f"Created service: {s['name']}")
    else:
        print(f"Service already exists: {s['name']}")
