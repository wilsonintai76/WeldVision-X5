"""
MLOps Views - Model management and deployment endpoints
"""
import os
from pathlib import Path

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.core.files import File

from .models import AIModel, DeploymentLog, MLJob
from .serializers import (
    AIModelSerializer,
    AIModelListSerializer,
    AIModelUploadSerializer,
    DeploymentLogSerializer,
    MLJobSerializer,
)
from .utils import (
    deploy_to_rdk,
    reboot_rdk,
    check_rdk_status,
    RDKDeploymentError
)
from .job_runner import start_subprocess_job
from .system_check import check_system_resources, get_training_recommendation
import logging

logger = logging.getLogger(__name__)


def _safe_version(base: str) -> str:
    base = (base or '').strip() or timezone.now().strftime('%Y%m%d-%H%M%S')
    base = ''.join(ch for ch in base if ch.isalnum() or ch in ('-', '_', '.'))
    if not base:
        base = timezone.now().strftime('%Y%m%d-%H%M%S')
    candidate = base
    i = 2
    while AIModel.objects.filter(version=candidate).exists():
        candidate = f"{base}-{i}"
        i += 1
    return candidate


def _jobs_root() -> Path:
    return Path(settings.MEDIA_ROOT) / 'mlops_jobs'


def _job_dir(job_id: int) -> Path:
    return _jobs_root() / str(job_id)


def _register_artifact_as_model(*, artifact_path: Path, name: str, version: str, description: str = '') -> AIModel:
    version = _safe_version(version)

    # Save into MEDIA_ROOT via FileField storage
    # upload_to in AIModel is 'models/%Y/%m/' so just use File(...) and let storage handle it
    model = AIModel.objects.create(
        name=name,
        version=version,
        description=description,
        status='uploaded',
    )
    with open(artifact_path, 'rb') as f:
        model.model_file.save(artifact_path.name, File(f), save=True)
    return model


class AIModelViewSet(viewsets.ModelViewSet):
    """ViewSet for AI Model CRUD operations"""
    queryset = AIModel.objects.all()
    serializer_class = AIModelSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return AIModelListSerializer
        return AIModelSerializer

    @action(detail=True, methods=['post'])
    def deploy(self, request, pk=None):
        """
        Deploy model to RDK X5 device
        
        POST /api/models/{id}/deploy/
        
        Body (optional):
        {
            "ip": "192.168.1.100",
            "username": "sunrise",
            "password": "sunrise"
        }
        """
        model = self.get_object()
        
        # Get connection details from request or use defaults
        ip = request.data.get('ip', settings.RDK_DEFAULT_IP)
        username = request.data.get('username', settings.RDK_DEFAULT_USERNAME)
        password = request.data.get('password', settings.RDK_DEFAULT_PASSWORD)
        device_id = request.data.get('device_id', f'RDK-{ip}')
        
        # Create deployment log
        deployment_log = DeploymentLog.objects.create(
            model=model,
            device_ip=ip,
            device_id=device_id,
            username=username,
            status='in_progress'
        )
        
        try:
            # Get local file path
            local_file_path = model.model_file.path
            
            # Deploy to RDK
            result = deploy_to_rdk(ip, username, password, local_file_path)
            
            # Update deployment log
            deployment_log.status = 'success'
            deployment_log.completed_at = timezone.now()
            deployment_log.log_output = str(result)
            deployment_log.save()
            
            # Update model status
            model.is_deployed = True
            model.deployed_at = timezone.now()
            model.deployed_to_device = device_id
            model.save()
            
            return Response({
                'status': 'success',
                'message': f'Model {model.version} deployed successfully',
                'deployment_log_id': deployment_log.id,
                'result': result
            })
            
        except RDKDeploymentError as e:
            # Update deployment log with error
            deployment_log.status = 'failed'
            deployment_log.completed_at = timezone.now()
            deployment_log.error_message = str(e)
            deployment_log.save()
            
            logger.error(f"Deployment failed: {str(e)}")
            
            return Response({
                'status': 'error',
                'message': 'Deployment failed',
                'error': str(e),
                'deployment_log_id': deployment_log.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def deployed(self, request):
        """Get currently deployed model"""
        model = AIModel.objects.filter(is_deployed=True).first()
        if model:
            serializer = self.get_serializer(model)
            return Response(serializer.data)
        return Response({'detail': 'No model currently deployed'}, status=404)


class DeploymentLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing deployment logs"""
    queryset = DeploymentLog.objects.all()
    serializer_class = DeploymentLogSerializer


class MLJobViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing async MLOps jobs (train/export)."""
    queryset = MLJob.objects.all()
    serializer_class = MLJobSerializer

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        job = self.get_object()
        stdout = ''
        stderr = ''

        try:
            if job.stdout_path and os.path.exists(job.stdout_path):
                stdout = Path(job.stdout_path).read_text(encoding='utf-8', errors='replace')[-20000:]
            if job.stderr_path and os.path.exists(job.stderr_path):
                stderr = Path(job.stderr_path).read_text(encoding='utf-8', errors='replace')[-20000:]
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)

        return Response({'stdout': stdout, 'stderr': stderr})


@api_view(['POST'])
def train_model(request):
    """Start a YOLO training job on the server/PC.

    POST /api/train-model/

    Body:
    {
      "name": "weld-yolo",
      "version": "1.0.0",          // optional
      "data_yaml": "D:/datasets/weld/data.yaml",
      "base_model": "yolov8n.pt",  // optional
      "epochs": 50,                 // optional
      "imgsz": 640                  // optional
    }
    """
    name = request.data.get('name', 'weldvision-yolo')
    version = request.data.get('version', '')
    data_yaml = request.data.get('data_yaml')
    base_model = request.data.get('base_model', 'yolov8n.pt')
    epochs = int(request.data.get('epochs', 50))
    imgsz = int(request.data.get('imgsz', 640))

    if not data_yaml:
        return Response({'error': 'data_yaml is required'}, status=400)

    job = MLJob.objects.create(
        job_type=MLJob.Type.TRAIN,
        status=MLJob.Status.QUEUED,
        params={
            'name': name,
            'version': version,
            'data_yaml': data_yaml,
            'base_model': base_model,
            'epochs': epochs,
            'imgsz': imgsz,
        },
    )

    job_dir = _job_dir(job.id)
    job_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = job_dir / 'best.pt'
    job.artifact_path = str(artifact_path)
    job.save(update_fields=['artifact_path'])

    script = Path(__file__).resolve().parent / 'scripts' / 'train_yolo.py'
    command = [
        'python',
        str(script),
        '--model',
        str(base_model),
        '--data',
        str(data_yaml),
        '--epochs',
        str(epochs),
        '--imgsz',
        str(imgsz),
        '--project',
        str(job_dir / 'runs'),
        '--name',
        'train',
        '--out',
        str(artifact_path),
    ]

    start_subprocess_job(job=job, command=command, cwd=str(job_dir))
    return Response(MLJobSerializer(job).data, status=202)


@api_view(['POST'])
def convert_model(request):
    """Export/convert a model on the server/PC.

    POST /api/convert-model/

    Body:
    {
      "source_job_id": 123,          // optional - uses training job's best.pt
      "model_id": 456,               // optional - uses uploaded model file
      "weights_path": ".../best.pt", // optional - manual path
      "format": "onnx",              // optional (default: onnx)
      "imgsz": 640,                  // optional
      "name": "weld-yolo",
      "version": "1.0.0-onnx"        // optional
    }
    
    Priority: model_id > source_job_id > weights_path
    """
    source_job_id = request.data.get('source_job_id')
    model_id = request.data.get('model_id')
    weights_path = request.data.get('weights_path')
    export_format = request.data.get('format', 'onnx')
    imgsz = int(request.data.get('imgsz', 640))
    name = request.data.get('name', 'weldvision-yolo')
    version = request.data.get('version', '')

    # Priority 1: Use uploaded model
    if model_id and not weights_path:
        try:
            model = AIModel.objects.get(id=model_id)
            weights_path = model.model_file.path
            if not name or name == 'weldvision-yolo':
                name = model.name
        except AIModel.DoesNotExist:
            return Response({'error': f'model_id {model_id} not found'}, status=404)
    
    # Priority 2: Use training job artifact
    elif source_job_id and not weights_path:
        try:
            src_job = MLJob.objects.get(id=source_job_id)
        except MLJob.DoesNotExist:
            return Response({'error': f'source_job_id {source_job_id} not found'}, status=404)
        weights_path = src_job.artifact_path

    if not weights_path:
        return Response({'error': 'weights_path, model_id, or source_job_id is required'}, status=400)

    job = MLJob.objects.create(
        job_type=MLJob.Type.EXPORT,
        status=MLJob.Status.QUEUED,
        params={
            'source_job_id': source_job_id,
            'weights_path': weights_path,
            'format': export_format,
            'imgsz': imgsz,
            'name': name,
            'version': version,
        },
    )

    job_dir = _job_dir(job.id)
    job_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = job_dir / f'model.{export_format}'
    job.artifact_path = str(artifact_path)
    job.save(update_fields=['artifact_path'])

    if export_format == 'bin':
        # BIN requires Horizon toolchain; we call a configured external command.
        # Input can be a .pt (will export to ONNX first) or an .onnx (compile directly).
        script = Path(__file__).resolve().parent / 'scripts' / 'convert_to_bin.py'
        onnx_path = job_dir / 'model.onnx'
        command = [
            'python',
            str(script),
            '--input',
            str(weights_path),
            '--imgsz',
            str(imgsz),
            '--onnx',
            str(onnx_path),
            '--out-bin',
            str(artifact_path),
        ]
    else:
        script = Path(__file__).resolve().parent / 'scripts' / 'export_yolo.py'
        command = [
            'python',
            str(script),
            '--weights',
            str(weights_path),
            '--format',
            str(export_format),
            '--imgsz',
            str(imgsz),
            '--out',
            str(artifact_path),
        ]

    start_subprocess_job(job=job, command=command, cwd=str(job_dir))
    return Response(MLJobSerializer(job).data, status=202)


@api_view(['POST'])
def register_job_artifact(request):
    """Register a succeeded job artifact as an AIModel entry.

    POST /api/register-artifact/
    Body:
    {
      "job_id": 123,
      "name": "weld-yolo",
      "version": "1.0.0-onnx",
      "description": "Exported ONNX"
    }
    """
    job_id = request.data.get('job_id')
    if not job_id:
        return Response({'error': 'job_id is required'}, status=400)

    try:
        job = MLJob.objects.get(id=job_id)
    except MLJob.DoesNotExist:
        return Response({'error': f'job {job_id} not found'}, status=404)

    if job.status != MLJob.Status.SUCCEEDED:
        return Response({'error': f'job status must be succeeded (current: {job.status})'}, status=400)

    artifact_path = Path(job.artifact_path)
    if not artifact_path.exists():
        return Response({'error': f'artifact not found at {job.artifact_path}'}, status=400)

    name = request.data.get('name', 'weldvision-yolo')
    version = request.data.get('version', '')
    description = request.data.get('description', '')

    model = _register_artifact_as_model(artifact_path=artifact_path, name=name, version=version, description=description)
    job.output_model = model
    job.save(update_fields=['output_model'])

    return Response(AIModelSerializer(model, context={'request': request}).data)


@api_view(['POST'])
def deploy_model(request):
    """
    Deploy specific model to RDK X5
    
    POST /api/deploy-model/
    
    Body:
    {
        "model_id": 1,
        "ip": "192.168.1.100",  // optional
        "username": "sunrise",   // optional
        "password": "sunrise",   // optional
        "device_id": "RDK-X5-01" // optional
    }
    """
    model_id = request.data.get('model_id')
    
    if not model_id:
        return Response(
            {'error': 'model_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        model = AIModel.objects.get(id=model_id)
    except AIModel.DoesNotExist:
        return Response(
            {'error': f'Model with ID {model_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get connection details
    ip = request.data.get('ip', settings.RDK_DEFAULT_IP)
    username = request.data.get('username', settings.RDK_DEFAULT_USERNAME)
    password = request.data.get('password', settings.RDK_DEFAULT_PASSWORD)
    device_id = request.data.get('device_id', f'RDK-{ip}')
    
    # Create deployment log
    deployment_log = DeploymentLog.objects.create(
        model=model,
        device_ip=ip,
        device_id=device_id,
        username=username,
        status='in_progress'
    )
    
    try:
        # Deploy
        local_file_path = model.model_file.path
        result = deploy_to_rdk(ip, username, password, local_file_path)
        
        # Update log
        deployment_log.status = 'success'
        deployment_log.completed_at = timezone.now()
        deployment_log.log_output = str(result)
        deployment_log.save()
        
        # Update model
        model.is_deployed = True
        model.deployed_at = timezone.now()
        model.deployed_to_device = device_id
        model.save()
        
        return Response({
            'status': 'success',
            'message': f'Model {model.version} deployed to {ip}',
            'deployment_log_id': deployment_log.id,
            'result': result
        })
        
    except RDKDeploymentError as e:
        deployment_log.status = 'failed'
        deployment_log.completed_at = timezone.now()
        deployment_log.error_message = str(e)
        deployment_log.save()
        
        return Response({
            'status': 'error',
            'message': 'Deployment failed',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reboot_device(request):
    """
    Reboot RDK X5 device
    
    POST /api/reboot-device/
    
    Body (optional):
    {
        "ip": "192.168.1.100",
        "username": "sunrise",
        "password": "sunrise"
    }
    """
    ip = request.data.get('ip', settings.RDK_DEFAULT_IP)
    username = request.data.get('username', settings.RDK_DEFAULT_USERNAME)
    password = request.data.get('password', settings.RDK_DEFAULT_PASSWORD)
    
    try:
        result = reboot_rdk(ip, username, password)
        return Response(result)
    except RDKDeploymentError as e:
        return Response({
            'status': 'error',
            'message': 'Reboot failed',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def device_status(request):
    """
    Check RDK X5 device status
    
    GET /api/device-status/?ip=192.168.1.100
    """
    ip = request.query_params.get('ip', settings.RDK_DEFAULT_IP)
    username = request.query_params.get('username', settings.RDK_DEFAULT_USERNAME)
    password = request.query_params.get('password', settings.RDK_DEFAULT_PASSWORD)
    
    result = check_rdk_status(ip, username, password)
    return Response(result)


@api_view(['GET'])
def system_requirements_check(request):
    """
    Check if system meets requirements for ML training
    
    GET /api/mlops/system-check/
    
    Returns detailed system information and recommendations
    """
    try:
        check_result = check_system_resources()
        return Response(check_result)
    except Exception as e:
        logger.error(f"System check failed: {e}")
        return Response({
            'error': str(e),
            'message': 'Failed to check system requirements'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def training_recommendation(request):
    """
    Get simple recommendation for training capability
    
    GET /api/mlops/training-recommendation/
    
    Returns yes/no recommendation with message
    """
    try:
        recommendation = get_training_recommendation()
        return Response(recommendation)
    except Exception as e:
        logger.error(f"Training recommendation failed: {e}")
        return Response({
            'error': str(e),
            'message': 'Failed to get training recommendation'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def upload_pretrained_model(request):
    """
    Upload a pre-trained model (.pt, .onnx, .bin) file
    
    POST /api/mlops/upload-model/
    
    FormData:
    - model_file: The model file (.pt, .onnx, or .bin)
    - name: Model name (default: 'uploaded-model')
    - version: Version string (must be unique)
    - description: Optional description
    
    Use this endpoint to upload models trained externally (e.g., Google Colab, Roboflow)
    """
    try:
        serializer = AIModelUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the model with uploaded status
        model = serializer.save(status='uploaded')
        
        # Calculate file size
        if model.model_file:
            model.file_size_mb = round(model.model_file.size / (1024 * 1024), 2)
            model.save(update_fields=['file_size_mb'])
        
        logger.info(f"Pre-trained model uploaded: {model.name} v{model.version}")
        
        return Response({
            'success': True,
            'message': f"Model '{model.name}' v{model.version} uploaded successfully",
            'model': AIModelSerializer(model, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Model upload failed: {e}")
        return Response({
            'error': str(e),
            'message': 'Failed to upload model'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_convertible_models(request):
    """
    List models that can be converted (uploaded .pt files)
    
    GET /api/mlops/convertible-models/
    
    Returns list of models with .pt extension that can be converted to other formats
    """
    try:
        # Get all models with .pt extension
        models = AIModel.objects.all().order_by('-created_at')
        convertible = []
        
        for model in models:
            if model.model_file:
                file_ext = model.model_file.name.split('.')[-1].lower()
                convertible.append({
                    'id': model.id,
                    'name': model.name,
                    'version': model.version,
                    'file_type': file_ext,
                    'file_size_mb': model.file_size_mb,
                    'created_at': model.created_at,
                    'can_convert_to_onnx': file_ext == 'pt',
                    'can_convert_to_bin': file_ext in ['pt', 'onnx'],
                    'is_deployed': model.is_deployed,
                    'status': model.status,
                })
        
        return Response(convertible)
        
    except Exception as e:
        logger.error(f"Failed to list convertible models: {e}")
        return Response({
            'error': str(e),
            'message': 'Failed to list convertible models'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
