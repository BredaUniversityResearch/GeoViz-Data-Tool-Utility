# GeoViz NetCDF File FrValidator and Compatibility Tool

A tool for fragmenting large NetCDF particle tracking files into smaller chunks and adding missing SedimentDrift variables for OpenDrift visualization compatibility.

## Features

- **Smart Fragmentation**: Split large NetCDF files into manageable chunks
- **Memory Safety**: Automatic memory checking with recommendations for optimal fragment sizes
- **SedimentDrift Compatibility**: Automatically adds missing variables required for OpenDrift visualization
- **Flexible Configuration**: Support for different particle types, sizes, and physical properties
- **Interactive & Command-line Modes**: Choose between guided setup or direct execution

## System Requirements

- **Python**: 3.11 (recommended for compatibility)
- **RAM**: Minimum 8GB recommended
- **Disk Space**: Ensure sufficient space for output fragments (at least two times the input file size)
- **Operating System**: Windows, macOS, or Linux 

## Installation

### Step 1: Install Python 3.11

#### Windows
1. Download Python 3.11 from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer
3. ⚠️ **Important**: Check "Add python.exe to PATH" during installation
4. Verify installation:
   ```powershell
   py -3.11 --version
   ```

#### macOS
```bash
# Using Homebrew
brew install python@3.11

# Verify installation
python3.11 --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
python3.11 --version
```

### Step 2: Create Project Directory

```bash
# Create and navigate to your project folder
mkdir GeoViz_Fragmenter
cd GeoViz_Fragmenter
```

### Step 3: Set Up Virtual Environment

#### Windows (PowerShell)
```powershell
# Create virtual environment with Python 3.11
py -3.11 -m venv .venv

# Enable script execution (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Activate the environment
.\.venv\Scripts\Activate.ps1

# You should see (.venv) in your prompt
```

#### macOS/Linux
```bash
# Create virtual environment
python3.11 -m venv .venv

# Activate the environment
source .venv/bin/activate

# You should see (.venv) in your prompt
```

### Step 4: Install Required Libraries

With your virtual environment activated:

```bash
# Install all dependencies through the requirements.txt 
pip install -r requirements.txt
```

### Step 5: Download the Script

Place `GeoViz_Compatibility_Tool.py` in your project directory.

## Usage

### Quick Start

```bash
# Interactive mode (recommended for first-time users)
py GeoViz_Compatibility_Tool.py input.nc

# Command-line mode with 10% fragments
py GeoViz_Compatibility_Tool.py input.nc 10

# Custom output location
py GeoViz_Compatibility_Tool.py input.nc 10 output/output_File_name_prefix
```

### Full Command Syntax

```bash
py GeoViz_Compatibility_Tool.py INPUT.nc PERCENTAGE [PREFIX] [CLASS] [SIZE] [DIAMETER_MM] [DENSITY]
```

## Parameters

(Particle classes are untested)

### Particle Classes
- `oil` - Oil droplets
- `other` - Generic particles (default)
- `bubble` - Gas bubbles
- `faecal_pellets` - Marine snow
- `copepod` - Zooplankton
- `diatom_chain` - Phytoplankton
- `oily_gas` - Oil-gas mixture

### Size Classes
- `small` - Small particles
- `medium` - Medium particles (default)
- `large` - Large particles

### Diameter (millimeters)
- Default: 0.1 mm
- Examples:
  - `0.005` - Microplastics
  - `2.0` - Copepods
  - `5.0` - Large oil droplets

### Density (kg/m³)
- Default: 1027 (slightly denser than seawater)
- Reference values:
  - Seawater: ~1025 kg/m³
  - Microplastics: 900-950 kg/m³
  - Copepods: 1050 kg/m³
  - Oil: 800-900 kg/m³

## Examples

### Microplastics Study
```bash
py GeoViz_Compatibility_Tool.py mydata.nc 10 microplastic other small 0.005 950
```
Creates 10 fragments at 10% each, configured for small plastic particles (0.005mm, 950 kg/m³).

### Marine Biology (Copepods)
```bash
py GeoViz_Compatibility_Tool.py mydata.nc 20 copepods copepod medium 2.0 1050
```
Creates 5 fragments at 20% each, configured for medium copepods (2mm, 1050 kg/m³).

### Oil Spill Modeling
```bash
py GeoViz_Compatibility_Tool.py mydata.nc 5 oil_spill oil large 5.0 900
```
Creates 20 fragments at 5% each, configured for large oil droplets (5mm, 900 kg/m³).

### Process Entire File
```bash
py GeoViz_Compatibility_Tool.py mydata.nc 100 ..\mydata_ready other medium 0.1 1027
```
Processes the entire file as one fragment with custom output location.

## Memory Management

The tool automatically checks available system memory and recommends optimal fragment sizes:

```
Memory check:
  Available RAM: 8,112 MB
  Estimated fragment memory: 29,994 MB
  Memory usage: 369.7% of available

⚠ WARNING: High memory usage detected!
  This may cause memory errors during save.
  Recommended percentage: 4.1%
  (This would create ~24 fragments)

  Continue anyway? (y/n) [n]:
```

### If You Encounter Memory Errors

```
numpy._core._exceptions._ArrayMemoryError: Unable to allocate X MiB
```

**Solution**: Use a smaller percentage value as recommended by the tool.

## Troubleshooting

### Virtual Environment Not Activating (Windows)

**Error**: `cannot be loaded because running scripts is disabled`

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Module Not Found Errors

**Error**: `ModuleNotFoundError: No module named 'xarray'`

**Solution**: Ensure your virtual environment is activated and packages are installed:
```bash
# Check if venv is active (you should see (.venv) in prompt)
pip list

# Reinstall if needed
pip install xarray numpy psutil netCDF4
```

### Wrong Python Version

If you have multiple Python versions installed:
```bash
# Windows
py -3.11 -m pip install -r requirements.txt

# macOS/Linux
python3.11 -m pip install -r requirements.txt
```

### NetCDF Backend Error

**Error**: `ValueError: found the following matches with the input file in xarray's IO backends`

**Solution**:
```bash
pip install netCDF4
```

## Output Files

Fragment files are named systematically:
```
[prefix]_fragment_001_of_010.nc
[prefix]_fragment_002_of_010.nc
...
[prefix]_fragment_010_of_010.nc
```

Each fragment:
- Is a complete, valid NetCDF file
- Contains metadata about its position in the original dataset
- Includes all required SedimentDrift variables
- Can be used independently with OpenDrift/GeoViz

## What Gets Added

The tool automatically adds these SedimentDrift variables if missing:

- `particulate_diameter` - Particle size in meters
- `particulate_density` - Particle density in kg/m³
- `particulate_class` - Particle type classification
- `particulate_size_class` - Size category (small/medium/large)
- `settled` - Settlement status flag
- `ocean_vertical_diffusivity` - Vertical mixing coefficient
- `ocean_mixed_layer_thickness` - Mixed layer depth

## License

Copyright (C) 2025 Dr. Xavier Fonseca

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See LICENSE file for full details.

## Author

**Dr. Xavier Fonseca**  
Academy for AI, Games and Media  
Breda University of Applied Sciences  
[LinkedIn Profile](https://www.linkedin.com/in/xavier-fonseca/)

## Repository

[https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD](https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD)

## Support

For issues, questions, or contributions, please visit the GitHub repository or contact the author through LinkedIn.

---

**Created**: 2025.Oct.20  
**Last Updated**: 2025.Oct.21