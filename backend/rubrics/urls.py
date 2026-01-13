"""
Rubrics URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RubricViewSet

router = DefaultRouter()
router.register(r'rubrics', RubricViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
