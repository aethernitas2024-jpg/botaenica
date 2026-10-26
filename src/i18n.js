// Textes du jeu en français et en anglais. La langue suit celle du téléphone, et peut être changée dans le menu.
import { PLANTS } from './logic.js';
import { EDU } from './data/edu.js';

let lang = 'fr';
export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
}
export const detectLang = () => ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');

const s = (n) => (n > 1 ? 's' : '');

const D = {
  fr: {
    tagline: 'un jardin qui pousse avec le temps',
    enter: 'touche pour entrer',
    rake: 'Ratisser', water: 'Arroser', plantTool: 'Planter',
    seedsTitle: 'Graines', seedsSub: 'Récolte la rosée de tes plantes mûres pour en acheter de nouvelles.',
    menuTitle: 'Le jardin',
    zenMode: 'Mode contemplation', zenModeSub: 'cache l’interface',
    smooth: 'Lisser tout le sable', smoothSub: 'efface tes motifs',
    about: 'Botaenica 1.1 · Tout reste sur ton téléphone. Aucun compte, aucune publicité, aucune donnée envoyée.',
    sound: ({ on }) => `Son : ${on ? 'activé' : 'coupé'} <small>vent, carillons, eau, grillons</small>`,
    language: 'Langue : Français <small>touche pour passer en anglais</small>',
    creditsBtn: 'Crédits des photos <small>les vraies plantes qui ont servi de modèle</small>',
    creditsTitle: 'Crédits des photos',
    creditsSub: ({ n }) => `Les plantes du jeu sont peintes d’après ${n} photos de Wikimedia Commons. Merci à leurs auteurs. Les images repeintes d’après une photo CC BY-SA sont partagées sous la même licence.`,
    creditsOpen: 'Voir la photo',
    pavilion: 'Pavillon des plantes', places: 'Lieux', dewLabel: 'Gouttes de rosée', back: 'Retour au jardin', menu: 'Menu', showUi: 'Afficher l’interface',
    seasons: { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' },
    hintRake: 'Glisse ton doigt sur le sable pour le ratisser.',
    hintSeed: 'Touche « Planter » et sème une mousse : elle est gratuite.',
    hintWater: 'Prends l’arrosoir et passe le doigt sur ta plante.',
    hintDrop: 'Une goutte de rosée brille : touche-la pour la récolter.',
    pondFull: 'L’étang est déjà plein.', gardenFull: 'Plus de place libre ici.',
    notHere: ({ name, places }) => `${name} ne pousse pas ici.${places ? ` Essaie : ${places}.` : ' Découvre d’autres espèces pour ouvrir de nouveaux lieux.'}`,
    tapSlot: ({ water, name }) => `Touche un emplacement ${water ? 'd’eau' : 'lumineux'} pour planter : ${name}.`,
    packet: 'Sachet de graines',
    packetDesc: ({ n }) => `Une espèce au hasard parmi ${n}, souvent une nouvelle. Les précieuses et légendaires sont rares.`,
    packetPoor: ({ n }) => `Il te faut ${n} gouttes de rosée pour un sachet.`,
    yourSeeds: 'Tes graines', gardenPlants: 'Plantes du jardin', neverPlanted: 'jamais plantée',
    free: 'gratuit', instant: 'immédiat',
    missingDew: ({ n }) => `Il te manque ${n} goutte${s(n)} de rosée.`,
    newSpecies: 'Nouvelle espèce !', oneMore: 'Une graine de plus pour ta collection.',
    plantNow: 'Planter maintenant', keep: 'Garder',
    mature: 'Arrivée à maturité', matureIn: ({ d }) => `Maturité dans ${d}`,
    watered: ({ d }) => `Arrosée · ${d}`, dry: ({ grown }) => `Sol sec : arrose pour doubler ${grown ? 'la rosée' : 'la pousse'}`,
    dewStock: ({ n, max }) => `Rosée : ${n}/${max}`, dewEvery: ({ d }) => `Donnera 1 goutte / ${d}`,
    uproot: 'Retirer', sure: 'Vraiment ?', uprooted: ({ name }) => `${name} retourne à la terre.`,
    wateredToast: ({ name, grown, d }) => `Arrosage : ${name}. ${grown ? 'Rosée' : 'Pousse'} doublée pendant ${d}.`,
    noDew: 'Pas assez de rosée.', noSeed: 'Tu n’as plus de graine de cette espèce.', cantPlant: 'Impossible de planter ici.',
    discoveredToast: ({ name }) => `Nouvelle espèce au Pavillon des plantes : ${name} 🌿`,
    plantedToast: ({ name, d }) => (d ? `Planté : ${name}. Maturité dans ${d}.` : `Installé : ${name}.`),
    cancelPlant: 'Plantation annulée.', waterHelp: 'Fais glisser l’arrosoir sur tes plantes.',
    smoothed: 'Le sable est redevenu lisse.',
    dewInfo: ({ n, earned, cap }) => `${n} gouttes de rosée. Ratisser en rapporte aussi (${earned}/${cap} aujourd’hui).`,
    away: ({ d, ready }) => `Pendant ton absence (${d}), le jardin a poussé.${ready ? ` ${ready} goutte${s(ready)} de rosée t’attend${ready > 1 ? 'ent' : ''}.` : ''}`,
    firstBloom: ({ name, n }) => `Première floraison : ${name} · +${n} 💧 · sa niche s’illumine au Pavillon`,
    maturedToast: ({ name }) => `Maturité atteinte : ${name} ✨`,
    rarities: { commune: 'Commune', rare: 'Rare', precieuse: 'Précieuse', legendaire: 'Légendaire', jardin: 'Jardin' },
    families: { arbre: 'Arbres', arbuste: 'Arbustes', fleur: 'Fleurs', fougere: 'Mousses et fougères', succulente: 'Succulentes', aquatique: 'Aquatiques', decor: 'Décor' },
    family1: { arbre: 'arbre', arbuste: 'arbuste', fleur: 'fleur', fougere: 'mousse ou fougère', succulente: 'succulente', aquatique: 'plante aquatique', decor: 'décor' },
    biomes: { zen: 'Jardin zen', prairie: 'Prairie fleurie', serre: 'Serre tropicale', cactus: 'Jardin de cactus', bonsai: 'Salon de bonsaï' },
    biomeDesc: { zen: 'Le jardin de sable, son étang et ses koïs. Toutes les plantes y poussent.', prairie: 'Fleurs, arbustes, mousses et fougères au grand air.', serre: 'Fleurs, fougères, succulentes et plantes d’eau à l’abri du verre.', cactus: 'Cactus et succulentes sur le gravier chaud.', bonsai: 'Arbres et arbustes taillés en bonsaïs sur leurs présentoirs.' },
    placesTitle: 'Lieux', placesSub: 'Découvre de nouvelles espèces pour ouvrir de nouveaux lieux.',
    slotsUsed: ({ n, m }) => `${n}/${m} emplacements`, unlockAt: ({ n, k }) => `Découvre ${n} espèces (${k}/${n})`, here: 'Tu es ici',
    welcomeBiome: ({ name }) => `Bienvenue : ${name}.`, biomeUnlocked: ({ name }) => `Nouveau lieu ouvert : ${name} 🗺️`,
    // Pavillon
    pvProgress: ({ known, total, bloomed }) => `${known}/${total} espèces découvertes · ${bloomed} épanouie${s(bloomed)}`,
    tabCollection: 'Collection', tabMap: 'Carte', tabQuiz: 'Quiz',
    allFamilies: 'Toutes', bloomedSeal: 'épanouie', seedInStock: 'graine en réserve', inPacket: 'dans un sachet', toPlant: 'à planter',
    didYouKnow: 'Le savais-tu ?', gardenerTip: 'Conseil du jardinier',
    origin: 'Origine', habitat: 'Habitat', height: 'Taille adulte', bloomLabel: 'Floraison',
    blooms: { printemps: 'au printemps', ete: 'en été', automne: 'en automne', hiver: 'en hiver', toute_annee: 'toute l’année', aucune: 'pas de fleurs' },
    planted: ({ n }) => `plantée${s(n)}`, bloomedN: ({ n }) => `épanouie${s(n)}`, dropsCollected: 'gouttes récoltées',
    mapIntro: ({ n }) => (n ? `D’où viennent tes ${n} espèces découvertes. Touche un point pour ouvrir sa fiche.` : 'Plante des espèces pour voir d’où elles viennent.'),
    quizIntro: ({ left, reward }) => `Chaque bonne réponse rapporte ${reward} 💧 (encore ${left} aujourd’hui).`,
    quizDone: 'Tu as gagné toute la rosée du quiz pour aujourd’hui. Tu peux continuer pour le plaisir !',
    quizLocked: ({ n }) => `Découvre au moins ${n} espèces pour débloquer le quiz.`,
    qName: 'Quelle est cette plante ?', qLatin: ({ name }) => `Quel est le nom latin de : ${name} ?`,
    qOrigin: ({ name }) => `D’où vient : ${name} ?`, qFact: 'De quelle plante parle-t-on ?',
    qBloom: ({ name }) => `Quand fleurit : ${name} ?`, qHeight: ({ name }) => `Quelle est la taille adulte de : ${name} ?`,
    right: ({ n }) => (n ? `Bravo ! +${n} 💧` : 'Bravo !'), wrong: ({ a }) => `Raté. La bonne réponse : ${a}.`, next: 'Question suivante',
  },
  en: {
    tagline: 'a garden that grows with time',
    enter: 'tap to enter',
    rake: 'Rake', water: 'Water', plantTool: 'Plant',
    seedsTitle: 'Seeds', seedsSub: 'Collect dew from your grown plants to buy new ones.',
    menuTitle: 'The garden',
    zenMode: 'Contemplation mode', zenModeSub: 'hides the interface',
    smooth: 'Smooth all the sand', smoothSub: 'erases your patterns',
    about: 'Botaenica 1.1 · Everything stays on your phone. No account, no ads, no data sent.',
    sound: ({ on }) => `Sound: ${on ? 'on' : 'off'} <small>wind, chimes, water, crickets</small>`,
    language: 'Language: English <small>tap to switch to French</small>',
    creditsBtn: 'Photo credits <small>the real plants used as models</small>',
    creditsTitle: 'Photo credits',
    creditsSub: ({ n }) => `The game’s plants are painted from ${n} photos from Wikimedia Commons. Thanks to their authors. Images painted from a CC BY-SA photo are shared under the same license.`,
    creditsOpen: 'View the photo',
    pavilion: 'Plant pavilion', places: 'Places', dewLabel: 'Dew drops', back: 'Back to the garden', menu: 'Menu', showUi: 'Show the interface',
    seasons: { printemps: 'Spring', ete: 'Summer', automne: 'Autumn', hiver: 'Winter' },
    hintRake: 'Slide your finger across the sand to rake it.',
    hintSeed: 'Tap “Plant” and sow some moss: it’s free.',
    hintWater: 'Take the watering can and slide your finger over your plant.',
    hintDrop: 'A dew drop is shining: tap it to collect it.',
    pondFull: 'The pond is already full.', gardenFull: 'No free spot left here.',
    notHere: ({ name, places }) => `${name} doesn’t grow here.${places ? ` Try: ${places}.` : ' Discover more species to open new places.'}`,
    tapSlot: ({ water, name }) => `Tap a ${water ? 'water' : 'glowing'} spot to plant: ${name}.`,
    packet: 'Seed packet',
    packetDesc: ({ n }) => `A random species out of ${n}, often a new one. Precious and legendary ones are rare.`,
    packetPoor: ({ n }) => `You need ${n} dew drops for a packet.`,
    yourSeeds: 'Your seeds', gardenPlants: 'Garden plants', neverPlanted: 'never planted',
    free: 'free', instant: 'instant',
    missingDew: ({ n }) => `You need ${n} more dew drop${s(n)}.`,
    newSpecies: 'New species!', oneMore: 'One more seed for your collection.',
    plantNow: 'Plant now', keep: 'Keep',
    mature: 'Fully grown', matureIn: ({ d }) => `Grown in ${d}`,
    watered: ({ d }) => `Watered · ${d}`, dry: ({ grown }) => `Dry soil: water to double ${grown ? 'the dew' : 'growth'}`,
    dewStock: ({ n, max }) => `Dew: ${n}/${max}`, dewEvery: ({ d }) => `Will give 1 drop / ${d}`,
    uproot: 'Remove', sure: 'Sure?', uprooted: ({ name }) => `${name} returns to the earth.`,
    wateredToast: ({ name, grown, d }) => `Watered: ${name}. ${grown ? 'Dew' : 'Growth'} doubled for ${d}.`,
    noDew: 'Not enough dew.', noSeed: 'You have no seed of this species left.', cantPlant: 'You can’t plant here.',
    discoveredToast: ({ name }) => `New species in the Plant pavilion: ${name} 🌿`,
    plantedToast: ({ name, d }) => (d ? `Planted: ${name}. Grown in ${d}.` : `Placed: ${name}.`),
    cancelPlant: 'Planting cancelled.', waterHelp: 'Drag the watering can over your plants.',
    smoothed: 'The sand is smooth again.',
    dewInfo: ({ n, earned, cap }) => `${n} dew drops. Raking gives some too (${earned}/${cap} today).`,
    away: ({ d, ready }) => `While you were away (${d}), the garden grew.${ready ? ` ${ready} dew drop${s(ready)} ${ready > 1 ? 'are' : 'is'} waiting for you.` : ''}`,
    firstBloom: ({ name, n }) => `First bloom: ${name} · +${n} 💧 · its alcove lights up in the Pavilion`,
    maturedToast: ({ name }) => `Fully grown: ${name} ✨`,
    rarities: { commune: 'Common', rare: 'Rare', precieuse: 'Precious', legendaire: 'Legendary', jardin: 'Garden' },
    families: { arbre: 'Trees', arbuste: 'Shrubs', fleur: 'Flowers', fougere: 'Mosses and ferns', succulente: 'Succulents', aquatique: 'Water plants', decor: 'Decor' },
    family1: { arbre: 'tree', arbuste: 'shrub', fleur: 'flower', fougere: 'moss or fern', succulente: 'succulent', aquatique: 'water plant', decor: 'decor' },
    biomes: { zen: 'Zen garden', prairie: 'Flower meadow', serre: 'Tropical greenhouse', cactus: 'Cactus garden', bonsai: 'Bonsai room' },
    biomeDesc: { zen: 'The sand garden, its pond and its koi. Every plant grows here.', prairie: 'Flowers, shrubs, mosses and ferns in the open air.', serre: 'Flowers, ferns, succulents and water plants under glass.', cactus: 'Cacti and succulents on warm gravel.', bonsai: 'Trees and shrubs trained as bonsai on their stands.' },
    placesTitle: 'Places', placesSub: 'Discover new species to open new places.',
    slotsUsed: ({ n, m }) => `${n}/${m} spots`, unlockAt: ({ n, k }) => `Discover ${n} species (${k}/${n})`, here: 'You are here',
    welcomeBiome: ({ name }) => `Welcome: ${name}.`, biomeUnlocked: ({ name }) => `New place open: ${name} 🗺️`,
    pvProgress: ({ known, total, bloomed }) => `${known}/${total} species discovered · ${bloomed} fully grown`,
    tabCollection: 'Collection', tabMap: 'Map', tabQuiz: 'Quiz',
    allFamilies: 'All', bloomedSeal: 'grown', seedInStock: 'seed in stock', inPacket: 'in a packet', toPlant: 'to plant',
    didYouKnow: 'Did you know?', gardenerTip: 'Gardener’s tip',
    origin: 'Origin', habitat: 'Habitat', height: 'Mature height', bloomLabel: 'Flowering',
    blooms: { printemps: 'in spring', ete: 'in summer', automne: 'in autumn', hiver: 'in winter', toute_annee: 'all year round', aucune: 'no flowers' },
    planted: () => 'planted', bloomedN: () => 'fully grown', dropsCollected: 'drops collected',
    mapIntro: ({ n }) => (n ? `Where your ${n} discovered species come from. Tap a dot to open its card.` : 'Plant species to see where they come from.'),
    quizIntro: ({ left, reward }) => `Each right answer gives ${reward} 💧 (${left} more today).`,
    quizDone: 'You’ve earned all of today’s quiz dew. Keep playing for fun!',
    quizLocked: ({ n }) => `Discover at least ${n} species to unlock the quiz.`,
    qName: 'What is this plant?', qLatin: ({ name }) => `What is the Latin name of: ${name}?`,
    qOrigin: ({ name }) => `Where does it come from: ${name}?`, qFact: 'Which plant is this about?',
    qBloom: ({ name }) => `When does it flower: ${name}?`, qHeight: ({ name }) => `How tall does it grow: ${name}?`,
    right: ({ n }) => (n ? `Well done! +${n} 💧` : 'Well done!'), wrong: ({ a }) => `Not quite. The answer: ${a}.`, next: 'Next question',
  },
};

// Noms des stades de croissance, traduits mot à mot.
const STAGES_EN = {
  Spore: 'Spore', Tapis: 'Mat', Coussin: 'Cushion', Rhizome: 'Rhizome', Pousse: 'Sprout', Tiges: 'Stems', Bosquet: 'Grove',
  Graine: 'Seed', Feuilles: 'Leaves', Bouton: 'Bud', Fleur: 'Flower', Jeune: 'Young', Arbre: 'Tree', Flamboyant: 'Ablaze',
  'En fleur': 'In bloom', Sculpté: 'Sculpted', Ancien: 'Ancient', Allumée: 'Lit', Buisson: 'Bush', Touffe: 'Clump', Rosette: 'Rosette', Adulte: 'Mature',
};
const DESC_EN = {
  mousse: 'Soft and patient. Free, grows in a few minutes.',
  bambou: 'Grows straight up to the sky and sings in the wind.',
  lotus: 'Floats on the pond. Can only be planted in water.',
  erable: 'Its leaves slowly catch fire, one after another.',
  cerisier: 'Sakura. Once in bloom, its petals dance in the air.',
  pin: 'The slowest, the most generous. A whole day to grow.',
  lanterne: 'A stone tōrō. It lights up when night falls.',
};

export function t(key, vars = {}) {
  const e = D[lang][key] ?? D.fr[key];
  if (typeof e === 'function') return e(vars);
  return e ?? key;
}
export const plantName = (type) => (lang === 'en' && EDU[type] ? EDU[type].en.name : PLANTS[type].name);
export const plantFact = (type) => (lang === 'en' && EDU[type] ? EDU[type].en.fact : PLANTS[type].fact);
export const plantDesc = (type) => (lang === 'en' ? DESC_EN[type] || '' : PLANTS[type].desc);
export const stageName = (type, i) => {
  const st = PLANTS[type].stages[i];
  return lang === 'en' ? STAGES_EN[st] || st : st;
};
export const rarityName = (r) => t('rarities')[r || 'jardin'];
export const familyName = (c) => t('families')[c];
export const familyOne = (c) => t('family1')[c];
export const biomeName = (b) => t('biomes')[b];
export const seasonName = (x) => t('seasons')[x];
export const edu = (type) => EDU[type] || null;
export const originOf = (type) => (EDU[type] ? EDU[type].origin[lang] : '');
export const habitatOf = (type) => (EDU[type] ? EDU[type].habitat[lang] : '');
export const tipOf = (type) => (EDU[type] ? EDU[type].tip[lang] : '');
export const bloomOf = (type) => (EDU[type] ? t('blooms')[EDU[type].bloom] : '');
export function heightOf(type) {
  const h = EDU[type]?.height_m;
  if (h === undefined) return '';
  const fmt = (v) => (lang === 'fr' ? String(v).replace('.', ',') : String(v));
  if (h < 1) return `${fmt(Math.round(h * 100))} cm`;
  return `${fmt(h >= 10 ? Math.round(h) : Math.round(h * 10) / 10)} m`;
}

// Textes fixes de la page, posés par sélecteur.
const STATIC = [
  ['#splash p', 'tagline'], ['#splash small', 'enter'],
  ['.tool[data-tool="main"] span', 'rake'], ['.tool[data-tool="water"] span', 'water'], ['.tool[data-tool="seeds"] span', 'plantTool'],
  ['#seeds h2', 'seedsTitle'], ['#seeds .sub', 'seedsSub'], ['#menu h2', 'menuTitle'], ['#menu .about', 'about'],
  ['#pavillon .pv-head h2', 'pavilion'], ['#lieux h2', 'placesTitle'], ['#lieux .sub', 'placesSub'],
];
const STATIC_HTML = [['#zenBtn', () => `${t('zenMode')} <small>${t('zenModeSub')}</small>`], ['#smoothBtn', () => `${t('smooth')} <small>${t('smoothSub')}</small>`], ['#langBtn', () => t('language')], ['#creditsBtn', () => t('creditsBtn')]];
const ARIA = [['#dew', 'dewLabel'], ['#pvBtn', 'pavilion'], ['#placesBtn', 'places'], ['#menuBtn', 'menu'], ['#pvClose', 'back'], ['#unzen', 'showUi']];

export function applyStatic() {
  for (const [sel, key] of STATIC) for (const el of document.querySelectorAll(sel)) el.textContent = t(key);
  for (const [sel, fn] of STATIC_HTML) { const el = document.querySelector(sel); if (el) el.innerHTML = fn(); }
  for (const [sel, key] of ARIA) { const el = document.querySelector(sel); if (el) el.setAttribute('aria-label', t(key)); }
  document.title = lang === 'en' ? 'Botaenica — zen garden' : 'Botaenica — jardin zen';
}
