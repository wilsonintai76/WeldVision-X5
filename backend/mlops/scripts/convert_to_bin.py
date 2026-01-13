"""Convert a YOLOv8 model to an RDK X5-compatible `.bin`.

RDK X5 uses Horizon Robotics BPU and expects a quantized `.bin` produced by the
Horizon OpenExplorer (OE) toolchain.

Pipeline:
1) Export weights (.pt) -> ONNX via Ultralytics (unless input is already .onnx)
2) Run `hb_mapper makert` (typically inside Horizon OE Docker) to compile ONNX -> `.bin`

We cannot ship Horizon's proprietary toolchain in this repo, so step (2) is executed
via an external command configured in env var:

    HORIZON_BIN_COMPILE_COMMAND

Placeholders supported:
- {onnx} / {bin} : host paths
- {job_dir}      : host directory containing both files (recommended for docker -v)
- {onnx_container} / {bin_container} : container paths (/workspace/model.onnx|.bin)

Recommended (Docker) format: JSON array of args.
Example (edit image name + hb_mapper flags for your project):

    HORIZON_BIN_COMPILE_COMMAND=[
        "docker","run","--rm",
        "-v","{job_dir}:/workspace",
        "-w","/workspace",
        "<horizon-oe-image>",
        "hb_mapper","makert",
        "--model-type","onnx",
        "--input","{onnx_container}",
        "--output","{bin_container}"
    ]

If you provide a plain string instead, it will be executed via the system shell and
placeholders will be replaced.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
from pathlib import Path


def _get_compile_command(onnx_path: Path, bin_path: Path):
    raw = os.getenv('HORIZON_BIN_COMPILE_COMMAND', '').strip()
    if not raw:
        raise RuntimeError(
            'HORIZON_BIN_COMPILE_COMMAND is not set. Configure it to run the Horizon toolchain.'
        )

    job_dir = bin_path.parent
    onnx_container = Path('/workspace') / onnx_path.name
    bin_container = Path('/workspace') / bin_path.name

    # JSON array form (preferred)
    if raw.startswith('['):
        cmd = json.loads(raw)
        if not isinstance(cmd, list) or not all(isinstance(x, str) for x in cmd):
            raise RuntimeError('HORIZON_BIN_COMPILE_COMMAND JSON must be an array of strings')
        replaced = []
        for s in cmd:
            replaced.append(
                s.replace('{onnx}', str(onnx_path))
                .replace('{bin}', str(bin_path))
                .replace('{job_dir}', str(job_dir))
                .replace('{onnx_container}', str(onnx_container))
                .replace('{bin_container}', str(bin_container))
            )
        return replaced, False

    # Plain string fallback (shell)
    expanded = (
        raw.replace('{onnx}', str(onnx_path))
        .replace('{bin}', str(bin_path))
        .replace('{job_dir}', str(job_dir))
        .replace('{onnx_container}', str(onnx_container))
        .replace('{bin_container}', str(bin_container))
    )
    return expanded, True


def _export_to_onnx(weights: Path, onnx_out: Path, imgsz: int) -> None:
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise RuntimeError('ultralytics is not installed (required to export ONNX)') from exc

    onnx_out.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(weights))
    exported = model.export(format='onnx', imgsz=imgsz, opset=12, simplify=False)
    exported_path = Path(str(exported)).resolve()
    if not exported_path.exists():
        raise FileNotFoundError(f'Export did not produce a file at {exported_path}')

    # Copy to deterministic path
    onnx_out.write_bytes(exported_path.read_bytes())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Path to .pt or .onnx')
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--onnx', required=True, help='Intermediate onnx path (output)')
    parser.add_argument('--out-bin', required=True, help='Output .bin path')
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    onnx_path = Path(args.onnx).resolve()
    bin_path = Path(args.out_bin).resolve()

    if not input_path.exists():
        raise FileNotFoundError(f'Input not found: {input_path}')

    if input_path.suffix.lower() == '.onnx':
        onnx_path.parent.mkdir(parents=True, exist_ok=True)
        onnx_path.write_bytes(input_path.read_bytes())
    else:
        _export_to_onnx(input_path, onnx_path, args.imgsz)

    cmd, use_shell = _get_compile_command(onnx_path, bin_path)

    bin_path.parent.mkdir(parents=True, exist_ok=True)

    print(f'Compiling ONNX -> BIN\n  onnx={onnx_path}\n  bin={bin_path}')
    print(f'CMD: {cmd}')

    result = subprocess.run(
        cmd,
        shell=use_shell,
        check=False,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f'Horizon compiler failed with code {result.returncode}')

    if not bin_path.exists():
        raise FileNotFoundError(f'Compiler did not produce bin at {bin_path}')

    print(f'WELDVISION_ARTIFACT={bin_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
