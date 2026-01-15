"""
Authentication Views
"""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated as DRFIsAuthenticated
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token

from .models import User, AuditLog
from .serializers import (
    UserSerializer, UserProfileSerializer, LoginSerializer,
    RegisterSerializer, ChangePasswordSerializer, AuditLogSerializer
)
from .permissions import IsAuthenticated, IsAdmin, CanManageUsers


class CSRFTokenView(APIView):
    """Get CSRF token for frontend"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class LoginView(APIView):
    """User login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            
            # Log the login
            AuditLog.log(user, AuditLog.Action.LOGIN, request=request)
            
            return Response({
                'message': 'Login successful',
                'user': UserProfileSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """User logout"""
    permission_classes = [DRFIsAuthenticated]
    
    def post(self, request):
        # Log the logout
        AuditLog.log(request.user, AuditLog.Action.LOGOUT, request=request)
        
        logout(request)
        return Response({'message': 'Logout successful'})


class RegisterView(APIView):
    """User registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Log the registration
            AuditLog.log(
                user, AuditLog.Action.CREATE,
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                details={'action': 'self_registration'},
                request=request
            )
            
            return Response({
                'message': 'Registration successful. Please wait for admin approval.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'is_approved': user.is_approved
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """Get/Update current user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change current user password"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            # Log password change
            AuditLog.log(
                request.user, AuditLog.Action.UPDATE,
                model_name='User',
                object_id=request.user.id,
                object_repr=str(request.user),
                details={'action': 'password_change'},
                request=request
            )
            
            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CheckAuthView(APIView):
    """Check if user is authenticated"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        if request.user.is_authenticated:
            if not request.user.is_approved and not request.user.is_superuser:
                return Response({
                    'authenticated': False,
                    'reason': 'pending_approval'
                })
            return Response({
                'authenticated': True,
                'user': UserProfileSerializer(request.user).data
            })
        return Response({'authenticated': False})


class AvailableClassesView(APIView):
    """Get available classes for student registration"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        from core.models import ClassGroup
        from core.serializers import ClassGroupSerializer
        
        classes = ClassGroup.objects.all().order_by('name')
        serializer = ClassGroupSerializer(classes, many=True)
        return Response(serializer.data)


# Admin Views for User Management

class UserListView(generics.ListCreateAPIView):
    """List all users or create new user (admin only)"""
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by approval status
        approved = self.request.query_params.get('approved')
        if approved is not None:
            queryset = queryset.filter(is_approved=approved.lower() == 'true')
        
        # Filter pending approval
        pending = self.request.query_params.get('pending')
        if pending and pending.lower() == 'true':
            queryset = queryset.filter(is_approved=False)
        
        return queryset
    
    def perform_create(self, serializer):
        user = serializer.save()
        AuditLog.log(
            self.request.user, AuditLog.Action.CREATE,
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            request=self.request
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a user (admin only)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]
    
    def perform_update(self, serializer):
        user = serializer.save()
        AuditLog.log(
            self.request.user, AuditLog.Action.UPDATE,
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            request=self.request
        )
    
    def perform_destroy(self, instance):
        AuditLog.log(
            self.request.user, AuditLog.Action.DELETE,
            model_name='User',
            object_id=instance.id,
            object_repr=str(instance),
            request=self.request
        )
        instance.delete()


class ApproveUserView(APIView):
    """Approve or reject a user (admin only)"""
    permission_classes = [CanManageUsers]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        approve = request.data.get('approve', True)
        user.is_approved = approve
        user.save()
        
        AuditLog.log(
            request.user, AuditLog.Action.UPDATE,
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            details={'action': 'approve' if approve else 'reject'},
            request=request
        )
        
        return Response({
            'message': f'User {"approved" if approve else "rejected"} successfully',
            'user': UserSerializer(user).data
        })


class PendingUsersView(generics.ListAPIView):
    """List users pending approval (admin only)"""
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]
    
    def get_queryset(self):
        return User.objects.filter(is_approved=False, is_superuser=False)


class AuditLogListView(generics.ListAPIView):
    """List audit logs (admin only)"""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by model
        model = self.request.query_params.get('model')
        if model:
            queryset = queryset.filter(model_name__icontains=model)
        
        # Limit results
        limit = self.request.query_params.get('limit', 100)
        try:
            limit = int(limit)
        except ValueError:
            limit = 100
        
        return queryset[:limit]
