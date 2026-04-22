import numpy as np
import cv2
import logging

try:
    from hobot_dnn import pyeasy_dnn as dnn
except ImportError:
    dnn = None

logger = logging.getLogger(__name__)

class StereoNetBPU:
    """
    Hobot StereoNet implementation for RDK X5 BPU.
    Provides robust depth estimation on reflective surfaces.
    """
    
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.input_shape = (1, 3, 540, 960)  # Typical StereoNet input shape
        
        if dnn is not None:
            try:
                logger.info(f"Loading StereoNet model from {model_path}")
                self.model = dnn.load(model_path)[0]
                # Get input shape from model if possible
                if hasattr(self.model, 'inputs'):
                    self.input_shape = self.model.inputs[0].properties.shape
                logger.info(f"✅ StereoNet loaded. Input shape: {self.input_shape}")
            except Exception as e:
                logger.error(f"❌ Failed to load StereoNet: {e}")
        else:
            logger.warning("BPU library (hobot_dnn) not found. Running in simulation mode.")

    def preprocess(self, left_bgr: np.ndarray, right_bgr: np.ndarray):
        """
        Resize and normalize images for StereoNet.
        Expected input: BGR images.
        Output: Transposed/Normalized arrays for BPU.
        """
        h, w = self.input_shape[2], self.input_shape[3]
        
        left_resized = cv2.resize(left_bgr, (w, h))
        right_resized = cv2.resize(right_bgr, (w, h))
        
        # BGR to RGB
        left_rgb = cv2.cvtColor(left_resized, cv2.COLOR_BGR2RGB)
        right_rgb = cv2.cvtColor(right_resized, cv2.COLOR_BGR2RGB)
        
        # Normalization (0-1) and transpose to NCHW
        # Note: Some BPU models expect uint8 NV12, others expect float32 NCHW.
        # Assuming float32 NCHW for StereoNet.
        left_data = left_rgb.transpose(2, 0, 1).astype(np.float32) / 255.0
        right_data = right_rgb.transpose(2, 0, 1).astype(np.float32) / 255.0
        
        return left_data[np.newaxis, ...], right_data[np.newaxis, ...]

    def compute_disparity(self, left_bgr: np.ndarray, right_bgr: np.ndarray) -> np.ndarray:
        """
        Run inference on BPU and return disparity map.
        """
        if self.model is None:
            # Simulation: Return random-ish disparity for testing
            return np.random.uniform(0, 64, (left_bgr.shape[0], left_bgr.shape[1])).astype(np.float32)
            
        try:
            left_input, right_input = self.preprocess(left_bgr, right_bgr)
            
            # Run inference
            # Depending on model export, it might take two inputs or one concatenated input
            outputs = self.model.forward([left_input, right_input])
            
            # Extract disparity from output
            # Usually output[0] is the disparity map
            disparity = outputs[0].buffer[0, 0, :, :] # Assume (1, 1, H, W)
            
            # Resize back to original size if needed
            disparity = cv2.resize(disparity, (left_bgr.shape[1], left_bgr.shape[0]))
            
            return disparity
            
        except Exception as e:
            logger.error(f"❌ StereoNet inference failed: {e}")
            return np.zeros((left_bgr.shape[0], left_bgr.shape[1]), dtype=np.float32)
