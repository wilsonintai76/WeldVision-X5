# Training YOLOv8 on Google Colab for WeldVision-X5

This guide walks you through training a YOLOv8 weld defect detection model using
Google Colab (free T4 GPU), then deploying it to the RDK X5 via the WeldVision
MLOps pipeline.

---

## Prerequisites

- Google account (for Colab)
- Roboflow account with an annotated weld defect dataset
- Access to the WeldVision admin dashboard

---

## Step 1 — Prepare Your Dataset in Roboflow

1. Open your Roboflow project
2. Go to **Versions** → select or generate a version
3. Click **Export Dataset**
4. Format: **YOLOv8** → **Show download code**
5. Copy the Python snippet — you'll need the `api_key`, workspace slug, project slug, and version number

---

## Step 2 — Open Google Colab

Go to [https://colab.research.google.com](https://colab.research.google.com) and create a new notebook.

In the top menu: **Runtime → Change runtime type → T4 GPU** → Save.

---

## Step 3 — Install Dependencies

```python
!pip install ultralytics roboflow --quiet
```

---

## Step 4 — Download Dataset from Roboflow

```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("YOUR_WORKSPACE_SLUG").project("YOUR_PROJECT_SLUG")
version = project.version(1)          # change to your version number
dataset = version.download("yolov8")

print("Dataset location:", dataset.location)
```

---

## Step 5 — Train YOLOv8

```python
from ultralytics import YOLO

# Choose model size:
#   yolov8n.pt  — nano   (fastest, lowest accuracy)  ← recommended for RDK X5
#   yolov8s.pt  — small  (good balance)
#   yolov8m.pt  — medium (slower, higher accuracy)
model = YOLO("yolov8n.pt")

model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    name="weld_defect",
    patience=20,          # early stopping
)
```

Training output is saved to `runs/detect/weld_defect/weights/`.

---

## Step 6 — Evaluate Results (Optional)

```python
# Check mAP, precision, recall on the validation set
metrics = model.val()
print(metrics)
```

---

## Step 7 — Download `best.pt`

```python
from google.colab import files

files.download("runs/detect/weld_defect/weights/best.pt")
```

This saves `best.pt` to your local machine.

---

## Step 8 — Deploy via WeldVision MLOps

1. Log in to the **WeldVision admin dashboard** as admin
2. Go to **MLOps Center → Upload Model**
3. Upload the `best.pt` file, fill in name/version
4. Once registered, click **"Compile to BPU"**
5. This triggers the GitHub Actions pipeline:
   - `best.pt` → ONNX → Horizon `.bin` (Int8, BPU-optimised)
   - Compiled model uploaded to `weldvision-media/models/model_update.bin` on R2
6. On next boot (or `sudo systemctl restart weldvision`), the RDK X5 auto-pulls the new model

---

## Tips

| Tip | Detail |
| --- | --- |
| Use `yolov8n` | Compiles cleanest to Horizon BPU Int8 |
| `imgsz=640` | Required — matches `horizon_config.yaml` input size |
| `epochs=100` | Start here; increase if mAP is still improving |
| Save the run | Download `runs/detect/weld_defect/` folder for full training logs |
| Colab timeout | Colab free disconnects after ~90 min idle — keep the tab active |

---

## Related Files

- [horizon_config.yaml](../horizon_config.yaml) — BPU compilation config
- [calibration_data/](../calibration_data/) — Int8 quantisation reference images
- [.github/workflows/compile_model.yml](../.github/workflows/compile_model.yml) — GitHub Actions BPU pipeline
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) — Full system deployment guide
