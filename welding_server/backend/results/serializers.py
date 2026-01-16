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
    pointcloud_ply_url = serializers.SerializerMethodField()
    has_3d_data = serializers.SerializerMethodField()

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
            'pointcloud_ply',
            'pointcloud_ply_url',
            'mesh_preview_json',
            'has_3d_data',
            'evaluation_id',
        ]
        read_only_fields = ['timestamp']

    def get_evaluation_id(self, obj):
        eval = obj.evaluations.first()
        return eval.id if eval else None

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

    def get_pointcloud_ply_url(self, obj):
        if obj.pointcloud_ply:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pointcloud_ply.url)
        return None

    def get_has_3d_data(self, obj):
        return bool(obj.mesh_preview_json) or bool(obj.pointcloud_ply)


class AssessmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    has_3d_data = serializers.SerializerMethodField()
    image_heatmap_url = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id',
            'student_id',
            'student_name',
            'timestamp',
            'final_score',
            'device_id',
            'has_3d_data',
            'image_heatmap_url',
            'evaluation_id',
        ]

    def get_evaluation_id(self, obj):
        eval = obj.evaluations.first()
        return eval.id if eval else None

    def get_has_3d_data(self, obj):
        return bool(obj.mesh_preview_json) or bool(obj.pointcloud_ply)

    def get_image_heatmap_url(self, obj):
        if obj.image_heatmap:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_heatmap.url)
        return None


class AssessmentUploadSerializer(serializers.Serializer):
    """
    Serializer for RDK X5 upload endpoint
    Expects multipart/form-data with images and JSON metrics
    """
    student_id = serializers.CharField(required=True)
    image_original = serializers.ImageField(required=False, allow_null=True)
    image_heatmap = serializers.ImageField(required=False, allow_null=True)
    pointcloud_ply = serializers.FileField(required=False, allow_null=True)
    mesh_preview_json = serializers.JSONField(required=False, allow_null=True)
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
