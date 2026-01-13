"""
Core URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet, ClassGroupViewSet, StereoCalibrationViewSet,
    DatasetViewSet, LabeledImageViewSet, AnnotationViewSet
)

router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'classes', ClassGroupViewSet)
router.register(r'stereo-calibrations', StereoCalibrationViewSet)
router.register(r'datasets', DatasetViewSet)
router.register(r'labeled-images', LabeledImageViewSet)
router.register(r'annotations', AnnotationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
