"""
Rubrics URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RubricViewSet, AssessmentRubricViewSet, 
    RubricCriterionViewSet, StudentEvaluationViewSet
)

router = DefaultRouter()
router.register(r'rubrics', RubricViewSet)
router.register(r'assessment-rubrics', AssessmentRubricViewSet)
router.register(r'rubric-criteria', RubricCriterionViewSet)
router.register(r'student-evaluations', StudentEvaluationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
