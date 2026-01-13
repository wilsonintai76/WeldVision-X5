"""
Results Serializers
"""
from rest_framework import serializers
from .models import Assessment
from core.serializers import StudentListSerializer


class AssessmentSerializer(serializers.ModelSerializer):
    student_info = StudentListSerializer(source='student', read_only=True)
    image_original_url = serializers.SerializerMethodField()
    image_heatmap_url = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id',
            'student',
            'student_info',
            'timestamp',
            'final_score',
            'image_original',
            'image_original_url',
            'image_heatmap',
            'image_heatmap_url',
            'metrics_json',
            'notes',
            'device_id',
            'model_version',
        ]
        read_only_fields = ['timestamp']

    def get_image_original_url(self, obj):
        if obj.image_original:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_original.url)
        return None

    def get_image_heatmap_url(self, obj):
        if obj.image_heatmap:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_heatmap.url)
        return None


class AssessmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = Assessment
        fields = [
            'id',
            'student_id',
            'student_name',
            'timestamp',
            'final_score',
            'device_id',
        ]


class AssessmentUploadSerializer(serializers.Serializer):
    """
    Serializer for RDK X5 upload endpoint
    Expects multipart/form-data with images and JSON metrics
    """
    student_id = serializers.CharField(required=True)
    image_original = serializers.ImageField(required=False, allow_null=True)
    image_heatmap = serializers.ImageField(required=False, allow_null=True)
    metrics_json = serializers.JSONField(required=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    model_version = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_student_id(self, value):
        """Ensure student exists"""
        from core.models import Student
        try:
            Student.objects.get(student_id=value)
        except Student.DoesNotExist:
            raise serializers.ValidationError(f"Student with ID '{value}' not found")
        return value

    def validate_metrics_json(self, value):
        """Validate metrics JSON structure"""
        required_keys = ['geometric', 'visual']
        for key in required_keys:
            if key not in value:
                raise serializers.ValidationError(f"Missing required key: {key}")
        return value
