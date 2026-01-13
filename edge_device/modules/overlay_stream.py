from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional


class LiveState:
    def __init__(self):
        self._lock = threading.Lock()
        self._jpeg: Optional[bytes] = None
        self._metrics: dict = {}
        self._extra: dict = {}
        self._updated_at = 0.0

    def update(self, *, jpeg_bytes: bytes, metrics: dict) -> None:
        with self._lock:
            self._jpeg = jpeg_bytes
            self._metrics = metrics
            self._updated_at = time.time()

    def set_extra(self, extra: dict) -> None:
        with self._lock:
            self._extra = dict(extra or {})

    def snapshot(self):
        with self._lock:
            merged = dict(self._metrics)
            merged.update(self._extra)
            return self._jpeg, merged, self._updated_at


class _Handler(BaseHTTPRequestHandler):
    server_version = "WeldVisionStream/1.0"

    def do_GET(self):
        if self.path.startswith("/snapshot.jpg"):
            self._handle_snapshot()
            return
        if self.path.startswith("/metrics.json"):
            self._handle_metrics()
            return
        if self.path.startswith("/stream.mjpg"):
            self._handle_mjpeg()
            return
        if self.path == "/" or self.path.startswith("/index"):
            self._handle_index()
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, fmt, *args):
        # Reduce noise; main app logs instead
        return

    @property
    def live(self) -> LiveState:
        return self.server.live_state  # type: ignore[attr-defined]

    def _handle_index(self):
        body = (
            "WeldVision X5 Stream\n"
            "- /stream.mjpg\n"
            "- /snapshot.jpg\n"
            "- /metrics.json\n"
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_snapshot(self):
        jpeg, _, _ = self.live.snapshot()
        if not jpeg:
            self.send_response(503)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(jpeg)))
        self.end_headers()
        self.wfile.write(jpeg)

    def _handle_metrics(self):
        _, metrics, _ = self.live.snapshot()
        body = json.dumps(metrics).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_mjpeg(self):
        boundary = "frame"
        self.send_response(200)
        self.send_header("Content-Type", f"multipart/x-mixed-replace; boundary={boundary}")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        try:
            while True:
                jpeg, _, _ = self.live.snapshot()
                if jpeg:
                    self.wfile.write(f"--{boundary}\r\n".encode("utf-8"))
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode("utf-8"))
                    self.wfile.write(jpeg)
                    self.wfile.write(b"\r\n")
                time.sleep(0.2)
        except Exception:
            return


class OverlayStreamServer:
    def __init__(self, host: str, port: int, live_state: LiveState):
        self.host = host
        self.port = port
        self.live_state = live_state
        self._server: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if self._server:
            return

        server = ThreadingHTTPServer((self.host, self.port), _Handler)
        server.live_state = self.live_state  # type: ignore[attr-defined]
        self._server = server

        def _run():
            server.serve_forever(poll_interval=0.5)

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if not self._server:
            return
        self._server.shutdown()
        self._server.server_close()
        self._server = None
