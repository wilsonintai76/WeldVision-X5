# WeldVision X5

Industrial edge computing application for weld quality inspection using AI and computer vision on RDK X5.

## 📦 Project Structure

This project is organized into deployment-ready components:

- **[welding_server/](welding_server/)** - Deploy to PC/Server (Backend API + Frontend Dashboard)
- **[edge_device/](edge_device/)** - Deploy to RDK X5 (Real-time AI inference)
- **[docs/](docs/)** - Complete system documentation

## 🚀 Quick Start

### 1. Start the Server (PC)

```bash
cd welding_server
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/

### 2. Deploy to Edge Device (RDK X5)

```bash
# Copy edge device files to RDK X5
scp -r edge_device/* sunrise@192.168.1.100:~/weldvision/

# SSH into RDK X5
ssh sunrise@192.168.1.100

# Start the service
cd ~/weldvision
python3 main.py
```

## 📚 Documentation

Complete guides for setup, deployment, and operation:

- **[Prerequisites](docs/PREREQUISITES.md)** - Hardware & software requirements (Desktop + RDK X5)
- **[Deployment Guide](docs/DEPLOYMENT.md)** - What runs where and how to connect everything
- **[Quick Start](docs/QUICKSTART.md)** - Fast setup guide (Docker or native)
- **[Stereo Calibration](docs/STEREO_CALIBRATION_SETUP.md)** - Camera calibration procedure
- **[Training Options](docs/TRAINING_OPTIONS.md)** - 🆕 GPU requirements & cloud training alternatives
- **[System Check Guide](docs/SYSTEM_CHECK_USER_GUIDE.md)** - 🆕 Understanding hardware capability detection
- **Guide & Help** - In-app documentation (access after starting at http://localhost:3000)

## 🏗️ System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   RDK X5 Edge   │  HTTP   │  Django Backend │  HTTP   │  React Frontend │
│    (Python)     │────────▶│   (REST API)    │◀────────│   (Vite + UI)   │
│                 │  POST   │                 │  GET    │                 │
│ • Camera        │         │ • Database      │         │ • Dashboard     │
│ • YOLOv8        │         │ • MLOps API     │         │ • MLOps Center  │
│ • Depth CV      │         │ • File Storage  │         │ • Visualization │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Quick Start with Docker

### Prerequisites

Before you begin, ensure you have the required hardware and software. See **[PREREQUISITES.md](PREREQUISITES.md)** for complete requirements:
- Desktop/Server with Docker Desktop or Docker Engine
- Docker Compose v2.0+
- Git
- (Optional) RDK X5 edge device for inference

### 1. Clone Repository

```bash
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5
```

### 2. Start All Services

```bash
# Build and start all containers
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

This will:
- ✅ Build backend and frontend images
- ✅ Run Django migrations automatically
- ✅ Start backend on `http://localhost:8000`
- ✅ Start frontend on `http://localhost:3000`

### 3. Create Django Superuser

```bash
# Access backend container
docker-compose exec backend python manage.py createsuperuser

# Follow prompts to create admin account
```

### 4. Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## Docker Commands

### Start Services

```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Rebuild images and start
docker-compose up --build
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Run Commands in Containers

```bash
# Django migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell

# Access backend bash
docker-compose exec backend bash

# Access frontend bash
docker-compose exec frontend sh
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

## Manual Setup (Without Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Core (Students & Classes)
- `GET/POST /api/students/` - Student management
- `GET/POST /api/classes/` - Class management

### Results (Assessments)
- `GET/POST /api/assessments/` - Assessment records
- `POST /api/upload-assessment/` - Upload from RDK X5

### Rubrics (Grading)
- `GET/POST /api/rubrics/` - Rubric configuration
- `GET /api/rubrics/active/` - Active rubric

### MLOps (Model Deployment)
- `GET/POST /api/models/` - Model management
- `POST /api/deploy-model/` - Deploy to RDK X5
- `POST /api/reboot-device/` - Reboot RDK X5
- `GET /api/device-status/` - Device status
- `GET /api/system-check/` - 🆕 Check hardware training capability
- `GET /api/training-recommendation/` - 🆕 Get training recommendation
- `POST /api/upload-model/` - 🆕 Upload pre-trained models (.pt, .onnx, .bin)
- `GET /api/convertible-models/` - 🆕 List models available for conversion

### MLOps (Train / Convert / Jobs)
- `POST /api/train-model/` - Start training job (runs on PC/server)
- `POST /api/convert-model/` - Export/convert job (supports `model_id`, `source_job_id`, or `weights_path`)
- `GET /api/jobs/` - List jobs and statuses
- `GET /api/jobs/{id}/logs/` - Tail stdout/stderr logs
- `POST /api/register-artifact/` - Save a succeeded job artifact into `AIModel`

## Converting ONNX -> RDK `.bin` (hb_mapper)

RDK X5 runs quantized `.bin` models via Horizon BPU (`hobot_dnn`). The `.bin` must be produced from ONNX using Horizon OpenExplorer (OE) toolchain:

- Tool: `hb_mapper` (command: `makert`)
- Runs on: your PC/laptop/server (commonly inside Horizon-provided Docker), not on the RDK

To enable `format: "bin"` conversion from the backend, set `HORIZON_BIN_COMPILE_COMMAND` in [backend/.env.example](backend/.env.example) (copy to `backend/.env`).

## RDK X5 Edge Device Setup

### Copy Files to Device

```bash
# SSH into RDK X5
ssh sunrise@192.168.1.100

# Create directory
mkdir -p /home/sunrise/welding_app

# Copy files from your machine
scp edge_device/main.py sunrise@192.168.1.100:/home/sunrise/welding_app/
scp edge_device/requirements.txt sunrise@192.168.1.100:/home/sunrise/welding_app/
```

### Install Dependencies

```bash
ssh sunrise@192.168.1.100
cd /home/sunrise/welding_app
pip3 install -r requirements.txt
```

### Configure Server URL

Edit `main.py`:
```python
SERVER_URL = "http://192.168.1.100:8000"  # Your laptop/server IP
```

### Run Edge Script

```bash
# Manual start
python3 main.py

# Auto-start with systemd
sudo cp edge_device/weldvision.service /etc/systemd/system/
sudo systemctl enable weldvision
sudo systemctl start weldvision
```

## Project Structure

```
WeldVision-X5/
├── backend/                 # Django REST API
│   ├── weldvision/         # Project settings
│   ├── core/               # Students & Classes
│   ├── results/            # Assessments
│   ├── rubrics/            # Grading configuration
│   ├── mlops/              # Model deployment
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
│
├── frontend/               # React UI
│   ├── src/
│   │   ├── components/    # Dashboard, MLOps
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.js
│
├── edge_device/           # RDK X5 Python script
│   ├── main.py           # Main inference loop
│   ├── modules/          # Buffering, streaming, stereo depth
│   ├── tools/            # Stereo calibration helper
│   ├── requirements.txt
│   └── weldvision.service
│
└── docker-compose.yml    # Orchestration
```

## Development Workflow

### 1. Start Docker Services

```bash
docker-compose up -d
```

### 2. Make Code Changes

- Backend: Edit files in `backend/` (auto-reloads)
- Frontend: Edit files in `frontend/src/` (hot-reload)

### 3. View Logs

```bash
docker-compose logs -f
```

### 4. Run Migrations After Model Changes

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### 5. Stop Services

```bash
docker-compose down
```

## Troubleshooting

### Port Already in Use

```bash
# Windows - Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Database Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Frontend Not Loading

```bash
# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Backend Migrations

```bash
# Check migration status
docker-compose exec backend python manage.py showmigrations

# Run migrations
docker-compose exec backend python manage.py migrate

# Create new migration
docker-compose exec backend python manage.py makemigrations
```

## Production Deployment

### Environment Variables

Create `.env` file in project root:

```env
# Django
DJANGO_SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,192.168.1.100

# RDK X5
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=your-secure-password

# Database (optional - for PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Use Production Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Django 4.2, Django REST Framework, Paramiko (SSH/SCP)
- **Edge**: Python, OpenCV, YOLOv8, hobot_dnn, libsrcampy
- **DevOps**: Docker, Docker Compose

## License

MIT

## Contributors

- Wilson Intai (@wilsonintai76)

## Support

For issues and questions, please open a GitHub issue.
