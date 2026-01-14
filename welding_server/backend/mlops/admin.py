from django.contrib import admin
from .models import AIModel, DeploymentLog


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'version',
        'status',
        'is_deployed',
        'accuracy',
        'file_size_mb',
        'created_at'
    ]
    list_filter = ['status', 'is_deployed', 'created_at']
    search_fields = ['name', 'version', 'description']
    readonly_fields = ['file_size_mb', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Model Information', {
            'fields': ('name', 'version', 'description', 'model_file')
        }),
        ('Status', {
            'fields': ('status', 'is_deployed', 'deployed_at', 'deployed_to_device')
        }),
        ('Performance Metrics', {
            'fields': ('accuracy', 'precision', 'recall', 'f1_score')
        }),
        ('Training Metadata', {
            'fields': ('training_date', 'training_dataset', 'framework_version')
        }),
        ('File Info', {
            'fields': ('file_size_mb', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DeploymentLog)
class DeploymentLogAdmin(admin.ModelAdmin):
    list_display = [
        'model',
        'device_ip',
        'status',
        'started_at',
        'completed_at'
    ]
    list_filter = ['status', 'started_at']
    search_fields = ['device_ip', 'device_id', 'model__version']
    readonly_fields = ['started_at', 'completed_at']
    
    fieldsets = (
        ('Deployment Info', {
            'fields': ('model', 'device_ip', 'device_id', 'status')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at')
        }),
        ('Connection', {
            'fields': ('username', 'transfer_method')
        }),
        ('Logs', {
            'fields': ('log_output', 'error_message'),
            'classes': ('collapse',)
        }),
    )
