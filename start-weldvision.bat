@echo off
title WeldVision-X5 Launcher
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║   ██╗    ██╗███████╗██╗     ██████╗ ██╗   ██╗██╗███████╗    ║
echo  ║   ██║    ██║██╔════╝██║     ██╔══██╗██║   ██║██║██╔════╝    ║
echo  ║   ██║ █╗ ██║█████╗  ██║     ██║  ██║██║   ██║██║███████╗    ║
echo  ║   ██║███╗██║██╔══╝  ██║     ██║  ██║╚██╗ ██╔╝██║╚════██║    ║
echo  ║   ╚███╔███╔╝███████╗███████╗██████╔╝ ╚████╔╝ ██║███████║    ║
echo  ║    ╚══╝╚══╝ ╚══════╝╚══════╝╚═════╝   ╚═══╝  ╚═╝╚══════╝    ║
echo  ║                        X5 Edition                           ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check if Docker is running
echo [1/4] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ╔════════════════════════════════════════════════════════════╗
    echo  ║  ERROR: Docker is not running!                             ║
    echo  ║                                                            ║
    echo  ║  Please start Docker Desktop first:                        ║
    echo  ║  1. Click the Docker Desktop icon in your taskbar          ║
    echo  ║  2. Wait for Docker to fully start (whale icon stops)      ║
    echo  ║  3. Run this script again                                  ║
    echo  ╚════════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo     [OK] Docker is running

:: Navigate to welding_server directory
echo [2/4] Starting WeldVision services...
cd /d "%~dp0welding_server"

:: Start containers
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Failed to start services. Check the error above.
    pause
    exit /b 1
)

echo     [OK] Services started successfully

:: Wait for services to be ready
echo [3/4] Waiting for services to be ready...
timeout /t 5 /nobreak >nul

:: Check if backend is responding
echo     Checking backend...
:check_backend
curl -s http://localhost:8000/api/ >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto check_backend
)
echo     [OK] Backend is ready

echo [4/4] Opening WeldVision in browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo  ╔════════════════════════════════════════════════════════════════╗
echo  ║                                                                ║
echo  ║   WeldVision-X5 is now running!                               ║
echo  ║                                                                ║
echo  ║   Frontend:  http://localhost:3000                            ║
echo  ║   Backend:   http://localhost:8000/api/                       ║
echo  ║                                                                ║
echo  ║   To stop: Run 'stop-weldvision.bat' or close Docker Desktop  ║
echo  ║                                                                ║
echo  ╚════════════════════════════════════════════════════════════════╝
echo.
echo Press any key to close this window (WeldVision will keep running)...
pause >nul
