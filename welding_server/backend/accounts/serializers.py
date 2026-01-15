"""
Serializers for User Authentication and Management
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, AuditLog


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    password = serializers.CharField(write_only=True, required=False)
    student_name = serializers.SerializerMethodField()
    assigned_class_names = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_approved', 'is_active', 'date_joined',
            'student_profile', 'student_name', 'assigned_classes', 
            'assigned_class_names', 'password'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_student_name(self, obj):
        if obj.student_profile:
            return obj.student_profile.name
        return None
    
    def get_assigned_class_names(self, obj):
        return list(obj.assigned_classes.values_list('name', flat=True))
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        assigned_classes = validated_data.pop('assigned_classes', [])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if assigned_classes:
            user.assigned_classes.set(assigned_classes)
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        assigned_classes = validated_data.pop('assigned_classes', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        
        if assigned_classes is not None:
            instance.assigned_classes.set(assigned_classes)
        
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user's own profile (limited fields)"""
    student_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_approved', 'date_joined', 'student_profile',
            'student_name', 'permissions'
        ]
        read_only_fields = ['id', 'username', 'role', 'is_approved', 'date_joined']
    
    def get_student_name(self, obj):
        if obj.student_profile:
            return obj.student_profile.name
        return None
    
    def get_permissions(self, obj):
        return {
            'can_access_mlops': obj.can_access_mlops(),
            'can_manage_users': obj.can_manage_users(),
            'can_view_all_students': obj.can_view_all_students(),
            'can_create_evaluation': obj.can_create_evaluation(),
            'is_admin': obj.is_admin,
            'is_instructor': obj.is_instructor,
            'is_student': obj.is_student_role,
        }


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("Account is disabled.")
                if not user.is_approved and not user.is_superuser:
                    raise serializers.ValidationError("Account pending approval. Please wait for admin approval.")
                data['user'] = user
            else:
                raise serializers.ValidationError("Invalid username or password.")
        else:
            raise serializers.ValidationError("Must provide username and password.")
        
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    full_name = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 
                  'full_name', 'role', 'class_id']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        # Validate full_name
        if not data.get('full_name', '').strip():
            raise serializers.ValidationError({"full_name": "Full name is required."})
        
        # Students and instructors need approval, admins can only be created by other admins
        if data.get('role') == User.Role.ADMIN:
            raise serializers.ValidationError({"role": "Cannot register as admin. Contact system administrator."})
        
        # Students must select a class
        if data.get('role') == User.Role.STUDENT and not data.get('class_id'):
            raise serializers.ValidationError({"class_id": "Students must select a class."})
        
        # Validate class exists if provided
        if data.get('class_id'):
            from core.models import ClassGroup
            try:
                ClassGroup.objects.get(id=data['class_id'])
            except ClassGroup.DoesNotExist:
                raise serializers.ValidationError({"class_id": "Invalid class selected."})
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        class_id = validated_data.pop('class_id', None)
        full_name = validated_data.pop('full_name', '').strip()
        
        # Parse full_name into first_name and last_name
        name_parts = full_name.split(' ', 1)
        validated_data['first_name'] = name_parts[0]
        validated_data['last_name'] = name_parts[1] if len(name_parts) > 1 else ''
        
        user = User(**validated_data)
        user.set_password(password)
        user.is_approved = False  # Requires admin approval
        user.save()
        
        # Create student profile if student role and class selected
        if user.role == User.Role.STUDENT and class_id:
            from core.models import Student, ClassGroup
            class_group = ClassGroup.objects.get(id=class_id)
            student = Student.objects.create(
                student_id=user.username,  # Use username (reg number) as student_id
                name=full_name,
                class_group=class_group,
                email=user.email
            )
            user.student_profile = student
            user.save()
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return data
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    username = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'action', 'action_display',
                  'model_name', 'object_id', 'object_repr', 'details',
                  'ip_address', 'timestamp']
        read_only_fields = fields
