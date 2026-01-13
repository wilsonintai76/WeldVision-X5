"""
Rubrics Models: Configurable grading weights
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Rubric(models.Model):
    """
    Rubric model for configurable grading weights
    
    Allows setting percentage weights for:
    - Geometric defects (Height, Width, Undercut, Hi-Lo)
    - Visual defects (Porosity, Spatter, Slag, Burn-Through)
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=False, help_text="Only one rubric can be active")
    
    # Geometric Weights (%)
    weight_reinforcement_height = models.FloatField(
        default=20.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for reinforcement height (1-3mm range)"
    )
    weight_bead_width = models.FloatField(
        default=15.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for bead width (8-12mm range)"
    )
    weight_undercut = models.FloatField(
        default=15.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for undercut depth"
    )
    weight_hi_lo = models.FloatField(
        default=10.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for hi-lo misalignment"
    )
    
    # Visual Defect Weights (%)
    weight_porosity = models.FloatField(
        default=20.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for porosity defects"
    )
    weight_spatter = models.FloatField(
        default=10.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for spatter defects"
    )
    weight_slag_inclusion = models.FloatField(
        default=5.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for slag inclusion defects"
    )
    weight_burn_through = models.FloatField(
        default=5.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Weight for burn-through defects"
    )
    
    # Tolerance Ranges for Geometric Measurements
    height_min = models.FloatField(default=1.0, help_text="Minimum acceptable height (mm)")
    height_max = models.FloatField(default=3.0, help_text="Maximum acceptable height (mm)")
    width_min = models.FloatField(default=8.0, help_text="Minimum acceptable width (mm)")
    width_max = models.FloatField(default=12.0, help_text="Maximum acceptable width (mm)")
    undercut_max = models.FloatField(default=0.5, help_text="Maximum acceptable undercut (mm)")
    hi_lo_max = models.FloatField(default=0.3, help_text="Maximum acceptable hi-lo (mm)")
    
    # Defect Count Thresholds
    porosity_threshold = models.IntegerField(default=3, help_text="Max acceptable porosity count")
    spatter_threshold = models.IntegerField(default=5, help_text="Max acceptable spatter count")
    slag_threshold = models.IntegerField(default=2, help_text="Max acceptable slag inclusion count")
    burn_through_threshold = models.IntegerField(default=0, help_text="Max acceptable burn-through count")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-created_at']

    def __str__(self):
        return f"{self.name} {'(Active)' if self.is_active else ''}"

    def save(self, *args, **kwargs):
        """Ensure only one rubric is active"""
        if self.is_active:
            Rubric.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def total_weight(self):
        """Calculate total weight (should be 100%)"""
        return (
            self.weight_reinforcement_height +
            self.weight_bead_width +
            self.weight_undercut +
            self.weight_hi_lo +
            self.weight_porosity +
            self.weight_spatter +
            self.weight_slag_inclusion +
            self.weight_burn_through
        )

    def calculate_score(self, metrics_json):
        """
        Calculate assessment score based on this rubric
        
        Args:
            metrics_json: Dictionary with 'geometric' and 'visual' keys
            
        Returns:
            float: Score between 0 and 100
        """
        score = 0.0
        geometric = metrics_json.get('geometric', {})
        visual = metrics_json.get('visual', {})
        
        # Geometric Scoring
        # Reinforcement Height
        height = geometric.get('reinforcement_height_mm', 0)
        if self.height_min <= height <= self.height_max:
            score += self.weight_reinforcement_height
        
        # Bead Width
        width = geometric.get('bead_width_mm', 0)
        if self.width_min <= width <= self.width_max:
            score += self.weight_bead_width
        
        # Undercut
        undercut = geometric.get('undercut_depth_mm', 0)
        if undercut <= self.undercut_max:
            score += self.weight_undercut
        
        # Hi-Lo
        hi_lo = geometric.get('hi_lo_misalignment_mm', 0)
        if hi_lo <= self.hi_lo_max:
            score += self.weight_hi_lo
        
        # Visual Defect Scoring
        # Porosity
        porosity = visual.get('porosity_count', 0)
        if porosity <= self.porosity_threshold:
            score += self.weight_porosity
        
        # Spatter
        spatter = visual.get('spatter_count', 0)
        if spatter <= self.spatter_threshold:
            score += self.weight_spatter
        
        # Slag Inclusion
        slag = visual.get('slag_inclusion_count', 0)
        if slag <= self.slag_threshold:
            score += self.weight_slag_inclusion
        
        # Burn-Through
        burn_through = visual.get('burn_through_count', 0)
        if burn_through <= self.burn_through_threshold:
            score += self.weight_burn_through
        
        return min(100.0, max(0.0, score))

    @classmethod
    def get_active(cls):
        """Get the currently active rubric"""
        return cls.objects.filter(is_active=True).first()
