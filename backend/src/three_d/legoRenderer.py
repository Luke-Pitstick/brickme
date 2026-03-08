import trimesh
from legoBrick import LegoBrick

STUD = 8.0
BRICK_HEIGHT = 9.6
STUD_DIAMETER = 4.8
STUD_HEIGHT = 1.8
CLEAR_ALPHA = 90


def color_to_rgba(color: str) -> list[int]:
    if not isinstance(color, str):
        raise TypeError(f"Color must be a string, got {type(color).__name__}")

    c = color.strip()

    if c.lower() == "clear":
        return [255, 255, 255, CLEAR_ALPHA]

    if c.startswith("#"):
        c = c[1:]

    if len(c) != 6:
        raise ValueError(
            f"Invalid color '{color}'. Expected '#RRGGBB' or 'clear'."
        )

    try:
        r = int(c[0:2], 16)
        g = int(c[2:4], 16)
        b = int(c[4:6], 16)
    except ValueError as exc:
        raise ValueError(
            f"Invalid hex color '{color}'. Expected '#RRGGBB'."
        ) from exc

    return [r, g, b, 255]

def get_brick_dims(brick: LegoBrick) -> tuple[float, float, int, int]:

    if brick.rotated:
        x_size = brick.width * STUD
        y_size = brick.length * STUD
        studs_x = brick.width
        studs_y = brick.length
    else:
        x_size = brick.length * STUD
        y_size = brick.width * STUD
        studs_x = brick.length
        studs_y = brick.width

    return x_size, y_size, studs_x, studs_y


def create_stud(center_x: float, center_y: float, top_z: float) -> trimesh.Trimesh:
    """
    Create one top stud.
    """
    stud = trimesh.creation.cylinder(
        radius=STUD_DIAMETER / 2.0,
        height=STUD_HEIGHT,
        sections=32
    )
    stud.apply_translation([center_x, center_y, top_z + STUD_HEIGHT / 2.0])
    return stud


def create_brick_mesh(brick: LegoBrick) -> trimesh.Trimesh:
    x_size, y_size, studs_x, studs_y = get_brick_dims(brick)
    rgba = color_to_rgba(brick.color)


    body = trimesh.creation.box(extents=[x_size, y_size, BRICK_HEIGHT])

    top_z = BRICK_HEIGHT / 2.0

    parts = [body]

    for ix in range(studs_x):
        for iy in range(studs_y):
            cx = -x_size / 2.0 + STUD / 2.0 + ix * STUD
            cy = -y_size / 2.0 + STUD / 2.0 + iy * STUD
            parts.append(create_stud(cx, cy, top_z))

    brick_mesh = trimesh.util.concatenate(parts)

    brick_mesh.visual.face_colors = rgba

    tx = brick.x * STUD + x_size / 2.0
    ty = brick.y * STUD + y_size / 2.0
    tz = brick.z * BRICK_HEIGHT + BRICK_HEIGHT / 2.0

    brick_mesh.apply_translation([tx, ty, tz])
    return brick_mesh


def build_lego_model(bricks: list[LegoBrick]) -> trimesh.Trimesh:
    if not bricks:
        raise ValueError("No bricks were provided.")

    meshes = [create_brick_mesh(brick) for brick in bricks]
    return trimesh.util.concatenate(meshes)


def save_model(bricks: list[LegoBrick], output_path: str = "lego_model.glb") -> str:
    model = build_lego_model(bricks)
    model.export(output_path)
    return output_path


def preview_model(bricks: list[LegoBrick]) -> None:
    """
    Open a preview window if pyglet is installed and supported.
    """
    model = build_lego_model(bricks)
    model.show()


if __name__ == "__main__":
    bricks = []

    # Red 2x4
    b1 = LegoBrick(2, 4, "#C91A09", False)
    b1.set_location(0, 0, 0)
    bricks.append(b1)

    # Blue 2x4 rotated
    b2 = LegoBrick(2, 4, "#0055BF", True)
    b2.set_location(4, 0, 0)
    bricks.append(b2)

    # Clear 1x2 on top
    b3 = LegoBrick(1, 2, "clear", False)
    b3.set_location(1, 1, 1)
    bricks.append(b3)

    # Yellow 2x2
    b4 = LegoBrick(2, 2, "#F2CD37", False)
    b4.set_location(6, 2, 0)
    bricks.append(b4)

    # Export one combined model
    out_file = save_model(bricks, "../../public/models/lego_model.glb")
    print(f"Saved model to: {out_file}")

    # Optional preview
    # preview_model(bricks)