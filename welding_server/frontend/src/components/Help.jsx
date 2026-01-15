import { useState } from 'react'
import { 
  BookOpen, 
  Camera, 
  Cpu, 
  Database, 
  GitBranch, 
  Rocket, 
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Terminal,
  Sliders,
  Eye,
  Download
} from 'lucide-react'

function Help() {
  const [expandedSections, setExpandedSections] = useState({
    gettingStarted: true,
    calibration: false,
    mlops: false,
    reports: false,
    edgeDevice: false,
    troubleshooting: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Guide & Help</h1>
              <p className="text-slate-400">Complete documentation for WeldVision X5</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <a
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/PREREQUISITES.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors group"
          >
            <Cpu className="w-5 h-5 text-purple-400" />
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Prerequisites</h3>
              <p className="text-slate-400 text-xs">Hardware & software setup</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
          </a>

          <a
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/DEPLOYMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors group"
          >
            <Rocket className="w-5 h-5 text-orange-400" />
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Deployment</h3>
              <p className="text-slate-400 text-xs">What runs where & how</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-orange-400" />
          </a>

          <a
            href="https://github.com/wilsonintai76/WeldVision-X5"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors group"
          >
            <GitBranch className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">GitHub</h3>
              <p className="text-slate-400 text-xs">Source code & issues</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </a>

          <a
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/QUICKSTART.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors group"
          >
            <Rocket className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Quick Start</h3>
              <p className="text-slate-400 text-xs">Get started quickly</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-green-400" />
          </a>
        </div>

        {/* Documentation Sections */}
        <div className="space-y-4">
          {/* Getting Started */}
          <Section
            title="Getting Started"
            icon={<Rocket className="w-5 h-5" />}
            expanded={expandedSections.gettingStarted}
            onToggle={() => toggleSection('gettingStarted')}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">System Overview</h3>
                <p className="text-slate-300 text-sm mb-3">
                  WeldVision X5 is an industrial edge computing platform for real-time weld quality inspection 
                  using computer vision and machine learning on RDK X5 hardware.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Starting the Application</h3>
                <CodeBlock code="docker-compose up -d" />
                <p className="text-slate-400 text-xs mt-2">Access the frontend at http://localhost:3000</p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Key Components</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Backend:</strong> Django REST API for data management and model orchestration
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Frontend:</strong> React dashboard for monitoring and configuration
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Edge Device:</strong> RDK X5 running real-time inference
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Stereo Calibration */}
          <Section
            title="Stereo Calibration"
            icon={<Camera className="w-5 h-5" />}
            expanded={expandedSections.calibration}
            onToggle={() => toggleSection('calibration')}
          >
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    Stereo calibration is <strong>critical</strong> for accurate depth estimation. 
                    Follow the procedure carefully to ensure high-quality results.
                  </p>
                </div>
                <a
                  href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/STEREO_CALIBRATION_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Calibration Guide
                </a>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Image Capture Requirements</h3>
                <div className="space-y-3">
                  <CalibrationPose
                    title="1. Parallel Shots (5 images)"
                    description="Capture at different distances: close (~30cm), mid (~70cm), far (~150cm)"
                    purpose="Establishes baseline for distance variation and scale"
                  />
                  <CalibrationPose
                    title="2. Yaw - Side-to-Side (5 images, ~30-45°)"
                    description="Rotate board so left side is closer, then right side is closer"
                    purpose="Calculates horizontal focal length (fx)"
                    formula="fx"
                  />
                  <CalibrationPose
                    title="3. Pitch - Front-to-Back (5 images, ~30-45°)"
                    description="Tilt top edge closer (like closing laptop lid), then bottom edge closer"
                    purpose="Calculates vertical focal length (fy)"
                    formula="fy"
                  />
                  <CalibrationPose
                    title="4. Roll - Rotation (5 images, ~15-20°)"
                    description="Turn board like a steering wheel, clockwise and counter-clockwise"
                    purpose="Calculates lens distortion coefficients"
                    formula="k₁, k₂, k₃"
                  />
                  <CalibrationPose
                    title="5. Corner Coverage (5-10 images)"
                    description="Position board at image corners and edges"
                    purpose="Fixes lens distortion at periphery of image"
                  />
                </div>
              </div>

              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-300 font-semibold text-sm mb-1">Critical Rule</h4>
                    <p className="text-sm text-slate-300">
                      Both Left and Right cameras must see the <strong>ENTIRE checkerboard</strong> in every shot. 
                      Discard any image pair where one camera cuts off part of the board.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Running Calibration</h3>
                <CodeBlock 
                  code={`python edge_device/tools/stereo_calibrate.py \\
  --left-glob "calib/left/*.png" \\
  --right-glob "calib/right/*.png" \\
  --board-w 9 --board-h 6 \\
  --square-mm 25.0 \\
  --out stereo_calib.json`}
                />
              </div>
            </div>
          </Section>

          {/* MLOps Pipeline */}
          <Section
            title="MLOps Pipeline"
            icon={<Cpu className="w-5 h-5" />}
            expanded={expandedSections.mlops}
            onToggle={() => toggleSection('mlops')}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">Workflow Overview</h3>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                      <span className="text-slate-300">Upload Data</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                      <span className="text-slate-300">Annotate</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                      <span className="text-slate-300">Train</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                      <span className="text-slate-300">Deploy</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">1. Data Upload & Management</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Upload images for annotation and training. Supports bulk upload via ZIP files.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Navigate to <strong>MLOps Studio → Data → Upload Data</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Drag & drop images or ZIP files
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Supported formats: JPG, PNG
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">2. Annotation</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Label defects using bounding boxes with class assignments.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Go to <strong>MLOps Studio → Data → Annotate</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Select images to annotate
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Draw bounding boxes around defects
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Assign defect class to each annotation
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3. Training</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Train YOLO models on your annotated dataset.
                </p>
                <div className="bg-yellow-950/20 border border-yellow-600 rounded-lg p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-200 font-semibold text-sm mb-1">Hardware Requirements Check</p>
                      <p className="text-yellow-100 text-sm">
                        The system automatically checks your hardware capabilities before training. If your PC/laptop 
                        doesn&apos;t meet minimum requirements (especially GPU), consider using cloud training platforms.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-2 font-semibold">Minimum Requirements:</p>
                <ul className="space-y-1 text-sm text-slate-400 mb-3">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <strong>CPU:</strong> 4+ cores recommended
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <strong>RAM:</strong> 8GB minimum, 16GB recommended
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <strong>GPU:</strong> NVIDIA GPU with 6GB+ VRAM highly recommended (training on CPU is very slow)
                  </li>
                </ul>
                <p className="text-slate-300 text-sm mb-2 font-semibold">Alternative Training Options:</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <p className="text-white font-semibold text-sm">Google Colab</p>
                    <p className="text-xs text-slate-400 mt-1">Free GPU training</p>
                    <a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      colab.research.google.com →
                    </a>
                  </div>
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <p className="text-white font-semibold text-sm">Roboflow Train</p>
                    <p className="text-xs text-slate-400 mt-1">Automated YOLO training</p>
                    <a href="https://roboflow.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      roboflow.com →
                    </a>
                  </div>
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <p className="text-white font-semibold text-sm">Ultralytics HUB</p>
                    <p className="text-xs text-slate-400 mt-1">Official YOLOv8 platform</p>
                    <a href="https://hub.ultralytics.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      hub.ultralytics.com →
                    </a>
                  </div>
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                    <p className="text-white font-semibold text-sm">Import Models</p>
                    <p className="text-xs text-slate-400 mt-1">Bring pre-trained models</p>
                    <p className="text-xs text-green-400">Upload .pt files</p>
                  </div>
                </div>
                <CodeBlock 
                  code={`# Local Training (if system meets requirements)
1. Select dataset in MLOps
2. Configure training parameters
3. System checks hardware automatically
4. Click "Start Training" if capable
5. Monitor progress in real-time

# Or use cloud platforms and import:
1. Train on Colab/Roboflow/Ultralytics HUB
2. Download trained .pt file
3. Upload to WeldVision MLOps
4. Convert and deploy to RDK X5`}
                />
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">4. Model Conversion & Deployment</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Convert trained models to RDK X5 binary format and deploy to edge devices.
                </p>
                <CodeBlock 
                  code={`# Convert to RDK binary
python backend/mlops/scripts/convert_to_bin.py \\
  --model path/to/best.pt \\
  --out model.bin

# Deploy via MLOps interface
1. Upload converted .bin file
2. Select target edge device
3. Click "Deploy Model"`}
                />
              </div>
            </div>
          </Section>

          {/* Report Generation */}
          <Section
            title="Report Generation"
            icon={<Download className="w-5 h-5" />}
            expanded={expandedSections.reports}
            onToggle={() => toggleSection('reports')}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">Overview</h3>
                <p className="text-slate-300 text-sm mb-3">
                  Generate comprehensive PDF reports for student evaluations, including individual assessments, 
                  student progress summaries, and class-wide performance reports.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">1. Individual Evaluation Report</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Generate a detailed PDF for a single evaluation with rubric scores and AI metrics.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Complete the evaluation in <strong>Dashboard</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Click <strong>"Download Report"</strong> button after finishing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Includes: Student info, rubric breakdown, AI metrics, weld images
                  </li>
                </ul>
                <div className="mt-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-200">
                      <strong>New Feature:</strong> Reports now include weld images with AI detection boundaries 
                      (red boxes for defects, green for acceptable areas)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">2. Student Summary Report</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Generate a progress report showing all evaluations for a specific student.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Navigate to <strong>Dashboard → Student Selection</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Select a student from the dropdown
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Click <strong>"Student Report"</strong> button
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Includes: Evaluation history, statistics, pass rate, score trends
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3. Class Report (NEW)</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Generate a comprehensive report for an entire class with all student performance data.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Navigate to <strong>Dashboard → Class Group Selector</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Select a class from the dropdown
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Click the blue <strong>"Class Report"</strong> button that appears
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Includes: Student performance table, class statistics, performance distribution
                  </li>
                </ul>
                <div className="mt-3 bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-white text-sm font-semibold mb-2">Report Contents:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Student ID & Name
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Total Evaluations
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Latest Score
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Pass Rate %
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Pass/Fail Status
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Class Average
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Overall Pass Rate
                    </div>
                    <div className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      Performance Distribution
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Report Features</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Professional Formatting:</strong> Clean tables with color-coded status (Green = Pass, Red = Fail)
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Weld Images:</strong> Original image + AI detection heatmap with bounding boxes
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Comprehensive Data:</strong> Rubric scores, AI metrics, geometric measurements
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Auto-naming:</strong> Files named with student ID or class name and date
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Edge Device */}
          <Section
            title="Edge Device Management"
            icon={<Cpu className="w-5 h-5" />}
            expanded={expandedSections.edgeDevice}
            onToggle={() => toggleSection('edgeDevice')}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">Setting Up Edge Device</h3>
                <CodeBlock 
                  code={`# On RDK X5
cd edge_device

# Install dependencies
pip install -r requirements.txt

# Start the service
./start.sh

# Or use systemd service
sudo systemctl enable weldvision
sudo systemctl start weldvision`}
                />
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Configuration</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Configure edge device settings in the web interface:
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Navigate to <strong>System → Edge Management</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Register new edge devices
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Monitor device status and health
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    Deploy models to specific devices
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Real-Time Monitoring</h3>
                <p className="text-slate-300 text-sm mb-2">
                  View live inference results on the <strong>Live Monitoring</strong> dashboard:
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    Real-time video feed with bounding boxes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    Defect detection statistics
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    Performance metrics (FPS, latency)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    Stereo depth visualization
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Troubleshooting */}
          <Section
            title="Troubleshooting"
            icon={<AlertCircle className="w-5 h-5" />}
            expanded={expandedSections.troubleshooting}
            onToggle={() => toggleSection('troubleshooting')}
          >
            <div className="space-y-4">
              <TroubleshootItem
                issue="Backend not accessible"
                solutions={[
                  "Check if Docker containers are running: docker-compose ps",
                  "Verify backend is listening on port 8000: curl http://localhost:8000/api/",
                  "Check logs: docker-compose logs backend",
                  "Restart services: docker-compose restart"
                ]}
              />

              <TroubleshootItem
                issue="Frontend shows connection error"
                solutions={[
                  "Ensure backend is running and accessible",
                  "Check CORS settings in backend/weldvision/settings.py",
                  "Verify API endpoint URLs in frontend components",
                  "Clear browser cache and reload"
                ]}
              />

              <TroubleshootItem
                issue="Stereo calibration fails"
                solutions={[
                  "Ensure checkerboard is FULLY visible in both cameras",
                  "Verify board dimensions match your physical board (inner corners)",
                  "Capture minimum 20 image pairs with varied poses",
                  "Check image quality (sharp focus, good lighting)",
                  "Validate square size measurement (use precise ruler)"
                ]}
              />

              <TroubleshootItem
                issue="Model training fails"
                solutions={[
                  "Check dataset has sufficient images (minimum 100 recommended)",
                  "Verify annotations are valid (all boxes have classes)",
                  "Check GPU/CPU resources availability",
                  "Review training logs for specific error messages",
                  "Ensure train/validation split is configured"
                ]}
              />

              <TroubleshootItem
                issue="Edge device not detecting defects"
                solutions={[
                  "Verify model is deployed and loaded correctly",
                  "Check camera feed is working (test with OpenCV)",
                  "Ensure calibration is active and valid",
                  "Review inference confidence threshold settings",
                  "Check edge device logs: journalctl -u weldvision -f"
                ]}
              />

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-6">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Viewing Logs
                </h3>
                <CodeBlock 
                  code={`# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Edge device logs
journalctl -u weldvision -f --no-pager

# All services
docker-compose logs -f`}
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-600/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ResourceLink
              title="Prerequisites Guide"
              description="Complete hardware & software setup"
              href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/PREREQUISITES.md"
            />
            <ResourceLink
              title="Deployment Guide"
              description="What runs where & connection guide"
              href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/DEPLOYMENT.md"
            />
            <ResourceLink
              title="RDK X5 Documentation"
              description="Official hardware documentation (English)"
              href="https://developer.d-robotics.cc/en"
            />
            <ResourceLink
              title="OpenCV Calibration Guide"
              description="Camera calibration theory"
              href="https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html"
            />
            <ResourceLink
              title="YOLO Documentation"
              description="Object detection framework"
              href="https://docs.ultralytics.com/"
            />
            <ResourceLink
              title="Django REST Framework"
              description="API development guide"
              href="https://www.django-rest-framework.org/"
            />
            <ResourceLink
              title="Docker Documentation"
              description="Container deployment guide"
              href="https://docs.docker.com/"
            />
            <ResourceLink
              title="React Documentation"
              description="Frontend framework guide"
              href="https://react.dev/"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function Section({ title, icon, expanded, onToggle, children }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-400">{icon}</div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="p-6 border-t border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}

function CalibrationPose({ title, description, purpose, formula }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
      <p className="text-slate-400 text-xs mb-2">{description}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Purpose:</span>
        <span className="text-slate-300">{purpose}</span>
        {formula && (
          <>
            <span className="text-slate-600">•</span>
            <code className="bg-slate-900 text-blue-400 px-2 py-0.5 rounded">{formula}</code>
          </>
        )}
      </div>
    </div>
  )
}

function CodeBlock({ code }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
      <pre className="text-sm text-slate-300 font-mono whitespace-pre">{code}</pre>
    </div>
  )
}

function TroubleshootItem({ issue, solutions }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        {issue}
      </h4>
      <ul className="space-y-2">
        {solutions.map((solution, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-blue-400 flex-shrink-0">{idx + 1}.</span>
            <span>{solution}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResourceLink({ title, description, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 transition-colors group"
    >
      <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm truncate">{title}</h4>
        <p className="text-slate-400 text-xs truncate">{description}</p>
      </div>
    </a>
  )
}

export default Help
