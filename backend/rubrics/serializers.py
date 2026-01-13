"""
Rubrics Serializers
"""
from rest_framework import serializers
from .models import Rubric


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
