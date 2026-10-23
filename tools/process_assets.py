"""Convert source PNG/JPG art into mobile-friendly WebP under public/assets.
- crops transparent padding, erodes alpha edge ~1px and decontaminates light fringe
- run: python3 tools/process_assets.py
"""
import os
from PIL import Image, ImageFilter, ImageChops

SRC = '/workspace/anime-english/characters'
BG = {
  'map': '737d1d49bef4c7c65567246d6eaa8157da0da7419574a4aefbfbd657df720e69.jpg',
  'forge': 'e4e973fb14231d4a5060a8e0fe7bdda27a4c19ef518715f2e26d8a0ccaf210cc.jpg',
  'forest': '04960dee0fcb34f427f051957e8a6afa41c9aa3e707f37de28a2e4e0481b5946.jpg',
  'teahouse': 'b22fd434ac512e089e3711302266ee5da585cb55f344fe3b9600818ea6652a94.jpg',
  'river': '992cbfbb45163901f0272730024b6ed29930819a68c66564a83152b45f50df68.jpg',  # Task 2 溪边 (generated, original)
}
BGDIR = os.environ.get('BGDIR', '/workspace/anime-english/art')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
os.makedirs(OUT + '/chars', exist_ok=True); os.makedirs(OUT + '/bg', exist_ok=True)

def defringe(im):
    im = im.convert('RGBA')
    r, g, b, a = im.split()
    # 1px erosion of alpha removes most of the halo, then soften slightly
    a2 = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    a2 = ImageChops.darker(a2, a)
    # decontaminate: on semi-transparent edge pixels, darken very light colors (white matte leftovers)
    px = im.load(); ap = a2.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            al = ap[x, y]
            if 0 < al < 250:
                R, G, B, _ = px[x, y]
                lum = (R + G + B) / 3
                if lum > 170:
                    k = 0.55
                    px[x, y] = (int(R * k), int(G * k), int(B * k), al)
    out = Image.merge('RGBA', (*im.split()[:3], a2))
    return out

def save(im, path, w=None, h=None, q=82):
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    if h and im.height > h:
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(path, 'WEBP', quality=q, method=6)
    print(os.path.basename(path), im.size, os.path.getsize(path) // 1024, 'KB')

for c in ['kai', 'mira', 'hana', 'tomo']:
    for v, (w, h) in {'fullbody': (None, 1000), 'happy': (640, None), 'surprised': (640, None), 'confused': (640, None), 'chibi': (None, 220)}.items():
        im = Image.open(f'{SRC}/{c}_{v}.png').convert('RGBA')
        im = im.crop(im.getbbox())
        im = defringe(im)
        save(im, f'{OUT}/chars/{c}_{v}.webp', w, h)

for k, f in BG.items():
    im = Image.open(os.path.join(BGDIR, f)).convert('RGB')
    save(im, f'{OUT}/bg/{k}.webp', q=80)
