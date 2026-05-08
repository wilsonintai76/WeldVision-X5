# calibration_data

This directory must contain 50–100 representative weld JPEG/PNG images
used by the Horizon `hb_mapper` compiler to compute Int8 quantisation
thresholds (KL-divergence calibration).

## Requirements

- Images should be 640×640 px (or will be auto-resized by `hb_mapper`).
- Cover the range of lighting conditions, weld types, and defect classes
  present in your Roboflow dataset.
- At least 50 images; 100 gives slightly better threshold accuracy.
- JPEG or PNG — no video files.

## How to Populate

### Option A — Export from Roboflow and commit

1. In Roboflow, create a dataset version with a "calibration" split.
2. Export as "YOLOv8 (folder)" format.
3. Place the raw images (no labels needed) here.
4. `git add calibration_data/*.jpg && git commit -m "Add calibration images"`

### Option B — Download in CI before running hb_mapper

Add a step to `compile_model.yml` that pulls images from your storage
and writes them to `${{ github.workspace }}/calibration_data/` before
the Docker compilation step. Store credentials as GitHub Actions secrets,
never in source files.

> **Note:** Do NOT commit large numbers of full-resolution images to main.
> Use Git LFS or the CI download pattern (Option B) if the dataset exceeds ~50 MB.
