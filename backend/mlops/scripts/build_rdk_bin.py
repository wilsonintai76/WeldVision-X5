"""Build a Horizon/RDK `.bin` model artifact.

This helper is kept for manual use. The main app uses /api/convert-model/ with
format=bin and executes the configured Horizon toolchain command.

We cannot ship Horizon's proprietary toolchain in this repo.
Configure it via env var `HORIZON_BIN_COMPILE_COMMAND`.

It supports placeholders:
- {onnx} / {bin}           : host paths
- {job_dir}                : host directory containing both files
- {onnx_container}/{bin_container} : container paths under /workspace

Usage:
    python build_rdk_bin.py --weights best.pt --imgsz 640 --out-bin model.bin
    python build_rdk_bin.py --weights model.onnx --out-bin model.bin
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
from pathlib import Path


def _parse_cmd(cmd: str) -> list[str]:
    cmd = cmd.strip()
    if not cmd:
        return []
    if cmd.startswith('['):
        try:
            arr = json.loads(cmd)
            if isinstance(arr, list) and all(isinstance(x, str) for x in arr):
                return arr
        except Exception:
            pass
    # On Windows, posix=False improves quoting behavior
    return shlex.split(cmd, posix=(os.name != 'nt'))


def _export_to_onnx(weights: Path, imgsz: int, out_onnx: Path) -> None:
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise RuntimeError(
            "ultralytics is required to export ONNX from .pt (pip install ultralytics)"
        ) from exc

    out_onnx.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(weights))
    exported = model.export(format='onnx', imgsz=imgsz, opset=12, simplify=False)
    exported_path = Path(str(exported)).resolve()
    if not exported_path.exists():
        raise FileNotFoundError(f"Export did not produce a file at {exported_path}")

    # Copy to requested ONNX path
    out_onnx.write_bytes(exported_path.read_bytes())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', required=True, help='Path to .pt or .onnx')
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--out-bin', required=True, help='Output .bin path')
    parser.add_argument('--compiler-cmd', default=os.getenv('HORIZON_BIN_COMPILE_COMMAND', ''), help='Compiler command template')
    args = parser.parse_args()

    weights = Path(args.weights).resolve()
    out_bin = Path(args.out_bin).resolve()
    out_bin.parent.mkdir(parents=True, exist_ok=True)

    if not weights.exists():
        raise FileNotFoundError(f"weights not found: {weights}")

    compiler_cmd_tpl = args.compiler_cmd.strip()
    if not compiler_cmd_tpl:
        raise RuntimeError(
            "HORIZON_BIN_COMPILE_COMMAND is not set. Configure your hb_mapper toolchain command, "
            "e.g. docker ... hb_mapper makert --input {onnx_container} --output {bin_container}"
        )

    # Ensure we have ONNX input
    if weights.suffix.lower() == '.onnx':
        onnx_path = weights
    else:
        onnx_path = weights.parent / 'model.onnx'
        _export_to_onnx(weights=weights, imgsz=args.imgsz, out_onnx=onnx_path)

    job_dir = out_bin.parent
    onnx_container = Path('/workspace') / onnx_path.name
    bin_container = Path('/workspace') / out_bin.name

    cmd_str = (
        compiler_cmd_tpl
        .replace('{onnx}', str(onnx_path))
        .replace('{bin}', str(out_bin))
        .replace('{job_dir}', str(job_dir))
        .replace('{onnx_container}', str(onnx_container))
        .replace('{bin_container}', str(bin_container))
    )
    cmd = _parse_cmd(cmd_str)
    if not cmd:
        raise RuntimeError('Failed to parse compiler command')

    print('Running:', ' '.join(cmd))
    result = subprocess.run(cmd, check=False)

    if result.returncode != 0:
        raise RuntimeError(f"Compiler exited with code {result.returncode}")

    if not out_bin.exists():
        raise FileNotFoundError(f"Compiler reported success but output not found: {out_bin}")

    print(f"WELDVISION_ARTIFACT={out_bin}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
