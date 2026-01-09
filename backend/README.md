# Backend (Laptop) - Django REST

Runs on the Laptop (Windows). Provides:
- `POST /api/evaluations/` to store an evaluation
- `GET /api/evaluations/` to list latest evaluations

## Setup

```powershell
Set-Location d:\WeldVision-X5\backend
py -m venv .venv
.\.venv\Scripts\python -m pip install -U pip
.\.venv\Scripts\python -m pip install django djangorestframework django-cors-headers
.\.venv\Scripts\python manage.py migrate
```

## Run

```powershell
.\.venv\Scripts\python manage.py runserver 0.0.0.0:8000
```

Test:
- `http://192.168.1.50:8000/api/evaluations/`
