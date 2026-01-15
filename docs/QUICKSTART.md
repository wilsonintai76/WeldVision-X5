# WeldVision-X5 Quick Start Guide

This guide helps you get WeldVision-X5 running on your system. Choose the section that matches your needs.

---

## 📥 Step 1: Get the Software

### Option A: Download from GitHub (Recommended)

**For users with Git installed:**
```bash
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5
```

**For users without Git:**
1. Go to https://github.com/wilsonintai76/WeldVision-X5
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to your desired location (e.g., `D:\WeldVision-X5`)

### Option B: USB Drive Transfer (Offline)

If you received WeldVision-X5 on a USB drive:
1. Copy the `WeldVision-X5` folder to your computer (e.g., `D:\WeldVision-X5`)
2. Continue with the setup instructions below

---

## 🖥️ Step 2: Server Setup (PC/Laptop)

Choose your setup method:

| Method | Best For | Difficulty |
|--------|----------|------------|
| [Easy Start (Docker)](#easy-start-non-technical-users) | Non-technical users, quick setup | ⭐ Easy |
| [Docker Manual](#docker-setup-technical-users) | Technical users, customization | ⭐⭐ Medium |
| [Development Mode](#development-mode-developers) | Developers, code editing | ⭐⭐⭐ Advanced |

---

### Easy Start (Non-Technical Users)

**Prerequisites:**
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac)
- Start Docker Desktop and wait until it shows "Docker is running"

**Windows:**
1. Open the `WeldVision-X5` folder
2. Double-click `start-weldvision.bat`
3. Wait for the browser to open automatically
4. **To stop:** Double-click `stop-weldvision.bat`

**Mac/Linux:**
```bash
cd WeldVision-X5
chmod +x start-weldvision.sh stop-weldvision.sh
./start-weldvision.sh
```

**Access the Application:**
- Open your browser: http://localhost:3000

---

### Docker Setup (Technical Users)

**Prerequisites:**
- Docker Desktop or Docker Engine installed
- Docker Compose v2.0+

**Start Services:**
```bash
cd WeldVision-X5/welding_server

# Start all services (first time - builds images)
docker-compose up -d --build

# Subsequent starts (faster)
docker-compose up -d
```

**Create Admin Account (Optional):**
```bash
docker-compose exec backend python manage.py createsuperuser
```

**View Logs:**
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

**Stop Services:**
```bash
docker-compose down
```

**Access Points:**
| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |

---

### Development Mode (Developers)

For developers who want to edit code with hot-reload.

**Prerequisites:**
- Python 3.10+
- Node.js 18+
- VSCode (recommended)

#### Backend Setup (Terminal 1)

```bash
cd WeldVision-X5/welding_server/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create admin user (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver 0.0.0.0:8000
```

#### Frontend Setup (Terminal 2)

```bash
cd WeldVision-X5/welding_server/frontend

# Install dependencies
npm install

# Start development server with hot-reload
npm run dev
```

#### VSCode Setup

1. Open `WeldVision-X5` folder in VSCode
2. Open integrated terminal: `Ctrl + `` `
3. Split terminal: Click `+` or `Ctrl+Shift+5`
4. Left terminal → Run backend commands
5. Right terminal → Run frontend commands

---

## 📡 Step 3: Edge Device Setup (RDK X5)

The RDK X5 runs the AI inference for real-time weld inspection.

### Option A: Transfer via Network (SSH/SCP)

**From your PC, copy files to RDK X5:**
```bash
# Copy edge device files to RDK X5
scp -r WeldVision-X5/edge_device/* sunrise@192.168.1.100:~/weldvision/
```

**On RDK X5, set up the environment:**
```bash
# SSH into RDK X5
ssh sunrise@192.168.1.100

# Navigate to weldvision folder
cd ~/weldvision

# Install Python dependencies
pip3 install -r requirements.txt

# Test run
python3 main.py
```

### Option B: Transfer via USB Drive

1. **On your PC:**
   - Copy the `edge_device` folder to a USB drive

2. **On RDK X5:**
   - Insert USB drive
   - Mount and copy files:
   ```bash
   # Find USB drive (usually /media/sunrise/USB_NAME or /mnt/usb)
   lsblk
   
   # Copy files
   cp -r /media/sunrise/USB_NAME/edge_device ~/weldvision
   
   # Set up environment
   cd ~/weldvision
   pip3 install -r requirements.txt
   ```

### Option C: Transfer via SD Card

1. Remove SD card from RDK X5
2. Insert into PC using SD card reader
3. Copy `edge_device` folder to the SD card
4. Insert SD card back into RDK X5
5. Copy from SD card to home directory:
   ```bash
   cp -r /path/to/sdcard/edge_device ~/weldvision
   ```

### Start Edge Device Service

**Manual Start (for testing):**
```bash
cd ~/weldvision
python3 main.py
```

**Auto-Start on Boot (for production):**
```bash
# Copy service file
sudo cp weldvision.service /etc/systemd/system/

# Enable auto-start
sudo systemctl enable weldvision
sudo systemctl start weldvision

# Check status
sudo systemctl status weldvision
```

### Configure Edge Device

Edit the configuration to connect to your server:
```bash
cd ~/weldvision
nano .env
```

Set your server IP:
```
SERVER_URL=http://192.168.1.10:8000
```

---

## ✅ Step 4: Verify Everything Works

### Test Server (PC)

1. Open http://localhost:3000 in your browser
2. You should see the WeldVision dashboard
3. Navigate to **Help** page to verify all features

### Test Edge Device (RDK X5)

1. Check the service is running:
   ```bash
   sudo systemctl status weldvision
   ```

2. Check logs for errors:
   ```bash
   tail -f ~/weldvision/runtime/weldvision.log
   ```

3. Verify connection to server in the dashboard:
   - Go to **Edge Management** in the dashboard
   - Device should show as "Connected"

---

## 🔧 Troubleshooting

### Docker Issues

| Problem | Solution |
|---------|----------|
| "Docker is not running" | Start Docker Desktop and wait for it to fully load |
| Port 3000/8000 in use | Stop other applications using these ports |
| Build fails | Run `docker-compose down -v` then `docker-compose up -d --build` |

### Connection Issues

| Problem | Solution |
|---------|----------|
| Can't access localhost:3000 | Wait 30 seconds for containers to start |
| RDK X5 can't connect | Check firewall settings, ensure same network |
| API errors | Check backend logs: `docker-compose logs backend` |

### RDK X5 Issues

| Problem | Solution |
|---------|----------|
| Python module not found | Run `pip3 install -r requirements.txt` |
| Permission denied | Run with `sudo` or fix file permissions |
| Camera not detected | Check camera connections, run `ls /dev/video*` |

---

## 📚 Next Steps

After setup is complete:

1. **Calibrate Cameras** - See [Stereo Calibration Guide](STEREO_CALIBRATION_SETUP.md)
2. **Configure Rubrics** - Set up grading criteria in the dashboard
3. **Add Students** - Import or add students in Management section
4. **Train/Import Model** - See [Training Options](TRAINING_OPTIONS.md)
5. **Deploy Model** - Push trained model to RDK X5

---

## 📞 Quick Reference

| Component | Location | Access |
|-----------|----------|--------|
| Server (PC) | `welding_server/` | http://localhost:3000 |
| Edge Device (RDK X5) | `edge_device/` | SSH to device IP |
| Documentation | `docs/` | GitHub or local files |
| Start Script (Windows) | `start-weldvision.bat` | Double-click |
| Stop Script (Windows) | `stop-weldvision.bat` | Double-click |

**Default Credentials:**
- RDK X5 SSH: `sunrise` / `sunrise`
- Django Admin: Create with `createsuperuser` command
