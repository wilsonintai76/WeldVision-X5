from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np


@dataclass
class StereoCalibration:
    image_size: Tuple[int, int]
    Q: np.ndarray
    mapLx: np.ndarray
    mapLy: np.ndarray
    mapRx: np.ndarray
    mapRy: np.ndarray


def load_calibration_json(calib_path: str) -> StereoCalibration:
    p = Path(calib_path)
    data = json.loads(p.read_text(encoding="utf-8"))

    w = int(data["image_size"][0])
    h = int(data["image_size"][1])
    Q = np.array(data["Q"], dtype=np.float32)

    def arr(name):
        return np.array(data[name], dtype=np.float32)

    return StereoCalibration(
        image_size=(w, h),
        Q=Q,
        mapLx=arr("mapLx"),
        mapLy=arr("mapLy"),
        mapRx=arr("mapRx"),
        mapRy=arr("mapRy"),
    )


class StereoDepthEstimator:
    """
    Stereo depth pipeline — runs entirely on the CPU.

    SGBM (Semi-Global Block Matching) is a classical mathematical algorithm.
    It is not a neural network and has no BPU representation.  Every call
    here uses cv2 (OpenCV) or numpy, which the OS dispatches naturally to
    the standard quad-core CPU.

    Pipeline:
        rectify()   — cv2.remap, CPU
        disparity() — cv2.StereoSGBM, CPU
        depth_map() — cv2.reprojectImageTo3D, CPU
    """

    def __init__(
        self,
        calib: StereoCalibration,
        *,
        num_disparities: int = 16 * 10,
        block_size: int = 5,
        min_disparity: int = 0,
    ):
        self.calib = calib

        # Ensure valid SGBM params
        if num_disparities % 16 != 0:
            num_disparities = int(np.ceil(num_disparities / 16.0) * 16)
        block_size = max(3, int(block_size) | 1)  # odd

        P1 = 8 * 3 * block_size * block_size
        P2 = 32 * 3 * block_size * block_size

        self.left_matcher = cv2.StereoSGBM_create(
            minDisparity=min_disparity,
            numDisparities=num_disparities,
            blockSize=block_size,
            P1=P1,
            P2=P2,
            disp12MaxDiff=1,
            uniquenessRatio=10,
            speckleWindowSize=100,
            speckleRange=2,
            preFilterCap=63,
            mode=cv2.STEREO_SGBM_MODE_SGBM_3WAY,
        )

        self.use_wls = hasattr(cv2, "ximgproc") and hasattr(cv2.ximgproc, "createDisparityWLSFilter")
        self.right_matcher = None
        self.wls = None
        if self.use_wls:
            try:
                self.right_matcher = cv2.ximgproc.createRightMatcher(self.left_matcher)
                self.wls = cv2.ximgproc.createDisparityWLSFilter(self.left_matcher)
                self.wls.setLambda(8000)
                self.wls.setSigmaColor(1.5)
            except Exception:
                self.use_wls = False

    def rectify(self, left_bgr, right_bgr):
        c = self.calib
        left_rect = cv2.remap(left_bgr, c.mapLx, c.mapLy, cv2.INTER_LINEAR)
        right_rect = cv2.remap(right_bgr, c.mapRx, c.mapRy, cv2.INTER_LINEAR)
        return left_rect, right_rect

    def disparity(self, left_rect_bgr, right_rect_bgr) -> np.ndarray:
        # CPU — cv2.cvtColor and StereoSGBM.compute run on the quad-core CPU.
        # The metal texture provides enough natural contrast for block matching.
        left_gray = cv2.cvtColor(left_rect_bgr, cv2.COLOR_BGR2GRAY)
        right_gray = cv2.cvtColor(right_rect_bgr, cv2.COLOR_BGR2GRAY)

        disp_left = self.left_matcher.compute(left_gray, right_gray)  # CPU — StereoSGBM

        if self.use_wls and self.right_matcher is not None and self.wls is not None:
            disp_right = self.right_matcher.compute(right_gray, left_gray)
            disp = self.wls.filter(disp_left, left_gray, None, disp_right)
        else:
            disp = disp_left

        # OpenCV SGBM disparity is fixed-point with 4 fractional bits
        disp = disp.astype(np.float32) / 16.0
        return disp

    def depth_map(self, disp: np.ndarray) -> np.ndarray:
        # Reproject to 3D (XYZ in same unit as baseline/focal used in Q)
        points_3d = cv2.reprojectImageTo3D(disp, self.calib.Q)
        Z = points_3d[:, :, 2]
        return Z

    def depth_metrics(self, Z: np.ndarray, roi: Optional[Tuple[int, int, int, int]] = None) -> dict:
        if roi is None:
            h, w = Z.shape[:2]
            # default: center strip
            x = int(w * 0.25)
            y = int(h * 0.4)
            rw = int(w * 0.5)
            rh = int(h * 0.2)
            roi = (x, y, rw, rh)

        x, y, rw, rh = roi
        patch = Z[y : y + rh, x : x + rw]

        # mask invalid
        patch = patch[np.isfinite(patch)]
        patch = patch[patch > 0]

        if patch.size == 0:
            return {
                "z_average_mm": None,
                "z_min_mm": None,
                "z_max_mm": None,
                "z_std_mm": None,
                "roi": [x, y, rw, rh],
            }

        return {
            "z_average_mm": float(np.mean(patch)),
            "z_min_mm": float(np.min(patch)),
            "z_max_mm": float(np.max(patch)),
            "z_std_mm": float(np.std(patch)),
            "roi": [x, y, rw, rh],
        }


def depth_to_colormap(disp: np.ndarray) -> np.ndarray:
    disp_vis = disp.copy()
    disp_vis[disp_vis < 0] = 0
    if np.max(disp_vis) > 0:
        disp_vis = disp_vis / np.max(disp_vis)
    disp_u8 = (disp_vis * 255).astype(np.uint8)
    return cv2.applyColorMap(disp_u8, cv2.COLORMAP_JET)


class WeldFeatureExtractor:
    """
    Extracts weld-specific geometric features from a depth map.
    Analyzes the cross-sectional profile of the weld bead.
    """

    def __init__(self, focal_length_px: float = 800.0, baseline_mm: float = 65.0):
        self.focal_length_px = focal_length_px
        self.baseline_mm = baseline_mm

    def extract_features(self, Z: np.ndarray, roi: Tuple[int, int, int, int]) -> dict:
        x, y, rw, rh = roi
        patch = Z[y : y + rh, x : x + rw].copy()

        # Mask invalid pixels
        valid_mask = np.isfinite(patch) & (patch > 0)
        if not np.any(valid_mask):
            return {}

        # 1. Estimate baseline (base plate depth) using median of edges
        # We assume the weld is in the center of the ROI
        edge_width = max(1, rw // 10)
        left_edge = patch[:, :edge_width]
        right_edge = patch[:, -edge_width:]
        edges = np.concatenate([left_edge[np.isfinite(left_edge)], 
                                right_edge[np.isfinite(right_edge)]])
        
        if edges.size == 0:
            baseline = np.nanmedian(patch[valid_mask])
        else:
            baseline = np.nanmedian(edges)

        # 2. Relative height map (positive = reinforcement, negative = undercut/groove)
        # Note: Depth Z is distance from camera, so smaller Z means higher object
        rel_height = baseline - patch
        rel_height[~valid_mask] = 0

        # 3. Analyze central profile (averaged vertically)
        profile = np.nanmean(rel_height, axis=0)
        
        # Height: Max reinforcement
        height = float(np.max(profile))
        
        # Undercut: Min (most negative) at the edges of the bead
        # We look for dips below baseline
        undercut = float(abs(min(0, np.min(profile))))

        # Width: Horizontal span where height > threshold (e.g. 0.5mm)
        threshold = 0.5
        weld_indices = np.where(profile > threshold)[0]
        if weld_indices.size > 1:
            width_px = weld_indices[-1] - weld_indices[0]
            # Convert px to mm: width_mm = (width_px * Z) / f
            width_mm = float((width_px * baseline) / self.focal_length_px)
        else:
            width_mm = 0.0

        return {
            "reinforcement_height_mm": round(height, 2),
            "bead_width_mm": round(width_mm, 2),
            "undercut_depth_mm": round(undercut, 2),
            "baseline_depth_mm": round(float(baseline), 2)
        }

    def score_weld(self, metrics: dict) -> dict:
        """
        Rule-based scoring based on ISO 5817 / AWS D1.1.
        Returns a score (0-100) and list of violations.
        """
        score = 100
        violations = []

        h = metrics.get("reinforcement_height_mm", 0)
        w = metrics.get("bead_width_mm", 0)
        u = metrics.get("undercut_depth_mm", 0)

        # Rule 1: Excessive Reinforcement (H > 3mm or H > 0.3*W)
        if h > 3.0:
            score -= 20
            violations.append("Excessive reinforcement (>3mm)")
        elif w > 0 and h > 0.3 * w:
            score -= 15
            violations.append("Poor profile (Height/Width ratio too high)")

        # Rule 2: Undercut
        if u > 0.8:
            score -= 30
            violations.append("Severe undercut detected")
        elif u > 0.4:
            score -= 10
            violations.append("Minor undercut")

        # Rule 3: Insufficient Width
        if w < 5.0:
            score -= 10
            violations.append("Bead too narrow")

        return {
            "overall_score": max(0, score),
            "status": "PASS" if score >= 70 else "FAIL",
            "violations": violations
        }
