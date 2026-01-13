# WeldVision X5 - Edge Device

Python script for RDK X5 edge device that handles:
- Stereo camera capture
- YOLOv8 defect detection
- Depth calculation (SGBM when calibration is provided; mock fallback)
- Real-time overlay streaming (MJPEG)
- Local data buffering when server offline
- Data upload to Django backend

## Hardware Requirements

- RDK X5 Development Board
- Stereo camera module (1080p)
- Network connection to server

## Dependencies

### Pre-installed on RDK X5:
- `hobot_dnn` - Horizon Robotics DNN inference library
- `libsrcampy` - Camera interface library

### Install via pip:
```bash
pip3 install -r requirements.txt
```

## Setup

### 1. Create Application Directory

```bash
mkdir -p /home/sunrise/welding_app
cd /home/sunrise/welding_app
```

### 2. Copy Files

```bash
# Copy main.py to RDK X5
scp main.py sunrise@192.168.1.100:/home/sunrise/welding_app/

# Copy model file
scp model.bin sunrise@192.168.1.100:/home/sunrise/welding_app/
```

### 3. Install Dependencies

```bash
pip3 install cv2-python numpy requests
```

### 4. Configure Settings

Prefer environment variables (recommended for systemd / production):

```bash
# Server
export BACKEND_URL="http://192.168.1.100:8000"

# Identity
export WELDVISION_STUDENT_ID="S001"
export WELDVISION_DEVICE_ID="RDK-X5-WORKSHOP-01"

# Optional features
export WELDVISION_ENABLE_STREAM=1
export WELDVISION_STREAM_PORT=8080
export WELDVISION_ENABLE_BUFFERING=1

# Optional stereo depth (requires calibration json)
export WELDVISION_ENABLE_STEREO=1
export WELDVISION_STEREO_CALIB_PATH=/home/sunrise/welding_app/stereo_calib.json
```

## Running

### Manual Start

```bash
cd /home/sunrise/welding_app
python3 main.py
```

### Auto-Start on Boot (systemd)

Create service file: `/etc/systemd/system/weldvision.service`

```ini
[Unit]
Description=WeldVision X5 Edge Device
After=network.target

[Service]
Type=simple
User=sunrise
WorkingDirectory=/home/sunrise/welding_app
Environment=BACKEND_URL=http://192.168.1.100:8000
Environment=WELDVISION_STUDENT_ID=S001
Environment=WELDVISION_DEVICE_ID=RDK-X5-WORKSHOP-01
Environment=WELDVISION_ENABLE_STREAM=1
Environment=WELDVISION_STREAM_PORT=8080
Environment=WELDVISION_ENABLE_BUFFERING=1
Environment=WELDVISION_BUFFER_DIR=/home/sunrise/welding_app/buffer
Environment=WELDVISION_BUFFER_MAX_BYTES=2147483648
Environment=WELDVISION_LOG_PATH=/home/sunrise/welding_app/weldvision.log
# Optional stereo depth (requires calibration JSON)
#Environment=WELDVISION_ENABLE_STEREO=1
#Environment=WELDVISION_STEREO_CALIB_PATH=/home/sunrise/welding_app/stereo_calib.json
ExecStart=/usr/bin/python3 /home/sunrise/welding_app/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable weldvision
sudo systemctl start weldvision
sudo systemctl status weldvision
```

Tip: if you prefer keeping config out of the unit file, create an environment file like
`/etc/default/weldvision` and use `EnvironmentFile=/etc/default/weldvision` instead.

## Architecture

### Pipeline Flow (Multi-threaded)

```
┌──────────────────────────────────────────────────────────┐
│  ModelWatchdog                                           │
│  - watches model_update.bin                              │
│  - atomically swaps to model.bin                         │
└───────────────────────────────┬──────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────┐
│  CaptureWorker (thread)                                  │
│  - capture frame or stereo pair                          │
└───────────────────────────────┬──────────────────────────┘
                                │  queue
┌───────────────────────────────▼──────────────────────────┐
│  ProcessWorker (thread)                                  │
│  - YOLO inference                                        │
│  - optional SGBM depth (if calibrated)                   │
│  - draw overlay + publish to MJPEG stream state          │
└───────────────────────────────┬──────────────────────────┘
                                │  queue
┌───────────────────────────────▼──────────────────────────┐
│  UploadWorker (thread)                                   │
│  - POST /api/upload-assessment/                          │
│  - if offline: spool bundle to disk buffer               │
│  - periodically flush buffer when server returns         │
└──────────────────────────────────────────────────────────┘
```

## Model Update Mechanism

The script implements a **hot-swap watchdog**:

1. Backend SCPs model to `/home/sunrise/welding_app/model_update.bin`
2. Watchdog detects `model_update.bin` in main loop
3. Backs up `model.bin` → `model.bin.backup`
4. Renames `model_update.bin` → `model.bin`
5. Reloads DNN model
6. Continues processing (no downtime)

**Why `model_update.bin`?**
- Prevents corruption if model.bin is being read during upload
- Atomic swap ensures clean model updates
- No service restart required

## Configuration

### Camera Settings

```python
CAMERA_WIDTH = 1920
CAMERA_HEIGHT = 1080
CAMERA_FPS = 30
```

### Model Settings

```python
MODEL_PATH = "/home/sunrise/welding_app/model.bin"
CONFIDENCE_THRESHOLD = 0.5  # Detection confidence
```

### Upload Settings

```python
BACKEND_URL = "http://192.168.1.100:8000"
CAPTURE_INTERVAL = 5  # seconds between captures
MAX_RETRIES = 3
```

### Live Stream (MJPEG)

When `WELDVISION_ENABLE_STREAM=1`:

- `http://<device-ip>:8080/stream.mjpg`
- `http://<device-ip>:8080/snapshot.jpg`
- `http://<device-ip>:8080/metrics.json`

### Local Buffering (Offline)

When `WELDVISION_ENABLE_BUFFERING=1`, failed uploads are spooled to:

- `/home/sunrise/welding_app/buffer/` (default)

The uploader periodically retries buffered items.

## Defect Classes

YOLOv8 model detects 4 visual defect types:

```python
DEFECT_CLASSES = {
    0: 'porosity',
    1: 'spatter',
    2: 'slag_inclusion',
    3: 'burn_through'
}
```

## Depth Calculation (Placeholder)

Current implementation uses **mock data** for testing:

```python
def calculate_depth(left_image, right_image=None):
    # Returns random values in acceptable ranges
    return {
        'reinforcement_height_mm': 2.1,  # 1-3mm
        'bead_width_mm': 10.2,           # 8-12mm
        'undercut_depth_mm': 0.3,
        'hi_lo_misalignment_mm': 0.1
    }
```

### Optional: Real SGBM Stereo Depth

If you provide a calibration JSON (see next section) and enable stereo depth, the edge runtime will compute disparity/depth using SGBM and include additional metrics.

Implementation reference (simplified):

```python
stereo = cv2.StereoSGBM_create(
    minDisparity=0,
    numDisparities=16*5,
    blockSize=5
)
disparity = stereo.compute(left_gray, right_gray)
depth = (focal_length * baseline) / disparity
```

## Stereo Calibration (PC/Laptop)

To enable SGBM depth you need a rectified stereo calibration file (`stereo_calib.json`).

1) Capture stereo images on a PC (or from device) with a chessboard target.

2) Run the calibration tool:

```bash
cd edge_device/tools
python3 stereo_calibrate.py --help
```

3) Copy `stereo_calib.json` to the device:

```bash
scp stereo_calib.json sunrise@192.168.1.100:/home/sunrise/welding_app/stereo_calib.json
```

4) Enable stereo mode:

```bash
export WELDVISION_ENABLE_STEREO=1
export WELDVISION_STEREO_CALIB_PATH=/home/sunrise/welding_app/stereo_calib.json
```

## Error Handling

The script is designed to **never crash**:

- ✅ Server offline: Logs warning, continues processing
- ✅ Camera failure: Skips frame, retries next iteration
- ✅ Model load error: Exits gracefully
- ✅ Inference failure: Logs error, continues
- ✅ Upload timeout: Non-blocking, continues capture

## Logging

Logs are written to:
- **File**: `/home/sunrise/welding_app/weldvision.log` (default; configurable via `WELDVISION_LOG_PATH`)
- **Console**: stdout (for systemd journal)

View logs:
```bash
# Tail log file
tail -f /home/sunrise/welding_app/weldvision.log

# systemd journal
sudo journalctl -u weldvision -f
```

## Testing Without RDK Hardware

The script can run in **simulation mode** on any Linux system:

```bash
# hobot_dnn and libsrcampy imports will fail gracefully
python3 main.py
```

Simulation mode:
- Generates fake images
- Returns mock detections
- Tests upload logic without hardware

## Troubleshooting

### Camera Not Detected

```bash
# Check camera device
ls /dev/video*

# Test camera
v4l2-ctl --list-devices
```

### Model Load Failure

```bash
# Check model file exists
ls -lh /home/sunrise/welding_app/model.bin

# Check permissions
chmod 644 /home/sunrise/welding_app/model.bin
```

### Upload Fails

```bash
# Test server connectivity
curl http://192.168.1.100:8000/api/assessments/

# Check network
ping 192.168.1.100
```

## Performance

- **Inference**: ~50-100ms per frame (RDK X5 BPU)
- **Capture**: 30 FPS (processed at 0.2 FPS)
- **Upload**: ~200-500ms (depends on network)
- **Total cycle**: ~5-6 seconds

## Future Enhancements

- [x] Implement actual SGBM depth calculation (optional via calibration JSON; mock fallback)
- [ ] Add RFID reader integration for student ID
- [x] Real-time visualization overlay (MJPEG stream)
- [x] Local data buffering when server offline
- [x] Multi-threading for parallel processing
- [x] Hardware-accelerated inference via RDK X5 BPU (`hobot_dnn`)
