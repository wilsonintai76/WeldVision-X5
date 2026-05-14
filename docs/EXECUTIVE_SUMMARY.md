# EXECUTIVE SUMMARY

## WeldVision X5  
Automated Vision-Based Evaluation of Student SMAW Welding Coupons  

**Politeknik Kuching Sarawak**  
**Department of Mechanical Engineering**  
**Date:** 14 May 2026  

---

### Problem Statement
Assessment of student Shielded Metal Arc Welding (SMAW) coupons is currently manual, subjective, and time‑consuming. It produces no permanent digital record, lacks consistency between assessors, and does not leverage Industry 4.0 technologies to improve learning outcomes.

### Proposed Solution
WeldVision X5 is an Industry 4.0 prototype that automates the entire evaluation workflow. A low‑cost RDK X5 edge device with a stereo camera, mounted on a repurposed Ender 3 motion rig, captures images of the welded coupon. On‑device AI (YOLOv8s on the BPU) detects surface defects, while classical stereo vision (SGBM on the CPU) extracts 3D geometry (width, reinforcement, undercut). These measurements are fed into a digital rubric that mirrors the institution's grading criteria. All results are synchronised to a serverless Cloudflare backend and displayed on a responsive React dashboard, which includes an interactive 3D point‑cloud viewer and a manual rejection mechanism for internal defects like lack of fusion.

### Key Results
- **Detection performance:** YOLOv8s achieved 0.92 mAP@0.5 and per‑class F1 scores of 0.86–0.92 on four defect classes.
- **Geometric accuracy:** Root‑mean‑square error <0.4 mm for weld width, <0.3 mm for reinforcement, and <0.1 mm for undercut.
- **Rubric correlation:** Pearson's r = 0.87 with human assessors on 50 coupons.
- **Total inspection time:** ~8 seconds per coupon.
- **Cost:** Entirely free‑tier (Roboflow, Google Colab, Cloudflare, GitHub Actions). Hardware cost ~$150 (RDK X5 + camera + repurposed Ender 3 frame).

### IR 4.0 & Sustainability
- Interconnectivity (edge‑cloud sync), information transparency (centralised dashboard), technical assistance (AI grading), and decentralised decision‑making (offline‑first edge processing).
- Energy‑efficient: <10 W edge processing, no GPU server, reused hardware, paperless workflow.

### Conclusion
WeldVision X5 proves that a fully automated, reliable, and cost‑free digital welding assessment system is feasible for educational institutions. It enhances learning, reduces instructor workload, and aligns with IR 4.0 and sustainability goals.
