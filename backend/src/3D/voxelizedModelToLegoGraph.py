import numpy as np
import open3d as o3d


def get_3d_color_matrix_from_voxel_grid(voxel_grid):
    bounds = voxel_grid.get_max_bound()
    matrix = np.full(bounds, "empty", dtype=str)
    for i in range(bounds.shape[0]):
        for j in range(bounds.shape[1]):
            for k in range(bounds.shape[2]):
                matrix[i, j, k] = voxel_grid.get_voxel(i, j, k).color

    return matrix

def generateGraphFromColorMatrix(matrix):
    return