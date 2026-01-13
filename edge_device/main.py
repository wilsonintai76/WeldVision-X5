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
UPLOAD_ENDPOINT = os.getenv('UPLOAD_ENDPOINT', f"{BACKEND_URL}/api/upload-assessment/")

# Camera config
CAMERA_WIDTH = int(os.getenv('WELDVISION_CAMERA_WIDTH', '1280'))
CAMERA_HEIGHT = int(os.getenv('WELDVISION_CAMERA_HEIGHT', '720'))
CAMERA_FPS = int(os.getenv('WELDVISION_CAMERA_FPS', '30'))
CAMERA_MODE = os.getenv('WELDVISION_CAMERA_MODE', 'single')  # single|side_by_side|dual

# Feature toggles
ENABLE_BUFFERING = os.getenv('WELDVISION_ENABLE_BUFFERING', '1').lower() in ('1', 'true', 'yes', 'y')
ENABLE_STREAM = os.getenv('WELDVISION_ENABLE_STREAM', '1').lower() in ('1', 'true', 'yes', 'y')
ENABLE_STEREO = os.getenv('WELDVISION_ENABLE_STEREO', '0').lower() in ('1', 'true', 'yes', 'y')
STEREO_CALIB_PATH = os.getenv('WELDVISION_STEREO_CALIB_PATH', os.path.join(MODEL_DIR, 'stereo_calib.json'))
BUFFER_DIR = os.getenv('WELDVISION_BUFFER_DIR', os.path.join(MODEL_DIR, 'buffer'))
BUFFER_MAX_BYTES = int(os.getenv('WELDVISION_BUFFER_MAX_BYTES', str(2 * 1024 * 1024 * 1024)))

# Overlay stream server
STREAM_HOST = os.getenv('WELDVISION_STREAM_HOST', '0.0.0.0')
STREAM_PORT = int(os.getenv('WELDVISION_STREAM_PORT', '8080'))

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
    from modules.stereo_depth import StereoDepthEstimator, load_calibration_json, depth_to_colormap
except Exception:
    LocalBuffer = None
    LiveState = None
    OverlayStreamServer = None
    StereoDepthEstimator = None
    load_calibration_json = None
    depth_to_colormap = None


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
    """Draw detection boxes and optionally blend a depth heatmap."""
    overlay = image_bgr.copy()

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
        
        # Send POST request
        response = requests.post(
            UPLOAD_ENDPOINT,
            data=data,
            files=files,
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
        depth_estimator=None,
    ):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.shared_model = shared_model
        self.in_q = in_q
        self.out_q = out_q
        self.live_state = live_state
        self.depth_estimator = depth_estimator

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
            if self.depth_estimator is not None and right is not None:
                try:
                    left_rect, right_rect = self.depth_estimator.rectify(left, right)
                    disp = self.depth_estimator.disparity(left_rect, right_rect)
                    Z = self.depth_estimator.depth_map(disp)
                    sgbm_metrics = self.depth_estimator.depth_metrics(Z)
                    if depth_to_colormap is not None:
                        depth_heat = depth_to_colormap(disp)

                    geometric_metrics = {
                        'reinforcement_height_mm': None,
                        'bead_width_mm': None,
                        'undercut_depth_mm': None,
                        'hi_lo_misalignment_mm': None,
                        **sgbm_metrics,
                    }
                except Exception as e:
                    logger.warning(f"SGBM depth failed, using mock: {e}")

            if geometric_metrics is None:
                geometric_metrics = calculate_depth(left)

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

    # Model Watchdog + shared model reference
    watchdog = ModelWatchdog(MODEL_PATH, MODEL_UPDATE_PATH)
    model = watchdog.load_model()
    if model is None and dnn is not None:
        logger.error("❌ Failed to load model - exiting")
        return 1
    shared_model = SharedModel(model)

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

    # Optional: stereo depth
    depth_estimator = None
    if StereoDepthEstimator is not None and ENABLE_STEREO:
        try:
            depth_estimator = StereoDepthEstimator.from_json_path(STEREO_CALIB_PATH)
            logger.info(f"🟦 Stereo depth enabled using {STEREO_CALIB_PATH}")
        except Exception as e:
            logger.warning(f"Stereo depth disabled: {e}")
            depth_estimator = None

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
        depth_estimator=depth_estimator,
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
        while True:
            # Model Watchdog - Check for updates
            if watchdog.check_for_update():
                logger.info("🔄 Reloading model...")
                model = watchdog.load_model()
                shared_model.set(model)

            if buffer_obj is not None and live_state is not None:
                try:
                    stats = buffer_obj.stats()
                    live_state.set_extra({'buffer': stats})
                except Exception:
                    pass

            time.sleep(0.5)

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
