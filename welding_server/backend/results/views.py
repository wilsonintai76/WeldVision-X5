"""
Results Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from core.models import Student
from .models import Assessment
from .serializers import (
    AssessmentSerializer,
    AssessmentListSerializer,
    AssessmentUploadSerializer
)



class AssessmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Assessment CRUD operations"""
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return AssessmentListSerializer
        return AssessmentSerializer


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def upload_assessment(request):
    """
    API endpoint for RDK X5 to upload assessment data
    
    POST /api/upload-assessment/
    
    Expected payload (multipart/form-data):
    - student_id: string (required)
    - image_original: file (optional)
    - image_heatmap: file (optional)
    - metrics_json: JSON object (required)
    - device_id: string (optional)
    - model_version: string (optional)
    - notes: string (optional)
    
    Example metrics_json:
    {
        "geometric": {
            "reinforcement_height_mm": 2.1,
            "undercut_depth_mm": 0.3,
            "bead_width_mm": 10.2,
            "hi_lo_misalignment_mm": 0.1
        },
        "visual": {
            "porosity_count": 2,
            "spatter_count": 5,
            "slag_inclusion_count": 1,
            "burn_through_count": 0
        }
    }
    """
    serializer = AssessmentUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get student
    student = get_object_or_404(Student, student_id=serializer.validated_data['student_id'])
    
    # Create assessment
    assessment = Assessment.objects.create(
        student=student,
        image_original=serializer.validated_data.get('image_original'),
        image_heatmap=serializer.validated_data.get('image_heatmap'),
        pointcloud_ply=serializer.validated_data.get('pointcloud_ply'),
        mesh_preview_json=serializer.validated_data.get('mesh_preview_json'),
        metrics_json=serializer.validated_data['metrics_json'],
        device_id=serializer.validated_data.get('device_id', ''),
        model_version=serializer.validated_data.get('model_version', ''),
        notes=serializer.validated_data.get('notes', ''),
    )
    
    # Calculate and save score
    assessment.final_score = assessment.calculate_score()
    assessment.save()
    
    # Return created assessment
    response_serializer = AssessmentSerializer(assessment, context={'request': request})
    
    return Response(
        {
            'message': 'Assessment uploaded successfully',
            'assessment': response_serializer.data
        },
        status=status.HTTP_201_CREATED
    )





@api_view(['GET'])
def student_assessments(request, student_id):
    """
    Get all assessments for a specific student
    
    GET /api/students/<student_id>/assessments/
    """
    student = get_object_or_404(Student, student_id=student_id)
    assessments = Assessment.objects.filter(student=student)
    serializer = AssessmentListSerializer(assessments, many=True)
    
    return Response({
        'student': {
            'id': student.student_id,
            'name': student.name
        },
        'assessments': serializer.data,
        'total_count': assessments.count()
    })


@api_view(['GET'])
def download_pointcloud(request, pk):
    """
    Download full-resolution PLY point cloud for an assessment
    
    GET /api/assessments/<pk>/download-ply/
    
    Returns the PLY file for CloudCompare or other 3D viewers.
    Intended for instructors performing forensic metrology.
    """
    assessment = get_object_or_404(Assessment, pk=pk)
    
    if not assessment.pointcloud_ply:
        raise Http404("No point cloud file available for this assessment")
    
    # Get the file
    ply_file = assessment.pointcloud_ply
    
    # Generate filename for download
    filename = f"weld_{assessment.student.student_id}_{assessment.timestamp.strftime('%Y%m%d_%H%M%S')}.ply"
    
    response = FileResponse(
        ply_file.open('rb'),
        as_attachment=True,
        filename=filename
    )
    response['Content-Type'] = 'application/octet-stream'
    
    return response


@api_view(['GET'])
def assessment_mesh_preview(request, pk):
    """
    Get decimated mesh preview JSON for web 3D viewer
    
    GET /api/assessments/<pk>/mesh-preview/
    
    Returns the decimated point cloud (<50k points) for Three.js rendering.
    Intended for students viewing their weld in the browser.
    """
    assessment = get_object_or_404(Assessment, pk=pk)
    
    if not assessment.mesh_preview_json:
        return Response(
            {'error': 'No 3D preview available for this assessment'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        'assessment_id': assessment.id,
        'student_id': assessment.student.student_id,
        'timestamp': assessment.timestamp.isoformat(),
        'mesh': assessment.mesh_preview_json
    })
