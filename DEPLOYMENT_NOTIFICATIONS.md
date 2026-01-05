# 🚀 Deployment Checklist - ProTotaalService

## 📋 Before Going Online (Run Once)

### 1. Database Migrations
```bash
cd Backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Collect Static Files
```bash
python manage.py collectstatic --noinput
```

---

## ⏰ Cron Jobs (Setup on Server)

Add these to your server's crontab (`crontab -e`):

```bash
# Check expiring certificates - Daily at 7 AM
0 7 * * * cd /path/to/Backend && /path/to/venv/bin/python manage.py check_expiring_certificates >> /var/log/cert_check.log 2>&1

# Check stale worklogs - Daily at 9 AM (3+ days pending/rejected)
0 9 * * * cd /path/to/Backend && /path/to/venv/bin/python manage.py check_stale_worklogs >> /var/log/stale_worklogs.log 2>&1

# Remind missing worklogs - Daily at 10 AM (shifts 3+ days ago without worklog)
0 10 * * * cd /path/to/Backend && /path/to/venv/bin/python manage.py check_missing_worklogs >> /var/log/missing_worklogs.log 2>&1

# Cleanup old notifications - Weekly (Sunday 3 AM), delete > 90 days (3 months)
0 3 * * 0 cd /path/to/Backend && /path/to/venv/bin/python manage.py cleanup_notifications --days=90 >> /var/log/notify_cleanup.log 2>&1

# Weekly summary email - Every Monday at 8 AM
0 8 * * 1 cd /path/to/Backend && /path/to/venv/bin/python manage.py send_weekly_summary >> /var/log/weekly_summary.log 2>&1
```

---

## 📧 Email Configuration (Settings Page)

1. Go to `/dashboard/settings`
2. Enable SMTP
3. Enter your Gmail address
4. Enter Gmail App Password (NOT your regular password)
   - Get App Password: https://myaccount.google.com/apppasswords
5. Add notification recipient emails
6. Configure which categories trigger emails

---

## 📱 Firebase Push Notifications (Optional)

### Flutter Setup:
1. Add to `pubspec.yaml`:
```yaml
firebase_core: ^2.24.2
firebase_messaging: ^14.7.10
```

2. Create Firebase project: https://console.firebase.google.com
3. Download `google-services.json` → `android/app/`
4. Download `GoogleService-Info.plist` → `ios/Runner/`

---

## ✅ Quick Server Commands

```bash
# Test certificate check (dry run)
python manage.py check_expiring_certificates --dry-run

# Run certificate check
python manage.py check_expiring_certificates

# Create superuser
python manage.py createsuperuser
```

---

## 📁 New Files Created

- `Backend/apps/notifications/signals.py` - Auto-email on notification
- `Backend/apps/notifications/email_service.py` - Gmail SMTP service
- `Backend/apps/notifications/device_models.py` - FCM device tokens
- `Backend/apps/notifications/management/commands/check_expiring_certificates.py`
- `FlutterProTotaalService/lib/core/services/fcm_service.dart`

---

*Created: 2024-12-29*
