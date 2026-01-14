# Welding Server (PC/Server Component)

Backend API and Frontend Dashboard for WeldVision X5.

## 📦 What's Included

- **Backend**: Django REST API (Port 8000)
- **Frontend**: React Dashboard (Port 3000)
- **Docker Compose**: Containerized deployment

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

### Using Native Installation

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows: venv\Scripts\activate | Linux/Mac: source venv/bin/activate
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

## ⚙️ Configuration

### Environment Variables

Create `.env` file in this directory:

```bash
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True

# Database (optional - uses SQLite by default)
DATABASE_URL=postgresql://user:password@localhost:5432/weldvision

# RDK X5 Connection
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=sunrise

# Frontend API URL
VITE_API_URL=http://localhost:8000
```

### Backend Configuration

Located in `backend/weldvision/settings.py`:
- Database settings
- CORS configuration
- Media/Static files
- API authentication

### Frontend Configuration

Located in `frontend/.env`:
- `VITE_API_URL` - Backend API endpoint

## 📚 Features

### Backend API

- **Stereo Calibration Management**: Store and retrieve camera calibration data
- **Dataset Management**: Upload, organize, and version datasets
- **Annotation Storage**: Store bounding box annotations
- **MLOps Pipeline**: Training job management, model conversion
- **Edge Device Management**: Register and monitor RDK X5 devices
- **Results Collection**: Receive and store inference results

### Frontend Dashboard

- **Live Monitoring**: Real-time weld inspection metrics
- **Data Management**: Upload images, create datasets
- **Annotation Interface**: Label defects with bounding boxes
- **Model Training**: Configure and start training jobs
- **Stereo Calibration**: Configure camera calibration parameters
- **Analytics**: Data distribution and quality metrics
- **Guide & Help**: Complete in-app documentation

## 🔧 Development

### Backend Development

```bash
cd backend

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test

# Collect static files
python manage.py collectstatic
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 API Endpoints

### Stereo Calibration
- `GET /api/stereo-calibrations/` - List all calibrations
- `POST /api/stereo-calibrations/` - Create new calibration
- `GET /api/stereo-calibrations/{id}/` - Get specific calibration
- `PUT /api/stereo-calibrations/{id}/` - Update calibration
- `DELETE /api/stereo-calibrations/{id}/` - Delete calibration
- `POST /api/stereo-calibrations/{id}/set_active/` - Set as active
- `GET /api/stereo-calibrations/active/` - Get active calibration

### Datasets
- `GET /api/datasets/` - List datasets
- `POST /api/datasets/` - Create dataset
- `GET /api/datasets/{id}/` - Get dataset details

### Labeled Images
- `GET /api/labeled-images/` - List images
- `POST /api/labeled-images/` - Upload image
- `GET /api/labeled-images/{id}/` - Get image details

### Edge Devices
- `GET /api/edge-devices/` - List edge devices
- `POST /api/edge-devices/` - Register device

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop and remove containers
docker-compose down

# Remove volumes (caution: deletes data)
docker-compose down -v
```

## 🔐 Production Deployment

Use `docker-compose.prod.yml` for production:

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Use environment variables from .env.prod
cp .env.example .env.prod
# Edit .env.prod with production values
```

**Production Checklist:**
- [ ] Set strong `DJANGO_SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Configure PostgreSQL database
- [ ] Set up proper CORS allowed origins
- [ ] Configure static files serving (Nginx)
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging

## 🔗 Related Documentation

- [Prerequisites](../docs/PREREQUISITES.md) - System requirements
- [Deployment Guide](../docs/DEPLOYMENT.md) - Complete deployment instructions
- [Quick Start](../docs/QUICKSTART.md) - Fast setup guide

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/wilsonintai76/WeldVision-X5/issues
- Documentation: See `../docs/` folder

## 🏗️ Project Structure

```
welding_server/
├── backend/
│   ├── core/              # Main Django app
│   ├── mlops/             # MLOps functionality
│   ├── rubrics/           # Assessment rubrics
│   ├── weldvision/        # Project settings
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx        # Main app
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml     # Development
├── docker-compose.prod.yml # Production
└── README.md              # This file
```
