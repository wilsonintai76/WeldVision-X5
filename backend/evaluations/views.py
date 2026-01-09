from rest_framework import mixins, viewsets

from .models import Evaluation
from .serializers import EvaluationSerializer


class EvaluationViewSet(
	mixins.CreateModelMixin,
	mixins.ListModelMixin,
	viewsets.GenericViewSet,
):
	queryset = Evaluation.objects.all().order_by("-created_at")
	serializer_class = EvaluationSerializer
