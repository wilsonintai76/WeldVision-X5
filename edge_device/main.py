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

# RDK X5 specific imports
try:
    from hobot_dnn import pyeasy_dnn as dnn
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
        DepthFusionEngine
    )
    from modules.stereonet_bpu import StereoNetBPU
    from modules.ply_exporter import generate_ply_from_depth, generate_preview_json, decimate_point_cloud
except Exception:
    LocalBuffer = None
    LiveState = None
    OverlayStreamServer = None
    StereoDepthEstimator = None
    load_calibration_json = None
    depth_to_colormap = None
    WeldFeatureExtractor = None
    DepthFusionEngine = None
    StereoNetBPU = None
    generate_ply_from_depth = None
    generate_preview_json = None
    decimate_point_cloud = None


# ============================================================================
# PATHS / EXTRA CONFIG
# ============================================================================
STEREONET_PATH = os.getenv('STEREONET_PATH', os.path.join(MODEL_DIR, 'stereonet.bin'))


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
    """Handles YOLOv8 inference using hobot_dnn"""
    
    def __init__(self, model):
        self.model = model
        
    def preprocess(self, image):
        """Preprocess image for YOLOv8"""
        # Resize to model input size (typically 640x640 for YOLOv8)
        input_size = (640, 640)
        resized = cv2.resize(image, input_size)
        
        # Normalize to 0-1 range
        normalized = resized.astype(np.float32) / 255.0
        
        # Convert BGR to RGB
        rgb = cv2.cvtColor(normalized, cv2.COLOR_BGR2RGB)
        
        return rgb
    
    def run_inference(self, image):
        """
        Run YOLOv8 inference on image
        
        Returns:
            list: Detected defects with bounding boxes and confidence
        """
        if self.model is None:
            # Simulation mode - return mock detections
            return self._generate_mock_detections()
        
        try:
            # Preprocess
            processed = self.preprocess(image)
            
            # Run inference
            outputs = self.model.forward(processed)
            
            # Parse YOLOv8 output
            detections = self._parse_yolo_output(outputs)
            
            logger.debug(f"Detected {len(detections)} defects")
            return detections
            
        except Exception as e:
            logger.error(f"❌ Inference failed: {e}")
            return []
    
    def _parse_yolo_output(self, outputs):
        """Parse YOLOv8 output format"""
        # This is a simplified parser - actual implementation depends on model output format
        detections = []
        
        # YOLOv8 output format: [batch, num_detections, 5+num_classes]
        # [x, y, w, h, confidence, class_scores...]
        
        # TODO: Implement actual YOLOv8 output parsing
        # For now, return mock data
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
        stereonet_bpu=None,
        feature_extractor=None,
        fusion_engine=None,
    ):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.shared_model = shared_model
        self.in_q = in_q
        self.out_q = out_q
        self.live_state = live_state
        self.shared_calib = shared_calib
        self.stereonet_bpu = stereonet_bpu
        self.feature_extractor = feature_extractor
        self.fusion_engine = fusion_engine

    def run(self):
        while not self.stop_event.is_set():
            try:
                pkt = self.in_q.get(timeout=0.5)
            except queue.Empty:
                continue

            left = pkt['left']
            right = pkt.get('right')

            inference = InferenceEngine(self.shared_model.get())
            detections = inference.run_inference(left)
            visual_defects = count_defects(detections)

            depth_heat = None
            geometric_metrics = None
            
            # Get current estimator from thread-safe container
            current_depth_estimator = self.shared_calib.get() if self.shared_calib else None
            
            if current_depth_estimator is not None and right is not None:
                try:
                    left_rect, right_rect = current_depth_estimator.rectify(left, right)
                    
                    # 1. StereoSGBM (OpenCV) - Explainable baseline
                    disp_sgbm = current_depth_estimator.disparity(left_rect, right_rect)
                    
                    # 2. Hobot StereoNet (BPU) - Robust on reflective surfaces
                    disp_sn = np.zeros_like(disp_sgbm)
                    if self.stereonet_bpu:
                        disp_sn = self.stereonet_bpu.compute_disparity(left_rect, right_rect)
                    
                    # 3. Depth Fusion
                    if self.fusion_engine:
                        disp = self.fusion_engine.fuse_disparity(disp_sgbm, disp_sn)
                    else:
                        disp = disp_sgbm
                    
                    Z = current_depth_estimator.depth_map(disp)
                    
                    # 4. Feature Extraction (width, height, undercut)
                    if self.feature_extractor:
                        # Convert ROI percentages to pixel coordinates
                        h_orig, w_orig = left.shape[:2]
                        roi_px = (
                            int(ROI_X_PCT * w_orig),
                            int(ROI_Y_PCT * h_orig),
                            int(ROI_W_PCT * w_orig),
                            int(ROI_H_PCT * h_orig)
                        )
                        geometric_metrics = self.feature_extractor.extract_features(Z, roi_px)
                        
                        # 5. Rule-based scoring + ML fusion
                        if self.fusion_engine:
                            scoring = self.fusion_engine.score_weld(geometric_metrics)
                            geometric_metrics.update(scoring)
                    
                    if depth_to_colormap is not None:
                        depth_heat = depth_to_colormap(disp)

                except Exception as e:
                    logger.warning(f"Depth pipeline failed: {e}")

            if geometric_metrics is None:
                geometric_metrics = calculate_depth(left)

            # PLY Point Cloud Generation (on scan/trigger)
            ply_path = None
            mesh_preview_json = None
            if ENABLE_PLY_EXPORT and current_depth_estimator is not None and right is not None:
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

    # Optional: stereo depth + stereonet bpu + fusion
    depth_estimator = None
    stereonet_bpu = None
    feature_extractor = None
    fusion_engine = None

    if StereoDepthEstimator is not None and ENABLE_STEREO:
        try:
            depth_estimator = StereoDepthEstimator.from_json_path(STEREO_CALIB_PATH)
            logger.info(f"🟦 Stereo depth enabled using {STEREO_CALIB_PATH}")
            
            # Initialize new pipeline components
            if StereoNetBPU:
                stereonet_bpu = StereoNetBPU(STEREONET_PATH)
            
            if WeldFeatureExtractor:
                # Assume focal length and baseline from calibration if available
                f = depth_estimator.calib.Q[2, 3] if hasattr(depth_estimator.calib, 'Q') else 800.0
                b = 1.0 / depth_estimator.calib.Q[3, 2] if hasattr(depth_estimator.calib, 'Q') else 65.0
                feature_extractor = WeldFeatureExtractor(focal_length_px=f, baseline_mm=b)
                
            if DepthFusionEngine:
                fusion_engine = DepthFusionEngine()
                
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
        stereonet_bpu=stereonet_bpu,
        feature_extractor=feature_extractor,
        fusion_engine=fusion_engine,
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
