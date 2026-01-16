"""
PLY Point Cloud Exporter

Generates PLY point cloud files from stereo depth maps.
Supports both full-resolution export and decimated preview for web viewers.
"""

from __future__ import annotations

import os
import numpy as np
import cv2
from pathlib import Path
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def generate_ply_from_depth(
    depth_map: np.ndarray,
    rgb_image: np.ndarray,
    Q: np.ndarray,
    output_path: str,
    mask: Optional[np.ndarray] = None,
) -> bool:
    """
    Generate PLY point cloud from depth map and RGB image.
    
    Args:
        depth_map: Disparity map or depth values (float32)
        rgb_image: BGR color image matching depth dimensions
        Q: 4x4 reprojection matrix from stereo calibration
        output_path: Path to save the .ply file
        mask: Optional binary mask to filter valid points
    
    Returns:
        bool: True if export successful
    """
    try:
        # Reproject to 3D using Q matrix
        points_3d = cv2.reprojectImageTo3D(depth_map.astype(np.float32), Q)
        
        # Get colors (convert BGR to RGB)
        if len(rgb_image.shape) == 3:
            colors = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        else:
            # Grayscale - expand to 3 channels
            colors = cv2.cvtColor(rgb_image, cv2.COLOR_GRAY2RGB)
        
        # Resize colors if needed
        if colors.shape[:2] != points_3d.shape[:2]:
            colors = cv2.resize(colors, (points_3d.shape[1], points_3d.shape[0]))
        
        # Create validity mask
        if mask is None:
            # Default: filter invalid depth values
            mask = (
                np.isfinite(points_3d[:, :, 2]) &
                (points_3d[:, :, 2] > 0) &
                (points_3d[:, :, 2] < 10000)  # Max 10m depth
            )
        
        # Apply mask
        valid_points = points_3d[mask]
        valid_colors = colors[mask]
        
        if len(valid_points) == 0:
            logger.warning("No valid points to export")
            return False
        
        # Create output directory
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        # Write PLY file
        _write_ply(output_path, valid_points, valid_colors)
        
        logger.info(f"Exported {len(valid_points)} points to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"PLY export failed: {e}")
        return False


def _write_ply(filepath: str, points: np.ndarray, colors: np.ndarray) -> None:
    """Write points and colors to PLY file."""
    num_points = len(points)
    
    header = f"""ply
format ascii 1.0
element vertex {num_points}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
"""
    
    with open(filepath, 'w') as f:
        f.write(header)
        for i in range(num_points):
            x, y, z = points[i]
            r, g, b = colors[i].astype(int)
            f.write(f"{x:.6f} {y:.6f} {z:.6f} {r} {g} {b}\n")


def decimate_point_cloud(
    points: np.ndarray,
    colors: np.ndarray,
    target_count: int = 50000,
    method: str = 'random',
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Decimate point cloud to target number of points.
    
    Args:
        points: Nx3 array of XYZ coordinates
        colors: Nx3 array of RGB colors
        target_count: Target number of points (default 50k for web)
        method: 'random' for random sampling, 'grid' for voxel grid
    
    Returns:
        Tuple of (decimated_points, decimated_colors)
    """
    num_points = len(points)
    
    if num_points <= target_count:
        return points, colors
    
    if method == 'random':
        # Random uniform sampling
        indices = np.random.choice(num_points, target_count, replace=False)
        return points[indices], colors[indices]
    
    elif method == 'grid':
        # Simple voxel grid downsampling
        # Calculate voxel size based on bounding box and target count
        min_coords = np.min(points, axis=0)
        max_coords = np.max(points, axis=0)
        range_coords = max_coords - min_coords
        
        # Estimate voxel size
        volume = np.prod(range_coords + 1e-6)
        voxel_volume = volume / target_count
        voxel_size = voxel_volume ** (1/3)
        
        # Assign points to voxels
        voxel_indices = ((points - min_coords) / voxel_size).astype(int)
        voxel_keys = voxel_indices[:, 0] * 1000000 + voxel_indices[:, 1] * 1000 + voxel_indices[:, 2]
        
        # Get unique voxels and pick one point per voxel
        _, unique_indices = np.unique(voxel_keys, return_index=True)
        
        # If still too many, random sample
        if len(unique_indices) > target_count:
            unique_indices = np.random.choice(unique_indices, target_count, replace=False)
        
        return points[unique_indices], colors[unique_indices]
    
    else:
        raise ValueError(f"Unknown decimation method: {method}")


def generate_preview_json(
    depth_map: np.ndarray,
    rgb_image: np.ndarray,
    Q: np.ndarray,
    target_points: int = 50000,
) -> dict:
    """
    Generate decimated point cloud as JSON for web 3D viewer.
    
    Args:
        depth_map: Disparity map or depth values
        rgb_image: BGR color image
        Q: 4x4 reprojection matrix
        target_points: Target number of points for preview
    
    Returns:
        dict: Point cloud data suitable for Three.js
        {
            "points": [[x,y,z], ...],
            "colors": [[r,g,b], ...],
            "count": int,
            "bounds": {"min": [x,y,z], "max": [x,y,z]}
        }
    """
    try:
        # Reproject to 3D
        points_3d = cv2.reprojectImageTo3D(depth_map.astype(np.float32), Q)
        
        # Get RGB colors
        if len(rgb_image.shape) == 3:
            colors = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        else:
            colors = cv2.cvtColor(rgb_image, cv2.COLOR_GRAY2RGB)
        
        if colors.shape[:2] != points_3d.shape[:2]:
            colors = cv2.resize(colors, (points_3d.shape[1], points_3d.shape[0]))
        
        # Filter valid points
        mask = (
            np.isfinite(points_3d[:, :, 2]) &
            (points_3d[:, :, 2] > 0) &
            (points_3d[:, :, 2] < 10000)
        )
        
        valid_points = points_3d[mask]
        valid_colors = colors[mask]
        
        if len(valid_points) == 0:
            return {"points": [], "colors": [], "count": 0, "bounds": None}
        
        # Decimate for web preview
        dec_points, dec_colors = decimate_point_cloud(
            valid_points, valid_colors, target_points, method='random'
        )
        
        # Calculate bounds
        min_coords = np.min(dec_points, axis=0).tolist()
        max_coords = np.max(dec_points, axis=0).tolist()
        
        # Convert to lists (JSON serializable)
        # Round to reduce JSON size
        points_list = np.round(dec_points, 2).tolist()
        colors_list = dec_colors.astype(int).tolist()
        
        return {
            "points": points_list,
            "colors": colors_list,
            "count": len(points_list),
            "bounds": {
                "min": [round(x, 2) for x in min_coords],
                "max": [round(x, 2) for x in max_coords]
            }
        }
        
    except Exception as e:
        logger.error(f"Preview JSON generation failed: {e}")
        return {"points": [], "colors": [], "count": 0, "bounds": None, "error": str(e)}


def load_ply(filepath: str) -> Tuple[np.ndarray, np.ndarray]:
    """
    Load PLY file and return points and colors.
    
    Args:
        filepath: Path to PLY file
    
    Returns:
        Tuple of (points Nx3, colors Nx3)
    """
    points = []
    colors = []
    
    with open(filepath, 'r') as f:
        # Skip header
        line = f.readline()
        while 'end_header' not in line:
            line = f.readline()
        
        # Read data
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 6:
                x, y, z = float(parts[0]), float(parts[1]), float(parts[2])
                r, g, b = int(parts[3]), int(parts[4]), int(parts[5])
                points.append([x, y, z])
                colors.append([r, g, b])
    
    return np.array(points), np.array(colors)
