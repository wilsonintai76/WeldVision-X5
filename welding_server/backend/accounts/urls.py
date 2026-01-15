"""
URL Configuration for Accounts/Authentication
"""
from django.urls import path
from .views import (
    CSRFTokenView,
    LoginView,
    LogoutView,
    RegisterView,
    ProfileView,
    ChangePasswordView,
    CheckAuthView,
    UserListView,
    UserDetailView,
    ApproveUserView,
    PendingUsersView,
    AuditLogListView,
)

urlpatterns = [
    # Authentication
    path('auth/csrf/', CSRFTokenView.as_view(), name='csrf_token'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/check/', CheckAuthView.as_view(), name='check_auth'),
    
    # Profile
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # User Management (Admin)
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('users/<int:pk>/approve/', ApproveUserView.as_view(), name='approve_user'),
    path('users/pending/', PendingUsersView.as_view(), name='pending_users'),
    
    # Audit Log (Admin)
    path('audit-logs/', AuditLogListView.as_view(), name='audit_logs'),
]
