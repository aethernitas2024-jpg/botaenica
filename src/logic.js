// Logique pure du jardin : croissance, arrosage, rosée. Aucune dépendance au DOM.
import { ESPECES } from './data/especes.js';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

export const MAX_DROPS = 3;
export const WATER_MS = 2 * HOUR; // durée de l'effet d'arrosage (croissance x2)
export const RAKE_DAILY_CAP = 15;
export const RAKE_LENGTH_PER_DEW = 6; // en largeurs d'écran ratissées
export const FIRST_BLOOM_REWARD = 3; // rosée offerte la première fois qu'une espèce arrive à maturité
export const PACKET_COST = 8; // prix d'un sachet de graines de collection

// Raretés des espèces de collection : chance au tirage, durée de pousse, rythme de rosée.
export const RARITIES = {
  commune: { label: 'Commune', weight: 62, growMs: 40 * MIN, dewEvery: 18 * MIN },
  rare: { label: 'Rare', weight: 28, growMs: 3 * HOUR, dewEvery: 12 * MIN },
  precieuse: { label: 'Précieuse', weight: 8.5, growMs: 8 * HOUR, dewEvery: 8 * MIN },
  legendaire: { label: 'Légendaire', weight: 1.5, growMs: 20 * HOUR, dewEvery: 5 * MIN },
};

export const FAMILIES = {
  arbre: 'Arbres', arbuste: 'Arbustes', fleur: 'Fleurs', fougere: 'Mousses et fougères',
  succulente: 'Succulentes', aquatique: 'Aquatiques', decor: 'Décor',
};
const FAMILY_STAGES = {
  arbre: ['Graine', 'Pousse', 'Jeune', 'Arbre'],
  arbuste: ['Graine', 'Pousse', 'Buisson'],
  fleur: ['Graine', 'Pousse', 'Bouton', 'En fleur'],
  fougere: ['Spore', 'Pousse', 'Touffe'],
  succulente: ['Graine', 'Rosette', 'Adulte'],
  aquatique: ['Graine', 'Feuilles', 'Adulte'],
};

export const PLANTS = {
  mousse: {
    cat: 'fougere',
    name: 'Mousse', f: true, cost: 0, growMs: 10 * MIN, dewEvery: 20 * MIN, where: 'land',
    stages: ['Spore', 'Tapis', 'Coussin'],
    desc: 'Douce et patiente. Gratuite, pousse en quelques minutes.',
    latin: 'Polytrichum commune',
    fact: 'À Kyoto, le jardin du Saihō-ji, surnommé « temple des mousses », en abrite plus d’une centaine de variétés.',
  },
  bambou: {
    cat: 'arbre',
    name: 'Bambou', cost: 5, growMs: 1 * HOUR, dewEvery: 15 * MIN, where: 'land',
    stages: ['Rhizome', 'Pousse', 'Tiges', 'Bosquet'],
    desc: 'Monte droit vers le ciel et chante dans le vent.',
    latin: 'Phyllostachys',
    fact: 'Certains bambous comptent parmi les plantes qui poussent le plus vite au monde : près d’un mètre en une seule journée.',
  },
  lotus: {
    cat: 'aquatique',
    name: 'Lotus', cost: 12, growMs: 3 * HOUR, dewEvery: 12 * MIN, where: 'water',
    stages: ['Graine', 'Feuilles', 'Bouton', 'Fleur'],
    desc: 'Flotte sur l’étang. Se plante uniquement dans l’eau.',
    latin: 'Nelumbo nucifera',
    fact: 'Ses feuilles se nettoient seules : l’eau y perle en gouttes qui emportent la poussière. C’est « l’effet lotus ».',
  },
  erable: {
    cat: 'arbre',
    name: 'Érable', cost: 18, growMs: 6 * HOUR, dewEvery: 10 * MIN, where: 'land',
    stages: ['Graine', 'Pousse', 'Jeune', 'Arbre', 'Flamboyant'],
    desc: 'Son feuillage s’embrase lentement, feuille après feuille.',
    latin: 'Acer palmatum',
    fact: 'Au Japon, partir admirer les érables rougis de l’automne porte un nom : le momijigari.',
  },
  cerisier: {
    cat: 'arbre',
    name: 'Cerisier', cost: 30, growMs: 12 * HOUR, dewEvery: 8 * MIN, where: 'land',
    stages: ['Graine', 'Pousse', 'Jeune', 'Arbre', 'En fleur'],
    desc: 'Sakura. Une fois en fleur, ses pétales dansent dans l’air.',
    latin: 'Prunus serrulata',
    fact: 'Le hanami, la contemplation des cerisiers en fleur, se pratique au Japon depuis plus de mille ans.',
  },
  pin: {
    cat: 'arbre',
    name: 'Pin bonsaï', cost: 45, growMs: 24 * HOUR, dewEvery: 6 * MIN, where: 'land',
    stages: ['Graine', 'Pousse', 'Jeune', 'Sculpté', 'Ancien'],
    desc: 'Le plus lent, le plus généreux. Un jour entier pour mûrir.',
    latin: 'Pinus thunbergii',
    fact: 'Chaque année, les jardiniers japonais raccourcissent ses jeunes pousses, les « bougies », pour garder ses plateaux en forme de nuages.',
  },
  lanterne: {
    cat: 'decor',
    name: 'Lanterne', f: true, cost: 25, growMs: 0, dewEvery: 0, where: 'land',
    stages: ['Allumée'],
    desc: 'Un tōrō de pierre. S’illumine quand vient la nuit.',
    latin: 'Tōrō, granit',
    fact: 'Les lanternes de pierre viennent des temples bouddhistes, où elles bordaient les allées menant au sanctuaire.',
  },
};

// Les espèces de collection ne s'achètent pas : elles sortent des sachets de graines.
for (const e of ESPECES) {
  const r = RARITIES[e.rarity];
  PLANTS[e.id] = {
    name: e.name, latin: e.latin, fact: e.fact, cat: e.cat, size: e.size, rarity: e.rarity, collection: true,
    cost: null, growMs: r.growMs, dewEvery: r.dewEvery, where: e.cat === 'aquatique' ? 'water' : 'land',
    stages: FAMILY_STAGES[e.cat], desc: e.fact,
  };
}

// Lieux : chacun se débloque en découvrant des espèces et n'accueille que certaines familles.
export const BIOMES = {
  zen: { unlock: 0, allow: null },
  prairie: { unlock: 8, allow: ['fleur', 'fougere', 'arbuste'] },
  serre: { unlock: 20, allow: ['fleur', 'fougere', 'succulente', 'aquatique', 'arbuste'] },
  cactus: { unlock: 35, allow: ['succulente'] },
  bonsai: { unlock: 50, allow: ['arbre', 'arbuste'] },
};

// Quiz : chaque bonne réponse rapporte un peu de rosée, avec un plafond quotidien.
export const QUIZ_REWARD = 2;
export const QUIZ_DAILY = 10;
export function quizLeft(state, now) {
  return state.quiz && state.quiz.day === dayKey(now) ? QUIZ_DAILY - state.quiz.right : QUIZ_DAILY;
}
export function quizAnswer(state, correct, now) {
  if (!state.quiz || state.quiz.day !== dayKey(now)) state.quiz = { day: dayKey(now), right: 0 };
  if (!correct || state.quiz.right >= QUIZ_DAILY) return 0;
  state.quiz.right++;
  state.dew += QUIZ_REWARD;
  return QUIZ_REWARD;
}

export function discovered(state) {
  return Object.values(state.collection).filter((e) => e.planted > 0).length;
}

export function biomeUnlocked(state, biome) {
  return discovered(state) >= BIOMES[biome].unlock;
}

export function createState(now) {
  return {
    version: 1,
    dew: 5,
    plants: [],
    strokes: [],
    rake: { day: dayKey(now), earned: 0, length: 0 },
    lastTick: now,
    muted: false,
    hintsDone: [],
    nextId: 1,
    collection: {},
    seeds: {},
    biome: 'zen',
  };
}

// Collection : ce que le joueur a vécu avec chaque espèce (pour le Pavillon des plantes).
export function entry(state, type) {
  if (!state.collection[type]) state.collection[type] = { planted: 0, matured: 0, dew: 0 };
  return state.collection[type];
}

function bloom(state, type) {
  const e = entry(state, type);
  e.matured++;
  if (e.matured === 1) { state.dew += FIRST_BLOOM_REWARD; return true; }
  return false;
}

export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function stageOf(p) {
  const n = PLANTS[p.type].stages.length;
  if (n === 1) return 0;
  return Math.min(n - 1, Math.floor(p.growth * (n - 1) + 1e-9));
}

export function isMature(p) {
  return p.growth >= 1;
}

export function plantAt(state, slotId) {
  return state.plants.find((p) => p.slot === slotId) || null;
}

export function canPlant(state, slot, type) {
  const def = PLANTS[type];
  if (!def) return { ok: false, reason: 'inconnu' };
  if (plantAt(state, slot.id)) return { ok: false, reason: 'occupé' };
  if (def.where !== slot.kind) return { ok: false, reason: def.where === 'water' ? 'eau' : 'terre' };
  if (slot.allow && !slot.allow.includes(def.cat)) return { ok: false, reason: 'lieu' };
  if (def.collection) {
    if (!(state.seeds[type] > 0)) return { ok: false, reason: 'graine' };
  } else if (state.dew < def.cost) return { ok: false, reason: 'rosée' };
  return { ok: true };
}

export function plant(state, slot, type, now, seed = Math.random()) {
  const check = canPlant(state, slot, type);
  if (!check.ok) return check;
  const def = PLANTS[type];
  if (def.collection) state.seeds[type]--;
  else state.dew -= def.cost;
  const p = {
    id: state.nextId++,
    slot: slot.id,
    type,
    growth: def.growMs === 0 ? 1 : 0,
    wateredUntil: 0,
    drops: 0,
    dewAcc: 0,
    seed,
    plantedAt: now,
  };
  state.plants.push(p);
  const discovered = ++entry(state, type).planted === 1;
  const firstBloom = def.growMs === 0 ? bloom(state, type) : false;
  return { ok: true, plant: p, discovered, firstBloom };
}

// Ouvre un sachet : tire une rareté, puis de préférence une espèce encore jamais vue.
export function drawPacket(state, rand = Math.random) {
  if (state.dew < PACKET_COST) return null;
  state.dew -= PACKET_COST;
  const total = Object.values(RARITIES).reduce((n, r) => n + r.weight, 0);
  let roll = rand() * total;
  let rarity = 'commune';
  for (const [k, r] of Object.entries(RARITIES)) {
    if (roll < r.weight) { rarity = k; break; }
    roll -= r.weight;
  }
  const pool = ESPECES.filter((e) => e.rarity === rarity);
  const fresh = pool.filter((e) => !state.collection[e.id] && !state.seeds[e.id]);
  const from = fresh.length && rand() < 0.75 ? fresh : pool;
  const pick = from[Math.floor(rand() * from.length)];
  state.seeds[pick.id] = (state.seeds[pick.id] || 0) + 1;
  return { type: pick.id, rarity, isNew: !state.collection[pick.id] && state.seeds[pick.id] === 1 };
}

export function uproot(state, plantId) {
  const i = state.plants.findIndex((p) => p.id === plantId);
  if (i < 0) return false;
  state.plants.splice(i, 1);
  return true;
}

// Chaque arrosage ajoute 2 h de croissance (ou de rosée) doublée, cumulable jusqu'à 4 h.
export function water(state, plantId, now) {
  const p = state.plants.find((x) => x.id === plantId);
  if (!p || PLANTS[p.type].growMs === 0) return false;
  p.wateredUntil = Math.min(Math.max(p.wateredUntil, now) + WATER_MS, now + 2 * WATER_MS);
  return true;
}

export function isWatered(p, now) {
  return p.wateredUntil > now;
}

// Fait avancer une plante de t0 à t1 par pas d'une minute au plus,
// pour gérer proprement la fin d'arrosage et le passage à maturité.
function advancePlant(p, t0, t1) {
  const def = PLANTS[p.type];
  let t = t0;
  let produced = 0;
  while (t < t1) {
    const step = Math.min(MIN, t1 - t);
    const rate = p.wateredUntil > t ? 2 : 1;
    if (p.growth < 1) {
      if (def.growMs > 0) {
        p.growth += (step * rate) / def.growMs;
        if (p.growth > 1 - 1e-9) p.growth = 1; // absorbe l'erreur d'arrondi des pas
      }
    } else if (def.dewEvery > 0 && p.drops < MAX_DROPS) {
      p.dewAcc += step * rate; // l'arrosage double aussi la rosée
      while (p.dewAcc >= def.dewEvery && p.drops < MAX_DROPS) {
        p.dewAcc -= def.dewEvery;
        p.drops++;
        produced++;
      }
      if (p.drops >= MAX_DROPS) p.dewAcc = 0;
    }
    t += step;
  }
  return produced;
}

export function advance(state, now) {
  const t0 = state.lastTick;
  const summary = { elapsed: Math.max(0, now - t0), produced: 0, matured: [], firstBlooms: [] };
  if (now <= t0) return summary;
  for (const p of state.plants) {
    const wasMature = isMature(p);
    summary.produced += advancePlant(p, t0, now);
    if (!wasMature && isMature(p)) {
      summary.matured.push(p);
      if (bloom(state, p.type)) summary.firstBlooms.push(p.type);
    }
  }
  state.lastTick = now;
  return summary;
}

export function collect(state, plantId) {
  const p = state.plants.find((x) => x.id === plantId);
  if (!p || p.drops <= 0) return 0;
  p.drops--;
  state.dew++;
  entry(state, p.type).dew++;
  return 1;
}

// Ratisser rapporte un peu de rosée, plafonnée par jour.
export function rake(state, length, now) {
  const today = dayKey(now);
  if (state.rake.day !== today) state.rake = { day: today, earned: 0, length: 0 };
  if (state.rake.earned >= RAKE_DAILY_CAP) return 0;
  state.rake.length += length;
  let gained = 0;
  while (state.rake.length >= RAKE_LENGTH_PER_DEW && state.rake.earned < RAKE_DAILY_CAP) {
    state.rake.length -= RAKE_LENGTH_PER_DEW;
    state.rake.earned++;
    state.dew++;
    gained++;
  }
  return gained;
}

export function timeLeft(p, now) {
  const def = PLANTS[p.type];
  if (p.growth >= 1 || def.growMs === 0) return 0;
  const remaining = (1 - p.growth) * def.growMs; // en temps « effectif »
  const boosted = Math.max(0, p.wateredUntil - now);
  if (remaining <= boosted * 2) return remaining / 2;
  return boosted + (remaining - boosted * 2);
}

export function formatDuration(ms) {
  const m = Math.max(1, Math.ceil(ms / MIN));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
}

export function season(t) {
  const m = new Date(t).getMonth();
  if (m >= 2 && m <= 4) return 'printemps';
  if (m >= 5 && m <= 7) return 'ete';
  if (m >= 8 && m <= 10) return 'automne';
  return 'hiver';
}

export function sanitize(raw, now) {
  const base = createState(now);
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return base;
  const s = { ...base, ...raw };
  s.plants = Array.isArray(raw.plants) ? raw.plants.filter((p) => p && PLANTS[p.type]) : [];
  s.strokes = Array.isArray(raw.strokes) ? raw.strokes : [];
  s.hintsDone = Array.isArray(raw.hintsDone) ? raw.hintsDone : [];
  if (!BIOMES[s.biome]) s.biome = 'zen';
  s.seeds = raw.seeds && typeof raw.seeds === 'object' ? Object.fromEntries(Object.entries(raw.seeds).filter(([k, v]) => PLANTS[k] && v > 0)) : {};
  if (!raw.rake || typeof raw.rake !== 'object') s.rake = base.rake;
  if (!Number.isFinite(s.dew) || s.dew < 0) s.dew = base.dew;
  if (!Number.isFinite(s.lastTick)) s.lastTick = now;
  s.nextId = Math.max(s.nextId || 1, ...s.plants.map((p) => p.id + 1), 1);
  if (!raw.collection || typeof raw.collection !== 'object') {
    // anciennes sauvegardes : on reconstruit la collection à partir du jardin actuel
    s.collection = {};
    for (const p of s.plants) {
      const e = entry(s, p.type);
      e.planted++;
      if (p.growth >= 1) e.matured++;
    }
  }
  return s;
}
