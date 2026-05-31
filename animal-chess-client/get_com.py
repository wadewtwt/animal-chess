from PIL import Image
import sys

def get_com(filename):
    img = Image.open(filename).convert("RGBA")
    w, h = img.size
    
    sum_x = 0
    sum_y = 0
    total_alpha = 0
    
    # getdata() returns a flat sequence of pixels
    pixels = img.getdata()
    
    for i, p in enumerate(pixels):
        a = p[3]
        if a > 0:
            x = i % w
            y = i // w
            sum_x += x * a
            sum_y += y * a
            total_alpha += a
            
    if total_alpha == 0:
        return 0, 0
        
    com_x = sum_x / total_alpha
    com_y = sum_y / total_alpha
    
    img_center_x = w / 2.0
    img_center_y = h / 2.0
    
    # Cocos Y is up, PIL Y is down
    offset_y = img_center_y - com_y
    offset_x = img_center_x - com_x
    
    return offset_x, offset_y

files = [
    "assets/resources/animal_pieces/cat-blue.png",
    "assets/resources/animal_pieces/lion-red.png",
    "assets/resources/animal_pieces/elephant-blue.png"
]

for f in files:
    dx, dy = get_com(f)
    print(f"{f}: COM Offset X = {dx:.2f}, COM Offset Y (Cocos) = {dy:.2f}")

