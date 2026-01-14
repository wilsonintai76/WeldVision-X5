"""
Results Models: Assessment with metrics and images
"""
from django.db import models
from core.models import Student


class Assessment(models.Model):
    """
    Assessment model for storing weld inspection results
    
    Stores:
    - Student reference
    - Final calculated score
    - Original image and AI-generated heatmap
    - Metrics JSON (geometric and visual defects)
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='assessments'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    final_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Calculated score based on rubric weights"
    )
    
    # Images
    image_original = models.ImageField(
        upload_to='assessments/original/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text="Original captured image from RDK X5"
    )
    image_heatmap = models.ImageField(
        upload_to='assessments/heatmap/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text="AI-generated defect heatmap overlay"
    )
    
    # Metrics stored as JSON
    metrics_json = models.JSONField(
        default=dict,
        help_text="Stores all geometric and visual defect metrics"
    )
    """
    Expected JSON structure:
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
        },
        "depth_data": {
            "z_average_mm": 150.5,
            "focal_length_mm": 3.5,
            "baseline_mm": 65.0
        }
    }
    """
    
    # Additional metadata
    notes = models.TextField(blank=True)
    device_id = models.CharField(max_length=100, blank=True, help_text="RDK X5 device identifier")
    model_version = models.CharField(max_length=50, blank=True, help_text="AI model version used")
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['student', '-timestamp']),
        ]

    def __str__(self):
        return f"Assessment - {self.student.student_id} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

    def calculate_score(self, rubric=None):
        """
        Calculate final score based on rubric weights
        To be implemented with rubric integration
        """
        # Placeholder - will be implemented with rubric logic
        if not self.metrics_json:
            return 0.0
        
        # Simple scoring logic (to be replaced with rubric-based calculation)
        score = 100.0
        
        # Geometric penalties
        geometric = self.metrics_json.get('geometric', {})
        height = geometric.get('reinforcement_height_mm', 2.0)
        width = geometric.get('bead_width_mm', 10.0)
        
        # Height validation (1-3mm range)
        if not (1.0 <= height <= 3.0):
            score -= 15.0
        
        # Width validation (8-12mm range)
        if not (8.0 <= width <= 12.0):
            score -= 15.0
        
        # Visual defect penalties
        visual = self.metrics_json.get('visual', {})
        total_defects = sum([
            visual.get('porosity_count', 0),
            visual.get('spatter_count', 0),
            visual.get('slag_inclusion_count', 0),
            visual.get('burn_through_count', 0)
        ])
        score -= min(total_defects * 5, 40)  # Max 40 points penalty
        
        return max(0.0, min(100.0, score))

    def save(self, *args, **kwargs):
        """Auto-calculate score on save"""
        if self.metrics_json and self.final_score is None:
            self.final_score = self.calculate_score()
        super().save(*args, **kwargs)
