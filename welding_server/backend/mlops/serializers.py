"""
MLOps Serializers
"""
from rest_framework import serializers
from .models import AIModel, DeploymentLog, MLJob


class AIModelSerializer(serializers.ModelSerializer):
    model_file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = AIModel
        fields = [
            'id',
            'name',
            'version',
            'description',
            'model_file',
            'model_file_url',
            'status',
            'is_deployed',
            'accuracy',
            'precision',
            'recall',
            'f1_score',
            'deployed_at',
            'deployed_to_device',
            'file_size_mb',
            'file_size_display',
            'training_date',
            'training_dataset',
            'framework_version',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'file_size_mb']

    def get_model_file_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
        return None

    def get_file_size_display(self, obj):
        if obj.file_size_mb:
            return f"{obj.file_size_mb:.2f} MB"
        return "N/A"


class AIModelUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading pre-trained models"""
    class Meta:
        model = AIModel
        fields = [
            'name',
            'version',
            'description',
            'model_file',
        ]
    
    def validate_version(self, value):
        if AIModel.objects.filter(version=value).exists():
            raise serializers.ValidationError(f"Version '{value}' already exists. Please use a unique version.")
        return value
    
    def validate_model_file(self, value):
        # Check file extension
        allowed_extensions = ['pt', 'onnx', 'bin']
        ext = value.name.split('.')[-1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Invalid file type: .{ext}. Allowed: {', '.join(allowed_extensions)}"
            )
        return value


class AIModelListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    class Meta:
        model = AIModel
        fields = [
            'id',
            'name',
            'version',
            'status',
            'is_deployed',
            'accuracy',
            'file_size_mb',
            'created_at',
        ]


class DeploymentLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model.name', read_only=True)
    model_version = serializers.CharField(source='model.version', read_only=True)
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = DeploymentLog
        fields = [
            'id',
            'model',
            'model_name',
            'model_version',
            'device_ip',
            'device_id',
            'status',
            'started_at',
            'completed_at',
            'duration_seconds',
            'log_output',
            'error_message',
            'username',
            'transfer_method',
        ]
        read_only_fields = ['started_at']

    def get_duration_seconds(self, obj):
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            return delta.total_seconds()
        return None


class MLJobSerializer(serializers.ModelSerializer):
    output_model_version = serializers.CharField(source='output_model.version', read_only=True)

    class Meta:
        model = MLJob
        fields = [
            'id',
            'job_type',
            'status',
            'params',
            'command',
            'artifact_path',
            'output_model',
            'output_model_version',
            'stdout_path',
            'stderr_path',
            'error_message',
            'created_at',
            'started_at',
            'completed_at',
        ]
        read_only_fields = [
            'status',
            'command',
            'artifact_path',
            'output_model',
            'stdout_path',
            'stderr_path',
            'error_message',
            'created_at',
            'started_at',
            'completed_at',
        ]
