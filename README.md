# WeldVision-X5

Hybrid Welding Evaluation System.

## Architecture

- Edge (RDK X5, Ubuntu): Flask + OpenCV
  - MJPEG video stream: `GET /stream`
  - Evaluate current frame: `POST /evaluate`
- Backend (Laptop): Django REST Framework + SQLite
  - Store evaluations: `POST /api/evaluations/`
  - List evaluations: `GET /api/evaluations/`
- Frontend (Laptop): React (Vite) + Tailwind (to be added)

## IPs (your lab setup)

- Edge: `192.168.1.100`
- Laptop: `192.168.1.50`

## Quick start

Edge (on RDK): see edge/README.md

Backend (on Laptop): see backend/README.md

Frontend: not scaffolded yet (you cancelled Vite scaffolding).