from .glbToPointCloud import glb_to_point_cloud
from .convertPointCloudtoVoxel import  convert_pointcloud_to_voxel
from .voxelizedModelToLegoGraph import build_filled_status_matrix, generate_until_valid
from .legoRenderer import save_model

def convert_meshy_model_to_lego(input_glb_path: str, output_glb_path: str) -> str:
    cloud = glb_to_point_cloud(input_glb_path)
    voxel = convert_pointcloud_to_voxel(cloud, voxel_size=0.1)
    matrix = build_filled_status_matrix(voxel)
    brick_list = generate_until_valid(matrix)
    out_file = save_model(brick_list, output_glb_path)
    return out_file