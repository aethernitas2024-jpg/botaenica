// Rendu du jardin sur canvas 2D : ciel vivant, montagnes, sable ratissé, étang, plantes procédurales.
import { PLANTS, MAX_DROPS, BIOMES } from './logic.js';

export const HORIZON = 0.4;
export const SLOTS = [
  { id: 's1', kind: 'land', x: 0.8, y: 0.49 },
  { id: 's2', kind: 'land', x: 0.13, y: 0.5 },
  { id: 's3', kind: 'land', x: 0.47, y: 0.52 },
  { id: 's4', kind: 'land', x: 0.86, y: 0.67 },
  { id: 's5', kind: 'land', x: 0.67, y: 0.77 },
  { id: 's6', kind: 'land', x: 0.15, y: 0.83 },
  { id: 's7', kind: 'land', x: 0.36, y: 0.865 },
  { id: 's8', kind: 'land', x: 0.86, y: 0.875 },
  { id: 's9', kind: 'land', x: 0.3, y: 0.545 },
  { id: 's10', kind: 'land', x: 0.64, y: 0.6 },
  { id: 's11', kind: 'land', x: 0.5, y: 0.79 },
  { id: 's12', kind: 'land', x: 0.63, y: 0.475 },
  { id: 's13', kind: 'land', x: 0.95, y: 0.56 },
  { id: 's14', kind: 'land', x: 0.06, y: 0.575 },
  { id: 's15', kind: 'land', x: 0.75, y: 0.685 },
  { id: 's16', kind: 'land', x: 0.29, y: 0.76 },
  { id: 's17', kind: 'land', x: 0.97, y: 0.78 },
  { id: 'w1', kind: 'water', x: 0.22, y: 0.655 },
  { id: 'w2', kind: 'water', x: 0.45, y: 0.672 },
  { id: 'w3', kind: 'water', x: 0.33, y: 0.695 },
  { id: 'w4', kind: 'water', x: 0.12, y: 0.668 },
];

// Les autres lieux : un décor peint, un horizon (où commence le sol) et leurs emplacements.
// stand = présentoir à bonsaï sous la plante ; scale = taille de la plante (les arbres y deviennent des bonsaïs).
const B = (biome, list, extra = {}) => list.map(([x, y, kind = 'land'], i) => ({ id: `${biome}:${i + 1}`, kind, x, y, allow: BIOMES[biome].allow, ...extra }));
export const BIOME_VIEW = {
  prairie: { img: 'lieu_prairie', horizon: 0.5, outdoor: true, slots: B('prairie', [[0.14, 0.56], [0.38, 0.55], [0.62, 0.56], [0.86, 0.57], [0.25, 0.645], [0.5, 0.65], [0.75, 0.655], [0.12, 0.735], [0.38, 0.745], [0.63, 0.75], [0.88, 0.74], [0.25, 0.835], [0.5, 0.845], [0.76, 0.85]], { zoom: 1.55 }) },
  serre: { img: 'lieu_serre', horizon: 0.63, slots: B('serre', [[0.16, 0.67], [0.39, 0.665], [0.61, 0.665], [0.84, 0.67], [0.3, 0.745, 'water'], [0.7, 0.745, 'water'], [0.13, 0.79], [0.5, 0.78], [0.87, 0.79], [0.3, 0.86], [0.7, 0.86]], { zoom: 1.4 }) },
  cactus: { img: 'lieu_cactus', horizon: 0.52, outdoor: true, slots: B('cactus', [[0.14, 0.57], [0.38, 0.56], [0.62, 0.57], [0.86, 0.58], [0.26, 0.655], [0.5, 0.66], [0.74, 0.655], [0.13, 0.745], [0.38, 0.755], [0.62, 0.76], [0.87, 0.75], [0.26, 0.845], [0.53, 0.855], [0.8, 0.85]], { zoom: 1.5 }) },
  bonsai: { img: 'lieu_bonsai', horizon: 0.62, slots: B('bonsai', [[0.2, 0.68], [0.5, 0.67], [0.8, 0.68], [0.33, 0.765], [0.67, 0.765], [0.18, 0.855], [0.5, 0.86], [0.82, 0.855]], { stand: true, scale: 0.55, zoom: 1.15 }) },
};
for (const sl of SLOTS) sl.allow = null;
export const ALL_SLOTS = [...SLOTS, ...Object.values(BIOME_VIEW).flatMap((b) => b.slots)];
export const slotById = (id) => ALL_SLOTS.find((x) => x.id === id);
export const slotsOf = (biome) => (biome === 'zen' ? SLOTS : BIOME_VIEW[biome].slots);
const POND = { x: 0.33, y: 0.66, rx: 0.27, ry: 0.058 };
const ROCKS = [
  { x: 0.6, y: 0.88, r: 0.048, seed: 3 },
  { x: 0.67, y: 0.9, r: 0.026, seed: 7 },
  { x: 0.78, y: 0.575, r: 0.038, seed: 11 },
];

// ---------- utilitaires ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function keyframes(keys, h) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, v0] = keys[i];
    const [h1, v1] = keys[i + 1];
    if (h >= h0 && h <= h1) {
      const t = smooth((h - h0) / (h1 - h0 || 1));
      return Array.isArray(v0) ? mix(v0, v1, t) : lerp(v0, v1, t);
    }
  }
  return keys[keys.length - 1][1];
}

const SKY_TOP = [[0, '#060a1d'], [5, '#10163a'], [6.5, '#4f63a0'], [8, '#5f9ad6'], [12, '#4f92d6'], [17, '#6290c8'], [19, '#38407e'], [20.5, '#121842'], [24, '#060a1d']].map(([h, c]) => [h, hex(c)]);
const SKY_BOT = [[0, '#171f4a'], [5, '#3e3566'], [6.5, '#f7a77f'], [8, '#d9ebf4'], [12, '#cde6f6'], [17, '#f4d7a6'], [19, '#f47e57'], [20.5, '#43356a'], [24, '#171f4a']].map(([h, c]) => [h, hex(c)]);
const NIGHT = [[0, 1], [5, 1], [7, 0], [18.5, 0], [21, 1], [24, 1]];
const WARM = [[0, 0], [5.5, 0], [6.6, 1], [8.5, 0], [17, 0], [19.2, 1], [20.8, 0], [24, 0]];

export function skyAt(h) {
  return { top: keyframes(SKY_TOP, h), bot: keyframes(SKY_BOT, h), night: keyframes(NIGHT, h), warm: keyframes(WARM, h) };
}

// ---------- sprites peints (générés puis détourés, voir scripts/sprites.py) ----------
const SPR = {};
const GALETS = ['galet_1', 'galet_2', 'galet_3', 'galet_4', 'galet_5', 'galet_6'];
function load(n) {
  const im = new Image();
  im.src = `sprites/${n}.webp`;
  SPR[n] = im;
  return im;
}
for (const n of ['pousse', 'mousse_jeune', 'mousse_adulte', 'bambou_jeune', 'bambou_adulte', 'lotus_jeune', 'lotus_adulte', 'erable_jeune', 'erable_adulte', 'cerisier_jeune', 'cerisier_adulte', 'pin_jeune', 'pin_adulte', 'lanterne', 'rocher_a', 'rocher_b', 'montagnes', 'mur', 'sable', ...GALETS]) {
  load(n);
}
// Les images des 200 espèces de collection ne sont chargées qu'au moment où l'une d'elles est plantée.
const ready = (n) => {
  const im = SPR[n] || load(n);
  return im.complete && im.naturalWidth > 0;
};

// Décor peint recoloré selon l'heure : voile vers la couleur du ciel, puis assombrissement de nuit.
// Le résultat est mis en cache et ne change que quand la teinte bouge vraiment.
const tintCache = new Map();
function tinted(name, color, amount, dark) {
  const key = `${color.map((v) => v >> 3).join(',')}|${Math.round(amount * 30)}|${Math.round(dark * 30)}`;
  const hit = tintCache.get(name);
  if (hit && hit.key === key) return hit.cv;
  const im = SPR[name];
  const cv = hit ? hit.cv : document.createElement('canvas');
  cv.width = im.naturalWidth;
  cv.height = im.naturalHeight;
  const x = cv.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = `rgba(${color[0] | 0},${color[1] | 0},${color[2] | 0},${amount})`;
  x.fillRect(0, 0, cv.width, cv.height);
  if (dark > 0) {
    x.fillStyle = `rgba(8,10,32,${dark})`;
    x.fillRect(0, 0, cv.width, cv.height);
  }
  tintCache.set(name, { key, cv });
  return cv;
}
// Taille cible en unités u : h = hauteur (arbres), w = largeur (plantes basses).
// blend = plage de croissance où le sprite adulte remplace le jeune.
const LOOK = {
  erable: { young: 'erable_jeune', adult: 'erable_adulte', yh: 0.72, ah: 1.0, sway: 0.6 },
  cerisier: { young: 'cerisier_jeune', adult: 'cerisier_adulte', yh: 0.72, ah: 1.05, sway: 0.6 },
  pin: { young: 'pin_jeune', adult: 'pin_adulte', yh: 0.6, ah: 0.88, sway: 0.3 },
  bambou: { young: 'bambou_jeune', adult: 'bambou_adulte', yh: 0.5, ah: 1.25, sway: 1.2 },
  mousse: { young: 'mousse_jeune', adult: 'mousse_adulte', yw: 0.34, aw: 0.4, sprout: false, sway: 0 },
  lotus: { young: 'lotus_jeune', adult: 'lotus_adulte', yw: 0.32, aw: 0.34, sprout: false, sway: 0, blend: [0.55, 0.8] },
  lanterne: { adult: 'lanterne', ah: 0.62, sway: 0 },
};
// Gabarit des espèces de collection selon leur famille : hauteur et largeur maximales en unités u.
const GABARITS = {
  arbre: { h: 1.0, w: 1.1, sway: 0.6 },
  arbuste: { h: 0.55, w: 0.62, sway: 0.5 },
  fleur: { h: 0.42, w: 0.44, sway: 0.9 },
  fougere: { h: 0.36, w: 0.46, sway: 0.4 },
  succulente: { h: 0.4, w: 0.46, sway: 0 },
  aquatique: { h: 0.34, w: 0.46, sway: 0 },
};
export const sway = (type) => LOOK[type]?.sway ?? GABARITS[PLANTS[type]?.size]?.sway ?? 0;

// Espèce de collection : une pousse, puis la plante adulte qui grandit jusqu'à son gabarit.
function collectionPlant(c, p, u) {
  const name = `c_${p.type}`;
  if (!ready(name) || !ready('pousse')) return null;
  const g = p.growth;
  if (g < 0.12 && PLANTS[p.type].where === 'land') return drawSprite(c, 'pousse', u * (0.05 + 0.08 * g / 0.12), false, 1);
  const G = GABARITS[PLANTS[p.type].size];
  const im = SPR[name];
  const k = 0.3 + 0.7 * clamp((g - 0.12) / 0.88);
  const h = Math.min(G.h * u, (G.w * u * im.naturalHeight) / im.naturalWidth) * k;
  return drawSprite(c, name, h, false, 1);
}

function drawSprite(c, name, size, byWidth, alpha) {
  const im = SPR[name];
  const ratio = im.naturalHeight / im.naturalWidth;
  const w = byWidth ? size : size / ratio;
  const h = byWidth ? size * ratio : size;
  if (alpha <= 0.01) return h;
  c.globalAlpha = alpha;
  c.drawImage(im, -w / 2, -h * 0.98, w, h);
  c.globalAlpha = 1;
  return h;
}

// Dessine la plante avec ses sprites ; renvoie sa hauteur, ou null si les images ne sont pas encore chargées.
function spritePlant(c, p, u) {
  if (PLANTS[p.type].collection) return collectionPlant(c, p, u);
  const L = LOOK[p.type];
  if (!L || ![L.young, L.adult, 'pousse'].filter(Boolean).every(ready)) return null;
  const g = p.growth;
  if (!L.young) return drawSprite(c, L.adult, L.ah * u, false, 1);
  const sprout = L.sprout !== false;
  if (sprout && g < 0.12) return drawSprite(c, 'pousse', u * (0.05 + 0.08 * g / 0.12), false, 1);
  const [b0, b1] = L.blend || [0.45, 0.8];
  const t = smooth(clamp((g - b0) / (b1 - b0)));
  const k = sprout ? clamp((g - 0.12) / (b1 - 0.12)) : clamp(g / b1);
  const byW = L.aw !== undefined;
  const ySize = (byW ? L.yw : L.yh) * u * (0.35 + 0.65 * k);
  const aSize = (byW ? L.aw : L.ah) * u * (0.72 + 0.28 * clamp((g - b0) / (1 - b0)));
  let top = 0;
  if (t < 1) top = drawSprite(c, L.young, ySize, byW, t < 0.5 ? 1 : 2 - 2 * t);
  if (t > 0) top = Math.max(top * (1 - t), drawSprite(c, L.adult, aSize, byW, t));
  return top;
}

// ---------- modèles de plantes (secours tant que les sprites chargent) ----------
const TREES = {
  erable: { maxD: 6, spread: 0.62, ratio: 0.74, trunk: 0.3, width: 0.05, tri: 0.25, leafR: 0.075, bark: '#4b3426', palette: ['#b3261e', '#d9432a', '#ec6a2e', '#f39a3c', '#c2341f'], flat: 0 },
  cerisier: { maxD: 6, spread: 0.78, ratio: 0.72, trunk: 0.26, width: 0.055, tri: 0.3, leafR: 0.08, bark: '#3f2d2b', palette: ['#f9d3df', '#f4b3c8', '#fde8ef', '#ea94b2', '#f7c1d3'], flat: 0.25 },
  pin: { maxD: 5, spread: 0.95, ratio: 0.7, trunk: 0.28, width: 0.065, tri: 0.2, leafR: 0.11, bark: '#3a2c22', palette: ['#2d5a39', '#3c7448', '#25472f', '#4a8653'], flat: 0.55 },
};

function genTree(kind, seed) {
  const cfg = TREES[kind];
  const r = rng(Math.floor(seed * 1e6) + 17);
  const segs = [];
  const leaves = [];
  function br(x, y, a, len, w, d) {
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    const bend = (r() - 0.5) * len * 0.35;
    segs.push({ x, y, x2, y2, cx: (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, cy: (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend, w, d });
    if (d >= cfg.maxD) {
      leaves.push({ x: x2, y: y2, d, r: cfg.leafR * (0.7 + r() * 0.6), c: r(), o: r() });
      return;
    }
    if (d >= cfg.maxD - 2 && r() < 0.6) leaves.push({ x: x2, y: y2, d, r: cfg.leafR * (0.6 + r() * 0.4), c: r(), o: r() });
    const n = r() < cfg.tri ? 3 : 2;
    for (let i = 0; i < n; i++) {
      let na = a + (i - (n - 1) / 2) * cfg.spread * (0.7 + r() * 0.6) + (r() - 0.5) * 0.35;
      if (cfg.flat) na = -Math.PI / 2 + (na + Math.PI / 2) * (1 + cfg.flat);
      na = clamp(na, -Math.PI + 0.12, -0.12);
      br(x2, y2, na, len * (cfg.ratio + (r() - 0.5) * 0.12), w * 0.68, d + 1);
    }
  }
  br(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.25, cfg.trunk, cfg.width, 0);
  let minY = 0;
  for (const s of segs) minY = Math.min(minY, s.y2);
  for (const l of leaves) minY = Math.min(minY, l.y - l.r);
  const k = 1 / -minY;
  for (const s of segs) { s.x *= k; s.y *= k; s.x2 *= k; s.y2 *= k; s.cx *= k; s.cy *= k; s.w *= k; }
  for (const l of leaves) { l.x *= k; l.y *= k; l.r *= k; }
  return { cfg, segs, leaves };
}

function genBamboo(seed) {
  const r = rng(Math.floor(seed * 1e6) + 5);
  const n = 4 + Math.floor(r() * 3);
  const stalks = [];
  for (let i = 0; i < n; i++) {
    stalks.push({ dx: (i - (n - 1) / 2) * 0.07 + (r() - 0.5) * 0.04, h: 0.75 + r() * 0.3, w: 0.022 + r() * 0.01, lean: (r() - 0.5) * 0.12, tone: r(), leaves: Array.from({ length: 6 }, () => ({ at: 0.45 + r() * 0.55, side: r() < 0.5 ? -1 : 1, a: 0.3 + r() * 0.6, len: 0.1 + r() * 0.08 })) });
  }
  return { stalks };
}

function genMoss(seed) {
  const r = rng(Math.floor(seed * 1e6) + 9);
  return Array.from({ length: 14 }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return { x: Math.cos(a) * d * 0.2, y: Math.sin(a) * d * 0.05 - 0.02, r: 0.04 + r() * 0.05, c: r(), f: r() };
  });
}

// ---------- scène ----------
export function createScene(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, DPR = 1;
  let sand = null, sctx = null, grain = null;
  let mountains = [];
  let hedge = [];
  let stars = [];
  let rim = [];
  const models = new Map();
  const caches = new Map();
  const ripples = [];
  const particles = [];
  const fireflies = [];
  const splashes = [];
  let koi = [];
  let koiTarget = null;
  let dropHits = [];
  let plantHits = [];
  let rakeLast = null;
  let rakePrev = null;
  let currentStroke = null;
  let lastStrokes = [];
  SPR.sable.addEventListener('load', () => { grain = null; if (W > 1) bakeSand(lastStrokes); });
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.06 + Math.random() * 0.2, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006, seed: i }));

  let hz = HORIZON; // horizon du lieu affiché
  const depth = (yN) => 0.55 + 0.75 * (yN - hz) / (1 - hz);
  const unit = (yN) => Math.min(W, H * 0.6) * 0.43 * depth(yN);
  const hy = () => H * HORIZON;

  function resize(strokes) {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    caches.clear();
    buildBackdrop();
    bakeSand(strokes);
    if (!koi.length) koi = Array.from({ length: 4 }, (_, i) => ({ u: Math.random() - 0.5, v: Math.random() - 0.5, a: Math.random() * 6.28, sp: 0.06 + Math.random() * 0.04, t: Math.random() * 10, col: i % 2 ? '#f26b2a' : '#f4f0e8', spot: i % 2 ? '#f4f0e8' : '#e0442a', tx: 0, ty: 0, next: 0 }));
  }

  function buildBackdrop() {
    const layers = [
      { base: 0.27, amp: 0.07, seed: 1, col: '#8796b8', mixT: 0.45 },
      { base: 0.31, amp: 0.05, seed: 2, col: '#5d6f93', mixT: 0.6 },
      { base: 0.35, amp: 0.035, seed: 3, col: '#3e5865', mixT: 0.72 },
    ];
    mountains = layers.map((L) => {
      const r = rng(L.seed * 31);
      const waves = Array.from({ length: 4 }, (_, i) => ({ f: (i + 1) * (1.5 + r() * 2), p: r() * 6.28, a: L.amp / (i + 1) }));
      const pts = [];
      for (let i = 0; i <= 80; i++) {
        const x = i / 80;
        let y = L.base;
        for (const w of waves) y -= Math.abs(Math.sin(x * w.f + w.p)) * w.a;
        pts.push([x * W, y * H]);
      }
      return { pts, col: hex(L.col), mixT: L.mixT };
    });
    const r = rng(77);
    hedge = [];
    for (let x = -10; x < W + 20; x += 8 + r() * 14) hedge.push({ x, h: 0.018 + r() * 0.03, w: 10 + r() * 16 });
    stars = Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * hy() * 0.85, r: 0.4 + r() * 1.2, t: r() * 6.28 }));
    rim = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + r() * 0.1;
      rim.push({ a, s: 0.6 + r() * 0.7, t: r() });
    }
    rim.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  }

  function makeGrain() {
    const g = document.createElement('canvas');
    g.width = g.height = 160;
    const c = g.getContext('2d');
    c.fillStyle = '#e7dcc4';
    c.fillRect(0, 0, 160, 160);
    const r = rng(5);
    for (let i = 0; i < 2600; i++) {
      const v = r();
      c.fillStyle = v < 0.5 ? `rgba(150,125,90,${0.12 + r() * 0.18})` : `rgba(255,252,240,${0.2 + r() * 0.3})`;
      c.fillRect(r() * 160, r() * 160, 1, 1);
    }
    return g;
  }

  function groove(c, x1, y1, x2, y2, s) {
    c.strokeStyle = 'rgba(120,96,64,0.36)';
    c.lineWidth = 1.8 * s;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = 'rgba(255,252,242,0.7)';
    c.lineWidth = 1 * s;
    c.beginPath(); c.moveTo(x1, y1 + 1.3 * s); c.lineTo(x2, y2 + 1.3 * s); c.stroke();
  }

  // Texture de sable peinte, réduite pour un grain fin ; motif généré en secours.
  function sandPattern() {
    const pat = sctx.createPattern(grain, 'repeat');
    if (grain === SPR.sable && pat.setTransform) pat.setTransform(new DOMMatrix().scale(0.42));
    return pat;
  }

  function bakeSand(strokes = []) {
    sand = document.createElement('canvas');
    sand.width = Math.round(W * DPR);
    sand.height = Math.round(H * DPR);
    sctx = sand.getContext('2d');
    sctx.scale(DPR, DPR);
    lastStrokes = strokes;
    if (!grain) grain = ready('sable') ? SPR.sable : makeGrain();
    const pat = sandPattern();
    sctx.fillStyle = pat;
    sctx.fillRect(0, hy(), W, H - hy());
    sctx.lineCap = 'round';
    // lignes parallèles qui se resserrent vers l'horizon
    let y = hy() + 6;
    while (y < H) {
      const yN = y / H;
      const s = depth(yN);
      sctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const yy = y + Math.sin(x * 0.012 + y * 0.03) * 1.5 * s;
        if (x === 0) sctx.moveTo(x, yy); else sctx.lineTo(x, yy);
      }
      sctx.strokeStyle = 'rgba(132,104,70,0.38)';
      sctx.lineWidth = 1.4 * s;
      sctx.stroke();
      sctx.translate(0, 1.3 * s);
      sctx.strokeStyle = 'rgba(255,252,242,0.65)';
      sctx.lineWidth = 0.9 * s;
      sctx.stroke();
      sctx.translate(0, -1.3 * s);
      y += 5 + 7 * s;
    }
    // cercles concentriques autour des rochers
    for (const rk of ROCKS) {
      const cx = rk.x * W, cy = rk.y * H, rr = rk.r * W;
      sctx.fillStyle = pat;
      sctx.beginPath(); sctx.ellipse(cx, cy, rr * 3.3, rr * 1.5, 0, 0, Math.PI * 2); sctx.fill();
      for (let k = 1.25; k <= 3.2; k += 0.42) {
        sctx.strokeStyle = 'rgba(132,104,70,0.4)';
        sctx.lineWidth = 1.4;
        sctx.beginPath(); sctx.ellipse(cx, cy, rr * k, rr * k * 0.45, 0, 0, Math.PI * 2); sctx.stroke();
        sctx.strokeStyle = 'rgba(255,252,242,0.7)';
        sctx.lineWidth = 0.9;
        sctx.beginPath(); sctx.ellipse(cx, cy + 1.2, rr * k, rr * k * 0.45, 0, 0, Math.PI * 2); sctx.stroke();
      }
    }
    for (const st of strokes) {
      const pts = st.map(([x, y]) => [x * W, y * H]);
      rakePrev = null;
      for (let i = 1; i < pts.length; i++) rakeSegment(pts[i - 1], pts[i]);
    }
    rakePrev = null;
  }

  function rakeSegment(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const nx = -dy / len, ny = dx / len;
    const s = depth(Math.max(a[1], hy()) / H);
    const gap = 4.6 * s;
    sctx.save();
    sctx.beginPath(); sctx.rect(0, hy(), W, H - hy()); sctx.clip();
    sctx.strokeStyle = sandPattern();
    sctx.lineCap = 'butt';
    sctx.lineWidth = gap * 4 + 6;
    sctx.beginPath(); sctx.moveTo(a[0], a[1]); sctx.lineTo(b[0], b[1]); sctx.stroke();
    sctx.lineCap = 'round';
    const segs = rakePrev ? [rakePrev, [a, b]] : [[a, b]];
    for (const [p, q] of segs) {
      for (const k of [-1.5, -0.5, 0.5, 1.5]) groove(sctx, p[0] + nx * gap * k, p[1] + ny * gap * k, q[0] + nx * gap * k, q[1] + ny * gap * k, s);
    }
    sctx.restore();
    rakePrev = [a, b];
  }

  // ---- ratissage interactif ----
  function onSand(x, y) {
    return y > hy() + 4 && !inPond(x, y, 1.08);
  }
  function rakeBegin(x, y) {
    if (y <= hy() + 4) return false;
    rakeLast = [x, y];
    rakePrev = null;
    currentStroke = [[x / W, y / H]];
    return true;
  }
  function rakeMove(x, y) {
    if (!rakeLast) return 0;
    const d = Math.hypot(x - rakeLast[0], y - rakeLast[1]);
    if (d < 6) return 0;
    const b = [x, Math.max(y, hy() + 2)];
    rakeSegment(rakeLast, b);
    rakeLast = b;
    currentStroke.push([+(b[0] / W).toFixed(4), +(b[1] / H).toFixed(4)]);
    return d / W;
  }
  function rakeEnd() {
    const st = currentStroke && currentStroke.length > 1 ? currentStroke : null;
    rakeLast = null;
    rakePrev = null;
    currentStroke = null;
    return st;
  }

  function inPond(x, y, k = 1) {
    const dx = (x - POND.x * W) / (POND.rx * W * k);
    const dy = (y - POND.y * H) / (POND.ry * H * k);
    return dx * dx + dy * dy <= 1;
  }

  function ripple(x, y, big = false) {
    ripples.push({ x, y, t: 0, big });
    koiTarget = { x, y, until: performance.now() + 6000 };
  }

  function splash(x, y) {
    for (let i = 0; i < 6; i++) splashes.push({ x: x + (Math.random() - 0.5) * 30, y: y - 10 - Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 60, life: 0.6 + Math.random() * 0.4 });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 90;
      particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.8 + Math.random() * 0.5, age: 0, col: color });
    }
  }

  // ---- dessin des plantes ----
  function model(p) {
    let m = models.get(p.id);
    if (!m) {
      if (TREES[p.type]) m = genTree(p.type, p.seed);
      else if (p.type === 'bambou') m = genBamboo(p.seed);
      else if (p.type === 'mousse') m = genMoss(p.seed);
      else m = {};
      models.set(p.id, m);
    }
    return m;
  }

  function sprout(c, u, g) {
    const k = clamp(g / 0.12);
    c.fillStyle = 'rgba(110,84,58,0.55)';
    c.beginPath(); c.ellipse(0, 0, u * 0.09, u * 0.025, 0, 0, Math.PI * 2); c.fill();
    if (k <= 0.05) return;
    const h = u * 0.12 * k;
    c.strokeStyle = '#5f8f3e';
    c.lineWidth = Math.max(1, u * 0.012);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(u * 0.02, -h * 0.5, 0, -h); c.stroke();
    c.fillStyle = '#7fb24a';
    for (const sd of [-1, 1]) {
      c.save(); c.translate(0, -h); c.rotate(sd * 0.9);
      c.beginPath(); c.ellipse(0, -u * 0.03 * k, u * 0.015 * k + 0.5, u * 0.035 * k + 0.5, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  function drawTreeInto(c, m, u, g) {
    const { cfg, segs, leaves } = m;
    const sc = 0.3 + 0.7 * g;
    const bark = hex(cfg.bark);
    c.lineCap = 'round';
    for (const s of segs) {
      const vis = clamp(g * (cfg.maxD + 1.6) - s.d);
      if (vis <= 0) continue;
      const ex = lerp(s.x, s.x2, vis), ey = lerp(s.y, s.y2, vis);
      const qx = lerp(s.x, s.cx, vis), qy = lerp(s.y, s.cy, vis);
      c.strokeStyle = rgb(mix(bark, [0, 0, 0], 0.1 * s.d / cfg.maxD));
      c.lineWidth = Math.max(0.8, s.w * u * sc * (0.45 + 0.55 * g));
      c.beginPath(); c.moveTo(s.x * u * sc, s.y * u * sc); c.quadraticCurveTo(qx * u * sc, qy * u * sc, ex * u * sc, ey * u * sc); c.stroke();
      if (s.d < 2) {
        c.strokeStyle = rgb(mix(bark, [255, 235, 210], 0.18), 0.6);
        c.lineWidth *= 0.3;
        c.beginPath(); c.moveTo((s.x - s.w * 0.25) * u * sc, s.y * u * sc); c.quadraticCurveTo((qx - s.w * 0.25) * u * sc, qy * u * sc, (ex - s.w * 0.25) * u * sc, ey * u * sc); c.stroke();
      }
    }
    const lf = clamp((g - 0.3) / 0.7);
    if (lf <= 0) return;
    const pal = cfg.palette.map(hex);
    const flat = cfg === TREES.pin;
    for (const pass of [0, 1, 2]) {
      for (const l of leaves) {
        const vis = clamp(g * (cfg.maxD + 1.6) - l.d);
        if (vis < 1) continue;
        const rr = l.r * u * sc * lf * (pass === 2 ? 0.55 : 1);
        const col = pal[Math.floor(l.c * pal.length)];
        const ox = (l.o - 0.5) * rr * 0.8;
        if (pass === 0) c.fillStyle = rgb(mix(col, [20, 10, 20], 0.35));
        else if (pass === 1) c.fillStyle = rgb(col);
        else c.fillStyle = rgb(mix(col, [255, 250, 235], 0.35), 0.85);
        const dy = pass === 0 ? rr * 0.25 : pass === 2 ? -rr * 0.3 : 0;
        c.beginPath();
        if (flat) c.ellipse(l.x * u * sc + ox, l.y * u * sc + dy, rr * 1.6, rr * 0.6, 0, 0, Math.PI * 2);
        else {
          c.arc(l.x * u * sc + ox, l.y * u * sc + dy, rr, 0, Math.PI * 2);
          c.arc(l.x * u * sc + ox + rr * 0.7, l.y * u * sc + dy + rr * 0.2, rr * 0.75, 0, Math.PI * 2);
        }
        c.fill();
      }
    }
  }

  function drawBambooInto(c, m, u, g) {
    for (const st of m.stalks) {
      const h = st.h * u * clamp(g * 1.15);
      const w = Math.max(1.5, st.w * u * (0.5 + 0.5 * g));
      const base = mix(hex('#5c8a3a'), hex('#8db352'), st.tone);
      const x0 = st.dx * u;
      const x1 = x0 + st.lean * u;
      const nodes = Math.max(2, Math.round(h / (u * 0.09)));
      for (let i = 0; i < nodes; i++) {
        const t0 = i / nodes, t1 = (i + 1) / nodes;
        const ax = lerp(x0, x1, t0), ay = -h * t0, bx = lerp(x0, x1, t1), by = -h * t1;
        const gr = c.createLinearGradient(ax - w, 0, ax + w, 0);
        gr.addColorStop(0, rgb(mix(base, [20, 40, 10], 0.4)));
        gr.addColorStop(0.45, rgb(mix(base, [255, 255, 220], 0.25)));
        gr.addColorStop(1, rgb(mix(base, [20, 40, 10], 0.3)));
        c.strokeStyle = gr;
        c.lineWidth = w;
        c.lineCap = 'butt';
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by + 1); c.stroke();
        c.strokeStyle = rgb(mix(base, [40, 60, 20], 0.5));
        c.lineWidth = Math.max(1, w * 0.18);
        c.beginPath(); c.moveTo(bx - w * 0.6, by); c.lineTo(bx + w * 0.6, by); c.stroke();
      }
      if (g < 0.25) continue;
      const lf = clamp((g - 0.25) / 0.6);
      for (const L of st.leaves) {
        if (L.at * clamp(g * 1.15) > clamp(g * 1.15)) continue;
        const px = lerp(x0, x1, L.at), py = -h * L.at;
        c.save(); c.translate(px, py); c.rotate(L.side * (Math.PI / 2 - L.a) );
        c.fillStyle = rgb(mix(base, [40, 90, 30], 0.3), 0.95);
        const ll = L.len * u * lf;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ll * 0.15 * L.side, -ll * 0.5, 0, -ll); c.quadraticCurveTo(-ll * 0.12 * L.side, -ll * 0.5, 0, 0); c.fill();
        c.restore();
      }
    }
  }

  function cached(p, u, draw, boxW, boxH) {
    const key = `${p.type}|${Math.round(p.growth * 120)}|${Math.round(u)}`;
    let e = caches.get(p.id);
    if (e && e.key === key) return e;
    const cw = Math.ceil(u * boxW), ch = Math.ceil(u * boxH);
    const cv = e && e.cv.width === Math.ceil(cw * DPR) && e.cv.height === Math.ceil(ch * DPR) ? e.cv : document.createElement('canvas');
    cv.width = Math.ceil(cw * DPR);
    cv.height = Math.ceil(ch * DPR);
    const c = cv.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.translate(cw / 2, ch - u * 0.04);
    draw(c);
    e = { key, cv, cw, ch, ox: cw / 2, oy: ch - u * 0.04 };
    caches.set(p.id, e);
    return e;
  }

  function drawMoss(c, p, u, t) {
    const m = model(p);
    const g = p.growth;
    if (g < 0.08) return sprout(c, u, g * 1.5);
    const k = Math.pow(clamp(g), 0.6);
    const greens = ['#4f7f35', '#6b9a3f', '#86b14c', '#3e6a2c'].map(hex);
    for (const pass of [0, 1]) {
      for (const b of m) {
        const col = greens[Math.floor(b.c * greens.length)];
        const r = b.r * u * k;
        c.fillStyle = pass ? rgb(mix(col, [230, 255, 190], 0.25)) : rgb(mix(col, [10, 30, 10], 0.35));
        c.beginPath(); c.ellipse(b.x * u * k, b.y * u * k - (pass ? r * 0.25 : 0), r * (pass ? 0.75 : 1), r * (pass ? 0.5 : 0.62), 0, 0, Math.PI * 2); c.fill();
      }
    }
    if (g >= 1) {
      for (const b of m) {
        if (b.f > 0.55) continue;
        c.fillStyle = `rgba(255,250,240,${0.6 + 0.3 * Math.sin(t * 2 + b.f * 10)})`;
        c.beginPath(); c.arc(b.x * u, b.y * u - b.r * u * 0.5, Math.max(1, u * 0.008), 0, Math.PI * 2); c.fill();
      }
    }
  }

  function drawLotus(c, p, u, t) {
    const g = p.growth;
    const r = rng(Math.floor(p.seed * 1e6));
    const pads = 3;
    for (let i = 0; i < pads; i++) {
      const a = r() * 6.28;
      const d = i === 0 ? 0 : 0.09 + r() * 0.05;
      const pr = (0.06 + r() * 0.03) * u * clamp(g * 2.2);
      if (pr < 0.5) continue;
      const x = Math.cos(a) * d * u, y = Math.sin(a) * d * u * 0.4 + Math.sin(t * 0.8 + i) * 0.6;
      c.fillStyle = '#2f6b3c';
      c.beginPath(); c.ellipse(x, y + pr * 0.08, pr, pr * 0.42, 0, 0.35 + a, Math.PI * 2 - 0.1 + a); c.lineTo(x, y + pr * 0.08); c.fill();
      c.fillStyle = '#4f9a52';
      c.beginPath(); c.ellipse(x, y, pr, pr * 0.42, 0, 0.35 + a, Math.PI * 2 - 0.1 + a); c.lineTo(x, y); c.fill();
    }
    if (g < 0.55) return;
    const open = clamp((g - 0.75) / 0.25);
    const bud = clamp((g - 0.55) / 0.2);
    const fr = u * 0.07 * (0.5 + 0.5 * bud);
    const petals = 9;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI - Math.PI;
        const spread = lerp(0.15, 1, open) * (layer ? 0.6 : 1);
        c.save();
        c.translate(0, -fr * 0.2);
        c.rotate((a + Math.PI / 2) * spread);
        const gr = c.createLinearGradient(0, 0, 0, -fr);
        gr.addColorStop(0, layer ? '#fbe3ec' : '#f4a9c4');
        gr.addColorStop(1, layer ? '#ffffff' : '#e86a98');
        c.fillStyle = gr;
        c.beginPath(); c.ellipse(0, -fr * 0.5, fr * 0.22, fr * 0.55, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    if (open > 0.3) {
      c.fillStyle = '#f6d34a';
      c.beginPath(); c.ellipse(0, -fr * 0.35, fr * 0.18, fr * 0.09, 0, 0, Math.PI * 2); c.fill();
    }
  }

  function drawLantern(c, u, night) {
    const s = u * 0.55;
    const stone = (k) => {
      const g = c.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
      g.addColorStop(0, rgb(mix(hex('#8e8b84'), [30, 30, 40], 0.2 + k)));
      g.addColorStop(0.4, rgb(mix(hex('#b9b5ab'), [30, 30, 40], k)));
      g.addColorStop(1, rgb(mix(hex('#6e6b66'), [30, 30, 40], 0.25 + k)));
      return g;
    };
    c.fillStyle = stone(0.1);
    c.beginPath(); c.ellipse(0, 0, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(-s * 0.26, -s * 0.12, s * 0.52, s * 0.12);
    c.fillStyle = stone(0);
    c.fillRect(-s * 0.09, -s * 0.5, s * 0.18, s * 0.4);
    c.fillRect(-s * 0.22, -s * 0.56, s * 0.44, s * 0.07);
    c.fillStyle = stone(0.05);
    c.fillRect(-s * 0.17, -s * 0.8, s * 0.34, s * 0.25);
    const glow = 0.25 + 0.75 * night;
    c.fillStyle = `rgba(255,${190 + 40 * glow | 0},110,${0.35 + 0.6 * glow})`;
    c.fillRect(-s * 0.09, -s * 0.76, s * 0.18, s * 0.16);
    c.fillStyle = stone(0.15);
    c.beginPath();
    c.moveTo(-s * 0.42, -s * 0.8); c.quadraticCurveTo(-s * 0.2, -s * 0.86, -s * 0.12, -s * 1.0);
    c.lineTo(s * 0.12, -s * 1.0); c.quadraticCurveTo(s * 0.2, -s * 0.86, s * 0.42, -s * 0.8);
    c.lineTo(s * 0.45, -s * 0.76); c.lineTo(-s * 0.45, -s * 0.76); c.closePath(); c.fill();
    c.fillStyle = stone(0);
    c.beginPath(); c.arc(0, -s * 1.04, s * 0.06, 0, Math.PI * 2); c.fill();
  }

  function plantTop(p, u) {
    const g = p.growth;
    switch (p.type) {
      case 'mousse': return u * 0.14;
      case 'lotus': return u * 0.16;
      case 'lanterne': return u * 0.6;
      case 'bambou': return u * 0.95 * clamp(g * 1.15);
      default: return u * (0.15 + 0.85 * g) * (0.3 + 0.7 * g) + u * 0.05;
    }
  }

  // Meuble sous un emplacement de lieu : présentoir à bonsaï, ou bassin de pierre pour les aquatiques de la serre.
  // Renvoie de combien la plante doit être surélevée.
  function furniture(slot, x, y) {
    const u0 = unit(slot.y);
    if (slot.stand && ready('presentoir')) {
      const im = SPR.presentoir, w = u0 * 0.5, h = w * im.naturalHeight / im.naturalWidth;
      ctx.fillStyle = 'rgba(20,12,6,0.28)';
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.55, w * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(im, x - w / 2, y - h * 0.98, w, h);
      return h * 0.8;
    }
    if (slot.kind === 'water' && slot.allow && ready('bassin')) {
      const im = SPR.bassin, w = u0 * 0.62, h = w * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, x - w / 2, y - h * 0.75, w, h);
      return h * 0.3;
    }
    return 0;
  }

  function drawPlant(p, slot, t, night) {
    const x = slot.x * W;
    const lift = slot.allow ? furniture(slot, x, slot.y * H) : 0;
    const y = slot.y * H - lift;
    const cat = PLANTS[p.type].cat;
    const u = unit(slot.y) * (slot.zoom || 1) * (slot.scale ? (cat === 'arbre' ? slot.scale : cat === 'arbuste' ? 0.72 : 1) : 1);
    const swayAngle = Math.sin(t * 0.7 + p.seed * 20) * 0.025 + Math.sin(t * 1.9 + p.seed * 7) * 0.008;
    if (p.type !== 'lotus') {
      ctx.fillStyle = 'rgba(60,45,30,0.2)';
      const sw = p.type === 'lanterne' ? 0.2 : p.type === 'mousse' ? 0.19 : 0.08 + 0.25 * p.growth;
      ctx.beginPath(); ctx.ellipse(x + u * 0.04, y + u * 0.01, u * sw, u * sw * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swayAngle * sway(p.type));
    let top = spritePlant(ctx, p, u);
    if (top !== null) {
      ctx.restore();
      plantHits.push({ id: p.id, x0: x - u * 0.32, x1: x + u * 0.32, y0: y - Math.max(top, u * 0.2), y1: y + u * 0.06, x, y, u, top });
      return;
    }
    ctx.rotate(-swayAngle * sway(p.type));
    top = plantTop(p, u);
    plantHits.push({ id: p.id, x0: x - u * 0.32, x1: x + u * 0.32, y0: y - Math.max(top, u * 0.2), y1: y + u * 0.06, x, y, u, top });
    if (PLANTS[p.type].collection) sprout(ctx, u, Math.min(p.growth, 0.12)); // image pas encore chargée
    else if (p.type === 'mousse') drawMoss(ctx, p, u, t);
    else if (p.type === 'lotus') drawLotus(ctx, p, u, t);
    else if (p.type === 'lanterne') drawLantern(ctx, u, night);
    else if (p.growth < 0.1 && p.type !== 'bambou') sprout(ctx, u, p.growth);
    else {
      const m = model(p);
      const isTree = !!TREES[p.type];
      const e = cached(p, u, (c) => (isTree ? drawTreeInto(c, m, u, p.growth) : drawBambooInto(c, m, u, p.growth)), isTree ? 1.9 : 1.1, isTree ? 1.15 : 1.15);
      ctx.rotate(swayAngle * (isTree ? 0.6 : 1.4));
      ctx.drawImage(e.cv, -e.ox, -e.oy, e.cw, e.ch);
    }
    ctx.restore();
  }

  // ---- boucle de dessin ----
  function draw(state, info) {
    const { t, dt, hour, season, selectedSlots, highlightId, now } = info;
    const sky = skyAt(hour);
    const night = sky.night;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    plantHits = [];
    dropHits = [];
    if (info.biome && info.biome !== 'zen') { drawBiome(state, info, sky); return; }
    hz = HORIZON;
    const HY = hy();

    // ciel
    const sg = ctx.createLinearGradient(0, 0, 0, HY);
    sg.addColorStop(0, rgb(sky.top));
    sg.addColorStop(1, rgb(sky.bot));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, HY + 2);
    if (night > 0.02) {
      for (const s of stars) {
        ctx.fillStyle = `rgba(255,255,240,${night * (0.45 + 0.55 * Math.sin(t * 1.3 + s.t)) * 0.9})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // soleil / lune
    const sunT = (hour - 6) / 14;
    if (sunT > -0.05 && sunT < 1.05) {
      const sx = lerp(W * 0.08, W * 0.92, sunT), sy = HY * (0.95 - Math.sin(clamp(sunT) * Math.PI) * 0.75);
      const r = Math.min(W, H) * 0.045;
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 6);
      gl.addColorStop(0, `rgba(255,240,200,${0.55 * (1 - night)})`);
      gl.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = gl; ctx.fillRect(sx - r * 6, sy - r * 6, r * 12, r * 12);
      ctx.fillStyle = rgb(mix([255, 250, 230], [255, 150, 90], sky.warm), 1 - night * 0.8);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    const moonH = hour >= 18 ? hour - 18 : hour + 6;
    const moonT = moonH / 12;
    if (night > 0.05 && moonT >= 0 && moonT <= 1) {
      const mx = lerp(W * 0.9, W * 0.1, moonT), my = HY * (0.9 - Math.sin(moonT * Math.PI) * 0.7);
      const r = Math.min(W, H) * 0.035;
      const gl = ctx.createRadialGradient(mx, my, 0, mx, my, r * 5);
      gl.addColorStop(0, `rgba(200,215,255,${0.35 * night})`);
      gl.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(mx - r * 5, my - r * 5, r * 10, r * 10);
      ctx.fillStyle = `rgba(240,240,225,${night})`;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb(mix(sky.top, sky.bot, my / HY), night * 0.9);
      ctx.beginPath(); ctx.arc(mx + r * 0.45, my - r * 0.2, r * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    // nuages
    for (const cl of clouds) {
      cl.x += cl.v * dt * 0.1;
      if (cl.x > 1.3) cl.x = -0.3;
      const cx = cl.x * W, cy = cl.y * HY, s = cl.s * W * 0.12;
      const col = mix([255, 255, 255], [255, 170, 130], sky.warm * 0.8);
      ctx.fillStyle = rgb(mix(col, sky.top, night * 0.8), 0.35 + 0.2 * (1 - night));
      ctx.filter = `blur(${Math.round(s * 0.12)}px)`; // nuages vaporeux plutôt que des ellipses nettes
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.28, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s * 0.5, cy - s * 0.12, s * 0.55, s * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - s * 0.45, cy + s * 0.02, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
    }
    // montagnes
    let wallTop = HY - H * 0.03;
    if (ready('montagnes') && ready('mur')) {
      const im = SPR.montagnes;
      const ratio = im.naturalHeight / im.naturalWidth;
      let dh = HY * 0.62, dw = dh / ratio;
      if (dw < W) { dw = W; dh = W * ratio; }
      const veil = mix(sky.bot, [255, 150, 100], sky.warm * 0.5);
      const cv = tinted('montagnes', veil, 0.18 + 0.3 * sky.warm + 0.1 * night, night * 0.72);
      const wallH = Math.min(H * 0.1, W * 0.26);
      wallTop = HY - wallH * 0.42;
      ctx.drawImage(cv, (W - dw) / 2, wallTop + wallH * 0.1 - dh, dw, dh);
    } else {
      for (const m of mountains) {
        const col = mix(mix(sky.bot, m.col, m.mixT), [8, 10, 30], night * 0.55);
        ctx.fillStyle = rgb(col);
        ctx.beginPath(); ctx.moveTo(0, HY);
        for (const [x, y] of m.pts) ctx.lineTo(x, y);
        ctx.lineTo(W, HY); ctx.closePath(); ctx.fill();
      }
    }
    // brume
    const mist = ctx.createLinearGradient(0, HY * 0.72, 0, HY);
    mist.addColorStop(0, rgb(sky.bot, 0));
    mist.addColorStop(1, rgb(mix(sky.bot, [255, 255, 255], 0.3), 0.55 * (1 - night * 0.5)));
    ctx.fillStyle = mist; ctx.fillRect(0, HY * 0.72, W, HY * 0.28);
    for (let i = 0; i < 3; i++) {
      const mx = ((t * (4 + i * 2) + i * 300) % (W + 400)) - 200;
      const gm = ctx.createRadialGradient(mx, HY * (0.86 + i * 0.03), 0, mx, HY * (0.86 + i * 0.03), W * 0.35);
      gm.addColorStop(0, `rgba(255,255,255,${0.12 * (1 - night * 0.6)})`);
      gm.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gm; ctx.fillRect(mx - W * 0.35, HY * 0.6, W * 0.7, HY * 0.4);
    }
    // haie et mur du jardin
    if (ready('montagnes') && ready('mur')) {
      const im = SPR.mur;
      const wallH = Math.min(H * 0.1, W * 0.26);
      const tw = wallH * im.naturalWidth / im.naturalHeight;
      const cv = tinted('mur', [255, 160, 110], 0.16 * sky.warm, night * 0.78);
      let i = 0;
      for (let x = -tw * 0.3; x < W; x += tw, i++) {
        ctx.save();
        ctx.translate(x + tw / 2, 0);
        if (i % 2) ctx.scale(-1, 1); // une tuile sur deux en miroir : pas de raccord visible
        ctx.drawImage(cv, -tw / 2 - 0.5, HY - wallH + 2, tw + 1, wallH);
        ctx.restore();
      }
    } else {
    ctx.fillStyle = rgb(mix(hex('#2e4a33'), [5, 10, 20], night * 0.6));
    ctx.beginPath(); ctx.moveTo(0, wallTop);
    for (const b of hedge) ctx.arc(b.x, wallTop, b.w * 0.5 + b.h * H * 0.4, Math.PI, 0);
    ctx.lineTo(W, wallTop + 4); ctx.lineTo(0, wallTop + 4); ctx.fill();
    ctx.fillStyle = rgb(mix(hex('#ece4d2'), [30, 32, 55], night * 0.7));
    ctx.fillRect(0, wallTop, W, HY - wallTop);
    ctx.fillStyle = rgb(mix(hex('#cfc5b0'), [20, 22, 45], night * 0.7));
    ctx.fillRect(0, HY - 3, W, 3);
    ctx.fillStyle = rgb(mix(hex('#3a3f47'), [5, 6, 15], night * 0.5));
    ctx.fillRect(-2, wallTop - H * 0.012, W + 4, H * 0.014);
    ctx.fillStyle = rgb(mix(hex('#555b64'), [5, 6, 15], night * 0.5));
    for (let x = 0; x < W; x += 9) ctx.fillRect(x, wallTop - H * 0.012, 4, H * 0.011);
    }

    // sable
    ctx.drawImage(sand, 0, 0, W, H);
    const sh = ctx.createLinearGradient(0, HY, 0, H);
    sh.addColorStop(0, rgb(mix(sky.bot, [120, 130, 150], 0.5), 0.28));
    sh.addColorStop(0.35, 'rgba(0,0,0,0)');
    sh.addColorStop(1, rgb(mix([120, 90, 50], [255, 140, 80], sky.warm), 0.16));
    ctx.fillStyle = sh; ctx.fillRect(0, HY, W, H - HY);

    // étang
    drawPond(sky, t, night);

    // rochers + plantes triés par profondeur
    const items = [];
    for (const rk of ROCKS) items.push({ y: rk.y, rock: rk });
    for (const p of state.plants) {
      const slot = SLOTS.find((s) => s.id === p.slot);
      if (slot) items.push({ y: slot.y, p, slot });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.rock) drawRock(it.rock, night);
      else drawPlant(it.p, it.slot, t, night);
    }

    // emplacements libres en mode plantation
    if (selectedSlots) {
      for (const s of selectedSlots) {
        const u = unit(s.y);
        const pulse = 0.6 + 0.4 * Math.sin(t * 3);
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * pulse + 0.3})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.ellipse(s.x * W, s.y * H, u * 0.18, u * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,255,255,${0.12 * pulse})`;
        ctx.fill();
      }
    }

    // voile de nuit puis lumières
    if (night > 0.01) {
      ctx.fillStyle = `rgba(12,16,48,${0.5 * night})`;
      ctx.fillRect(0, wallTop - H * 0.02, W, H);
    }
    if (sky.warm > 0.01) {
      ctx.fillStyle = `rgba(255,130,70,${0.09 * sky.warm})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.plants) {
      if (p.type !== 'lanterne') continue;
      const slot = SLOTS.find((s) => s.id === p.slot);
      if (!slot) continue;
      const u = unit(slot.y);
      const lx = slot.x * W, ly = slot.y * H - u * 0.55 * 0.68;
      const flick = 0.9 + 0.1 * Math.sin(t * 9 + p.seed * 5) * Math.sin(t * 5.3);
      const R = u * (0.4 + 0.9 * night) * flick;
      const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
      gl.addColorStop(0, `rgba(255,190,90,${(0.15 + 0.45 * night) * flick})`);
      gl.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = gl; ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
    }
    drawFireflies(t, dt, night);
    ctx.globalCompositeOperation = 'source-over';

    drawParticles(state, dt, t, night, season);
    drawDrops(state, t, now);

    if (highlightId) {
      const h = plantHits.find((x) => x.id === highlightId);
      if (h) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, h.u * 0.25, h.u * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(10,10,25,${0.35 + 0.2 * night})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawRock(rk, night) {
    const x = rk.x * W, y = rk.y * H, r = rk.r * W;
    const rr = rng(rk.seed);
    ctx.fillStyle = 'rgba(50,40,30,0.25)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.1, r * 1.25, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    const name = rk.seed === 7 ? 'rocher_b' : 'rocher_a';
    if (ready(name)) {
      ctx.save();
      ctx.translate(x, y + r * 0.15);
      drawSprite(ctx, name, r * 2.4, true, 1);
      ctx.restore();
      return;
    }
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y);
    g.addColorStop(0, '#a29d93');
    g.addColorStop(0.5, '#6f6b66');
    g.addColorStop(1, '#3f3d3c');
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const k = 0.8 + rr() * 0.35;
      const px = x + Math.cos(a) * r * 1.1 * k, py = y + Math.sin(a) * r * 1.2 * k;
      if (i === 0) ctx.moveTo(px, y); else ctx.lineTo(px, py);
    }
    ctx.quadraticCurveTo(x, y + r * 0.35, x - r * 1.1, y);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,160,80,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.85, r * 0.45, r * 0.16, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawPond(sky, t, night) {
    const cx = POND.x * W, cy = POND.y * H, rx = POND.rx * W, ry = POND.ry * H;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    const wg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    wg.addColorStop(0, rgb(mix(sky.bot, hex('#2c7a86'), 0.45)));
    wg.addColorStop(0.5, rgb(mix(hex('#0f4a57'), [5, 8, 25], night * 0.6)));
    wg.addColorStop(1, rgb(mix(hex('#15606a'), [5, 8, 25], night * 0.6)));
    ctx.fillStyle = wg;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    // koï sous la surface
    updateKoi(t, cx, cy, rx, ry);
    for (const f of koi) drawKoi(f, cx, cy, rx, ry, t, night);
    ctx.fillStyle = `rgba(20,90,100,${0.28})`;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    // reflets
    for (let i = 0; i < 7; i++) {
      const yy = cy - ry * 0.7 + i * ry * 0.23;
      const xx = cx + Math.sin(t * 0.5 + i * 1.7) * rx * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${0.07 + 0.05 * Math.sin(t + i)})`;
      ctx.beginPath(); ctx.ellipse(xx, yy, rx * (0.15 + 0.1 * Math.sin(i * 3.1 + t * 0.3)), 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // ondes
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.t += 1 / 60;
      const life = rp.big ? 3 : 2.2;
      if (rp.t > life) { ripples.splice(i, 1); continue; }
      for (let k = 0; k < 3; k++) {
        const tt = rp.t - k * 0.35;
        if (tt <= 0) continue;
        const R = tt * (rp.big ? 50 : 34);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - rp.t / life)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, R, R * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
    // bord en pierres
    const pebbles = GALETS.every(ready);
    for (const s of rim) {
      const px = cx + Math.cos(s.a) * rx * 1.02, py = cy + Math.sin(s.a) * ry * 1.06;
      const r = Math.min(W, H) * 0.018 * s.s * (0.8 + 0.4 * (py - cy + ry) / (2 * ry));
      if (pebbles) {
        const im = SPR[GALETS[Math.floor(s.t * GALETS.length)]];
        const w = r * 3, h = w * im.naturalHeight / im.naturalWidth;
        ctx.drawImage(im, px - w / 2, py - h * 0.6, w, h);
        continue;
      }
      const g = ctx.createLinearGradient(px, py - r, px, py + r);
      const base = mix(hex('#9a958c'), hex('#6c6862'), s.t);
      g.addColorStop(0, rgb(mix(base, [255, 255, 255], 0.2)));
      g.addColorStop(1, rgb(mix(base, [20, 20, 25], 0.4)));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(px, py, r * 1.3, r * 0.75, s.a * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function updateKoi(t, cx, cy, rx, ry) {
    const nowMs = performance.now();
    const feeding = koiTarget && koiTarget.until > nowMs;
    for (const f of koi) {
      if (feeding) { f.tx = (koiTarget.x - cx) / rx; f.ty = (koiTarget.y - cy) / ry; }
      else if (nowMs > f.next) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 0.75;
        f.tx = Math.cos(a) * d; f.ty = Math.sin(a) * d;
        f.next = nowMs + 3000 + Math.random() * 5000;
      }
      const want = Math.atan2((f.ty - f.v) * ry, (f.tx - f.u) * rx);
      let da = want - f.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      f.a += da * 0.03;
      const sp = f.sp * (feeding ? 1.8 : 1) / 60;
      f.u += Math.cos(f.a) * sp * 0.5;
      f.v += Math.sin(f.a) * sp * 0.5 * (rx / ry) * 0.4;
      const d = f.u * f.u + f.v * f.v;
      if (d > 0.7) { f.u *= 0.99; f.v *= 0.99; f.a += 0.05; }
      f.t += 1 / 60;
    }
  }

  function drawKoi(f, cx, cy, rx, ry, t, night) {
    const x = cx + f.u * rx, y = cy + f.v * ry;
    const L = Math.min(W, H) * 0.045;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.55);
    ctx.rotate(f.a);
    const wig = Math.sin(f.t * 8) * 0.35;
    ctx.globalAlpha = 0.9 - night * 0.4;
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(-L * 0.45, 0); ctx.rotate(wig);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L * 0.35, -L * 0.18); ctx.lineTo(-L * 0.3, 0); ctx.lineTo(-L * 0.35, L * 0.18); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = f.spot;
    ctx.beginPath(); ctx.ellipse(L * 0.12, -L * 0.02, L * 0.14, L * 0.08, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-L * 0.15, L * 0.03, L * 0.1, L * 0.06, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFireflies(t, dt, night) {
    const want = Math.round(28 * clamp((night - 0.3) / 0.7));
    while (fireflies.length < want) fireflies.push({ x: Math.random() * W, y: hy() + Math.random() * (H - hy()) * 0.9, ph: Math.random() * 6.28, vx: 0, vy: 0 });
    if (fireflies.length > want) fireflies.length = want;
    for (const f of fireflies) {
      f.vx += (Math.random() - 0.5) * 10 * dt; f.vy += (Math.random() - 0.5) * 10 * dt;
      f.vx *= 0.98; f.vy *= 0.98;
      f.x += f.vx * dt * 6; f.y += f.vy * dt * 6;
      if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
      if (f.y < hy() - 40) f.vy += 2; if (f.y > H) f.vy -= 2;
      const a = Math.max(0, Math.sin(t * 1.4 + f.ph)) * night;
      const R = 9;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
      g.addColorStop(0, `rgba(230,255,140,${a})`);
      g.addColorStop(1, 'rgba(200,255,120,0)');
      ctx.fillStyle = g; ctx.fillRect(f.x - R, f.y - R, R * 2, R * 2);
    }
  }

  function drawParticles(state, dt, t, night, season) {
    // pétales des cerisiers en fleur, feuilles d'érable, neige d'hiver
    for (const p of state.plants) {
      if (p.growth < 0.85 || (p.type !== 'cerisier' && p.type !== 'erable')) continue;
      if (Math.random() < dt * (p.type === 'cerisier' ? 1.4 : 0.5)) {
        const slot = SLOTS.find((s) => s.id === p.slot);
        if (!slot) continue;
        const u = unit(slot.y);
        particles.push({ kind: p.type === 'cerisier' ? 'petal' : 'leaf', x: slot.x * W + (Math.random() - 0.5) * u * 0.7, y: slot.y * H - u * (0.4 + Math.random() * 0.5), vx: 8 + Math.random() * 14, vy: 10 + Math.random() * 12, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, life: 7, age: 0, ground: slot.y * H + u * 0.1 + Math.random() * u * 0.4 });
      }
    }
    const ambient = { printemps: ['petal', 0.5], automne: ['leaf', 0.4], hiver: ['snow', 3], ete: [null, 0] }[season];
    if (ambient[0] && Math.random() < dt * ambient[1]) {
      particles.push({ kind: ambient[0], x: Math.random() * W * 1.2 - W * 0.2, y: -10, vx: 6 + Math.random() * 12, vy: 14 + Math.random() * 14, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, life: 30, age: 0, ground: hy() + Math.random() * (H - hy()) });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.age += dt;
      if (q.age > q.life) { particles.splice(i, 1); continue; }
      const fade = clamp((q.life - q.age) / 1.2);
      if (q.kind === 'spark') {
        q.vy += 60 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        ctx.fillStyle = q.col.replace('A', String(fade));
        ctx.beginPath(); ctx.arc(q.x, q.y, 2.2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const landed = q.y >= q.ground;
      if (!landed) {
        q.x += (q.vx + Math.sin(t * 1.3 + q.rot) * 10) * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
      } else if (q.life - q.age > 4) q.age = q.life - 4;
      const dim = 1 - night * 0.45;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      if (q.kind === 'petal') {
        ctx.fillStyle = `rgba(250,${190 + 20 * Math.sin(q.rot) | 0},210,${0.9 * fade * dim})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      } else if (q.kind === 'leaf') {
        ctx.fillStyle = `rgba(${215 + 30 * Math.sin(q.rot * 3) | 0},${80 + 40 * Math.cos(q.rot) | 0},40,${0.9 * fade * dim})`;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
          ctx.lineTo(Math.cos(a + 0.6) * 2, Math.sin(a + 0.6) * 2);
        }
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * fade})`;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // éclaboussures d'arrosage
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.life -= dt;
      if (s.life <= 0) { splashes.splice(i, 1); continue; }
      s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.strokeStyle = `rgba(190,230,255,${Math.min(1, s.life * 2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke();
    }
  }

  function drawDrops(state, t) {
    for (const p of state.plants) {
      if (!p.drops) continue;
      const h = plantHits.find((x) => x.id === p.id);
      if (!h) continue;
      for (let i = 0; i < Math.min(p.drops, MAX_DROPS); i++) {
        const a = -Math.PI / 2 + (i - (p.drops - 1) / 2) * 0.7;
        const dx = h.x + Math.cos(a) * h.u * 0.28;
        const dy = h.y - h.top * 0.82 + Math.sin(a) * h.u * 0.06 + Math.sin(t * 2 + i + p.seed * 9) * 4;
        const r = Math.max(7, h.u * 0.045);
        const gl = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 3);
        gl.addColorStop(0, 'rgba(180,235,255,0.55)');
        gl.addColorStop(1, 'rgba(180,235,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(dx - r * 3, dy - r * 3, r * 6, r * 6);
        const g = ctx.createRadialGradient(dx - r * 0.3, dy - r * 0.2, r * 0.1, dx, dy, r);
        g.addColorStop(0, 'rgba(255,255,255,0.98)');
        g.addColorStop(0.5, 'rgba(150,220,250,0.85)');
        g.addColorStop(1, 'rgba(60,150,210,0.85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(dx, dy - r * 1.5);
        ctx.bezierCurveTo(dx + r * 0.9, dy - r * 0.4, dx + r, dy + r * 0.9, dx, dy + r);
        ctx.bezierCurveTo(dx - r, dy + r * 0.9, dx - r * 0.9, dy - r * 0.4, dx, dy - r * 1.5);
        ctx.fill();
        dropHits.push({ id: p.id, x: dx, y: dy, r: r * 2.2 });
      }
    }
  }

  // ---- interrogations ----
  function hitDrop(x, y) {
    let best = null, bd = Infinity;
    for (const d of dropHits) {
      const dd = Math.hypot(x - d.x, y - d.y);
      if (dd < d.r && dd < bd) { best = d; bd = dd; }
    }
    return best;
  }
  function hitPlant(x, y) {
    for (let i = plantHits.length - 1; i >= 0; i--) {
      const h = plantHits[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h;
    }
    return null;
  }
  function hitSlot(x, y, slots) {
    let best = null, bd = Infinity;
    for (const s of slots) {
      const u = unit(s.y);
      const dx = (x - s.x * W) / (u * 0.3), dy = (y - s.y * H) / (u * 0.18);
      const d = dx * dx + dy * dy;
      if (d < 1.6 && d < bd) { best = s; bd = d; }
    }
    return best;
  }
  function slotScreen(s) {
    return { x: s.x * W, y: s.y * H };
  }

  function slotMarkers(selectedSlots, t) {
    for (const sl of selectedSlots) {
      const u = unit(sl.y);
      const pulse = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * pulse + 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(sl.x * W, sl.y * H, u * 0.2, u * 0.065, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,255,255,${0.14 * pulse})`;
      ctx.fill();
    }
  }

  function drawBiome(state, info, sky) {
    const { t, dt, season, selectedSlots, highlightId } = info;
    const V = BIOME_VIEW[info.biome];
    const night = sky.night;
    hz = V.horizon;
    ctx.fillStyle = '#1b1712';
    ctx.fillRect(0, 0, W, H);
    if (ready(V.img)) {
      const im = SPR[V.img];
      const warm = mix(sky.bot, [255, 150, 100], sky.warm * 0.5);
      const cv = tinted(V.img, warm, (V.outdoor ? 0.1 : 0.04) + (V.outdoor ? 0.3 : 0.14) * sky.warm, night * (V.outdoor ? 0.72 : 0.5));
      const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.drawImage(cv, (W - dw) / 2, (H - dh) * 0.6, dw, dh);
    }
    const byId = new Map(state.plants.map((p) => [p.slot, p]));
    const items = V.slots.map((sl) => ({ sl, p: byId.get(sl.id) })).sort((a, b) => a.sl.y - b.sl.y);
    for (const { sl, p } of items) {
      if (p) drawPlant(p, sl, t, night);
      else furniture(sl, sl.x * W, sl.y * H);
    }
    if (selectedSlots) slotMarkers(selectedSlots, t);
    if (V.outdoor && night > 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      drawFireflies(t, dt, night);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (V.outdoor) drawParticles(state, dt, t, night, season);
    drawDrops(state, t);
    if (highlightId) {
      const h = plantHits.find((x) => x.id === highlightId);
      if (h) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, h.u * 0.25, h.u * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(10,10,25,${0.3 + 0.2 * night})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  return { resize, draw, rakeBegin, rakeMove, rakeEnd, onSand, inPond, ripple, splash, burst, hitDrop, hitPlant, hitSlot, slotScreen, bakeSand, forget: (id) => { models.delete(id); caches.delete(id); }, size: () => ({ W, H }) };
}
