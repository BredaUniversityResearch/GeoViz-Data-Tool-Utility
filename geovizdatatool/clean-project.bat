@echo off
echo ========================================
echo   Cleaning GeoViz Data Tool Project
echo ========================================
echo.

echo Removing node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo [OK] node_modules removed
) else (
    echo [SKIP] node_modules not found
)

echo Removing build artifacts...
if exist "build" (
    rmdir /s /q build
    echo [OK] build folder removed
) else (
    echo [SKIP] build folder not found
)

if exist "dist" (
    rmdir /s /q dist
    echo [OK] dist folder removed
) else (
    echo [SKIP] dist folder not found
)

echo Removing Python virtual environment...
if exist "python-scripts\.venv" (
    rmdir /s /q python-scripts\.venv
    echo [OK] .venv removed
) else (
    echo [SKIP] .venv not found
)

echo Removing log files...
del /q *.log 2>nul

echo.
echo ========================================
echo   Project cleaned successfully!
echo ========================================
echo.
echo To rebuild the project:
echo   1. Run: npm install
echo   2. Run: npm run electron:dev (for development)
echo   3. Or:  npm run electron:build-win (for production)
echo.
pause