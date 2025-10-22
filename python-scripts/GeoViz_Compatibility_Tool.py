"""

GeoViz NetCDF File Fragmenter with SedimentDrift Variables

    Fragments large NetCDF particle tracking files into smaller chunks and adds
    missing SedimentDrift variables for OpenDrift visualization compatibility.

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

    py GeoViz_Compatibility_Tool.py INPUT.nc PERCENTAGE [PREFIX] [CLASS] [SIZE] [DIAMETER_MM] [DENSITY]

Parameter Options
    Particle Classes

    oil - Oil droplets
    other - Generic particles (default)
    bubble - Gas bubbles
    faecal_pellets - Marine snow
    copepod - Zooplankton
    diatom_chain - Phytoplankton
    oily_gas - Oil-gas mixture

Size Classes

    small - Small particles
    medium - Medium particles (default)
    large - Large particles

Diameter (in millimeters)

    Default: 0.1 mm
    Examples: 0.005 (microplastic), 2.0 (copepod), 5.0 (large oil)

Density (in kg/m³)

    Default: 1027 (slightly denser than seawater)
    Seawater: ~1025 kg/m³
    Microplastics: 900-950 kg/m³
    Copepods: 1050 kg/m³
    Oil: 800-900 kg/m³

    
Example:
    # Small plastic particles (0.005mm, density 950)
        py GeoViz_Compatibility_Tool.py mydata.nc 10 microplastic other small 0.005 950
    
    # Medium-sized copepods (2mm, density 1050)
        py GeoViz_Compatibility_Tool.py mydata.nc 20 copepods copepod medium 2.0 1050
    
    # Large oil droplets (5mm, density 900)
        py GeoViz_Compatibility_Tool.py mydata.nc 5 oil_spill oil large 5.0 900
    
    # Small diatom chains (0.05mm, density 1080)
        py GeoViz_Compatibility_Tool.py mydata.nc 15 diatoms diatom_chain small 0.05 1080
    
    # You can use the entire file as well, specifying the folder and file prefix (the next command produces the file 'mydata_ready_fragment_001_of_001.nc' in the folder above):
        py GeoViz_Compatibility_Tool.py mydata.nc 100 ..\mydata_ready microplastic other small 0.005 950


Author:
    Dr. Xavier Fonseca
    Academy for AI, Games and Media
    Breda University of Applied Sciences
    https://www.linkedin.com/in/xavier-fonseca/

Created:
    2025.Oct.20

Repository:
    https://github.com/BredaUniversityResearch/MicroparticlesVisualization-ILIAD 
    
"""


import xarray as xr
import numpy as np
import sys
import os
import psutil

def estimate_memory_requirements(ds, percentage):
    """
    Estimate memory needed for fragmentation and check if system has enough.
    
    Returns tuple: (estimated_mb, available_mb, is_safe, recommended_percentage)
    """
    # Get available memory
    available_mb = psutil.virtual_memory().available / (1024**2)
    
    # Estimate memory needed (rough calculation)
    n_traj = ds.sizes['trajectory']
    n_time = ds.sizes['time']
    
    # Calculate memory per variable (assuming float32 = 4 bytes)
    bytes_per_var = n_traj * n_time * 4
    n_vars = len(ds.data_vars)
    
    # Fragment will have percentage of trajectories
    frag_traj = int(np.ceil(n_traj * percentage / 100))
    frag_bytes = frag_traj * n_time * 4 * n_vars
    
    # Add overhead for encoding/compression (3x safety factor)
    estimated_mb = (frag_bytes / (1024**2)) * 3
    
    # Consider safe if using less than 50% of available memory
    is_safe = estimated_mb < (available_mb * 0.5)
    
    # Calculate recommended percentage if not safe
    recommended_percentage = percentage
    if not is_safe:
        # Target 30% of available memory
        target_mb = available_mb * 0.3
        # FIXED: Correct calculation - if current percentage needs estimated_mb,
        # then to get target_mb we need to scale down proportionally
        recommended_percentage = (target_mb / estimated_mb) * percentage
        recommended_percentage = max(1.0, min(100.0, recommended_percentage))
    
    return estimated_mb, available_mb, is_safe, recommended_percentage


def check_memory_safety(ds, percentage):
    """
    Check if fragmentation with given percentage is safe.
    Prints warnings and recommendations if needed.
    
    Returns: True if safe, False if risky
    """
    estimated_mb, available_mb, is_safe, recommended_percentage = \
        estimate_memory_requirements(ds, percentage)
    
    print(f"\nMemory check:")
    print(f"  Available RAM: {available_mb:,.0f} MB")
    print(f"  Estimated fragment memory: {estimated_mb:,.0f} MB")
    print(f"  Memory usage: {(estimated_mb/available_mb)*100:.1f}% of available")
    
    if not is_safe:
        print(f"\n⚠ WARNING: High memory usage detected!")
        print(f"  This may cause memory errors during save.")
        print(f"  Recommended percentage: {recommended_percentage:.1f}%")
        print(f"  (This would create ~{int(100/recommended_percentage)} fragments)")
        
        response = input(f"\n  Continue anyway? (y/n) [n]: ").strip().lower()
        return response == 'y'
    else:
        print(f"  ✓ Memory usage is safe")
    
    return True

def add_missing_sediment_variables(ds, 
                                  particle_class='other',
                                  particle_size_class='medium',
                                  particle_diameter=0.0001,
                                  particle_density=1027.0):
    """
    Add missing SedimentDrift variables to a dataset if they don't exist.
    
    Returns a list of variables that were added.
    """
    n_traj = ds.sizes['trajectory']
    n_time = ds.sizes['time']
    
    added_vars = []
    
    if 'particulate_diameter' not in ds.variables:
        ds['particulate_diameter'] = xr.DataArray(
            np.full((n_traj, n_time), particle_diameter, dtype=np.float32),
            dims=('trajectory', 'time'),
            attrs={'units': 'm', 'long_name': 'Particle diameter'}
        )
        added_vars.append(f'particulate_diameter ({particle_diameter} m)')
    
    if 'particulate_density' not in ds.variables:
        ds['particulate_density'] = xr.DataArray(
            np.full((n_traj, n_time), particle_density, dtype=np.float32),
            dims=('trajectory', 'time'),
            attrs={'units': 'kg m-3', 'long_name': 'Particle density'}
        )
        added_vars.append(f'particulate_density ({particle_density} kg/m³)')
    
    if 'particulate_class' not in ds.variables:
        ds['particulate_class'] = xr.DataArray(
            np.full((n_traj, n_time), particle_class, dtype=object),
            dims=('trajectory', 'time'),
            attrs={
                'units': '', 
                'classes': 'oil,other,bubble,faecal_pellets,copepod,diatom_chain,oily_gas',
                'long_name': 'Particle classification'
            }
        )
        added_vars.append(f'particulate_class ({particle_class})')
    
    if 'particulate_size_class' not in ds.variables:
        ds['particulate_size_class'] = xr.DataArray(
            np.full((n_traj, n_time), particle_size_class, dtype='U6'),
            dims=('trajectory', 'time'),
            attrs={
                'units': '', 
                'classes': 'small,medium,large',
                'long_name': 'Particle size classification'
            }
        )
        added_vars.append(f'particulate_size_class ({particle_size_class})')
    
    if 'settled' not in ds.variables:
        ds['settled'] = xr.DataArray(
            np.zeros((n_traj, n_time), dtype=np.uint8),
            dims=('trajectory', 'time'),
            attrs={'units': '1', 'long_name': 'Particle settled on seafloor'}
        )
        added_vars.append('settled (0)')
    
    if 'ocean_vertical_diffusivity' not in ds.variables:
        ds['ocean_vertical_diffusivity'] = xr.DataArray(
            np.full((n_traj, n_time), 0.02, dtype=np.float32),
            dims=('trajectory', 'time'),
            attrs={'units': 'm²/s', 'long_name': 'Ocean vertical diffusivity'}
        )
        added_vars.append('ocean_vertical_diffusivity (0.02 m²/s)')
    
    if 'ocean_mixed_layer_thickness' not in ds.variables:
        ds['ocean_mixed_layer_thickness'] = xr.DataArray(
            np.full((n_traj, n_time), 50.0, dtype=np.float32),
            dims=('trajectory', 'time'),
            attrs={'units': 'm', 'long_name': 'Ocean mixed layer thickness'}
        )
        added_vars.append('ocean_mixed_layer_thickness (50 m)')
    
    # Update attributes
    if 'opendrift_class' not in ds.attrs:
        ds.attrs['opendrift_class'] = 'SedimentDrift'
    
    return added_vars


def create_fragments(input_file, 
                    output_prefix=None,
                    percentage=10.0,
                    add_sediment_vars=True,
                    particle_class='other',
                    particle_size_class='medium',
                    particle_diameter=0.0001,
                    particle_density=1027.0):
    """
    Fragment a large NetCDF file into smaller pieces based on percentage.
    
    Parameters:
    -----------
    input_file : str
        Path to the large NetCDF file
    output_prefix : str, optional
        Prefix for output files. If None, uses input filename
    percentage : float
        Percentage of data per fragment (default: 10.0 = 10%)
    add_sediment_vars : bool
        Whether to add missing SedimentDrift variables (default: True)
    particle_class : str
        Default particle class (default: 'other')
    particle_size_class : str
        Default size class (default: 'medium')
    particle_diameter : float
        Default diameter in meters (default: 0.0001 = 0.1mm)
    particle_density : float
        Default density in kg/m³ (default: 1027)
    
    Returns:
    --------
    list : Paths to created fragment files
    """
    print("=" * 80)
    print("FRAGMENTING NETCDF FILE WITH SEDIMENT VARIABLES")
    print("=" * 80)
    
    # Determine output prefix
    if output_prefix is None:
        output_prefix = input_file.replace('.nc', '')
    
    print(f"\nInput file: {input_file}")
    print(f"Output prefix: {output_prefix}")
    print(f"Fragment size: {percentage}% of original")
    
    # Open dataset
    print("\nOpening dataset...")
    ds = xr.open_dataset(input_file)
    
    n_traj = ds.sizes['trajectory']
    n_time = ds.sizes['time']
    
    print(f"Original dimensions: {n_traj:,} trajectories × {n_time:,} timesteps")
    print(f"Total data points: {n_traj * n_time:,}")

    # ADD THIS MEMORY CHECK:
    if not check_memory_safety(ds, percentage):
        ds.close()
        print("\nFragmentation cancelled due to memory concerns.")
        return []
    
    # Calculate fragment parameters
    if percentage <= 0 or percentage > 100:
        raise ValueError("Percentage must be between 0 and 100")
    
    trajectories_per_fragment = int(np.ceil(n_traj * percentage / 100))
    num_fragments = int(np.ceil(n_traj / trajectories_per_fragment))
    
    print(f"\nFragmentation plan:")
    print(f"  Trajectories per fragment: {trajectories_per_fragment:,}")
    print(f"  Number of fragments: {num_fragments}")
    print(f"  Actual percentage per fragment: {(trajectories_per_fragment/n_traj)*100:.2f}%")
    
    # Check for missing variables
    required_vars = ['particulate_diameter', 'particulate_density', 
                     'particulate_class', 'particulate_size_class', 'settled']
    missing_vars = [v for v in required_vars if v not in ds.variables]
    
    if missing_vars and add_sediment_vars:
        print(f"\nMissing SedimentDrift variables detected: {len(missing_vars)}")
        for var in missing_vars:
            print(f"  - {var}")
        print("→ These will be added to each fragment with default values")
    elif missing_vars:
        print(f"\n⚠ Warning: Missing SedimentDrift variables: {missing_vars}")
        print("  Set add_sediment_vars=True to add them automatically")
    else:
        print("\n✓ All required SedimentDrift variables present in original dataset")
    
    # Create fragments
    print(f"\nCreating {num_fragments} fragment(s)...")
    print("-" * 80)
    
    output_files = []
    
    for i in range(num_fragments):
        start_idx = i * trajectories_per_fragment
        end_idx = min((i + 1) * trajectories_per_fragment, n_traj)
        
        fragment_num = i + 1
        output_file = f"{output_prefix}_fragment_{fragment_num:03d}_of_{num_fragments:03d}.nc"
        
        print(f"\nFragment {fragment_num}/{num_fragments}:")
        print(f"  Trajectories: {start_idx:,} to {end_idx-1:,} ({end_idx-start_idx:,} total)")
        print(f"  Output: {output_file}")
        
        # Create fragment
        ds_fragment = ds.isel(trajectory=slice(start_idx, end_idx))
        
        # Add missing sediment variables if requested
        if add_sediment_vars:
            added = add_missing_sediment_variables(
                ds_fragment,
                particle_class=particle_class,
                particle_size_class=particle_size_class,
                particle_diameter=particle_diameter,
                particle_density=particle_density
            )
            if added:
                print(f"  Added variables:")
                for var in added:
                    print(f"    + {var}")
            else:
                print(f"  ✓ All variables already present")
        
        # Add fragment metadata
        ds_fragment.attrs['fragment_number'] = fragment_num
        ds_fragment.attrs['total_fragments'] = num_fragments
        ds_fragment.attrs['fragment_trajectory_start'] = start_idx
        ds_fragment.attrs['fragment_trajectory_end'] = end_idx
        ds_fragment.attrs['original_file'] = os.path.basename(input_file)
        ds_fragment.attrs['modified_by'] = 'fragment_with_sediment.py'
        
        # Save fragment
        print(f"  Saving...")
        ds_fragment.to_netcdf(output_file)
        
        file_size = os.path.getsize(output_file) / (1024**2)  # MB
        print(f"  Size: {file_size:.2f} MB")
        
        output_files.append(output_file)
        ds_fragment.close()
    
    ds.close()
    
    # Summary
    print("\n" + "=" * 80)
    print("FRAGMENTATION COMPLETE")
    print("=" * 80)
    
    original_size = os.path.getsize(input_file) / (1024**2)  # MB
    total_fragment_size = sum(os.path.getsize(f) / (1024**2) for f in output_files)
    
    print(f"\nOriginal file size: {original_size:.2f} MB")
    print(f"Total fragments size: {total_fragment_size:.2f} MB")
    print(f"Size overhead: {((total_fragment_size/original_size - 1) * 100):.1f}%")
    
    print(f"\nCreated {len(output_files)} fragment(s):")
    for f in output_files:
        size = os.path.getsize(f) / (1024**2)
        print(f"  • {f} ({size:.2f} MB)")
    
    return output_files


def interactive_mode(input_file):
    """Interactive mode to configure fragmentation."""
    print("\n" + "=" * 80)
    print("INTERACTIVE FRAGMENTATION MODE")
    print("=" * 80)
    
    # Percentage
    percentage_input = input("\nEnter percentage per fragment (e.g., 10 for 10%) [default: 10]: ").strip()
    percentage = float(percentage_input) if percentage_input else 10.0
    
    # Calculate expected fragments
    ds = xr.open_dataset(input_file)
    n_traj = ds.dims['trajectory']
    num_fragments = int(np.ceil(100 / percentage))
    print(f"\nThis will create approximately {num_fragments} fragment(s)")
    print(f"({n_traj:,} trajectories ÷ {num_fragments} = ~{n_traj//num_fragments:,} trajectories per fragment)")
    ds.close()
    
    # Add sediment variables
    add_vars = input("\nAdd missing SedimentDrift variables? (y/n) [default: y]: ").strip().lower()
    add_sediment_vars = add_vars != 'n'
    
    # Particle properties (only if adding variables)
    particle_class = 'other'
    particle_size_class = 'medium'
    particle_diameter = 0.0001
    particle_density = 1027.0
    
    if add_sediment_vars:
        print("\nConfigure particle properties (press Enter for defaults):")
        
        classes = ['oil', 'other', 'bubble', 'faecal_pellets', 'copepod', 'diatom_chain', 'oily_gas']
        print("\nParticle classes:")
        for i, c in enumerate(classes, 1):
            print(f"  {i}. {c}")
        choice = input("Select (1-7) [default: 2=other]: ").strip()
        particle_class = classes[int(choice)-1] if choice.isdigit() and 1 <= int(choice) <= 7 else 'other'
        
        sizes = ['small', 'medium', 'large']
        print("\nSize classes:")
        for i, s in enumerate(sizes, 1):
            print(f"  {i}. {s}")
        choice = input("Select (1-3) [default: 2=medium]: ").strip()
        particle_size_class = sizes[int(choice)-1] if choice.isdigit() and 1 <= int(choice) <= 3 else 'medium'
        
        diameter_input = input("\nParticle diameter in mm [default: 0.1]: ").strip()
        particle_diameter = float(diameter_input) / 1000 if diameter_input else 0.0001
        
        density_input = input("Particle density in kg/m³ [default: 1027]: ").strip()
        particle_density = float(density_input) if density_input else 1027.0
    
    # Output prefix
    default_prefix = input_file.replace('.nc', '')
    output_prefix = input(f"\nOutput prefix [default: {default_prefix}]: ").strip()
    if not output_prefix:
        output_prefix = None
    
    # Confirm
    print("\n" + "-" * 80)
    print("Configuration:")
    print(f"  Input: {input_file}")
    print(f"  Fragment percentage: {percentage}%")
    print(f"  Expected fragments: ~{num_fragments}")
    print(f"  Add sediment vars: {add_sediment_vars}")
    if add_sediment_vars:
        print(f"  Particle class: {particle_class}")
        print(f"  Size class: {particle_size_class}")
        print(f"  Diameter: {particle_diameter*1000} mm")
        print(f"  Density: {particle_density} kg/m³")
    print("-" * 80)
    
    proceed = input("\nProceed? (y/n) [default: y]: ").strip().lower()
    if proceed == 'n':
        print("Cancelled.")
        return
    
    # Create fragments
    return create_fragments(
        input_file,
        output_prefix=output_prefix,
        percentage=percentage,
        add_sediment_vars=add_sediment_vars,
        particle_class=particle_class,
        particle_size_class=particle_size_class,
        particle_diameter=particle_diameter,
        particle_density=particle_density
    )


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Interactive mode:")
        print("    python fragment_with_sediment.py input.nc")
        print("\n  Command-line mode:")
        print("    python fragment_with_sediment.py input.nc [percentage] [output_prefix]")
        print("\nParameters:")
        print("  input.nc       - Input NetCDF file to fragment")
        print("  percentage     - Percentage per fragment (default: 10.0)")
        print("                   100 = 1 file, 10 = 10 files, 1 = 100 files")
        print("  output_prefix  - Prefix for output files (default: input filename)")
        print("\nExamples:")
        print("  # Interactive mode:")
        print("  python fragment_with_sediment.py large_file.nc")
        print("\n  # Create 10 fragments (10% each):")
        print("  python fragment_with_sediment.py large_file.nc 10")
        print("\n  # Create 5 fragments (20% each):")
        print("  python fragment_with_sediment.py large_file.nc 20")
        print("\n  # Create 100 fragments (1% each) with custom prefix:")
        print("  python fragment_with_sediment.py large_file.nc 1 output/fragments")
        print("\nFeatures:")
        print("  • Automatically detects and adds missing SedimentDrift variables")
        print("  • Each fragment is a complete, valid NetCDF file")
        print("  • Fragment metadata tracks position in original dataset")
        return
    
    input_file = sys.argv[1]
    
    if len(sys.argv) == 2:
        # Interactive mode
        interactive_mode(input_file)
    else:
        # Command-line mode
        percentage = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
        output_prefix = sys.argv[3] if len(sys.argv) > 3 else None
        
        create_fragments(input_file, output_prefix, percentage)


if __name__ == "__main__":
    main()