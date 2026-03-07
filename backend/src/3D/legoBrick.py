class LegoBrick:
    def __init__(self, x, y, z, width, height, color, rotated):
        self.x = x
        self.y = y
        self.z = z
        self.width = width
        self.height = height
        self.color = color
        self.rotated = rotated
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.color = "NONE"
        self.rotated = False
        self.x = 0
        self.y = 0
        self.z = 0
    def set_location(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z
    def set_color(self, color):
        self.color = color
    def set_rotated(self, rotated):
        self.rotated = rotated