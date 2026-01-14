"""
Core Views
"""
import os
import zipfile
from io import BytesIO
from PIL import Image
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Student, ClassGroup, StereoCalibration, DefectClass, Dataset, LabeledImage, Annotation
from .serializers import (
    StudentSerializer, StudentListSerializer, ClassGroupSerializer, 
    StereoCalibrationSerializer, DefectClassSerializer, DatasetSerializer, DatasetListSerializer,
    LabeledImageSerializer, AnnotationSerializer
)


class StereoCalibrationViewSet(viewsets.ModelViewSet):
    """ViewSet for StereoCalibration CRUD operations"""
    queryset = StereoCalibration.objects.all()
    serializer_class = StereoCalibrationSerializer

    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set this calibration as the active one"""
        calibration = self.get_object()
        # Deactivate all others
        StereoCalibration.objects.filter(is_active=True).update(is_active=False)
        # Activate this one
        calibration.is_active = True
        calibration.save()
        serializer = self.get_serializer(calibration)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active calibration"""
        try:
            calibration = StereoCalibration.objects.get(is_active=True)
            serializer = self.get_serializer(calibration)
            return Response(serializer.data)
        except StereoCalibration.DoesNotExist:
            return Response(
                {"detail": "No active calibration found"},
                status=status.HTTP_404_NOT_FOUND
            )


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for Student CRUD operations"""
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Get students filtered by class group"""
        class_id = request.query_params.get('class_id')
        if class_id:
            students = self.queryset.filter(class_group_id=class_id)
        else:
            students = self.queryset.all()
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)


class ClassGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassGroup CRUD operations"""
    queryset = ClassGroup.objects.all()
    serializer_class = ClassGroupSerializer


class DefectClassViewSet(viewsets.ModelViewSet):
    """ViewSet for DefectClass CRUD operations"""
    queryset = DefectClass.objects.all()
    serializer_class = DefectClassSerializer


class DatasetViewSet(viewsets.ModelViewSet):
    """ViewSet for Dataset CRUD operations"""
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer
    
    @action(detail=True, methods=['get'])
    def export_yolo(self, request, pk=None):
        """Export dataset in YOLO format as ZIP"""
        dataset = self.get_object()
        
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Create data.yaml
            yaml_content = f"""path: ./
train: images
val: images

nc: {len(dataset.classes)}
names: {dataset.classes}
"""
            zip_file.writestr('data.yaml', yaml_content)
            
            # Add images and labels
            images = dataset.images.all()
            for img in images:
                # Add image file
                if img.image:
                    img_path = f"images/{img.filename}"
                    with img.image.open('rb') as f:
                        zip_file.writestr(img_path, f.read())
                    
                    # Add label file
                    annotations = img.annotations.all()
                    if annotations:
                        label_filename = os.path.splitext(img.filename)[0] + '.txt'
                        label_lines = []
                        for ann in annotations:
                            class_idx = dataset.classes.index(ann.class_name) if ann.class_name in dataset.classes else 0
                            label_lines.append(
                                f"{class_idx} {ann.x_center} {ann.y_center} {ann.width} {ann.height}"
                            )
                        zip_file.writestr(f"labels/{label_filename}", '\n'.join(label_lines))
        
        # Return ZIP file
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{dataset.name}_yolo.zip"'
        return response
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser])
    def batch_upload(self, request, pk=None):
        """Batch upload images from folder"""
        dataset = self.get_object()
        files = request.FILES.getlist('images')
        
        uploaded_count = 0
        errors = []
        
        for file in files:
            try:
                # Get image dimensions
                img = Image.open(file)
                width, height = img.width, img.height
                
                # Create LabeledImage
                LabeledImage.objects.create(
                    dataset=dataset,
                    image=file,
                    filename=file.name,
                    width=width,
                    height=height
                )
                uploaded_count += 1
            except Exception as e:
                errors.append(f"{file.name}: {str(e)}")
        
        return Response({
            'uploaded': uploaded_count,
            'total': len(files),
            'errors': errors
        })
    
    @action(detail=True, methods=['post'])
    def auto_split(self, request, pk=None):
        """Automatically assign images to train/valid/test splits based on dataset ratios"""
        import random
        
        dataset = self.get_object()
        images = list(dataset.images.all())
        
        if not images:
            return Response({'error': 'No images to split'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Shuffle images for random assignment
        random.shuffle(images)
        
        # Calculate split counts
        total = len(images)
        train_count = int(total * dataset.train_split / 100)
        valid_count = int(total * dataset.valid_split / 100)
        # Remaining goes to test
        test_count = total - train_count - valid_count
        
        # Assign splits
        for i, img in enumerate(images):
            if i < train_count:
                img.split = 'train'
            elif i < train_count + valid_count:
                img.split = 'valid'
            else:
                img.split = 'test'
            img.save()
        
        return Response({
            'status': 'success',
            'train': train_count,
            'valid': valid_count,
            'test': test_count,
            'total': total
        })


class LabeledImageViewSet(viewsets.ModelViewSet):
    """ViewSet for LabeledImage CRUD operations"""
    queryset = LabeledImage.objects.all()
    serializer_class = LabeledImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        queryset = LabeledImage.objects.all()
        dataset_id = self.request.query_params.get('dataset')
        if dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Upload image with auto-detection of dimensions"""
        image_file = request.FILES.get('image')
        if image_file:
            try:
                img = Image.open(image_file)
                request.data['width'] = img.width
                request.data['height'] = img.height
            except Exception:
                pass
        
        if not request.data.get('filename'):
            request.data['filename'] = image_file.name if image_file else 'unknown.jpg'
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def auto_annotate(self, request, pk=None):
        """Auto-annotate image using AI model (placeholder for future implementation)"""
        image = self.get_object()
        
        # Placeholder: In production, this would call your YOLO model
        # For now, return a message indicating it's not yet implemented
        
        # Future implementation:
        # 1. Load deployed AI model
        # 2. Run inference on image
        # 3. Create Annotation objects from detections
        # 4. Return detected boxes
        
        return Response({
            'status': 'pending',
            'message': 'Auto-annotation requires a deployed AI model. Train and deploy a model in MLOps first.',
            'image_id': image.id,
            'filename': image.filename
        })
    
    @action(detail=False, methods=['post'])
    def batch_auto_annotate(self, request):
        """Batch auto-annotate multiple images"""
        image_ids = request.data.get('image_ids', [])
        
        # Placeholder for batch processing
        return Response({
            'status': 'pending',
            'message': 'Batch auto-annotation will be available after model deployment',
            'queued': len(image_ids)
        })


class AnnotationViewSet(viewsets.ModelViewSet):
    """ViewSet for Annotation CRUD operations"""
    queryset = Annotation.objects.all()
    serializer_class = AnnotationSerializer
    
    def get_queryset(self):
        queryset = Annotation.objects.all()
        image_id = self.request.query_params.get('image')
        if image_id:
            queryset = queryset.filter(image_id=image_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create annotation and mark image as labeled"""
        response = super().create(request, *args, **kwargs)
        
        # Mark image as labeled
        image_id = request.data.get('image')
        if image_id:
            LabeledImage.objects.filter(id=image_id).update(is_labeled=True)
        
        return response
