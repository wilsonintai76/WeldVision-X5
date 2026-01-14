"""Stereo calibration utility (run on PC with OpenCV) to produce rectification maps.

Outputs a JSON file compatible with edge_device/modules/stereo_depth.py:
- image_size
- Q
- mapLx, mapLy, mapRx, mapRy

This is intentionally a minimal scaffold; you can expand it for your camera.

Usage (example):
  python stereo_calibrate.py --left-glob "calib/left/*.png" --right-glob "calib/right/*.png" --out stereo_calib.json

Calibration Image Capture Procedure for RDK X5:
-----------------------------------------------
Capture 20-30 pairs of images in these specific poses:

1. PARALLEL (5 shots): At different distances (Close, Mid, Far)

2. YAW - Side-to-Side (5 shots, ~30-45°):
   - Rotate board so LEFT side is closer to camera
   - Rotate board so RIGHT side is closer to camera
   - Why: Calculates horizontal focal length (fx)

3. PITCH - Front-to-Back (5 shots, ~30-45°):
   - Tilt TOP edge closer to camera (like closing a laptop lid)
   - Tilt BOTTOM edge closer to camera (like opening a laptop lid)
   - Why: Calculates vertical focal length (fy)

4. ROLL - Rotation (5 shots, ~15-20°):
   - Turn board clockwise/counter-clockwise (like a steering wheel)
   - Why: Calculates lens distortion coefficients (k1, k2, k3)

5. CORNER COVERAGE (5-10 shots): Board covering corners of image frame
   - Why: Fixes lens distortion at the edges

CRITICAL: Both Left and Right cameras must see the ENTIRE checkerboard in every shot.
          If one camera cuts it off, discard that pair.

Notes:
- You need synchronized left/right chessboard images.
- Board size is inner corners, e.g. 9x6.
"""

from __future__ import annotations

import argparse
import glob
import json
from pathlib import Path

import cv2
import numpy as np

# Recommended minimum and optimal number of calibration image pairs
MIN_IMAGES = 5
RECOMMENDED_MIN_IMAGES = 20
RECOMMENDED_MAX_IMAGES = 30


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Stereo calibration utility for RDK X5",
        epilog="""
Calibration Pose Guide:
  - Parallel: 5 shots at different distances (close, mid, far)
  - Yaw (30-45°): Left/right side closer to camera -> calculates fx
  - Pitch (30-45°): Top/bottom edge closer (like laptop lid) -> calculates fy
  - Roll (15-20°): Rotate like steering wheel -> calculates distortion (k1,k2,k3)
  - Corner Coverage: Board at image corners -> fixes edge distortion

IMPORTANT: Both cameras must see the ENTIRE checkerboard in every shot!
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--left-glob", required=True)
    ap.add_argument("--right-glob", required=True)
    ap.add_argument("--board-w", type=int, default=9)
    ap.add_argument("--board-h", type=int, default=6)
    ap.add_argument("--square-mm", type=float, default=25.0)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    left_files = sorted(glob.glob(args.left_glob))
    right_files = sorted(glob.glob(args.right_glob))
    
    # Validate image count
    if len(left_files) != len(right_files):
        raise SystemExit("ERROR: Unequal number of left/right images. Each left image must have a corresponding right image.")
    
    if len(left_files) < MIN_IMAGES:
        raise SystemExit(f"ERROR: Need at least {MIN_IMAGES} image pairs, found {len(left_files)}.")
    
    if len(left_files) < RECOMMENDED_MIN_IMAGES:
        print(f"WARNING: Found {len(left_files)} image pairs. For best results, capture {RECOMMENDED_MIN_IMAGES}-{RECOMMENDED_MAX_IMAGES} pairs.")
        print("         Recommended poses: Parallel (5), Yaw (5), Pitch (5), Roll (5), Corner Coverage (5-10)")
    elif len(left_files) > RECOMMENDED_MAX_IMAGES:
        print(f"INFO: Found {len(left_files)} image pairs. This exceeds the recommended {RECOMMENDED_MAX_IMAGES}, but should work fine.")

    pattern_size = (args.board_w, args.board_h)

    objp = np.zeros((args.board_w * args.board_h, 3), np.float32)
    objp[:, :2] = np.mgrid[0 : args.board_w, 0 : args.board_h].T.reshape(-1, 2)
    objp *= float(args.square_mm)

    objpoints = []
    imgpoints_l = []
    imgpoints_r = []

    img_size = None

    for lf, rf in zip(left_files, right_files):
        imgL = cv2.imread(lf)
        imgR = cv2.imread(rf)
        if imgL is None or imgR is None:
            continue

        grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
        grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)
        img_size = (grayL.shape[1], grayL.shape[0])

        okL, cornersL = cv2.findChessboardCorners(grayL, pattern_size)
        okR, cornersR = cv2.findChessboardCorners(grayR, pattern_size)
        if not okL or not okR:
            continue

        crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
        cornersL = cv2.cornerSubPix(grayL, cornersL, (11, 11), (-1, -1), crit)
        cornersR = cv2.cornerSubPix(grayR, cornersR, (11, 11), (-1, -1), crit)

        objpoints.append(objp)
        imgpoints_l.append(cornersL)
        imgpoints_r.append(cornersR)

    # Report detection results
    detected_count = len(objpoints)
    total_count = len(left_files)
    discarded_count = total_count - detected_count
    
    if discarded_count > 0:
        print(f"INFO: Discarded {discarded_count}/{total_count} image pairs (checkerboard not fully visible in both cameras)")
    
    if img_size is None or detected_count < MIN_IMAGES:
        raise SystemExit(f"ERROR: Only {detected_count} valid chessboard detections. Need at least {MIN_IMAGES}.\n"
                        f"       Ensure the ENTIRE checkerboard is visible in BOTH cameras for each image pair.")
    
    if detected_count < RECOMMENDED_MIN_IMAGES:
        print(f"WARNING: Only {detected_count} valid pairs. For best calibration quality, capture {RECOMMENDED_MIN_IMAGES}-{RECOMMENDED_MAX_IMAGES} pairs.")
    else:
        print(f"INFO: Using {detected_count} valid image pairs for calibration.")

    retL, K1, D1, _, _ = cv2.calibrateCamera(objpoints, imgpoints_l, img_size, None, None)
    retR, K2, D2, _, _ = cv2.calibrateCamera(objpoints, imgpoints_r, img_size, None, None)

    flags = cv2.CALIB_FIX_INTRINSIC
    ret, _, _, _, _, R, T, E, F = cv2.stereoCalibrate(
        objpoints,
        imgpoints_l,
        imgpoints_r,
        K1,
        D1,
        K2,
        D2,
        img_size,
        criteria=(cv2.TERM_CRITERIA_MAX_ITER + cv2.TERM_CRITERIA_EPS, 100, 1e-5),
        flags=flags,
    )

    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(K1, D1, K2, D2, img_size, R, T, alpha=0)

    mapLx, mapLy = cv2.initUndistortRectifyMap(K1, D1, R1, P1, img_size, cv2.CV_32FC1)
    mapRx, mapRy = cv2.initUndistortRectifyMap(K2, D2, R2, P2, img_size, cv2.CV_32FC1)

    out = {
        "image_size": [img_size[0], img_size[1]],
        "Q": Q.tolist(),
        "mapLx": mapLx.tolist(),
        "mapLy": mapLy.tolist(),
        "mapRx": mapRx.tolist(),
        "mapRy": mapRy.tolist(),
    }

    Path(args.out).write_text(json.dumps(out), encoding="utf-8")
    
    # Report calibration quality
    print(f"\n{'='*50}")
    print("STEREO CALIBRATION COMPLETE")
    print(f"{'='*50}")
    print(f"  Image pairs used: {detected_count}")
    print(f"  Image size: {img_size[0]}x{img_size[1]}")
    print(f"  Left camera RMS error: {retL:.4f}")
    print(f"  Right camera RMS error: {retR:.4f}")
    print(f"  Stereo calibration RMS error: {ret:.4f}")
    print(f"  Output file: {args.out}")
    print(f"{'='*50}")
    
    if ret > 1.0:
        print("WARNING: High stereo RMS error (>1.0). Consider recapturing calibration images.")
        print("         Ensure varied poses: Parallel, Yaw, Pitch, Roll, and Corner Coverage.")
    elif ret > 0.5:
        print("INFO: Acceptable calibration quality. Good for most applications.")
    else:
        print("INFO: Excellent calibration quality!")
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
