"""
Results Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
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
