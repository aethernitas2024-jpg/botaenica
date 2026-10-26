"""Fusionne art/edu/part_*.json en src/data/edu.js et applique les corrections d'anecdotes (FR + EN).

py -3.11 scripts/edu_build.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Anecdotes corrigées après relecture : (français, anglais)
FIXES = {
    'pin': ('Chaque année, les jardiniers japonais raccourcissent ses jeunes pousses, les « bougies », pour garder ses plateaux en forme de nuages.',
            'Every year, Japanese gardeners trim its new shoots, called “candles”, to keep its cloud-shaped layers.'),
    'pivoine_arbustive': ('En Chine, on la surnomme le « roi des fleurs ».', 'In China, it is nicknamed the “king of flowers”.'),
    'middlemist': ('C’est l’un des camélias les plus rares au monde : on n’en connaît que de très rares pieds, en Angleterre et en Nouvelle-Zélande.',
                   'It is one of the rarest camellias in the world: only a handful of plants are known, in England and New Zealand.'),
    'hellebore': ('Elle fleurit de la fin de l’hiver au printemps, d’où son surnom de « rose de carême ».', 'It blooms from late winter into spring, hence its nickname, the “Lenten rose”.'),
    'narcisse': ('Son nom serait lié au héros grec Narcisse.', 'Its name is said to come from the Greek hero Narcissus.'),
    'pensee': ('Son nom vient du mot « pensée » : elle symbolise le souvenir.', 'Its French name means “thought”: it is a symbol of remembrance.'),
    'rafflesia': ('C’est l’une des plus grandes fleurs du monde : près d’un mètre de diamètre.', 'It is one of the largest flowers in the world: nearly a metre across.'),
    'fougere_arbo': ('Son « tronc » est une tige dressée entourée d’un épais manchon de racines.', 'Its “trunk” is an upright stem wrapped in a thick sleeve of roots.'),
    'selaginelle': ('Ce n’est ni une mousse ni une fougère : sa lignée est plus ancienne que celle des fougères.', 'It is neither a moss nor a fern: its lineage is older than that of ferns.'),
    'hypne': ('Elle forme des tapis moelleux sur les troncs, les pierres et les vieux murs.', 'It forms soft carpets on tree trunks, stones and old walls.'),
    'acore': ('Ses feuilles froissées dégagent une odeur aromatique.', 'Its crushed leaves give off an aromatic scent.'),
}


def js_str(t):
    return "'" + t.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    parts = []
    for k in range(1, 5):
        parts += json.loads((ROOT / 'art' / 'edu' / f'part_{k}.json').read_text(encoding='utf-8'))
    edu = {}
    for e in parts:
        if e['id'] in FIXES:
            e['en']['fact'] = FIXES[e['id']][1]
        e.pop('note', None)
        edu[e.pop('id')] = e
    out = '// Données éducatives bilingues (origine, habitat, taille, floraison, conseil, nom et anecdote en anglais).\n'
    out += '// Générées par scripts/edu_build.py à partir de art/edu/part_*.json : ne pas modifier à la main.\n'
    out += 'export const EDU = ' + json.dumps(edu, ensure_ascii=False, indent=0) + ';\n'
    (ROOT / 'src' / 'data' / 'edu.js').write_text(out, encoding='utf-8')

    # anecdotes françaises corrigées dans les sources du jeu
    esp = ROOT / 'src' / 'data' / 'especes.js'
    s = esp.read_text(encoding='utf-8')
    logic = ROOT / 'src' / 'logic.js'
    lg = logic.read_text(encoding='utf-8')
    for sid, (fr, _) in FIXES.items():
        pat = re.compile(r"(\['" + re.escape(sid) + r"', (?:'(?:[^'\\]|\\.)*', ){6})'(?:[^'\\]|\\.)*'")
        s, n = pat.subn(lambda m: m.group(1) + js_str(fr), s)
        if n == 0:
            # plante de base : anecdote dans logic.js
            pat2 = re.compile(r"(  " + re.escape(sid) + r": \{[^}]*?fact: )'(?:[^'\\]|\\.)*'", re.S)
            lg, n2 = pat2.subn(lambda m: m.group(1) + js_str(fr), lg)
            assert n2 == 1, sid
    esp.write_text(s, encoding='utf-8')
    logic.write_text(lg, encoding='utf-8')
    print(len(edu), 'fiches')


if __name__ == '__main__':
    main()
