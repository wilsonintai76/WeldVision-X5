"""
Rubrics Serializers
"""
from rest_framework import serializers
from .models import Rubric, AssessmentRubric, RubricCriterion, StudentEvaluation, CriterionScore


class RubricCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricCriterion
        fields = [
            'id', 'name', 'category', 'weight', 'order',
            'score_1_label', 'score_1_description',
            'score_2_label', 'score_2_description',
            'score_3_label', 'score_3_description',
            'score_4_label', 'score_4_description',
            'score_5_label', 'score_5_description',
        ]


class AssessmentRubricSerializer(serializers.ModelSerializer):
    criteria = RubricCriterionSerializer(many=True, read_only=True)
    criteria_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AssessmentRubric
        fields = [
            'id', 'name', 'description', 'rubric_type', 'is_active',
            'passing_score', 'criteria', 'criteria_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_criteria_count(self, obj):
        return obj.criteria.count()


class CriterionScoreSerializer(serializers.ModelSerializer):
    criterion_name = serializers.CharField(source='criterion.name', read_only=True)
    criterion_category = serializers.CharField(source='criterion.category', read_only=True)
    
    class Meta:
        model = CriterionScore
        fields = ['id', 'criterion', 'criterion_name', 'criterion_category', 'score', 'notes']


class StudentEvaluationSerializer(serializers.ModelSerializer):
    criterion_scores = CriterionScoreSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    rubric_name = serializers.CharField(source='rubric.name', read_only=True)
    
    class Meta:
        model = StudentEvaluation
        fields = [
            'id', 'student', 'student_name', 'student_id',
            'rubric', 'rubric_name', 'evaluator',
            'total_score', 'passed',
            'session_start', 'session_end', 'duration_seconds',
            'ai_metrics', 'notes', 'criterion_scores',
            'created_at'
        ]
        read_only_fields = ['created_at', 'total_score', 'passed']


class StudentEvaluationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating evaluations with criterion scores"""
    criterion_scores = CriterionScoreSerializer(many=True)
    
    class Meta:
        model = StudentEvaluation
        fields = [
            'student', 'rubric', 'evaluator',
            'session_start', 'session_end', 'duration_seconds',
            'ai_metrics', 'notes', 'criterion_scores'
        ]
    
    def create(self, validated_data):
        scores_data = validated_data.pop('criterion_scores', [])
        evaluation = StudentEvaluation.objects.create(**validated_data)
        
        for score_data in scores_data:
            CriterionScore.objects.create(evaluation=evaluation, **score_data)
        
        # Calculate and save total score
        evaluation.total_score = evaluation.calculate_total_score()
        evaluation.save()
        
        return evaluation


class RubricSerializer(serializers.ModelSerializer):
    total_weight = serializers.SerializerMethodField()

    class Meta:
        model = Rubric
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            # Geometric weights
            'weight_reinforcement_height',
            'weight_bead_width',
            'weight_undercut',
            'weight_hi_lo',
            # Visual weights
            'weight_porosity',
            'weight_spatter',
            'weight_slag_inclusion',
            'weight_burn_through',
            # Tolerance ranges
            'height_min',
            'height_max',
            'width_min',
            'width_max',
            'undercut_max',
            'hi_lo_max',
            # Thresholds
            'porosity_threshold',
            'spatter_threshold',
            'slag_threshold',
            'burn_through_threshold',
            # Metadata
            'total_weight',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_total_weight(self, obj):
        return obj.total_weight()

    def validate(self, data):
        """Validate that weights sum to approximately 100%"""
        weights = [
            data.get('weight_reinforcement_height', 0),
            data.get('weight_bead_width', 0),
            data.get('weight_undercut', 0),
            data.get('weight_hi_lo', 0),
            data.get('weight_porosity', 0),
            data.get('weight_spatter', 0),
            data.get('weight_slag_inclusion', 0),
            data.get('weight_burn_through', 0),
        ]
        total = sum(weights)
        
        if not (99.0 <= total <= 101.0):
            raise serializers.ValidationError(
                f"Total weight must be 100% (currently {total:.1f}%)"
            )
        
        return data
