import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.customers.models import Service

print(f"Deleting {Service.objects.count()} services...")
Service.objects.all().delete()
print("Done.")
