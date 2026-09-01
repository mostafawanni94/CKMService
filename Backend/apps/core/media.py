"""
Protected media.

MEDIA_ROOT holds ID documents, passports, signed contracts, certificates and
work photos. It used to be served by ``django.conf.urls.static.static()``, which
applies no access control at all: anyone who could guess a path could download
it, and the filenames are people's names — ``Wanni_M..pdf``,
``Mustafa_Wanni_2025_CV.pdf``. Roughly 1,500 files were readable without
authenticating.

Files are now reached through a signed, expiring URL. A signature is used rather
than a plain permission check because a browser does not attach the bearer token
to an ``<img src>`` or a PDF link — the token lives in localStorage, not a
cookie. The API mints a short-lived signature for each file it hands out, and
this module verifies it on the way back in.
"""

import posixpath
import unicodedata
from pathlib import Path
from urllib.parse import quote, urlencode

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import FileResponse, Http404, HttpResponseForbidden

# How long a minted media link stays valid. Long enough to load a page and open
# a document, short enough that a leaked URL is not a lasting credential.
DEFAULT_TTL_SECONDS = 60 * 30

_signer = TimestampSigner(salt='ckm.media')


def _normalise(relative_path: str) -> str:
    """Normalise a MEDIA_ROOT-relative path for signing and lookup."""
    return unicodedata.normalize('NFC', relative_path.strip('/'))


def sign_path(relative_path: str) -> str:
    """Return the signature for a MEDIA_ROOT-relative path."""
    # value:timestamp:signature — keep only the part after the value itself, so
    # the querystring stays short and the path is not duplicated.
    signed = _signer.sign(_normalise(relative_path))
    return signed[len(_normalise(relative_path)) + 1:]


def verify_path(relative_path: str, signature: str, ttl: int = DEFAULT_TTL_SECONDS) -> bool:
    try:
        _signer.unsign(f'{_normalise(relative_path)}:{signature}', max_age=ttl)
        return True
    except (BadSignature, SignatureExpired):
        return False


def signed_media_url(file_field, request=None, ttl: int = DEFAULT_TTL_SECONDS):
    """
    Build a signed URL for a FileField/ImageField, or None when it is empty.

    Use this everywhere a serializer exposes a file. Returning ``field.url``
    directly produces a link that no longer resolves.
    """
    if not file_field:
        return None
    name = getattr(file_field, 'name', None)
    if not name:
        return None

    relative = _normalise(name)
    query = urlencode({'sig': sign_path(relative)})
    url = f"{settings.MEDIA_URL}{quote(relative)}?{query}"
    return request.build_absolute_uri(url) if request is not None else url


def serve_protected_media(request, path):
    """
    Serve a file from MEDIA_ROOT, but only with a valid, unexpired signature.

    In production put nginx in front and switch to X-Accel-Redirect; this view
    still performs the check, and hands nginx the path to stream.
    """
    relative = _normalise(path)

    signature = request.GET.get('sig')
    if not signature or not verify_path(relative, signature):
        return HttpResponseForbidden('This media link is invalid or has expired.')

    media_root = Path(settings.MEDIA_ROOT).resolve()
    # posixpath.normpath collapses '..' before we touch the filesystem, and the
    # resolved parent check catches symlinks pointing outside MEDIA_ROOT.
    candidate = (media_root / posixpath.normpath(relative)).resolve()
    if not str(candidate).startswith(str(media_root) + '/'):
        raise Http404
    if not candidate.is_file():
        raise Http404

    if getattr(settings, 'USE_X_ACCEL_REDIRECT', False):
        from django.http import HttpResponse
        response = HttpResponse()
        response['X-Accel-Redirect'] = f'/protected-media/{quote(relative)}'
        response['Content-Type'] = ''
        return response

    return FileResponse(candidate.open('rb'))
