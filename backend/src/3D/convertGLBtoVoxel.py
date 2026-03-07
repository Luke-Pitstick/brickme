import open3d as o3d

def convert_glb_to_voxel(glb_path: str) -> o3d.geometry.VoxelGrid:
    mesh = o3d.io.read_triangle_model(glb_path)
    voxel_grid = o3d.geometry.VoxelGrid.create_from_triangle_mesh(mesh)
    return voxel_grid

if __name__ == "__main__":
    voxel_grid = convert_glb_to_voxel("../../output/textured_model_019cca31-4921-7bc3-a19b-3f3400f99063.glb")