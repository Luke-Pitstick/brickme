import open3d as o3d
import open3d.visualization.rendering as rendering
import os
from tkinter import filedialog
import tkinter as tk
from src.three_d.glbToPointCloud import glb_to_point_cloud


def get_file_path():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[("GLB files", "*.glb")])
    return file_path

def display_point_cloud(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    point_cloud = glb_to_point_cloud(file_path, number_of_points=20000)
    print(f"Successfully loaded point cloud from {file_path}")

    o3d.visualization.draw(point_cloud)


if __name__ == "__main__":
    file_path = get_file_path()
    display_point_cloud(file_path)