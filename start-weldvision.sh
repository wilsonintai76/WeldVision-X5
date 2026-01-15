#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║   ██╗    ██╗███████╗██╗     ██████╗ ██╗   ██╗██╗███████╗    ║${NC}"
echo -e "${BLUE}║   ██║    ██║██╔════╝██║     ██╔══██╗██║   ██║██║██╔════╝    ║${NC}"
echo -e "${BLUE}║   ██║ █╗ ██║█████╗  ██║     ██║  ██║██║   ██║██║███████╗    ║${NC}"
echo -e "${BLUE}║   ██║███╗██║██╔══╝  ██║     ██║  ██║╚██╗ ██╔╝██║╚════██║    ║${NC}"
echo -e "${BLUE}║   ╚███╔███╔╝███████╗███████╗██████╔╝ ╚████╔╝ ██║███████║    ║${NC}"
echo -e "${BLUE}║    ╚══╝╚══╝ ╚══════╝╚══════╝╚═════╝   ╚═══╝  ╚═╝╚══════╝    ║${NC}"
echo -e "${BLUE}║                        X5 Edition                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Docker is running
echo "[1/4] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ERROR: Docker is not running!                             ║${NC}"
    echo -e "${RED}║                                                            ║${NC}"
    echo -e "${RED}║  Please start Docker first:                                ║${NC}"
    echo -e "${RED}║  - Mac: Open Docker Desktop from Applications              ║${NC}"
    echo -e "${RED}║  - Linux: sudo systemctl start docker                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
echo -e "    ${GREEN}[OK]${NC} Docker is running"

# Navigate to welding_server directory
echo "[2/4] Starting WeldVision services..."
cd "$SCRIPT_DIR/welding_server"

# Start containers
docker-compose up -d --build

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Failed to start services. Check the error above.${NC}"
    exit 1
fi
echo -e "    ${GREEN}[OK]${NC} Services started successfully"

# Wait for services to be ready
echo "[3/4] Waiting for services to be ready..."
sleep 5

# Check if backend is responding
echo "    Checking backend..."
until curl -s http://localhost:8000/api/ > /dev/null 2>&1; do
    sleep 2
done
echo -e "    ${GREEN}[OK]${NC} Backend is ready"

echo "[4/4] Opening WeldVision in browser..."
sleep 2

# Open browser (cross-platform)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
else
    echo "    Please open http://localhost:3000 in your browser"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   WeldVision-X5 is now running!                               ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   Frontend:  http://localhost:3000                            ║${NC}"
echo -e "${GREEN}║   Backend:   http://localhost:8000/api/                       ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   To stop: Run './stop-weldvision.sh'                         ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
