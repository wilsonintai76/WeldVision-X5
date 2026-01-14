from django.contrib import admin
from .models import Student, ClassGroup, DefectClass, Dataset, LabeledImage, Annotation


@admin.register(ClassGroup)
class ClassGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_id', 'name', 'class_group', 'email', 'created_at']
    search_fields = ['student_id', 'name', 'email']
    list_filter = ['class_group', 'created_at']


@admin.register(DefectClass)
class DefectClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name', 'color', 'created_at']
    search_fields = ['name', 'display_name']
    list_filter = ['created_at']


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'created_at']
    search_fields = ['name', 'created_by']
    list_filter = ['created_at']
    filter_horizontal = ['classes']


@admin.register(LabeledImage)
class LabeledImageAdmin(admin.ModelAdmin):
    list_display = ['filename', 'dataset', 'is_labeled', 'labeled_by', 'uploaded_at']
    search_fields = ['filename', 'labeled_by']
    list_filter = ['dataset', 'is_labeled', 'uploaded_at']


@admin.register(Annotation)
class AnnotationAdmin(admin.ModelAdmin):
    list_display = ['image', 'class_name', 'created_at']
    search_fields = ['class_name']
    list_filter = ['class_name', 'created_at']
