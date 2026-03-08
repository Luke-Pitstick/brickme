class LegoBrick:
    def __init__(self, width, length, color, rotated):
        self.width = width
        self.length = length
        self.color = color
        self.rotated = rotated
        self.x = 0
        self.y = 0
        self.z = 0
        self.offsetLocationsList = []
        self._rebuild_offsets()

    def _rebuild_offsets(self):
        self.offsetLocationsList = []

        if self.rotated:
            # rotated: x gets width, y gets length
            x_span = self.width
            y_span = self.length
        else:
            # not rotated: x gets length, y gets width
            x_span = self.length
            y_span = self.width

        for dx in range(x_span):
            for dy in range(y_span):
                self.offsetLocationsList.append([dx, dy])

    def set_location(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def set_color(self, color):
        self.color = color

    def set_rotated(self, rotated):
        self.rotated = rotated
        self._rebuild_offsets()

    def __str__(self):
        return (
            f"Color: {self.color}, width: {self.width}, length: {self.length}, "
            f"x: {self.x}, y: {self.y}, z: {self.z}, rotated: {self.rotated}"
        )