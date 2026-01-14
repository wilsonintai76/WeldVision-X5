# WeldVision X5 - Frontend

Industrial edge computing application for weld quality inspection using React, Vite, and Tailwind CSS.

## Features

- **Live Monitoring Dashboard**: Real-time weld inspection with geometric and visual defect tracking
- **MLOps Center**: Model management and device control interface
- **Industrial Dark Mode**: High-contrast UI optimized for workshop environments

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React (Icons)
- Recharts (Charts)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx       # Live monitoring view
│   ├── MLOps.jsx          # Model management & device control
│   ├── Management.jsx     # Student management
│   ├── EdgeManagement.jsx # Edge device configuration
│   ├── Labeling.jsx       # Data upload & annotation
│   ├── Analytics.jsx      # Data analytics & visualization
│   ├── Rubrics.jsx        # Assessment rubrics
│   ├── Settings.jsx       # Stereo calibration settings
│   └── Help.jsx           # Complete guide & documentation
├── App.jsx                # Main app with sidebar navigation
├── main.jsx               # React entry point
└── index.css              # Tailwind directives
```

## Features Overview

### Live Monitoring (Dashboard)
- Video feed placeholder (awaiting RDK X5 connection)
- Live metrics cards:
  - Reinforcement Height (1-3mm validation)
  - Bead Width (8-12mm validation)
  - Visual defect counts (Porosity, Spatter, Slag, Burn-Through)
- Mock data generation for UI testing (updates every second)
- Bottom statistics panel

### MLOps Studio
#### Data Management
- **Upload Data**: Bulk upload images via drag & drop or ZIP files
- **Annotate**: Bounding box annotation with defect class assignment
- **Datasets**: Dataset management with train/validation splits
- **Analytics**: Data distribution and quality metrics
- **Classes & Tags**: Defect class configuration

#### Model Pipeline
- **Train → Convert → Deploy**: Complete MLOps workflow
- Model training configuration
- YOLO to RDK X5 binary conversion
- Model deployment to edge devices
- Training job monitoring

### System Management
- **Stereo Calibration**: Configure camera calibration parameters
  - Inline guidance for image capture procedure
  - Active calibration management
  - Support for multiple calibration profiles
- **Student Management**: Student accounts and progress tracking
- **Assessment Rubrics**: Grading criteria configuration
- **Edge Management**: Edge device registration and monitoring

### Guide & Help
- **Complete Documentation**: Comprehensive guide covering all features
- **Getting Started**: Quick start instructions and system overview
- **Stereo Calibration Guide**: Detailed calibration procedure with pose explanations
- **MLOps Pipeline**: Step-by-step workflow documentation
- **Edge Device Setup**: Installation and configuration instructions
- **Troubleshooting**: Common issues and solutions
- **External Resources**: Links to official documentation

## Mock Data Mode

The Dashboard includes a `useEffect` hook that generates random metric values every second for testing purposes:
- Height: 2.1mm ± 0.1mm
- Width: 10.0-12.0mm
- Defects: Random counts (0-5)

This allows UI testing without RDK X5 device connection.
