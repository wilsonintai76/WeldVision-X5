"""
User Models with Role-Based Access Control
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with roles"""
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        INSTRUCTOR = 'instructor', 'Instructor'
        STUDENT = 'student', 'Student'
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        help_text="User role determines access permissions"
    )
    
    is_approved = models.BooleanField(
        default=False,
        help_text="User must be approved by admin to access the system"
    )
    
    # Link to Student model for student users
    student_profile = models.OneToOneField(
        'core.Student',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_account',
        help_text="Linked student profile (for student role)"
    )
    
    # Link to ClassGroup for instructors
    assigned_classes = models.ManyToManyField(
        'core.ClassGroup',
        blank=True,
        related_name='instructors',
        help_text="Classes this instructor manages"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser
    
    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR
    
    @property
    def is_student_role(self):
        return self.role == self.Role.STUDENT
    
    def can_access_mlops(self):
        """Only admins can access MLOps features"""
        return self.is_admin
    
    def can_manage_users(self):
        """Only admins can manage users"""
        return self.is_admin
    
    def can_view_all_students(self):
        """Admins and instructors can view all students"""
        return self.is_admin or self.is_instructor
    
    def can_create_evaluation(self):
        """Admins and instructors can create evaluations"""
        return self.is_admin or self.is_instructor
    
    def get_accessible_students(self):
        """Get students this user can access"""
        from core.models import Student
        
        if self.is_admin:
            return Student.objects.all()
        elif self.is_instructor:
            # Instructors see students in their assigned classes
            return Student.objects.filter(class_group__in=self.assigned_classes.all())
        elif self.is_student_role and self.student_profile:
            # Students see only themselves
            return Student.objects.filter(pk=self.student_profile.pk)
        return Student.objects.none()


class AuditLog(models.Model):
    """Audit log for tracking user actions"""
    
    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        EXPORT = 'export', 'Export'
        DEPLOY = 'deploy', 'Deploy'
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    details = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name} - {self.timestamp}"
    
    @classmethod
    def log(cls, user, action, model_name='', object_id='', object_repr='', details=None, request=None):
        """Create an audit log entry"""
        ip_address = None
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
        
        return cls.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            object_repr=object_repr[:255] if object_repr else '',
            details=details,
            ip_address=ip_address
        )
