"""
Core Models: Student and ClassGroup
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class StereoCalibration(models.Model):
    """Stereo camera calibration settings for edge device"""
    name = models.CharField(max_length=100, unique=True, help_text="Configuration name")
    image_width = models.IntegerField(
        default=1280,
        validators=[MinValueValidator(640), MaxValueValidator(3840)]
    )
    image_height = models.IntegerField(
        default=720,
        validators=[MinValueValidator(480), MaxValueValidator(2160)]
    )
    board_width = models.IntegerField(
        default=9,
        validators=[MinValueValidator(3), MaxValueValidator(20)],
        help_text="Chessboard width (inner corners)"
    )
    board_height = models.IntegerField(
        default=6,
        validators=[MinValueValidator(3), MaxValueValidator(20)],
        help_text="Chessboard height (inner corners)"
    )
    square_size_mm = models.FloatField(
        default=25.0,
        validators=[MinValueValidator(1.0), MaxValueValidator(100.0)],
        help_text="Chessboard square size in mm"
    )
    calibration_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Calibration parameters (Q, maps, etc.)"
    )
    is_active = models.BooleanField(
        default=False,
        help_text="Active calibration configuration"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-updated_at']

    def __str__(self):
        return f"{self.name} {'(Active)' if self.is_active else ''}"

    def save(self, *args, **kwargs):
        # Ensure only one active configuration
        if self.is_active:
            StereoCalibration.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)


class ClassGroup(models.Model):
    """Class/Group model for organizing students - represents HOME CLASS (e.g., DKM5A, DKM6A)"""
    name = models.CharField(max_length=100, unique=True, help_text="Home class name (e.g., DKM5A)")
    department = models.CharField(max_length=100, blank=True, help_text="Department/Jabatan (e.g., JKM)")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Session(models.Model):
    """Academic Session/Semester (e.g., 2:2025/2026 = Semester 2, Year 2025/2026)"""
    name = models.CharField(max_length=50, unique=True, help_text="Session name (e.g., 2:2025/2026)")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=False, help_text="Currently active session")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-name']

    def __str__(self):
        return f"{self.name}{' (Active)' if self.is_active else ''}"

    def save(self, *args, **kwargs):
        # Ensure only one active session
        if self.is_active:
            Session.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class Course(models.Model):
    """Course model (e.g., DJJ40173 - ENGINEERING DESIGN)"""
    code = models.CharField(max_length=20, help_text="Course code (e.g., DJJ40173)")
    name = models.CharField(max_length=200, help_text="Course name (e.g., ENGINEERING DESIGN)")
    section = models.CharField(max_length=20, blank=True, help_text="Section (e.g., S3)")
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='courses',
        help_text="Academic session"
    )
    instructor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses_teaching',
        limit_choices_to={'role': 'instructor'},
        help_text="Course instructor"
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code', 'section']
        unique_together = ['code', 'section', 'session']

    def __str__(self):
        section_str = f" ({self.section})" if self.section else ""
        return f"{self.code} - {self.name}{section_str}"


class Student(models.Model):
    """Student model with ID and Name"""
    student_id = models.CharField(max_length=50, unique=True, help_text="Registration number (e.g., 05DKM23F2014)")
    name = models.CharField(max_length=200)
    class_group = models.ForeignKey(
        ClassGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        help_text="Student's home class (e.g., DKM5A)"
    )
    department = models.CharField(max_length=100, blank=True, help_text="Department/Jabatan (e.g., JKM)")
    enrolled_courses = models.ManyToManyField(
        Course,
        blank=True,
        related_name='enrolled_students',
        help_text="Courses the student is enrolled in"
    )
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student_id']

    def __str__(self):
        return f"{self.student_id} - {self.name}"


class DefectClass(models.Model):
    """Reusable defect class/label with persistent color"""
    name = models.CharField(max_length=100, unique=True, help_text="Class name (e.g., crack, porosity)")
    display_name = models.CharField(max_length=100, help_text="Human-readable name")
    color = models.CharField(
        max_length=7,
        default='#3B82F6',
        help_text="Hex color code for this class (e.g., #FF5733)"
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Defect Classes'
    
    def __str__(self):
        return self.display_name


class Dataset(models.Model):
    """Dataset for training data organization"""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    classes = models.ManyToManyField(
        DefectClass,
        related_name='datasets',
        help_text="Defect classes for this dataset"
    )
    created_by = models.CharField(max_length=200, blank=True)
    
    # Train/Valid/Test split ratios (percentages, should sum to 100)
    train_split = models.IntegerField(
        default=80,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Training set percentage (default 80%)"
    )
    valid_split = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Validation set percentage (default 10%)"
    )
    test_split = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Test set percentage (default 10%)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def image_count(self):
        return self.images.count()
    
    @property
    def annotated_count(self):
        return self.images.filter(annotations__isnull=False).distinct().count()
    
    @property
    def train_count(self):
        return self.images.filter(split='train').count()
    
    @property
    def valid_count(self):
        return self.images.filter(split='valid').count()
    
    @property
    def test_count(self):
        return self.images.filter(split='test').count()


class LabeledImage(models.Model):
    """Image in a dataset with annotations"""
    SPLIT_CHOICES = [
        ('train', 'Training'),
        ('valid', 'Validation'),
        ('test', 'Test'),
        ('unassigned', 'Unassigned'),
    ]
    
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(
        upload_to='datasets/images/%Y/%m/%d/',
        help_text="Image file for labeling"
    )
    filename = models.CharField(max_length=255)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    split = models.CharField(
        max_length=20,
        choices=SPLIT_CHOICES,
        default='unassigned',
        help_text="Dataset split assignment"
    )
    is_labeled = models.BooleanField(default=False)
    labeled_by = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['filename']
        unique_together = ['dataset', 'filename']
    
    def __str__(self):
        return f"{self.dataset.name} - {self.filename}"


class Annotation(models.Model):
    """Bounding box annotation for an image"""
    image = models.ForeignKey(
        LabeledImage,
        on_delete=models.CASCADE,
        related_name='annotations'
    )
    class_name = models.CharField(
        max_length=50,
        help_text="Defect class name"
    )
    # Bounding box in normalized coordinates (0-1)
    x_center = models.FloatField(help_text="Center X (normalized 0-1)")
    y_center = models.FloatField(help_text="Center Y (normalized 0-1)")
    width = models.FloatField(help_text="Width (normalized 0-1)")
    height = models.FloatField(help_text="Height (normalized 0-1)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.class_name} @ {self.image.filename}"
