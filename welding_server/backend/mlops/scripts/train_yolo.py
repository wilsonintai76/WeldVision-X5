"""Train a YOLOv8 model using Ultralytics.

This script is invoked by the Django backend as a subprocess so we don't rely on
console scripts like `yolo` being available.

Requirements (install in the backend Python env when needed):
- ultralytics
- torch (appropriate for your machine)

Example:
  python train_yolo.py --model yolov8n.pt --data data.yaml --epochs 50 --imgsz 640 --out best.pt
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Pretrained model or model config (e.g. yolov8n.pt)")
    parser.add_argument("--data", required=True, help="Dataset yaml path")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=-1)
    parser.add_argument("--device", default=None)
    parser.add_argument("--project", default="runs")
    parser.add_argument("--name", default="weldvision")
    parser.add_argument("--out", required=True, help="Where to copy best.pt after training")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:
        print("ERROR: ultralytics is not installed.")
        print(str(exc))
        return 2

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.model)
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        project=args.project,
        name=args.name,
        device=args.device,
        batch=args.batch,
    )

    save_dir = Path(getattr(results, "save_dir", ""))
    best_pt = save_dir / "weights" / "best.pt"
    if not best_pt.exists():
        # fallback: try standard runs directory pattern
        # (kept intentionally simple)
        raise FileNotFoundError(f"Could not find best.pt at {best_pt}")

    shutil.copy2(best_pt, out_path)
    print(f"WELDVISION_ARTIFACT={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
