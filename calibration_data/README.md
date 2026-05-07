# calibration_data/
#
# This directory must contain 50–100 representative weld JPEG/PNG images
# used by the Horizon hb_mapper compiler to compute Int8 quantisation
# thresholds (KL-divergence calibration).
#
# REQUIREMENTS
# ─────────────────────────────────────────────────────────────────────────────
# • Images should be 640×640 px (or will be auto-resized by hb_mapper).
# • Cover the range of lighting conditions, weld types, and defect classes
#   present in your Roboflow dataset.
# • At least 50 images; 100 gives slightly better threshold accuracy.
# • JPEG or PNG — no video files.
#
# HOW TO POPULATE
# ─────────────────────────────────────────────────────────────────────────────
# Option A — Export a calibration split from Roboflow and commit the images:
#   1. In Roboflow, create a dataset version with a "calibration" split.
#   2. Export as "YOLOv8 (folder)" format.
#   3. Place the raw images (no labels needed) here.
#   4. git add calibration_data/*.jpg && git commit -m "Add calibration images"
#
# Option B — Download images in the CI workflow before running hb_mapper:
#   Add a step to compile_model.yml that pulls images from your storage
#   and writes them to ${{ github.workspace }}/calibration_data/ before
#   the Docker compilation step.
#
# DO NOT commit large numbers of full-resolution images to main — use Git LFS
# or the CI download pattern (Option B) if the dataset exceeds ~50 MB.
