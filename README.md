# WeldVision X5

Industrial edge computing application for weld quality inspection using AI and computer vision on RDK X5.

---

## 🎯 First Time? Start Here!

This guide will help you set up WeldVision X5 from scratch, even if you've never used Docker before.

### What You'll Set Up

| Component | Runs On | Purpose |
|-----------|---------|---------|
| **Server** (Backend + Dashboard) | Your PC/Laptop | Web interface, database, model training |
| **Edge Device** | RDK X5 | Real-time camera & AI inference |

---

## 📋 Step 1: Prerequisites (PC/Laptop)

### 1.1 Install Docker Desktop

Docker runs WeldVision X5 in containers - no complex installation needed!

**Windows:**
1. Download [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
2. Run the installer (requires admin rights)
3. Restart your computer when prompted
4. Start Docker Desktop from the Start menu
5. Wait for the whale icon 🐳 in the system tray to show "Docker Desktop is running"

**Mac:**
1. Download [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)
2. Drag Docker to Applications
3. Start Docker from Applications
4. Wait for the whale icon to appear in the menu bar

**Linux (Ubuntu/Debian):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (logout/login after)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### 1.2 Verify Docker Installation

Open a terminal/command prompt and run:
```bash
docker --version
docker compose version
```

You should see version numbers (e.g., Docker 24.x, Docker Compose v2.x).

> 💡 **Troubleshooting**: If you get "docker not found", restart your computer and make sure Docker Desktop is running.

---

## 📋 Step 2: Download WeldVision X5

### Option A: Download ZIP (Easiest)
1. Go to [github.com/wilsonintai76/WeldVision-X5](https://github.com/wilsonintai76/WeldVision-X5)
2. Click the green **Code** button → **Download ZIP**
3. Extract to a folder (e.g., `C:\WeldVision-X5` or `~/WeldVision-X5`)

### Option B: Git Clone (For Developers)
```bash
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5
```

---

## 📋 Step 3: Start the Server (PC)

### Easy Start (Recommended)

**Windows:**
1. Make sure Docker Desktop is running (whale icon 🐳 in system tray)
2. Open the `WeldVision-X5` folder
3. Double-click `start-weldvision.bat`
4. Wait for the browser to open automatically (about 1-2 minutes first time)

**Mac/Linux:**
```bash
cd WeldVision-X5
chmod +x start-weldvision.sh
./start-weldvision.sh
```

### Manual Start (If Easy Start Doesn't Work)

```bash
cd WeldVision-X5/welding_server
docker compose up -d
```

Then open your browser to: **http://localhost:3000**

### What You Should See

1. **Landing Page** - Welcome screen with documentation links
2. Click **"Enter Dashboard"** to access the main application

> 💡 **First time**: The initial startup takes 2-5 minutes as Docker downloads and builds the images.

---

## 📋 Step 4: Set Up Edge Device (RDK X5)

The RDK X5 is the edge device that runs real-time AI inference on camera feeds.

### 4.1 Connect RDK X5 to Network

1. Connect RDK X5 to the same network as your PC via Ethernet
2. Power on the RDK X5
3. Find the RDK X5's IP address (check your router or use `ping sunrise.local`)

Default credentials:
- **Username:** `sunrise`
- **Password:** `sunrise`

### 4.2 Transfer Files to RDK X5

**Option A: Using SCP (Command Line)**
```bash
# From your PC, in the WeldVision-X5 folder
scp -r edge_device/* sunrise@<RDK_IP>:~/weldvision/
```

**Option B: Using USB Drive**
1. Copy the `edge_device` folder to a USB drive
2. Insert USB into RDK X5
3. Copy files to `~/weldvision/`

**Option C: Using SD Card**
1. Copy files to the SD card from your PC
2. Insert SD card into RDK X5
3. Copy files: `cp /media/sunrise/SDCARD/edge_device/* ~/weldvision/`

### 4.3 Install Dependencies on RDK X5

SSH into the RDK X5:
```bash
ssh sunrise@<RDK_IP>
# Password: sunrise
```

Install Python dependencies:
```bash
cd ~/weldvision
pip3 install -r requirements.txt
```

### 4.4 Configure Server Connection

Edit the main.py to point to your PC's IP:
```bash
nano main.py
```

Find and update this line:
```python
SERVER_URL = "http://YOUR_PC_IP:8000"  # Replace with your PC's IP
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.5 Start the Edge Service

**Manual Start (Testing):**
```bash
python3 main.py
```

**Auto-Start on Boot (Production):**
```bash
sudo cp weldvision.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable weldvision
sudo systemctl start weldvision
```

---

## ✅ Step 5: Verify Everything Works

### Check Server Status
1. Open http://localhost:3000 in your browser
2. You should see the WeldVision X5 landing page
3. The "System Status" section should show:
   - ✅ Backend Server: Connected
   - ⚠️ Edge Device: (will show connected after RDK setup)

### Check Edge Device
1. Go to **Dashboard** → **System** → **Edge Management**
2. You should see your RDK X5 listed and connected

### Test Camera Feed
1. Go to **Live Monitoring**
2. You should see the camera feed from the RDK X5

---

## 📚 More Documentation

| Guide | Description |
|-------|-------------|
| [Prerequisites](docs/PREREQUISITES.md) | Detailed hardware & software requirements |
| [Deployment Guide](docs/DEPLOYMENT.md) | What runs where & network configuration |
| [Quick Start](docs/QUICKSTART.md) | Fast setup for technical users |
| [Stereo Calibration](docs/STEREO_CALIBRATION_SETUP.md) | Camera calibration for depth measurement |
| [Training Options](docs/TRAINING_OPTIONS.md) | GPU requirements & cloud training |
| [RDK X5 Official Docs](https://d-robotics.github.io/rdk_doc/en/RDK) | Official hardware documentation |

---

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
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                            Same Network (LAN)
```

---

## 🛠️ Common Commands

### Start/Stop Server

```bash
# Start (from WeldVision-X5/welding_server folder)
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart
```

### Create Admin Account

```bash
docker compose exec backend python manage.py createsuperuser
```

### Edge Device Commands

```bash
# Check service status
sudo systemctl status weldvision

# View logs
sudo journalctl -u weldvision -f

# Restart service
sudo systemctl restart weldvision
```

---

## 🔧 Troubleshooting

### Docker Desktop Won't Start (Windows)
- Enable WSL 2: Open PowerShell as Admin → `wsl --install`
- Enable virtualization in BIOS (VT-x or AMD-V)
- Restart your computer

### "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Frontend Not Loading
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Edge Device Not Connecting
1. Check both devices are on the same network
2. Verify the SERVER_URL in main.py matches your PC's IP
3. Check firewall allows port 8000

### Reset Everything
```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend python manage.py migrate
```

---

## 📦 Project Structure

```
WeldVision-X5/
├── start-weldvision.bat    # 🖱️ Easy start (Windows)
├── stop-weldvision.bat     # 🖱️ Easy stop (Windows)
├── start-weldvision.sh     # 🖱️ Easy start (Mac/Linux)
├── stop-weldvision.sh      # 🖱️ Easy stop (Mac/Linux)
├── docs/                   # 📚 Documentation
├── welding_server/         # 🖥️ Deploy to PC
│   ├── backend/           # Django REST API
│   ├── frontend/          # React Dashboard
│   └── docker-compose.yml
└── edge_device/           # 📡 Deploy to RDK X5
    ├── main.py
    ├── modules/
    └── requirements.txt
```

---

## 🧑‍💻 For Developers

### Development Mode

```bash
cd welding_server
docker compose up -d

# Backend auto-reloads on file changes
# Frontend has hot-reload enabled
```

### Run Migrations

```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### API Documentation

- Endpoints: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

---

## 📄 License

MIT

## 👥 Contributors

- Wilson Intai (@wilsonintai76)

## 🆘 Support

For issues and questions, please [open a GitHub issue](https://github.com/wilsonintai76/WeldVision-X5/issues).
