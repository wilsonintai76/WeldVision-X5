"""
PDF Report Generation for Student Evaluations
"""
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_evaluation_report(evaluation, include_details=True):
    """
    Generate a PDF report for a student evaluation.
    
    Args:
        evaluation: StudentEvaluation instance
        include_details: Include detailed criterion breakdowns
        
    Returns:
        BytesIO: PDF file buffer
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a5f')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#2d4a6f')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=12,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#4a5568')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Build story (content)
    story = []
    
    # Header
    story.append(Paragraph("WeldVision X5", title_style))
    story.append(Paragraph("Student Evaluation Report", styles['Heading2']))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6')))
    story.append(Spacer(1, 12))
    
    # Student Information Section
    story.append(Paragraph("Student Information", heading_style))
    
    student = evaluation.student
    student_data = [
        ['Student ID:', student.student_id],
        ['Name:', student.name],
        ['Class:', student.class_group.name if student.class_group else 'N/A'],
        ['Email:', student.email or 'N/A'],
    ]
    
    student_table = Table(student_data, colWidths=[100, 300])
    student_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 12))
    
    # Evaluation Summary Section
    story.append(Paragraph("Evaluation Summary", heading_style))
    
    # Determine result color
    if evaluation.passed:
        result_text = "PASSED"
        result_color = colors.HexColor('#22c55e')
    else:
        result_text = "FAILED"
        result_color = colors.HexColor('#ef4444')
    
    summary_data = [
        ['Rubric:', evaluation.rubric.name if evaluation.rubric else 'N/A'],
        ['Evaluator:', evaluation.evaluator or 'System'],
        ['Date:', evaluation.created_at.strftime('%Y-%m-%d %H:%M')],
        ['Duration:', f"{evaluation.duration_seconds // 60} min {evaluation.duration_seconds % 60} sec" if evaluation.duration_seconds else 'N/A'],
        ['Total Score:', f"{evaluation.total_score:.2f} / 5.00"],
        ['Passing Score:', f"{evaluation.rubric.passing_score:.2f}" if evaluation.rubric else 'N/A'],
        ['Result:', result_text],
    ]
    
    summary_table = Table(summary_data, colWidths=[100, 300])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (1, -1), (1, -1), result_color),
        ('FONTNAME', (1, -1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (1, -1), (1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))
    
    # Score Visualization
    story.append(Paragraph("Score Overview", heading_style))
    
    # Create a visual score bar
    score_percent = (evaluation.total_score / 5.0) * 100
    passing_percent = (evaluation.rubric.passing_score / 5.0) * 100 if evaluation.rubric else 60
    
    score_bar_data = [[
        f"Score: {evaluation.total_score:.2f}/5.00 ({score_percent:.0f}%)"
    ]]
    score_bar = Table(score_bar_data, colWidths=[400])
    
    if evaluation.passed:
        bar_color = colors.HexColor('#22c55e')
    else:
        bar_color = colors.HexColor('#ef4444')
    
    score_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bar_color),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#1e3a5f')),
    ]))
    story.append(score_bar)
    story.append(Spacer(1, 16))
    
    # Criterion Scores Section
    if include_details and evaluation.criterion_scores.exists():
        story.append(Paragraph("Criterion Breakdown", heading_style))
        
        # Table header
        criteria_data = [['Criterion', 'Category', 'Weight', 'Score', 'Weighted']]
        
        total_weighted = 0
        total_weight = 0
        
        for cs in evaluation.criterion_scores.select_related('criterion').order_by('criterion__order'):
            criterion = cs.criterion
            weighted_score = cs.score * criterion.weight
            total_weighted += weighted_score
            total_weight += criterion.weight
            
            criteria_data.append([
                criterion.name,
                criterion.get_category_display(),
                f"{criterion.weight:.1f}",
                f"{cs.score}/5",
                f"{weighted_score:.2f}"
            ])
        
        # Add total row
        criteria_data.append([
            'TOTAL',
            '',
            f"{total_weight:.1f}",
            '',
            f"{total_weighted:.2f}"
        ])
        
        criteria_table = Table(criteria_data, colWidths=[150, 100, 50, 50, 60])
        criteria_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Body
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Alternating rows
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8fafc')]),
            
            # Total row
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1e3a5f')),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(criteria_table)
        story.append(Spacer(1, 16))
    
    # Weld Images Section (if available from linked assessment)
    if hasattr(evaluation, 'assessment') and evaluation.assessment:
        assessment = evaluation.assessment
        story.append(Paragraph("Weld Inspection Images", heading_style))
        
        # Original Image
        if assessment.image_original and assessment.image_original.path:
            try:
                from django.conf import settings
                import os
                
                story.append(Paragraph("Original Image", subheading_style))
                img_path = assessment.image_original.path
                
                if os.path.exists(img_path):
                    img = Image(img_path, width=4*inch, height=3*inch)
                    story.append(img)
                    story.append(Spacer(1, 8))
            except Exception as e:
                story.append(Paragraph(f"Original image unavailable", normal_style))
                story.append(Spacer(1, 8))
        
        # Heatmap/Detection Image
        if assessment.image_heatmap and assessment.image_heatmap.path:
            try:
                story.append(Paragraph("AI Detection Results (with boundaries)", subheading_style))
                img_path = assessment.image_heatmap.path
                
                if os.path.exists(img_path):
                    img = Image(img_path, width=4*inch, height=3*inch)
                    story.append(img)
                    story.append(Spacer(1, 12))
                    
                    # Add caption
                    caption_style = ParagraphStyle(
                        'Caption',
                        parent=normal_style,
                        fontSize=8,
                        textColor=colors.HexColor('#64748b'),
                        alignment=TA_CENTER,
                        spaceBefore=4
                    )
                    story.append(Paragraph(
                        "Red boundaries indicate detected defects. Green indicates acceptable areas.",
                        caption_style
                    ))
                    story.append(Spacer(1, 16))
            except Exception as e:
                story.append(Paragraph(f"Detection heatmap unavailable", normal_style))
                story.append(Spacer(1, 16))
    
    # AI Metrics Section (if available)
    if evaluation.ai_metrics:
        story.append(Paragraph("AI-Detected Metrics", heading_style))
        
        metrics = evaluation.ai_metrics
        
        # Geometric metrics
        if 'geometric' in metrics or 'height' in metrics or 'width' in metrics:
            story.append(Paragraph("Geometric Measurements", subheading_style))
            
            geo_data = []
            if 'height' in metrics:
                geo_data.append(['Reinforcement Height:', f"{metrics['height']:.2f} mm"])
            if 'width' in metrics:
                geo_data.append(['Bead Width:', f"{metrics['width']:.2f} mm"])
            if 'geometric' in metrics:
                geo = metrics['geometric']
                if 'reinforcement_height_mm' in geo:
                    geo_data.append(['Reinforcement Height:', f"{geo['reinforcement_height_mm']:.2f} mm"])
                if 'bead_width_mm' in geo:
                    geo_data.append(['Bead Width:', f"{geo['bead_width_mm']:.2f} mm"])
            
            if geo_data:
                geo_table = Table(geo_data, colWidths=[150, 200])
                geo_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(geo_table)
                story.append(Spacer(1, 8))
        
        # Visual defects
        if 'defects' in metrics or 'visual' in metrics:
            story.append(Paragraph("Visual Defects Detected", subheading_style))
            
            defects = metrics.get('defects', metrics.get('visual', {}))
            defect_data = []
            
            defect_names = {
                'porosity': 'Porosity',
                'spatter': 'Spatter',
                'slagInclusion': 'Slag Inclusion',
                'slag_inclusion': 'Slag Inclusion',
                'burnThrough': 'Burn-Through',
                'burn_through': 'Burn-Through',
            }
            
            for key, label in defect_names.items():
                if key in defects:
                    count = defects[key]
                    status = '✓ OK' if count == 0 else f'⚠ {count} detected'
                    defect_data.append([f'{label}:', status])
            
            if defect_data:
                defect_table = Table(defect_data, colWidths=[150, 200])
                defect_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(defect_table)
        
        story.append(Spacer(1, 16))
    
    # Notes Section
    if evaluation.notes:
        story.append(Paragraph("Evaluator Notes", heading_style))
        story.append(Paragraph(evaluation.notes, normal_style))
        story.append(Spacer(1, 16))
    
    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1')))
    story.append(Spacer(1, 8))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    )
    
    story.append(Paragraph(
        f"Generated by WeldVision X5 on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        footer_style
    ))
    story.append(Paragraph(
        "This report is automatically generated based on AI-assisted evaluation.",
        footer_style
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer


def generate_student_summary_report(student, evaluations):
    """
    Generate a summary PDF report for all evaluations of a student.
    
    Args:
        student: Student instance
        evaluations: QuerySet of StudentEvaluation instances
        
    Returns:
        BytesIO: PDF file buffer
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a5f')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#2d4a6f')
    )
    
    story = []
    
    # Header
    story.append(Paragraph("WeldVision X5", title_style))
    story.append(Paragraph("Student Progress Report", styles['Heading2']))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6')))
    story.append(Spacer(1, 12))
    
    # Student Information
    story.append(Paragraph("Student Information", heading_style))
    
    student_data = [
        ['Student ID:', student.student_id],
        ['Name:', student.name],
        ['Class:', student.class_group.name if student.class_group else 'N/A'],
        ['Total Evaluations:', str(evaluations.count())],
        ['Pass Rate:', f"{(evaluations.filter(passed=True).count() / evaluations.count() * 100):.0f}%" if evaluations.count() > 0 else 'N/A'],
    ]
    
    student_table = Table(student_data, colWidths=[120, 280])
    student_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 16))
    
    # Evaluation History
    story.append(Paragraph("Evaluation History", heading_style))
    
    if evaluations.exists():
        eval_data = [['Date', 'Rubric', 'Score', 'Result']]
        
        for ev in evaluations.order_by('-created_at')[:20]:
            result = 'PASS' if ev.passed else 'FAIL'
            eval_data.append([
                ev.created_at.strftime('%Y-%m-%d %H:%M'),
                ev.rubric.name if ev.rubric else 'N/A',
                f"{ev.total_score:.2f}/5",
                result
            ])
        
        eval_table = Table(eval_data, colWidths=[100, 150, 70, 60])
        eval_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(eval_table)
    else:
        story.append(Paragraph("No evaluations recorded yet.", styles['Normal']))
    
    story.append(Spacer(1, 16))
    
    # Statistics
    if evaluations.exists():
        story.append(Paragraph("Statistics", heading_style))
        
        from django.db.models import Avg, Max, Min
        stats = evaluations.aggregate(
            avg_score=Avg('total_score'),
            max_score=Max('total_score'),
            min_score=Min('total_score')
        )
        
        stats_data = [
            ['Average Score:', f"{stats['avg_score']:.2f}/5" if stats['avg_score'] else 'N/A'],
            ['Highest Score:', f"{stats['max_score']:.2f}/5" if stats['max_score'] else 'N/A'],
            ['Lowest Score:', f"{stats['min_score']:.2f}/5" if stats['min_score'] else 'N/A'],
            ['Total Passed:', str(evaluations.filter(passed=True).count())],
            ['Total Failed:', str(evaluations.filter(passed=False).count())],
        ]
        
        stats_table = Table(stats_data, colWidths=[120, 200])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(stats_table)
    
    # Footer
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1')))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    )
    
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generated by WeldVision X5 on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        footer_style
    ))
    
    doc.build(story)
    buffer.seek(0)
    
    return buffer


def generate_class_report(class_group):
    """
    Generate a PDF report for an entire class showing all students and their evaluation results.
    
    Args:
        class_group: ClassGroup instance
        
    Returns:
        BytesIO: PDF file buffer
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a5f')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#2d4a6f')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    story = []
    
    # Header
    story.append(Paragraph("WeldVision X5", title_style))
    story.append(Paragraph("Class Evaluation Report", styles['Heading2']))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6')))
    story.append(Spacer(1, 12))
    
    # Class Information
    story.append(Paragraph("Class Information", heading_style))
    
    class_data = [
        ['Class Name:', class_group.name],
        ['Instructor:', class_group.instructor or 'N/A'],
        ['Semester:', class_group.semester or 'N/A'],
        ['Total Students:', str(class_group.students.count())],
        ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M')],
    ]
    
    class_table = Table(class_data, colWidths=[120, 280])
    class_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(class_table)
    story.append(Spacer(1, 16))
    
    # Get all students in the class with their latest evaluation
    students = class_group.students.all().order_by('student_id')
    
    if students.exists():
        story.append(Paragraph("Student Evaluation Summary", heading_style))
        
        # Build student table data
        student_data = [['Student ID', 'Name', 'Evaluations', 'Latest Score', 'Pass Rate', 'Status']]
        
        from django.db.models import Count, Avg
        
        overall_pass_count = 0
        overall_fail_count = 0
        overall_total_evals = 0
        
        for student in students:
            evaluations = student.evaluations.all()
            eval_count = evaluations.count()
            overall_total_evals += eval_count
            
            if eval_count > 0:
                # Get latest evaluation
                latest_eval = evaluations.first()
                latest_score = f"{latest_eval.total_score:.2f}/5"
                
                # Calculate pass rate
                pass_count = evaluations.filter(passed=True).count()
                fail_count = evaluations.filter(passed=False).count()
                pass_rate = f"{(pass_count / eval_count * 100):.0f}%" if eval_count > 0 else '0%'
                
                overall_pass_count += pass_count
                overall_fail_count += fail_count
                
                # Determine status
                if latest_eval.passed:
                    status = 'PASS'
                else:
                    status = 'FAIL'
                
                student_data.append([
                    student.student_id,
                    student.name,
                    str(eval_count),
                    latest_score,
                    pass_rate,
                    status
                ])
            else:
                student_data.append([
                    student.student_id,
                    student.name,
                    '0',
                    'N/A',
                    'N/A',
                    'No Data'
                ])
        
        # Create the table
        student_table = Table(student_data, colWidths=[80, 110, 60, 60, 55, 50])
        
        # Style the table
        table_style = [
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Body
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Alternating rows
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1e3a5f')),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]
        
        # Color code status column
        for i, row in enumerate(student_data[1:], start=1):
            if row[5] == 'PASS':
                table_style.append(('TEXTCOLOR', (5, i), (5, i), colors.HexColor('#22c55e')))
                table_style.append(('FONTNAME', (5, i), (5, i), 'Helvetica-Bold'))
            elif row[5] == 'FAIL':
                table_style.append(('TEXTCOLOR', (5, i), (5, i), colors.HexColor('#ef4444')))
                table_style.append(('FONTNAME', (5, i), (5, i), 'Helvetica-Bold'))
        
        student_table.setStyle(TableStyle(table_style))
        story.append(student_table)
        story.append(Spacer(1, 16))
        
        # Class Statistics
        story.append(Paragraph("Class Statistics", heading_style))
        
        overall_pass_rate = (overall_pass_count / overall_total_evals * 100) if overall_total_evals > 0 else 0
        students_with_evals = sum(1 for s in students if s.evaluations.count() > 0)
        
        # Get average score across all evaluations
        from rubrics.models import StudentEvaluation
        all_evals = StudentEvaluation.objects.filter(student__class_group=class_group)
        avg_score = all_evals.aggregate(Avg('total_score'))['total_score__avg'] or 0
        
        stats_data = [
            ['Total Students:', str(students.count())],
            ['Students with Evaluations:', str(students_with_evals)],
            ['Total Evaluations:', str(overall_total_evals)],
            ['Total Passed:', str(overall_pass_count)],
            ['Total Failed:', str(overall_fail_count)],
            ['Overall Pass Rate:', f"{overall_pass_rate:.1f}%"],
            ['Class Average Score:', f"{avg_score:.2f}/5"],
        ]
        
        stats_table = Table(stats_data, colWidths=[150, 200])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 16))
        
        # Performance Distribution
        story.append(Paragraph("Performance Distribution", heading_style))
        
        # Count students by performance level
        excellent = sum(1 for s in students if s.evaluations.exists() and s.evaluations.first().total_score >= 4.5)
        good = sum(1 for s in students if s.evaluations.exists() and 3.5 <= s.evaluations.first().total_score < 4.5)
        satisfactory = sum(1 for s in students if s.evaluations.exists() and 2.5 <= s.evaluations.first().total_score < 3.5)
        needs_improvement = sum(1 for s in students if s.evaluations.exists() and s.evaluations.first().total_score < 2.5)
        
        perf_data = [
            ['Performance Level', 'Count', 'Percentage'],
            ['Excellent (4.5-5.0)', str(excellent), f"{(excellent/students_with_evals*100):.0f}%" if students_with_evals > 0 else '0%'],
            ['Good (3.5-4.4)', str(good), f"{(good/students_with_evals*100):.0f}%" if students_with_evals > 0 else '0%'],
            ['Satisfactory (2.5-3.4)', str(satisfactory), f"{(satisfactory/students_with_evals*100):.0f}%" if students_with_evals > 0 else '0%'],
            ['Needs Improvement (<2.5)', str(needs_improvement), f"{(needs_improvement/students_with_evals*100):.0f}%" if students_with_evals > 0 else '0%'],
        ]
        
        perf_table = Table(perf_data, colWidths=[180, 80, 100])
        perf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(perf_table)
        
    else:
        story.append(Paragraph("No students enrolled in this class.", normal_style))
    
    # Footer
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1')))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    )
    
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Generated by WeldVision X5 on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        footer_style
    ))
    story.append(Paragraph(
        f"Class Report - {class_group.name}",
        footer_style
    ))
    
    doc.build(story)
    buffer.seek(0)
    
    return buffer
