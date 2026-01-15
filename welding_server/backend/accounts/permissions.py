"""
Custom Permission Classes for Role-Based Access Control
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticated(BasePermission):
    """
    Allows access only to authenticated and approved users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers bypass approval check
        if request.user.is_superuser:
            return True
        return request.user.is_approved


class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_admin


class IsInstructor(BasePermission):
    """
    Allows access to instructors and admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_admin or request.user.is_instructor


class IsInstructorOrReadOnly(BasePermission):
    """
    Allows read access to all authenticated users, write access to instructors/admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_approved and not request.user.is_superuser:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin or request.user.is_instructor


class CanAccessMLOps(BasePermission):
    """
    Allows access to MLOps features (admin only).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can_access_mlops()


class CanManageUsers(BasePermission):
    """
    Allows access to user management (admin only).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can_manage_users()


class CanViewStudents(BasePermission):
    """
    Controls access to student data based on role.
    - Admins: all students
    - Instructors: students in their classes
    - Students: only themselves
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_approved and not request.user.is_superuser:
            return False
        return True
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.is_admin:
            return True
        
        if user.is_instructor:
            # Check if student is in instructor's classes
            return obj.class_group in user.assigned_classes.all()
        
        if user.is_student_role:
            # Students can only access their own profile
            return user.student_profile == obj
        
        return False


class CanCreateEvaluation(BasePermission):
    """
    Allows creating evaluations (instructors and admins).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can_create_evaluation()
