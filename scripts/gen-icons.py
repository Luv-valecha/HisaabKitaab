"""Generates PWA icons (original abstract mark: two overlapping rings = a shared bill).
Usage: python3 scripts/gen-icons.py   -> public/icons/*.png and app/icon.png
Replace these with your own artwork any time; keep filenames and sizes."""
from PIL import Image, ImageDraw

TEAL, DEEP, CREAM = (15, 118, 110), (8, 78, 74), (255, 247, 230)

def render(size, maskable=False):
    S = size * 4                                  # supersample for smooth edges
    img = Image.new("RGBA", (S, S), TEAL)
    d = ImageDraw.Draw(img)
    if not maskable:                              # rounded-square icon with transparent corners
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        bg = Image.new("RGBA", (S, S), (0, 0, 0, 0)); bg.paste(img, (0, 0), mask); img = bg; d = ImageDraw.Draw(img)
    scale = 0.60 if maskable else 0.74            # maskable keeps content inside the 80% safe zone
    r = int(S * scale * 0.30)
    cx, cy, gap = S // 2, S // 2, int(S * scale * 0.17)
    w = max(4, int(S * 0.055))
    d.ellipse([cx - gap - r, cy - r, cx - gap + r, cy + r], outline=CREAM, width=w)
    d.ellipse([cx + gap - r, cy - r, cx + gap + r, cy + r], outline=(255, 214, 120), width=w)
    # small centre lens where the rings overlap
    lens = int(r * 0.34)
    d.ellipse([cx - lens, cy - lens, cx + lens, cy + lens], fill=CREAM)
    return img.resize((size, size), Image.LANCZOS)

for name, size, mk in [("icon-192.png", 192, False), ("icon-512.png", 512, False), ("maskable-512.png", 512, True), ("apple-touch-icon.png", 180, True)]:
    render(size, mk).save(f"public/icons/{name}")
render(256).save("app/icon.png")
print("icons written")
