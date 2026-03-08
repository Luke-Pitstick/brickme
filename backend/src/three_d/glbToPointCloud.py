import open3d as o3d
import numpy as np
import trimesh
from trimesh.sample import sample_surface


def _ensure_simple_material(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Convert PBRMaterial to SimpleMaterial so sample_surface can access .image."""
    if not hasattr(mesh.visual, "material"):
        return mesh
    mat = mesh.visual.material
    if hasattr(mat, "materials") and len(mat.materials) > 0:
        mat = mat.materials[0]
    if hasattr(mat, "to_simple"):
        mesh = mesh.copy()
        mesh.visual = mesh.visual.copy()
        mesh.visual.material = mat.to_simple()
    return mesh


def _sample_mesh_with_colors(mesh: trimesh.Trimesh, count: int):
    """Sample points with colors from a single mesh (preserves its material/UV mapping)."""
    mesh = _ensure_simple_material(mesh)
    points, _, colors = sample_surface(mesh, count, sample_color=True)
    return np.asarray(points), np.asarray(colors) if colors is not None else None


def glb_to_point_cloud(glb_path: str, number_of_points: int = 1000000) -> o3d.geometry.PointCloud:
    """Convert GLB to point cloud, sampling colors from the model's texture."""
    loaded = trimesh.load(glb_path, force="mesh", process=False)

    if isinstance(loaded, trimesh.Scene):
        # Sample from each mesh separately to preserve correct material/UV mapping.
        # Concatenating first can corrupt UVs when materials are merged.
        all_points = []
        all_colors = []
        geoms = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
        if not geoms:
            raise ValueError("No meshes found in GLB")
        points_per_mesh = max(1, number_of_points // len(geoms))
        for geom in geoms:
            pts, cols = _sample_mesh_with_colors(geom, points_per_mesh)
            # Apply scene transform for this geometry
            if geom in loaded.graph:
                transform = loaded.graph.get(geom, np.eye(4))
                pts = trimesh.transform_points(pts, transform)
            all_points.append(pts)
            if cols is not None:
                all_colors.append(cols)
        points = np.vstack(all_points)
        colors = np.vstack(all_colors) if all_colors else None
    else:
        points, colors = _sample_mesh_with_colors(loaded, number_of_points)

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    if colors is not None and len(colors) > 0:
        pcd.colors = o3d.utility.Vector3dVector(colors[:, :3].astype(np.float64) / 255.0)
    else:
        pcd.paint_uniform_color([0.7, 0.7, 0.7])
    return pcd
