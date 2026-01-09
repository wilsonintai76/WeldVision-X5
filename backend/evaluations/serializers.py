from rest_framework import serializers

from .models import Evaluation


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = [
            "id",
            "created_at",
            "joint_type",
            "score",
            "grade",
            "captured_at",
            "metrics",
        ]
        read_only_fields = ["id", "created_at"]
