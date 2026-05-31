from PIL import Image
import sys

def get_offset(filename):
    img = Image.open(filename).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        return 0, 0
    
    # bbox is (left, upper, right, lower)
    # The image width and height
    w, h = img.size
    
    # Mathematical center of the image (anchor 0.5, 0.5)
    img_center_x = w / 2.0
    img_center_y = h / 2.0
    
    # Center of the bounding box of non-transparent pixels
    bbox_center_x = (bbox[0] + bbox[2]) / 2.0
    bbox_center_y = (bbox[1] + bbox[3]) / 2.0
    
    # How much we need to shift the image so the bbox center is at the image center
    # In Cocos Creator, positive Y is UP. In PIL, positive Y is DOWN.
    # If bbox_center_y > img_center_y (bbox is lower), we need to shift the image UP.
    offset_y_cocos = img_center_y - bbox_center_y
    offset_x_cocos = img_center_x - bbox_center_x
    
    return offset_x_cocos, offset_y_cocos

files = [
    "assets/resources/animal_pieces/cat-blue.png",
    "assets/resources/animal_pieces/cat-red.png",
    "assets/resources/animal_pieces/elephant-blue.png"
]

for f in files:
    dx, dy = get_offset(f)
    print(f"{f}: offset X = {dx:.2f}, offset Y (Cocos) = {dy:.2f}")

