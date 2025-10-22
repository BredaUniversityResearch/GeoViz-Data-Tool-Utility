@echo off
echo ====================================================
echo GeoViz Data Tool - Dependency Installer
echo ====================================================
echo.

REM Check if Python 3.11 specifically is installed
py -3.11 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python 3.11 is required but not found
    echo.
    echo Please install Python 3.11 from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo Python 3.11 found!
py -3.11 --version
echo.

REM The script is now IN the python-scripts folder
REM So we use the current directory
set "SCRIPTS_DIR=%~dp0"

echo Installing dependencies in: %SCRIPTS_DIR%
echo.

REM Check if required files exist
if not exist "%SCRIPTS_DIR%GeoViz_Validator.py" (
    echo ERROR: GeoViz_Validator.py not found in current directory
    echo Make sure this script is in the python-scripts folder
    pause
    exit /b 1
)

if not exist "%SCRIPTS_DIR%requirements.txt" (
    echo ERROR: requirements.txt not found
    pause
    exit /b 1
)

echo All required files found!
echo.

REM Create or use existing venv
if exist "%SCRIPTS_DIR%.venv" (
    echo Virtual environment already exists at: %SCRIPTS_DIR%.venv
    echo.
) else (
    echo Creating virtual environment at: %SCRIPTS_DIR%.venv
    py -3.11 -m venv "%SCRIPTS_DIR%.venv"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
    echo.
)

echo Activating virtual environment...
call "%SCRIPTS_DIR%.venv\Scripts\activate.bat"

echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing required packages...
pip install -r "%SCRIPTS_DIR%requirements.txt"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ====================================================
echo SUCCESS! Dependencies installed successfully
echo ====================================================
echo.
echo Virtual environment location: %SCRIPTS_DIR%.venv
echo Python executable: %SCRIPTS_DIR%.venv\Scripts\python.exe
echo.
echo You can now use GeoViz Data Tool!
echo.
pause
```

**Your folder structure should be:**
```
python-scripts/
├── .venv/                          (created by the script)
│   └── Scripts/
│       └── python.exe
├── GeoViz_Validator.py
├── GeoViz_Compatibility_Tool.py
├── requirements.txt
└── install-dependencies.bat        (this file!)