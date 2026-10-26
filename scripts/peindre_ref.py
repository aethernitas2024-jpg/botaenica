"""Repeint chaque plante à partir d'une vraie photo de référence, dans un style peint lumineux (textures façon Ori).

py -3.11 scripts/peindre_ref.py refs [id ...]              -> art/refs/<id>.jpg + art/refs/credits.json (Wikipédia / Wikimedia Commons)
py -3.11 scripts/peindre_ref.py peindre [id ...] [--n 2]   -> art/raw_ori/c_<id>_<graine>.png (ou ob_<sprite> pour les plantes de base)
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / 'art' / 'refs'
OUT = ROOT / 'art' / 'raw_ori'
sys.path.insert(0, r'I:\ComfyUI_windows_portable\_claude')
import generer_image as G  # noqa: E402

AGENT = 'BotaenicaGame/1.0 (jeu de jardinage educatif, usage local)'
STYLE = ('in an ethereal luminous painterly fantasy illustration style with rich hand-painted brush textures, '
         'soft glowing light, gentle bloom and delicate rim light, smooth painted gradients, highly detailed')

# Plantes de base : sprite -> (nom latin pour la photo, description du stade)
BASE = {
    'pousse': ('Seedling cotyledons', 'a tiny seedling sprout with two small rounded seed leaves on a short pale stem'),
    'mousse_jeune': ('Polytrichum commune', 'a small sparse low patch of this moss, wide and flat'),
    'mousse_adulte': ('Polytrichum commune', 'a thick rounded cushion of this moss, wide and low'),
    'bambou_jeune': ('Phyllostachys', 'a few young bamboo shoots with papery sheaths and their first narrow leaves'),
    'bambou_adulte': ('Phyllostachys', 'a dense clump of tall bamboo culms with feathery narrow leaves at the top'),
    'lotus_jeune': ('Nelumbo nucifera', 'three round lotus leaves floating on the water surface, without any flowers'),
    'lotus_adulte': ('Nelumbo nucifera', 'one pink lotus flower in full bloom held above round lotus leaves'),
    'erable_jeune': ('Acer palmatum', 'a young sapling about one meter tall with a few red palmate leaves, without any flowers'),
    'erable_adulte': ('Acer palmatum', 'a mature tree with a wide canopy of deeply lobed red and orange leaves, without any flowers'),
    'cerisier_jeune': ('Prunus serrulata', 'a young sapling with a slender dark trunk and fresh green leaves, without any flowers'),
    'cerisier_adulte': ('Prunus serrulata', 'a mature tree in full bloom covered in pale pink five-petaled blossoms'),
    'pin_jeune': ('Pinus thunbergii', 'a young sapling with a short twisted trunk and tufts of long dark needles, without any flowers'),
    'pin_adulte': ('Pinus thunbergii', 'an ancient pine pruned in the Japanese niwaki style with cloud-shaped pads of needles, without any flowers'),
}


def get(url):
    """Requête polie envers Wikimedia : une pause entre chaque appel, et on patiente si le serveur demande de ralentir."""
    import time
    for attempt in range(2):
        time.sleep(1.2)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': AGENT}), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(10)
    raise RuntimeError('trop de refus 429')


def api(base, **params):
    params.update(format='json', formatversion='2')
    return json.loads(get(base + '?' + urllib.parse.urlencode(params)))


def clean_latin(latin):
    latin = re.sub(r"[‘’'].*?[‘’']", '', latin)
    latin = latin.replace('×', '').replace(' f. ', ' ')
    return ' '.join(latin.split()[:2]).strip()


def find_photo(latin, name_en):
    for title in [clean_latin(latin), latin.split()[0], name_en]:
        if not title:
            continue
        d = api('https://en.wikipedia.org/w/api.php', action='query', titles=title, prop='pageimages', piprop='name', redirects=1)
        pages = d['query']['pages']
        if pages and pages[0].get('pageimage'):
            return pages[0]['pageimage']
    return None


def licence_ok(lic):
    lic = (lic or '').lower()
    if 'nc' in lic.replace('-', ' ').split() or 'non-commercial' in lic or ' nd' in lic:
        return False
    return any(k in lic for k in ('public domain', 'cc0', 'cc by', 'cc-by', 'pd'))


def fetch_refs(items):
    REFS.mkdir(parents=True, exist_ok=True)
    cpath = REFS / 'credits.json'
    credits = json.loads(cpath.read_text(encoding='utf-8')) if cpath.exists() else {}
    for rid, latin, name_en in items:
        if (REFS / f'{rid}.jpg').exists():
            continue
        try:
            fname = find_photo(latin, name_en)
            if not fname:
                print('pas de photo', rid)
                continue
            d = api('https://commons.wikimedia.org/w/api.php', action='query', titles='File:' + fname,
                    prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1024)
            info = d['query']['pages'][0]['imageinfo'][0]
            meta = info.get('extmetadata', {})
            lic = meta.get('LicenseShortName', {}).get('value', '')
            if not licence_ok(lic):
                print('licence refusée', rid, lic)
                continue
            (REFS / f'{rid}.jpg').write_bytes(get(info.get('thumburl') or info['url']))
            artist = re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', '')).strip()
            credits[rid] = {'fichier': fname, 'auteur': artist, 'licence': lic, 'url': info.get('descriptionurl', '')}
            print('ok', rid, lic)
        except Exception as e:  # une espèce sans photo ne bloque pas les autres
            print('erreur', rid, e)
        cpath.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding='utf-8')


def workflow_ref(prompt, w, h, seed, steps, prefixe, ref=None):
    g = G.workflow(prompt, w, h, seed, steps, prefixe)
    g['ref_img'] = {'class_type': 'LoadImage', 'inputs': {'image': ref}}
    g['ref_scale'] = {'class_type': 'ImageScaleToTotalPixels', 'inputs': {'image': ['ref_img', 0], 'upscale_method': 'lanczos', 'megapixels': 1.0, 'resolution_steps': 1}}
    g['ref_lat'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['ref_scale', 0], 'vae': ['vae', 0]}}
    g['ref_cond'] = {'class_type': 'ReferenceLatent', 'inputs': {'conditioning': ['pos', 0], 'latent': ['ref_lat', 0]}}
    g['guide']['inputs']['positive'] = ['ref_cond', 0]
    return g


G.MODELES['klein_ref'] = workflow_ref


def paint(jobs, n, seed0):
    OUT.mkdir(parents=True, exist_ok=True)
    if not G.serveur_pret():
        G.demarrer_serveur()
    for prefixe, ref, prompt in jobs:
        if not ref.exists():
            print('pas de référence', prefixe)
            continue
        if any(f.stem.rsplit('_', 1)[0] == prefixe for f in OUT.glob(f'{prefixe}_*.png')):
            continue
        name = G.televerser(str(ref))
        for k in range(n):
            G.generer(prompt, 1024, 1024, seed0 + k, 4, prefixe, str(OUT), modele='klein_ref', ref=name)
        print('ok', prefixe)


KEYWORD = {'arbre': 'tree', 'arbuste': 'shrub', 'fleur': 'plant', 'fougere': 'plant', 'succulente': 'plant', 'aquatique': 'plant'}
CAND = REFS / 'cand'


def candidates(items, per=4):
    """Cherche sur Commons des photos de la plante entière et garde les premières à licence compatible."""
    CAND.mkdir(parents=True, exist_ok=True)
    cpath = REFS / 'candidats.json'
    found = json.loads(cpath.read_text(encoding='utf-8')) if cpath.exists() else {}
    for rid, latin, cat in items:
        if found.get(rid):
            continue
        try:
            # images de l'article Wikipédia de l'espèce : choisies par les contributeurs, donc fiables pour l'espèce
            titles = []
            for t in [clean_latin(latin), latin.split()[0]]:
                d = api('https://en.wikipedia.org/w/api.php', action='query', titles=t, prop='images|pageimages', piprop='name', imlimit=50, redirects=1)
                page = d['query']['pages'][0]
                if page.get('missing'):
                    continue
                files = [i['title'] for i in page.get('images', [])]
                files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))
                         and not any(w in f.lower() for w in ('map', 'distribution', 'range', 'logo', 'icon', 'symbol', 'flag', 'stamp', 'coin', 'diagram'))]
                if page.get('pageimage'):
                    main_img = 'File:' + page['pageimage']
                    files = [main_img] + [f for f in files if f != main_img]
                titles = files[:10]
                if titles:
                    break
            kept = []
            if titles:
                info = api('https://commons.wikimedia.org/w/api.php', action='query', titles='|'.join(titles),
                           prop='imageinfo', iiprop='url|extmetadata|mime', iiurlwidth=330)
                order = {t: i for i, t in enumerate(titles)}
                for page in sorted(info['query']['pages'], key=lambda p: order.get(p['title'], 99)):
                    ii = (page.get('imageinfo') or [{}])[0]
                    meta = ii.get('extmetadata', {})
                    lic = meta.get('LicenseShortName', {}).get('value', '')
                    if ii.get('mime') not in ('image/jpeg', 'image/png') or not licence_ok(lic):
                        continue
                    thumb = ii.get('thumburl', '')
                    if '/thumb/' not in thumb:
                        continue  # image trop petite : Wikimedia limite fortement les originaux
                    k = len(kept)
                    (CAND / f'{rid}_{k}.jpg').write_bytes(get(thumb))
                    kept.append({'fichier': page['title'][5:], 'auteur': re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', '')).strip(),
                                 'licence': lic, 'url': ii.get('descriptionurl', ''), 'image': thumb})
                    if len(kept) == per:
                        break
            found[rid] = kept
            print('ok', rid, len(kept))
        except Exception as e:
            print('erreur', rid, e)
        cpath.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding='utf-8')


def choose(choices):
    """Télécharge en 960 px la candidate retenue (0 par défaut, -1 = aucune) pour chaque espèce ; reprenable."""
    import time
    found = json.loads((REFS / 'candidats.json').read_text(encoding='utf-8'))
    cpath = REFS / 'credits.json'
    credits = json.loads(cpath.read_text(encoding='utf-8')) if cpath.exists() else {}
    for rid, kept in found.items():
        k = choices.get(rid, 0)
        if k < 0 or k >= len(kept):
            credits.pop(rid, None)
            continue
        c = kept[k]
        if credits.get(rid, {}).get('fichier') == c['fichier'] and (REFS / f'{rid}.jpg').exists():
            continue
        try:
            # vignette standard de 960 px ; si l'image est trop petite, on se contente de celle de 330 px
            info = api('https://commons.wikimedia.org/w/api.php', action='query', titles='File:' + c['fichier'], prop='imageinfo', iiprop='url', iiurlwidth=960)
            url = (info['query']['pages'][0].get('imageinfo') or [{}])[0].get('thumburl', '')
            (REFS / f'{rid}.jpg').write_bytes(get(url if '/thumb/' in url else c['image']))
            credits[rid] = {kk: c[kk] for kk in ('fichier', 'auteur', 'licence', 'url')}
            cpath.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding='utf-8')
        except Exception as e:
            print('erreur', rid, e)
            time.sleep(20)
    cpath.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(credits), 'références')


def transform(subject, fond):
    """Consigne de transformation : garder la vraie plante de la photo, la repeindre, bords nets sans halo."""
    return ("Transform this photograph into a painted illustration of " + subject + ". "
            "Keep the main plant exactly as it is in the photo: same overall shape, same branches, same leaves, same flowers and same colors. "
            "Show only this one whole plant, centered, from its base to its top. "
            "Repaint it with rich hand-painted brush textures and soft luminous light in an ethereal painterly fantasy style, "
            "with clean crisp edges and no glow or halo around the plant. "
            f"Replace everything around it with a perfectly flat solid pure {fond} background. No ground, no pot, no text.")


def main():
    cmd, args = sys.argv[1], sys.argv[2:]
    n = 2
    if '--n' in args:
        i = args.index('--n'); n = int(args[i + 1]); del args[i:i + 2]
    only = set(args)
    esp = json.loads(__import__('subprocess').check_output(
        ['node', '-e', "Promise.all([import('./src/data/especes.js'),import('./src/data/edu.js')]).then(([m,d])=>console.log(JSON.stringify(m.ESPECES.map(e=>({...e,bloom:d.EDU[e.id]?.bloom,en_name:d.EDU[e.id]?.en.name})))))"],
        cwd=ROOT, text=True, encoding='utf-8'))
    if cmd == 'candidats':
        items = [(k, lat, 'arbre' if k.split('_')[0] in ('erable', 'cerisier', 'pin', 'bambou') else 'fleur') for k, (lat, _) in BASE.items() if not only or k in only]
        items += [(e['id'], e['latin'], e['cat']) for e in esp if not only or e['id'] in only]
        candidates(items)
        return
    if cmd == 'choisir':
        cp = REFS / 'choix.json'
        choose(json.loads(cp.read_text(encoding='utf-8')) if cp.exists() else {})
        return
    if cmd == 'refs':
        items = [(k, lat, '') for k, (lat, _) in BASE.items() if not only or k in only]
        items += [(e['id'], e['latin'], e['en_name'] or '') for e in esp if not only or e['id'] in only]
        fetch_refs(items)
    elif cmd == 'peindre':
        jobs = []
        for k, (lat, desc) in BASE.items():
            if only and k not in only:
                continue
            prompt = transform(desc + f' ({lat})', 'blue')
            jobs.append((f'ob_{k}', REFS / f'{k}.jpg', prompt))
        for e in esp:
            if only and e['id'] not in only:
                continue
            fond = 'yellow' if e['bg'] == 'j' else 'blue'
            fleurs = 'without any flowers, ' if e['bloom'] == 'aucune' else ''
            whole = 'the whole tree' if e['cat'] == 'arbre' else 'the whole plant'
            prompt = transform(f'a single {e["en"]} ({e["latin"]}), {fleurs}', fond)
            jobs.append((f'c_{e["id"]}', REFS / f'{e["id"]}.jpg', prompt))
        paint(jobs, n, 7200)


if __name__ == '__main__':
    main()
