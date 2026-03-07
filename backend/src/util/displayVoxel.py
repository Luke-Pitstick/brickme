import open3d as o3d
import os
from tkinter import filedialog
import tkinter as tk

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
    voxel_grid = o3d.io.read_triangle_model(file_path)

    if not voxel_grid.meshes:
        print(f"Error: No meshes found in the model at {file_path}")
        return

    print(f"Successfully loaded model from {file_path}")
    print("Starting visualization. Press 'h' inside the window for controls.")

    # Visualize the geometries
    o3d.visualization.draw(voxel_grid)

if __name__ == "__main__":
    file_path = get_file_path()
    display_voxel(file_path)