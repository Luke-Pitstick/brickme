import numpy as np
import open3d as o3d
from scipy.ndimage import binary_fill_holes
from scipy.spatial import cKDTree

def fill_hollow_voxel_grid_nearest_color(voxel_grid):
    occ, min_idx = voxel_grid_to_occupancy(voxel_grid)
    if occ.size == 0:
        return o3d.geometry.VoxelGrid()

    filled_occ = binary_fill_holes(occ)

    voxel_size = voxel_grid.voxel_size
    origin = np.asarray(voxel_grid.origin)

    original_voxels = voxel_grid.get_voxels()
    original_indices = np.array([v.grid_index for v in original_voxels], dtype=int)
    original_colors = np.array([v.color for v in original_voxels], dtype=float)

    tree = cKDTree(original_indices)

    new_vg = o3d.geometry.VoxelGrid()
    new_vg.voxel_size = voxel_size
    new_vg.origin = origin

    filled_positions = np.argwhere(filled_occ)

    original_set = {tuple(idx) for idx in original_indices}

    for local_idx in filled_positions:
        global_idx = np.array(local_idx + min_idx, dtype=int)
        global_key = tuple(global_idx)

        if global_key in original_set:
            dist, nn = tree.query(global_idx)
            color = original_colors[nn]
        else:
            dist, nn = tree.query(global_idx)
            color = original_colors[nn]

        voxel = o3d.geometry.Voxel(global_key, color)
        new_vg.add_voxel(voxel)

    return new_vg

def voxel_grid_to_occupancy(voxel_grid):
    voxels = voxel_grid.get_voxels()
    if not voxels:
        return np.zeros((0, 0, 0), dtype=bool), np.array([0, 0, 0], dtype=int)

    indices = np.array([v.grid_index for v in voxels], dtype=int)
    min_idx = indices.min(axis=0)
    max_idx = indices.max(axis=0)

    shape = max_idx - min_idx + 1
    occ = np.zeros(shape, dtype=bool)

    for v in voxels:
        local = tuple(np.array(v.grid_index) - min_idx)
        occ[local] = True

    return occ, min_idx

def fill_hollow_voxel_grid(voxel_grid, fill_color=(0.5, 0.5, 0.5)):
    occ, min_idx = voxel_grid_to_occupancy(voxel_grid)
    if occ.size == 0:
        return o3d.geometry.VoxelGrid()

    # Fill enclosed holes
    filled_occ = binary_fill_holes(occ)

    voxel_size = voxel_grid.voxel_size
    origin = np.asarray(voxel_grid.origin)

    new_vg = o3d.geometry.VoxelGrid()
    new_vg.voxel_size = voxel_size
    new_vg.origin = origin

    # Keep existing voxel colors where possible
    original_colors = {
        tuple(np.array(v.grid_index, dtype=int)): np.array(v.color, dtype=float)
        for v in voxel_grid.get_voxels()
    }

    filled_positions = np.argwhere(filled_occ)

    for local_idx in filled_positions:
        global_idx = tuple(local_idx + min_idx)

        if global_idx in original_colors:
            color = original_colors[global_idx]
        else:
            color = np.array(fill_color, dtype=float)

        voxel = o3d.geometry.Voxel(global_idx, color)
        new_vg.add_voxel(voxel)

    return new_vg