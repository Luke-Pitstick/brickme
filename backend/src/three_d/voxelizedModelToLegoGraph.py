import legoBrick
import networkx as nx
from convertPointCloudtoVoxel import convert_pointcloud_to_voxel
from glbToPointCloud import glb_to_point_cloud
import tkinter as tk
from tkinter import filedialog
import numpy as np
from scipy.ndimage import binary_fill_holes
from scipy.spatial import cKDTree
from legoRenderer import save_model

# ---------------------------
# Constants / shared setup
# ---------------------------
BASE_NODE = (-1, -1, -1)
INTERNAL_CAPACITY = 1_000_000
PIECE_SIZES = [(4, 2), (3, 2), (2, 2), (4, 1), (2, 1), (1, 1)]

# ---------------------------
# LEGO color palette
# ---------------------------
LEGO_COLORS = {
    "Black": "#1B2A34",
    "Blue": "#0055BF",
    "Bright Green": "#4B9F4A",
    "Bright Light Blue": "#9FC3E9",
    "Bright Pink": "#FF9ECD",
    "Brown": "#6B3F22",
    "Dark Blue": "#0A3463",
    "Dark Bluish Gray": "#6D6E5C",
    "Dark Gray": "#6D6E6C",
    "Dark Orange": "#A95500",
    "Dark Pink": "#C870A0",
    "Dark Purple": "#3F2A56",
    "Dark Red": "#720E0F",
    "Green": "#237841",
    "Light Bluish Gray": "#A0A5A9",
    "Light Gray": "#9BA19D",
    "Lime": "#BBE90B",
    "Magenta": "#923978",
    "Medium Blue": "#5A93DB",
    "Olive Green": "#9B9A5A",
    "Orange": "#FE8A18",
    "Red": "#C91A09",
    "Reddish Brown": "#582A12",
    "Sand Blue": "#6074A1",
    "Sand Green": "#A0BCAC",
    "Tan": "#E4CD9E",
    "White": "#FFFFFF",
    "Yellow": "#F2CD37",
}


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return np.array([int(hex_color[i:i+2], 16) for i in (0, 2, 4)], dtype=float)


PALETTE_HEXES = list(LEGO_COLORS.values())
PALETTE_RGBS = np.array([hex_to_rgb(h) for h in PALETTE_HEXES], dtype=float)
_rgb_hex_cache = {}


def rgb_to_closest_hex(rgb):
    """
    rgb is expected to be Open3D-style [0,1] floats.
    Returns closest palette hex string.
    """
    key = tuple(np.round(np.asarray(rgb, dtype=float), 6))
    if key in _rgb_hex_cache:
        return _rgb_hex_cache[key]

    rgb255 = np.asarray(rgb, dtype=float) * 255.0
    dists = np.linalg.norm(PALETTE_RGBS - rgb255, axis=1)
    result = PALETTE_HEXES[int(np.argmin(dists))]
    _rgb_hex_cache[key] = result
    return result


def get_file_path():
    root = tk.Tk()
    root.withdraw()
    try:
        return filedialog.askopenfilename(filetypes=[("GLB files", "*.glb")])
    finally:
        root.destroy()


def build_filled_status_matrix(voxel_grid):
    voxels = voxel_grid.get_voxels()
    if not voxels:
        return np.empty((0, 0, 0), dtype=object)

    indices = np.array([v.grid_index for v in voxels], dtype=int)
    colors = np.array([v.color for v in voxels], dtype=float)

    min_idx = indices.min(axis=0)
    max_idx = indices.max(axis=0)
    shape_xyz = max_idx - min_idx + 1

    # matrix access stays matrix[z][x][y]
    shape_zxy = (shape_xyz[2], shape_xyz[0], shape_xyz[1])

    local_indices = indices - min_idx
    occ = np.zeros(shape_xyz, dtype=bool)
    occ[local_indices[:, 0], local_indices[:, 1], local_indices[:, 2]] = True

    filled_occ = binary_fill_holes(occ)
    matrix = np.full(shape_zxy, "empty", dtype=object)

    original_index_map = {tuple(idx): color for idx, color in zip(indices, colors)}
    original_index_set = set(original_index_map.keys())
    tree = cKDTree(indices)

    for local in np.argwhere(filled_occ):
        global_idx = tuple(local + min_idx)
        zxy_idx = (local[2], local[0], local[1])

        if global_idx in original_index_set:
            matrix[zxy_idx] = ("original", rgb_to_closest_hex(original_index_map[global_idx]))
        else:
            _, nn = tree.query(np.array(global_idx))
            matrix[zxy_idx] = ("filled", rgb_to_closest_hex(colors[nn]))

    return matrix


# Precompute piece offsets once
PIECE_OFFSETS = {}
for size in PIECE_SIZES:
    for rotated in (False, True):
        brick = legoBrick.LegoBrick(size[0], size[1], "dummy", rotated)
        PIECE_OFFSETS[(size, rotated)] = tuple(brick.offsetLocationsList)


def generatePieceListFromColorMatrix(matrix):
    output_list = []
    for z in range(matrix.shape[0]):
        output_list.extend(generateLayerPieceList(matrix[z], z))
    return output_list


def generateLayerPieceList(layer, layerZIndex):
    output_list = []
    to_fill = np.ones(layer.shape, dtype=bool)

    for i in range(layer.shape[0]):
        for j in range(layer.shape[1]):
            cell = layer[i][j]
            if to_fill[i, j] and cell != "empty":
                color = cell[1]
                piece_size, is_rotated = findBiggestPiece(layer, to_fill, i, j, color, layerZIndex)
                piece = legoBrick.LegoBrick(piece_size[0], piece_size[1], color, is_rotated)
                piece.set_location(i, j, layerZIndex)

                for dx, dy in piece.offsetLocationsList:
                    to_fill[i + dx, j + dy] = False

                output_list.append(piece)

    return output_list


def _piece_fits(layer, filled_mask, x, y, color, offsets):
    max_x, max_y = filled_mask.shape

    for dx, dy in offsets:
        nx_, ny_ = x + dx, y + dy

        if nx_ >= max_x or ny_ >= max_y:
            return False
        if not filled_mask[nx_, ny_]:
            return False

        cell = layer[nx_][ny_]
        if cell == "empty":
            return False
        if cell[1] != color:
            return False

    return True


def findBiggestPiece(layer, filledInMatrix, x, y, color, zIndex):
    check_rotated_first = (zIndex % 2 == 1)

    for piece_type in PIECE_SIZES:
        offsets = PIECE_OFFSETS[(piece_type, check_rotated_first)]
        if _piece_fits(layer, filledInMatrix, x, y, color, offsets):
            return piece_type, check_rotated_first

        offsets = PIECE_OFFSETS[(piece_type, not check_rotated_first)]
        if _piece_fits(layer, filledInMatrix, x, y, color, offsets):
            return piece_type, not check_rotated_first

    print(f"Something went wrong checking piece: {x},{y} --- no pieces were valid")
    return (1, 1), False


def generateBrickGraphFromPieceList(pieceList):
    graph = nx.DiGraph()
    graph.add_node(BASE_NODE)

    all_positions = set()

    # Add all nodes and strong internal piece edges
    for piece in pieceList:
        positions = [(piece.x + dx, piece.y + dy, piece.z) for dx, dy in piece.offsetLocationsList]
        all_positions.update(positions)

        for pos in positions:
            graph.add_node(pos)

        for a in positions:
            for b in positions:
                if a != b:
                    graph.add_edge(a, b, capacity=INTERNAL_CAPACITY)

    # Add vertical/baseplate connections
    for x, y, z in all_positions:
        above = (x, y, z + 1)
        below = (x, y, z - 1)

        if above in all_positions:
            graph.add_edge((x, y, z), above, capacity=1)
        if below in all_positions:
            graph.add_edge((x, y, z), below, capacity=1)

        if z == 0:
            graph.add_edge((x, y, z), BASE_NODE, capacity=1)
            graph.add_edge(BASE_NODE, (x, y, z), capacity=1)

    return graph


def is_set_valid(setGraph, requiredAvgConnectionCount):
    """
    Fast replacement for repeated maximum_flow() checks.

    Old meaning:
        For every node, verify max_flow(BASE_NODE, node) >= 1

    Practical equivalent here:
        Every node must simply be reachable from BASE_NODE.
    """
    if BASE_NODE not in setGraph:
        return False, None

    reachable = nx.descendants(setGraph, BASE_NODE) | {BASE_NODE}

    for node in setGraph.nodes:
        if node != BASE_NODE and node not in reachable:
            print(f"{node} is disconnected")
            return False, node

    return True, None


def generate_until_valid(colorMatrix):
    attemptCount = 0

    while attemptCount < 100000:
        attemptCount += 1
        pieceList = generatePieceListFromColorMatrix(colorMatrix)
        graph = generateBrickGraphFromPieceList(pieceList)
        foundValid, invalidLocation = is_set_valid(graph, 0)

        if foundValid:
            return pieceList

        for i in range(invalidLocation[2]):
            print(f"Adding Pillar at :: {invalidLocation[0]},{invalidLocation[1]},{i}")
            colorMatrix[i][invalidLocation[0]][invalidLocation[1]] = ("original", "clear")

    return None


if __name__ == "__main__":
    file_path = get_file_path()
    test_cloud = glb_to_point_cloud(file_path)
    test_voxel = convert_pointcloud_to_voxel(test_cloud, voxel_size=0.1)
    test3dMatrix = build_filled_status_matrix(test_voxel)

    print(test3dMatrix)

    test_list = generate_until_valid(test3dMatrix)
    print(len(test_list))
    print(generateBrickGraphFromPieceList(test_list))
    out_file = save_model(test_list, "../../public/models/lego_model.glb")