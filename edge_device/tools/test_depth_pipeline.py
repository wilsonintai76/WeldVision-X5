import sys
import os
import numpy as np
import cv2
import logging

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.stereo_depth import StereoDepthEstimator, StereoCalibration, WeldFeatureExtractor, DepthFusionEngine
from modules.stereonet_bpu import StereoNetBPU

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_dummy_calibration():
    # Simple Q matrix for testing
    # Q = [[1, 0, 0, -cx], [0, 1, 0, -cy], [0, 0, 0, f], [0, 0, -1/B, (cx-cx')/B]]
    f = 800.0
    B = 65.0
    cx = 640.0
    cy = 360.0
    Q = np.array([
        [1, 0, 0, -cx],
        [0, 1, 0, -cy],
        [0, 0, 0, f],
        [0, 0, -1/B, 0]
    ], dtype=np.float32)
    
    return StereoCalibration(
        image_size=(1280, 720),
        Q=Q,
        mapLx=np.zeros((720, 1280), dtype=np.float32),
        mapLy=np.zeros((720, 1280), dtype=np.float32),
        mapRx=np.zeros((720, 1280), dtype=np.float32),
        mapRy=np.zeros((720, 1280), dtype=np.float32)
    )

def test_pipeline():
    logger.info("Starting Depth Pipeline Test")
    
    # 1. Setup
    calib = create_dummy_calibration()
    depth_estimator = StereoDepthEstimator(calib)
    stereonet = StereoNetBPU("dummy.bin") # Will run in simulation mode
    extractor = WeldFeatureExtractor(focal_length_px=800.0, baseline_mm=65.0)
    fusion = DepthFusionEngine()
    
    # 2. Test Feature Extractor with synthetic depth map
    logger.info("Testing WeldFeatureExtractor with synthetic depth...")
    # Create a 100x100 depth patch (Z in mm)
    # Baseline at 200mm
    z_map = np.ones((100, 100), dtype=np.float32) * 200.0
    # Add a "bead" in the middle: 3mm reinforcement, 20px wide
    # Higher object = smaller Z. So Z = 200 - 3 = 197
    z_map[:, 40:60] = 197.0
    # Add an "undercut": 1mm deep (Z = 201)
    z_map[:, 38:40] = 201.0
    z_map[:, 60:62] = 201.0
    
    roi = (0, 0, 100, 100)
    metrics = extractor.extract_features(z_map, roi)
    logger.info(f"Synthetic Metrics: {metrics}")
    
    # Expected: Height ~3.0, Width ~(20*200/800) = 5.0, Undercut ~1.0
    assert metrics['reinforcement_height_mm'] >= 2.5
    assert metrics['bead_width_mm'] >= 4.0
    assert metrics['undercut_depth_mm'] >= 0.8
    
    # 3. Test Fusion
    disp_sgbm = np.ones((100, 100), dtype=np.float32) * 10.0
    disp_sn = np.ones((100, 100), dtype=np.float32) * 12.0
    disp_fused = fusion.fuse_disparity(disp_sgbm, disp_sn)
    logger.info(f"Fused disparity (mean): {np.mean(disp_fused)}")
    
    # 4. Scoring
    scoring = fusion.score_weld(metrics)
    logger.info(f"Scoring Results: {scoring}")
    
    logger.info("✅ Pipeline Test PASSED (Verification complete)")

if __name__ == "__main__":
    test_pipeline()

if __name__ == "__main__":
    test_pipeline()
