# 🏗️ WeldVision X5 — Edge Device Runtime

[![Hardware: RDK X5](https://img.shields.io/badge/Hardware-Horizon_RDK_X5-orange.svg)](https://developer.horizon.cc/)
[![AI: YOLOv8](https://img.shields.io/badge/AI-YOLOv8_BPU-blue.svg)](https://github.com/ultralytics/ultralytics)
[![Framework: Python 3.x](https://img.shields.io/badge/Language-Python_3.x-yellow.svg)](https://www.python.org/)

The **WeldVision X5 Edge Runtime** is a production-grade industrial computer vision application designed for the Horizon Robotics RDK X5. It orchestrates high-speed stereo capture, hardware-accelerated AI inference, and real-time triangulation to monitor welding quality in educational and industrial environments.

---

## 🚀 Key Features

*   **⚡ BPU Acceleration**: Leverages the RDK X5's Brain Processing Unit for sub-100ms YOLOv8 inference.
*   **📷 Stereo Analytics**: Simultaneous capture from dual-lens modules for depth estimation.
*   **📶 Resilient Sync**: Local data buffering ensures no data loss during network instability.
*   **🌐 Live Monitoring**: Low-latency MJPEG streaming with diagnostic overlays.
*   **🛠️ Hot-Swap Models**: Update AI models remotely without service interruption.

---

## 🔌 Hardware Setup

To achieve optimal performance, ensure your hardware is configured as follows:

1.  **Workstation**: Horizon RDK X5 (4GB/8GB RAM recommended).
2.  **Vision**: 1080p Stereo Camera Module (USB or MIPI).
3.  **Storage**: Class 10 U3 microSD card (32GB+).
4.  **Network**: Gigabit Ethernet or 5G Wi-Fi for real-time dashboard updates.

### Wiring Diagram
| Component | Port | Purpose |
| :--- | :--- | :--- |
| Stereo Camera | USB 3.0 / MIPI CSI | Frame Capture |
| Power Supply | USB-C (12V/2A) | System Power |
| Network | Ethernet | Backend Communication |

---

## 📀 Software Environment

The edge device requires the official **Horizon RDK Ubuntu Image**.

### 1. Initial Access
Flash the SD card and boot the RDK. Default credentials:
*   **User**: `sunrise`
*   **Pass**: `sunrise`

### 2. Core Dependencies
The runtime depends on proprietary Horizon libraries pre-installed on the default image:
- `hobot_dnn`: BPU inference orchestration.
- `libsrcampy`: Hardware-accelerated camera capturing.

### 3. Application Dependencies
Install the required Python packages:
```bash
pip3 install opencv-python numpy requests
```

---

## 🛠️ Installation & Deployment

### Step 1: Clone and Prepare
Login to the RDK and navigate to your home directory:

```bash
cd /home/sunrise
# Clone the full repository
git clone https://github.com/wilsonintai76/WeldVision-X5.git
cd WeldVision-X5/edge_device
```

### Step 2: Set up Runtime Directory
Create the production directory and copy the edge application files:

```bash
mkdir -p /home/sunrise/welding_app
# Copy only the edge_device components
cp -r * /home/sunrise/welding_app/
cd /home/sunrise/welding_app
```

### Step 3: Install Dependencies
```bash
pip3 install -r requirements.txt
```

---

## ⚙️ Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `BACKEND_URL` | `http://127.0.0.1:8000` | URL of the WeldVision backend. |
| `WELDVISION_DEVICE_ID` | `RDK-X5-01` | Unique identifier for this unit. |
| `WELDVISION_STUDENT_ID` | `S001` | Current student ID (manual/RFID). |
| `WELDVISION_STREAM_PORT` | `8080` | Port for the live MJPEG stream. |

### Step 4: Enable Auto-Start (Production)
Deploy as a systemd service to ensure high availability:

1.  **Copy Service File**:
    ```bash
    sudo cp weldvision.service /etc/systemd/system/
    ```
2.  **Initialize Service**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable weldvision
    sudo systemctl start weldvision
    ```
3.  **Monitor Output**:
    ```bash
    sudo journalctl -u weldvision -f
    ```

---

## 📏 Guide Calibration (ROI Tuning)

The runtime draws a visual guide to ensure students place workpieces correctly. Adjust these in your environment settings:

```bash
# Example: Center and scale the ROI box
export WELDVISION_ROI_X_PCT=0.08  # Left offset
export WELDVISION_ROI_Y_PCT=0.15  # Top offset
export WELDVISION_ROI_W_PCT=0.84  # Width fraction
export WELDVISION_ROI_H_PCT=0.70  # Height fraction
```

> [!TIP]
> Open `http://<device-ip>:8080/stream.mjpg` in a browser while adjusting these values to see the changes in real-time.

---

## 📐 Stereo Calibration (SGBM)

For accurate depth measurements (Bead Height, Undercut Depth), you must provide a calibration file:

1.  **Capture**: Use `/tools/stereo_calibrate.py` to capture chessboard images.
2.  **Generate**: Run the script to produce `stereo_calib.json`.
3.  **Upload**: Place the file in the `/home/sunrise/welding_app/` directory.
4.  **Enable**: Set `WELDVISION_ENABLE_STEREO=1` in your service environment.

---

## 📂 Data Management

*   **Buffering**: If the server is offline, data is stored in `/buffer/` and uploaded automatically when connection is restored.
*   **Logs**: System logs are persisted at `weldvision.log`.
*   **Model Updates**: Drop a new `model_update.bin` into the app folder; the watchdog will swap it automatically with zero downtime.

---

## 🛑 Troubleshooting

| Issue | Potential Cause | Resolution |
| :--- | :--- | :--- |
| `Camera not found` | Loose cable or power drop | Check USB/MIPI seating; use 12V adapter. |
| `DNN fail to load` | Corrupt `.bin` file | Verify model matches BPU version (HB Mapper). |
| `Upload Timed Out` | Network firewall | Port-forward 8000 on the server; check `BACKEND_URL`. |
| `No route to host` | WiFi Disconnected | Check `nmcli device wifi` or Ethernet cable. |
| `Connection Refused`| Wrong IP Address | Verify `BACKEND_URL` matches server's current IP. |

---

<p align="center">
  <b>WeldVision X5</b> • Precision Engineering through Visual Intelligence
</p>
