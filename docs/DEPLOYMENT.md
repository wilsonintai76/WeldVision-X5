# Deployment Guide

WeldVision X5 deployment architecture: Cloudflare-native cloud backend with RDK X5 edge inference.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Edge Device Deployment](#edge-device-deployment)
- [Configuration Reference](#configuration-reference)
- [Testing Connectivity](#testing-connectivity)

---

## System Overview

WeldVision X5 has three components:

| Component | Hosting | Technology |
| --- | --- | --- |
| **Frontend** | Cloudflare Pages | React 18, Vite, TypeScript |
| **Cloud API** | Cloudflare Workers | Hono, D1 (SQLite), R2, KV, Worker AI |
| **Edge Device** | RDK X5 (on-premise) | Python 3, BPU inference, port 8080 |

No Docker. No nginx. No self-hosted backend. The frontend is a static build served by Cloudflare's global CDN. All API logic runs as a Worker at the edge.

---

## Architecture

```text
Browser
  │
  ├─► Cloudflare Pages  (static assets — weldvision-x5.com)
  │
  └─► Cloudflare Worker (API — api.weldvision-x5.com)
        ├── D1 (SQLite)       — users, models, rubrics, assessments
        ├── R2                — ONNX/BIN model files, PLY meshes, images
        ├── KV (EDGE_STATE)   — live edge device state, active calibration
        └── Worker AI         — AI-powered weld assessment

                  ▲  HTTP (Bearer JWT)  ▼
            RDK X5 Edge Device (:8080)
              ├── Stereo camera capture
              ├── YOLO BPU inference
              └── POST results to Worker
```

### Data flow — inference result

```text
RDK X5 camera → stereo depth → YOLO BPU → POST /api/rpc/edge-result (Worker)
  → D1 (store result) + KV (update live state) → browser dashboard polls /api/results
```

### Data flow — model deployment

```text
Dashboard → POST /api/storage/upload (R2, multipart)
          → POST /api/models (D1 registration)
          → POST /api/models/:id/github-compile (triggers GitHub Actions → .bin)
          → PATCH /api/models/:id/deploy → RDK X5 pulls model via LAN
```

---

## Prerequisites

- **Node.js** 22+ and npm
- **Wrangler CLI** — `npm install -g wrangler` then `wrangler login`
- **Cloudflare account** with a zone for your domain

First-time Cloudflare resource setup (run once):

```bash
cd cloud_worker

# 1. Create D1 database — paste the returned database_id into wrangler.toml
npm run db:create

# 2. Create R2 bucket
npm run r2:create

# 3. Create KV namespace — paste the returned id/preview_id into wrangler.toml
wrangler kv:namespace create EDGE_STATE

# 4. Apply database schema to production D1
npm run db:migrate:prod

# 5. Set JWT signing secret (never committed to git)
wrangler secret put JWT_SECRET
```

---

## Local Development

Two processes run concurrently:

### Terminal 1 — Cloud Worker

```bash
cd cloud_worker
npm install
npm run dev          # wrangler dev → http://localhost:8787
```

### Terminal 2 — Frontend

```bash
cd welding_server/frontend
npm install
npm run dev          # Vite → http://localhost:3000
```

Vite proxies all `/api/*` requests to `http://localhost:8787`, so the full stack works locally without any extra config.

### Environment files

| File | Purpose |
| --- | --- |
| `welding_server/frontend/.env.development` | `VITE_API_URL=http://localhost:8787` |
| `welding_server/frontend/.env.production` | `VITE_API_URL=https://api.weldvision-x5.com` |

---

## Production Deployment

Every deployment bumps the semver version across all `package.json` files, tags the commit, and pushes to GitHub before deploying to Cloudflare.

### One-command deploy (recommended)

```powershell
# Patch bump (default) — e.g. 1.1.4 → 1.1.5
.\deploy.ps1

# Minor bump — e.g. 1.1.4 → 1.2.0
.\deploy.ps1 minor

# Major bump — e.g. 1.1.4 → 2.0.0
.\deploy.ps1 major

# With a custom release message
.\deploy.ps1 patch -Message "Fix calibration edge case"

# Worker only (skip frontend rebuild)
.\deploy.ps1 -SkipFrontend

# Frontend only (skip worker)
.\deploy.ps1 -SkipWorker
```

What `deploy.ps1` does in order:

1. Reads current version from `package.json` and bumps it (patch/minor/major)
2. Writes new version to `package.json`, `welding_server/frontend/package.json`, `cloud_worker/package.json`
3. Builds the Vite frontend (`npm run build`)
4. Deploys Cloudflare Worker (`wrangler deploy` → `api.weldvision-x5.com`)
5. Deploys frontend to Cloudflare Pages (`wrangler pages deploy dist/`)
6. Commits the version bump, creates an annotated git tag (`vX.Y.Z`), pushes `main` + tag to GitHub

> The working tree must be clean (all changes committed) before running `deploy.ps1`.

### Manual deploy (individual steps)

**Cloud Worker:**

```bash
cd cloud_worker
npm run deploy       # wrangler deploy → api.weldvision-x5.com
```

**Frontend:**

```bash
cd welding_server/frontend
npm run build        # tsc + vite build → dist/
wrangler pages deploy dist/ --project-name weldvision-frontend
```

**Git tag manually:**

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin main --follow-tags
```

Or connect the GitHub repo to Cloudflare Pages for automatic deployments on push to `main`.

**Build settings in Cloudflare Pages:**

| Setting | Value |
| --- | --- |
| Build command | `cd welding_server/frontend && npm run build` |
| Build output directory | `welding_server/frontend/dist` |
| Root directory | `/` |

### Apply D1 migrations

```bash
cd cloud_worker
npm run db:migrate:prod   # wrangler d1 migrations apply weldvision --remote
```

---

## Edge Device Deployment

The RDK X5 runs `edge_device/main.py` as a systemd service. No Docker required — Python 3 runs natively on the RDK X5's Ubuntu ARM64.

### First-time setup

```bash
# SSH into the RDK X5
ssh sunrise@192.168.1.100

# Clone the repo
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5/edge_device

# Install Python dependencies
pip3 install -r requirements.txt
```

### Configure the Worker URL

Edit `edge_device/main.py` and set:

```python
WORKER_URL = "https://api.weldvision-x5.com"
# or during development:
# WORKER_URL = "http://192.168.1.10:8787"
```

### Run as a systemd service

```bash
sudo cp weldvision.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable weldvision
sudo systemctl start weldvision

# Check status
sudo systemctl status weldvision

# View logs
journalctl -u weldvision -f
```

### Deploy a new model to the edge

Models are compiled to `.bin` format via the MLOps pipeline (GitHub Actions), stored in R2, then fetched by the edge device. Trigger from the dashboard:

1. Upload ONNX model → **MLOps → Upload Model**
2. Click **Compile** → GitHub Actions builds `.bin`
3. Click **Deploy (LAN)** → edge device fetches and loads the model

Or manually:

```bash
# SCP a model directly
scp model.bin sunrise@192.168.1.100:~/WeldVision-X5/edge_device/runtime/
```

---

## Configuration Reference

### Cloud Worker — `cloud_worker/wrangler.toml`

| Binding | Type | Purpose |
| --- | --- | --- |
| `DB` | D1 | Users, models, rubrics, results |
| `STORAGE` | R2 | Model files, images, PLY meshes |
| `KV` | KV namespace | Live edge state, active calibration |
| `AI` | Worker AI | Weld defect assessment |

Secrets (set via `wrangler secret put`):

| Secret | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs/verifies Bearer tokens |

### Frontend — environment variables

| Variable | Dev | Production |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8787` | `https://api.weldvision-x5.com` |

### Edge Device — `edge_device/main.py`

| Setting | Default | Purpose |
| --- | --- | --- |
| `WORKER_URL` | `https://api.weldvision-x5.com` | Cloud Worker endpoint |
| `CAMERA_LEFT` | `0` | Left camera device index |
| `CAMERA_RIGHT` | `1` | Right camera device index |
| `MODEL_PATH` | `runtime/model.bin` | Active BPU model |
| `CONFIDENCE_THRESHOLD` | `0.5` | YOLO detection threshold |

### `welding_server/.env.example`

Copy to `.env` and fill in values for local development:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
JWT_SECRET=change-this-to-a-secure-random-string
RDK_IP=192.168.1.100
RDK_USERNAME=sunrise
RDK_PASSWORD=sunrise
```

---

## Testing Connectivity

### Verify the Cloud Worker

```bash
# Health check
curl https://api.weldvision-x5.com/api/

# Auth (get a token)
curl -X POST https://api.weldvision-x5.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### Verify the Frontend

Open <https://weldvision-x5.com> in a browser. Check the browser console — all `/api/` requests should return 200 from `api.weldvision-x5.com`.

### Verify Edge Device connectivity

```bash
# On the RDK X5 — test Worker reachability
curl https://api.weldvision-x5.com/api/

# Check service
sudo systemctl status weldvision
journalctl -u weldvision --no-pager -n 50
```

### Verify camera

```bash
# On the RDK X5
python3 -c "import cv2; cap = cv2.VideoCapture(0); print('OK' if cap.isOpened() else 'FAIL')"
```

---

## Quick Reference

### What runs where

| Component | Location | Start command |
| --- | --- | --- |
| Cloud Worker (API) | Cloudflare global edge | `npm run deploy` (cloud_worker/) |
| Frontend | Cloudflare Pages | `wrangler pages deploy dist/` |
| Edge inference | RDK X5 (192.168.1.100) | `systemctl start weldvision` |

### Port reference

| Port | Service | Host |
| --- | --- | --- |
| 3000 | Vite dev server (frontend) | localhost (dev only) |
| 8787 | Wrangler dev (Worker) | localhost (dev only) |
| 8080 | Edge device HTTP API | RDK X5 |
| 22 | SSH | RDK X5 |
