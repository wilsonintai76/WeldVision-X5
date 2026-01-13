from django.contrib import admin
from .models import Student, ClassGroup


@admin.register(ClassGroup)
class ClassGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_id', 'name', 'class_group', 'email', 'created_at']
    search_fields = ['student_id', 'name', 'email']
    list_filter = ['class_group', 'created_at']
