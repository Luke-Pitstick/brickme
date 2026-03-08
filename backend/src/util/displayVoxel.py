import open3d as o3d
import os
from tkinter import filedialog
import tkinter as tk
from src.three_d.convertPointCloudtoVoxel import convert_pointcloud_to_voxel
from src.three_d.glbToPointCloud import glb_to_point_cloud

def get_file_path():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[("GLB files", "*.glb")])
    return file_path

def display_voxel(file_path: str):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    # Read the triangle mesh model from the .glb file
    # Open3D supports reading rich 3D models with PBR materials
    point_cloud = glb_to_point_cloud(file_path, number_of_points=200000)
    voxel_grid = convert_pointcloud_to_voxel(point_cloud, voxel_size=0.03)

    print(f"Successfully loaded voxel grid from {file_path}")
    print("Starting visualization. Press 'h' inside the window for controls.")

    o3d.visualization.draw(voxel_grid)

if __name__ == "__main__":
    file_path = get_file_path()
    display_voxel(file_path)