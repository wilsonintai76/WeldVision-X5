import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS


def _get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None and value != "" else default


def _parse_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _parse_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _parse_camera_source(value: str) -> Any:
    # Accept numeric index like "0" or a URL/path.
    try:
        return int(value)
    except ValueError:
        return value


@dataclass
class StreamConfig:
    fps: int
    jpeg_quality: int


class Camera:
    def __init__(self, source: Any) -> None:
        self.source = source
        self.cap = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera source: {source!r}")

        self._last_frame: Optional[np.ndarray] = None
        self._last_frame_time: float = 0.0

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        ok, frame = self.cap.read()
        if ok and frame is not None:
            self._last_frame = frame
            self._last_frame_time = time.time()
        return ok, frame

    def last_frame(self) -> Tuple[Optional[np.ndarray], float]:
        return self._last_frame, self._last_frame_time


def compute_butt_joint_score(frame_bgr: np.ndarray) -> Dict[str, Any]:
    """A simple, explainable heuristic score (0-100).

    This is intentionally lightweight for a student project: it doesn't claim
    compliance with any welding standard; it gives a consistent numeric signal.

    Signals used:
    - focus/sharpness via variance of Laplacian
    - edge energy around a central ROI (where butt seam often appears)
    - brightness/contrast sanity checks
    """

    h, w = frame_bgr.shape[:2]
    if h < 40 or w < 40:
        return {"score": 0, "reason": "frame_too_small"}

    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    # Central ROI (adjust as needed once you know your camera framing).
    roi_w = int(w * 0.50)
    roi_h = int(h * 0.35)
    x1 = (w - roi_w) // 2
    y1 = (h - roi_h) // 2
    roi = gray[y1 : y1 + roi_h, x1 : x1 + roi_w]

    # Sharpness
    lap_var = float(cv2.Laplacian(roi, cv2.CV_64F).var())

    # Edge energy (Sobel magnitude)
    sobelx = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.sqrt(sobelx * sobelx + sobely * sobely)
    edge_energy = float(np.mean(mag))

    # Brightness/contrast
    mean_intensity = float(np.mean(roi))
    std_intensity = float(np.std(roi))

    # Normalize to 0..1 (tuned for typical webcam/industrial lighting ranges)
    sharp_n = np.clip((lap_var - 50.0) / 450.0, 0.0, 1.0)
    edge_n = np.clip((edge_energy - 8.0) / 40.0, 0.0, 1.0)

    # Prefer mid-brightness, penalize too dark/bright
    bright_n = 1.0 - np.clip(abs(mean_intensity - 128.0) / 128.0, 0.0, 1.0)

    # Prefer some contrast but not extreme noise
    contrast_n = np.clip((std_intensity - 20.0) / 60.0, 0.0, 1.0)

    # Weighted score
    score_01 = 0.40 * sharp_n + 0.35 * edge_n + 0.15 * bright_n + 0.10 * contrast_n
    score = int(round(float(score_01) * 100.0))

    # Simple labels for UI
    if score >= 80:
        grade = "excellent"
    elif score >= 60:
        grade = "good"
    elif score >= 40:
        grade = "fair"
    else:
        grade = "poor"

    return {
        "score": score,
        "grade": grade,
        "metrics": {
            "laplacian_variance": lap_var,
            "edge_energy": edge_energy,
            "mean_intensity": mean_intensity,
            "std_intensity": std_intensity,
            "roi": {"x": x1, "y": y1, "w": roi_w, "h": roi_h},
        },
    }


def create_app() -> Flask:
    app = Flask(__name__)

    allowed_origins = [o.strip() for o in _get_env("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
    CORS(app, resources={r"/*": {"origins": allowed_origins}})

    camera_source = _parse_camera_source(_get_env("CAMERA_SOURCE", "0"))
    stream_cfg = StreamConfig(
        fps=_parse_int("STREAM_FPS", 15),
        jpeg_quality=int(np.clip(_parse_int("STREAM_JPEG_QUALITY", 80), 20, 95)),
    )

    cam = Camera(camera_source)

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.get("/stream")
    def stream():
        def gen():
            frame_interval = 1.0 / max(stream_cfg.fps, 1)
            encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), int(stream_cfg.jpeg_quality)]
            while True:
                start = time.time()
                ok, frame = cam.read()
                if not ok or frame is None:
                    time.sleep(0.05)
                    continue

                ok2, jpg = cv2.imencode(".jpg", frame, encode_params)
                if not ok2:
                    continue

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n"
                )

                elapsed = time.time() - start
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)

        return Response(gen(), mimetype="multipart/x-mixed-replace; boundary=frame")

    @app.post("/evaluate")
    def evaluate():
        # If a frame is sent (base64) you can add that later; for now we evaluate the latest captured frame.
        frame, ts = cam.last_frame()
        if frame is None:
            # Try to grab one immediately
            ok, frame2 = cam.read()
            if not ok or frame2 is None:
                return jsonify({"error": "no_frame_available"}), 503
            frame = frame2
            ts = time.time()

        result = compute_butt_joint_score(frame)
        payload = {
            "joint_type": "butt_joint",
            "captured_at": ts,
            **result,
        }
        return jsonify(payload)

    return app


if __name__ == "__main__":
    # Optional: load a local .env-like file by sourcing it in your shell.
    host = _get_env("EDGE_HOST", "0.0.0.0")
    port = _parse_int("EDGE_PORT", 5000)
    app = create_app()
    app.run(host=host, port=port, debug=False, threaded=True)
