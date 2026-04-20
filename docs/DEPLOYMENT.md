# Deployment & Connection Guide

Complete deployment architecture for WeldVision X5 system showing what runs on the PC and what runs on the RDK X5.

---

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Component Deployment](#component-deployment)
- [Network Architecture](#network-architecture)
- [Data Flow](#data-flow)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Testing Connectivity](#testing-connectivity)
- [Production Deployment](#production-deployment)

---

## 🏗️ System Overview

WeldVision X5 is a distributed system with three main components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WeldVision X5 System                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│    PC/Server         │         │     RDK X5 Edge      │
│   (Development &     │  HTTP   │   (Real-time AI      │
│    Management)       │◄───────►│    Inference)        │
│                      │         │                      │
│  ┌────────────────┐  │         │  ┌────────────────┐  │
│  │ Backend (8000) │  │         │  │  Camera Input  │  │
│  │  Django + DB   │  │         │  │  Stereo Pair   │  │
│  └────────────────┘  │         │  └────────────────┘  │
│                      │         │         │            │
│  ┌────────────────┐  │         │         ▼            │
│  │Frontend (3000) │  │         │  ┌────────────────┐  │
│  │ React + Vite   │  │         │  │   YOLO Model   │  │
│  └────────────────┘  │         │  │  BPU Inference │  │
│                      │         │  └────────────────┘  │
│                      │         │         │            │
│                      │  POST   │         ▼            │
│                      │◄────────│  ┌────────────────┐  │
│                      │         │  │  Results API   │  │
│                      │         │  │  HTTP Client   │  │
│                      │         │  └────────────────┘  │
└──────────────────────┘         └──────────────────────┘
    192.168.1.10                     192.168.1.100
```

---

## 💻 Component Deployment

### PC/Server Components (Windows/Linux/macOS)

The PC/Server hosts the **management and training infrastructure**:

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| **Backend API** | Django 4.2 + DRF | 8000 | REST API, database, MLOps orchestration |
| **Frontend Dashboard** | React 18 + Vite | 3000 | Web UI for monitoring, annotation, training |
| **Database** | PostgreSQL 15 | - | Store datasets, models, calibrations, results |
| **File Storage** | Local filesystem / S3 | - | Images, trained models, calibration data |

**What runs on PC:**
```
📦 Backend (Django)
  ├── 🗄️  SQLite Database
  ├── 🖼️  Media Storage (images, models)
  ├── 🔧 MLOps API (training jobs, model conversion)
  ├── 📊 Dataset Management
  ├── 🏷️  Annotation Storage
  ├── 📐 Stereo Calibration Settings
  └── 📡 RDK X5 Communication API

📱 Frontend (React)
  ├── 📈 Live Monitoring Dashboard
  ├── 🖊️  Image Annotation Interface
  ├── 🎓 Training Configuration UI
  ├── 🚀 Model Deployment Interface
  ├── ⚙️  Calibration Settings
  └── 📚 Guide & Help Documentation
```

### RDK X5 Edge Components (Ubuntu 20.04 ARM64)

The RDK X5 performs **real-time inference at the edge**:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Edge Runtime** | Python 3.8 | Main inference loop |
| **Camera Module** | OpenCV + MIPI/USB | Stereo camera capture |
| **Depth Module** | OpenCV Stereo | Depth map generation |
| **YOLO Inference** | Horizon BPU | Real-time defect detection |
| **HTTP Client** | Requests | Send results to backend |

**What runs on RDK X5:**
```
🤖 Edge Device (edge_device/main.py)
  ├── 📷 Camera Capture
  │   ├── Left Camera (MIPI/USB)
  │   └── Right Camera (MIPI/USB)
  │
  ├── 🔍 Stereo Processing
  │   ├── Load Calibration from Backend
  │   ├── Rectify Images
  │   └── Generate Depth Map
  │
  ├── 🧠 AI Inference
  │   ├── Load YOLO Model (.bin)
  │   ├── BPU Acceleration
  │   ├── Object Detection
  │   └── Defect Classification
  │
  └── 📡 Results Transmission
      ├── POST to Backend API
      └── Real-time Metrics
```

---

## 🌐 Network Architecture

### Network Topology

```
                    Internet (Optional)
                           │
                           ▼
                    ┌─────────────┐
                    │   Router    │
                    │ 192.168.1.1 │
                    └─────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │   PC/Server      │      │    RDK X5 Edge   │
    │  192.168.1.10    │      │  192.168.1.100   │
    │                  │      │                  │
    │  Port 8000 ◄─────┼──────┼─► HTTP Client    │
    │  Port 3000       │      │                  │
    │  Port 22   ─────►┼──────┼─► SSH (22)       │
    └──────────────────┘      └──────────────────┘
```

### Connection Details

| Connection | Direction | Protocol | Port | Purpose |
|-----------|-----------|----------|------|---------|
| **Frontend → Backend** | PC → PC | HTTP | 8000 | API calls for data, models, settings |
| **RDK X5 → Backend** | RDK → PC | HTTP | 8000 | POST inference results, GET calibration |
| **PC → RDK X5** | PC → RDK | SSH | 22 | Deployment, management, debugging |
| **Browser → Frontend** | User → PC | HTTP | 3000 | Access web dashboard |

### Required Network Configuration

**PC/Server:**
- Static IP or DHCP reservation: `192.168.1.10` (recommended)
- Firewall: Allow inbound on ports 8000, 3000
- Firewall: Allow outbound SSH (port 22) to RDK X5

**RDK X5:**
- Static IP: `192.168.1.100` (required)
- Firewall: Allow inbound SSH (port 22)
- Firewall: Allow outbound HTTP (port 8000) to PC

### 🔌 Direct Ethernet (LAN) Setup
If connecting the Desktop PC and RDK X5 directly with a cable (no router):
1. **Set Static IP on PC**:
   - IP: `192.168.1.5`
   - Subnet: `255.255.255.0`
2. **Set Static IP on RDK X5**:
   - IP: `192.168.1.100`
   - Subnet: `255.255.255.0`
3. **Test**: Run `ping 192.168.1.100` from the Desktop.

---

## 🔄 Data Flow

### 1. Training & Deployment Flow (PC → RDK X5)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Training Pipeline (PC)                       │
└─────────────────────────────────────────────────────────────────┘

1. Upload Images          2. Annotate            3. Train Model
   ┌──────────┐             ┌──────────┐            ┌──────────┐
   │ Frontend │──────────►  │ Frontend │────────►   │ Backend  │
   │  (3000)  │  Browse     │  (3000)  │  Boxes    │  (8000)  │
   └──────────┘             └──────────┘            └──────────┘
        │                                                 │
        │ POST /api/labeled-images/                      │
        ▼                                                 │
   ┌──────────┐                                          │
   │ Backend  │                                          │
   │  (8000)  │◄─────────────────────────────────────────┘
   └──────────┘              POST /api/jobs/train/
        │
        │ YOLO Training
        ▼
   ┌──────────┐
   │ best.pt  │
   └──────────┘

4. Convert to BPU          5. Deploy to RDK X5
   ┌──────────┐             ┌──────────┐
   │ Backend  │────────►    │   SSH    │
   │  (8000)  │  .bin       │   SCP    │
   └──────────┘             └──────────┘
        │                         │
        │ RDK conversion          │
        ▼                         ▼
   ┌──────────┐             ┌──────────┐
   │model.bin │────────────►│ RDK X5   │
   └──────────┘    Copy     │  /model/ │
                            └──────────┘
```

### 2. Inference Flow (RDK X5 → PC)

```
┌─────────────────────────────────────────────────────────────────┐
│                  Real-time Inference (RDK X5)                   │
└─────────────────────────────────────────────────────────────────┘

1. Capture             2. Process            3. Detect
   ┌──────────┐          ┌──────────┐          ┌──────────┐
   │  Camera  │─────────►│  Stereo  │─────────►│   YOLO   │
   │ L + R    │  Frames  │  Depth   │  Depth   │   BPU    │
   └──────────┘          └──────────┘          └──────────┘
                                                      │
                                                      │ Bboxes
                                                      ▼
4. Send Results                              ┌──────────────┐
   ┌──────────┐                              │   Results    │
   │   HTTP   │◄─────────────────────────────│ {defects:[]} │
   │  Client  │  POST /api/results/          └──────────────┘
   └──────────┘
        │
        │ Network (192.168.1.x)
        ▼
   ┌──────────┐
   │ Backend  │
   │  (8000)  │
   └──────────┘
        │
        │ Store in DB
        ▼
   ┌──────────┐
   │ Frontend │◄─── WebSocket/Polling ───┐
   │  (3000)  │                           │
   └──────────┘                           │
        │                                 │
        ▼                                 │
   ┌──────────┐                           │
   │Dashboard │                           │
   │  Update  │───────────────────────────┘
   └──────────┘
```

### 3. Calibration Flow (PC → RDK X5)

```
1. Capture Images (PC)    2. Run Calibration       3. Upload Config
   ┌──────────┐              ┌──────────┐            ┌──────────┐
   │ USB Cam  │─────────►    │ Python   │───────►    │ Frontend │
   │Chessboard│  20-30 pairs │stereo_cal│  .json     │  (3000)  │
   └──────────┘              └──────────┘            └──────────┘
                                                           │
                                                           │ POST
                                                           ▼
                                                      ┌──────────┐
                                                      │ Backend  │
                                                      │  (8000)  │
                                                      └──────────┘
                                                           │
                                                           │ Store
                                                           ▼
4. Fetch on RDK X5                                   ┌──────────┐
   ┌──────────┐                                      │ Database │
   │ RDK X5   │◄─────────────────────────────────────│          │
   │edge_main │  GET /api/stereo-calibrations/active/└──────────┘
   └──────────┘
        │
        │ Load Q, maps
        ▼
   ┌──────────┐
   │  Stereo  │
   │  Module  │
   └──────────┘
```

---

## 🚀 Deployment Steps

### Step 1: Deploy PC/Server (Backend + Frontend)

#### Using Docker (Recommended)

```bash
# On PC/Server
cd WeldVision-X5

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Services will be available at:**
- Frontend: http://192.168.1.10:3000
- Backend API: http://192.168.1.10:8000/api/
- Django Admin: http://192.168.1.10:8000/admin/

#### Using Native Installation

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Step 2: Configure Network Settings

Update backend environment variables to point to your RDK X5:

**docker-compose.yml or .env:**
```bash
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=sunrise
```

**Or in Django settings (backend/weldvision/settings.py):**
```python
RDK_IP = os.environ.get('RDK_IP', '192.168.1.100')
RDK_USERNAME = os.environ.get('RDK_USERNAME', 'sunrise')
RDK_PASSWORD = os.environ.get('RDK_PASSWORD', 'sunrise')
```

### Step 3: Deploy RDK X5 Edge Device

#### Connect to RDK X5

```bash
# From PC
ssh sunrise@192.168.1.100
# Password: sunrise
```

#### Install Edge Software

```bash
# On RDK X5
cd ~
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5/edge_device

# Install dependencies
pip3 install -r requirements.txt
```

#### Configure Backend URL

Edit `edge_device/main.py` or create `edge_device/config.py`:

```python
# Backend API endpoint
BACKEND_URL = "http://192.168.1.10:8000/api"

# Calibration endpoint
CALIBRATION_URL = f"{BACKEND_URL}/stereo-calibrations/active/"

# Results endpoint
RESULTS_URL = f"{BACKEND_URL}/results/"
```

#### Deploy Model to RDK X5

**Option 1: Manual SCP**
```bash
# From PC
scp backend/media/models/model.bin sunrise@192.168.1.100:~/WeldVision-X5/edge_device/runtime/
```

**Option 2: Via Backend API (Future)**
```bash
# Will use MLOps deployment endpoint
POST /api/edge-devices/{id}/deploy-model/
```

#### Run Edge Service

**Manual Start:**
```bash
# On RDK X5
cd ~/WeldVision-X5/edge_device
python3 main.py
```

**As System Service:**
```bash
# Copy service file
sudo cp weldvision.service /etc/systemd/system/

# Enable and start
sudo systemctl enable weldvision
sudo systemctl start weldvision

# Check status
sudo systemctl status weldvision

# View logs
journalctl -u weldvision -f
```

---

## ⚙️ Configuration

### Backend Configuration

**Key Settings (backend/weldvision/settings.py):**

```python
# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # Or PostgreSQL
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Media files (uploaded images, models)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# CORS (allow frontend access)
CORS_ALLOW_ALL_ORIGINS = True  # Dev only
# Production:
CORS_ALLOWED_ORIGINS = [
    "http://192.168.1.10:3000",
    "http://localhost:3000",
]

# RDK X5 Connection
RDK_IP = os.environ.get('RDK_IP', '192.168.1.100')
RDK_USERNAME = os.environ.get('RDK_USERNAME', 'sunrise')
RDK_PASSWORD = os.environ.get('RDK_PASSWORD', 'sunrise')
```

### Frontend Configuration

**Environment Variables (frontend/.env):**

```bash
VITE_API_URL=http://192.168.1.10:8000
```

**For production, update to use your server's IP or domain.**

### RDK X5 Configuration

**Edge Device Settings (edge_device/config.py or main.py):**

```python
# Backend API
BACKEND_URL = "http://192.168.1.10:8000/api"

# Camera settings
CAMERA_LEFT = 0   # /dev/video0
CAMERA_RIGHT = 1  # /dev/video1
RESOLUTION = (1280, 720)
FPS = 30

# Inference settings
MODEL_PATH = "runtime/model.bin"
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.4

# Update interval
RESULT_POST_INTERVAL = 1.0  # seconds
```

---

## 🧪 Testing Connectivity

### 1. Test Network Connectivity

**From PC to RDK X5:**
```bash
ping 192.168.1.100
ssh sunrise@192.168.1.100
```

**From RDK X5 to PC:**
```bash
# On RDK X5
ping 192.168.1.10
curl http://192.168.1.10:8000/api/
```

### 2. Test Backend API

```bash
# From anywhere on network
curl http://192.168.1.10:8000/api/

# Test stereo calibrations endpoint
curl http://192.168.1.10:8000/api/stereo-calibrations/

# Test with authentication
curl -X GET http://192.168.1.10:8000/api/stereo-calibrations/active/
```

### 3. Test Frontend Access

Open browser:
- http://192.168.1.10:3000
- Navigate to different sections
- Check browser console for errors

### 4. Test RDK X5 Edge Service

**On RDK X5:**
```bash
# Test camera access
python3 -c "import cv2; cap = cv2.VideoCapture(0); print('OK' if cap.isOpened() else 'FAIL')"

# Test backend connectivity
python3 -c "import requests; r = requests.get('http://192.168.1.10:8000/api/'); print(r.status_code)"

# Run edge service in foreground (for debugging)
cd ~/WeldVision-X5/edge_device
python3 main.py
```

### 4. Test RDK X5 Edge Device Status

The Landing Page checks edge device status via the backend using SSH over LAN:

```bash
# From PC browser, landing page calls:
GET /api/device-status/

# Backend connects via SSH to RDK_IP configured in docker-compose env
# Returns: { status: 'online'|'offline', ip, system_info: {uptime, memory, cpu, temperature} }
```

Verify manually:
```bash
# From PC
ssh sunrise@192.168.1.100
curl http://192.168.1.10:8000/api/device-status/
```

### 5. End-to-End Test

1. **Start PC services** (backend + frontend)
2. **Start RDK X5 service**
3. **Open Dashboard** (http://192.168.1.10:3000)
4. **Navigate to Live Monitoring**
5. **Verify real-time updates** from RDK X5

---

## 🏭 Production Deployment

### PC/Server Production (Auto-Reload Enabled)

Production uses `docker-compose.prod.yml` which includes **live reload** without a full rebuild:

```bash
# First start (or after requirements.txt / package.json changes)
docker compose -f docker-compose.prod.yml up -d --build

# Subsequent starts / code changes (no --build needed)
docker compose -f docker-compose.prod.yml up -d
```

**Services and auto-reload behaviour:**

| Service | Image | Reload Mechanism |
|---|---|---|
| `db` | postgres:15-alpine | Persistent volume |
| `backend` | Custom (Dockerfile.prod) | `./backend:/app` volume + Gunicorn `--reload` (~1s on `.py` change) |
| `frontend-builder` | node:18-alpine | `./frontend:/app` volume + `vite build --watch` (rebuilds `dist/` on `.jsx/.css` change) |
| `frontend` | nginx:alpine | Serves from shared `dist_data` volume — always serves latest build |

**Create `.env` file** in `welding_server/` before first run:

```bash
DJANGO_SECRET_KEY=your-secret-key-here
DB_PASSWORD=your-db-password-here
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=sunrise
```

**Key differences from development:**
- PostgreSQL instead of SQLite
- Nginx reverse proxy (port 80)
- Gunicorn for Django (instead of runserver) with `--reload`
- Vite watch-build replaces static single build
- Environment secrets from `.env` file

> 💡 Use `--build` only when `requirements.txt` or `package.json` changes. Code edits auto-reload.

### RDK X5 Production

**Best Practices:**
1. Use systemd service (auto-start on boot)
2. Enable log rotation
3. Set up watchdog for automatic restart on failure
4. Use static IP (never DHCP in production)
5. Secure SSH (disable password auth, use keys only)

**Systemd Service Configuration:**

```ini
# /etc/systemd/system/weldvision.service
[Unit]
Description=WeldVision X5 Edge Inference Service
After=network.target

[Service]
Type=simple
User=sunrise
WorkingDirectory=/home/sunrise/WeldVision-X5/edge_device
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Firewall Configuration

**PC/Server (Ubuntu with ufw):**
```bash
sudo ufw allow 8000/tcp comment 'Django Backend'
sudo ufw allow 3000/tcp comment 'React Frontend'
sudo ufw allow from 192.168.1.100 to any port 8000 proto tcp
sudo ufw enable
```

**RDK X5:**
```bash
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow out 8000/tcp comment 'Backend API'
sudo ufw enable
```

---

## 📊 System Health Monitoring

### PC/Server Monitoring

```bash
# Check Docker containers
docker-compose ps

# View resource usage
docker stats

# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend
```

### RDK X5 Monitoring

```bash
# Service status
sudo systemctl status weldvision

# View logs
journalctl -u weldvision -f --no-pager

# Resource usage
htop

# Camera status
v4l2-ctl --list-devices
```

### API Health Check

Create a monitoring script:

```bash
#!/bin/bash
# health_check.sh

# Check backend
if curl -f http://192.168.1.10:8000/api/ > /dev/null 2>&1; then
    echo "✓ Backend OK"
else
    echo "✗ Backend FAIL"
fi

# Check frontend
if curl -f http://192.168.1.10:3000 > /dev/null 2>&1; then
    echo "✓ Frontend OK"
else
    echo "✗ Frontend FAIL"
fi

# Check RDK X5 connectivity
if ping -c 1 192.168.1.100 > /dev/null 2>&1; then
    echo "✓ RDK X5 Reachable"
else
    echo "✗ RDK X5 Unreachable"
fi
```

---

## 🔗 Quick Reference

### What Runs Where

| Component | Location | Command |
|-----------|----------|---------|
| Django Backend | PC | `docker-compose up backend` |
| React Frontend | PC | `docker-compose up frontend` |
| Database | PC | Automatic with backend |
| Edge Inference | RDK X5 | `python3 edge_device/main.py` |
| Model Training | PC | Via Frontend → Backend API |
| Model Conversion | PC | Backend script |
| Model Deployment | PC → RDK X5 | SCP or API |
| Camera Capture | RDK X5 | Edge service |
| Real-time AI | RDK X5 | Edge service (BPU) |

### Port Reference

| Port | Service | Location | Purpose |
|------|---------|----------|---------|
| 3000 | Frontend | PC | Web Dashboard |
| 8000 | Backend | PC | REST API |
| 22 | SSH | RDK X5 | Remote Access |

### IP Address Reference

| Device | IP Address | Hostname |
|--------|-----------|----------|
| PC/Server | 192.168.1.10 | weldvision-server |
| RDK X5 | 192.168.1.100 | weldvision-edge |

---

## 📚 Related Documentation

- **[PREREQUISITES.md](PREREQUISITES.md)** - Hardware & software requirements
- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide
- **[STEREO_CALIBRATION_SETUP.md](STEREO_CALIBRATION_SETUP.md)** - Camera calibration
- **Guide & Help** - In-app documentation (http://localhost:3000)

---

**Last Updated**: March 5, 2026  
**Version**: 1.1
