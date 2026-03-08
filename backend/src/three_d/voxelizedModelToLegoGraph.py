import numpy as np
import open3d as o3d
import random
import legoBrick
import networkx as nx

pieceSizesList = [[4,2],[3,2],[2,2],[4,1],[2,1],[1,1]]



def get_3d_color_matrix_from_voxel_grid(voxel_grid):
    bounds = voxel_grid.get_max_bound()
    matrix = np.full(bounds, "empty", dtype=str)
    for i in range(bounds.shape[0]):
        for j in range(bounds.shape[1]):
            for k in range(bounds.shape[2]):
                matrix[i, j, k] = voxel_grid.get_voxel(i, j, k).color

    return matrix

def generatePieceListFromColorMatrix(matrix):
    output_list = []
    for i in range(matrix.shape[0]):
        list_to_add = generateLayerPieceList(matrix, i)
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
                output_list.append(legoBrick.LegoBrick(i,j,layerZIndex,pieceSize[0],pieceSize[1], layer[i][j], isRotated))
    return output_list

def findBiggestPiece(layer, filledInMatrix, x,y, color):
    for pieceType in pieceSizesList:
        checkRotatedFirst = random.choice([True, False])
        pieceToCheck = legoBrick.LegoBrick(pieceType[0],pieceType[1],color, checkRotatedFirst)
        offset_list = pieceToCheck.offsetLocationsList
        isValid = True
        for item in offset_list:
            if filledInMatrix[item[0] + x][item[1] + y] == True or layer[item[0 + x]][item[1 + x]] != color:
                isValid = False
        if isValid:
            return pieceType, checkRotatedFirst

        pieceToCheck = legoBrick.LegoBrick(pieceType[0], pieceType[1], color, not checkRotatedFirst)
        offset_list = pieceToCheck.offsetLocationsList
        isValid = True
        for item in offset_list:
            if filledInMatrix[item[0] + x][item[1] + y] == True or layer[item[0 + x]][item[1 + x]] != color:
                isValid = False
        if isValid:
            return pieceType, not checkRotatedFirst

    print("Something went wrong checking piece:" + str(x) + "," + str(y)+ "---  no pieces were valid")
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
