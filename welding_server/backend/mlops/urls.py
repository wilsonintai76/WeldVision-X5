"""
MLOps URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIModelViewSet,
    DeploymentLogViewSet,
    MLJobViewSet,
    deploy_model,
    reboot_device,
    device_status,
    convert_model,
    register_job_artifact,
    upload_pretrained_model,
    list_convertible_models,
)

router = DefaultRouter()
router.register(r'models', AIModelViewSet)
router.register(r'deployment-logs', DeploymentLogViewSet)
router.register(r'jobs', MLJobViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('deploy-model/', deploy_model, name='deploy-model'),
    path('reboot-device/', reboot_device, name='reboot-device'),
    path('device-status/', device_status, name='device-status'),
    path('convert-model/', convert_model, name='convert-model'),
    path('register-artifact/', register_job_artifact, name='register-artifact'),
    path('upload-model/', upload_pretrained_model, name='upload-model'),
    path('convertible-models/', list_convertible_models, name='convertible-models'),
]
