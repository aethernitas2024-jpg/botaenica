#!/usr/bin/env bash
# Génère 2 variantes peintes par espèce de collection dans art/raw (c_<id>_<graine>.png).
# Reprend là où il s'est arrêté : une espèce déjà générée est sautée.
# Usage : bash scripts/gen_especes.sh [id ...]   (sans argument : toutes les espèces)
cd "$(dirname "$0")/.."
GEN='I:\ComfyUI_windows_portable\_claude\generer_image.py'
OUT="${OUT_DIR:-C:\Users\d2460n\JardinZen\art\raw}"
RAWLS="${RAW_LS:-art/raw}"
STYLE="${STYLE:-realistic botanical detail, soft natural daylight from the upper left, highly detailed realistic digital painting}"
SEED="${SEED:-3000}"
node -e "Promise.all([import('./src/data/especes.js'),import('./src/data/edu.js')]).then(([m,d])=>{for(const e of m.ESPECES)console.log([e.id,e.cat,e.bg,e.en,d.EDU[e.id]?.bloom||''].join('|'))})" > art/especes.tsv
while IFS='|' read -r id cat bg en bloom; do
  if [ $# -gt 0 ] && [[ ! " $* " =~ " $id " ]]; then continue; fi
  if [ $# -eq 0 ] && ls "$RAWLS"/ | grep -qE "^c_${id}_[0-9]+\.png$"; then continue; fi
  if [ "$bg" = "j" ]; then fond='perfectly flat solid pure yellow background'; else fond='perfectly flat solid pure blue background'; fi
  if [ "$cat" = "arbre" ]; then whole='the whole tree fully visible and centered, trunk base touching the bottom edge'; else whole='the whole plant fully visible and centered, its base touching the bottom edge'; fi
  # pas de fleurs inventées : une espèce sans floraison est décrite « sans fleurs »
  if [ "$bloom" = "aucune" ]; then fleurs='without any flowers, '; else fleurs='no extra flowers other than those described, '; fi
  prompt="A single $en, $fleurs$STYLE, $whole, isolated on a $fond, no ground, no pot, no shadow, no text, no border"
  py -3.11 -I "$GEN" "$prompt" --nom "c_$id" --w 1024 --h 1024 --n 2 --seed "$SEED" --out "$OUT" >/dev/null || echo "ECHEC $id"
  echo "ok $id"
done < art/especes.tsv
echo FIN
