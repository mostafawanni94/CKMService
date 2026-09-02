"""
Report — and optionally remove — media files nothing in the database references.

Deliberately reports by default. An uploaded document can be evidence for an
audit long after the row that pointed at it was soft-deleted, so nothing is
removed without being asked, and never without saying exactly what.

    python manage.py prune_orphan_media                # report only
    python manage.py prune_orphan_media --older-than 30
    python manage.py prune_orphan_media --delete --older-than 30
"""

import time
from collections import Counter
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import FileField, ImageField


def referenced_paths():
    """Every file path any model still points at, deleted rows included."""
    paths = set()
    for config in apps.get_app_configs():
        if not config.name.startswith('apps.'):
            continue
        for model in config.get_models():
            fields = [f.name for f in model._meta.fields
                      if isinstance(f, (FileField, ImageField))]
            if not fields:
                continue
            # `all_objects` where a model soft-deletes: a deleted row's document
            # is still evidence.
            manager = getattr(model, 'all_objects', model.objects)
            for row in manager.all().values(*fields).iterator(chunk_size=1000):
                paths.update(str(value) for value in row.values() if value)
    return paths


class Command(BaseCommand):
    help = 'Report media files no database row references.'

    def add_arguments(self, parser):
        parser.add_argument('--delete', action='store_true',
                            help='Actually remove them. Reports by default.')
        parser.add_argument('--older-than', type=int, default=0,
                            help='Only consider files older than N days.')
        parser.add_argument('--newer-than', type=int, default=0,
                            help='Only consider files newer than N days. Use this '
                                 'to clear a recent test run without touching '
                                 'anything historical.')

    def handle(self, *args, **options):
        media = Path(settings.MEDIA_ROOT)
        if not media.exists():
            self.stdout.write('No media directory.')
            return

        referenced = referenced_paths()
        cutoff = time.time() - options['older_than'] * 86400

        orphans, kept_recent, by_folder = [], 0, Counter()
        for path in media.rglob('*'):
            if not path.is_file():
                continue
            relative = str(path.relative_to(media))
            if relative in referenced:
                continue
            modified = path.stat().st_mtime
            if options['older_than'] and modified > cutoff:
                kept_recent += 1
                continue
            if options['newer_than'] and modified < time.time() - options['newer_than'] * 86400:
                kept_recent += 1
                continue
            orphans.append(path)
            by_folder[relative.split('/')[0]] += 1

        total = sum(path.stat().st_size for path in orphans)
        self.stdout.write(
            f'{len(referenced)} files referenced, {len(orphans)} orphaned '
            f'({total / 1024 / 1024:.1f} MB)'
            + (f', {kept_recent} outside the age window' if kept_recent else ''))
        for folder, count in by_folder.most_common():
            self.stdout.write(f'    {folder}: {count}')

        if not options['delete']:
            self.stdout.write(self.style.WARNING(
                'Nothing removed. Re-run with --delete once you have checked '
                'the list above.'))
            return

        removed = 0
        for path in orphans:
            try:
                path.unlink()
                removed += 1
            except OSError as error:
                self.stderr.write(f'could not remove {path}: {error}')

        self.stdout.write(self.style.SUCCESS(
            f'Removed {removed} orphaned file(s), {total / 1024 / 1024:.1f} MB.'))
