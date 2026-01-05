#!/usr/bin/env python
"""
Script to fix pending worklogs that have invalid status 'pending'.
The correct status should be 'submitted'.

Run this from the Backend directory:
    source .venv/bin/activate  # or your virtual environment
    python fix_pending_worklogs.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.worklogs.models import WorkLog

def fix_pending_worklogs():
    """Update worklogs with status='pending' to status='submitted'."""
    # Count first
    pending_count = WorkLog.objects.filter(status='pending').count()
    print(f"Found {pending_count} worklogs with invalid 'pending' status")
    
    if pending_count == 0:
        print("No worklogs to fix.")
        return
    
    # Update
    updated = WorkLog.objects.filter(status='pending').update(status='submitted')
    print(f"✅ Updated {updated} worklogs from 'pending' to 'submitted'")
    
    # Verify
    remaining = WorkLog.objects.filter(status='pending').count()
    print(f"Remaining worklogs with 'pending' status: {remaining}")
    
    submitted = WorkLog.objects.filter(status='submitted').count()
    print(f"Total worklogs with 'submitted' status: {submitted}")

if __name__ == '__main__':
    fix_pending_worklogs()
