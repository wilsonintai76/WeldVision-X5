# Quick Start - VSCode Development (No Docker)

Run WeldVision X5 directly in VSCode with separate terminals.

## Prerequisites

- Python 3.10+
- Node.js 18+
- VSCode

## Setup & Run

### Terminal 1: Backend (Django)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (first time only)
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start Django server
python manage.py runserver 0.0.0.0:8000
```

### Terminal 2: Frontend (React)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

## Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## VSCode Terminal Setup

1. Open VSCode integrated terminal (`` Ctrl+` ``)
2. Split terminal (click + button or `Ctrl+Shift+5`)
3. Left terminal: Run backend
4. Right terminal: Run frontend

## Database Migrations (When Needed)

```bash
cd backend
venv\Scripts\activate  # Windows
python manage.py makemigrations
python manage.py migrate
```

## Troubleshooting

### Port Already in Use

**Backend (8000):**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Frontend (3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Module Not Found

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Quick Commands Reference

```bash
# Backend
cd backend
venv\Scripts\activate
python manage.py runserver

# Frontend
cd frontend
npm run dev
```
