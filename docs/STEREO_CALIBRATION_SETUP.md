# Stereo Calibration Setup

## Overview
Stereo calibration settings have been added to the WeldVision X5 system. This allows you to configure and manage stereo camera calibration parameters through the web interface.

---

## Calibration Image Capture Procedure for RDK X5

### Requirements
You should capture **20-30 pairs** of synchronized stereo images following these specific poses to ensure high-quality calibration.

### Image Capture Checklist

#### 1. Parallel Shots (5 images)
Capture the checkerboard at different distances while keeping it parallel to the camera plane:
- [ ] **Close distance** (~30cm from cameras)
- [ ] **Near-mid distance** (~50cm)
- [ ] **Mid distance** (~70cm)
- [ ] **Far-mid distance** (~100cm)
- [ ] **Far distance** (~150cm)

#### 2. X-Axis Tilt / Yaw (5 images)
Rotate the checkerboard left and right (~30-45°):

> **How to tilt**: Rotate the board so the **Left side** is closer to the camera, then the **Right side** is closer.
> 
> **Why**: Yaw helps calculate the **horizontal focal length** ($f_x$).

- [ ] **Left side closer** (~45°)
- [ ] **Left side slightly closer** (~30°)
- [ ] **Center** (reference)
- [ ] **Right side slightly closer** (~30°)
- [ ] **Right side closer** (~45°)

#### 3. Y-Axis Tilt / Pitch (5 images)
Tilt the checkerboard up and down (~30-45°):

> **How to tilt**: Tilt the **Top edge** closer to the camera (like closing a laptop lid towards you), then the **Bottom edge** closer (like opening a laptop lid).
> 
> **Why**: Pitch helps calculate the **vertical focal length** ($f_y$).

- [ ] **Top edge closer** (~45°) — like closing a laptop lid
- [ ] **Top edge slightly closer** (~30°)
- [ ] **Center** (reference)
- [ ] **Bottom edge slightly closer** (~30°)
- [ ] **Bottom edge closer** (~45°) — like opening a laptop lid

#### 4. Z-Axis Rotation / Roll (5 images)
Rotate the checkerboard clockwise and counter-clockwise (~15-20°):

> **How to tilt**: Turn the board like a **steering wheel** — clockwise and counter-clockwise.
> 
> **Why**: Roll helps calculate the **lens distortion coefficients** ($k_1$, $k_2$, $k_3$).

- [ ] **Counter-clockwise** (~20°)
- [ ] **Slight counter-clockwise** (~15°)
- [ ] **Center** (reference)
- [ ] **Slight clockwise** (~15°)
- [ ] **Clockwise** (~20°)

#### 5. Corner Coverage (5-10 images)
Position the board to cover the corners and edges of the image frame (critical for fixing lens distortion at the edges):
- [ ] **Top-left corner**
- [ ] **Top-right corner**
- [ ] **Bottom-left corner**
- [ ] **Bottom-right corner**
- [ ] **Top edge center**
- [ ] **Bottom edge center**
- [ ] **Left edge center**
- [ ] **Right edge center**

### 📐 Why Each Pose Matters

| Pose Type | Camera Parameter Calculated | Description |
|-----------|----------------------------|-------------|
| **Yaw** (Left/Right tilt) | Horizontal focal length ($f_x$) | Calibrates how the lens focuses horizontally |
| **Pitch** (Up/Down tilt) | Vertical focal length ($f_y$) | Calibrates how the lens focuses vertically |
| **Roll** (Rotation) | Distortion coefficients ($k_1$, $k_2$, $k_3$) | Corrects barrel/pincushion lens distortion |
| **Corner Coverage** | Distortion at edges | Fixes distortion at the periphery of the image |
| **Distance Variation** | Scale & depth perception | Ensures accurate depth estimation at all ranges |

### ⚠️ Critical Rules

| Rule | Description |
|------|-------------|
| **Full Visibility** | Both Left and Right cameras **must** see the **entire checkerboard** in every shot |
| **Discard Partial** | If one camera cuts off any part of the board, **discard that image pair** |
| **Sharp Focus** | Ensure the checkerboard is in focus in both images |
| **Good Lighting** | Avoid harsh shadows on the checkerboard surface |
| **Stable Position** | Hold the board steady to avoid motion blur |

### Recommended Checkerboard Specifications
- **Pattern Size**: 9×6 inner corners (10×7 squares)
- **Square Size**: 25mm (adjust based on your printed board)
- **Material**: Rigid, flat surface (foam board or aluminum backing recommended)
- **Print Quality**: High contrast black and white, matte finish to reduce glare

---

## Backend Changes

### New Model: `StereoCalibration`
Added to `backend/core/models.py` with the following fields:
- `name`: Configuration name (unique)
- `image_width`, `image_height`: Camera resolution
- `board_width`, `board_height`: Chessboard pattern size (inner corners)
- `square_size_mm`: Physical size of chessboard squares
- `calibration_data`: JSON field for storing calibration parameters (Q matrix, rectification maps)
- `is_active`: Flag to mark the active configuration (only one can be active)
- `created_at`, `updated_at`: Timestamps

### New API Endpoints
- `GET /api/stereo-calibrations/`: List all calibrations
- `POST /api/stereo-calibrations/`: Create new calibration
- `GET /api/stereo-calibrations/{id}/`: Get specific calibration
- `PUT /api/stereo-calibrations/{id}/`: Update calibration
- `DELETE /api/stereo-calibrations/{id}/`: Delete calibration
- `POST /api/stereo-calibrations/{id}/set_active/`: Set as active calibration
- `GET /api/stereo-calibrations/active/`: Get currently active calibration

## Frontend Changes

### New Settings Component
Added `frontend/src/components/Settings.jsx` with:
- List view of all calibration configurations
- Create/Edit calibration modal with form validation
- Set active calibration functionality
- Delete calibration capability
- Visual indication of active configuration

### Navigation
Added "Calibration" tab to the main navigation in App.jsx

## Database Migration

To apply the database changes, run:

### Using Docker:
```bash
# Start the containers
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py makemigrations core
docker-compose exec backend python manage.py migrate

# Restart backend to apply changes
docker-compose restart backend
```

### Without Docker (if using local environment):
```bash
# Activate virtual environment (if you have one)
cd backend
python manage.py makemigrations core
python manage.py migrate
```

## Usage

1. **Start the application** (if not already running):
   ```bash
   docker-compose up -d
   ```

2. **Access the frontend**: Open http://localhost:3000

3. **Navigate to Stereo Calibration**: 
   - In the sidebar, expand the **"System"** section
   - Click **"Stereo Calibration"**
   - The page displays helpful guidance on the calibration image capture procedure

4. **Create a new calibration configuration**:
   - Click **"New Calibration"** button
   - Fill in the configuration details:
     - **Configuration name** (e.g., "Production Camera Setup")
     - **Camera resolution**: Width × Height in pixels (default: 1280×720)
     - **Chessboard pattern size**: Inner corners only (default: 9×6)
       - *Note: A 9×6 corner pattern = 10×7 squares*
     - **Square size**: Physical size in millimeters (default: 25.0mm)
   - Optionally check **"Set as active configuration"**
   - Click **"Save Calibration"**

5. **Set an active calibration**:
   - Click **"Set Active"** on any calibration card
   - Only one configuration can be active at a time
   - The active configuration has a green border and "ACTIVE" badge

6. **Edit or delete calibrations**:
   - Use the **Edit** button to modify parameters
   - Use the **Delete** button to remove a configuration (confirmation required)

### Frontend Features

The Settings/Calibration component includes:
- **Visual guidance** on calibration image capture procedures
- **Inline documentation** explaining pose requirements (Yaw, Pitch, Roll)
- **Real-time validation** for form inputs
- **Active configuration tracking** with visual indicators
- **Link to full documentation** for detailed calibration instructions

## Integration with Edge Device

The calibration settings can be retrieved via the API endpoint:
```bash
GET http://localhost:8000/api/stereo-calibrations/active/
```

This returns the currently active calibration configuration that can be used by the edge device for stereo depth estimation.

## Example Calibration Values

For a standard stereo camera setup:
- **Image Resolution**: 1280 × 720 (or your camera's native resolution)
- **Chessboard Pattern**: 9 × 6 (standard OpenCV chessboard)
- **Square Size**: 25.0 mm (measure your actual chessboard)

## Next Steps

To perform actual calibration:
1. Use the `edge_device/tools/stereo_calibrate.py` script with synchronized left/right chessboard images
2. The script will output calibration parameters (Q matrix, rectification maps)
3. Upload the calibration data to the system via the API
4. Set it as the active configuration

For more details on the calibration process, see `edge_device/tools/stereo_calibrate.py`
