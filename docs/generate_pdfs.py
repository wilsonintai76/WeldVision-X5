#!/usr/bin/env python3
"""
Generate PDFs for WeldVision X5 – Research Paper and Executive Summary.
Uses ReportLab (pure Python) so no TeX installation is required.
Output: RESEARCH_PAPER.pdf, EXECUTIVE_SUMMARY.pdf
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import black, white, HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus.flowables import Flowable

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Colour Palette ────────────────────────────────────────────
DARK_BLUE   = HexColor('#1a3a5c')
MED_BLUE    = HexColor('#2e6da4')
LIGHT_BLUE  = HexColor('#d4e6f1')
LIGHT_GRAY  = HexColor('#f4f4f4')
MED_GRAY    = HexColor('#cccccc')
DARK_GRAY   = HexColor('#333333')
ORANGE      = HexColor('#c86400')

A4_W, A4_H = A4
LEFT_MARGIN = RIGHT_MARGIN = 2.2 * cm
TOP_MARGIN = BOTTOM_MARGIN = 2.5 * cm
USABLE_W = A4_W - LEFT_MARGIN - RIGHT_MARGIN


# ── Coloured rule ─────────────────────────────────────────────
class ColoredLine(Flowable):
    def __init__(self, width, color=DARK_BLUE, thickness=1.2):
        Flowable.__init__(self)
        self.width = width
        self.color = color
        self.thickness = thickness
        self.height = thickness + 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.thickness / 2, self.width, self.thickness / 2)


# ── Styles ────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()
    s = {}

    def add(name, **kw):
        s[name] = ParagraphStyle(name, **kw)

    add('DocTitle',
        fontName='Times-Bold', fontSize=16, leading=22,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=4,
        textColor=DARK_BLUE)

    add('DocSubtitle',
        fontName='Times-Roman', fontSize=12, leading=16,
        alignment=TA_CENTER, spaceBefore=2, spaceAfter=2, textColor=DARK_GRAY)

    add('Institution',
        fontName='Times-Italic', fontSize=11, leading=14,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=10, textColor=DARK_GRAY)

    add('SectionLabel',
        fontName='Times-Bold', fontSize=9, leading=11,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=2, textColor=MED_BLUE)

    add('AbstractHead',
        fontName='Times-Bold', fontSize=11, leading=14,
        alignment=TA_CENTER, spaceBefore=8, spaceAfter=3, textColor=DARK_BLUE)

    add('Abstract',
        fontName='Times-Roman', fontSize=10, leading=14,
        alignment=TA_JUSTIFY, leftIndent=1.2*cm, rightIndent=1.2*cm,
        spaceBefore=0, spaceAfter=4)

    add('Keywords',
        fontName='Times-Roman', fontSize=10, leading=13,
        alignment=TA_JUSTIFY, leftIndent=1.2*cm, rightIndent=1.2*cm,
        spaceBefore=4, spaceAfter=10)

    add('H1',
        fontName='Times-Bold', fontSize=13, leading=17,
        alignment=TA_LEFT, spaceBefore=14, spaceAfter=5, textColor=DARK_BLUE)

    add('H2',
        fontName='Times-Bold', fontSize=11, leading=14,
        alignment=TA_LEFT, spaceBefore=10, spaceAfter=4, textColor=DARK_BLUE)

    add('H3',
        fontName='Times-BoldItalic', fontSize=10.5, leading=13,
        alignment=TA_LEFT, spaceBefore=8, spaceAfter=3, textColor=DARK_GRAY)

    add('Body',
        fontName='Times-Roman', fontSize=10.5, leading=14.5,
        alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=6)

    add('Bullet',
        fontName='Times-Roman', fontSize=10.5, leading=14.5,
        alignment=TA_JUSTIFY, leftIndent=0.7*cm, firstLineIndent=0,
        bulletFontName='Times-Roman', bulletFontSize=10.5,
        spaceBefore=2, spaceAfter=2)

    add('Numbered',
        fontName='Times-Roman', fontSize=10.5, leading=14.5,
        alignment=TA_JUSTIFY, leftIndent=0.8*cm, firstLineIndent=-0.6*cm,
        spaceBefore=2, spaceAfter=2)

    add('Caption',
        fontName='Times-Bold', fontSize=9.5, leading=12,
        alignment=TA_CENTER, spaceBefore=8, spaceAfter=4, textColor=DARK_GRAY)

    add('Math',
        fontName='Times-Italic', fontSize=11.5, leading=18,
        alignment=TA_CENTER, spaceBefore=8, spaceAfter=8)

    add('MathLabel',
        fontName='Times-Roman', fontSize=10, leading=14,
        alignment=TA_CENTER, spaceBefore=2, spaceAfter=6, textColor=DARK_GRAY)

    add('Ref',
        fontName='Times-Roman', fontSize=9.5, leading=13,
        alignment=TA_JUSTIFY, leftIndent=0.8*cm, firstLineIndent=-0.8*cm,
        spaceBefore=2, spaceAfter=2)

    add('RefHead',
        fontName='Times-Bold', fontSize=13, leading=17,
        alignment=TA_LEFT, spaceBefore=14, spaceAfter=8, textColor=DARK_BLUE)

    # Executive Summary specific
    add('ES_Title',
        fontName='Times-Bold', fontSize=22, leading=28,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=2,
        textColor=white)

    add('ES_Subtitle',
        fontName='Times-Roman', fontSize=13, leading=17,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=0, textColor=white)

    add('ES_H1',
        fontName='Times-Bold', fontSize=12, leading=15,
        alignment=TA_LEFT, spaceBefore=12, spaceAfter=5,
        textColor=white, backColor=MED_BLUE,
        leftIndent=-4, rightIndent=-4,
        borderPad=4)

    add('ES_Body',
        fontName='Times-Roman', fontSize=10.5, leading=15,
        alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=6)

    add('ES_Bullet',
        fontName='Times-Roman', fontSize=10.5, leading=15,
        alignment=TA_JUSTIFY, leftIndent=0.7*cm,
        spaceBefore=2, spaceAfter=2)

    add('ES_Caption',
        fontName='Times-Bold', fontSize=9.5, leading=12,
        alignment=TA_CENTER, spaceBefore=8, spaceAfter=4)

    add('ES_Footer',
        fontName='Times-Italic', fontSize=8.5, leading=11,
        alignment=TA_CENTER, spaceBefore=0, spaceAfter=0, textColor=DARK_GRAY)

    return s


# ── Table helpers ─────────────────────────────────────────────
def hdr_style(col_widths, header_rows=1, font_size=9):
    """Standard table style with blue header."""
    return TableStyle([
        # Header
        ('BACKGROUND',   (0, 0), (-1, header_rows - 1), MED_BLUE),
        ('TEXTCOLOR',    (0, 0), (-1, header_rows - 1), white),
        ('FONTNAME',     (0, 0), (-1, header_rows - 1), 'Times-Bold'),
        ('FONTSIZE',     (0, 0), (-1, header_rows - 1), font_size),
        ('ALIGN',        (0, 0), (-1, header_rows - 1), 'CENTER'),
        # Body
        ('FONTNAME',     (0, header_rows), (-1, -1), 'Times-Roman'),
        ('FONTSIZE',     (0, header_rows), (-1, -1), font_size),
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        # Grid
        ('GRID',         (0, 0), (-1, -1), 0.4, MED_GRAY),
        ('LINEABOVE',    (0, 0), (-1, 0), 1.5, DARK_BLUE),
        ('LINEBELOW',    (0, -1), (-1, -1), 1.5, DARK_BLUE),
        # Padding
        ('TOPPADDING',   (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 4),
        ('LEFTPADDING',  (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ])


def alt_rows(style, n_rows, start=1):
    """Alternate row backgrounds starting from `start`."""
    for i in range(start, n_rows):
        bg = LIGHT_GRAY if i % 2 == 0 else white
        style.add('BACKGROUND', (0, i), (-1, i), bg)
    return style


def bold_last_row(style, n_rows):
    style.add('FONTNAME',   (0, n_rows - 1), (-1, n_rows - 1), 'Times-Bold')
    style.add('BACKGROUND', (0, n_rows - 1), (-1, n_rows - 1), LIGHT_BLUE)
    return style


def p(text, style):
    """Shorthand Paragraph factory."""
    return Paragraph(text, style)


# ══════════════════════════════════════════════════════════════
#  RESEARCH PAPER
# ══════════════════════════════════════════════════════════════
def build_research_paper(s):
    doc_path = os.path.join(DOCS_DIR, 'RESEARCH_PAPER.pdf')
    doc = SimpleDocTemplate(
        doc_path,
        pagesize=A4,
        leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
        title='WeldVision X5 – Research Paper',
        author='Politeknik Kuching Sarawak',
    )

    story = []

    # ── Title ────────────────────────────────────────────────
    story.append(p('WeldVision X5: An Edge–Cloud Hybrid Automated Vision System<br/>'
                   'for Student SMAW Welding Coupon Evaluation', s['DocTitle']))
    story.append(p('Politeknik Kuching Sarawak', s['DocSubtitle']))
    story.append(p('Department of Mechanical Engineering', s['Institution']))
    story.append(ColoredLine(USABLE_W, DARK_BLUE, 1.5))
    story.append(Spacer(1, 6))

    # ── Abstract ─────────────────────────────────────────────
    story.append(p('Abstract', s['AbstractHead']))
    story.append(p(
        'Manual assessment of Shielded Metal Arc Welding (SMAW) coupons in technical education is '
        'subjective, time-consuming, and lacks digital traceability. This paper presents <b>WeldVision X5</b>, '
        'an Industry 4.0 (IR 4.0) prototype that automates the evaluation of '
        '50 × 100 × 6 mm cast-iron butt-joint coupons using a hybrid edge-cloud architecture. '
        'The system employs an RDK X5 edge device with a stereo camera mounted on a repurposed Ender 3 gantry. '
        'A YOLOv8s object detection model runs on the RDK X5\'s BPU (NPU) to identify the weld region, '
        'spatter, undercut, and porosity, while Semi-Global Block Matching (SGBM) depth estimation runs on '
        'the multi-core CPU to extract geometric dimensions. Detection results are fused by a rubric engine '
        'to generate a scored assessment. The cloud backend, built entirely on Cloudflare\'s free tier '
        '(Workers, D1, R2, KV) using the Hono framework, provides a responsive React dashboard for '
        'instructors and stores all inspection data. Model training is performed on Google Colab, dataset '
        'management on Roboflow, and ONNX-to-Hobot conversion automated via GitHub Actions – all within '
        'free-tier limits. The prototype supports offline-first operation over LAN. Preliminary tests yield '
        'a YOLOv8s validation mAP@0.5 of 0.92, per-class F1 scores between 0.86–0.92, geometric measurement '
        'RMSE ≤ 0.38 mm, and a rubric-score correlation of r = 0.87 with human assessors. WeldVision X5 '
        'demonstrates a scalable, sustainable, low-cost solution for digital welding assessment that aligns '
        'with IR 4.0 principles.',
        s['Abstract'],
    ))
    story.append(p(
        '<b>Keywords:</b> SMAW welding inspection, YOLOv8, stereo vision, SGBM, edge computing, BPU, '
        'Cloudflare, IR 4.0, digital rubric, hybrid architecture',
        s['Keywords'],
    ))
    story.append(ColoredLine(USABLE_W, MED_GRAY, 0.5))
    story.append(Spacer(1, 6))

    # ── §1 Introduction ───────────────────────────────────────
    story.append(p('1.  Introduction', s['H1']))
    story.append(p(
        'Shielded Metal Arc Welding (SMAW) is a cornerstone skill in mechanical engineering and vocational '
        'training. Traditional evaluation of student welding coupons relies on manual inspection by '
        'instructors, who use physical gauges and visual checklists. This process is labour-intensive, prone '
        'to inter-assessor variability, and produces no permanent digital record of weld quality. With the '
        'emergence of Industry 4.0 (IR 4.0), there is a growing imperative to integrate smart sensors, '
        'artificial intelligence, and cloud connectivity into technical education to enhance objectivity, '
        'efficiency, and sustainability.',
        s['Body'],
    ))
    story.append(p(
        'The <b>WeldVision X5</b> project addresses this need by developing a fully automated vision-based '
        'prototype for the evaluation of SMAW butt-joint coupons. The system captures stereo images of welded '
        'specimens, performs deep-learning-based defect detection and classical stereo-based 3D reconstruction '
        'at the edge, and generates a rubric-based score that can be reviewed through a responsive web '
        'dashboard. By adopting a hybrid edge-cloud architecture, the prototype provides real-time feedback '
        'in the workshop while aggregating data in the cloud for long-term analytics and instructor oversight. '
        'All components – from the training pipeline to cloud services – are designed to operate within '
        'free-tier limits, minimising both capital and operational costs.',
        s['Body'],
    ))
    story.append(p(
        'This paper details the design, implementation, and preliminary evaluation of WeldVision X5, '
        'highlighting its alignment with IR 4.0 principles and its contribution to sustainable, accessible '
        'technical assessment.',
        s['Body'],
    ))

    # ── §2 Objectives ─────────────────────────────────────────
    story.append(p('2.  Objectives', s['H1']))
    objectives = [
        '<b>Develop</b> an automated prototype that evaluates student SMAW welding coupons against a '
        'standardised digital rubric.',
        '<b>Implement</b> a dual-stream vision pipeline that detects weld defects with a YOLOv8s model '
        'accelerated on an RDK X5 BPU and extracts geometric features through CPU-based SGBM depth estimation.',
        '<b>Build</b> a fully responsive web dashboard (desktop, tablet, mobile) enabling instructors to '
        'view live results, historical trends, interactive 3D point clouds, and a <b>manual override</b> for '
        'suspected internal defects.',
        '<b>Establish</b> a hybrid edge-cloud infrastructure that runs real-time inspection locally and '
        'synchronises data with Cloudflare serverless services, ensuring offline capability.',
        '<b>Incorporate</b> sustainability principles by digitising the inspection workflow, repurposing '
        'existing hardware, and optimising power consumption through dedicated BPU/CPU task allocation.',
        '<b>Demonstrate</b> key IR 4.0 elements: IoT interconnectivity, AI at the edge, cloud analytics, '
        'and digital traceability in technical education.',
    ]
    for i, obj in enumerate(objectives, 1):
        story.append(p(f'{i}.\u2002 {obj}', s['Numbered']))
    story.append(Spacer(1, 4))

    # ── §3 Significance ───────────────────────────────────────
    story.append(p('3.  Significance of the Study', s['H1']))
    significance = [
        '<b>Educational impact:</b> It provides an objective, consistent, and rapid surface-quality '
        'assessment tool, reducing instructor workload and enabling data-driven feedback to students.',
        '<b>Cost-efficiency:</b> The entire pipeline uses free-tier cloud services (Roboflow, Google Colab, '
        'Cloudflare, GitHub Actions) and a low-cost edge device, making the solution accessible to '
        'institutions with limited budgets.',
        '<b>Sustainability:</b> Repurposing an Ender 3 frame reduces e-waste; the RDK X5\'s BPU+CPU design '
        'consumes &lt;10 W, and paperless digital records eliminate physical rubrics.',
        '<b>Technological integration:</b> WeldVision X5 demonstrates a practical split-compute architecture '
        'where deep learning is offloaded to a dedicated NPU while classical computer vision remains on the '
        'CPU, offering a template for similar edge AI solutions.',
        '<b>Scalability:</b> The hybrid edge-cloud model enables multi-booth deployment with centralised '
        'monitoring, supporting large student cohorts without incremental cloud costs.',
    ]
    for sig in significance:
        story.append(p(f'• \u2002{sig}', s['Bullet']))
    story.append(Spacer(1, 4))

    # ── §4 Literature Review ──────────────────────────────────
    story.append(p('4.  Literature Review', s['H1']))

    story.append(p('4.1  Vision-Based Weld Inspection and Stereo Depth Estimation', s['H2']))
    story.append(p(
        'Automated visual inspection of welds has evolved from classical image processing to modern '
        'deep-learning approaches. Early methods relied on edge detection, thresholding, and morphological '
        'operators (Kumar et al., 2019), which were sensitive to lighting and surface finish. The YOLO family '
        '(Redmon &amp; Farhadi, 2018) revolutionised real-time object detection; YOLOv4 and YOLOv5 have '
        'been successfully applied to weld defect classification with mAP values exceeding 0.90 '
        '(Zhang et al., 2020; He et al., 2022). The latest iteration, YOLOv8 (Jocher et al., 2023), '
        'offers improved model efficiency and native ONNX export, making it ideal for edge deployment.',
        s['Body'],
    ))
    story.append(p(
        'For 3D geometry, stereo vision remains a non-contact standard. Hirschmüller\'s (2008) '
        'Semi-Global Matching (SGBM) algorithm balances accuracy and computational cost, outperforming '
        'local methods on textured industrial surfaces (Scharstein &amp; Szeliski, 2002). Kumar et al. '
        '(2019) coupled SGBM with structured light to measure weld bead dimensions with sub-millimetre '
        'error. While deep-learning stereo methods like StereoNet (Khamis et al., 2018) promise higher '
        'accuracy, they require GPU accelerators often unavailable on embedded platforms. WeldVision X5 '
        'addresses this gap by running SGBM entirely on the edge CPU while offloading object detection to '
        'a dedicated NPU.',
        s['Body'],
    ))

    story.append(p('4.2  Edge Computing Hardware for AI Inference', s['H2']))
    story.append(p(
        'Edge AI platforms are central to real-time industrial inspection. NVIDIA\'s Jetson modules '
        '(Nano, TX2) have been widely used for weld defect detection (Li et al., 2021) but consume '
        '5–15 W and typically require active cooling. Dedicated NPUs, such as the RDK X5\'s '
        'Bernoulli 2.0 BPU, deliver 10 TOPS (INT8) at less than 3 W (RDK X5 Manual, 2024). '
        'Lin et al. (2023) showed that partitioning a YOLOv5 model onto an NPU while handling sensor '
        'fusion on a multi-core ARM CPU reduces total energy by 40% compared to a GPU-only approach. '
        'Chen &amp; Ran (2019) concluded that hybrid CPU+NPU architectures are optimal for real-time '
        'industrial IoT applications. WeldVision X5 leverages this insight: the BPU accelerates '
        'YOLOv8s, while the CPU executes the deterministic SGBM pipeline, ensuring real-time '
        'performance within a 10 W envelope.',
        s['Body'],
    ))

    story.append(p('4.3  Cloud-Native Frameworks and Hybrid Edge-Cloud Architectures', s['H2']))
    story.append(p(
        'Serverless platforms enable scalable, pay-per-request backends ideal for sporadic IoT data. '
        'Cloudflare Workers provide a globally distributed edge network, while the Hono framework '
        '(Wada, 2023) simplifies building APIs with TypeScript. D1 (relational database) and R2 '
        '(zero-egress object storage) extend this to full data management (Cloudflare, 2024). For '
        'frontends, React with Tailwind CSS enables responsive, mobile-first dashboards (Ene et al., '
        '2022). Hybrid edge-cloud architectures, originating from cloudlet (Satyanarayanan et al., '
        '2009) and fog computing (Bonomi et al., 2012) concepts, have been applied to weld inspection '
        'by Xu et al. (2022), who used an edge GPU for inference and cloud for reporting. WeldVision X5 '
        'follows a similar model but uses an entirely free-tier Cloudflare backend, making it uniquely '
        'affordable for educational institutions.',
        s['Body'],
    ))

    # ── §5 Methodology ────────────────────────────────────────
    story.append(p('5.  Methodology', s['H1']))

    story.append(p('5.1  System Overview', s['H2']))
    sys_layers = [
        '<b>Edge Inspection Station:</b> RDK X5, RDK Stereo Camera SC230AI, repurposed Ender 3 gantry, '
        'and two high-CRI LED panels.',
        '<b>Edge Software:</b> A C++/Python pipeline that captures rectified stereo pairs, runs YOLOv8s '
        'on the BPU, computes SGBM depth on the CPU, extracts geometric features, and applies a '
        'configurable rubric engine.',
        '<b>Cloud Services:</b> Hono API on Cloudflare Workers, D1 database, R2 object storage, KV for '
        'configuration, and a React dashboard deployed on Cloudflare Pages. The dashboard includes a '
        '<b>manual rejection</b> control for instructors to flag coupons suspected of internal defects.',
    ]
    for layer in sys_layers:
        story.append(p(f'• \u2002{layer}', s['Bullet']))
    story.append(Spacer(1, 4))

    story.append(p('5.2  Hardware Configuration', s['H2']))
    story.append(p(
        'The RDK X5 board features 8 GB LPDDR4 RAM, 32 GB eMMC, quad-core ARM Cortex-A55 @ 1.8 GHz, '
        'and a Bernoulli 2.0 BPU (10 TOPS INT8). The SC230AI stereo camera provides synchronised '
        '2.3 MP global-shutter images with a 60 mm baseline. The Ender 3 frame, stripped of its '
        'extruder, moves the camera along the weld coupon via G-code commands sent over USB serial. '
        'Two 20 W LED panels (CRI &gt;90, &gt;4000 lux) provide uniform, shadow-free illumination.',
        s['Body'],
    ))

    story.append(p('5.3  Vision Pipeline', s['H2']))
    story.append(p('5.3.1  Calibration and Rectification', s['H3']))
    story.append(p(
        'Stereo calibration using a chessboard (Zhang, 2000) yields intrinsic and extrinsic parameters. '
        'Rectification maps are pre-computed with OpenCV\'s stereoRectify() and applied in real time on '
        'the CPU to align epipolar lines.',
        s['Body'],
    ))

    story.append(p('5.3.2  Object Detection (BPU)', s['H3']))
    story.append(p(
        'The rectified left image (640 × 640 px) is fed to a YOLOv8s model running on the BPU. The '
        'model detects four classes: weld_bead, spatter, undercut, porosity. Inference takes 28 ms, '
        'enabling real-time overlay as the gantry scans. The bounding box of the weld bead defines '
        'the region of interest (ROI) for geometric measurement.',
        s['Body'],
    ))

    story.append(p('5.3.3  3D Reconstruction via SGBM (CPU)', s['H3']))
    story.append(p(
        'Using the rectified stereo pair, OpenCV\'s StereoSGBM computes a disparity map '
        '(numDisparities = 128, blockSize = 11, uniqueness ratio 15). The disparity <i>d</i> is '
        'converted to depth <i>Z</i> via:',
        s['Body'],
    ))
    story.append(p('<i>Z  =  (f × B) / d</i> \u2003\u2003 (1)', s['Math']))
    story.append(p(
        'where <i>f</i> is the focal length in pixels and <i>B</i> the baseline in mm. '
        'Each valid pixel is back-projected to a 3D point:',
        s['Body'],
    ))
    story.append(p(
        '<i>X  =  (u \u2212 c<sub>x</sub>) · Z / f<sub>x</sub></i> \u2003,\u2003 '
        '<i>Y  =  (v \u2212 c<sub>y</sub>) · Z / f<sub>y</sub></i> \u2003\u2003 (2)',
        s['Math'],
    ))
    story.append(p(
        'The resulting point cloud is filtered with a pass-through (Z ∈ [200, 400] mm) and statistical '
        'outlier removal (SOR: 20 neighbours, σ = 2.0) to eliminate background and mismatches. '
        'The weld ROI from YOLO is projected into 3D to crop the point cloud to the weld bead region. '
        'Processing time per stereo pair is 1.18 s on the CPU.',
        s['Body'],
    ))

    story.append(p('5.3.4  Geometric Feature Extraction', s['H3']))
    story.append(p(
        'Multiple cross-sectional profiles perpendicular to the weld axis are taken every 2–3 mm. '
        'For each profile, the weld width, reinforcement height (max Z minus base plate Z), and '
        'undercut depth (local minima at the toes) are measured. Global uniformity is quantified as '
        'the standard deviation of width and height across all profiles.',
        s['Body'],
    ))

    story.append(p('5.4  Model Training and Deployment', s['H2']))
    training_bullets = [
        '<b>Dataset:</b> 1,200 stereo pairs captured in the workshop were uploaded to Roboflow (free '
        'tier). Left images were labelled with bounding boxes for the four defect classes. Augmentations '
        'included brightness, rotation, and blur.',
        '<b>Training:</b> YOLOv8s was trained on Google Colab\'s T4 GPU for 100 epochs, achieving a '
        'validation mAP@0.5 of 0.92. The best weights were exported to ONNX.',
        '<b>Conversion:</b> ONNX is converted to the RDK X5 BPU-compatible .bin format using a '
        'GitHub Actions workflow that triggers on every push, uploading the artifact to Cloudflare R2. '
        'The edge device pulls the latest model on boot.',
    ]
    for b in training_bullets:
        story.append(p(f'• \u2002{b}', s['Bullet']))
    story.append(Spacer(1, 4))

    # ── §5.5 Rubric Engine ────────────────────────────────────
    story.append(p('5.5  Digital Rubric Engine with Likert Scale Scoring', s['H2']))
    story.append(p(
        'A rule-based engine on the RDK X5 CPU compares measured dimensions and detected defects against '
        'predefined ranges. Unlike a simple pass/fail, the system assigns a <b>1–5 Likert score</b> for '
        'each criterion, reflecting the quality level from "Poor" to "Excellent". Each criterion carries '
        'a weight reflecting its importance in the overall assessment. The final grade is a weighted sum '
        'of the individual Likert scores.',
        s['Body'],
    ))

    # Table 1 – Rubric (full width, small font for 8 columns)
    story.append(p('Table 1: Rubric criteria, measurement method, Likert scale descriptors, and weights.',
                   s['Caption']))

    T1_FS = 7.2
    T1_LEAD = 9.5
    cell_style = ParagraphStyle('T1Cell', fontName='Times-Roman',
                                fontSize=T1_FS, leading=T1_LEAD, alignment=TA_LEFT)
    cell_hdr = ParagraphStyle('T1Hdr', fontName='Times-Bold',
                              fontSize=T1_FS, leading=T1_LEAD, alignment=TA_CENTER,
                              textColor=white)
    cell_ctr = ParagraphStyle('T1Ctr', fontName='Times-Roman',
                               fontSize=T1_FS, leading=T1_LEAD, alignment=TA_CENTER)

    def pc(t, st=None): return Paragraph(t, st or cell_style)
    def ph(t): return Paragraph(t, cell_hdr)
    def pct(t): return Paragraph(t, cell_ctr)

    t1_col_w = [2.3*cm, 2.5*cm, 1.85*cm, 1.85*cm, 1.85*cm, 1.85*cm, 1.95*cm, 1.0*cm]

    t1_data = [
        [ph('Criterion'), ph('Measurement\nMethod'),
         ph('Score 1\n(Poor)'), ph('Score 2\n(Fair)'), ph('Score 3\n(Good)'),
         ph('Score 4\n(Very Good)'), ph('Score 5\n(Excellent)'), ph('Wt.')],
        [pc('Weld width'), pc('Avg. profile width\nfrom SGBM (mm)'),
         pct('<5 or >10'), pct('5–5.9 or\n9.1–10'), pct('6–6.5 or\n8.5–9'),
         pct('6.6–6.9 or\n8.1–8.4'), pct('7–8'), pct('20%')],
        [pc('Reinforcement\nheight'), pc('Max profile height\nminus base plate (mm)'),
         pct('≤0 or ≥5'), pct('0.1–0.9 or\n4.1–5'), pct('1–1.5 or\n3.5–4'),
         pct('1.6–1.9 or\n3.1–3.4'), pct('2–3'), pct('25%')],
        [pc('Undercut\ndepth'), pc('Max toe valley\ndepth (mm)'),
         pct('≥1.5'), pct('1.0–1.4'), pct('0.6–0.9'), pct('0.3–0.5'), pct('≤0.2'), pct('20%')],
        [pc('Spatter\ncount'), pc('YOLOv8s detection\n(BPU)'),
         pct('>10'), pct('6–10'), pct('3–5'), pct('1–2'), pct('0'), pct('10%')],
        [pc('Surface\nporosity'), pc('YOLOv8s detection\n(pore count)'),
         pct('>5'), pct('3–5'), pct('2'), pct('1'), pct('0'), pct('10%')],
        [pc('Width\nuniformity'), pc('Std. dev. of width\nacross profiles (mm)'),
         pct('≥2.5'), pct('1.6–2.4'), pct('1.0–1.5'), pct('0.5–0.9'), pct('≤0.4'), pct('10%')],
        [pc('Height\nuniformity'), pc('Std. dev. of reinf.\nheight (mm)'),
         pct('≥2.0'), pct('1.1–1.9'), pct('0.6–1.0'), pct('0.3–0.5'), pct('≤0.2'), pct('5%')],
    ]

    t1_ts = hdr_style(t1_col_w, font_size=T1_FS)
    alt_rows(t1_ts, len(t1_data))
    t1 = Table(t1_data, colWidths=t1_col_w, repeatRows=1)
    t1.setStyle(t1_ts)
    story.append(t1)
    story.append(Spacer(1, 8))

    # Scoring formula
    story.append(p('Scoring Formula', s['H3']))
    story.append(p('The overall rubric score (0–100) is computed as:', s['Body']))
    story.append(p(
        'Score  =  \u03A3<sub>i=1</sub><sup>n</sup> '
        '[ (Likert<sub>i</sub> \u2212 1) / 4  ×  Weight<sub>i</sub>  ×  100 ]'
        '\u2003\u2003\u2003(3)',
        s['Math'],
    ))
    story.append(p(
        'where <i>n</i> = 7 criteria. The transformation (Likert − 1) / 4 converts the 1–5 scale to a '
        '0–1 normalised score before applying the weight.',
        s['Body'],
    ))

    # Example calculation table
    story.append(p('Table 2: Example score calculation for a representative "Good" coupon.', s['Caption']))
    t2_col_w = [5.5*cm, 2.2*cm, 2.2*cm, 2.2*cm, 3.1*cm]
    t2_data = [
        ['Criterion', 'Likert', 'Weight', 'Normalised', 'Weighted'],
        ['Weld width',           '4', '0.20', '0.75', '15.0'],
        ['Reinforcement height', '5', '0.25', '1.00', '25.0'],
        ['Undercut depth',       '3', '0.20', '0.50', '10.0'],
        ['Spatter count',        '4', '0.10', '0.75',  '7.5'],
        ['Surface porosity',     '5', '0.10', '1.00', '10.0'],
        ['Width uniformity',     '4', '0.10', '0.75',  '7.5'],
        ['Height uniformity',    '3', '0.05', '0.50',  '2.5'],
        ['Total',                '',  '',      '',     '77.5 / 100'],
    ]
    t2_ts = hdr_style(t2_col_w, font_size=9.5)
    for i in range(1, len(t2_data) - 1):
        t2_ts.add('ALIGN', (0, i), (0, i), 'LEFT')
        t2_ts.add('ALIGN', (1, i), (-1, i), 'CENTER')
    alt_rows(t2_ts, len(t2_data) - 1)
    bold_last_row(t2_ts, len(t2_data))
    t2_ts.add('ALIGN', (0, -1), (-1, -1), 'CENTER')
    t2 = Table(t2_data, colWidths=t2_col_w)
    t2.setStyle(t2_ts)
    story.append(t2)
    story.append(Spacer(1, 8))

    # Grade band table
    story.append(p('Table 3: Grade band mapping for automated rubric scores.', s['Caption']))
    t3_col_w = [3.2*cm, 2.5*cm, 9.5*cm]
    t3_data = [
        ['Score Range', 'Grade', 'Interpretation'],
        ['90–100', 'A', 'Excellent – Industry standard'],
        ['80–89',  'B', 'Very Good – Minor deviations'],
        ['70–79',  'C', 'Good – Acceptable with remarks'],
        ['60–69',  'D', 'Fair – Requires improvement'],
        ['< 60',   'F', 'Poor – Re-weld required'],
    ]
    t3_ts = hdr_style(t3_col_w, font_size=9.5)
    for i in range(1, len(t3_data)):
        t3_ts.add('ALIGN', (0, i), (1, i), 'CENTER')
        t3_ts.add('ALIGN', (2, i), (2, i), 'LEFT')
    alt_rows(t3_ts, len(t3_data))
    t3 = Table(t3_data, colWidths=t3_col_w)
    t3.setStyle(t3_ts)
    story.append(t3)
    story.append(Spacer(1, 8))

    story.append(p('Configurability', s['H3']))
    story.append(p(
        'The Likert thresholds, weights, and grade bands are stored as a JSONB object in Cloudflare KV. '
        'Instructors can modify them through the React dashboard without changing the edge-side code, '
        'allowing adaptation to different welding standards (e.g., AWS D1.1, ISO 5817) or course levels.',
        s['Body'],
    ))

    story.append(p('Engine Implementation', s['H3']))
    story.append(p(
        'The rubric engine is implemented in C++ on the RDK X5 CPU. After geometric feature extraction '
        'and YOLOv8s detection, the engine: (1) receives the measurement vector '
        '{avg_width, max_reinforcement, max_undercut, spatter_count, porosity_count, std_width, std_height}; '
        '(2) evaluates each criterion against the Likert ranges from the configuration; '
        '(3) computes the weighted sum (Eq. 3); and (4) outputs the total score, individual Likert scores, '
        'and suggested grade band to the inspection JSON payload. This Likert-based approach provides '
        'finer granularity than binary pass/fail, giving students diagnostic feedback on <i>how</i> to '
        'improve rather than simply whether they passed or failed.',
        s['Body'],
    ))

    story.append(p('5.6  Cloud Infrastructure, 3D Visualisation, and Manual Override', s['H2']))
    story.append(p('The Hono API on Cloudflare Workers exposes endpoints:', s['Body']))
    cloud_bullets = [
        '<b>POST /inspection</b> – accepts inspection JSON and images; stores metadata in D1, uploads '
        'point clouds (.pcd) and images to R2.',
        '<b>GET /history</b> – queries D1 with filters (student ID, date, defect type).',
        '<b>PATCH /inspection/:id/reject</b> – records an instructor\'s manual rejection with a reason '
        'code (e.g., "suspected lack of fusion").',
    ]
    for b in cloud_bullets:
        story.append(p(f'• \u2002{b}', s['Bullet']))
    story.append(p(
        'The React dashboard, hosted on Cloudflare Pages, fetches inspection records and point cloud '
        'URLs from the Workers API. The 3D point cloud is rendered client-side using Three.js\'s '
        'PCDLoader, providing an interactive, zero-cost visualisation that works on any WebGL-compatible '
        'browser, including tablets. An integrated <b>manual rejection button</b> allows instructors to '
        'override the automated score. When a coupon is flagged, the system marks it as '
        '"Rejected – pending further NDT" and alerts the student. This mechanism acknowledges that surface '
        'vision alone cannot detect internal defects such as lack of fusion; the pedagogical workflow '
        'assumes students self-assess their welds and submit only those they consider internally sound. '
        'The instructor retains final authority to require destructive or non-destructive internal '
        'examination.',
        s['Body'],
    ))

    story.append(p('5.7  Evaluation Metrics', s['H2']))
    story.append(p(
        'Detection performance is assessed using precision, recall, F1 score, and mAP@0.5. Geometric '
        'accuracy is evaluated with root-mean-square error (RMSE) against manual calliper measurements. '
        'Rubric score correlation with three human assessors is measured via Pearson\'s <i>r</i>.',
        s['Body'],
    ))

    # ── §6 Results ────────────────────────────────────────────
    story.append(p('6.  Results and Discussion', s['H1']))

    story.append(p('6.1  Object Detection Performance', s['H2']))
    story.append(p(
        'YOLOv8s achieved a validation mAP@0.5 of <b>0.92</b>. Per-class metrics at a confidence '
        'threshold of 0.5 are shown in Table 4. The high F1 scores confirm a balanced trade-off between '
        'false positives and false negatives, crucial for educational fairness.',
        s['Body'],
    ))

    story.append(p('Table 4: Per-class detection performance (confidence threshold = 0.5).', s['Caption']))
    t4_col_w = [4.5*cm, 3.5*cm, 3.0*cm, 3.5*cm]
    t4_data = [
        ['Defect Class', 'Precision', 'Recall', 'F1 Score'],
        ['Weld bead',       '0.94', '0.91', '0.92'],
        ['Spatter',         '0.89', '0.85', '0.87'],
        ['Undercut',        '0.91', '0.88', '0.89'],
        ['Porosity',        '0.88', '0.84', '0.86'],
        ['Macro average',   '0.91', '0.87', '0.89'],
    ]
    t4_ts = hdr_style(t4_col_w, font_size=9.5)
    for i in range(1, len(t4_data)):
        t4_ts.add('ALIGN', (0, i), (0, i), 'LEFT')
        t4_ts.add('ALIGN', (1, i), (-1, i), 'CENTER')
    alt_rows(t4_ts, len(t4_data))
    bold_last_row(t4_ts, len(t4_data))
    t4_ts.add('FONTNAME', (0, -1), (0, -1), 'Times-Bold')
    t4_ts.add('ALIGN', (0, -1), (0, -1), 'LEFT')
    t4 = Table(t4_data, colWidths=t4_col_w)
    t4.setStyle(t4_ts)
    story.append(t4)
    story.append(Spacer(1, 6))
    story.append(p('Inference on the BPU takes 28 ms per frame, enabling seamless real-time scanning.', s['Body']))

    story.append(p('6.2  Geometric Measurement Accuracy', s['H2']))
    story.append(p(
        'Comparison with manual calliper measurements on 50 coupons yielded RMSE values: weld width '
        '0.38 mm, reinforcement height 0.25 mm, undercut depth 0.09 mm. These errors lie within the '
        'typical ±0.5 mm tolerance of workshop rulers, confirming SGBM\'s adequacy for educational use.',
        s['Body'],
    ))

    story.append(p('6.3  Rubric Score Reliability', s['H2']))
    story.append(p(
        'The automated rubric scores correlated strongly with the average of three human instructors, '
        'with a Pearson correlation coefficient <i>r</i> = 0.87 (<i>n</i> = 50). A Bland-Altman '
        'analysis showed no systematic bias, indicating that the system can reliably replace a single '
        'human assessor for routine surface grading.',
        s['Body'],
    ))

    story.append(p('6.4  System Performance and Manual Rejection Workflow', s['H2']))
    story.append(p(
        'Total inspection time per coupon (5 stereo pairs) averages 8 s, well within acceptable '
        'workshop limits. Power consumption of the RDK X5 during operation is 7.8 W, and the entire '
        'edge station (rig, LEDs, controller) draws approximately 30 W. The cloud dashboard loads '
        'in under 2 s on mobile networks and successfully synchronises queued inspections after an '
        'offline period.',
        s['Body'],
    ))
    story.append(p(
        'During the trial period, instructors used the manual rejection feature on 6 out of 50 coupons '
        '(12%) where the 3D point cloud showed uneven bead contours suggestive of poor inter-run '
        'bonding, yet the automated surface score was acceptable. Those coupons were subsequently '
        'sectioned for macro-etch examination, and lack of fusion was confirmed in 4 of the 6 cases. '
        'This demonstrates that the combination of automated surface scoring and instructor-guided '
        'manual override effectively catches subsurface defects that would otherwise go unpenalised, '
        'reinforcing the educational requirement that students submit only internally sound welds.',
        s['Body'],
    ))

    story.append(p('6.5  Discussion', s['H2']))
    story.append(p(
        'The split-compute architecture (BPU for YOLO, CPU for SGBM) proved essential. Attempting to '
        'run SGBM on the BPU is not feasible due to its sequential nature, while running YOLO on the '
        'CPU resulted in 220 ms latency, too slow for real-time overlay. The combination maximises '
        'throughput within a minimal power budget. The free-tier cloud services handled over 2,000 '
        'inspections without cost, and the offline-first design ensured robustness in '
        'network-constrained environments. Instructors particularly valued the interactive 3D '
        'point-cloud viewer and the ability to manually flag suspect coupons, which preserves human '
        'judgment for internal defect detection.',
        s['Body'],
    ))
    story.append(p(
        'The F1 scores (0.86–0.92) demonstrate that the model achieves high precision and recall '
        'simultaneously, minimising both missed surface defects (which could falsely certify poor welds) '
        'and false alarms (which would penalise students unfairly). This balance is critical when '
        'assessment is automated.',
        s['Body'],
    ))

    # ── §7 Limitations ────────────────────────────────────────
    story.append(p('7.  Limitations', s['H1']))
    limitations = [
        '<b>Material and geometry constraint:</b> Trained and validated only on 50 × 100 × 6 mm '
        'cast-iron butt joints with E6013 electrodes. Performance on other materials or joint types '
        'is untested.',
        '<b>Lighting sensitivity:</b> SGBM accuracy degrades if LED illumination varies or ambient '
        'light intrudes; a controlled enclosure is recommended.',
        '<b>Surface-only inspection:</b> The vision system inspects only surface geometry and visible '
        'anomalies. Internal defects such as lack of fusion, slag inclusions, or root cracks cannot be '
        'detected. WeldVision X5 therefore operates as a surface-quality gate. Coupons suspected of '
        'internal flaws must be identified by the instructor, who can override the automated score via '
        'the <b>manual rejection</b> toggle in the dashboard, triggering a mandatory physical test '
        '(e.g., bend or macro-etch). This aligns with the pedagogical principle that students are '
        'expected to self-assess and submit only sound welds.',
        '<b>Limited defect taxonomy:</b> Only four surface defect classes are modelled; cracks, '
        'overlap, and other discontinuities are not detected.',
        '<b>SGBM speed:</b> 1.18 s per pair limits total inspection throughput; multi-threading or a '
        'lighter matching algorithm could improve speed.',
        '<b>Dataset diversity:</b> 1,200 images from a single workshop may not generalise to other '
        'environments without fine-tuning.',
        '<b>Validation scale:</b> Correlation was assessed with only 50 coupons; larger '
        'multi-institutional studies are needed.',
    ]
    for lim in limitations:
        story.append(p(f'• \u2002{lim}', s['Bullet']))
    story.append(Spacer(1, 4))

    # ── §8 Conclusion ─────────────────────────────────────────
    story.append(p('8.  Conclusion', s['H1']))
    story.append(p(
        'WeldVision X5 successfully demonstrates a low-cost, sustainable, IR 4.0-compliant prototype '
        'for automated evaluation of student SMAW welding coupons. By intelligently partitioning '
        'workloads – YOLOv8s on the RDK X5\'s BPU and SGBM depth estimation on its CPU – the system '
        'achieves real-time defect detection and accurate geometric measurement without expensive GPU '
        'hardware. The hybrid edge-cloud architecture, built entirely on free-tier Cloudflare services, '
        'provides a robust, offline-capable inspection station that synchronises data to a central '
        'instructor dashboard and delivers interactive 3D visualisations via client-side rendering.',
        s['Body'],
    ))
    story.append(p(
        'Critically, the system acknowledges its surface-only inspection capability: internal flaws '
        'such as lack of fusion cannot be detected algorithmically. The dashboard\'s <b>manual '
        'rejection</b> feature empowers instructors to flag suspicious coupons for further physical '
        'inspection, maintaining pedagogical integrity where students are taught to submit only '
        'internally sound welds. Preliminary results show high correlation with human assessments '
        '(r = 0.87), sub-millimetre measurement accuracy, and per-class F1 scores above 0.86. The '
        'system aligns with IR 4.0 principles of interconnectivity, transparency, and technical '
        'assistance, and it serves as a scalable template for bringing AI-driven quality inspection '
        'to vocational training programmes worldwide.',
        s['Body'],
    ))
    story.append(p(
        'Future work will extend the system to multiple materials and joint configurations, incorporate '
        'additional surface defect classes, explore lightweight CPU-based stereo matching for faster '
        'depth estimation, integrate a low-cost ultrasonic or eddy-current sensor for sub-surface '
        'inspection, and conduct large-scale validation studies to support adoption in accredited '
        'assessment frameworks.',
        s['Body'],
    ))

    # ── References ────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p('References', s['RefHead']))
    story.append(ColoredLine(USABLE_W, DARK_BLUE, 1.0))
    story.append(Spacer(1, 6))

    refs = [
        'Baldini, G., et al. (2017). Serverless computing: Current trends and open problems. '
        '<i>Research Advances in Cloud Computing</i>, pp. 1–20.',
        'Bonomi, F., Milito, R., Zhu, J., &amp; Addepalli, S. (2012). Fog computing and its role in the '
        'Internet of Things. <i>Proceedings of the MCC Workshop</i>, pp. 13–16.',
        'Chen, J., &amp; Ran, X. (2019). Deep learning with edge computing: A review. '
        '<i>Proceedings of the IEEE</i>, 107(8), 1655–1674.',
        'Cloudflare. (2024). <i>Workers, D1, R2 Documentation</i>. '
        'Retrieved from https://developers.cloudflare.com',
        'Ene, A., Bădicu, A., &amp; Lascu, I. (2022). Modern front-end technologies for industrial '
        'dashboards. <i>Int. J. Adv. Comp. Sci. Appl.</i>, 13(5).',
        'He, K., et al. (2022). YOLOv5 for real-time surface defect detection in manufacturing. '
        '<i>Journal of Intelligent Manufacturing</i>, 33(4), 1167–1179.',
        'Hirschmüller, H. (2008). Stereo processing by semiglobal matching and mutual information. '
        '<i>IEEE Transactions on Pattern Analysis and Machine Intelligence</i>, 30(2), 328–341.',
        'Jocher, G., Chaurasia, A., &amp; Qiu, J. (2023). <i>Ultralytics YOLOv8</i>. '
        'Retrieved from https://github.com/ultralytics/ultralytics',
        'Khamis, S., et al. (2018). StereoNet: Guided hierarchical refinement for real-time '
        'edge-aware depth prediction. <i>Proceedings of ECCV</i>.',
        'Kumar, S., Singh, R., &amp; Patel, V. (2019). Stereo vision-based weld bead geometry '
        'measurement. <i>Measurement</i>, 145, 234–243.',
        'Li, X., et al. (2021). Real-time weld defect detection on Jetson Nano. '
        '<i>IEEE Access</i>, 9, 154321–154330.',
        'Lin, J., Chen, W., &amp; Huang, T. (2023). Energy-efficient edge AI for industrial IoT. '
        '<i>IEEE Internet of Things Journal</i>, 10(12), 10981–10993.',
        'Redmon, J., &amp; Farhadi, A. (2018). YOLOv3: An incremental improvement. '
        '<i>arXiv:1804.02767</i>.',
        'RDK X5 Development Manual. (2024). <i>Horizon Robotics</i>.',
        'Satyanarayanan, M., et al. (2009). The case for VM-based cloudlets. '
        '<i>IEEE Pervasive Computing</i>, 8(4), 14–23.',
        'Scharstein, D., &amp; Szeliski, R. (2002). A taxonomy and evaluation of dense two-frame '
        'stereo correspondence algorithms. <i>International Journal of Computer Vision</i>, 47(1), 7–42.',
        'Wada, Y. (2023). <i>Hono – Ultrafast Web Framework for Cloudflare Workers</i>. '
        'Retrieved from https://hono.dev',
        'Xu, Y., et al. (2022). An edge-cloud collaborative weld defect detection system. '
        '<i>Journal of Manufacturing Processes</i>, 76, 428–439.',
        'Zhang, L., Wang, Y., &amp; Li, X. (2020). Deep learning-based welding defect detection '
        'using improved YOLOv4. <i>Welding in the World</i>, 64, 1837–1846.',
        'Zhang, Z. (2000). A flexible new technique for camera calibration. '
        '<i>IEEE Transactions on Pattern Analysis and Machine Intelligence</i>, 22(11), 1330–1334.',
    ]
    for i, ref in enumerate(refs, 1):
        story.append(p(f'{i}.\u2002 {ref}', s['Ref']))

    doc.build(story)
    return doc_path


# ══════════════════════════════════════════════════════════════
#  EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════════
def build_executive_summary(s):
    doc_path = os.path.join(DOCS_DIR, 'EXECUTIVE_SUMMARY.pdf')
    doc = SimpleDocTemplate(
        doc_path,
        pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        title='WeldVision X5 – Executive Summary',
        author='Politeknik Kuching Sarawak',
    )

    es_usable_w = A4_W - 5.0*cm
    story = []

    # ── Banner / Title Block ─────────────────────────────────
    banner_data = [[
        Paragraph(
            '<font color="white"><b><font size="20">WeldVision X5</font><br/>'
            '<font size="12">Automated Vision-Based Evaluation of Student SMAW Welding Coupons</font></b></font>',
            ParagraphStyle('BannerText', fontName='Times-Bold', fontSize=20,
                           leading=26, alignment=TA_CENTER, textColor=white),
        )
    ]]
    banner_ts = TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), DARK_BLUE),
        ('TOPPADDING',    (0, 0), (-1, -1), 18),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 18),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ])
    banner = Table(banner_data, colWidths=[es_usable_w])
    banner.setStyle(banner_ts)
    story.append(banner)
    story.append(Spacer(1, 6))

    inst_style = ParagraphStyle('InstStyle', fontName='Times-Bold', fontSize=11,
                                leading=15, alignment=TA_CENTER, textColor=DARK_BLUE)
    meta_style = ParagraphStyle('MetaStyle', fontName='Times-Roman', fontSize=10,
                                leading=14, alignment=TA_CENTER, textColor=DARK_GRAY)
    story.append(p('Politeknik Kuching Sarawak', inst_style))
    story.append(p('Department of Mechanical Engineering  |  Date: 14 May 2026', meta_style))
    story.append(Spacer(1, 10))
    story.append(ColoredLine(es_usable_w, DARK_BLUE, 1.2))
    story.append(Spacer(1, 6))

    # Helper to make section headings with blue background bar
    def es_section(title):
        hdr_data = [[Paragraph(f'<font color="white"><b>{title}</b></font>',
                               ParagraphStyle('ES_SH', fontName='Times-Bold', fontSize=11,
                                             leading=14, textColor=white))]]
        hdr_ts = TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), MED_BLUE),
            ('TOPPADDING',    (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING',   (0, 0), (-1, -1), 8),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ])
        hdr = Table(hdr_data, colWidths=[es_usable_w])
        hdr.setStyle(hdr_ts)
        return hdr

    body_s = ParagraphStyle('ES_B', fontName='Times-Roman', fontSize=10.5,
                            leading=15, alignment=TA_JUSTIFY)
    bullet_s = ParagraphStyle('ES_Bl', fontName='Times-Roman', fontSize=10.5,
                              leading=15, alignment=TA_JUSTIFY, leftIndent=0.7*cm)

    # ── Problem Statement ─────────────────────────────────────
    story.append(es_section('Problem Statement'))
    story.append(Spacer(1, 5))
    story.append(p(
        'Assessment of student Shielded Metal Arc Welding (SMAW) coupons is currently '
        '<b>manual, subjective, and time-consuming</b>. It produces no permanent digital record, '
        'lacks consistency between assessors, and does not leverage Industry 4.0 technologies to '
        'improve learning outcomes. Instructors spend considerable time per coupon using physical '
        'gauges and visual checklists, leaving little capacity for targeted student feedback.',
        body_s,
    ))

    # ── Proposed Solution ─────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(es_section('Proposed Solution'))
    story.append(Spacer(1, 5))
    story.append(p(
        '<b>WeldVision X5</b> is an Industry 4.0 prototype that automates the entire evaluation '
        'workflow. A low-cost <b>RDK X5</b> edge device with a stereo camera, mounted on a '
        'repurposed Ender 3 motion rig, captures images of the welded coupon. On-device AI '
        '(YOLOv8s on the BPU) detects surface defects, while classical stereo vision (SGBM on '
        'the CPU) extracts 3D geometry – weld width, reinforcement height, and undercut depth. '
        'These measurements feed a digital rubric, generating a scored assessment in ~8 seconds.',
        body_s,
    ))
    story.append(Spacer(1, 4))
    story.append(p('All results synchronise to a serverless Cloudflare backend with a React dashboard featuring:', body_s))
    sol_bullets = [
        'An interactive <b>3D point-cloud viewer</b> for visual inspection of weld geometry.',
        'A <b>manual rejection mechanism</b> for instructors to flag suspected internal defects '
        '(e.g., lack of fusion) that surface vision cannot detect – triggering a mandatory physical test.',
        '<b>Historical analytics</b> for tracking student progress over time.',
    ]
    for b in sol_bullets:
        story.append(p(f'• \u2002{b}', bullet_s))
    story.append(Spacer(1, 4))
    story.append(p(
        'The entire cloud pipeline (Roboflow, Google Colab, Cloudflare, GitHub Actions) operates '
        'within <b>free-tier limits</b>, with hardware costs of approximately USD $150.',
        body_s,
    ))

    # ── Key Results ───────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(es_section('Key Results'))
    story.append(Spacer(1, 5))

    res_col_w = [5.0*cm, es_usable_w - 5.0*cm]
    res_data = [
        ['Metric', 'Result'],
        ['Detection accuracy',
         'mAP@0.5 = 0.92; per-class F1 = 0.86–0.92 across four defect classes'],
        ['Geometric accuracy (RMSE)',
         'Weld width: <0.4 mm  |  Reinforcement: <0.3 mm  |  Undercut: <0.1 mm'],
        ['Rubric correlation',
         "Pearson's r = 0.87 vs. average of three human assessors (n = 50)"],
        ['Inspection speed',   '≈ 8 seconds per coupon (5 stereo pairs)'],
        ['Hardware cost',       '≈ USD $150 (RDK X5 + camera + repurposed Ender 3 frame)'],
        ['Cloud cost',          '$0 (free-tier: Roboflow, Google Colab, Cloudflare, GitHub Actions)'],
        ['Edge power draw',    '7.8 W (RDK X5) / ≈30 W total station'],
    ]
    res_ts = hdr_style(res_col_w, font_size=9.5)
    for i in range(1, len(res_data)):
        res_ts.add('ALIGN', (0, i), (0, i), 'LEFT')
        res_ts.add('ALIGN', (1, i), (1, i), 'LEFT')
    alt_rows(res_ts, len(res_data))
    res_table = Table(res_data, colWidths=res_col_w)
    res_table.setStyle(res_ts)
    story.append(res_table)
    story.append(Spacer(1, 6))
    story.append(p(
        '<b>Manual rejection effectiveness:</b> Instructors flagged 6 of 50 coupons (12%) where '
        'automated scores appeared acceptable but point-cloud geometry suggested internal bonding '
        'issues. Macro-etch examination confirmed lack of fusion in 4 of those 6 cases, validating '
        'the hybrid human-AI approach.',
        body_s,
    ))

    # ── IR 4.0 & Sustainability ───────────────────────────────
    story.append(Spacer(1, 8))
    story.append(es_section('IR 4.0 Alignment & Sustainability'))
    story.append(Spacer(1, 5))

    ir_col_w = [(es_usable_w / 2) - 3, (es_usable_w / 2) - 3]
    ir_bullets_left = [
        '<b>Interconnectivity:</b> Edge device syncs inspection data to Cloudflare in real time '
        'via LAN/Wi-Fi; offline-first buffering ensures no data loss.',
        '<b>Information transparency:</b> All assessments are centrally logged in D1 with full '
        'traceability; instructors view consolidated dashboards.',
        '<b>Technical assistance:</b> AI grades surface quality, provides Likert-scored criterion '
        'breakdown, and suggests grade band with actionable feedback.',
        '<b>Decentralised decisions:</b> Edge device operates autonomously without requiring '
        'cloud connectivity for each inspection cycle.',
    ]
    ir_bullets_right = [
        '<b>Hardware reuse:</b> Ender 3 printer frame repurposed as gantry, reducing e-waste.',
        '<b>Low power:</b> BPU+CPU architecture consumes &lt;10 W; no GPU server required.',
        '<b>Paperless:</b> Digital rubrics replace physical checklists and paper records.',
        '<b>Free-tier cloud:</b> Zero operational cloud cost; no server provisioning or maintenance.',
        '<b>Scalable:</b> Multi-booth deployment with a single cloud backend incurs no incremental cost.',
    ]

    left_cell_content = [Paragraph('<b>IR 4.0 Pillars Addressed</b>',
                                   ParagraphStyle('IRL', fontName='Times-Bold', fontSize=10,
                                                  textColor=MED_BLUE))]
    for b in ir_bullets_left:
        left_cell_content.append(Paragraph(f'• \u2002{b}',
                                           ParagraphStyle('IRLB', fontName='Times-Roman',
                                                          fontSize=9.5, leading=13,
                                                          leftIndent=0.5*cm, spaceBefore=3)))

    right_cell_content = [Paragraph('<b>Sustainability Features</b>',
                                    ParagraphStyle('IRR', fontName='Times-Bold', fontSize=10,
                                                   textColor=MED_BLUE))]
    for b in ir_bullets_right:
        right_cell_content.append(Paragraph(f'• \u2002{b}',
                                            ParagraphStyle('IRRB', fontName='Times-Roman',
                                                           fontSize=9.5, leading=13,
                                                           leftIndent=0.5*cm, spaceBefore=3)))

    ir_data = [[left_cell_content, right_cell_content]]
    ir_ts = TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('GRID',          (0, 0), (-1, -1), 0.4, MED_GRAY),
        ('BACKGROUND',    (0, 0), (0, 0), HexColor('#eaf3fb')),
        ('BACKGROUND',    (1, 0), (1, 0), HexColor('#f0faf0')),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
        ('LINEABOVE',     (0, 0), (-1, 0), 1.5, DARK_BLUE),
        ('LINEBELOW',     (0, -1), (-1, -1), 1.5, DARK_BLUE),
    ])
    ir_table = Table(ir_data, colWidths=ir_col_w)
    ir_table.setStyle(ir_ts)
    story.append(ir_table)

    # ── Conclusion ────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(es_section('Conclusion'))
    story.append(Spacer(1, 5))
    story.append(p(
        'WeldVision X5 proves that a fully automated, reliable, and cost-effective digital welding '
        'assessment system is feasible for educational institutions with limited budgets. By combining '
        'on-device AI (YOLOv8s on BPU) with classical stereo depth estimation (SGBM on CPU) and a '
        'free-tier serverless cloud backend, the prototype delivers objective, consistent, and traceable '
        'assessment of student SMAW coupons at approximately $150 hardware cost and zero cloud cost.',
        body_s,
    ))
    story.append(p(
        'The system enhances learning through granular Likert-scored feedback, reduces instructor '
        'workload by automating routine surface grading, and preserves human judgment for internal '
        'defect detection via the manual rejection mechanism. It demonstrates a practical, scalable '
        'template for IR 4.0 integration in vocational technical education and aligns with '
        'sustainability goals through hardware reuse, low power consumption, and paperless digital '
        'records.',
        body_s,
    ))

    # ── Footer rule ───────────────────────────────────────────
    story.append(Spacer(1, 12))
    story.append(ColoredLine(es_usable_w, MED_GRAY, 0.5))
    story.append(Spacer(1, 4))
    story.append(p(
        '<i>WeldVision X5</i>  ·  Politeknik Kuching Sarawak, Department of Mechanical Engineering  '
        '·  weldvision-x5.com',
        ParagraphStyle('Footer', fontName='Times-Italic', fontSize=8.5, leading=11,
                       alignment=TA_CENTER, textColor=DARK_GRAY),
    ))

    doc.build(story)
    return doc_path


# ══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    styles = build_styles()
    print('Generating RESEARCH_PAPER.pdf …')
    rp = build_research_paper(styles)
    print(f'  ✓  {rp}')
    print('Generating EXECUTIVE_SUMMARY.pdf …')
    es = build_executive_summary(styles)
    print(f'  ✓  {es}')
    print('Done.')
