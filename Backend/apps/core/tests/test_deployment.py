"""
The settings a production deployment depends on.

Each of these has a failure mode that is invisible in development and serious in
production: a debug server with a known key, an unsigned media URL, a missing
encryption key that silently stores plaintext.
"""

import os
from pathlib import Path

from django.conf import settings
from django.test import TestCase


class SecretTests(TestCase):
    def test_the_signing_key_comes_from_the_environment(self):
        """
        A development fallback is fine; using it in production is not. The
        settings must read the key from the environment and refuse to start
        without one when DEBUG is off.
        """
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        self.assertIn("SECRET_KEY = os.getenv('SECRET_KEY', '')", source)
        self.assertIn('SECRET_KEY must be set when DEBUG is off', source)
        # The fallback exists only inside the DEBUG branch.
        fallback = source.index('django-insecure')
        guard = source.index('if DEBUG:', source.index("SECRET_KEY = os.getenv"))
        self.assertLess(guard, fallback,
                        'the insecure fallback is not behind the DEBUG guard')

    def test_no_encryption_key_or_password_is_written_into_settings(self):
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        for marker in ('FIELD_ENCRYPTION_KEYS = [', 'FIELD_ENCRYPTION_KEYS = "',
                       "FIELD_ENCRYPTION_KEYS = '", 'smtp_password ='):
            with self.subTest(marker=marker):
                self.assertNotIn(marker, source, f'{marker} is in settings.py')
        self.assertIn("os.getenv('FIELD_ENCRYPTION_KEYS', '')", source)

    def test_the_env_file_is_not_committed(self):
        import subprocess

        tracked = subprocess.run(
            ['git', 'ls-files', 'Backend/.env', '.env'],
            cwd=Path(settings.BASE_DIR).parent,
            capture_output=True, text=True).stdout.strip()
        self.assertEqual(tracked, '', 'a .env file is tracked in git')

    def test_the_env_example_carries_no_real_values(self):
        example = Path(settings.BASE_DIR) / '.env.example'
        if not example.exists():
            self.skipTest('no .env.example')
        text = example.read_text()
        # A real Fernet key is 44 base64 characters ending in '='.
        import re
        for line in text.splitlines():
            if 'KEY' in line.upper() and '=' in line:
                value = line.split('=', 1)[1].strip()
                with self.subTest(line=line):
                    self.assertFalse(
                        re.fullmatch(r'[A-Za-z0-9_\-]{43}=', value),
                        f'{line} looks like a real key')


class ProductionSettingTests(TestCase):
    """What must be true once DEBUG is off."""

    def test_debug_defaults_to_off(self):
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        self.assertIn("_env_bool('DEBUG', False)", source,
                      'DEBUG must default to off')

    def test_a_wildcard_host_is_refused_in_production(self):
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        self.assertIn("if '*' in ALLOWED_HOSTS and not DEBUG", source)

    def test_the_security_headers_are_set_when_debug_is_off(self):
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        for setting in ('SECURE_SSL_REDIRECT', 'SECURE_HSTS_SECONDS',
                        'SESSION_COOKIE_SECURE', 'CSRF_COOKIE_SECURE',
                        'SECURE_CONTENT_TYPE_NOSNIFF'):
            with self.subTest(setting=setting):
                self.assertIn(setting, source)

    def test_an_encryption_key_is_required_in_production(self):
        source = (Path(settings.BASE_DIR) / 'config' / 'settings.py').read_text()
        self.assertIn('FIELD_ENCRYPTION_KEYS must be set when DEBUG is off',
                      source)

    def test_cors_is_not_open_to_everything(self):
        self.assertFalse(getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False),
                         'CORS is open to every origin')

    def test_tests_do_not_write_to_the_real_media_root(self):
        """
        Uploads and rendered PDFs go to a temporary directory during a test run.
        Without this the suite filled the developer's media folder.
        """
        self.assertNotEqual(
            Path(settings.MEDIA_ROOT), Path(settings.BASE_DIR) / 'media',
            'the test run is writing into the real media directory')


class DependencyTests(TestCase):
    def test_every_imported_package_is_declared(self):
        """
        requirements.txt lists direct dependencies. A package imported but not
        declared installs on the developer's machine and fails on the server.
        """
        requirements = (Path(settings.BASE_DIR) / 'requirements.txt').read_text().lower()
        for package in ('django', 'djangorestframework', 'reportlab', 'openpyxl',
                        'cryptography', 'pillow', 'requests', 'google-auth',
                        'drf-spectacular', 'django-filter', 'pypdf2'):
            with self.subTest(package=package):
                self.assertIn(package, requirements,
                              f'{package} is imported but not in requirements.txt')


class ScheduledJobTests(TestCase):
    """The cron-driven commands exist and run."""

    COMMANDS = [
        'finance_alerts', 'check_expiring_certificates', 'cleanup_notifications',
        'seed_expense_categories', 'prune_orphan_media',
        'backfill_wallet_earnings',
    ]

    def test_every_scheduled_command_is_registered(self):
        from django.core.management import get_commands

        registered = get_commands()
        for command in self.COMMANDS:
            with self.subTest(command=command):
                self.assertIn(command, registered)

    def test_the_daily_finance_job_runs(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command('finance_alerts', '--date', '2026-08-10', stdout=out)
        self.assertIn('flagged overdue', out.getvalue())

    def test_the_media_report_runs_without_deleting(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command('prune_orphan_media', stdout=out)
        self.assertIn('Nothing removed', out.getvalue())
