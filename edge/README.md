# Edge (RDK X5) Service

Runs on the RDK X5 (Ubuntu). Provides:
- `GET /stream` : MJPEG stream for the React UI
- `POST /evaluate` : evaluates the latest frame and returns a score

## Setup

Create a venv and install:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Export env vars (example):

```bash
export EDGE_HOST=0.0.0.0
export EDGE_PORT=5000
export CAMERA_SOURCE=0
export ALLOWED_ORIGINS=http://192.168.1.50:5173
```

Run:

```bash
python app.py
```

## Test

- Health: `http://192.168.1.100:5000/health`
- Stream: `http://192.168.1.100:5000/stream`
- Evaluate: `curl -X POST http://192.168.1.100:5000/evaluate`
