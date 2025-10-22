@echo off
title GeoViz Data Tool - Production

echo ========================================
echo   GeoViz Data Tool - Production Mode
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [ERROR] node_modules not found!
    echo Please run: npm install
    echo.
    pause
    exit /b 1
)

REM Check if build scripts exist
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Please run this from the project root directory.
    echo.
    pause
    exit /b 1
)

echo Compiling for Production (and preparing a release in dist folder)...
echo.

npm run electron:build   

REM If npm command fails
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to Compile Code.
    echo.
    pause
)