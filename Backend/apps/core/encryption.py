"""
Application-level encryption for sensitive personal and financial fields.

Covers BSN, IBAN, identity-document numbers and driving-licence numbers. The
Dutch BSN in particular is special-category personal data, and these columns
previously sat in the database in clear text — readable from any backup, dump or
replica.

Design
------
* **Randomised, not deterministic.** None of the encrypted fields is searched,
  filtered, ordered or unique anywhere in the codebase (verified), so there is
  no reason to weaken the scheme for lookups. Two rows holding the same IBAN
  produce different ciphertext, and equality on the encrypted column reveals
  nothing.
* **Fernet** (AES-128-CBC + HMAC-SHA256) from ``cryptography``, which is already
  an installed dependency.
* **MultiFernet** for rotation: the first key encrypts, every key can decrypt.
* The key never touches the database, the source tree or the logs. It is read
  once from the environment.

If a lookup on an encrypted field is ever needed, add a separate blind-index
column (HMAC of the normalised value) rather than switching to deterministic
encryption.
"""

import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import models

logger = logging.getLogger(__name__)

# Marks a value this module produced, so a partially migrated table can be read
# without guessing. Anything without the prefix is treated as legacy plaintext.
PREFIX = 'enc$v1$'

_fernet = None


def _load_keys():
    """
    Read the key material from the environment.

    ``FIELD_ENCRYPTION_KEYS`` is a comma-separated list of urlsafe-base64 Fernet
    keys. The first encrypts; all of them decrypt, which is what makes rotation
    possible without a re-encryption outage.
    """
    from django.conf import settings

    raw = getattr(settings, 'FIELD_ENCRYPTION_KEYS', '') or ''
    keys = [k.strip() for k in raw.split(',') if k.strip()]
    if not keys:
        raise ImproperlyConfigured(
            'FIELD_ENCRYPTION_KEYS is not set. Sensitive fields (BSN, IBAN, '
            'document numbers) cannot be read or written without it. Generate a '
            'key with:  python manage.py generate_encryption_key  — then put it '
            'in Backend/.env and back it up SEPARATELY from the database.'
        )
    return keys


def get_fernet():
    """The process-wide MultiFernet. Built once, never logged."""
    global _fernet
    if _fernet is None:
        from cryptography.fernet import Fernet, MultiFernet
        try:
            _fernet = MultiFernet([Fernet(k.encode()) for k in _load_keys()])
        except ImproperlyConfigured:
            raise
        except Exception as exc:
            # Deliberately does not include the key material in the message.
            raise ImproperlyConfigured(
                f'FIELD_ENCRYPTION_KEYS is set but unusable ({type(exc).__name__}). '
                'Each entry must be a urlsafe-base64 32-byte Fernet key.'
            ) from exc
    return _fernet


def reset_fernet_cache():
    """Drop the cached instance. Used by tests that override the keys."""
    global _fernet
    _fernet = None


def encrypt(value):
    """Encrypt a string. Returns None/'' unchanged so blank fields stay blank."""
    if value is None or value == '':
        return value
    if is_encrypted(value):
        return value
    token = get_fernet().encrypt(str(value).encode()).decode()
    return f'{PREFIX}{token}'


def decrypt(value):
    """
    Decrypt a value produced by :func:`encrypt`.

    A value without the prefix is legacy plaintext from before the migration and
    is returned as-is, so a half-migrated table still reads correctly. That case
    is logged without the value so it can be found and migrated.
    """
    if value is None or value == '':
        return value
    if not is_encrypted(value):
        logger.warning(
            'Read an unencrypted value from an encrypted field. Run '
            'encrypt_sensitive_fields to migrate it.'
        )
        return value

    from cryptography.fernet import InvalidToken
    try:
        return get_fernet().decrypt(value[len(PREFIX):].encode()).decode()
    except InvalidToken:
        # Wrong key, or the ciphertext was tampered with. Never fall back to
        # returning the raw token — that would leak ciphertext into the UI and
        # hide a real key-management failure.
        raise ImproperlyConfigured(
            'Could not decrypt a sensitive field. The value was encrypted with a '
            'key that is not in FIELD_ENCRYPTION_KEYS. Restore the correct key; '
            'do not re-encrypt, which would destroy the original value.'
        )


def is_encrypted(value):
    return isinstance(value, str) and value.startswith(PREFIX)


# =============================================================================
# MASKING
# =============================================================================

def mask_iban(value):
    """NL20 INGB 0119 4132 56 -> NL20 **** **** **** 56"""
    if not value:
        return value
    cleaned = str(value).replace(' ', '')
    if len(cleaned) < 6:
        return '*' * len(cleaned)
    return f'{cleaned[:4]} **** **** **** {cleaned[-2:]}'


def mask_bsn(value):
    """A BSN is never partially safe to show. Reveal nothing but its presence."""
    return '*********' if value else value


def mask_generic(value, keep_last=4):
    if not value:
        return value
    text = str(value)
    if len(text) <= keep_last:
        return '*' * len(text)
    return '*' * (len(text) - keep_last) + text[-keep_last:]


# =============================================================================
# MODEL FIELD
# =============================================================================

class EncryptedCharField(models.CharField):
    """
    A CharField whose value is encrypted at rest.

    The column is widened to hold ciphertext; ``plaintext_max_length`` keeps the
    original business-rule length validated on the way in, which a plain
    ``max_length`` bump would otherwise silently discard.
    """

    description = 'Encrypted string, randomised per write'

    def __init__(self, *args, plaintext_max_length=None, **kwargs):
        self.plaintext_max_length = plaintext_max_length
        kwargs.setdefault('max_length', 512)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.plaintext_max_length is not None:
            kwargs['plaintext_max_length'] = self.plaintext_max_length
        return name, path, args, kwargs

    def get_prep_value(self, value):
        return encrypt(super().get_prep_value(value))

    def from_db_value(self, value, expression, connection):
        return decrypt(value)

    def to_python(self, value):
        if is_encrypted(value):
            return decrypt(value)
        return super().to_python(value)

    def validate(self, value, model_instance):
        # Validate the plaintext the user actually typed, not the ciphertext.
        if (self.plaintext_max_length
                and value
                and not is_encrypted(value)
                and len(str(value)) > self.plaintext_max_length):
            from django.core.exceptions import ValidationError
            raise ValidationError(
                f'Ensure this value has at most {self.plaintext_max_length} characters.'
            )
        super().validate(value, model_instance)
