"""Génère l'icône et l'écran de démarrage Android et iPhone de Botaenica (py -3.11 scripts/make_icons.py)."""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
NIGHT = (16, 22, 58)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def art(size=1024):
    """Crépuscule, lune, sable ratissé et cerisier : l'identité du jeu en un carré."""
    s = size
    img = Image.new('RGB', (s, s))
    d = ImageDraw.Draw(img)
    for y in range(s):
        t = y / s
        c = lerp((14, 20, 60), (70, 52, 112), t / 0.6) if t < 0.6 else lerp((70, 52, 112), (240, 140, 120), (t - 0.6) / 0.4)
        d.line([(0, y), (s, y)], fill=c)
    glow = Image.new('L', (s, s), 0)
    ImageDraw.Draw(glow).ellipse([s * 0.52, s * 0.14, s * 0.84, s * 0.46], fill=170)
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.06))
    img.paste((255, 236, 215), (0, 0), glow)
    d.ellipse([s * 0.58, s * 0.2, s * 0.78, s * 0.4], fill=(252, 243, 228))
    # sable ratissé
    sand_top = s * 0.66
    sand = Image.new('RGB', (s, s), (233, 222, 199))
    sd = ImageDraw.Draw(sand)
    for k in range(1, 9):
        r = s * 0.06 * k
        sd.arc([s * 0.3 - r * 1.6, s * 0.86 - r * 0.6, s * 0.3 + r * 1.6, s * 0.86 + r * 0.6], 0, 360, fill=(170, 145, 110), width=max(2, s // 220))
    sand_mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(sand_mask).ellipse([-s * 0.3, sand_top, s * 1.3, s * 1.5], fill=255)
    img.paste(sand, (0, 0), sand_mask)
    d.ellipse([s * 0.22, s * 0.8, s * 0.38, s * 0.88], fill=(95, 92, 90))
    # tronc et branches
    bark = (58, 40, 38)
    w = s // 34
    d.line([(s * 0.62, s * 0.8), (s * 0.6, s * 0.62), (s * 0.5, s * 0.47)], fill=bark, width=w, joint='curve')
    d.line([(s * 0.6, s * 0.62), (s * 0.74, s * 0.5)], fill=bark, width=int(w * 0.7))
    d.line([(s * 0.5, s * 0.47), (s * 0.38, s * 0.42)], fill=bark, width=int(w * 0.55))
    # fleurs de cerisier
    rnd = random.Random(4)
    pinks = [(249, 211, 223), (244, 179, 200), (253, 232, 239), (234, 148, 178)]
    blobs = [(0.48, 0.42, 0.12), (0.36, 0.4, 0.09), (0.62, 0.38, 0.11), (0.75, 0.46, 0.09), (0.55, 0.32, 0.09)]
    for cx, cy, r in blobs:
        for _ in range(40):
            a = rnd.random() * math.tau
            dd = math.sqrt(rnd.random()) * r * s
            px, py = cx * s + math.cos(a) * dd, cy * s + math.sin(a) * dd * 0.75
            rr = s * (0.02 + rnd.random() * 0.025)
            d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=rnd.choice(pinks))
    for _ in range(16):
        px, py = rnd.random() * s, s * (0.5 + rnd.random() * 0.35)
        rr = s * 0.008
        d.ellipse([px - rr * 1.4, py - rr, px + rr * 1.4, py + rr], fill=(250, 200, 215))
    return img


def masked(img, shape):
    s = img.size[0]
    mask = Image.new('L', (s, s), 0)
    md = ImageDraw.Draw(mask)
    if shape == 'circle':
        md.ellipse([0, 0, s - 1, s - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=255)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def splash(w, h, base):
    img = Image.new('RGB', (w, h), NIGHT)
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp((10, 14, 40), (34, 30, 78), y / h))
    m = min(w, h)
    icon = masked(base.resize((int(m * 0.34), int(m * 0.34)), Image.LANCZOS), 'circle')
    img.paste(icon, ((w - icon.size[0]) // 2, int(h * 0.5 - icon.size[1] * 0.75)), icon)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', int(m * 0.085))
    except OSError:
        font = ImageFont.load_default()
    text = 'Botaenica'
    tw = d.textlength(text, font=font)
    d.text(((w - tw) / 2, h * 0.5 + m * 0.1), text, font=font, fill=(251, 247, 238))
    return img


def main():
    base = art()
    docs = ROOT / 'docs'
    docs.mkdir(exist_ok=True)
    base.resize((512, 512), Image.LANCZOS).save(docs / 'icone-512.png')
    legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for dens, px in legacy.items():
        folder = RES / f'mipmap-{dens}'
        masked(base.resize((px, px), Image.LANCZOS), 'rounded').save(folder / 'ic_launcher.png')
        masked(base.resize((px, px), Image.LANCZOS), 'circle').save(folder / 'ic_launcher_round.png')
        fg = int(px * 108 / 48)
        base.resize((fg, fg), Image.LANCZOS).save(folder / 'ic_launcher_foreground.png')
    for p in RES.glob('drawable*/splash.png'):
        w, h = Image.open(p).size
        splash(w, h, base).save(p)
    # iPhone : une icône 1024 px sans transparence (exigence d'Apple) et l'écran de démarrage carré 2732 px
    ios = ROOT / 'ios' / 'App' / 'App' / 'Assets.xcassets'
    if ios.exists():
        base.convert('RGB').save(ios / 'AppIcon.appiconset' / 'AppIcon-512@2x.png')
        sp = splash(2732, 2732, base)
        for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
            sp.save(ios / 'Splash.imageset' / name)
    print('icônes et écrans de démarrage générés')


if __name__ == '__main__':
    main()
