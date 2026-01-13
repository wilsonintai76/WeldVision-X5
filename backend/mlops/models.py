"""
MLOps Models: AI Model versioning and deployment tracking
"""
from django.db import models
from django.core.validators import FileExtensionValidator


class AIModel(models.Model):
    """
    AI Model tracking for YOLOv8 binary files
    
    Tracks model versions, deployment status, and performance metrics
    """
    
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('deployed', 'Deployed'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
    ]
    
    name = models.CharField(max_length=200)
    version = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    
    # Model file
    model_file = models.FileField(
        upload_to='models/%Y/%m/',
        validators=[FileExtensionValidator(allowed_extensions=['bin', 'pt', 'onnx'])],
        help_text="YOLOv8 model file (.bin, .pt, or .onnx)"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='uploaded'
    )
    is_deployed = models.BooleanField(
        default=False,
        help_text="Is this model currently deployed on RDK X5?"
    )
    
    # Performance Metrics
    accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="Model accuracy percentage"
    )
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    
    # Deployment Info
    deployed_at = models.DateTimeField(null=True, blank=True)
    deployed_to_device = models.CharField(
        max_length=100,
        blank=True,
        help_text="RDK X5 device ID where deployed"
    )
    
    # Metadata
    file_size_mb = models.FloatField(null=True, blank=True)
    training_date = models.DateField(null=True, blank=True)
    training_dataset = models.CharField(max_length=200, blank=True)
    framework_version = models.CharField(
        max_length=50,
        blank=True,
        help_text="YOLOv8/PyTorch version"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status', 'is_deployed']),
        ]

    def __str__(self):
        return f"{self.name} - {self.version} ({self.status})"

    def save(self, *args, **kwargs):
        """Calculate file size and ensure only one deployed model"""
        # Calculate file size
        if self.model_file and not self.file_size_mb:
            self.file_size_mb = round(self.model_file.size / (1024 * 1024), 2)
        
        # Ensure only one model is deployed
        if self.is_deployed:
            AIModel.objects.filter(is_deployed=True).exclude(pk=self.pk).update(
                is_deployed=False,
                status='inactive'
            )
            self.status = 'deployed'
            
        super().save(*args, **kwargs)


class DeploymentLog(models.Model):
    """
    Log of model deployment attempts
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    
    model = models.ForeignKey(
        AIModel,
        on_delete=models.CASCADE,
        related_name='deployment_logs'
    )
    
    device_ip = models.GenericIPAddressField()
    device_id = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Logs
    log_output = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    # Connection info
    username = models.CharField(max_length=100)
    transfer_method = models.CharField(
        max_length=20,
        default='scp',
        help_text="Transfer method (scp, sftp, etc.)"
    )
    
    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.model.version} -> {self.device_ip} ({self.status})"


class MLJob(models.Model):
    class Type(models.TextChoices):
        TRAIN = 'train', 'Train'
        EXPORT = 'export', 'Export/Convert'

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        RUNNING = 'running', 'Running'
        SUCCEEDED = 'succeeded', 'Succeeded'
        FAILED = 'failed', 'Failed'

    job_type = models.CharField(max_length=20, choices=Type.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)

    params = models.JSONField(default=dict, blank=True)
    command = models.JSONField(default=list, blank=True)

    artifact_path = models.TextField(blank=True)
    output_model = models.ForeignKey(
        AIModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='generated_by_jobs',
    )

    stdout_path = models.TextField(blank=True)
    stderr_path = models.TextField(blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job_type', 'status', '-created_at']),
        ]

    def __str__(self):
        return f"{self.job_type} ({self.status}) #{self.id}"
