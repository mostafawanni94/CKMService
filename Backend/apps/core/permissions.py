"""
Shared permission classes.

Previously ``IsAdmin`` and ``IsAdminOrSelf`` lived in ``apps.employees.views``
and were imported from there by seven other apps, which made the employees view
module an implicit dependency of the whole project. They now live here.

The ``finance`` and ``operations`` roles exist on the User model but had no
permission class of their own, so every back-office endpoint was gated on
``IsAdmin`` and those two roles were effectively locked out. ``IsFinanceStaff``
and ``IsOperationsStaff`` close that gap; admins always pass.
"""

from rest_framework import permissions


class RolePermission(permissions.BasePermission):
    """Base class: grant access when the user holds one of ``allowed_roles``."""

    allowed_roles: tuple = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in self.allowed_roles
        )


class IsAdmin(RolePermission):
    """Allow access only to admin users."""

    allowed_roles = ('admin',)


class IsEmployee(RolePermission):
    """Allow access only to employee users."""

    allowed_roles = ('employee',)


class IsCustomerUser(RolePermission):
    """Allow access only to customer portal users."""

    allowed_roles = ('customer',)

    def has_permission(self, request, view):
        # Portal users are additionally required to be linked to a Customer,
        # otherwise there is no tenant to scope their queryset to.
        return super().has_permission(request, view) and request.user.customer_id is not None


class IsFinanceStaff(RolePermission):
    """Finance managers and admins."""

    allowed_roles = ('admin', 'finance')


class IsOperationsStaff(RolePermission):
    """Operations coordinators and admins."""

    allowed_roles = ('admin', 'operations')


class IsBackOffice(RolePermission):
    """Any internal back-office role (admin, finance, operations)."""

    allowed_roles = ('admin', 'finance', 'operations')


class IsAdminOrSelf(permissions.BasePermission):
    """Allow access to admins, or to the user the object belongs to."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_admin:
            return True
        if hasattr(obj, 'user'):
            return obj.user_id == user.id
        return obj == user


class IsAdminOrReadOnly(permissions.BasePermission):
    """Everyone authenticated may read; only admins may write."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.is_admin
