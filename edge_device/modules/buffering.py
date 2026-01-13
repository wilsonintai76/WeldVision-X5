from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import cv2


@dataclass(frozen=True)
class BufferedItem:
    dir_path: Path

    @property
    def metrics_path(self) -> Path:
        return self.dir_path / "metrics.json"

    @property
    def original_path(self) -> Path:
        return self.dir_path / "image_original.jpg"

    @property
    def heatmap_path(self) -> Path:
        return self.dir_path / "image_heatmap.jpg"

    @property
    def meta_path(self) -> Path:
        return self.dir_path / "meta.json"


class LocalBuffer:
    """Disk-backed spool for assessments when server is offline.

    Layout:
      buffer_root/
        <timestamp>_<uuid>/
          image_original.jpg
          image_heatmap.jpg
          metrics.json
          meta.json
    """

    def __init__(self, buffer_root: str, max_bytes: int = 2 * 1024 * 1024 * 1024):
        self.root = Path(buffer_root)
        self.max_bytes = int(max_bytes)
        self.root.mkdir(parents=True, exist_ok=True)

    def _dir_size_bytes(self, path: Path) -> int:
        total = 0
        for p in path.rglob("*"):
            try:
                if p.is_file():
                    total += p.stat().st_size
            except FileNotFoundError:
                pass
        return total

    def _total_size_bytes(self) -> int:
        total = 0
        for p in self.root.glob("*"):
            if p.is_dir():
                total += self._dir_size_bytes(p)
        return total

    def _prune_if_needed(self) -> None:
        total = self._total_size_bytes()
        if total <= self.max_bytes:
            return

        # Delete oldest bundles first
        dirs = sorted([p for p in self.root.glob("*") if p.is_dir()], key=lambda p: p.name)
        for d in dirs:
            try:
                shutil.rmtree(d, ignore_errors=True)
            except Exception:
                pass
            total = self._total_size_bytes()
            if total <= self.max_bytes:
                return

    def enqueue(
        self,
        *,
        image_bgr,
        heatmap_bgr,
        metrics_json: dict,
        meta: dict,
        jpeg_quality: int = 85,
    ) -> BufferedItem:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        bundle_id = f"{ts}_{uuid.uuid4().hex[:10]}"
        bundle_dir = self.root / bundle_id
        tmp_dir = self.root / (bundle_id + ".tmp")

        tmp_dir.mkdir(parents=True, exist_ok=True)

        # Write images
        ok1, buf1 = cv2.imencode(
            ".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)]
        )
        ok2, buf2 = cv2.imencode(
            ".jpg", heatmap_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)]
        )
        if not ok1 or not ok2:
            raise RuntimeError("Failed to JPEG-encode buffered images")

        (tmp_dir / "image_original.jpg").write_bytes(buf1.tobytes())
        (tmp_dir / "image_heatmap.jpg").write_bytes(buf2.tobytes())

        (tmp_dir / "metrics.json").write_text(json.dumps(metrics_json), encoding="utf-8")
        (tmp_dir / "meta.json").write_text(json.dumps(meta), encoding="utf-8")

        # Atomic rename
        os.replace(str(tmp_dir), str(bundle_dir))

        self._prune_if_needed()
        return BufferedItem(bundle_dir)

    def list_pending(self) -> list[BufferedItem]:
        items = []
        for p in sorted(self.root.glob("*") , key=lambda x: x.name):
            if p.is_dir() and not p.name.endswith(".tmp"):
                items.append(BufferedItem(p))
        return items

    def delete(self, item: BufferedItem) -> None:
        shutil.rmtree(item.dir_path, ignore_errors=True)

    def stats(self) -> dict:
        return {
            "root": str(self.root),
            "count": len(self.list_pending()),
            "bytes": self._total_size_bytes(),
            "max_bytes": self.max_bytes,
        }
