# Prerequisites Guide

Complete hardware and software requirements for WeldVision X5 system deployment.

---

## 📋 Table of Contents

- [Desktop/Server Requirements](#desktopserver-requirements)
- [RDK X5 Edge Device Requirements](#rdk-x5-edge-device-requirements)
- [Network Requirements](#network-requirements)
- [Software Installation](#software-installation)
- [Hardware Setup](#hardware-setup)
- [Pre-deployment Checklist](#pre-deployment-checklist)

---

## 💻 Desktop/Server Requirements

The desktop/server hosts the backend API, frontend dashboard, and MLOps pipeline (training, annotation, model conversion).

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | Intel Core i5 / AMD Ryzen 5 (4 cores) | Intel Core i7 / AMD Ryzen 7 (8+ cores) |
| **RAM** | 8 GB | 16 GB+ |
| **Storage** | 50 GB SSD | 256 GB SSD |
| **GPU** | Not required (CPU training) | NVIDIA GPU (8GB+ VRAM) for faster training |
| **OS** | Windows 10/11, Ubuntu 20.04+, macOS 12+ | Ubuntu 22.04 LTS |

### GPU Requirements (Optional - For Training)

If you plan to train YOLO models locally with GPU acceleration:

- **NVIDIA GPU**: GTX 1660 or better (6GB+ VRAM)
- **CUDA**: 11.8 or 12.x
- **cuDNN**: Compatible with your CUDA version
- **Drivers**: Latest NVIDIA drivers

> **Note**: CPU training is supported but will be significantly slower. For production, GPU is highly recommended.

### Operating System Specific Notes

#### Windows
- **Windows 10/11 Pro** (for Docker Desktop)
- **WSL 2** enabled (for Docker Desktop)
- **Hyper-V** enabled

#### Linux
- **Ubuntu 20.04 LTS or 22.04 LTS** (recommended)
- **Debian 11+**, **CentOS 8+**, or other modern distributions
- Docker and Docker Compose supported natively

#### macOS
- **macOS 12 (Monterey)** or later
- **Docker Desktop for Mac**
- **Intel or Apple Silicon (M1/M2/M3)**

---

## 🤖 RDK X5 Edge Device Requirements

The RDK X5 performs real-time weld inspection inference at the edge.

### Hardware Specifications

| Component | Specification |
|-----------|---------------|
| **Processor** | Horizon RDK X5 SoC |
| **BPU (AI Accelerator)** | Bayes-e Architecture |
| **RAM** | 4GB or 8GB LPDDR4 |
| **Storage** | microSD card (32GB minimum, 64GB+ recommended) |
| **Power** | 5V/3A USB-C or DC 12V |
| **Operating System** | Ubuntu 20.04 (provided by Horizon Robotics) |

### Camera Requirements

For stereo vision depth estimation:

| Component | Specification |
|-----------|---------------|
| **Camera Type** | Stereo camera pair (Left + Right) |
| **Interface** | MIPI CSI-2 (preferred) or USB 3.0 |
| **Resolution** | 1280×720 minimum (1920×1080 recommended) |
| **Frame Rate** | 30 FPS minimum |
| **Synchronization** | Hardware-synchronized stereo pair |
| **Baseline** | 6-12 cm between cameras (adjust for working distance) |

**Recommended Stereo Cameras:**
- Intel RealSense D435/D455 (USB, includes depth processing)
- MYNT EYE D1000 (MIPI/USB, stereo pair)
- Custom MIPI CSI-2 stereo camera modules

### Peripherals

- **Cooling**: Heatsink or small fan (RDK X5 can run hot under continuous inference)
- **Housing**: Industrial enclosure for workshop environment
- **Mounting**: Camera mount/tripod for stable positioning
- **Network**: Ethernet cable (Cat5e or better) for reliable connectivity

---

## 🌐 Network Requirements

### Network Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Desktop/Server │◄────────│   RDK X5 Edge   │
│  (Backend/Web)  │ Ethernet│   (Inference)   │
│  192.168.1.10   │         │  192.168.1.100  │
└─────────────────┘         └─────────────────┘
         │
         │
    ┌────▼────┐
    │ Network │
    │ Switch/ │
    │ Router  │
    └─────────┘
         │
    ┌────▼────┐
    │ Internet│
    │(Optional)│
    └─────────┘
```

### Network Configuration

| Requirement | Specification |
|-------------|---------------|
| **Network Type** | Wired Ethernet (preferred) or WiFi 5/6 |
| **Bandwidth** | 100 Mbps minimum (Gigabit recommended) |
| **Latency** | < 10ms between desktop and RDK X5 |
| **IP Address** | Static IP recommended for RDK X5 |
| **Ports Required** | Backend: 8000, Frontend: 3000, RDK SSH: 22 |

### Firewall Rules

Ensure these ports are open:

**Desktop/Server (Outbound/Inbound):**
- `8000/tcp` - Django REST API
- `3000/tcp` - React Frontend
- `22/tcp` - SSH to RDK X5

**RDK X5 (Inbound):**
- `22/tcp` - SSH access
- Custom ports for streaming (if implemented)

---

## 🛠️ Software Installation

### Desktop/Server Software

#### Option 1: Docker (Recommended)

**Install Docker Desktop:**

<details>
<summary><b>Windows</b></summary>

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Enable WSL 2:
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```
3. Install Docker Desktop
4. Start Docker Desktop
5. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

</details>

<details>
<summary><b>Linux (Ubuntu/Debian)</b></summary>

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

Log out and back in for group changes to take effect.

</details>

<details>
<summary><b>macOS</b></summary>

1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Install the .dmg file
3. Start Docker Desktop from Applications
4. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

</details>

#### Option 2: Native Installation (Development)

<details>
<summary><b>Python 3.10+</b></summary>

**Windows:**
- Download from [python.org](https://www.python.org/downloads/)
- Check "Add Python to PATH" during installation

**Linux:**
```bash
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-pip
```

**macOS:**
```bash
brew install python@3.10
```

Verify:
```bash
python --version  # or python3 --version
```

</details>

<details>
<summary><b>Node.js 18+</b></summary>

**Windows/macOS:**
- Download from [nodejs.org](https://nodejs.org/)

**Linux:**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

</details>

<details>
<summary><b>Git</b></summary>

**Windows:**
- Download from [git-scm.com](https://git-scm.com/download/win)

**Linux:**
```bash
sudo apt install -y git
```

**macOS:**
```bash
brew install git
```

Verify:
```bash
git --version
```

</details>

### RDK X5 Software

The RDK X5 requires:

1. **Ubuntu 20.04** (pre-installed on RDK X5 official image)
2. **Python 3.8+** (pre-installed)
3. **Horizon AI Toolkit** (for model deployment)
4. **OpenCV** with MIPI camera support

**Installation on RDK X5:**

```bash
# SSH into RDK X5
ssh sunrise@192.168.1.100
# Default password: sunrise

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
sudo apt install -y python3-pip python3-opencv

# Install required Python packages
pip3 install -r requirements.txt

# Install Horizon BPU runtime (if not pre-installed)
# Follow Horizon Robotics official documentation
```

---

## 🔧 Hardware Setup

### Desktop/Server Setup

1. **Install Operating System**
   - Use recommended OS (Ubuntu 22.04 LTS preferred)
   - Ensure all updates are installed

2. **Install Software** (see Software Installation section)

3. **Network Configuration**
   - Assign static IP or reserve DHCP lease
   - Configure firewall rules

4. **GPU Setup** (if applicable)
   ```bash
   # Check NVIDIA GPU
   nvidia-smi
   
   # Install CUDA toolkit
   # Follow: https://developer.nvidia.com/cuda-downloads
   ```

### RDK X5 Setup

1. **Flash Operating System**
   - Download official Ubuntu image from Horizon Robotics
   - Flash to microSD card using [Balena Etcher](https://www.balena.io/etcher/)
   - Insert microSD card into RDK X5

2. **Initial Boot**
   - Connect RDK X5 to monitor and keyboard (first boot only)
   - Or use serial console for headless setup
   - Login with default credentials (sunrise/sunrise)

3. **Network Configuration**
   ```bash
   # Set static IP (recommended)
   sudo nano /etc/netplan/01-netcfg.yaml
   ```
   
   Example configuration:
   ```yaml
   network:
     version: 2
     renderer: networkd
     ethernets:
       eth0:
         dhcp4: no
         addresses:
           - 192.168.1.100/24
         gateway4: 192.168.1.1
         nameservers:
           addresses: [8.8.8.8, 8.8.4.4]
   ```
   
   Apply:
   ```bash
   sudo netplan apply
   ```

4. **SSH Configuration**
   ```bash
   # Enable SSH (usually enabled by default)
   sudo systemctl enable ssh
   sudo systemctl start ssh
   
   # Generate SSH keys (on desktop)
   ssh-keygen -t rsa -b 4096
   
   # Copy SSH key to RDK X5
   ssh-copy-id sunrise@192.168.1.100
   ```

5. **Camera Connection**
   - Connect stereo cameras to MIPI CSI-2 ports or USB 3.0
   - Test camera access:
   ```bash
   # For MIPI cameras
   v4l2-ctl --list-devices
   
   # For USB cameras
   ls /dev/video*
   ```

6. **Install Edge Software**
   ```bash
   # Clone repository (or copy files via SCP)
   git clone https://github.com/wilsonintai76/WeldVision-X5.git
   cd WeldVision-X5/edge_device
   
   # Install dependencies
   pip3 install -r requirements.txt
   
   # Test camera modules
   python3 -c "import cv2; print(cv2.__version__)"
   ```

---

## ✅ Pre-deployment Checklist

### Desktop/Server Checklist

- [ ] Operating system installed and updated
- [ ] Docker installed and running (or Python 3.10+ and Node.js 18+)
- [ ] Git installed and configured
- [ ] Network connectivity verified
- [ ] Firewall rules configured (ports 8000, 3000 open)
- [ ] GPU drivers installed (if using GPU training)
- [ ] WeldVision X5 repository cloned
- [ ] Environment variables configured

### RDK X5 Checklist

- [ ] Ubuntu 20.04 flashed to microSD card
- [ ] RDK X5 boots successfully
- [ ] Static IP address configured
- [ ] SSH access from desktop verified
- [ ] Stereo cameras connected and recognized
- [ ] Python 3.8+ installed
- [ ] OpenCV with camera support installed
- [ ] Edge device software installed
- [ ] Network connectivity to desktop verified
- [ ] Horizon BPU runtime installed

### Network Checklist

- [ ] Desktop and RDK X5 on same network
- [ ] Ping test: Desktop ↔ RDK X5 successful
- [ ] SSH access: Desktop → RDK X5 working
- [ ] Bandwidth test completed (100+ Mbps)
- [ ] Latency test completed (< 10ms)

### Testing Connectivity

```bash
# From Desktop - Test RDK X5 connectivity
ping 192.168.1.100
ssh sunrise@192.168.1.100

# From RDK X5 - Test Desktop connectivity
ping 192.168.1.10

# Test camera on RDK X5
python3 -c "import cv2; cap = cv2.VideoCapture(0); print('Camera OK' if cap.isOpened() else 'Camera FAIL')"
```

---

## 🚀 Next Steps

After completing all prerequisites:

1. **Start with [QUICKSTART.md](QUICKSTART.md)** - Launch the application
2. **Read [STEREO_CALIBRATION_SETUP.md](STEREO_CALIBRATION_SETUP.md)** - Calibrate cameras
3. **Configure Edge Device** - Deploy to RDK X5
4. **Access Guide & Help** - In-app documentation at http://localhost:3000

---

## 📞 Support Resources

- **GitHub Repository**: [WeldVision-X5](https://github.com/wilsonintai76/WeldVision-X5)
- **RDK X5 Documentation**: [Horizon Robotics Developer Center](https://developer.horizon.cc/)
- **Docker Documentation**: [docs.docker.com](https://docs.docker.com/)
- **OpenCV Camera Calibration**: [OpenCV Docs](https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html)

---

## 🔍 Troubleshooting Common Issues

### Docker Desktop won't start (Windows)

**Solution:**
1. Enable Hyper-V and WSL 2
   ```powershell
   # Run as Administrator
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
2. Restart computer
3. Install WSL 2 Linux kernel update
4. Start Docker Desktop

### RDK X5 not accessible via SSH

**Solution:**
1. Check physical network connection
2. Verify RDK X5 IP address: `ip addr show`
3. Check SSH service: `sudo systemctl status ssh`
4. Verify firewall settings on both devices

### Cameras not detected on RDK X5

**Solution:**
1. Check physical connections
2. Verify camera power supply
3. List devices: `ls /dev/video*` or `v4l2-ctl --list-devices`
4. Check dmesg logs: `dmesg | grep video`
5. Test with simple OpenCV script

### Out of memory during training

**Solution:**
1. Reduce batch size in training configuration
2. Use smaller image resolution
3. Add more RAM or enable swap space
4. Consider cloud GPU training (Google Colab, AWS, etc.)

---

**Last Updated**: January 14, 2026  
**Version**: 1.0
