from django.contrib import admin
from .models import Assessment


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'timestamp', 'final_score', 'device_id', 'model_version']
    list_filter = ['timestamp', 'device_id', 'model_version']
    search_fields = ['student__student_id', 'student__name', 'device_id']
    readonly_fields = ['timestamp']
    
    fieldsets = (
        ('Student & Score', {
            'fields': ('student', 'final_score', 'timestamp')
        }),
        ('Images', {
            'fields': ('image_original', 'image_heatmap')
        }),
        ('Metrics', {
            'fields': ('metrics_json',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('device_id', 'model_version', 'notes')
        }),
    )
