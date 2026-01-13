# WeldVision X5 - Django Backend

Django REST API for WeldVision X5 industrial edge computing system.

## Features

- **Core Module**: Student and class management
- **Results Module**: Assessment tracking with metrics and images
- **Rubrics Module**: Configurable grading weights
- **MLOps Module**: AI model deployment and device management

## Tech Stack

- Django 4.2
- Django REST Framework
- Paramiko (SSH/SCP)
- SQLite (development)
- Pillow (image processing)

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Create `.env` file from example:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=sunrise
```

### 3. Database Migration

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser

```bash
python manage.py createsuperuser
```

### 5. Run Development Server

```bash
python manage.py runserver 0.0.0.0:8000
```

## API Endpoints

### Core (Students & Classes)

- `GET/POST /api/students/` - List/Create students
- `GET/PUT/DELETE /api/students/{id}/` - Student details
- `GET /api/students/by_class/?class_id=1` - Filter by class
- `GET/POST /api/classes/` - List/Create classes

### Results (Assessments)

- `GET/POST /api/assessments/` - List/Create assessments
- `POST /api/upload-assessment/` - **RDK X5 upload endpoint**
- `GET /api/students/{student_id}/assessments/` - Student assessments

### Rubrics (Grading Configuration)

- `GET/POST /api/rubrics/` - List/Create rubrics
- `GET /api/rubrics/active/` - Get active rubric
- `POST /api/rubrics/{id}/activate/` - Activate rubric

### MLOps (Model Deployment)

- `GET/POST /api/models/` - List/Upload models
- `POST /api/models/{id}/deploy/` - Deploy model to RDK
- `GET /api/models/deployed/` - Get deployed model
- `POST /api/deploy-model/` - **Deploy model (Frontend endpoint)**
- `POST /api/reboot-device/` - **Reboot RDK X5**
- `GET /api/device-status/` - Check device status

### MLOps (Train / Convert / Jobs)

- `POST /api/train-model/` - Start training job (runs on this machine)
- `POST /api/convert-model/` - Export/convert job (`format: onnx` or `format: bin`)
- `GET /api/jobs/` - List jobs and statuses
- `GET /api/jobs/{id}/logs/` - Tail stdout/stderr logs
- `POST /api/register-artifact/` - Save a succeeded job artifact into `AIModel`

## ONNX -> RDK `.bin` using `hb_mapper`

RDK X5 expects a quantized `.bin` produced by Horizon OpenExplorer toolchain.

- Tool: `hb_mapper` (command: `makert`)
- Runs on: your PC/laptop/server (often inside Horizon OE Docker)

To enable `format: "bin"` conversion, configure `HORIZON_BIN_COMPILE_COMMAND` in `backend/.env`.
See [backend/.env.example](backend/.env.example) for a Docker-based template using placeholders.

## RDK X5 Integration

### Upload Assessment

**Endpoint**: `POST /api/upload-assessment/`

**Payload** (multipart/form-data):

```json
{
  "student_id": "S001",
  "image_original": <file>,
  "image_heatmap": <file>,
  "metrics_json": {
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
    }
  },
  "device_id": "RDK-X5-01",
  "model_version": "v2.0.0"
}
```

### Deploy Model

**Endpoint**: `POST /api/deploy-model/`

**Payload**:

```json
{
  "model_id": 1,
  "ip": "192.168.1.100",
  "username": "sunrise",
  "password": "sunrise"
}
```

**Important**: Model is sent to `/home/sunrise/welding_app/model_update.bin` (NOT `model.bin` directly). RDK script handles atomic swap.

### Reboot Device

**Endpoint**: `POST /api/reboot-device/`

**Payload** (optional):

```json
{
  "ip": "192.168.1.100",
  "username": "sunrise",
  "password": "sunrise"
}
```

## Project Structure

```
backend/
├── weldvision/          # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                # Student & Class models
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── results/             # Assessment tracking
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── rubrics/             # Grading configuration
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── mlops/               # Model deployment
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── utils.py        # Paramiko SSH/SCP functions
├── media/               # Uploaded files
├── manage.py
└── requirements.txt
```

## Admin Panel

Access at `http://localhost:8000/admin/`

- Manage students, classes, assessments
- Configure rubrics and grading weights
- Upload and deploy AI models
- View deployment logs

## Security Notes

- Change `DJANGO_SECRET_KEY` in production
- Use environment variables for RDK credentials
- Enable HTTPS in production
- Restrict `ALLOWED_HOSTS` in production
- Consider using SSH keys instead of passwords for Paramiko
