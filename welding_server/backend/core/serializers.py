"""
Core Serializers
"""
from rest_framework import serializers
from .models import Student, ClassGroup, StereoCalibration, DefectClass, Session, Course


class StereoCalibrationSerializer(serializers.ModelSerializer):
    """Serializer for StereoCalibration model"""
    
    class Meta:
        model = StereoCalibration
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        # Ensure image dimensions are reasonable
        if data.get('image_width') and data.get('image_height'):
            width = data['image_width']
            height = data['image_height']
            if width * height > 4096 * 2160:
                raise serializers.ValidationError(
                    "Image resolution too high (max 4K)"
                )
        return data


class SessionSerializer(serializers.ModelSerializer):
    """Serializer for Session model"""
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'course_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_course_count(self, obj):
        return obj.courses.count()


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model"""
    session_name = serializers.CharField(source='session.name', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'section', 'session', 'session_name', 
                  'instructor', 'instructor_name', 'description', 'student_count',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_instructor_name(self, obj):
        if obj.instructor:
            return obj.instructor.first_name or obj.instructor.username
        return None

    def get_student_count(self, obj):
        return obj.enrolled_students.count()


class CourseListSerializer(serializers.ModelSerializer):
    """Simplified serializer for course list views"""
    session_name = serializers.CharField(source='session.name', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'section', 'session', 'session_name', 'instructor_name', 'student_count']

    def get_instructor_name(self, obj):
        if obj.instructor:
            return obj.instructor.first_name or obj.instructor.username
        return None

    def get_student_count(self, obj):
        return obj.enrolled_students.count()


class ClassGroupSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassGroup
        fields = ['id', 'name', 'description', 'student_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.students.count()


class StudentSerializer(serializers.ModelSerializer):
    class_group_name = serializers.CharField(source='class_group.name', read_only=True)
    enrolled_course_names = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'class_group', 'class_group_name', 
                  'enrolled_courses', 'enrolled_course_names',
                  'email', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_enrolled_course_names(self, obj):
        return [f"{c.code} - {c.name}" for c in obj.enrolled_courses.all()]


class StudentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    class_group_name = serializers.CharField(source='class_group.name', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'class_group_name']


class DefectClassSerializer(serializers.ModelSerializer):
    """Serializer for DefectClass model"""
    
    class Meta:
        model = DefectClass
        fields = ['id', 'name', 'display_name', 'color', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
