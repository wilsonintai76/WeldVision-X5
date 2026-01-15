"""
Rubrics Models: Configurable grading weights and Likert-scale Assessment Rubrics
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class AssessmentRubric(models.Model):
    """
    Likert-scale (1-5) Assessment Rubric for student evaluation
    Based on ISO 5817 or custom criteria
    """
    RUBRIC_TYPE_CHOICES = [
        ('iso_5817', 'ISO 5817 Welding Quality'),
        ('aws_d1_1', 'AWS D1.1 Structural Welding'),
        ('custom', 'Custom Rubric'),
    ]
    
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    rubric_type = models.CharField(max_length=50, choices=RUBRIC_TYPE_CHOICES, default='custom')
    is_active = models.BooleanField(default=False, help_text="Active rubric for evaluations")
    
    # Passing threshold (e.g., 3.0 on 1-5 scale)
    passing_score = models.FloatField(
        default=3.0,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Minimum average score to pass (1-5 scale)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_active', '-created_at']
    
    def __str__(self):
        return f"{self.name} {'(Active)' if self.is_active else ''}"
    
    def save(self, *args, **kwargs):
        if self.is_active:
            AssessmentRubric.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
    
    @classmethod
    def get_active(cls):
        return cls.objects.filter(is_active=True).first()


class RubricCriterion(models.Model):
    """
    Individual criterion within an assessment rubric
    Each criterion has 5 Likert scale descriptors
    """
    CATEGORY_CHOICES = [
        ('geometric', 'Geometric (Dimensional)'),
        ('visual', 'Visual Inspection'),
        ('technique', 'Welding Technique'),
        ('safety', 'Safety & Procedure'),
    ]
    
    rubric = models.ForeignKey(AssessmentRubric, on_delete=models.CASCADE, related_name='criteria')
    name = models.CharField(max_length=200, help_text="Criterion name (e.g., Bead Appearance)")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='visual')
    weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(10)],
        help_text="Weight multiplier for this criterion"
    )
    order = models.IntegerField(default=0, help_text="Display order")
    
    # Likert Scale Descriptors (1-5)
    score_1_label = models.CharField(max_length=50, default="Poor")
    score_1_description = models.TextField(help_text="Description for score 1", blank=True)
    
    score_2_label = models.CharField(max_length=50, default="Below Average")
    score_2_description = models.TextField(help_text="Description for score 2", blank=True)
    
    score_3_label = models.CharField(max_length=50, default="Acceptable")
    score_3_description = models.TextField(help_text="Description for score 3", blank=True)
    
    score_4_label = models.CharField(max_length=50, default="Good")
    score_4_description = models.TextField(help_text="Description for score 4", blank=True)
    
    score_5_label = models.CharField(max_length=50, default="Excellent")
    score_5_description = models.TextField(help_text="Description for score 5", blank=True)
    
    class Meta:
        ordering = ['rubric', 'order', 'name']
        unique_together = ['rubric', 'name']
    
    def __str__(self):
        return f"{self.rubric.name} - {self.name}"


class StudentEvaluation(models.Model):
    """
    Student evaluation record using assessment rubric
    """
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    rubric = models.ForeignKey(
        AssessmentRubric,
        on_delete=models.SET_NULL,
        null=True,
        related_name='evaluations'
    )
    # Link to assessment with images
    assessment = models.ForeignKey(
        'results.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluations',
        help_text="Reference to assessment with images"
    )
    evaluator = models.CharField(max_length=200, blank=True, help_text="Instructor/Evaluator name")
    
    # Overall results
    total_score = models.FloatField(default=0, help_text="Weighted average score (1-5)")
    passed = models.BooleanField(default=False)
    
    # Session info
    session_start = models.DateTimeField(null=True, blank=True)
    session_end = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # AI-detected metrics (from vision system)
    ai_metrics = models.JSONField(
        null=True, blank=True,
        help_text="AI-detected metrics from vision system"
    )
    
    notes = models.TextField(blank=True, help_text="Evaluator notes/comments")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def calculate_total_score(self):
        """Calculate weighted average from criterion scores"""
        scores = self.criterion_scores.all()
        if not scores:
            return 0
        
        total_weighted = sum(s.score * s.criterion.weight for s in scores)
        total_weight = sum(s.criterion.weight for s in scores)
        
        if total_weight == 0:
            return 0
        
        return round(total_weighted / total_weight, 2)
    
    def save(self, *args, **kwargs):
        # Calculate pass/fail based on rubric threshold
        if self.rubric and self.total_score >= self.rubric.passing_score:
            self.passed = True
        else:
            self.passed = False
        super().save(*args, **kwargs)


class CriterionScore(models.Model):
    """
    Individual criterion score within an evaluation
    """
    evaluation = models.ForeignKey(
        StudentEvaluation,
        on_delete=models.CASCADE,
        related_name='criterion_scores'
    )
    criterion = models.ForeignKey(
        RubricCriterion,
        on_delete=models.CASCADE,
        related_name='scores'
    )
    score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Score 1-5"
    )
    notes = models.TextField(blank=True, help_text="Notes for this criterion")
    
    class Meta:
        unique_together = ['evaluation', 'criterion']
    
    def __str__(self):
        return f"{self.evaluation} - {self.criterion.name}: {self.score}"


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
