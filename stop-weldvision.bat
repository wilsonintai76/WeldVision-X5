@echo off
title WeldVision-X5 - Stopping
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║               Stopping WeldVision-X5...                       ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0welding_server"

echo [1/2] Stopping containers...
docker-compose down

if %errorlevel% neq 0 (
    echo.
    echo  [WARNING] Some services may not have stopped properly.
    echo            You can manually stop them in Docker Desktop.
)

echo [2/2] Cleanup complete

echo.
echo  ╔════════════════════════════════════════════════════════════════╗
echo  ║                                                                ║
echo  ║   WeldVision-X5 has been stopped.                             ║
echo  ║                                                                ║
echo  ║   Your data is saved and will be available next time.         ║
echo  ║                                                                ║
echo  ╚════════════════════════════════════════════════════════════════╝
echo.
pause
