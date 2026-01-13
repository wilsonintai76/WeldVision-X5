# Stereo Calibration Setup

## Overview
Stereo calibration settings have been added to the WeldVision X5 system. This allows you to configure and manage stereo camera calibration parameters through the web interface.

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

3. **Navigate to Calibration**: Click the "Calibration" tab in the sidebar

4. **Create a new calibration**:
   - Click "New Calibration"
   - Fill in the configuration details:
     - Configuration name
     - Camera resolution (width × height)
     - Chessboard pattern size (inner corners)
     - Square size in millimeters
   - Optionally check "Set as active configuration"
   - Click "Save Calibration"

5. **Set an active calibration**:
   - Click "Set Active" on any calibration card
   - Only one configuration can be active at a time

6. **Edit or delete calibrations** using the respective buttons on each card

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
