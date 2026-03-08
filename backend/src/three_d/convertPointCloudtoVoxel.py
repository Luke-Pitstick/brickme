import open3d as o3d

def convert_pointcloud_to_voxel(point_cloud: o3d.geometry.PointCloud, voxel_size: float = 0.01) -> o3d.geometry.VoxelGrid:
    voxel_grid = o3d.geometry.VoxelGrid.create_from_point_cloud(point_cloud, voxel_size)
    return voxel_grid

