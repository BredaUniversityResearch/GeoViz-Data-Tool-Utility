"""

GeoViz NetCDF Dataset Validator

    Validates NetCDF particle tracking files for OpenDrift/GeoViz compatibility.
    Checks for required dimensions, variables, and data integrity.

    Copyright (C) 2025  Dr. Xavier Fonseca

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    The full license text (GPL-3.0) can be found in the LICENSE file
    in the repository of this code.

Quick Reference:

    py GeoViz_Validator.py INPUT.nc [--verbose] [--quick]

Options:
    --verbose, -v    Show detailed information about each variable
    --quick, -q      Skip data sampling (faster for large files)

Example:
    # Basic validation
        py GeoViz_Validator.py mydata.nc
    
    # Detailed validation with full variable info
        py GeoViz_Validator.py mydata.nc --verbose
    
    # Quick validation (metadata only)
        py GeoViz_Validator.py mydata.nc --quick

Author:
    Dr. Xavier Fonseca
    Academy for AI, Games and Media
    Breda University of Applied Sciences
    https://www.linkedin.com/in/xavier-fonseca/

Created:
    2025.Oct.21

Repository:
    https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD 
    
"""

import xarray as xr
import numpy as np
import sys
import os
from datetime import datetime


class ValidationResult:
    """Store validation results with severity levels."""
    
    def __init__(self):
        self.errors = []      # Critical issues that prevent usage
        self.warnings = []    # Issues that may cause problems
        self.missing = []     # Missing required variables  # ADD THIS
        self.info = []        # Informational messages
        self.passed = []      # Successful checks
    
    def add_error(self, message):
        self.errors.append(f"❌ ERROR: {message}")
    
    def add_warning(self, message):
        self.warnings.append(f"⚠️  WARNING: {message}")
    
    def add_missing(self, message):  # ADD THIS METHOD
        self.missing.append(f"⚠️  MISSING: {message}")
    
    def add_info(self, message):
        self.info.append(f"ℹ️  INFO: {message}")
    
    def add_pass(self, message):
        self.passed.append(f"✓ {message}")
    
    def is_valid(self):
        """Returns True if there are no critical errors."""
        return len(self.errors) == 0
    
    def has_all_required(self):  # ADD THIS METHOD
        """Returns True if all required variables are present."""
        return len(self.missing) == 0

    def print_summary(self):
        """Print validation summary."""
        print("\n" + "=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        
        # 1. Passed checks first
        if self.passed:
            print(f"\n✓ Passed Checks ({len(self.passed)}):")
            for msg in self.passed:
                print(f"  {msg}")
        
        # 2. Missing variables second
        if self.missing:
            print(f"\n⚠️  Missing Variables ({len(self.missing)}):")
            for msg in self.missing:
                print(f"  {msg}")
        
        # 3. Information last
        if self.info:
            print(f"\nℹ️  Information ({len(self.info)}):")
            for msg in self.info:
                print(f"  {msg}")
        
        # Show warnings and errors if any (should be rare)
        if self.warnings:
            print(f"\n⚠️  Warnings ({len(self.warnings)}):")
            for msg in self.warnings:
                print(f"  {msg}")
        
        if self.errors:
            print(f"\n❌ Critical Errors ({len(self.errors)}):")
            for msg in self.errors:
                print(f"  {msg}")
        
        print("\n" + "=" * 80)
        
        # Final result message
        if self.errors:
            print("RESULT: ❌ Dataset has critical errors that prevent usage")
        elif self.missing:
            print("RESULT: Required Variables are Missing")
            print("\nRecommendation: Use GeoViz_Compatibility_Tool.py to add missing variables.")
        else:
            print("RESULT: ✓ Dataset passed all checks, it contains all required variables.")
            print("\nIf the dataset is too big for visualization, use GeoViz_Compatibility_Tool.py")
            print("to create smaller fragments to visualize them one by one.")
            print("Otherwise you can use GeoViz to visualize this dataset directly.")
        
        print("=" * 80)


def validate_file_access(filepath):
    """Validate that the file exists and is accessible."""
    result = ValidationResult()
    
    if not os.path.exists(filepath):
        result.add_error(f"File not found: {filepath}")
        return result
    
    if not os.path.isfile(filepath):
        result.add_error(f"Path is not a file: {filepath}")
        return result
    
    if not filepath.endswith('.nc'):
        result.add_warning("File does not have .nc extension")
    
    file_size_mb = os.path.getsize(filepath) / (1024**2)
    result.add_info(f"File size: {file_size_mb:.2f} MB")
    result.add_pass("File exists and is accessible")
    
    return result


def validate_dimensions(ds):
    """Validate required dimensions."""
    result = ValidationResult()
    
    required_dims = ['trajectory', 'time']
    
    for dim in required_dims:
        if dim in ds.sizes:
            size = ds.sizes[dim]
            result.add_pass(f"Required dimension '{dim}' present ({size:,} elements)")
        else:
            result.add_error(f"Missing required dimension: {dim}")
    
    if 'trajectory' in ds.sizes and 'time' in ds.sizes:
        n_traj = ds.sizes['trajectory']
        n_time = ds.sizes['time']
        total_points = n_traj * n_time
        
        result.add_info(f"Total data points: {total_points:,}")
        
        # Check for reasonable sizes
        if n_traj < 1:
            result.add_error("No trajectories in dataset")
        elif n_traj < 10:
            result.add_warning(f"Very few trajectories ({n_traj})")
        
        if n_time < 1:
            result.add_error("No time steps in dataset")
        elif n_time < 10:
            result.add_warning(f"Very few time steps ({n_time})")
    
    return result


def validate_sediment_variables(ds):
    """Validate SedimentDrift-specific variables."""
    result = ValidationResult()
    
    required_vars = {
        'particulate_diameter': 'Particle diameter',
        'particulate_density': 'Particle density',
        'particulate_class': 'Particle classification',
        'particulate_size_class': 'Particle size classification',
        'settled': 'Settlement status'
    }
    
    optional_vars = {
        'ocean_vertical_diffusivity': 'Ocean vertical mixing coefficient',
        'ocean_mixed_layer_thickness': 'Mixed layer depth'
    }
    
    # Check required variables
    for var_name, description in required_vars.items():
        if var_name in ds.variables:
            result.add_pass(f"Required variable '{var_name}' present")
        else:
            result.add_missing(f"{var_name} ({description})")  # CHANGED: use add_missing
    
    # Check optional variables
    for var_name, description in optional_vars.items():
        if var_name in ds.variables:
            result.add_pass(f"Optional variable '{var_name}' present")
        else:
            result.add_info(f"Optional variable '{var_name}' not present ({description})")
    
    return result


def validate_trajectory_variables(ds):
    """Validate common trajectory variables."""
    result = ValidationResult()
    
    common_vars = {
        'lon': 'Longitude',
        'lat': 'Latitude',
        'z': 'Depth',
        'status': 'Particle status'
    }
    
    for var_name, description in common_vars.items():
        if var_name in ds.variables:
            result.add_pass(f"Trajectory variable '{var_name}' present ({description})")
        else:
            result.add_warning(f"Common variable '{var_name}' not found ({description})")
    
    return result


def validate_attributes(ds):
    """Validate dataset attributes."""
    result = ValidationResult()
    
    # Check for OpenDrift class attribute
    if 'opendrift_class' in ds.attrs:
        opendrift_class = ds.attrs['opendrift_class']
        result.add_pass(f"OpenDrift class: {opendrift_class}")
        
        if opendrift_class != 'SedimentDrift':
            result.add_info(
                f"OpenDrift class is '{opendrift_class}' (expected 'SedimentDrift')"
            )
    else:
        result.add_warning("Missing 'opendrift_class' attribute")
    
    # Check for common metadata
    recommended_attrs = ['title', 'institution', 'source', 'history', 'Conventions']
    
    for attr in recommended_attrs:
        if attr in ds.attrs:
            result.add_pass(f"Metadata attribute '{attr}' present")
        else:
            result.add_info(f"Optional metadata '{attr}' not present")
    
    return result


def validate_data_integrity(ds, quick=False):
    """Check for data integrity issues using sampling."""
    result = ValidationResult()
    
    if quick:
        result.add_info("Skipping data sampling (--quick mode)")
        return result
    
    result.add_info("Sampling data for integrity checks...")
    
    # Sample a small subset for validation to avoid memory issues
    n_traj = ds.sizes.get('trajectory', 0)
    n_time = ds.sizes.get('time', 0)
    
    # Sample at most 100 trajectories and 100 time steps
    sample_traj = min(100, n_traj)
    sample_time = min(100, n_time)
    
    # Create random indices
    if n_traj > sample_traj:
        traj_indices = np.random.choice(n_traj, sample_traj, replace=False)
    else:
        traj_indices = np.arange(n_traj)
    
    if n_time > sample_time:
        time_indices = np.random.choice(n_time, sample_time, replace=False)
    else:
        time_indices = np.arange(n_time)
    
    # Check coordinate ranges using sample
    if 'lon' in ds.variables:
        try:
            lon_sample = ds['lon'].isel(trajectory=traj_indices, time=time_indices).values
            valid_lon = lon_sample[~np.isnan(lon_sample)]
            if len(valid_lon) > 0:
                min_lon, max_lon = np.min(valid_lon), np.max(valid_lon)
                if min_lon < -180 or max_lon > 180:
                    result.add_warning(
                        f"Longitude sample values outside valid range [-180, 180]: "
                        f"[{min_lon:.2f}, {max_lon:.2f}]"
                    )
                else:
                    result.add_pass(f"Longitude sample range valid: [{min_lon:.2f}, {max_lon:.2f}]")
        except Exception as e:
            result.add_warning(f"Could not validate longitude: {e}")
    
    if 'lat' in ds.variables:
        try:
            lat_sample = ds['lat'].isel(trajectory=traj_indices, time=time_indices).values
            valid_lat = lat_sample[~np.isnan(lat_sample)]
            if len(valid_lat) > 0:
                min_lat, max_lat = np.min(valid_lat), np.max(valid_lat)
                if min_lat < -90 or max_lat > 90:
                    result.add_warning(
                        f"Latitude sample values outside valid range [-90, 90]: "
                        f"[{min_lat:.2f}, {max_lat:.2f}]"
                    )
                else:
                    result.add_pass(f"Latitude sample range valid: [{min_lat:.2f}, {max_lat:.2f}]")
        except Exception as e:
            result.add_warning(f"Could not validate latitude: {e}")
    
    result.add_info(f"Data integrity checked using {sample_traj}×{sample_time} sample")
    
    return result


def print_dataset_overview(ds, verbose=False):
    """Print detailed overview of the dataset."""
    print("\n" + "=" * 80)
    print("DATASET OVERVIEW")
    print("=" * 80)
    
    # Dimensions
    print("\nDimensions:")
    for dim, size in ds.sizes.items():
        print(f"  {dim}: {size:,}")
    
    # Variables
    print(f"\nVariables ({len(ds.data_vars)}):")
    for var_name in sorted(ds.data_vars):
        var = ds[var_name]
        dims_str = f"({', '.join(var.dims)})"
        dtype_str = str(var.dtype)
        
        if verbose:
            print(f"\n  {var_name} {dims_str}")
            print(f"    Type: {dtype_str}")
            
            if var.attrs:
                print(f"    Attributes:")
                for attr_name, attr_value in var.attrs.items():
                    print(f"      {attr_name}: {attr_value}")
        else:
            units = var.attrs.get('units', 'no units')
            long_name = var.attrs.get('long_name', 'no description')
            print(f"  {var_name:30s} {dims_str:20s} [{units}] - {long_name}")
    
    # Global attributes
    if ds.attrs:
        print(f"\nGlobal Attributes ({len(ds.attrs)}):")
        if verbose:
            for attr_name, attr_value in ds.attrs.items():
                # Truncate long values
                attr_str = str(attr_value)
                if len(attr_str) > 100:
                    attr_str = attr_str[:97] + "..."
                print(f"  {attr_name}: {attr_str}")
        else:
            # Just show key attributes
            key_attrs = ['Conventions', 'title', 'opendrift_class', 'history', 'source']
            for attr_name in key_attrs:
                if attr_name in ds.attrs:
                    attr_str = str(ds.attrs[attr_name])
                    if len(attr_str) > 80:
                        attr_str = attr_str[:77] + "..."
                    print(f"  {attr_name}: {attr_str}")
            
            other_count = len([a for a in ds.attrs if a not in key_attrs])
            if other_count > 0:
                print(f"  ... and {other_count} more (use --verbose to see all)")


def validate_dataset(filepath, verbose=False, quick=False):
    """
    Perform complete validation of a NetCDF dataset.
    
    Parameters:
    -----------
    filepath : str
        Path to NetCDF file
    verbose : bool
        Show detailed variable information
    quick : bool
        Skip data sampling (faster)
    
    Returns:
    --------
    ValidationResult : Overall validation result
    """
    print("=" * 80)
    print("GEOVIZ NETCDF DATASET VALIDATOR")
    print("=" * 80)
    print(f"\nFile: {filepath}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check file access
    print("\nChecking file access...")
    file_result = validate_file_access(filepath)
    if not file_result.is_valid():
        file_result.print_summary()
        return file_result
    
    # Open dataset
    try:
        print("Opening dataset...")
        ds = xr.open_dataset(filepath)
    except Exception as e:
        result = ValidationResult()
        result.add_error(f"Failed to open NetCDF file: {e}")
        result.print_summary()
        return result
    
    # Print overview
    print_dataset_overview(ds, verbose)
    
    # Run all validation checks
    print("\n" + "=" * 80)
    print("VALIDATION CHECKS")
    print("=" * 80)
    
    overall_result = ValidationResult()
    
    # Collect all validation results
    checks = [
        ("Dimensions", validate_dimensions),
        ("SedimentDrift Variables", validate_sediment_variables),
        ("Trajectory Variables", validate_trajectory_variables),
        ("Attributes", validate_attributes),
        ("Data Integrity", lambda ds: validate_data_integrity(ds, quick))
    ]
    
    for check_name, check_func in checks:
        print(f"\n{check_name}:")
        try:
            check_result = check_func(ds)
            
            # Merge results into overall
            overall_result.passed.extend(check_result.passed)
            overall_result.info.extend(check_result.info)
            overall_result.warnings.extend(check_result.warnings)
            overall_result.missing.extend(check_result.missing)
            overall_result.errors.extend(check_result.errors)
            
            # Print immediate feedback
            for msg in check_result.passed:
                print(f"  {msg}")
            for msg in check_result.info:
                print(f"  {msg}")
            for msg in check_result.warnings:
                print(f"  {msg}")
            for msg in check_result.missing:  # ADD THIS
                print(f"  {msg}")
            for msg in check_result.errors:
                print(f"  {msg}")
        except Exception as e:
            error_msg = f"Validation check failed: {e}"
            print(f"  ❌ ERROR: {error_msg}")
            overall_result.add_error(error_msg)
    
    ds.close()
    
    # Print final summary
    overall_result.print_summary()
    
    return overall_result


def main():
    if len(sys.argv) < 2:
        print("GeoViz NetCDF Dataset Validator")
        print("\nUsage:")
        print("  python GeoViz_Validator.py input.nc [--verbose] [--quick]")
        print("\nOptions:")
        print("  --verbose, -v    Show detailed variable information")
        print("  --quick, -q      Skip data sampling (faster for large files)")
        print("\nExamples:")
        print("  # Basic validation")
        print("  python GeoViz_Validator.py mydata.nc")
        print("\n  # Detailed validation")
        print("  python GeoViz_Validator.py mydata.nc --verbose")
        print("\n  # Quick validation (large files)")
        print("  python GeoViz_Validator.py mydata.nc --quick")
        print("\nThis tool validates NetCDF files for OpenDrift/GeoViz compatibility.")
        print("It checks for required dimensions, variables, and data integrity.")
        return 1
    
    input_file = sys.argv[1]
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    quick = '--quick' in sys.argv or '-q' in sys.argv
    
    result = validate_dataset(input_file, verbose, quick)
    
    # Return exit code (0 for success/valid, 1 for missing variables or errors)
    return 0 if (result.is_valid() and result.has_all_required()) else 1


if __name__ == "__main__":
    sys.exit(main())