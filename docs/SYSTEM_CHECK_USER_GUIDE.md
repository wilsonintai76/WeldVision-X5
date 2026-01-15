# System Requirements Check - User Guide

## Quick Start

When you open the **MLOps Center**, you'll immediately see a system check panel that analyzes your computer's training capability.

---

## What You'll See

### System Capability Panel

The panel appears at the top of MLOps Center, color-coded based on your hardware:

#### 🟢 Excellent (Green Border)
```
✓ System Training Capability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ 16 Cores  💾 32 GB RAM  ✓ GPU: RTX 3070

✓ System meets all requirements for efficient local training

[Show Details ▼]
```

**What this means:**
- You have a powerful PC/workstation
- Training will be fast and efficient
- You can train locally without issues
- No need for cloud services

**Recommended action:** Proceed with local training in MLOps

---

#### 🟡 Adequate (Yellow Border)
```
⚠ System Training Capability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ 6 Cores  💾 12 GB RAM  ✓ GPU: GTX 1660 Ti

⚠ System can train but may be slower than recommended

[Show Details ▼]
```

**What this means:**
- Your system can train YOLO models
- Training will work but may take longer
- Consider using smaller batch sizes
- Local training is still viable

**Recommended action:** 
- Try local training with smaller batch sizes (8 or 4)
- Or use cloud for faster results

---

#### 🟠 Minimal (Orange Border)
```
⚠️ System Training Capability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ 10 Cores  💾 15.5 GB RAM  ⚠ No GPU

⚠ No NVIDIA GPU detected - CPU-only training will be very slow
⚠️ CPU-only training is VERY slow. Cloud training strongly recommended.

[Show Details ▼]
```

**What this means:**
- Your system lacks a GPU
- Training on CPU alone will be 10-50x slower
- A 50-epoch training that takes 30 min on GPU will take 5-20 hours on CPU
- Cloud training is strongly recommended

**Recommended action:** 
- Click "Show Details" to see cloud alternatives
- Use Google Colab (free GPU) or other cloud services
- DO NOT attempt local training unless you have time to spare

---

#### 🔴 Insufficient (Red Border)
```
❌ System Training Capability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ 2 Cores  💾 4 GB RAM  ⚠ No GPU

⚠ Insufficient RAM: 4.0GB (minimum: 8GB)
⚠ Insufficient CPU cores: 2 (minimum: 4)
⚠ No NVIDIA GPU detected

❌ System does not meet minimum requirements. Use cloud services or import models.

[Show Details ▼]
```

**What this means:**
- Your system cannot train YOLO models effectively
- Even CPU training may crash due to RAM limits
- Training is not recommended on this machine

**Recommended action:**
- Use cloud training services (see alternatives below)
- Or import pre-trained models from elsewhere
- Consider upgrading hardware if frequent training needed

---

## Show Details Section

Click **"Show Details"** to expand and see:

### Recommendations
Specific advice for your system:
```
Recommendations:
• Training may be slow. Consider upgrading RAM or using smaller batch sizes.
• ⚠️ CRITICAL: GPU is highly recommended for YOLO training. Consider:
  • Use Google Colab (Free GPU): https://colab.research.google.com/
  • Use Roboflow (Free tier available): https://roboflow.com/
  • Train on a cloud platform (AWS, GCP, Azure)
  • Use a desktop/laptop with NVIDIA GPU
  • Import pre-trained models instead of training
```

### Alternative Training Options
Interactive cards you can click:

```
┌─────────────────────────┬─────────────────────────┐
│ 🌐 Google Colab         │ 🤖 Roboflow Train       │
│ Free GPU training       │ Automated YOLO training │
│ Free (with limits)      │ Free tier available     │
│ Easy                    │ Very Easy               │
│ Learn More →            │ Learn More →            │
├─────────────────────────┼─────────────────────────┤
│ 🚀 Ultralytics HUB      │ 📥 Import Pre-trained   │
│ Official YOLOv8 platform│ Use models trained      │
│ Free tier available     │ elsewhere               │
│ Easy                    │ Easy                    │
│ Learn More →            │ Free                    │
└─────────────────────────┴─────────────────────────┘
```

---

## Cloud Training Quick Guide

### Option 1: Google Colab (FREE - Recommended for Most Users)

**Steps:**
1. Click "Learn More →" on Google Colab card (or go to https://colab.research.google.com/)
2. Create new notebook
3. Enable GPU: `Runtime` → `Change runtime type` → `T4 GPU`
4. Install YOLOv8:
   ```python
   !pip install ultralytics
   ```
5. Upload your dataset (from WeldVision export)
6. Train:
   ```python
   from ultralytics import YOLO
   model = YOLO('yolov8n.pt')
   results = model.train(data='data.yaml', epochs=50)
   ```
7. Download `runs/detect/train/weights/best.pt`
8. Go back to WeldVision → MLOps → Upload model → Convert → Deploy

**Advantages:**
- ✅ Completely FREE
- ✅ Powerful GPU (usually T4 with 16GB VRAM)
- ✅ No setup required
- ✅ Save models to Google Drive

**Limitations:**
- ⏰ Session timeout after inactivity
- 🕒 Limited GPU hours per week (~12-15 hours)
- 📡 Requires internet

---

### Option 2: Roboflow (Easiest - No Coding)

**Steps:**
1. Click "Learn More →" on Roboflow card (or go to https://roboflow.com/)
2. Create account (free tier available)
3. Upload annotated images from WeldVision
4. Click "Generate Dataset"
5. Click "Train Model" → Select YOLOv8
6. Wait for training to complete
7. Download trained model
8. Import to WeldVision

**Advantages:**
- ✅ Zero coding required
- ✅ Automated dataset splitting
- ✅ Built-in augmentation
- ✅ Performance metrics dashboard

**Pricing:**
- Free: Limited training hours
- Starter: $49/month
- Pro: $249/month

---

### Option 3: Ultralytics HUB (Official Platform)

**Steps:**
1. Click "Learn More →" on Ultralytics HUB card (or go to https://hub.ultralytics.com/)
2. Sign up for account
3. Create new project
4. Upload dataset in YOLO format
5. Configure training (epochs, model size)
6. Start cloud training
7. Download trained model
8. Import to WeldVision

**Advantages:**
- ✅ Official Ultralytics service
- ✅ Latest YOLOv8 features
- ✅ Enterprise support available
- ✅ Integration with Ultralytics tools

**Pricing:**
- Free: Limited resources
- Pro: $29/month
- Enterprise: Custom

---

## Import Pre-Trained Models

If you already have a trained YOLO model:

**Supported formats:**
- `.pt` files (PyTorch - YOLOv8)
- `.onnx` files
- Other YOLO formats

**Steps:**
1. Place model file in accessible location
2. Go to MLOps Center
3. Use "Upload Model" or file manager
4. Click "Convert Model" to create RDK X5 binary
5. Deploy to edge device

**Use cases:**
- Models trained on your own GPU desktop at home
- Pre-trained models from colleagues
- Public models from Ultralytics Hub
- Research models from papers

---

## Training Time Examples

To give you an idea of training speeds:

### Dataset: 1000 images, 50 epochs, YOLOv8n

| Hardware | Training Time | Cost |
|----------|--------------|------|
| RTX 4090 (24GB) | 15 minutes | Free (local) |
| RTX 3070 (8GB) | 30 minutes | Free (local) |
| GTX 1660 Ti (6GB) | 45 minutes | Free (local) |
| Google Colab T4 | 35 minutes | Free |
| Roboflow Cloud | 25 minutes | Free/Paid |
| CPU Only (16 cores) | 8-12 hours | Free (local) |
| CPU Only (8 cores) | 15-20 hours | Free (local) |

**Takeaway:** GPU is 10-50x faster than CPU!

---

## Frequently Asked Questions

### Q: My system shows "Minimal" but I have 16GB RAM. Why?
**A:** You likely don't have an NVIDIA GPU. Without GPU, training is CPU-only which is very slow. The system recommends cloud training even if you have good CPU/RAM.

### Q: Can I upgrade my system to train locally?
**A:** Yes! Add an NVIDIA GPU with 6GB+ VRAM (e.g., RTX 3060, GTX 1660 Ti). That's the most important upgrade.

### Q: Is Google Colab really free?
**A:** Yes! Colab provides free GPU access with usage limits (~12-15 hours/week). Colab Pro ($10/month) removes most limits.

### Q: Which cloud service is best?
**A:**
- **Students/Learning**: Google Colab (free)
- **No coding experience**: Roboflow (easiest)
- **Enterprise/Production**: Ultralytics HUB or local
- **Budget-conscious**: Google Colab

### Q: How do I export my dataset from WeldVision?
**A:** Go to Data Management → Select dataset → Export → YOLO format

### Q: Can I train on Apple Silicon (M1/M2)?
**A:** Yes, but support is limited. Better to use cloud services for YOLO training.

### Q: What if I start training and it's too slow?
**A:** You can stop the job in MLOps → Jobs section. Then use cloud training instead.

---

## Next Steps

1. ✅ Check your system capability in MLOps Center
2. ✅ If "Excellent" or "Adequate" → Train locally
3. ✅ If "Minimal" or "Insufficient" → Choose cloud option
4. ✅ Read detailed guide: `docs/TRAINING_OPTIONS.md`
5. ✅ Prepare your annotated dataset
6. ✅ Start training!

---

## Need Help?

- 📖 Full documentation: `/docs/TRAINING_OPTIONS.md`
- 🔧 Troubleshooting: Check Docker logs
- 💬 Community: GitHub issues
- 📧 Support: Contact your instructor/admin

---

## Summary

**The system check helps you:**
1. ✅ Know if your PC can train models
2. ✅ Get specific warnings about limitations
3. ✅ See alternative cloud options
4. ✅ Make informed decisions
5. ✅ Avoid wasting time on slow CPU training

**Remember:** Training YOLOv8 requires GPU. If you don't have one, use cloud services!
