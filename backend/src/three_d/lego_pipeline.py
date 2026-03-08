import json
from pathlib import Path

from .glbToPointCloud import glb_to_point_cloud
from .convertPointCloudtoVoxel import convert_pointcloud_to_voxel
from .voxelizedModelToLegoGraph import build_filled_status_matrix, generate_until_valid
from .legoRenderer import save_model


def chunk_list(items, chunk_size):
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]


def brick_to_dict(brick):
    return {
        "x": brick.x,
        "y": brick.y,
        "z": brick.z,
        "width": brick.width,
        "length": brick.length,
        "color": brick.color,
        "rotated": brick.rotated,
    }


def generate_instruction_steps(piece_list, pieces_per_step=6):
    ordered_pieces = sorted(piece_list, key=lambda brick: brick.z)

    steps = []
    built_so_far = []
    step_number = 1

    for chunk in chunk_list(ordered_pieces, pieces_per_step):
        built_so_far.extend(chunk)
        steps.append({
            "step_number": step_number,
            "current_step_bricks": list(chunk),
            "all_bricks_so_far": list(built_so_far),
        })
        step_number += 1

    return steps


def build_instruction_manifest(piece_list, job_dir: Path, public_base: str):
    instructions_dir = job_dir / "instructions"
    instructions_dir.mkdir(parents=True, exist_ok=True)

    steps = generate_instruction_steps(piece_list, pieces_per_step=6)
    manifest_steps = []

    for step in steps:
        step_number = step["step_number"]
        step_dir = instructions_dir / f"step_{step_number}"
        step_dir.mkdir(parents=True, exist_ok=True)

        full_path = step_dir / "full.glb"
        current_path = step_dir / "current.glb"

        save_model(step["all_bricks_so_far"], str(full_path))
        save_model(step["current_step_bricks"], str(current_path))

        brick_renders = []
        for i, brick in enumerate(step["current_step_bricks"]):
            brick_path = step_dir / f"brick_{i}.glb"
            save_model([brick], str(brick_path))
            brick_renders.append({
                "brick_index": i,
                "brick": brick_to_dict(brick),
                "render_url": f"{public_base}/instructions/step_{step_number}/brick_{i}.glb",
            })

        manifest_steps.append({
            "step_number": step_number,
            "all_bricks_so_far": [brick_to_dict(b) for b in step["all_bricks_so_far"]],
            "current_step_bricks": [brick_to_dict(b) for b in step["current_step_bricks"]],
            "full_render_url": f"{public_base}/instructions/step_{step_number}/full.glb",
            "current_step_render_url": f"{public_base}/instructions/step_{step_number}/current.glb",
            "brick_renders": brick_renders,
        })

    manifest = {"steps": manifest_steps}
    manifest_path = instructions_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest, manifest_path


def build_lego_package(input_glb_path: str, job_dir: str, public_base: str) -> dict:
    job_dir = Path(job_dir)
    job_dir.mkdir(parents=True, exist_ok=True)

    cloud = glb_to_point_cloud(input_glb_path)
    voxel = convert_pointcloud_to_voxel(cloud, voxel_size=0.1)
    matrix = build_filled_status_matrix(voxel)
    brick_list = generate_until_valid(matrix)

    final_model_path = job_dir / "lego_final.glb"
    save_model(brick_list, str(final_model_path))

    manifest, manifest_path = build_instruction_manifest(brick_list, job_dir, public_base)

    return {
        "model_path": str(final_model_path),
        "model_url": f"{public_base}/lego_final.glb",
        "instructions_path": str(manifest_path),
        "instructions_url": f"{public_base}/instructions/manifest.json",
        "instructions": manifest,
    }