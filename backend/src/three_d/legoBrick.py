class LegoBrick:
    def __init__(self, x, y, z, width, length, color, rotated):
        self.x = x
        self.y = y
        self.z = z
        self.width = width
        self.length = length
        self.color = color
        self.rotated = rotated
        #inclusive of reference location
        self.offsetLocationsList = []
        if rotated:
            for i in range(width):
                for j in range(length):
                    self.offsetLocationsList.append([i,j])
        else :
            for i in range(length):
                for j in range(width):
                    self.offsetLocationsList.append([j,i])
    def __init__(self, width, length, color, rotated):
        self.width = width
        self.length = length
        self.color = color
        self.rotated = rotated
        self.x = 0
        self.y = 0
        self.z = 0
        self.offsetLocationsList = []
        if self.rotated:
            for i in range(width):
                for j in range(length):
                    self.offsetLocationsList.append([i,j])
        else :
            for i in range(length):
                for j in range(width):
                    self.offsetLocationsList.append([j,i])
    def set_location(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z
    def set_color(self, color):
        self.color = color
    def set_rotated(self, rotated):
        self.rotated = rotated
        self.offsetLocationsList = []
        if self.rotated:
            for i in range(self.width):
                for j in range(self.length):
                    self.offsetLocationsList.append([i,j])
        else :
            for i in range(self.length):
                for j in range(self.width):
                    self.offsetLocationsList.append([j,i])

    def __str__(self):
        return "Color: " + str(self.color) + ", width: " + str(self.width) + ", length: " + str(self.length) + ", x: " + str(self.x) + ", y: " + str(self.y) + ", z: " + str(self.z)