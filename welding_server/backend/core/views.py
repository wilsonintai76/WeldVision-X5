"""
Core Views
"""
import os
import re
import zipfile
from io import BytesIO
from PIL import Image
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Student, ClassGroup, StereoCalibration, DefectClass, Dataset, LabeledImage, Annotation, Session, Course
from .serializers import (
    StudentSerializer, StudentListSerializer, ClassGroupSerializer, 
    StereoCalibrationSerializer, DefectClassSerializer, DatasetSerializer, DatasetListSerializer,
    LabeledImageSerializer, AnnotationSerializer, SessionSerializer, CourseSerializer, CourseListSerializer
)


class StereoCalibrationViewSet(viewsets.ModelViewSet):
    """ViewSet for StereoCalibration CRUD operations"""
    queryset = StereoCalibration.objects.all()
    serializer_class = StereoCalibrationSerializer

    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set this calibration as the active one"""
        calibration = self.get_object()
        # Deactivate all others
        StereoCalibration.objects.filter(is_active=True).update(is_active=False)
        # Activate this one
        calibration.is_active = True
        calibration.save()
        serializer = self.get_serializer(calibration)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active calibration"""
        try:
            calibration = StereoCalibration.objects.get(is_active=True)
            serializer = self.get_serializer(calibration)
            return Response(serializer.data)
        except StereoCalibration.DoesNotExist:
            return Response(
                {"detail": "No active calibration found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def calibrate(self, request):
        """
        Create a new calibration from captured stereo image data.
        
        In production, this would trigger OpenCV stereoCalibrate using
        uploaded image pairs. For now, it creates a calibration record
        and stores placeholder calibration data.
        """
        name = request.data.get('name')
        if not name:
            return Response({'detail': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        rows = request.data.get('checkerboard_rows', 6)
        cols = request.data.get('checkerboard_cols', 9)
        square_size = request.data.get('square_size', 25.0)
        image_count = request.data.get('image_count', 0)
        
        # Create calibration record with placeholder data
        # In production: run cv2.stereoCalibrate on captured images
        calibration = StereoCalibration.objects.create(
            name=name,
            board_width=cols,
            board_height=rows,
            square_size_mm=square_size,
            calibration_data={
                'status': 'pending',
                'image_count': image_count,
                'message': 'Calibration data placeholder. Run stereo_calibrate.py on RDK to compute real parameters.'
            },
            is_active=False
        )
        
        serializer = self.get_serializer(calibration)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for Student CRUD operations"""
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer

    def perform_create(self, serializer):
        """Create student and associated user account"""
        from accounts.models import User
        
        student = serializer.save()
        
        # Check if user already exists
        if not User.objects.filter(username=student.student_id).exists():
            # Create user account with default password = registration number
            user = User.objects.create_user(
                username=student.student_id,
                password=student.student_id,  # Default password
                first_name=student.name.split(' ')[0] if student.name else '',
                last_name=' '.join(student.name.split(' ')[1:]) if student.name and len(student.name.split(' ')) > 1 else '',
                role=User.Role.STUDENT,
                is_approved=True,  # Auto-approve since instructor created
                must_change_password=True,  # Must change on first login
                student_profile=student
            )

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Get students filtered by class group"""
        class_id = request.query_params.get('class_id')
        if class_id:
            students = self.queryset.filter(class_group_id=class_id)
        else:
            students = self.queryset.all()
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Bulk import students from CSV/Excel file"""
        import csv
        import io
        from accounts.models import User
        
        file = request.FILES.get('file')
        class_id = request.data.get('class_id')
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            class_group = ClassGroup.objects.get(id=class_id)
        except ClassGroup.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Read file content
        file_content = file.read().decode('utf-8-sig')  # Handle BOM
        reader = csv.DictReader(io.StringIO(file_content))
        
        created = []
        skipped = []
        errors = []
        
        for row_num, row in enumerate(reader, start=2):
            student_id = row.get('student_id', row.get('reg_no', row.get('registration_number', ''))).strip()
            name = row.get('name', row.get('full_name', '')).strip()
            
            if not student_id or not name:
                errors.append(f"Row {row_num}: Missing student_id or name")
                continue
            
            # Check if student already exists
            if Student.objects.filter(student_id=student_id).exists():
                skipped.append(f"{student_id} - {name} (already exists)")
                continue
            
            try:
                # Create student
                student = Student.objects.create(
                    student_id=student_id,
                    name=name,
                    class_group=class_group
                )
                
                # Create user account if doesn't exist
                if not User.objects.filter(username=student_id).exists():
                    name_parts = name.split(' ', 1)
                    User.objects.create_user(
                        username=student_id,
                        password=student_id,
                        first_name=name_parts[0],
                        last_name=name_parts[1] if len(name_parts) > 1 else '',
                        role=User.Role.STUDENT,
                        is_approved=True,
                        must_change_password=True,
                        student_profile=student
                    )
                
                created.append(f"{student_id} - {name}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return Response({
            'message': f'Imported {len(created)} students',
            'created': created,
            'skipped': skipped,
            'errors': errors
        })


class ClassGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassGroup CRUD operations"""
    queryset = ClassGroup.objects.all()
    serializer_class = ClassGroupSerializer


class DefectClassViewSet(viewsets.ModelViewSet):
    """ViewSet for DefectClass CRUD operations"""
    queryset = DefectClass.objects.all()
    serializer_class = DefectClassSerializer


class DatasetViewSet(viewsets.ModelViewSet):
    """ViewSet for Dataset CRUD operations"""
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer
    
    @action(detail=True, methods=['get'])
    def export_yolo(self, request, pk=None):
        """Export dataset in YOLO format as ZIP"""
        dataset = self.get_object()
        
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Create data.yaml
            yaml_content = f"""path: ./
train: images
val: images

nc: {len(dataset.classes)}
names: {dataset.classes}
"""
            zip_file.writestr('data.yaml', yaml_content)
            
            # Add images and labels
            images = dataset.images.all()
            for img in images:
                # Add image file
                if img.image:
                    img_path = f"images/{img.filename}"
                    with img.image.open('rb') as f:
                        zip_file.writestr(img_path, f.read())
                    
                    # Add label file
                    annotations = img.annotations.all()
                    if annotations:
                        label_filename = os.path.splitext(img.filename)[0] + '.txt'
                        label_lines = []
                        for ann in annotations:
                            class_idx = dataset.classes.index(ann.class_name) if ann.class_name in dataset.classes else 0
                            label_lines.append(
                                f"{class_idx} {ann.x_center} {ann.y_center} {ann.width} {ann.height}"
                            )
                        zip_file.writestr(f"labels/{label_filename}", '\n'.join(label_lines))
        
        # Return ZIP file
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{dataset.name}_yolo.zip"'
        return response
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser])
    def batch_upload(self, request, pk=None):
        """Batch upload images from folder"""
        dataset = self.get_object()
        files = request.FILES.getlist('images')
        
        uploaded_count = 0
        errors = []
        
        for file in files:
            try:
                # Get image dimensions
                img = Image.open(file)
                width, height = img.width, img.height
                
                # Create LabeledImage
                LabeledImage.objects.create(
                    dataset=dataset,
                    image=file,
                    filename=file.name,
                    width=width,
                    height=height
                )
                uploaded_count += 1
            except Exception as e:
                errors.append(f"{file.name}: {str(e)}")
        
        return Response({
            'uploaded': uploaded_count,
            'total': len(files),
            'errors': errors
        })
    
    @action(detail=True, methods=['post'])
    def auto_split(self, request, pk=None):
        """Automatically assign images to train/valid/test splits based on dataset ratios"""
        import random
        
        dataset = self.get_object()
        images = list(dataset.images.all())
        
        if not images:
            return Response({'error': 'No images to split'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Shuffle images for random assignment
        random.shuffle(images)
        
        # Calculate split counts
        total = len(images)
        train_count = int(total * dataset.train_split / 100)
        valid_count = int(total * dataset.valid_split / 100)
        # Remaining goes to test
        test_count = total - train_count - valid_count
        
        # Assign splits
        for i, img in enumerate(images):
            if i < train_count:
                img.split = 'train'
            elif i < train_count + valid_count:
                img.split = 'valid'
            else:
                img.split = 'test'
            img.save()
        
        return Response({
            'status': 'success',
            'train': train_count,
            'valid': valid_count,
            'test': test_count,
            'total': total
        })


class LabeledImageViewSet(viewsets.ModelViewSet):
    """ViewSet for LabeledImage CRUD operations"""
    queryset = LabeledImage.objects.all()
    serializer_class = LabeledImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        queryset = LabeledImage.objects.all()
        dataset_id = self.request.query_params.get('dataset')
        if dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Upload image with auto-detection of dimensions"""
        image_file = request.FILES.get('image')
        if image_file:
            try:
                img = Image.open(image_file)
                request.data['width'] = img.width
                request.data['height'] = img.height
            except Exception:
                pass
        
        if not request.data.get('filename'):
            request.data['filename'] = image_file.name if image_file else 'unknown.jpg'
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def auto_annotate(self, request, pk=None):
        """Auto-annotate image using AI model (placeholder for future implementation)"""
        image = self.get_object()
        
        # Placeholder: In production, this would call your YOLO model
        # For now, return a message indicating it's not yet implemented
        
        # Future implementation:
        # 1. Load deployed AI model
        # 2. Run inference on image
        # 3. Create Annotation objects from detections
        # 4. Return detected boxes
        
        return Response({
            'status': 'pending',
            'message': 'Auto-annotation requires a deployed AI model. Train and deploy a model in MLOps first.',
            'image_id': image.id,
            'filename': image.filename
        })
    
    @action(detail=False, methods=['post'])
    def batch_auto_annotate(self, request):
        """Batch auto-annotate multiple images"""
        image_ids = request.data.get('image_ids', [])
        
        # Placeholder for batch processing
        return Response({
            'status': 'pending',
            'message': 'Batch auto-annotation will be available after model deployment',
            'queued': len(image_ids)
        })


class AnnotationViewSet(viewsets.ModelViewSet):
    """ViewSet for Annotation CRUD operations"""
    queryset = Annotation.objects.all()
    serializer_class = AnnotationSerializer
    
    def get_queryset(self):
        queryset = Annotation.objects.all()
        image_id = self.request.query_params.get('image')
        if image_id:
            queryset = queryset.filter(image_id=image_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create annotation and mark image as labeled"""
        response = super().create(request, *args, **kwargs)
        
        # Mark image as labeled
        image_id = request.data.get('image')
        if image_id:
            LabeledImage.objects.filter(id=image_id).update(is_labeled=True)
        
        return response


class SessionViewSet(viewsets.ModelViewSet):
    """ViewSet for Session (academic semester) CRUD operations"""
    queryset = Session.objects.all().order_by('-is_active', '-start_date', 'name')
    serializer_class = SessionSerializer
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set this session as the active one"""
        session = self.get_object()
        # Deactivate all others
        Session.objects.filter(is_active=True).update(is_active=False)
        # Activate this one
        session.is_active = True
        session.save()
        serializer = self.get_serializer(session)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active session"""
        try:
            session = Session.objects.get(is_active=True)
            serializer = self.get_serializer(session)
            return Response(serializer.data)
        except Session.DoesNotExist:
            return Response(
                {"detail": "No active session found"},
                status=status.HTTP_404_NOT_FOUND
            )


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for Course CRUD operations"""
    queryset = Course.objects.all().select_related('session', 'instructor')
    serializer_class = CourseSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer
    
    def get_queryset(self):
        queryset = Course.objects.all().select_related('session', 'instructor')
        session_id = self.request.query_params.get('session')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        instructor_id = self.request.query_params.get('instructor')
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)
        return queryset
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get all students enrolled in this course"""
        course = self.get_object()
        students = course.enrolled_students.all()
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Enroll students in this course"""
        course = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response({'error': 'student_ids required'}, status=status.HTTP_400_BAD_REQUEST)
        
        students = Student.objects.filter(id__in=student_ids)
        for student in students:
            student.enrolled_courses.add(course)
        
        return Response({
            'message': f'Enrolled {students.count()} students in {course.code}',
            'enrolled': [s.student_id for s in students]
        })
    
    @action(detail=True, methods=['post'])
    def unenroll(self, request, pk=None):
        """Remove students from this course"""
        course = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response({'error': 'student_ids required'}, status=status.HTTP_400_BAD_REQUEST)
        
        students = Student.objects.filter(id__in=student_ids)
        for student in students:
            student.enrolled_courses.remove(course)
        
        return Response({
            'message': f'Removed {students.count()} students from {course.code}',
            'removed': [s.student_id for s in students]
        })
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def import_pdf(self, request):
        """
        Import course and student data from attendance PDF.
        
        Expected PDF format (Malaysian polytechnic attendance sheet):
        - SESI: 2:2025/2026 (semester:year)
        - KURSUS: DJJ40173 - ENGINEERING DESIGN
        - SEKSYEN: S3
        - PENSY. KURSUS: INSTRUCTOR NAME
        - Student table with: BIL, NO.PEND, NAMA PELAJAR, KELAS, JABATAN
        """
        import pdfplumber
        from accounts.models import User
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.lower().endswith('.pdf'):
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read PDF content
            pdf_bytes = BytesIO(file.read())
            text_content = ""
            
            with pdfplumber.open(pdf_bytes) as pdf:
                for page in pdf.pages:
                    text_content += page.extract_text() or ""
            
            # Parse header information
            session_match = re.search(r'SESI\s*[:\-]?\s*(\d+:\d{4}/\d{4})', text_content)
            course_match = re.search(r'KURSUS\s*[:\-]?\s*([A-Z]{2,3}\d+)\s*[\-–]\s*(.+?)(?:\n|SEKSYEN)', text_content, re.IGNORECASE)
            section_match = re.search(r'SEKSYEN\s*[:\-]?\s*(\w+)', text_content)
            instructor_match = re.search(r'PENSY\.?\s*KURSUS\s*[:\-]?\s*(.+?)(?:\n|JABATAN)', text_content, re.IGNORECASE)
            
            if not session_match:
                return Response({'error': 'Could not find SESI (session) in PDF'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not course_match:
                return Response({'error': 'Could not find KURSUS (course) in PDF'}, status=status.HTTP_400_BAD_REQUEST)
            
            session_name = session_match.group(1).strip()
            course_code = course_match.group(1).strip()
            course_name = course_match.group(2).strip()
            section = section_match.group(1).strip() if section_match else 'S1'
            instructor_name = instructor_match.group(1).strip() if instructor_match else None
            
            # Get or create session
            session, session_created = Session.objects.get_or_create(
                name=session_name,
                defaults={'is_active': True}
            )
            
            # Find instructor by name
            instructor = None
            if instructor_name:
                # Try to find instructor by full name
                instructor = User.objects.filter(
                    role='instructor'
                ).filter(
                    first_name__icontains=instructor_name.split()[0] if instructor_name else ''
                ).first()
            
            # Get or create course
            course, course_created = Course.objects.get_or_create(
                code=course_code,
                section=section,
                session=session,
                defaults={
                    'name': course_name,
                    'instructor': instructor
                }
            )
            
            # Parse student table
            # Look for rows with: BIL, NO.PEND/NO_PEND, NAMA PELAJAR, KELAS, JABATAN
            student_pattern = re.compile(
                r'^\s*(\d+)\s+([A-Z0-9]+)\s+(.+?)\s+([A-Z0-9]+|KELAS)\s+([A-Z]+)\s*$',
                re.MULTILINE | re.IGNORECASE
            )
            
            created_students = []
            existing_students = []
            enrolled_students = []
            class_groups_created = []
            
            for match in student_pattern.finditer(text_content):
                bil, student_id, name, class_name, department = match.groups()
                name = name.strip()
                class_name = class_name.upper()
                department = department.upper()
                
                # Skip header row
                if class_name == 'KELAS':
                    continue
                
                # Get or create class group (home class)
                class_group, cg_created = ClassGroup.objects.get_or_create(
                    name=class_name,
                    defaults={'department': department}
                )
                if cg_created and class_name not in class_groups_created:
                    class_groups_created.append(class_name)
                
                # Get or create student (update if exists to fix potential bad data)
                student, s_created = Student.objects.update_or_create(
                    student_id=student_id,
                    defaults={
                        'name': name,
                        'class_group': class_group,
                        'department': department
                    }
                )
                
                if s_created:
                    created_students.append(f"{student_id} - {name}")
                    
                    # Create user account
                    if not User.objects.filter(username=student_id).exists():
                        name_parts = name.split(' ', 1)
                        User.objects.create_user(
                            username=student_id,
                            password=student_id,
                            first_name=name_parts[0],
                            last_name=name_parts[1] if len(name_parts) > 1 else '',
                            role=User.Role.STUDENT,
                            is_approved=True,
                            must_change_password=True,
                            student_profile=student
                        )
                else:
                    existing_students.append(f"{student_id} - {name}")
                
                # Enroll student in course
                student.enrolled_courses.add(course)
                enrolled_students.append(student_id)
            
            return Response({
                'success': True,
                'session': {
                    'name': session_name,
                    'created': session_created
                },
                'course': {
                    'code': course_code,
                    'name': course_name,
                    'section': section,
                    'created': course_created
                },
                'instructor_found': instructor_name if instructor else None,
                'class_groups_created': class_groups_created,
                'students_created': len(created_students),
                'students_existing': len(existing_students),
                'students_enrolled': len(enrolled_students),
                'details': {
                    'created': created_students[:10],  # First 10 for preview
                    'existing': existing_students[:10]
                }
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to process PDF: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
