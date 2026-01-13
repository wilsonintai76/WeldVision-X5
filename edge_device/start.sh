#!/bin/bash
#
# WeldVision X5 - RDK X5 Startup Script
# Place in /etc/systemd/system/ for auto-start on boot
#

# Service Configuration
SERVICE_NAME="weldvision-x5"
WORK_DIR="/home/sunrise/welding_app"
PYTHON_SCRIPT="main.py"
LOG_FILE="/home/sunrise/welding_app/startup.log"

echo "Starting WeldVision X5..." | tee -a $LOG_FILE
cd $WORK_DIR

# Activate virtual environment (if used)
# source venv/bin/activate

# Run the main script
python3 $PYTHON_SCRIPT 2>&1 | tee -a $LOG_FILE
