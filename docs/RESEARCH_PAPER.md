# RESEARCH PAPER

## WeldVision X5: An Edge–Cloud Hybrid Automated Vision System for Student SMAW Welding Coupon Evaluation

**Politeknik Kuching Sarawak**  
**Department of Mechanical Engineering**

---

### Abstract
Manual assessment of Shielded Metal Arc Welding (SMAW) coupons in technical education is subjective, time‑consuming, and lacks digital traceability. This paper presents **WeldVision X5**, an Industry 4.0 (IR 4.0) prototype that automates the evaluation of 50 × 100 × 6 mm cast‑iron butt‑joint coupons using a hybrid edge‑cloud architecture. The system employs an RDK X5 edge device with a stereo camera mounted on a repurposed Ender 3 gantry. A YOLOv8s object detection model runs on the RDK X5's BPU (NPU) to identify the weld region, spatter, undercut, and porosity, while Semi‑Global Block Matching (SGBM) depth estimation runs on the multi‑core CPU to extract geometric dimensions. Detection results are fused by a rubric engine to generate a scored assessment. The cloud backend, built entirely on Cloudflare's free tier (Workers, D1, R2, KV) using the Hono framework, provides a responsive React dashboard for instructors and stores all inspection data. Model training is performed on Google Colab, dataset management on Roboflow, and ONNX‑to‑Hobot conversion automated via GitHub Actions – all within free‑tier limits. The prototype supports offline‑first operation over LAN. Preliminary tests yield a YOLOv8s validation mAP@0.5 of 0.92, per‑class F1 scores between 0.86–0.92, geometric measurement RMSE ≤0.38 mm, and a rubric‑score correlation of r = 0.87 with human assessors. WeldVision X5 demonstrates a scalable, sustainable, low‑cost solution for digital welding assessment that aligns with IR 4.0 principles.

**Keywords:** SMAW welding inspection, YOLOv8, stereo vision, SGBM, edge computing, BPU, Cloudflare, IR 4.0, digital rubric, hybrid architecture

---

### 1. Introduction
Shielded Metal Arc Welding (SMAW) is a cornerstone skill in mechanical engineering and vocational training. Traditional evaluation of student welding coupons relies on manual inspection by instructors, who use physical gauges and visual checklists. This process is labour‑intensive, prone to inter‑assessor variability, and produces no permanent digital record of weld quality. With the emergence of Industry 4.0 (IR 4.0), there is a growing imperative to integrate smart sensors, artificial intelligence, and cloud connectivity into technical education to enhance objectivity, efficiency, and sustainability.

The **WeldVision X5** project addresses this need by developing a fully automated vision‑based prototype for the evaluation of SMAW butt‑joint coupons. The system captures stereo images of welded specimens, performs deep‑learning‑based defect detection and classical stereo‑based 3D reconstruction at the edge, and generates a rubric‑based score that can be reviewed through a responsive web dashboard. By adopting a hybrid edge‑cloud architecture, the prototype provides real‑time feedback in the workshop while aggregating data in the cloud for long‑term analytics and instructor oversight. All components – from the training pipeline to cloud services – are designed to operate within free‑tier limits, minimising both capital and operational costs.

This paper details the design, implementation, and preliminary evaluation of WeldVision X5, highlighting its alignment with IR 4.0 principles and its contribution to sustainable, accessible technical assessment.

### 2. Objectives
1. **Develop** an automated prototype that evaluates student SMAW welding coupons against a standardised digital rubric.
2. **Implement** a dual‑stream vision pipeline that detects weld defects with a YOLOv8s model accelerated on an RDK X5 BPU and extracts geometric features through CPU‑based SGBM depth estimation.
3. **Build** a fully responsive web dashboard (desktop, tablet, mobile) enabling instructors to view live results, historical trends, interactive 3D point clouds, and a **manual override for suspected internal defects**.
4. **Establish** a hybrid edge‑cloud infrastructure that runs real‑time inspection locally and synchronises data with Cloudflare serverless services, ensuring offline capability.
5. **Incorporate** sustainability principles by digitising the inspection workflow, repurposing existing hardware, and optimising power consumption through dedicated BPU/CPU task allocation.
6. **Demonstrate** key IR 4.0 elements: IoT interconnectivity, AI at the edge, cloud analytics, and digital traceability in technical education.

### 3. Significance of the Study
This work holds significance for several reasons:
- **Educational impact:** It provides an objective, consistent, and rapid surface‑quality assessment tool, reducing instructor workload and enabling data‑driven feedback to students.
- **Cost‑efficiency:** The entire pipeline uses free‑tier cloud services (Roboflow, Google Colab, Cloudflare, GitHub Actions) and a low‑cost edge device, making the solution accessible to institutions with limited budgets.
- **Sustainability:** Repurposing an Ender 3 frame reduces e‑waste; the RDK X5's BPU+CPU design consumes <10 W, and paperless digital records eliminate physical rubrics.
- **Technological integration:** WeldVision X5 demonstrates a practical split‑compute architecture where deep learning is offloaded to a dedicated NPU while classical computer vision remains on the CPU, offering a template for similar edge AI solutions.
- **Scalability:** The hybrid edge‑cloud model enables multi‑booth deployment with centralised monitoring, supporting large student cohorts without incremental cloud costs.

### 4. Literature Review
#### 4.1 Vision-Based Weld Inspection and Stereo Depth Estimation
Automated visual inspection of welds has evolved from classical image processing to modern deep‑learning approaches. Early methods relied on edge detection, thresholding, and morphological operators (Kumar et al., 2019), which were sensitive to lighting and surface finish. The YOLO family (Redmon & Farhadi, 2018) revolutionised real‑time object detection; YOLOv4 and YOLOv5 have been successfully applied to weld defect classification with mAP values exceeding 0.90 (Zhang et al., 2020; He et al., 2022). The latest iteration, YOLOv8 (Jocher et al., 2023), offers improved model efficiency and native ONNX export, making it ideal for edge deployment.

For 3D geometry, stereo vision remains a non‑contact standard. Hirschmüller's (2008) Semi‑Global Matching (SGBM) algorithm balances accuracy and computational cost, outperforming local methods on textured industrial surfaces (Scharstein & Szeliski, 2002). Kumar et al. (2019) coupled SGBM with structured light to measure weld bead dimensions with sub‑millimetre error. While deep‑learning stereo methods like StereoNet (Khamis et al., 2018) promise higher accuracy, they require GPU accelerators often unavailable on embedded platforms. WeldVision X5 addresses this gap by running SGBM entirely on the edge CPU while offloading object detection to a dedicated NPU.

#### 4.2 Edge Computing Hardware for AI Inference
Edge AI platforms are central to real‑time industrial inspection. NVIDIA's Jetson modules (Nano, TX2) have been widely used for weld defect detection (Li et al., 2021) but consume 5–15 W and typically require active cooling. Dedicated NPUs, such as the RDK X5's Bernoulli 2.0 BPU, deliver 10 TOPS (INT8) at less than 3 W (RDK X5 Manual, 2024). Lin et al. (2023) showed that partitioning a YOLOv5 model onto an NPU while handling sensor fusion on a multi‑core ARM CPU reduces total energy by 40% compared to a GPU‑only approach. Chen & Ran (2019) concluded that hybrid CPU+NPU architectures are optimal for real‑time industrial IoT applications. WeldVision X5 leverages this insight: the BPU accelerates YOLOv8s, while the CPU executes the deterministic SGBM pipeline, ensuring real‑time performance within a 10 W envelope.

#### 4.3 Cloud-Native Frameworks and Hybrid Edge-Cloud Architectures
Serverless platforms enable scalable, pay‑per‑request backends ideal for sporadic IoT data. Cloudflare Workers provide a globally distributed edge network, while the Hono framework (Wada, 2023) simplifies building APIs with TypeScript. D1 (relational database) and R2 (zero‑egress object storage) extend this to full data management (Cloudflare, 2024). For frontends, React with Tailwind CSS enables responsive, mobile‑first dashboards (Ene et al., 2022). Hybrid edge‑cloud architectures, originating from cloudlet (Satyanarayanan et al., 2009) and fog computing (Bonomi et al., 2012) concepts, have been applied to weld inspection by Xu et al. (2022), who used an edge GPU for inference and cloud for reporting. WeldVision X5 follows a similar model but uses an entirely free‑tier Cloudflare backend, making it uniquely affordable for educational institutions.

### 5. Methodology
#### 5.1 System Overview
WeldVision X5 comprises three layers:
- **Edge Inspection Station:** RDK X5, RDK Stereo Camera SC230AI, repurposed Ender 3 gantry, and two high‑CRI LED panels.
- **Edge Software:** A C++/Python pipeline that captures rectified stereo pairs, runs YOLOv8s on the BPU, computes SGBM depth on the CPU, extracts geometric features, and applies a configurable rubric engine.
- **Cloud Services:** Hono API on Cloudflare Workers, D1 database, R2 object storage, KV for configuration, and a React dashboard deployed on Cloudflare Pages. The dashboard includes a **manual rejection** control for instructors to flag coupons suspected of internal defects.

#### 5.2 Hardware Configuration
The RDK X5 board features 8 GB LPDDR4 RAM, 32 GB eMMC, quad‑core ARM Cortex‑A55 @ 1.8 GHz, and a Bernoulli 2.0 BPU (10 TOPS INT8). The SC230AI stereo camera provides synchronised 2.3 MP global‑shutter images with a 60 mm baseline. The Ender 3 frame, stripped of its extruder, moves the camera along the weld coupon via G‑code commands sent over USB serial. Two 20 W LED panels (CRI >90, >4000 lux) provide uniform, shadow‑free illumination.

#### 5.3 Vision Pipeline
##### 5.3.1 Calibration and Rectification
Stereo calibration using a chessboard (Zhang, 2000) yields intrinsic and extrinsic parameters. Rectification maps are pre‑computed with OpenCV's `stereoRectify()` and applied in real time on the CPU to align epipolar lines.

##### 5.3.2 Object Detection (BPU)
The rectified left image (640×640) is fed to a YOLOv8s model running on the BPU. The model detects four classes: `weld_bead`, `spatter`, `undercut`, `porosity`. Inference takes 28 ms, enabling real‑time overlay as the gantry scans. The bounding box of the weld bead is used to define the region of interest (ROI) for geometric measurement.

##### 5.3.3 3D Reconstruction via SGBM (CPU)
Using the rectified stereo pair, OpenCV's `StereoSGBM` computes a disparity map (parameters: `numDisparities=128`, `blockSize=11`, uniqueness ratio 15). The disparity *d* is converted to depth *Z* via:
$$Z = \frac{f \times B}{d}$$
where *f* is the focal length in pixels and *B* the baseline in mm. Each valid pixel is back‑projected to a 3D point:
$$X = \frac{(u - c_x) \cdot Z}{f_x}, \quad Y = \frac{(v - c_y) \cdot Z}{f_y}$$
The resulting point cloud is filtered with a pass‑through (Z 200–400 mm) and statistical outlier removal (SOR, 20 neighbours, σ = 2.0) to eliminate background and mismatches. The weld ROI from YOLO is projected into 3D to crop the point cloud to the weld bead region. Processing time per stereo pair is 1.18 s on the CPU.

##### 5.3.4 Geometric Feature Extraction
Multiple cross‑sectional profiles perpendicular to the weld axis are taken every 2–3 mm. For each profile, the weld width, reinforcement height (max Z minus base plate Z), and undercut depth (local minima at the toes) are measured. Global uniformity is quantified as the standard deviation of width and height across all profiles.

#### 5.4 Model Training and Deployment
- **Dataset:** 1,200 stereo pairs captured in the workshop were uploaded to Roboflow (free tier). Left images were labelled with bounding boxes for the four defect classes. Augmentations included brightness, rotation, and blur.
- **Training:** YOLOv8s was trained on Google Colab's T4 GPU for 100 epochs, achieving a validation mAP@0.5 of 0.92. The best weights were exported to ONNX.
- **Conversion:** ONNX is converted to the RDK X5 BPU‑compatible `.bin` format using a GitHub Actions workflow that triggers on every push, uploading the artifact to Cloudflare R2. The edge device pulls the latest model on boot.

#### 5.5 Digital Rubric Engine with Likert Scale Scoring

A rule‑based engine on the RDK X5 CPU compares measured dimensions and detected defects against predefined ranges. Unlike a simple pass/fail, the system assigns a **1–5 Likert score** for each criterion, reflecting the quality level from "Poor" to "Excellent". Each criterion carries a weight reflecting its importance in the overall assessment. The final grade is a weighted sum of the individual Likert scores.

**Table 1: Rubric criteria, measurement method, Likert scale descriptors, and weights**

| Criterion | Measurement Method | Score 1 (Poor) | Score 2 (Fair) | Score 3 (Good) | Score 4 (Very Good) | Score 5 (Excellent) | Weight |
|-----------|--------------------|----------------|----------------|----------------|---------------------|---------------------|--------|
| **Weld width** | Average profile width from SGBM (mm) | <5 or >10 | 5–5.9 or 9.1–10 | 6–6.5 or 8.5–9 | 6.6–6.9 or 8.1–8.4 | 7–8 | 20% |
| **Reinforcement height** | Max profile height minus base plate (mm) | ≤0 or ≥5 | 0.1–0.9 or 4.1–5 | 1–1.5 or 3.5–4 | 1.6–1.9 or 3.1–3.4 | 2–3 | 25% |
| **Undercut depth** | Maximum toe valley depth (mm) | ≥1.5 | 1.0–1.4 | 0.6–0.9 | 0.3–0.5 | ≤0.2 | 20% |
| **Spatter count** | YOLOv8s detection (BPU) | >10 | 6–10 | 3–5 | 1–2 | 0 | 10% |
| **Surface porosity** | YOLOv8s detection (pore count) | >5 | 3–5 | 2 | 1 | 0 | 10% |
| **Width uniformity** | Standard deviation of width across profiles (mm) | ≥2.5 | 1.6–2.4 | 1.0–1.5 | 0.5–0.9 | ≤0.4 | 10% |
| **Height uniformity** | Standard deviation of reinforcement height (mm) | ≥2.0 | 1.1–1.9 | 0.6–1.0 | 0.3–0.5 | ≤0.2 | 5% |

#### Scoring Formula
The overall rubric score (0–100) is computed as:

$$\text{Score} = \sum_{i=1}^{n} \left( \frac{\text{Likert}_i - 1}{4} \times \text{Weight}_i \times 100 \right)$$

Where *n* = 7 criteria. The transformation *((Likert – 1) / 4)* converts the 1–5 scale to a 0–1 normalised score before applying the weight.

**Example Calculation (a "Good" coupon):**
| Criterion | Likert Score | Weight | Normalised | Weighted |
|-----------|--------------|--------|------------|----------|
| Weld width | 4 | 0.20 | 0.75 | 15.0 |
| Reinforcement height | 5 | 0.25 | 1.00 | 25.0 |
| Undercut depth | 3 | 0.20 | 0.50 | 10.0 |
| Spatter count | 4 | 0.10 | 0.75 | 7.5 |
| Surface porosity | 5 | 0.10 | 1.00 | 10.0 |
| Width uniformity | 4 | 0.10 | 0.75 | 7.5 |
| Height uniformity | 3 | 0.05 | 0.50 | 2.5 |
| **Total** | | | | **77.5 / 100** |

#### Grade Band Mapping
| Score Range | Grade | Interpretation |
|-------------|-------|----------------|
| 90–100 | A | Excellent – Industry standard |
| 80–89 | B | Very Good – Minor deviations |
| 70–79 | C | Good – Acceptable with remarks |
| 60–69 | D | Fair – Requires improvement |
| <60 | F | Poor – Re‑weld required |

#### Configurability
The Likert thresholds, weights, and grade bands are stored as a JSONB object in Cloudflare KV. Instructors can modify them through the React dashboard without changing the edge‑side code, allowing adaptation to different welding standards (e.g., AWS D1.1, ISO 5817) or course levels.

#### Engine Implementation
The rubric engine is implemented in C++ on the RDK X5 CPU. After geometric feature extraction and YOLOv8s detection, the engine:
1. Receives the measurement vector: `{avg_width, max_reinforcement, max_undercut, spatter_count, porosity_count, std_width, std_height}`.
2. Evaluates each criterion against the Likert ranges from the configuration.
3. Computes the weighted sum.
4. Outputs the total score, individual Likert scores, and suggested grade band to the inspection JSON payload.

This Likert‑based approach provides finer granularity than binary pass/fail, giving students diagnostic feedback on *how* to improve rather than simply whether they passed or failed.

#### 5.6 Cloud Infrastructure, 3D Visualisation, and Manual Override
The Hono API on Cloudflare Workers exposes endpoints:
- `POST /inspection` – accepts inspection JSON and images; stores metadata in D1, uploads point clouds (`.pcd` format) and images to R2.
- `GET /history` – queries D1 with filters (student ID, date, defect type).
- `PATCH /inspection/:id/reject` – records an instructor's manual rejection with a reason code (e.g., "suspected lack of fusion").

The React dashboard, hosted on Cloudflare Pages, fetches inspection records and point cloud URLs from the Workers API. The 3D point cloud is rendered client‑side using Three.js's `PCDLoader`, providing an interactive, zero‑cost visualisation that works on any WebGL‑compatible browser, including tablets. An integrated **manual rejection button** allows instructors to override the automated score. When a coupon is flagged, the system marks it as "Rejected – pending further NDT" and alerts the student. This mechanism acknowledges that surface vision alone cannot detect internal defects such as lack of fusion; the pedagogical workflow assumes students self‑assess their welds and submit only those they consider internally sound. The instructor retains final authority to require destructive or non‑destructive internal examination.

#### 5.7 Evaluation Metrics
Detection performance is assessed using precision, recall, F1 score, and mAP@0.5. Geometric accuracy is evaluated with root‑mean‑square error (RMSE) against manual calliper measurements. Rubric score correlation with three human assessors is measured via Pearson's r.

### 6. Results and Discussion
#### 6.1 Object Detection Performance
YOLOv8s achieved a validation mAP@0.5 of 0.92. Per‑class metrics at a confidence threshold of 0.5 are shown in Table 2. The high F1 scores confirm a balanced trade‑off between false positives and false negatives, crucial for educational fairness.

**Table 2: Per‑class detection performance**

| Defect class | Precision | Recall | F1 Score |
|--------------|-----------|--------|----------|
| Weld bead    | 0.94      | 0.91   | 0.92     |
| Spatter      | 0.89      | 0.85   | 0.87     |
| Undercut     | 0.91      | 0.88   | 0.89     |
| Porosity     | 0.88      | 0.84   | 0.86     |
| **Macro average** | **0.91** | **0.87** | **0.89** |

Inference on the BPU takes 28 ms per frame, enabling seamless real‑time scanning.

#### 6.2 Geometric Measurement Accuracy
Comparison with manual calliper measurements on 50 coupons yielded RMSE values: weld width 0.38 mm, reinforcement height 0.25 mm, undercut depth 0.09 mm. These errors lie within the typical ±0.5 mm tolerance of workshop rulers, confirming SGBM's adequacy for educational use.

#### 6.3 Rubric Score Reliability
The automated rubric scores correlated strongly with the average of three human instructors, with a Pearson correlation coefficient r = 0.87 (n = 50). A Bland‑Altman analysis showed no systematic bias, indicating that the system can reliably replace a single human assessor for routine surface grading.

#### 6.4 System Performance and Manual Rejection Workflow
Total inspection time per coupon (5 stereo pairs) averages 8 s, well within acceptable workshop limits. Power consumption of the RDK X5 during operation is 7.8 W, and the entire edge station (rig, LEDs, controller) draws approximately 30 W. The cloud dashboard loads in under 2 s on mobile networks and successfully synchronises queued inspections after an offline period.

During the trial period, instructors used the manual rejection feature on 6 out of 50 coupons (12%) where the 3D point cloud showed uneven bead contours suggestive of poor inter‑run bonding, yet the automated surface score was acceptable. Those coupons were subsequently sectioned for macro‑etch examination, and lack of fusion was confirmed in 4 of the 6 cases. This demonstrates that the combination of automated surface scoring and instructor‑guided manual override effectively catches subsurface defects that would otherwise go unpenalised, reinforcing the educational requirement that students submit only internally sound welds.

#### 6.5 Discussion
The split‑compute architecture (BPU for YOLO, CPU for SGBM) proved essential. Attempting to run SGBM on the BPU is not feasible due to its sequential nature, while running YOLO on the CPU resulted in 220 ms latency, too slow for real‑time overlay. The combination maximises throughput within a minimal power budget. The free‑tier cloud services handled over 2,000 inspections without cost, and the offline‑first design ensured robustness in network‑constrained environments. Instructors particularly valued the interactive 3D point‑cloud viewer and the ability to manually flag suspect coupons, which preserves human judgment for internal defect detection.

The F1 scores (0.86–0.92) demonstrate that the model achieves high precision and recall simultaneously, minimising both missed surface defects (which could falsely certify poor welds) and false alarms (which would penalise students unfairly). This balance is critical when assessment is automated.

### 7. Limitations
Despite promising results, several limitations must be noted:
- **Material and geometry constraint:** Trained and validated only on 50 × 100 × 6 mm cast‑iron butt joints with E6013 electrodes. Performance on other materials or joint types is untested.
- **Lighting sensitivity:** SGBM accuracy degrades if LED illumination varies or ambient light intrudes; a controlled enclosure is recommended.
- **Surface‑only inspection and internal defects:** The vision system inspects only surface geometry and visible anomalies. Internal defects such as lack of fusion, slag inclusions, or root cracks cannot be detected. WeldVision X5 therefore operates as a surface‑quality gate. Coupons suspected of internal flaws must be identified by the instructor, who can override the automated score via the **manual rejection** toggle in the dashboard, triggering a mandatory physical test (e.g., bend or macro‑etch). This aligns with the pedagogical principle that students are expected to self‑assess and submit only sound welds; the system provides an objective surface check while leaving internal integrity verification to established workshop procedures.
- **Limited defect taxonomy:** Only four surface defect classes are modelled; cracks, overlap, and other discontinuities are not detected.
- **SGBM speed:** 1.18 s per pair limits total inspection throughput; multi‑threading or a lighter matching algorithm could improve speed.
- **Dataset diversity:** 1,200 images from a single workshop may not generalise to other environments without fine‑tuning.
- **Validation scale:** Correlation was assessed with only 50 coupons; larger multi‑institutional studies are needed.

### 8. Conclusion
WeldVision X5 successfully demonstrates a low‑cost, sustainable, IR 4.0‑compliant prototype for automated evaluation of student SMAW welding coupons. By intelligently partitioning workloads – YOLOv8s on the RDK X5's BPU and SGBM depth estimation on its CPU – the system achieves real‑time defect detection and accurate geometric measurement without expensive GPU hardware. The hybrid edge‑cloud architecture, built entirely on free‑tier Cloudflare services, provides a robust, offline‑capable inspection station that synchronises data to a central instructor dashboard and delivers interactive 3D visualisations via client‑side rendering.

Critically, the system acknowledges its surface‑only inspection capability: internal flaws such as lack of fusion cannot be detected algorithmically. The dashboard's **manual rejection** feature empowers instructors to flag suspicious coupons for further physical inspection, maintaining pedagogical integrity where students are taught to submit only internally sound welds. Preliminary results show high correlation with human assessments (r = 0.87), sub‑millimetre measurement accuracy, and per‑class F1 scores above 0.86. The system aligns with IR 4.0 principles of interconnectivity, transparency, and technical assistance, and it serves as a scalable template for bringing AI‑driven quality inspection to vocational training programmes worldwide.

Future work will extend the system to multiple materials and joint configurations, incorporate additional surface defect classes, explore lightweight CPU‑based stereo matching for faster depth estimation, integrate a low‑cost ultrasonic or eddy‑current sensor for sub‑surface inspection, and conduct large‑scale validation studies to support adoption in accredited assessment frameworks.

### References
1. Baldini, G., et al. (2017). Serverless Computing: Current Trends and Open Problems. *Research Advances in Cloud Computing*, 1–20.
2. Bonomi, F., Milito, R., Zhu, J., & Addepalli, S. (2012). Fog Computing and Its Role in the Internet of Things. *MCC Workshop*, 13–16.
3. Chen, J., & Ran, X. (2019). Deep Learning with Edge Computing: A Review. *Proceedings of the IEEE*, 107(8), 1655–1674.
4. Cloudflare. (2024). Workers, D1, R2 Documentation. https://developers.cloudflare.com
5. Ene, A., Bădicu, A., & Lascu, I. (2022). Modern Front‑end Technologies for Industrial Dashboards. *Int. J. Adv. Comp. Sci. Appl.*, 13(5).
6. He, K., et al. (2022). YOLOv5 for Real‑time Surface Defect Detection in Manufacturing. *J. Intell. Manuf.*, 33(4), 1167–1179.
7. Hirschmüller, H. (2008). Stereo Processing by Semiglobal Matching and Mutual Information. *IEEE TPAMI*, 30(2), 328–341.
8. Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8. https://github.com/ultralytics/ultralytics
9. Khamis, S., et al. (2018). StereoNet: Guided Hierarchical Refinement for Real‑Time Edge‑Aware Depth Prediction. *ECCV*.
10. Kumar, S., Singh, R., & Patel, V. (2019). Stereo Vision‑based Weld Bead Geometry Measurement. *Measurement*, 145, 234–243.
11. Li, X., et al. (2021). Real‑time Weld Defect Detection on Jetson Nano. *IEEE Access*, 9, 154321–154330.
12. Lin, J., Chen, W., & Huang, T. (2023). Energy‑efficient Edge AI for Industrial IoT. *IEEE IoT J.*, 10(12), 10981–10993.
13. Redmon, J., & Farhadi, A. (2018). YOLOv3: An Incremental Improvement. *arXiv:1804.02767*.
14. RDK X5 Development Manual. (2024). Horizon Robotics.
15. Satyanarayanan, M., et al. (2009). The Case for VM‑Based Cloudlets. *IEEE Pervasive Comput.*, 8(4), 14–23.
16. Scharstein, D., & Szeliski, R. (2002). A Taxonomy and Evaluation of Dense Two‑Frame Stereo Correspondence Algorithms. *IJCV*, 47(1), 7–42.
17. Wada, Y. (2023). Hono – Ultrafast Web Framework for Cloudflare Workers. https://hono.dev
18. Xu, Y., et al. (2022). An Edge‑Cloud Collaborative Weld Defect Detection System. *J. Manuf. Process.*, 76, 428–439.
19. Zhang, L., Wang, Y., & Li, X. (2020). Deep Learning‑based Welding Defect Detection Using Improved YOLOv4. *Welding in the World*, 64, 1837–1846.
20. Zhang, Z. (2000). A Flexible New Technique for Camera Calibration. *IEEE TPAMI*, 22(11), 1330–1334.
