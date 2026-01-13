"""Stereo calibration utility (run on PC with OpenCV) to produce rectification maps.

Outputs a JSON file compatible with edge_device/modules/stereo_depth.py:
- image_size
- Q
- mapLx, mapLy, mapRx, mapRy

This is intentionally a minimal scaffold; you can expand it for your camera.

Usage (example):
  python stereo_calibrate.py --left-glob "calib/left/*.png" --right-glob "calib/right/*.png" --out stereo_calib.json

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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--left-glob", required=True)
    ap.add_argument("--right-glob", required=True)
    ap.add_argument("--board-w", type=int, default=9)
    ap.add_argument("--board-h", type=int, default=6)
    ap.add_argument("--square-mm", type=float, default=25.0)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    left_files = sorted(glob.glob(args.left_glob))
    right_files = sorted(glob.glob(args.right_glob))
    if len(left_files) != len(right_files) or len(left_files) < 5:
        raise SystemExit("Need equal number of left/right images (>=5).")

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

    if img_size is None or len(objpoints) < 5:
        raise SystemExit("Not enough valid chessboard detections.")

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
    print(f"Wrote calibration to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
