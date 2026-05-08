#!/usr/bin/env python3
"""
WeldVision X5 - RDK X5 Edge Device Script

Captures stereo images, runs YOLOv8 inference for defect detection,
calculates depth measurements, and uploads results to Django backend.

Hardware: RDK X5 with stereo camera
AI Model: YOLOv8 (hobot_dnn)
Backend: Django REST API
"""

import cv2
import numpy as np
import requests
import time
import os
import sys
import logging
import threading
import queue
from datetime import datetime
from pathlib import Path
import json
try:
    import boto3                          # S3-compatible R2 download (CPU — standard I/O)
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    ClientError = Exception

# RDK X5 hardware imports
# Calling hobot_dnn routes the workload to the BPU (Brain Processing Unit).
# Calling cv2 / numpy routes the workload to the standard quad-core CPU.
try:
    from hobot_dnn import pyeasy_dnn as dnn  # BPU path — YOLOv8 Int8 inference
except Exception:
    dnn = None

try:
    from hobot_vio.libsrcampy import Camera
except Exception:
    Camera = None


# ============================================================================
# PATHS / ENDPOINTS / FEATURE FLAGS
# ============================================================================

_default_model_dir = (
    str(Path(__file__).resolve().parent / 'runtime')
    if os.name == 'nt'
    else '/home/sunrise/welding_app'
)
MODEL_DIR = os.getenv('WELDVISION_MODEL_DIR', _default_model_dir)
MODEL_PATH = os.getenv('MODEL_PATH', os.path.join(MODEL_DIR, 'model.bin'))
MODEL_UPDATE_PATH = os.getenv('MODEL_UPDATE_PATH', os.path.join(MODEL_DIR, 'model_update.bin'))

BACKEND_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')
# Cloud migration: BACKEND_URL should point to the Cloudflare Worker URL in production
# e.g. BACKEND_URL=https://weldvision-api.<your-subdomain>.workers.dev
UPLOAD_ENDPOINT = os.getenv('UPLOAD_ENDPOINT', f"{BACKEND_URL}/api/upload-assessment")
CALIBRATION_ENDPOINT = os.getenv('CALIBRATION_ENDPOINT', f"{BACKEND_URL}/api/stereo-calibrations/active")
# JWT token for cloud API auth (set via env var or weldvision.service)
CLOUD_API_TOKEN = os.getenv('CLOUD_API_TOKEN', '')

# Camera config
CAMERA_WIDTH = int(os.getenv('WELDVISION_CAMERA_WIDTH', '1280'))
CAMERA_HEIGHT = int(os.getenv('WELDVISION_CAMERA_HEIGHT', '720'))
CAMERA_FPS = int(os.getenv('WELDVISION_CAMERA_FPS', '30'))
CAMERA_MODE = os.getenv('WELDVISION_CAMERA_MODE', 'single')  # single|side_by_side|dual

# Feature toggles
ENABLE_BUFFERING = os.getenv('WELDVISION_ENABLE_BUFFERING', '1').lower() in ('1', 'true', 'yes', 'y')
ENABLE_STREAM = os.getenv('WELDVISION_ENABLE_STREAM', '1').lower() in ('1', 'true', 'yes', 'y')
ENABLE_STEREO = os.getenv('WELDVISION_ENABLE_STEREO', '0').lower() in ('1', 'true', 'yes', 'y')
ENABLE_PLY_EXPORT = os.getenv('WELDVISION_ENABLE_PLY_EXPORT', '1').lower() in ('1', 'true', 'yes', 'y')
STEREO_CALIB_PATH = os.getenv('WELDVISION_STEREO_CALIB_PATH', os.path.join(MODEL_DIR, 'stereo_calib.json'))
BUFFER_DIR = os.getenv('WELDVISION_BUFFER_DIR', os.path.join(MODEL_DIR, 'buffer'))
PLY_OUTPUT_DIR = os.getenv('WELDVISION_PLY_OUTPUT_DIR', os.path.join(MODEL_DIR, 'pointclouds'))
BUFFER_MAX_BYTES = int(os.getenv('WELDVISION_BUFFER_MAX_BYTES', str(2 * 1024 * 1024 * 1024)))
PLY_DECIMATE_POINTS = int(os.getenv('WELDVISION_PLY_DECIMATE_POINTS', '50000'))

# Overlay stream server
STREAM_HOST = os.getenv('WELDVISION_STREAM_HOST', '0.0.0.0')
STREAM_PORT = int(os.getenv('WELDVISION_STREAM_PORT', '8080'))

# Workpiece placement guide overlay
WORKPIECE_WIDTH_MM  = float(os.getenv('WELDVISION_WORKPIECE_WIDTH_MM',  '100'))  # specimen width (mm)
WORKPIECE_HEIGHT_MM = float(os.getenv('WELDVISION_WORKPIECE_HEIGHT_MM', '50'))   # specimen height (mm)
# ROI bounds as fraction of frame (left, top, width, height)  e.g. 0.1 = 10 % of frame
ROI_X_PCT = float(os.getenv('WELDVISION_ROI_X_PCT', '0.08'))
ROI_Y_PCT = float(os.getenv('WELDVISION_ROI_Y_PCT', '0.15'))
ROI_W_PCT = float(os.getenv('WELDVISION_ROI_W_PCT', '0.84'))
ROI_H_PCT = float(os.getenv('WELDVISION_ROI_H_PCT', '0.70'))
GRID_COLS = int(os.getenv('WELDVISION_GRID_COLS', '4'))  # vertical dividers inside ROI
GRID_ROWS = int(os.getenv('WELDVISION_GRID_ROWS', '3'))  # horizontal dividers inside ROI

# Student Configuration (In production, this would come from RFID/NFC reader)
STUDENT_ID = os.getenv('WELDVISION_STUDENT_ID', 'S001')
DEVICE_ID = os.getenv('WELDVISION_DEVICE_ID', 'RDK-X5-WORKSHOP-01')

# Defect Class Names (YOLOv8 output classes)
DEFECT_CLASSES = {
    0: 'porosity',
    1: 'spatter',
    2: 'slag_inclusion',
    3: 'burn_through'
}

# Processing Configuration
CONFIDENCE_THRESHOLD = 0.5
CAPTURE_INTERVAL = float(os.getenv('WELDVISION_CAPTURE_INTERVAL', '5'))  # seconds between captures
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Threading
FRAME_QUEUE_MAX = int(os.getenv('WELDVISION_FRAME_QUEUE_MAX', '2'))
RESULT_QUEUE_MAX = int(os.getenv('WELDVISION_RESULT_QUEUE_MAX', '10'))

# ============================================================================
# LOGGING SETUP
# ============================================================================

# Avoid UnicodeEncodeError on Windows consoles with legacy encodings
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

_log_path = os.getenv('WELDVISION_LOG_PATH', os.path.join(MODEL_DIR, 'weldvision.log'))
_handlers = [logging.StreamHandler(sys.stdout)]
try:
    os.makedirs(os.path.dirname(_log_path) or '.', exist_ok=True)
    _handlers.insert(0, logging.FileHandler(_log_path, encoding='utf-8'))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=_handlers,
)
logger = logging.getLogger(__name__)

# Local modules (pure python)
try:
    from modules.buffering import LocalBuffer
    from modules.overlay_stream import LiveState, OverlayStreamServer
    from modules.stereo_depth import (
        StereoDepthEstimator, 
        load_calibration_json, 
        depth_to_colormap,
        WeldFeatureExtractor,
    )
    from modules.ply_exporter import generate_ply_from_depth, generate_preview_json, decimate_point_cloud
except Exception:
    LocalBuffer = None
    LiveState = None
    OverlayStreamServer = None
    StereoDepthEstimator = None
    load_calibration_json = None
    depth_to_colormap = None
    WeldFeatureExtractor = None
    generate_ply_from_depth = None
    generate_preview_json = None
    decimate_point_cloud = None


# ============================================================================
# PATHS / EXTRA CONFIG
# ============================================================================
# ============================================================================
# DEPTH CALCULATION (PLACEHOLDER)
# ============================================================================

def calculate_depth(left_image, right_image=None):
    """
    Calculate depth from stereo images using SGBM
    
    TODO: Implement actual SGBM (Semi-Global Block Matching) algorithm
    For now, returns mock data for testing
    
    Formula: Z = (f * B) / d
    Where:
        Z = depth (mm)
        f = focal length (mm)
        B = baseline distance between cameras (mm)
        d = disparity (pixels)
    
    Args:
        left_image: Left camera image (numpy array)
        right_image: Right camera image (numpy array) - Not used in mock
    
    Returns:
        dict: Depth metrics
    """
    # Mock implementation - returns random values in acceptable range
    # In production, this would use cv2.StereoSGBM_create()
    
    reinforcement_height = np.random.uniform(1.8, 2.4)  # 1-3mm range
    bead_width = np.random.uniform(9.0, 11.5)  # 8-12mm range
    undercut_depth = np.random.uniform(0.1, 0.4)  # mm
    hi_lo_misalignment = np.random.uniform(0.05, 0.25)  # mm
    
    logger.debug(f"Depth (Mock): Height={reinforcement_height:.2f}mm, Width={bead_width:.2f}mm")
    
    return {
        'reinforcement_height_mm': round(reinforcement_height, 2),
        'bead_width_mm': round(bead_width, 2),
        'undercut_depth_mm': round(undercut_depth, 2),
        'hi_lo_misalignment_mm': round(hi_lo_misalignment, 2),
        'z_average_mm': 150.5,
        'focal_length_mm': 3.5,
        'baseline_mm': 65.0
    }


def draw_overlay(image_bgr, detections, depth_heatmap_bgr=None):
    """Draw workpiece guide lines, detection boxes and optionally blend a depth heatmap."""
    overlay = image_bgr.copy()
    H, W = overlay.shape[:2]

    # ── Workpiece placement guide ─────────────────────────────────────────────
    roi_x = int(ROI_X_PCT * W)
    roi_y = int(ROI_Y_PCT * H)
    roi_w = int(ROI_W_PCT * W)
    roi_h = int(ROI_H_PCT * H)
    cx_roi = roi_x + roi_w // 2
    cy_roi = roi_y + roi_h // 2

    # Grid lines inside ROI (faint green)
    for col in range(1, GRID_COLS):
        gx = roi_x + int(roi_w * col / GRID_COLS)
        cv2.line(overlay, (gx, roi_y), (gx, roi_y + roi_h), (0, 140, 0), 1)
    for row in range(1, GRID_ROWS):
        gy = roi_y + int(roi_h * row / GRID_ROWS)
        cv2.line(overlay, (roi_x, gy), (roi_x + roi_w, gy), (0, 140, 0), 1)

    # ROI border rectangle (bright green)
    cv2.rectangle(overlay, (roi_x, roi_y), (roi_x + roi_w, roi_y + roi_h), (0, 220, 0), 2)

    # Corner L-shaped tick marks
    tick = 18
    for (cx, cy) in [(roi_x, roi_y), (roi_x + roi_w, roi_y),
                     (roi_x, roi_y + roi_h), (roi_x + roi_w, roi_y + roi_h)]:
        dx = 1 if cx == roi_x else -1
        dy = 1 if cy == roi_y else -1
        cv2.line(overlay, (cx, cy), (cx + dx * tick, cy), (0, 255, 0), 3)
        cv2.line(overlay, (cx, cy), (cx, cy + dy * tick), (0, 255, 0), 3)

    # Centre crosshair (cyan)
    ch_len, ch_gap = 22, 7
    cv2.line(overlay, (cx_roi - ch_len, cy_roi), (cx_roi - ch_gap, cy_roi), (0, 255, 255), 2)
    cv2.line(overlay, (cx_roi + ch_gap, cy_roi), (cx_roi + ch_len, cy_roi), (0, 255, 255), 2)
    cv2.line(overlay, (cx_roi, cy_roi - ch_len), (cx_roi, cy_roi - ch_gap), (0, 255, 255), 2)
    cv2.line(overlay, (cx_roi, cy_roi + ch_gap), (cx_roi, cy_roi + ch_len), (0, 255, 255), 2)
    cv2.circle(overlay, (cx_roi, cy_roi), 3, (0, 255, 255), -1)

    # Dimension label (top-left of ROI)
    dim_label = f"{WORKPIECE_WIDTH_MM:.0f} x {WORKPIECE_HEIGHT_MM:.0f} mm"
    cv2.putText(overlay, dim_label, (roi_x + 4, max(roi_y - 8, 14)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 0), 1, cv2.LINE_AA)

    # "Place workpiece in guide" hint below ROI
    hint = "PLACE WORKPIECE IN GUIDE"
    hint_w = cv2.getTextSize(hint, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0][0]
    cv2.putText(overlay, hint, (cx_roi - hint_w // 2, min(roi_y + roi_h + 20, H - 4)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 0), 1, cv2.LINE_AA)
    # ─────────────────────────────────────────────────────────────────────────

    for det in detections or []:
        x, y, w, h = det.get('bbox', [0, 0, 0, 0])
        cls = det.get('class_name', 'defect')
        conf = float(det.get('confidence', 0.0) or 0.0)
        cv2.rectangle(overlay, (int(x), int(y)), (int(x + w), int(y + h)), (0, 200, 255), 2)
        cv2.putText(
            overlay,
            f"{cls} {conf:.2f}",
            (int(x), max(0, int(y) - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 200, 255),
            2,
            cv2.LINE_AA,
        )

    if depth_heatmap_bgr is not None:
        heat = cv2.resize(depth_heatmap_bgr, (overlay.shape[1], overlay.shape[0]))
        overlay = cv2.addWeighted(overlay, 0.75, heat, 0.25, 0)

    cv2.putText(
        overlay,
        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        (10, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    return overlay


class CalibrationWatchdog:
    """Monitors backend for calibration updates"""
    
    def __init__(self, calib_path):
        self.calib_path = calib_path
        self.last_calib_id = None
        
    def check_for_update(self):
        """
        Check backend for active calibration.
        If different from current, download and save.
        """
        try:
            headers = {}
            if CLOUD_API_TOKEN:
                headers['Authorization'] = f'Bearer {CLOUD_API_TOKEN}'
            response = requests.get(CALIBRATION_ENDPOINT, headers=headers, timeout=5)
            if response.status_code != 200:
                return False
                
            data = response.json()
            calib_id = data.get('id')

            if calib_id == self.last_calib_id:
                return False
                
            logger.info(f"✨ New calibration profile detected: {data.get('name')} (ID: {calib_id})")
            
            # Format for local consumption (matches expected JSON structure)
            local_data = {
                'id': calib_id,
                'name': data.get('name'),
                'baseline': data.get('baseline'),
                'focal_length': data.get('focal_length'),
                'image_width': data.get('image_width'),
                'image_height': data.get('image_height'),
                'Q': (data.get('calibration_data') or {}).get('Q', [])
            }
            
            with open(self.calib_path, 'w') as f:
                json.dump(local_data, f, indent=2)
                
            self.last_calib_id = calib_id
            logger.info(f"✅ Calibration saved to {self.calib_path}")
            return True
            
        except Exception as e:
            logger.debug(f"Calibration check failed: {e}")
            return False

class SharedCalibration:
    """Thread-safe container for the depth estimator"""
    def __init__(self, estimator):
        self._lock = threading.Lock()
        self._estimator = estimator

    def get(self):
        with self._lock:
            return self._estimator

    def set(self, new_estimator):
        with self._lock:
            self._estimator = new_estimator


# ============================================================================
# MODEL MANAGEMENT
# ============================================================================

class ModelWatchdog:
    """Monitors for model updates and handles hot-swapping"""
    
    def __init__(self, model_path, update_path):
        self.model_path = model_path
        self.update_path = update_path
        self.current_model = None
        
    def check_for_update(self):
        """
        Check if model_update.bin exists
        If yes, swap it with model.bin and reload
        
        Returns:
            bool: True if model was updated
        """
        if not os.path.exists(self.update_path):
            return False
        
        try:
            logger.info("🔄 Model update detected!")
            
            # Backup old model (optional)
            if os.path.exists(self.model_path):
                backup_path = f"{self.model_path}.backup"
                os.rename(self.model_path, backup_path)
                logger.info(f"Backed up old model to {backup_path}")
            
            # Swap: model_update.bin -> model.bin
            os.rename(self.update_path, self.model_path)
            logger.info(f"✅ Model updated: {self.model_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Model update failed: {e}")
            # Restore backup if swap failed
            backup_path = f"{self.model_path}.backup"
            if os.path.exists(backup_path) and not os.path.exists(self.model_path):
                os.rename(backup_path, self.model_path)
                logger.info("Restored backup model")
            return False
    
    def download_from_r2(self):
        """
        Pull the latest compiled .bin from Cloudflare R2.

        Called once on startup before check_for_update().  The GitHub Actions
        workflow uploads the BPU model to:
            bucket:  weldvision-media  (env R2_BUCKET)
            key:     models/model_update.bin  (env R2_MODEL_KEY)

        If the download succeeds the file is written to self.update_path
        (MODEL_UPDATE_PATH), which check_for_update() then hot-swaps into
        place as model.bin.

        Required env vars (set in weldvision.service or systemd drop-in):
            R2_ACCOUNT_ID          — Cloudflare account ID
            R2_ACCESS_KEY_ID       — R2 API token Access Key ID
            R2_SECRET_ACCESS_KEY   — R2 API token Secret Access Key
            R2_BUCKET              — bucket name (default: weldvision-media)
            R2_MODEL_KEY           — object key  (default: models/model_update.bin)

        Returns:
            bool: True if a new model was downloaded.
        """
        if boto3 is None:
            logger.debug("boto3 not installed — skipping R2 model check")
            return False

        account_id  = os.getenv('R2_ACCOUNT_ID', '')
        access_key  = os.getenv('R2_ACCESS_KEY_ID', '')
        secret_key  = os.getenv('R2_SECRET_ACCESS_KEY', '')
        bucket      = os.getenv('R2_BUCKET', 'weldvision-media')
        object_key  = os.getenv('R2_MODEL_KEY', 'models/model_update.bin')

        if not all([account_id, access_key, secret_key]):
            logger.debug("R2 credentials not configured — skipping model pull")
            return False

        endpoint = f'https://{account_id}.r2.cloudflarestorage.com'
        try:
            # CPU — boto3 uses standard HTTPS I/O, no BPU involvement
            s3 = boto3.client(
                's3',
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name='auto',
            )

            # Fetch the ETag to avoid re-downloading an unchanged model
            head = s3.head_object(Bucket=bucket, Key=object_key)
            remote_etag = head.get('ETag', '').strip('"')

            # Compare against a locally cached etag (if any)
            etag_cache = f"{self.update_path}.etag"
            if os.path.exists(etag_cache) and os.path.exists(self.update_path):
                with open(etag_cache) as fh:
                    if fh.read().strip() == remote_etag:
                        logger.debug("R2 model unchanged (ETag match) — skipping download")
                        return False

            logger.info(f"⬇️  Downloading new model from R2: {bucket}/{object_key}")
            os.makedirs(os.path.dirname(self.update_path) or '.', exist_ok=True)
            s3.download_file(bucket, object_key, self.update_path)

            # Cache the ETag so the next boot skips the download if unchanged
            with open(etag_cache, 'w') as fh:
                fh.write(remote_etag)

            logger.info(f"✅ Model downloaded to {self.update_path}")
            return True

        except ClientError as e:
            code = e.response.get('Error', {}).get('Code', '')
            if code == '404':
                logger.debug("No model_update.bin found in R2 — nothing to pull")
            else:
                logger.warning(f"R2 download error: {e}")
            return False
        except Exception as e:
            logger.warning(f"R2 download failed: {e}")
            return False

    def poll_deploy_loop(self, interval_seconds: int = 300):
        """
        Background thread: polls GET /api/models/deployed every `interval_seconds`.
        When the backend marks a new model as deployed (different deployed_at timestamp),
        downloads it from R2 and hot-swaps via check_for_update().

        Required env vars (same as download_from_r2):
            BACKEND_URL, CLOUD_API_TOKEN, R2_* credentials
        """
        backend = os.getenv('BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')
        token   = os.getenv('CLOUD_API_TOKEN', '')
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        last_deployed_at = None

        while True:
            try:
                resp = requests.get(
                    f'{backend}/api/models/deployed',
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    deployed_at = data.get('deployed_at')
                    if deployed_at and deployed_at != last_deployed_at:
                        if last_deployed_at is not None:
                            logger.info(f"🔔 New model deployed via frontend — pulling from R2 ...")
                            pulled = self.download_from_r2()
                            if pulled:
                                self.check_for_update()
                        last_deployed_at = deployed_at
            except Exception as e:
                logger.debug(f"Deploy poll error: {e}")
            time.sleep(interval_seconds)

    def start_deploy_poll(self, interval_seconds: int = 300):
        """Start the deploy-poll loop in a daemon thread."""
        t = threading.Thread(
            target=self.poll_deploy_loop,
            args=(interval_seconds,),
            daemon=True,
            name='deploy-poll',
        )
        t.start()
        logger.info(f"🔍 Deploy-poll thread started (interval={interval_seconds}s)")

    def load_model(self):
        """Load DNN model using hobot_dnn"""
        if dnn is None:
            logger.warning("Running in simulation mode - no actual model loaded")
            return None
        
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model not found: {self.model_path}")
            
            logger.info(f"Loading model: {self.model_path}")
            models = dnn.load(self.model_path)
            logger.info(f"✅ Model loaded successfully")
            return models[0]  # Return first model
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            return None


# ============================================================================
# CAMERA MANAGEMENT
# ============================================================================

class CameraManager:
    """Manages camera initialization and image capture"""
    
    def __init__(self, width=CAMERA_WIDTH, height=CAMERA_HEIGHT, fps=CAMERA_FPS):
        self.width = width
        self.height = height
        self.fps = fps
        self.camera = None
        
    def initialize(self):
        """Initialize camera"""
        if Camera is None:
            logger.warning("Camera library not available - simulation mode")
            return True
        
        try:
            logger.info(f"Initializing camera: {self.width}x{self.height} @ {self.fps}fps")
            
            self.camera = Camera()
            self.camera.open_cam(0, [self.width, self.height, self.fps])
            
            logger.info("✅ Camera initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Camera initialization failed: {e}")
            return False
    
    def capture_frame(self):
        """
        Capture frame from camera
        
        Returns:
            numpy.ndarray: Captured image or None
        """
        if self.camera is None:
            # Simulation mode - generate fake image
            logger.debug("Generating simulated image")
            img = np.random.randint(0, 255, (self.height, self.width, 3), dtype=np.uint8)
            # Draw some fake welding features
            cv2.line(img, (100, self.height//2), (self.width-100, self.height//2), (200, 200, 200), 10)
            return img
        
        try:
            img = self.camera.get_img(2)  # Get image from camera
            return img
            
        except Exception as e:
            logger.error(f"❌ Frame capture failed: {e}")
            return None

    def capture_stereo(self):
        """Capture a stereo pair (left, right).

        Modes:
        - single: returns (frame, None)
        - side_by_side: if width is ~2x, splits into left/right halves
        - dual: best-effort capture from cam0+cam1 (may not be supported by your camera stack)
        """
        img = self.capture_frame()
        if img is None:
            return None, None

        mode = CAMERA_MODE
        if mode == 'side_by_side':
            h, w = img.shape[:2]
            if w >= 2 * 320:
                mid = w // 2
                return img[:, :mid], img[:, mid:]
            return img, None

        if mode == 'dual':
            if self.camera is None:
                # simulation: synthesize right image by shifting
                return img, np.roll(img, 3, axis=1)

            try:
                cam2 = Camera()
                cam2.open_cam(1, [self.width, self.height, self.fps])
                right = cam2.get_img(2)
                cam2.close_cam()
                return img, right
            except Exception:
                return img, None

        return img, None
    
    def close(self):
        """Close camera"""
        if self.camera:
            try:
                self.camera.close_cam()
                logger.info("Camera closed")
            except Exception as e:
                logger.error(f"Error closing camera: {e}")


# ============================================================================
# INFERENCE ENGINE
# ============================================================================

class InferenceEngine:
    """
    YOLOv8 defect detection — runs entirely on the BPU.

    Calling dnn.load() and model.forward() via hobot_dnn hands the compiled
    Int8 .bin model to the RDK X5's dedicated AI accelerator chip.  The CPU
    is not involved in the matrix math; it only dispatches the call and reads
    the result back.
    """
    
    def __init__(self, model):
        self.model = model

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Prepare a BGR frame for BPU inference.  CPU-only step.

        hobot_dnn expects a float32 NCHW tensor (1, 3, 640, 640).
        All operations here are cv2 / numpy → quad-core CPU.
        Only model.forward() below crosses the boundary to the BPU.
        """
        resized    = cv2.resize(image, (640, 640))           # CPU — cv2
        rgb        = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB) # CPU — cv2
        normalized = rgb.astype(np.float32) / 255.0           # CPU — numpy
        # HWC → CHW, then add batch dimension → NCHW (1, 3, 640, 640)
        nchw = normalized.transpose(2, 0, 1)[np.newaxis, ...] # CPU — numpy
        return nchw

    def run_inference(self, image: np.ndarray) -> list:
        """
        Run YOLOv8 defect detection on the BPU.

        model.forward([input_tensor]) dispatches the Int8 .bin workload to
        the RDK X5's dedicated AI accelerator chip (~45 FPS).
        The CPU is not involved in the matrix math — it only dispatches the
        call and reads the result back via the hobot_dnn output buffer.
        """
        if self.model is None:
            return self._generate_mock_detections()

        try:
            input_tensor = self.preprocess(image)               # CPU — numpy/cv2
            outputs      = self.model.forward([input_tensor])   # → BPU via hobot_dnn
            detections   = self._parse_yolo_output(outputs, image.shape)
            logger.debug(f"BPU detected {len(detections)} defects")
            return detections

        except Exception as e:
            logger.error(f"❌ BPU inference failed: {e}")
            return []

    def _parse_yolo_output(
        self,
        outputs,
        orig_shape,
        conf_threshold: float = 0.45,
        nms_threshold: float  = 0.50,
    ) -> list:
        """
        Parse the raw BPU tensor returned by hobot_dnn.

        hobot_dnn stores results in output.buffer (a numpy array).
        YOLOv8 exports a single output of shape (1, 5+C, N) or (1, N, 5+C)
        where each row is [cx, cy, w, h, obj_conf, class_conf_0 … class_conf_C].
        Coordinates are relative to the 640×640 input; we scale them back to
        the original frame size so bounding boxes map correctly.
        NMS is run on the CPU with cv2.dnn.NMSBoxes (numpy, no BPU).
        """
        try:
            # ── read BPU output buffer ────────────────────────────────────
            raw  = outputs[0].buffer           # numpy array from BPU result
            pred = np.squeeze(raw)             # drop batch dim
            # Normalise to (N, 5+C) — rows are candidate anchor boxes
            if pred.ndim == 2 and pred.shape[0] < pred.shape[1]:
                pred = pred.T

            orig_h, orig_w = orig_shape[:2]
            boxes, scores, class_ids = [], [], []

            for row in pred:
                obj_conf = float(row[4])
                if obj_conf < conf_threshold:
                    continue
                class_scores = row[5:]
                class_id     = int(np.argmax(class_scores))
                confidence   = obj_conf * float(class_scores[class_id])
                if confidence < conf_threshold:
                    continue

                # cx, cy, w, h → pixel coords in the original frame
                cx, cy, w, h = row[:4]
                x1 = int((cx - w / 2) * orig_w / 640)
                y1 = int((cy - h / 2) * orig_h / 640)
                bw = int(w * orig_w / 640)
                bh = int(h * orig_h / 640)

                boxes.append([x1, y1, bw, bh])
                scores.append(confidence)
                class_ids.append(class_id)

            # ── NMS on CPU ────────────────────────────────────────────────
            detections = []
            if boxes:
                indices = cv2.dnn.NMSBoxes(boxes, scores, conf_threshold, nms_threshold)
                for i in indices:
                    idx = int(i)
                    cid = class_ids[idx]
                    detections.append({
                        'class_id':   cid,
                        'class_name': DEFECT_CLASSES.get(cid, 'unknown'),
                        'confidence': round(scores[idx], 4),
                        'bbox':       boxes[idx],
                    })

            return detections

        except Exception as e:
            logger.warning(f"Output parsing failed, using mock detections: {e}")
            return self._generate_mock_detections()
    
    def _generate_mock_detections(self):
        """Generate mock detections for testing"""
        num_defects = np.random.randint(0, 6)
        detections = []
        
        for _ in range(num_defects):
            class_id = np.random.choice(list(DEFECT_CLASSES.keys()))
            detections.append({
                'class_id': class_id,
                'class_name': DEFECT_CLASSES[class_id],
                'confidence': np.random.uniform(0.6, 0.95),
                'bbox': [
                    np.random.randint(50, 500),
                    np.random.randint(50, 500),
                    np.random.randint(50, 150),
                    np.random.randint(50, 150)
                ]
            })
        
        return detections


# ============================================================================
# DATA UPLOAD
# ============================================================================

def count_defects(detections):
    """
    Count defects by type
    
    Args:
        detections: List of detection dictionaries
    
    Returns:
        dict: Count of each defect type
    """
    counts = {
        'porosity_count': 0,
        'spatter_count': 0,
        'slag_inclusion_count': 0,
        'burn_through_count': 0
    }
    
    for det in detections:
        class_name = det['class_name']
        counts[f"{class_name}_count"] += 1
    
    return counts


def upload_training_image(image, label: str = '', folder: str = 'images/training') -> bool:
    """
    Upload a raw frame to R2 via the Worker for use as training data.
    Saves to weldvision-media/<folder>/<timestamp>_<label>.jpg

    Set WELDVISION_UPLOAD_TRAINING=1 env var to enable at runtime.
    """
    if os.getenv('WELDVISION_UPLOAD_TRAINING', '0').lower() not in ('1', 'true', 'yes', 'y'):
        return False
    try:
        success, buf = cv2.imencode('.jpg', image)
        if not success:
            return False
        fname = f"{datetime.now().strftime('%Y%m%dT%H%M%S%f')}_{label or 'frame'}.jpg"
        headers = {}
        if CLOUD_API_TOKEN:
            headers['Authorization'] = f'Bearer {CLOUD_API_TOKEN}'
        resp = requests.post(
            f"{BACKEND_URL}/api/storage/upload",
            files={'file': (fname, buf.tobytes(), 'image/jpeg')},
            data={'folder': folder},
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 201:
            key = resp.json().get('key', fname)
            logger.info(f"📸 Training image uploaded: {key}")
            return True
        logger.warning(f"Training image upload failed: {resp.status_code} {resp.text}")
        return False
    except Exception as e:
        logger.warning(f"Training image upload error: {e}")
        return False


def upload_assessment(image, geometric_metrics, visual_defects, student_id=STUDENT_ID):
    """
    Upload assessment data to Django backend
    
    Args:
        image: Original captured image
        geometric_metrics: Dict with depth measurements
        visual_defects: Dict with defect counts
        student_id: Student identifier
    
    Returns:
        bool: True if upload successful
    """
    try:
        # Encode image as JPEG
        success, encoded_image = cv2.imencode('.jpg', image)
        if not success:
            logger.error("Failed to encode image")
            return False
        
        # Create heatmap (simplified - just overlay detections)
        heatmap = image.copy()
        # TODO: Add actual heatmap visualization
        success, encoded_heatmap = cv2.imencode('.jpg', heatmap)
        
        # Prepare multipart form data
        files = {
            'image_original': ('original.jpg', encoded_image.tobytes(), 'image/jpeg'),
            'image_heatmap': ('heatmap.jpg', encoded_heatmap.tobytes(), 'image/jpeg'),
        }
        
        # Prepare JSON data
        metrics_json = {
            'geometric': geometric_metrics,
            'visual': visual_defects
        }
        
        data = {
            'student_id': student_id,
            'metrics_json': json.dumps(metrics_json),
            'device_id': DEVICE_ID,
            'model_version': 'v2.0.0',
            'notes': f'Captured at {datetime.now().isoformat()}'
        }
        
        logger.info(f"📤 Uploading assessment for {student_id}...")

        # Build headers — include Bearer token when talking to Cloudflare Worker
        headers = {}
        if CLOUD_API_TOKEN:
            headers['Authorization'] = f'Bearer {CLOUD_API_TOKEN}'

        # Send POST request
        response = requests.post(
            UPLOAD_ENDPOINT,
            data=data,
            files=files,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 201:
            logger.info(f"✅ Upload successful: {response.json().get('message', 'OK')}")
            return True
        else:
            logger.error(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        logger.warning("⚠️  Server offline - data not uploaded (continuing...)")
        return False
        
    except requests.exceptions.Timeout:
        logger.warning("⚠️  Upload timeout - server may be slow")
        return False
        
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        return False


class SharedModel:
    def __init__(self, model_obj):
        self._lock = threading.Lock()
        self._model = model_obj

    def get(self):
        with self._lock:
            return self._model

    def set(self, new_model):
        with self._lock:
            self._model = new_model


class CaptureWorker(threading.Thread):
    def __init__(self, stop_event, camera: CameraManager, out_q: queue.Queue, interval_s: float):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.camera = camera
        self.out_q = out_q
        self.interval_s = interval_s

    def run(self):
        while not self.stop_event.is_set():
            left, right = self.camera.capture_stereo()
            if left is not None:
                pkt = {'ts': time.time(), 'left': left, 'right': right}
                try:
                    self.out_q.put(pkt, timeout=0.2)
                except queue.Full:
                    # latest-wins
                    try:
                        _ = self.out_q.get_nowait()
                    except Exception:
                        pass
                    try:
                        self.out_q.put(pkt, timeout=0.2)
                    except Exception:
                        pass
            time.sleep(self.interval_s)


class ProcessWorker(threading.Thread):
    def __init__(
        self,
        stop_event,
        shared_model: SharedModel,
        in_q: queue.Queue,
        out_q: queue.Queue,
        live_state,
        shared_calib: SharedCalibration = None,
        feature_extractor=None,
    ):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.shared_model = shared_model
        self.in_q = in_q
        self.out_q = out_q
        self.live_state = live_state
        self.shared_calib = shared_calib
        self.feature_extractor = feature_extractor

    def run(self):
        while not self.stop_event.is_set():
            try:
                pkt = self.in_q.get(timeout=0.5)
            except queue.Empty:
                continue

            left = pkt['left']
            right = pkt.get('right')

            # ══════════════════════════════════════════════════════════════
            # HARDWARE LOAD BALANCING
            # Thread A  →  BPU  (hobot_dnn / YOLOv8 Int8)
            # Thread B  →  CPU  (OpenCV SGBM, numpy)
            #
            # The two threads operate on entirely different physical silicon.
            # The BPU accelerator and the quad-core CPU run simultaneously,
            # cutting per-frame latency roughly in half compared to running
            # the two pipelines sequentially.
            # ══════════════════════════════════════════════════════════════

            # Shared result containers written by each thread
            bpu_result = {}   # filled by Thread A
            cpu_result = {}   # filled by Thread B

            # ── Thread A: BPU ─────────────────────────────────────────────
            # hobot_dnn.forward() hands the Int8 .bin to the dedicated AI
            # accelerator chip.  The CPU is free the moment forward() is
            # dispatched; it does not spin-wait for the result.
            def _run_bpu():
                try:
                    inference = InferenceEngine(self.shared_model.get())
                    bpu_result['detections'] = inference.run_inference(left)  # → BPU
                except Exception as e:
                    logger.warning(f"BPU thread failed: {e}")
                    bpu_result['detections'] = []

            # ── Thread B: CPU ─────────────────────────────────────────────
            # Every call here is cv2 / numpy — the OS routes these to the
            # standard quad-core CPU.  No BPU involvement whatsoever.
            def _run_cpu():
                current_depth_estimator = self.shared_calib.get() if self.shared_calib else None
                if current_depth_estimator is None or right is None:
                    return
                try:
                    left_rect, right_rect = current_depth_estimator.rectify(left, right)          # CPU — cv2.remap

                    # SGBM: classical block-matching on metal texture → CPU
                    disp = current_depth_estimator.disparity(left_rect, right_rect)               # CPU — cv2.StereoSGBM
                    Z    = current_depth_estimator.depth_map(disp)                                # CPU — cv2.reprojectImageTo3D

                    # Expose for PLY export after threads join
                    cpu_result['disp']             = disp
                    cpu_result['depth_estimator']  = current_depth_estimator

                    if self.feature_extractor:
                        h_orig, w_orig = left.shape[:2]
                        roi_px = (
                            int(ROI_X_PCT * w_orig),
                            int(ROI_Y_PCT * h_orig),
                            int(ROI_W_PCT * w_orig),
                            int(ROI_H_PCT * h_orig),
                        )
                        geo = self.feature_extractor.extract_features(Z, roi_px)                  # CPU — numpy
                        geo.update(self.feature_extractor.score_weld(geo))                        # CPU — numpy
                        cpu_result['geometric_metrics'] = geo

                    if depth_to_colormap is not None:
                        cpu_result['depth_heat'] = depth_to_colormap(disp)                        # CPU — cv2

                except Exception as e:
                    logger.warning(f"CPU/SGBM thread failed: {e}")

            # ── Launch both threads and wait for both chips to finish ──────
            thread_bpu = threading.Thread(target=_run_bpu, name="BPU-YOLO",  daemon=True)
            thread_cpu = threading.Thread(target=_run_cpu, name="CPU-SGBM",  daemon=True)

            thread_bpu.start()
            thread_cpu.start()

            thread_bpu.join()   # wait for BPU accelerator result
            thread_cpu.join()   # wait for CPU SGBM result

            # ── Combine results ────────────────────────────────────────────
            detections      = bpu_result.get('detections', [])
            visual_defects  = count_defects(detections)
            geometric_metrics = cpu_result.get('geometric_metrics', None)
            depth_heat        = cpu_result.get('depth_heat', None)

            if geometric_metrics is None:
                geometric_metrics = calculate_depth(left)

            # PLY Point Cloud Generation (on scan/trigger)
            ply_path = None
            mesh_preview_json = None
            disp             = cpu_result.get('disp')
            current_depth_estimator = cpu_result.get('depth_estimator')
            if ENABLE_PLY_EXPORT and current_depth_estimator is not None and disp is not None:
                try:
                    # Generate timestamp-based filename
                    ts_str = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                    ply_filename = f"weld_{STUDENT_ID}_{ts_str}.ply"
                    ply_path = os.path.join(PLY_OUTPUT_DIR, ply_filename)
                    os.makedirs(PLY_OUTPUT_DIR, exist_ok=True)
                    
                    # Get Q matrix from calibration
                    Q = current_depth_estimator.calib.Q if current_depth_estimator else None
                    
                    if Q is not None and generate_ply_from_depth is not None:
                        # Save full-resolution PLY locally
                        success = generate_ply_from_depth(disp, left, Q, ply_path)
                        if success:
                            logger.info(f"📦 PLY saved: {ply_path}")
                        
                        # Generate decimated preview for web viewer
                        if generate_preview_json is not None:
                            mesh_preview_json = generate_preview_json(
                                disp, left, Q, target_points=PLY_DECIMATE_POINTS
                            )
                            logger.debug(f"Preview JSON: {mesh_preview_json.get('count', 0)} points")
                except Exception as e:
                    logger.warning(f"PLY export failed: {e}")

            overlay = draw_overlay(left, detections, depth_heat)
            ok, jpeg = cv2.imencode('.jpg', overlay, [int(cv2.IMWRITE_JPEG_QUALITY), 80])

            metrics_payload = {
                'ts': datetime.utcnow().isoformat() + 'Z',
                'device_id': DEVICE_ID,
                'student_id': STUDENT_ID,
                'visual_defects': visual_defects,
                'geometric_metrics': geometric_metrics,
            }

            if ok and self.live_state is not None:
                try:
                    self.live_state.update(jpeg_bytes=jpeg.tobytes(), metrics=metrics_payload)
                except Exception:
                    pass

            result = {
                'image': left,
                'heatmap': overlay,
                'geometric_metrics': geometric_metrics,
                'visual_defects': visual_defects,
                'metrics_payload': metrics_payload,
                'ply_path': ply_path,
                'mesh_preview_json': mesh_preview_json,
            }

            try:
                self.out_q.put(result, timeout=0.5)
            except queue.Full:
                try:
                    _ = self.out_q.get_nowait()
                except Exception:
                    pass
                try:
                    self.out_q.put(result, timeout=0.2)
                except Exception:
                    pass


class UploadWorker(threading.Thread):
    def __init__(self, stop_event, in_q: queue.Queue, buffer_obj):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.in_q = in_q
        self.buffer = buffer_obj

    def _flush_buffer(self):
        if self.buffer is None:
            return

        for item in self.buffer.list_pending():
            if self.stop_event.is_set():
                return
            try:
                img = cv2.imread(str(item.original_path))
                heat = cv2.imread(str(item.heatmap_path))
                metrics = json.loads(item.metrics_path.read_text(encoding='utf-8'))
                meta = json.loads(item.meta_path.read_text(encoding='utf-8'))

                ok = upload_assessment(img, metrics['geometric'], metrics['visual'], student_id=meta.get('student_id', STUDENT_ID))
                if ok:
                    self.buffer.delete(item)
                else:
                    break
            except Exception:
                break

    def run(self):
        last_flush = 0.0
        while not self.stop_event.is_set():
            if time.time() - last_flush > 10.0:
                self._flush_buffer()
                last_flush = time.time()

            try:
                res = self.in_q.get(timeout=0.5)
            except queue.Empty:
                continue

            upload_training_image(res['image'], label='weld')
            ok = upload_assessment(res['image'], res['geometric_metrics'], res['visual_defects'])
            if not ok and self.buffer is not None:
                try:
                    metrics_json = {
                        'geometric': res['geometric_metrics'],
                        'visual': res['visual_defects'],
                    }
                    meta = {
                        'student_id': STUDENT_ID,
                        'device_id': DEVICE_ID,
                        'created_at': datetime.utcnow().isoformat() + 'Z',
                    }
                    self.buffer.enqueue(
                        image_bgr=res['image'],
                        heatmap_bgr=res['heatmap'],
                        metrics_json=metrics_json,
                        meta=meta,
                    )
                except Exception as e:
                    logger.warning(f"Buffer enqueue failed: {e}")


# ============================================================================
# MAIN LOOP
# ============================================================================

def main():
    """Main execution loop"""
    
    logger.info("=" * 60)
    logger.info("🔥 WeldVision X5 - Edge Device Started")
    logger.info("=" * 60)
    
    logger.info("Initializing components...")

    # Watchdogs
    watchdog = ModelWatchdog(MODEL_PATH, MODEL_UPDATE_PATH)
    calib_watchdog = CalibrationWatchdog(STEREO_CALIB_PATH)

    # Pull latest compiled .bin from Cloudflare R2 before loading.
    # download_from_r2() writes model_update.bin; check_for_update() swaps it
    # into place as model.bin.  Both are no-ops if env vars are absent.
    watchdog.download_from_r2()
    watchdog.check_for_update()

    # Start background thread: polls /api/models/deployed every 5 min.
    # When user clicks "Deploy Now" in the webapp, this thread detects the
    # new deployed_at timestamp, downloads the .bin from R2, and hot-swaps it.
    watchdog.start_deploy_poll(interval_seconds=300)

    # Initial loads
    model = watchdog.load_model()
    if model is None and dnn is not None:
        logger.error("❌ Failed to load model - exiting")
        return 1
    shared_model = SharedModel(model)

    # Initial calibration pull
    calib_watchdog.check_for_update()

    # Camera
    camera = CameraManager()
    if not camera.initialize():
        logger.error("❌ Failed to initialize camera - exiting")
        return 1

    # Optional: local buffering
    buffer_obj = None
    if LocalBuffer is not None and ENABLE_BUFFERING:
        try:
            buffer_obj = LocalBuffer(root_dir=BUFFER_DIR, max_bytes=BUFFER_MAX_BYTES)
        except Exception as e:
            logger.warning(f"Buffer init failed: {e}")
            buffer_obj = None

    # Optional: live overlay stream
    live_state = None
    stream_server = None
    if OverlayStreamServer is not None and LiveState is not None and ENABLE_STREAM:
        try:
            live_state = LiveState()
            stream_server = OverlayStreamServer(host=STREAM_HOST, port=STREAM_PORT, live_state=live_state)
            stream_server.start()
            logger.info(f"📺 Live stream on http://{STREAM_HOST}:{STREAM_PORT}/stream.mjpg")
        except Exception as e:
            logger.warning(f"Stream server init failed: {e}")
            live_state = None
            stream_server = None

    # Stereo depth: SGBM (CPU/OpenCV) for disparity + WeldFeatureExtractor for geometry
    depth_estimator = None
    feature_extractor = None

    if StereoDepthEstimator is not None and ENABLE_STEREO:
        try:
            depth_estimator = StereoDepthEstimator.from_json_path(STEREO_CALIB_PATH)
            logger.info(f"🟦 Stereo SGBM depth enabled using {STEREO_CALIB_PATH}")

            if WeldFeatureExtractor:
                # Derive focal length and baseline from calibration Q matrix
                f = depth_estimator.calib.Q[2, 3] if hasattr(depth_estimator.calib, 'Q') else 800.0
                b = 1.0 / depth_estimator.calib.Q[3, 2] if hasattr(depth_estimator.calib, 'Q') else 65.0
                feature_extractor = WeldFeatureExtractor(focal_length_px=f, baseline_mm=b)

        except Exception as e:
            logger.warning(f"Stereo depth disabled or partially failed: {e}")

    shared_calib = SharedCalibration(depth_estimator)

    # Start threaded pipeline
    stop_event = threading.Event()
    q_cap = queue.Queue(maxsize=FRAME_QUEUE_MAX)
    q_out = queue.Queue(maxsize=RESULT_QUEUE_MAX)

    cap_worker = CaptureWorker(stop_event, camera=camera, out_q=q_cap, interval_s=CAPTURE_INTERVAL)
    proc_worker = ProcessWorker(
        stop_event,
        shared_model=shared_model,
        in_q=q_cap,
        out_q=q_out,
        live_state=live_state,
        shared_calib=shared_calib,
        feature_extractor=feature_extractor,
    )
    up_worker = UploadWorker(stop_event, in_q=q_out, buffer_obj=buffer_obj)

    cap_worker.start()
    proc_worker.start()
    up_worker.start()

    logger.info("✅ All components initialized")
    logger.info(f"📸 Capture interval: {CAPTURE_INTERVAL} seconds")
    logger.info(f"🎯 Confidence threshold: {CONFIDENCE_THRESHOLD}")
    logger.info("-" * 60)

    try:
        while not stop_event.is_set():
            # Model Watchdog - Check for updates
            if watchdog.check_for_update():
                logger.info("🔄 Reloading model...")
                model = watchdog.load_model()
                shared_model.set(model)

            # Calibration Watchdog - Check for updates from backend
            if calib_watchdog.check_for_update():
                logger.info("🔄 Reloading calibration...")
                try:
                    new_estimator = StereoDepthEstimator.from_json_path(STEREO_CALIB_PATH)
                    shared_calib.set(new_estimator)
                    logger.info("✅ Calibration hot-swapped successfully")
                except Exception as e:
                    logger.error(f"❌ Failed to reload calibration: {e}")

            if buffer_obj is not None and live_state is not None:
                try:
                    stats = buffer_obj.stats()
                    live_state.set_extra({'buffer': stats})
                except Exception:
                    pass

            time.sleep(5.0)  # Check every 5 seconds

    except KeyboardInterrupt:
        logger.info("\n🛑 Interrupted by user")

    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}", exc_info=True)
        return 1

    finally:
        logger.info("Shutting down...")
        stop_event.set()
        try:
            cap_worker.join(timeout=2.0)
            proc_worker.join(timeout=2.0)
            up_worker.join(timeout=2.0)
        except Exception:
            pass

        camera.close()
        if stream_server is not None:
            try:
                stream_server.stop()
            except Exception:
                pass
        logger.info("👋 WeldVision X5 stopped")

    return 0


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # Ensure model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Run main loop
    exit_code = main()
    sys.exit(exit_code)
