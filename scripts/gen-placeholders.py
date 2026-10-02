"""Creates clearly-named placeholder art for the 12 hero themes under public/assets/.
The app NEVER loads *_PLACEHOLDER.png files. To use real art, add a file with the same name minus
_PLACEHOLDER (e.g. iron_man_background.png) - see docs/ASSETS_REQUIRED.md."""
import os
from PIL import Image, ImageDraw
THEMES = ["iron_man","spider_man","thor","venom","doctor_strange","captain_america","moon_knight","loki","batman","superman","flash","wonder_woman"]
def mk(path, size, color, text, circle=False):
    img = Image.new("RGBA", size, color); d = ImageDraw.Draw(img)
    if circle: d.ellipse([size[0]*.1, size[1]*.1, size[0]*.9, size[1]*.9], outline=(255,255,255,255), width=6)
    d.text((size[0]//2, size[1]//2), text, fill=(255,255,255,255), anchor="mm")
    img.save(path, optimize=True)
for t in THEMES:
    d = f"public/assets/themes/{t}"; os.makedirs(d, exist_ok=True)
    mk(f"{d}/{t}_background_PLACEHOLDER.png", (1920,1080), (60,60,70,255), f"{t} background PLACEHOLDER (1920x1080)")
    mk(f"{d}/{t}_icon_PLACEHOLDER.png", (256,256), (0,0,0,0), "ICON\nPLACEHOLDER", circle=True)
for d, name, size in [("icons","app_icon_PLACEHOLDER.png",(512,512)),("backgrounds","generic_background_PLACEHOLDER.png",(1920,1080)),("animations","animation_frame_PLACEHOLDER.png",(512,512))]:
    os.makedirs(f"public/assets/{d}", exist_ok=True); mk(f"public/assets/{d}/{name}", size, (60,60,70,255), "PLACEHOLDER")
print("placeholders written")
