"""
Authentication endpoints.

These used to be defined inline inside ``config/urls.py``, which meant the root
URLconf imported serializers at module scope. They live with the rest of the
employees app now.
"""

import logging

from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import PasswordChangeSerializer

logger = logging.getLogger(__name__)


class CKMTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Adds identity claims to the access token.

    SimpleJWT ships only ``user_id``, so the dashboard had no way to tell an
    admin from a finance user and rendered the full admin navigation to
    everyone. The role now travels in the token for *presentation* only —
    every endpoint still enforces its own permission class server-side.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['is_first_login'] = user.is_first_login
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'is_first_login': user.is_first_login,
        }
        return data


class LoginThrottle(AnonRateThrottle):
    """
    Login gets its own bucket, tighter than the general anonymous rate.

    A small business dashboard has a handful of accounts with publicly known
    email addresses, so credential stuffing is the realistic attack. The
    general 100/hour anonymous rate is far too loose for a password guess.
    """

    scope = 'login'


class CKMTokenObtainPairView(TokenObtainPairView):
    """Login endpoint returning tokens plus the signed-in user's identity."""

    serializer_class = CKMTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]


class PasswordResetThrottle(AnonRateThrottle):
    """Password reset is unauthenticated, so it gets its own tighter bucket."""

    scope = 'password_reset'


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def password_change(request):
    """
    Change the password of the authenticated user.

    POST /api/auth/password-change/
    {"current_password": "...", "new_password": "..."}
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    user = request.user
    user.set_password(serializer.validated_data['new_password'])
    user.is_first_login = False
    user.save(update_fields=['password', 'is_first_login', 'updated_at'])
    return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request(request):
    """
    Start a password reset.

    POST /api/auth/password-reset/  {"email": "..."}

    Always returns 200 with the same body whether or not the address exists —
    a differing response would let an anonymous caller enumerate accounts.
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']

    generic = Response(
        {'message': 'If an account exists for that address, a reset link has been sent.'},
        status=status.HTTP_200_OK,
    )

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is None:
        return generic

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    from apps.core.models import SystemConfig
    from apps.notifications.email_service import EmailService

    config = SystemConfig.objects.get_config()
    base = (config.frontend_url or '').rstrip('/')
    if not base:
        logger.error(
            'Password reset requested but SystemConfig.frontend_url is unset; '
            'cannot build a usable reset link.'
        )
        return generic
    reset_url = f"{base}/reset-password?uid={uid}&token={token}"

    service = EmailService.from_config()
    if service.is_configured():
        service.send_email(
            recipients=[user.email],
            subject='Wachtwoord opnieuw instellen — CKM Services',
            html_content=(
                '<p>Er is een verzoek gedaan om je wachtwoord opnieuw in te stellen.</p>'
                f'<p><a href="{reset_url}">Stel je wachtwoord opnieuw in</a></p>'
                '<p>Deze link is 24 uur geldig. Heb je dit niet aangevraagd, '
                'dan kun je deze e-mail negeren.</p>'
            ),
        )
    else:
        logger.warning('Password reset requested for %s but SMTP is not configured', user.pk)

    return generic


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_confirm(request):
    """
    Complete a password reset.

    POST /api/auth/password-reset/confirm/
    {"uid": "...", "token": "...", "new_password": "..."}
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    invalid = Response(
        {'detail': 'This reset link is invalid or has expired.'},
        status=status.HTTP_400_BAD_REQUEST,
    )

    try:
        uid = force_str(urlsafe_base64_decode(data['uid']))
        user = User.objects.get(pk=uid, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist, DjangoValidationError):
        return invalid

    if not default_token_generator.check_token(user, data['token']):
        return invalid

    user.set_password(data['new_password'])
    user.is_first_login = False
    user.save(update_fields=['password', 'is_first_login', 'updated_at'])
    return Response({'message': 'Password has been reset.'}, status=status.HTTP_200_OK)
