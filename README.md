# GeoViz Data Tool

A desktop application for validating and processing NetCDF particle tracking files for OpenDrift visualization.

## About

**Author**: Dr. Xavier Fonseca  
**Institution**: Academy for AI, Games and Media, Breda University of Applied Sciences  
**LinkedIn**: [xavier-fonseca](https://www.linkedin.com/in/xavier-fonseca/)  
**Email**: santosfonseca.f@buas.nl

**Project Repository**: [MicroparticlesVisualization-ILIAD](https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD)  
**License**: GPL-3.0  
**Version**: 1.0.0  
**Created**: October 2025

---

## 🚀 Quick Start (For End Users)

### Step 1: Install Python Dependencies

1. Navigate to the `python-scripts/` folder
2. Double-click `install-dependencies.bat`
3. Wait for the installation to complete

This will:
- Check for Python 3.11
- Create a virtual environment (`.venv`)
- Install all required Python packages

### Step 2: Run the Application

1. Navigate to `Releases for Distribution/`
2. Double-click `GeoViz Data Tool.exe`
3. Click **"0. Configure Python"** in the app
4. Browse and select the `python-scripts` folder
5. Start validating and processing your NetCDF files!

**That's it!** You're ready to use GeoViz Data Tool.

---

## 📋 What This Tool Does

GeoViz Data Tool helps researchers and scientists:
- ✅ **Validate** NetCDF datasets for required SedimentDrift variables
- ➕ **Add missing variables** for OpenDrift compatibility
- ✂️ **Fragment large files** (20GB+) into manageable chunks
- 📊 **Process particle tracking data** with interactive console output

---

## 🛠️ For Developers

### Prerequisites

- **Node.js** 18.x or higher
- **Python** 3.11
- **npm** (comes with Node.js)

### Development Setup

#### 1. Install Dependencies
```powershell
cd geovizdatatool
npm install
```

#### 2. Install Python Dependencies
```powershell
cd python-scripts
install-dependencies.bat
```

#### 3. Run in Development Mode
```powershell
cd geovizdatatool
run-dev.bat
```

Or manually:
```powershell
npm run electron:dev
```

This starts the React development server with hot-reload.

### Building for Production

#### Option 1: Quick Build (Using Batch File)
```powershell
cd geovizdatatool
compile-production.bat
```

#### Option 2: Manual Build
```powershell
cd geovizdatatool
npm run build
npm run electron:build
```

**Output location**: `geovizdatatool/dist/`

The built executable will be:
- Windows: `GeoViz Data Tool-1.0.0.exe`
- Linux: `GeoViz Data Tool-1.0.0.AppImage`
- macOS: `GeoViz Data Tool-1.0.0.dmg`

### Cleaning the Project

Before committing to Git or preparing for distribution:
```powershell
cd geovizdatatool
clean-project.bat
```

This removes:
- `node_modules/`
- `build/`
- `dist/`
- Log files

### Project Structure
```
├── geovizdatatool/              # Electron + React application
│   ├── electron/                # Electron main process
│   │   ├── main.js             # IPC handlers, Python integration
│   │   └── preload.js          # Secure IPC bridge
│   ├── src/                     # React frontend
│   │   ├── App.js              # Main UI component
│   │   ├── index.js            # React entry point
│   │   └── index.css           # Tailwind CSS
│   ├── public/                  # Static assets
│   ├── package.json            # Dependencies & build config
│   ├── run-dev.bat             # Start development server
│   ├── compile-production.bat  # Build for production
│   ├── setup-project.bat       # Install dependencies
│   └── clean-project.bat       # Clean build artifacts
│
├── python-scripts/              # Python processing backend
│   ├── .venv/                  # Virtual environment (created by installer)
│   ├── GeoViz_Validator.py     # Validation script
│   ├── GeoViz_Compatibility_Tool.py  # Processing script
│   ├── requirements.txt        # Python dependencies
│   ├── install-dependencies.bat
│   └── README.md
│
└── Releases for Distribution/   # Production builds
    └── GeoViz Data Tool.exe
```

---

## 🔧 Technology Stack

- **Frontend**: React 19, Tailwind CSS 3
- **Desktop Framework**: Electron 38
- **Icons**: Lucide React
- **Build Tool**: electron-builder
- **Backend**: Python 3.11
- **Python Libraries**: xarray, numpy, netCDF4, dask

---

## 📦 Distribution Checklist

When preparing a release:

1. ✅ Run `clean-project.bat` to clean the source
2. ✅ Run `compile-production.bat` to build
3. ✅ Copy `.exe` from `dist/` to `Releases for Distribution/`
4. ✅ Test the executable on a clean machine
5. ✅ Include `python-scripts/` folder with `install-dependencies.bat`
6. ✅ Create a zip with:
   - `GeoViz Data Tool.exe`
   - `python-scripts/` folder
   - `README.md` (this file)
   - `LICENSE.txt`

---

## 🐛 Troubleshooting

### "Python Not Configured"

**Solution**: Click **"0. Configure Python"** and browse to the `python-scripts` folder.

### Python Installation Fails

**Problem**: Python 3.11 not found

**Solution**: 
1. Install Python 3.11 from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add Python to PATH"
3. Restart your computer
4. Run `install-dependencies.bat` again

### Application Won't Start

**Problem**: Missing dependencies

**Solution**:
1. Make sure you ran `install-dependencies.bat` in `python-scripts/`
2. Check that `.venv` folder exists in `python-scripts/`
3. Re-run the installer if needed

### Build Fails (Developers)

**Problem**: `node_modules` corruption or outdated dependencies

**Solution**:
```powershell
clean-project.bat
setup-project.bat
```

### Code Signing Warning (Windows SmartScreen)

**Problem**: "Windows protected your PC" message

**Solution**: This is normal for unsigned applications. Click "More info" → "Run anyway"

---

## 📖 Usage Guide

### Step-by-Step Workflow

#### 0️⃣ Configure Python (First Time Only)
1. Click **"0. Configure Python"**
2. Click **Browse** next to "Python Scripts Folder"
3. Select the `python-scripts` folder
4. Wait for "✓ Python Ready" confirmation

#### 1️⃣ Select NetCDF File
1. Click **"1. Select File"**
2. Browse and select your `.nc` file
3. File information will appear below

#### 2️⃣ Validate Dataset
1. Click **"Validate Dataset"**
2. Review validation results:
   - ✅ **Green**: All required variables present
   - ⚠️ **Yellow**: Missing variables (need processing)
   - ❌ **Red**: File has errors

#### 3️⃣ Process & Fragment (If Needed)
1. Select **Output Folder**
2. Configure settings:
   - **Fragment %**: Size of each chunk (10% = 10 files)
   - **Particle Class**: Type of particles
   - **Diameter & Density**: Particle properties
3. Click **"Run Tool"**
4. Wait for processing to complete

**Output**: Fragmented files with added variables, ready for OpenDrift visualization!

---

## 🔬 Research Use

### Citation

If you use this tool in your research, please cite:
```bibtex
@software{fonseca2025geoviz,
  author = {Fonseca, Xavier},
  title = {GeoViz Data Tool: Desktop Application for NetCDF Particle Tracking Validation and Processing},
  year = {2025},
  version = {1.0.0},
  institution = {Breda University of Applied Sciences},
  url = {https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD}
}
```

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Copyright © 2025 Dr. Xavier Fonseca, Breda University of Applied Sciences

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License v3.0** as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

Full license: [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)

Repository originally created in [My Personal GitHub](https://github.com/xavierfonsecaphd/GeoViz-Data-Tool-Utility).

---

## 💬 Support & Contact

For issues, questions, or collaboration:

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD/issues)
- 💼 **LinkedIn**: [Dr. Xavier Fonseca](https://www.linkedin.com/in/xavier-fonseca/)
- 📧 **Email**: santosfonseca.f@buas.nl

---

**Breda University of Applied Sciences**  
Academy for AI, Games and Media  
Breda, Netherlands  
🌐 [CRADLE Lab](https://cradle.buas.nl/)