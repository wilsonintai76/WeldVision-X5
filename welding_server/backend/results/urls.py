"""
Results URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, upload_assessment, student_assessments

router = DefaultRouter()
router.register(r'assessments', AssessmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('upload-assessment/', upload_assessment, name='upload-assessment'),
    path('students/<str:student_id>/assessments/', student_assessments, name='student-assessments'),
]
