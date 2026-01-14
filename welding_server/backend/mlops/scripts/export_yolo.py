"""Export/convert a YOLOv8 model using Ultralytics.

Right now this supports exporting to ONNX (and any other format Ultralytics supports).
For Horizon RDK (.bin) you still need Horizon's toolchain; you can export ONNX here and
run the vendor compiler separately.

Example:
  python export_yolo.py --weights best.pt --format onnx --imgsz 640 --out model.onnx
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", required=True, help="Path to trained weights (best.pt)")
    parser.add_argument("--format", default="onnx")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--opset", type=int, default=12)
    parser.add_argument("--simplify", action="store_true")
    parser.add_argument("--out", required=True, help="Output path for exported artifact")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:
        print("ERROR: ultralytics is not installed.")
        print(str(exc))
        return 2

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.weights)
    exported = model.export(format=args.format, imgsz=args.imgsz, opset=args.opset, simplify=args.simplify)

    exported_path = Path(str(exported)).resolve()
    if not exported_path.exists():
        raise FileNotFoundError(f"Export did not produce a file at {exported_path}")

    shutil.copy2(exported_path, out_path)
    print(f"WELDVISION_ARTIFACT={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
