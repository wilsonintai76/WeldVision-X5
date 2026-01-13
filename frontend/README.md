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
│   ├── Dashboard.jsx    # Live monitoring view
│   └── MLOps.jsx        # Model management & device control
├── App.jsx              # Main app with sidebar navigation
├── main.jsx             # React entry point
└── index.css            # Tailwind directives
```

## Features Overview

### Dashboard (Live Monitoring)
- Video feed placeholder (awaiting RDK X5 connection)
- Live metrics cards:
  - Reinforcement Height (1-3mm validation)
  - Bead Width (8-12mm validation)
  - Visual defect counts (Porosity, Spatter, Slag, Burn-Through)
- Mock data generation for UI testing (updates every second)
- Bottom statistics panel

### MLOps Center
- Model table with deployment actions
- API status indicator
- Device information panel
- Device control (reboot functionality)
- System statistics (CPU, Memory, Temperature, Uptime)

## Mock Data Mode

The Dashboard includes a `useEffect` hook that generates random metric values every second for testing purposes:
- Height: 2.1mm ± 0.1mm
- Width: 10.0-12.0mm
- Defects: Random counts (0-5)

This allows UI testing without RDK X5 device connection.
