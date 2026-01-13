"""
Rubrics Views
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Rubric
from .serializers import RubricSerializer


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
