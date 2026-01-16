"""
Results URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentViewSet,
    upload_assessment,
    student_assessments,
    download_pointcloud,
    assessment_mesh_preview
)

router = DefaultRouter()
router.register(r'assessments', AssessmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('upload-assessment/', upload_assessment, name='upload-assessment'),
    path('students/<str:student_id>/assessments/', student_assessments, name='student-assessments'),
    path('assessments/<int:pk>/download-ply/', download_pointcloud, name='download-pointcloud'),
    path('assessments/<int:pk>/mesh-preview/', assessment_mesh_preview, name='mesh-preview'),
]

