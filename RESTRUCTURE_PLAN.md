# Project Restructure Plan

## Current Structure
```
WeldVision-X5/
├── backend/              # PC - Django API
├── frontend/             # PC - React UI
├── edge_device/          # RDK X5 - Inference
├── docker-compose.yml    # PC - Development
├── docker-compose.prod.yml # PC - Production
├── README.md
├── PREREQUISITES.md
├── DEPLOYMENT.md
└── STEREO_CALIBRATION_SETUP.md
```

## Proposed Structure
```
WeldVision-X5/
├── welding_server/       # 📦 DEPLOY TO PC/SERVER
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── .env.example
│   └── README.md         # Server-specific setup
│
├── edge_device/          # 📦 DEPLOY TO RDK X5
│   ├── main.py
│   ├── requirements.txt
│   ├── modules/
│   ├── tools/
│   ├── runtime/
│   ├── start.sh
│   ├── weldvision.service
│   ├── .env.example
│   └── README.md         # Edge-specific setup
│
└── docs/                 # 📚 SHARED DOCUMENTATION
    ├── README.md         # Main project README
    ├── PREREQUISITES.md
    ├── DEPLOYMENT.md
    ├── QUICKSTART.md
    └── STEREO_CALIBRATION_SETUP.md
```

## Benefits

### ✅ Deployment Clarity
- **For PC Deployment**: Just copy `welding_server/` folder
- **For RDK X5 Deployment**: Just copy `edge_device/` folder
- Clear separation of what goes where

### ✅ Version Control
- Each component can have its own `.gitignore`
- Easier to manage releases per component
- Can use Git submodules if needed

### ✅ Docker Optimization
- Server docker-compose stays in server folder
- No need to exclude edge_device in .dockerignore
- Cleaner build contexts

### ✅ Independent Deployment
- Can deploy server updates without touching edge device
- Can update edge device without server dependencies
- Each has its own README with specific instructions

## Code Changes Required

### 1. Docker Compose (welding_server/docker-compose.yml)

**Before:**
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
```

**After:**
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # No change - relative paths still work
```

**Impact**: ✅ No code changes needed (paths are already relative)

### 2. Backend Imports

**Impact**: ✅ No changes needed (internal imports are relative)

### 3. Frontend Imports

**Impact**: ✅ No changes needed (uses Vite config with relative paths)

### 4. Edge Device Configuration

**Before (edge_device/main.py):**
```python
BACKEND_URL = "http://192.168.1.10:8000/api"
```

**After:**
```python
# No change - uses network IP, not file paths
BACKEND_URL = "http://192.168.1.10:8000/api"
```

**Impact**: ✅ No changes needed (uses network URLs)

### 5. Documentation Updates

Need to update paths in:
- [x] Main README.md → docs/README.md
- [x] All documentation to reference new structure
- [x] Docker commands to include folder prefix

## Migration Steps

### Option 1: Git Move (Preserves History) ✅ RECOMMENDED

```bash
# Create new structure
mkdir -p welding_server
mkdir -p docs

# Move server components (preserves git history)
git mv backend welding_server/
git mv frontend welding_server/
git mv docker-compose.yml welding_server/
git mv docker-compose.prod.yml welding_server/

# Move documentation
git mv README.md docs/
git mv PREREQUISITES.md docs/
git mv DEPLOYMENT.md docs/
git mv QUICKSTART.md docs/
git mv STEREO_CALIBRATION_SETUP.md docs/

# Create new main README
cat > README.md << 'EOF'
# WeldVision X5

Industrial edge computing for weld quality inspection.

## Project Structure

- **[welding_server/](welding_server/)** - Deploy to PC/Server (Backend + Frontend)
- **[edge_device/](edge_device/)** - Deploy to RDK X5 (Real-time inference)
- **[docs/](docs/)** - Complete documentation

## Quick Start

See [docs/QUICKSTART.md](docs/QUICKSTART.md)

## Documentation

- [Prerequisites](docs/PREREQUISITES.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Stereo Calibration](docs/STEREO_CALIBRATION_SETUP.md)
EOF

# Commit changes
git add .
git commit -m "refactor: reorganize project structure for easier deployment"
```

### Option 2: Manual Copy (For Testing First)

```bash
# Test in a new branch
git checkout -b restructure

# Create folders
mkdir welding_server docs

# Copy (not move) to test first
cp -r backend welding_server/
cp -r frontend welding_server/
cp docker-compose*.yml welding_server/
cp *.md docs/

# Test if everything works
cd welding_server
docker-compose up -d

# If successful, commit and merge
```

## Updated Commands

### Before Restructure
```bash
# Start server
docker-compose up -d

# Deploy to RDK X5
scp -r edge_device/* sunrise@192.168.1.100:~/weldvision/
```

### After Restructure
```bash
# Start server
cd welding_server
docker-compose up -d

# Deploy to RDK X5 (unchanged)
scp -r edge_device/* sunrise@192.168.1.100:~/weldvision/
```

## Testing Checklist

After restructuring, verify:

- [ ] Server starts: `cd welding_server && docker-compose up -d`
- [ ] Frontend accessible: http://localhost:3000
- [ ] Backend API works: http://localhost:8000/api/
- [ ] Edge device can connect to backend
- [ ] All documentation links work
- [ ] Git history preserved (if using git mv)

## Recommendation

✅ **PROCEED WITH RESTRUCTURE**

**Why:**
- Minimal code changes (mostly just moving files)
- Significant deployment improvement
- Better project organization
- Aligns with deployment patterns

**When:**
- Create a backup/branch first
- Test in development before production
- Update CI/CD pipelines if any
- Notify team members of new structure

## Alternative: Symbolic Links (Not Recommended)

Could use symbolic links to avoid moving files:
```bash
ln -s ../welding_server/backend backend
ln -s ../welding_server/frontend frontend
```

**Why not recommended:**
- Doesn't work well on Windows
- Confusing for new developers
- Doesn't actually solve deployment clarity
