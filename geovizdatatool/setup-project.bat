@echo off
title GeoViz Data Tool - Project Setup

echo ========================================
echo   GeoViz Data Tool - Project Setup
echo ========================================
echo.

echo Step 1: Installing Node dependencies...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To run the project:
echo   - Development: run-dev.bat or npm run electron:dev
echo   - Build:       npm run electron:build-win
echo.
echo Note: Python scripts require separate setup
echo       Run python-scripts/install-dependencies.bat
echo.
pause