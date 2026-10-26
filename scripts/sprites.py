"""Détoure les images générées (fond bleu ou magenta) et produit les sprites et textures du jeu.

py -3.11 scripts/sprites.py planches        -> art/planches/*.png (variantes côte à côte sur sable)
py -3.11 scripts/sprites.py export          -> public/sprites/*.webp selon art/choix.txt
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
import os
RAW = Path(os.environ['RAW_DIR']) if os.environ.get('RAW_DIR') else ROOT / 'art' / 'raw'
SAND = (231, 220, 196)


def key(path, bg='bleu', max_side=None):
    """Fond uni (bleu, jaune ou magenta) -> transparence douce, puis suppression du reflet coloré sur les bords."""
    src = Image.open(path).convert('RGB')
    if max_side:
        src.thumbnail((max_side, max_side), Image.LANCZOS)
    a = np.asarray(src).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if bg == 'magenta':
        tint = np.minimum(r, b) - g
        lo, hi = 20, 70
    elif bg == 'jaune':
        tint = np.minimum(r, g) - b
        lo, hi = 40, 110
    else:
        tint = b - np.maximum(r, g)
        lo, hi = 22, 58
    alpha = np.clip(1 - (tint - lo) / (hi - lo), 0, 1)
    if bg == 'bleu':
        # pierre et écorce grises peuvent tirer légèrement vers le bleu : on protège les tons sombres peu saturés
        sat = (np.max(a, axis=2) - np.min(a, axis=2)) / (np.max(a, axis=2) + 1)
        alpha = np.where((sat < 0.28) & (b < 150), 1.0, alpha)
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    alpha = np.asarray(alpha_img).astype(np.float32) / 255
    if bg == 'magenta':
        # aucun sujet du décor n'est rose : le rouge ne dépasse jamais le vert ; le bleu n'est bridé que sur les bords
        r = np.minimum(r, g + 12)
        b = np.where(alpha < 0.98, np.minimum(b, g + 12), b)
    elif bg == 'jaune':
        excess = np.where(alpha < 0.98, np.clip(np.minimum(r, g) - b - 12, 0, None), 0)
        r, g = r - excess, g - excess
    else:
        b = np.minimum(b, np.maximum(r, g) + 6)
    out = np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def nettoie(img, small=128, keep=0.04):
    """Efface les petites taches isolées (restes du fond) en ne gardant que les grandes zones opaques."""
    alpha = img.getchannel('A')
    m = alpha.copy()
    m.thumbnail((small, small))
    a = np.asarray(m) > 40
    h, w = a.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    boxes = [None]
    for y0 in range(h):
        for x0 in range(w):
            if a[y0, x0] and not lab[y0, x0]:
                n = len(sizes)
                stack = [(y0, x0)]
                lab[y0, x0] = n
                count = 0
                bx = [w, h, 0, 0]
                while stack:
                    y, x = stack.pop()
                    count += 1
                    bx = [min(bx[0], x), min(bx[1], y), max(bx[2], x), max(bx[3], y)]
                    for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1), (y + 1, x + 1), (y - 1, x - 1), (y + 1, x - 1), (y - 1, x + 1)):
                        if 0 <= yy < h and 0 <= xx < w and a[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n
                            stack.append((yy, xx))
                sizes.append(count)
                boxes.append(bx)
    if len(sizes) <= 2:
        return img
    biggest = max(sizes)
    def in_margin(bx):
        # tache coincée dans une marge du bord (gauche, droite ou haut) : un reste du fond, pas la plante
        return bx[2] < w * 0.22 or bx[0] > w * 0.78 or bx[3] < h * 0.2
    ok = np.array([s >= biggest * keep and not (bx and in_margin(bx) and s < biggest * 0.25) for s, bx in zip(sizes, boxes)])
    ok[0] = False
    mask = Image.fromarray((ok[lab] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).resize(img.size, Image.BILINEAR)
    out = img.copy()
    out.putalpha(Image.fromarray(np.minimum(np.asarray(alpha), np.asarray(mask)).astype(np.uint8)))
    bbox = out.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def sable(path, size=512):
    """Garde le grain et les petits cailloux, retire les ondulations (passe-haut), puis rend le motif raccordable."""
    img = Image.open(path).convert('RGB').resize((size, size), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32)
    low = np.asarray(img.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    base = np.array([231, 220, 196], np.float32)
    out = (a - low) * 1.6 + base
    tile = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    full = Image.new('RGB', (size * 2, size * 2))
    full.paste(tile, (0, 0))
    full.paste(tile.transpose(Image.FLIP_LEFT_RIGHT), (size, 0))
    full.paste(tile.transpose(Image.FLIP_TOP_BOTTOM), (0, size))
    full.paste(tile.transpose(Image.ROTATE_180), (size, size))
    return full


def on(img, bg, size=300):
    tile = Image.new('RGB', (size, size), bg)
    im = img.copy()
    im.thumbnail((size - 20, size - 20))
    tile.paste(im, ((size - im.width) // 2, size - im.height - 6), im)
    return tile


def planches():
    out = ROOT / 'art' / 'planches'
    out.mkdir(exist_ok=True)
    groups = {}
    for p in sorted(RAW.glob('*.png')):
        groups.setdefault(p.stem.rsplit('_', 1)[0], []).append(p)
    for name, files in groups.items():
        sheet = Image.new('RGB', (300 * len(files), 620), (40, 40, 50))
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            k = key(f)
            sheet.paste(on(k, SAND), (i * 300, 0))
            sheet.paste(on(k, (20, 26, 60)), (i * 300, 300))
            d.text((i * 300 + 6, 604), f.stem, fill=(255, 255, 255))
        sheet.save(out / f'{name}.png')
    print(len(groups), 'planches')


def export():
    dest = ROOT / 'public' / 'sprites'
    dest.mkdir(parents=True, exist_ok=True)
    for line in (ROOT / 'art' / 'choix.txt').read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        sprite, src, height, *opt = line.split()
        if opt and opt[0] == 'brut':
            img = Image.open(RAW / f'{src}.png').convert('RGB')
            img = img.resize((round(img.width * int(height) / img.height), int(height)), Image.LANCZOS)
            img.save(dest / f'{sprite}.webp', 'WEBP', quality=82, method=6)
            print(sprite, img.size)
            continue
        if opt and opt[0] == 'sable':
            img = sable(RAW / f'{src}.png')
            img.save(dest / f'{sprite}.webp', 'WEBP', quality=86, method=6)
            print(sprite, img.size)
            continue
        img = key(RAW / f'{src}.png', opt[0] if opt else 'bleu')
        h = int(height)
        img = img.resize((max(1, round(img.width * h / img.height)), h), Image.LANCZOS)
        img.save(dest / f'{sprite}.webp', 'WEBP', quality=88, method=6)
        print(sprite, img.size)


def score(img):
    """Plus le score est bas, plus le détourage est propre (bords vides, peu de flou, sujet bien présent)."""
    a = np.asarray(img.getchannel('A')).astype(np.float32) / 255
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).mean()
    semi = ((a > 0.1) & (a < 0.9)).mean()
    cover = (a > 0.5).mean()
    return border * 2 + semi * 4 + (0 if 0.12 < cover < 0.85 else 1)


def especes():
    """Pour chaque espèce, détoure les variantes, garde la plus propre, exporte c_<id>.webp et des planches."""
    import csv
    dest = ROOT / 'public' / 'sprites'
    rows = [l.split('|') for l in (ROOT / 'art' / 'especes.tsv').read_text(encoding='utf-8').splitlines() if l]
    force = {}
    fp = ROOT / 'art' / 'especes_choix.txt'
    if fp.exists():
        for line in fp.read_text(encoding='utf-8').splitlines():
            if line.strip() and not line.startswith('#'):
                k, v = line.split()
                force[k] = v
    chosen = []
    only = set(sys.argv[2:])
    for sid, cat, bg, *_ in rows:
        if only and sid not in only:
            continue
        files = sorted(f for f in RAW.glob(f'c_{sid}_*.png') if f.stem.rsplit('_', 1)[0] == f'c_{sid}')
        if not files:
            continue
        mode = 'jaune' if bg == 'j' else 'bleu'
        cands = [(f, nettoie(key(f, mode, 560))) for f in files]
        if sid in force:
            f, img = next((c for c in cands if c[0].stem.endswith(force[sid])), cands[0])
        else:
            f, img = min(cands, key=lambda c: score(c[1]))
        h = 360
        out = img.resize((max(1, round(img.width * h / img.height)), h), Image.LANCZOS)
        out.save(dest / f'c_{sid}.webp', 'WEBP', quality=80, method=6)
        chosen.append((sid, out, f.stem))
    # planches de contrôle : 40 espèces par planche, sur sable et sur nuit
    out_dir = ROOT / 'art' / 'planches'
    for k in range(0, len(chosen) if not only else 0, 40):
        part = chosen[k:k + 40]
        cols = 8
        rows_n = (len(part) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 150, rows_n * 170), (40, 40, 50))
        d = ImageDraw.Draw(sheet)
        for i, (sid, img, stem) in enumerate(part):
            x, y = (i % cols) * 150, (i // cols) * 170
            tile = Image.new('RGB', (150, 150), SAND if (i // cols) % 2 == 0 else (20, 26, 60))
            im = img.copy()
            im.thumbnail((140, 140))
            tile.paste(im, ((150 - im.width) // 2, 146 - im.height), im)
            sheet.paste(tile, (x, y))
            d.text((x + 3, y + 152), stem.replace('c_', '')[:24], fill=(255, 255, 255))
        sheet.save(out_dir / f'_especes_{k // 40}.png')
    print(len(chosen), 'espèces exportées')


if __name__ == '__main__':
    {'planches': planches, 'export': export, 'especes': especes}[sys.argv[1]]()
