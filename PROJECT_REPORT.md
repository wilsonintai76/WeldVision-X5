# WeldVision-X5 Project Report

## 1. Project Overview

**WeldVision-X5** is an industrial edge computing application designed for real-time weld quality inspection using AI and computer vision technologies. The system leverages the RDK X5 edge device for on-site inference, combined with a web-based management dashboard for training, monitoring, and analysis.

### Key Objectives:
- Real-time defect detection in welding processes
- Stereo vision depth measurement for dimensional analysis
- Web-based management interface for model training and monitoring
- Edge computing architecture for low-latency inference
- Comprehensive data collection and analysis capabilities

## 2. System Architecture

The application follows a distributed architecture with three main components:

### 2.1 Edge Device (RDK X5)
- **Location**: Industrial welding environment
- **Hardware**: RDK X5 with stereo camera setup
- **Purpose**: Real-time AI inference and data capture
- **Technology**: Python 3.8 with Horizon BPU acceleration

### 2.2 Backend Server (PC/Laptop)
- **Location**: Control room or development environment
- **Technology**: Django REST API with SQLite database
- **Purpose**: Data storage, model management, API services
- **Ports**: 8000 (API), database storage

### 2.3 Frontend Dashboard (PC/Laptop)
- **Location**: Same as backend server
- **Technology**: React 18 with Vite build system
- **Purpose**: Web interface for monitoring and management
- **Port**: 3000

### Network Architecture:
```
RDK X5 Edge Device ──HTTP──► Django Backend ◄──HTTP─── React Frontend
     │                           │                        │
     └─ Camera Input            └─ Database              └─ Dashboard UI
     └─ YOLO Inference          └─ File Storage          └─ Analytics
     └─ Depth Processing        └─ MLOps API             └─ Training UI
```

## 3. Technologies Used

### Backend (Django/Python):
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: Django Auth with custom User model
- **File Storage**: Local filesystem with media handling
- **API**: RESTful API with CORS support
- **Additional Libraries**: python-dotenv for configuration

### Frontend (React/JavaScript):
- **Framework**: React 18 with React Router
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Charts**: Recharts for data visualization
- **3D Rendering**: Three.js with React Three Fiber for 3D weld visualization
- **Icons**: Lucide React for consistent iconography

### Edge Device (Python):
- **Runtime**: Python 3.8 on Ubuntu 20.04 ARM64
- **Computer Vision**: OpenCV for camera capture and stereo processing
- **AI Inference**: Horizon BPU with hobot_dnn for YOLOv8 acceleration
- **Camera Interface**: MIPI/USB camera support via hobot_vio
- **Networking**: HTTP client for backend communication

### Deployment & Containerization:
- **Container Platform**: Docker with Docker Compose
- **Orchestration**: Docker Compose for multi-service deployment
- **Service Management**: systemd for edge device auto-start

## 4. Key Features

### 4.1 Real-time Weld Inspection
- Stereo camera capture with depth measurement
- YOLOv8-based defect detection (cracks, porosity, etc.)
- Real-time overlay visualization
- Automated quality assessment scoring

### 4.2 Web Dashboard
- Live monitoring interface
- User authentication and role management
- Course and class management system
- Training data annotation tools
- Model training and deployment interface
- Analytics and reporting dashboard
- 3D weld visualization with PLY export

### 4.3 MLOps Capabilities
- Model training pipeline
- Dataset management and versioning
- Model conversion for edge deployment
- Performance monitoring and metrics
- Automated model updates to edge devices

### 4.4 Data Management
- Comprehensive database schema for users, sessions, results
- File storage for images, models, and calibration data
- Rubrics-based assessment system
- Historical data analysis and reporting

## 5. Installation and Setup

### Prerequisites:
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Git (optional, for cloning)
- RDK X5 edge device with Ubuntu 20.04
- Stereo camera setup

### Quick Setup:
1. **Download**: Clone or download ZIP from GitHub
2. **Server Setup**: Run `start-weldvision.bat` (Windows) or `start-weldvision.sh` (Mac/Linux)
3. **Edge Device**: Transfer `edge_device` folder to RDK X5
4. **Configuration**: Update server IP in edge device `main.py`
5. **Start Services**: Enable systemd service on RDK X5

### Development Setup:
- Backend: `cd welding_server && docker compose up -d`
- Frontend: Hot-reload enabled with Vite
- Database: Automatic migrations on startup

## 6. Usage Workflow

### 6.1 Initial Setup
1. Deploy backend and frontend on PC/server
2. Configure and deploy edge device
3. Calibrate stereo cameras
4. Train initial AI models

### 6.2 Operational Use
1. **Monitoring**: View live camera feeds and real-time analysis
2. **Training**: Upload datasets, annotate images, train models
3. **Assessment**: Review automated weld quality scores
4. **Analytics**: Analyze trends and performance metrics
5. **Management**: Manage users, courses, and system settings

### 6.3 Maintenance
- Regular model updates via MLOps interface
- Camera recalibration as needed
- System health monitoring and logging

## 7. Development Information

### Code Structure:
```
WeldVision-X5/
├── docs/                    # Documentation
├── edge_device/            # RDK X5 runtime code
│   ├── main.py            # Main inference loop
│   ├── modules/           # Specialized modules
│   └── requirements.txt   # Python dependencies
├── welding_server/        # Server-side application
│   ├── backend/           # Django REST API
│   │   ├── accounts/      # User management
│   │   ├── core/          # Main business logic
│   │   ├── mlops/         # Model operations
│   │   ├── results/       # Assessment results
│   │   └── rubrics/       # Quality rubrics
│   └── frontend/          # React dashboard
└── docker-compose.yml     # Container orchestration
```

### API Endpoints:
- `/api/accounts/` - User management
- `/api/core/` - Sessions and core functionality
- `/api/mlops/` - Model training and deployment
- `/api/results/` - Assessment results
- `/api/rubrics/` - Quality criteria

### Database Schema:
- **Users**: Custom user model with roles
- **Sessions**: Welding sessions with metadata
- **Results**: Inspection results and scores
- **Rubrics**: Assessment criteria and weights
- **Models**: AI model versions and metadata

## 8. Future Enhancements

### Planned Features:
- Advanced analytics with predictive maintenance
- Multi-camera support for complex welding setups
- Cloud integration for model training
- Mobile app for remote monitoring
- Integration with welding robots and automation systems

### Technical Improvements:
- Migration to PostgreSQL for production
- Implementation of real-time WebSocket communication
- Enhanced 3D visualization capabilities
- Automated calibration procedures
- Performance optimization for edge devices

## 9. Conclusion

WeldVision-X5 represents a comprehensive solution for automated weld quality inspection, combining edge computing capabilities with a user-friendly web interface. The system's distributed architecture ensures low-latency inference at the point of inspection while providing powerful management and analytics tools.

The project demonstrates strong software engineering practices with containerized deployment, RESTful API design, and modular code organization. The combination of Django, React, and edge AI technologies provides a scalable and maintainable platform for industrial computer vision applications.

---

**Project Status**: Active development  
**License**: MIT  
**Repository**: https://github.com/wilsonintai76/WeldVision-X5  
**Contributors**: Wilson Intai  
**Last Updated**: January 16, 2026