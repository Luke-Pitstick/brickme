import numpy as np
import open3d as o3d
import random
import legoBrick
import networkx as nx
from convertPointCloudtoVoxel import convert_pointcloud_to_voxel
from glbToPointCloud import glb_to_point_cloud
import tkinter as tk
from tkinter import filedialog
from voxel_grid_filler import fill_hollow_voxel_grid_nearest_color

pieceSizesList = [[4,2],[3,2],[2,2],[4,1],[2,1],[1,1]]

lego_colors = {
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
"Yellow": "#F2CD37"
}



def hex_to_rgb(hex_color):
    """Convert hex to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return np.array([int(hex_color[i:i+2], 16) for i in (0, 2, 4)])
lego_rgb = {name: hex_to_rgb(hex_code) for name, hex_code in lego_colors.items()}

def get_file_path():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(filetypes=[("GLB files", "*.glb")])
    return file_path


def rgb_to_closest_lego_hex(rgb):
    """
    rgb: Open3D color (float values 0-1)
    returns closest LEGO hex code
    """
    rgb = np.array(rgb) * 255

    best_hex = None
    best_dist = float('inf')

    for name, color_rgb in lego_rgb.items():
        dist = np.linalg.norm(rgb - color_rgb)
        if dist < best_dist:
            best_dist = dist
            best_hex = lego_colors[name]

    return best_hex

def voxel_grid_to_hex_matrix(voxel_grid):
    voxels = voxel_grid.get_voxels()

    if len(voxels) == 0:
        return np.empty((0,0,0), dtype=object)

    # Collect voxel indices
    indices = np.array([v.grid_index for v in voxels])

    # Determine bounding box
    min_idx = indices.min(axis=0)
    max_idx = indices.max(axis=0)

    shape = max_idx - min_idx + 1

    # Create 3D matrix filled with "empty"
    matrix = np.full(shape, "empty", dtype=object)

    # Fill with voxel hex colors
    for v in voxels:
        idx = np.array(v.grid_index) - min_idx
        hex_color = rgb_to_closest_lego_hex(v.color)
        matrix[tuple(idx)] = hex_color

    return matrix

def generatePieceListFromColorMatrix(matrix):
    output_list = []
    for i in range(matrix.shape[0]):
        list_to_add = generateLayerPieceList(matrix[i], i)
        for item in list_to_add:
            output_list.append(item)
    return output_list


def generateLayerPieceList(layer, layerZIndex) :
    output_list = []
    to_fill_in_matrix = np.full(layer.shape, True, dtype=bool)
    for i in range(layer.shape[0]):
        for j in range(layer.shape[1]):
            if to_fill_in_matrix[i, j] and layer[i][j] != "empty":
                pieceSize, isRotated = findBiggestPiece(layer, to_fill_in_matrix, i, j, layer[i][j])
                pieceToAdd = legoBrick.LegoBrick(pieceSize[0],pieceSize[1], layer[i][j], isRotated)
                pieceToAdd.set_location(i,j,layerZIndex)

                #SET FILLED IN PLACES IN THE GRID TO NOT DOUBLE COUNT
                for offset in pieceToAdd.offsetLocationsList:
                    to_fill_in_matrix[offset[0]+i][offset[1]+j] = False
                output_list.append(pieceToAdd)
    return output_list

def findBiggestPiece(layer, filledInMatrix, x,y, color):
    for pieceType in pieceSizesList:
        checkRotatedFirst = random.choice([True, False])
        pieceToCheck = legoBrick.LegoBrick(pieceType[0],pieceType[1],color, checkRotatedFirst)
        offset_list = pieceToCheck.offsetLocationsList
        isValid = True
        for item in offset_list:
            if (filledInMatrix.shape[0] <= item[0] + x) or (filledInMatrix.shape[1] <= item[1] + y):
                isValid = False
            elif (filledInMatrix[item[0] + x][item[1] + y] == False) or layer[item[0]+x][item[1]+y] != color:
                isValid = False
        if isValid:
            return pieceType, checkRotatedFirst

        pieceToCheck = legoBrick.LegoBrick(pieceType[0], pieceType[1], color, not checkRotatedFirst)
        offset_list = pieceToCheck.offsetLocationsList
        isValid = True
        for item in offset_list:
            if (filledInMatrix.shape[0] <= item[0] + x) or (filledInMatrix.shape[1] <= item[1] + y):
                isValid = False
            elif (filledInMatrix[item[0] + x][item[1] + y] == False) or layer[item[0]+x][item[1]+y] != color:
                isValid = False
        if isValid:
            return pieceType, not checkRotatedFirst

    print("Something went wrong checking piece:" + str(x) + "," + str(y)+ "  ---  no pieces were valid")
    return [0,0], False

def generateBrickGraphFromPieceList(pieceList):
    graph = nx.DiGraph()

    #ADD EVERY LOCATION OF A PIECE AS A NODE, ADD EDGES BETWEEN INNER NODES OF A PIECE WITH VERY LARGE CAPACITY
    for piece in pieceList:
        x = piece.x
        y = piece.y
        z = piece.z

        for offset in piece.offsetLocationsList:
            graph.add_node((x+ offset[0], y+ offset[1], z))

        for mainOffset in piece.offsetLocationsList:
            for otherOffset in piece.offsetLocationsList:
                if mainOffset != otherOffset:
                    graph.add_edge((x+mainOffset[0],y+mainOffset[1],z), (x+otherOffset[0],y+otherOffset[1],z), capacity=100000)

    # "Baseplate Node"
    graph.add_node((-1,-1,-1))

    for piece in pieceList:
        x = piece.x
        y = piece.y
        z = piece.z

        for offset in piece.offsetLocationsList:
            if (x+offset[0], y+offset[1], z + 1) in graph:
                graph.add_edge((x+offset[0], y+offset[1], z), (x+offset[0], y+offset[1], z + 1), capacity=1)

            if (x+offset[0], y+offset[1], z - 1) in graph:
                graph.add_edge((x+offset[0], y+offset[1], z), (x+offset[0], y+offset[1], z - 1), capacity=1)

            if z == 0 :
                graph.add_edge((x + offset[0], y + offset[1], z), (-1, -1, -1), capacity=1)
                graph.add_edge((-1, -1, -1), (x + offset[0], y + offset[1], z), capacity=1)

    return graph

def is_set_valid(setGraph, requiredAvgConnectionCount):
    flow_value_sum = 0
    for node in setGraph.nodes:
        if node != (-1,-1,-1):
            flow_value, flow_dict = nx.maximum_flow(setGraph, (-1,-1,-1), node)
            if flow_value < 1:
                return False
            flow_value_sum += flow_value
    return requiredAvgConnectionCount < (flow_value_sum/(len(setGraph.nodes)-1))

if __name__ == "__main__":
    file_path = get_file_path()
    test_cloud = glb_to_point_cloud(file_path)
    test_voxel = convert_pointcloud_to_voxel(test_cloud)
    test_voxel_filled = fill_hollow_voxel_grid_nearest_color(test_voxel)


    test3dMatrix = voxel_grid_to_hex_matrix(test_voxel_filled)

    test_list = generatePieceListFromColorMatrix(test3dMatrix)
    print(len(test_list))
    for brick in test_list:
        print(brick)
    print(generateBrickGraphFromPieceList(test_list))
    print(is_set_valid(generateBrickGraphFromPieceList(test_list,),0))



