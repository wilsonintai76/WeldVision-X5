"""
Core URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet, ClassGroupViewSet, StereoCalibrationViewSet,
    DefectClassViewSet, DatasetViewSet, LabeledImageViewSet, AnnotationViewSet,
    SessionViewSet, CourseViewSet
)

router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'classes', ClassGroupViewSet)
router.register(r'stereo-calibrations', StereoCalibrationViewSet)
router.register(r'defect-classes', DefectClassViewSet)
router.register(r'datasets', DatasetViewSet)
router.register(r'labeled-images', LabeledImageViewSet)
router.register(r'annotations', AnnotationViewSet)
router.register(r'sessions', SessionViewSet)
router.register(r'courses', CourseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
