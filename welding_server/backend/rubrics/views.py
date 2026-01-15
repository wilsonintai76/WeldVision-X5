"""
Rubrics Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Rubric, AssessmentRubric, RubricCriterion, StudentEvaluation, CriterionScore
from .serializers import (
    RubricSerializer, AssessmentRubricSerializer, RubricCriterionSerializer,
    StudentEvaluationSerializer, StudentEvaluationCreateSerializer
)


class RubricViewSet(viewsets.ModelViewSet):
    """ViewSet for Rubric CRUD operations"""
    queryset = Rubric.objects.all()
    serializer_class = RubricSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active rubric"""
        rubric = Rubric.get_active()
        if rubric:
            serializer = self.get_serializer(rubric)
            return Response(serializer.data)
        return Response({'detail': 'No active rubric found'}, status=404)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this rubric as active"""
        rubric = self.get_object()
        rubric.is_active = True
        rubric.save()
        serializer = self.get_serializer(rubric)
        return Response(serializer.data)


class AssessmentRubricViewSet(viewsets.ModelViewSet):
    """ViewSet for Likert-scale Assessment Rubrics"""
    queryset = AssessmentRubric.objects.all()
    serializer_class = AssessmentRubricSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active assessment rubric"""
        rubric = AssessmentRubric.get_active()
        if rubric:
            serializer = self.get_serializer(rubric)
            return Response(serializer.data)
        return Response({'detail': 'No active rubric found'}, status=404)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this rubric as active"""
        rubric = self.get_object()
        rubric.is_active = True
        rubric.save()
        serializer = self.get_serializer(rubric)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_criterion(self, request, pk=None):
        """Add a criterion to this rubric"""
        rubric = self.get_object()
        serializer = RubricCriterionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(rubric=rubric)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_iso_5817(self, request):
        """Create a pre-configured ISO 5817 rubric"""
        name = request.data.get('name', 'ISO 5817 Quality Rubric')
        
        rubric = AssessmentRubric.objects.create(
            name=name,
            description='Welding quality assessment based on ISO 5817 quality levels',
            rubric_type='iso_5817',
            passing_score=3.0
        )
        
        # Create ISO 5817 criteria
        criteria = [
            {
                'name': 'Weld Bead Appearance',
                'category': 'visual',
                'weight': 1.0,
                'order': 1,
                'score_1_description': 'Very irregular, excessive spatter, poor fusion visible',
                'score_2_description': 'Irregular bead, noticeable defects',
                'score_3_description': 'Acceptable appearance, minor irregularities',
                'score_4_description': 'Good uniformity, minimal imperfections',
                'score_5_description': 'Excellent uniformity, smooth and consistent',
            },
            {
                'name': 'Reinforcement Height',
                'category': 'geometric',
                'weight': 1.0,
                'order': 2,
                'score_1_description': 'Outside tolerance (>3mm or <1mm)',
                'score_2_description': 'At tolerance limits',
                'score_3_description': 'Within tolerance (1-3mm)',
                'score_4_description': 'Good control (1.5-2.5mm)',
                'score_5_description': 'Excellent control, consistent height',
            },
            {
                'name': 'Bead Width Consistency',
                'category': 'geometric',
                'weight': 1.0,
                'order': 3,
                'score_1_description': 'Very inconsistent, >20% variation',
                'score_2_description': 'Inconsistent, 15-20% variation',
                'score_3_description': 'Acceptable, 10-15% variation',
                'score_4_description': 'Good, 5-10% variation',
                'score_5_description': 'Excellent, <5% variation',
            },
            {
                'name': 'Undercut',
                'category': 'visual',
                'weight': 1.5,
                'order': 4,
                'score_1_description': 'Severe undercut >1mm',
                'score_2_description': 'Undercut 0.5-1mm',
                'score_3_description': 'Minor undercut <0.5mm',
                'score_4_description': 'Barely visible undercut',
                'score_5_description': 'No undercut detected',
            },
            {
                'name': 'Porosity',
                'category': 'visual',
                'weight': 1.5,
                'order': 5,
                'score_1_description': 'Clustered porosity, multiple pores >2mm',
                'score_2_description': 'Scattered porosity, pores 1-2mm',
                'score_3_description': 'Isolated porosity, pores <1mm',
                'score_4_description': 'Minimal porosity, rare occurrence',
                'score_5_description': 'No visible porosity',
            },
            {
                'name': 'Spatter',
                'category': 'visual',
                'weight': 0.5,
                'order': 6,
                'score_1_description': 'Excessive spatter coverage',
                'score_2_description': 'Heavy spatter, needs cleaning',
                'score_3_description': 'Moderate spatter',
                'score_4_description': 'Light spatter',
                'score_5_description': 'Minimal to no spatter',
            },
            {
                'name': 'Start/Stop Quality',
                'category': 'technique',
                'weight': 1.0,
                'order': 7,
                'score_1_description': 'Poor starts/stops, crater cracks',
                'score_2_description': 'Noticeable defects at start/stop',
                'score_3_description': 'Acceptable blending',
                'score_4_description': 'Good tie-ins, minimal visible',
                'score_5_description': 'Seamless start/stop blending',
            },
            {
                'name': 'Travel Speed Control',
                'category': 'technique',
                'weight': 1.0,
                'order': 8,
                'score_1_description': 'Very inconsistent, obvious speed changes',
                'score_2_description': 'Inconsistent travel evident',
                'score_3_description': 'Generally consistent',
                'score_4_description': 'Good speed control',
                'score_5_description': 'Excellent, uniform travel speed',
            },
        ]
        
        for c in criteria:
            RubricCriterion.objects.create(rubric=rubric, **c)
        
        serializer = self.get_serializer(rubric)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RubricCriterionViewSet(viewsets.ModelViewSet):
    """ViewSet for Rubric Criteria"""
    queryset = RubricCriterion.objects.all()
    serializer_class = RubricCriterionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        rubric_id = self.request.query_params.get('rubric', None)
        if rubric_id:
            queryset = queryset.filter(rubric_id=rubric_id)
        return queryset


class StudentEvaluationViewSet(viewsets.ModelViewSet):
    """ViewSet for Student Evaluations"""
    queryset = StudentEvaluation.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentEvaluationCreateSerializer
        return StudentEvaluationSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student', None)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_student(self, request):
        """Get evaluations for a specific student"""
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id required'}, status=400)
        
        evaluations = self.queryset.filter(student__student_id=student_id)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def report_pdf(self, request, pk=None):
        """
        Generate a PDF report for a single evaluation.
        
        GET /api/student-evaluations/{id}/report_pdf/
        """
        from django.http import HttpResponse
        from .reports import generate_evaluation_report
        
        evaluation = self.get_object()
        include_details = request.query_params.get('details', 'true').lower() == 'true'
        
        pdf_buffer = generate_evaluation_report(evaluation, include_details=include_details)
        
        filename = f"evaluation_{evaluation.student.student_id}_{evaluation.created_at.strftime('%Y%m%d_%H%M')}.pdf"
        
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    @action(detail=False, methods=['get'])
    def student_report_pdf(self, request):
        """
        Generate a summary PDF report for all evaluations of a student.
        
        GET /api/student-evaluations/student_report_pdf/?student_id=STU001
        """
        from django.http import HttpResponse
        from core.models import Student
        from .reports import generate_student_summary_report
        
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id query parameter required'}, status=400)
        
        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found'}, status=404)
        
        evaluations = self.queryset.filter(student=student)
        
        pdf_buffer = generate_student_summary_report(student, evaluations)
        
        from datetime import datetime
        filename = f"student_report_{student.student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    @action(detail=False, methods=['get'])
    def class_report_pdf(self, request):
        """
        Generate a PDF report for an entire class showing all students and their evaluations.
        
        GET /api/student-evaluations/class_report_pdf/?class_id=1
        """
        from django.http import HttpResponse
        from core.models import ClassGroup
        from .reports import generate_class_report
        
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({'detail': 'class_id query parameter required'}, status=400)
        
        try:
            class_group = ClassGroup.objects.get(id=class_id)
        except ClassGroup.DoesNotExist:
            return Response({'detail': 'Class not found'}, status=404)
        
        pdf_buffer = generate_class_report(class_group)
        
        from datetime import datetime
        filename = f"class_report_{class_group.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
