import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import * as L from './logic.js';
import { createScene, SLOTS, skyAt, slotsOf, BIOME_VIEW } from './render.js';
import * as A from './audio.js';
import { createPavilion } from './pavilion.js';
import { CREDITS } from './data/credits.js';
import { t, setLang, getLang, detectLang, applyStatic, plantName, plantDesc, stageName, rarityName, familyOne, biomeName, seasonName } from './i18n.js';

const KEY = 'haru-state-v1'; // ancien nom du jeu, gardé pour ne pas perdre les sauvegardes
const params = new URLSearchParams(location.search);
// Réglages de démo : ?speed=600 accélère le temps, ?hour=22 fige l'heure, ?cycle=120 fait un jour en 120 s,
// ?biome=prairie ouvre un lieu, ?lang=en force l'anglais.
const SPEED = Number(params.get('speed')) || 1;
const HOUR = params.has('hour') ? Number(params.get('hour')) : null;
const CYCLE = Number(params.get('cycle')) || 0;
const SEASON = params.get('season');
const realStart = Date.now();
const clock = () => realStart + (Date.now() - realStart) * SPEED;

const $ = (s) => document.querySelector(s);
const canvas = $('#garden');
const scene = createScene(canvas);
let state = L.createState(clock());
let tool = 'main';
let seedType = null;
let cardId = null;
let lastSave = 0;
let collected = 0;
const pavilion = createPavilion({
  getState: () => state,
  onOpen: () => { state.pvUnseen = false; updateHud(); A.chime(3, 0.06); A.chime(5, 0.05, 0.15); save(); },
  onClose: () => A.chime(2, 0.04),
  sound: (n) => A.chime(n, 0.06),
  reward: (correct) => {
    const n = L.quizAnswer(state, correct, clock());
    if (n) { A.collectSound(collected++); updateHud(); save(); } else if (correct) A.chime(6, 0.06);
    return n;
  },
  quizLeft: () => L.quizLeft(state, clock()),
  now: clock,
});

const ICONS = {
  mousse: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="34" rx="16" ry="7" fill="#3e6a2c"/><ellipse cx="17" cy="30" rx="8" ry="6" fill="#6b9a3f"/><ellipse cx="28" cy="29" rx="9" ry="7" fill="#86b14c"/><circle cx="22" cy="26" r="1.6" fill="#fff"/><circle cx="31" cy="25" r="1.3" fill="#fff"/></svg>',
  bambou: '<svg viewBox="0 0 48 48"><g stroke-width="5" stroke="#7aa848"><path d="M16 44V10M26 44V4M35 44V14"/></g><g stroke="#3f6a2a" stroke-width="2"><path d="M13 22h6M13 33h6M23 15h6M23 28h6M32 26h6M32 36h6"/></g><path d="M26 10c6-4 10-3 13-1-5 2-9 3-13 1zM16 16c-5-3-9-2-11 0 4 2 8 2 11 0z" fill="#5c8a3a"/></svg>',
  lotus: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="38" rx="18" ry="6" fill="#4f9a52"/><path d="M24 36c-4-6-4-14 0-20 4 6 4 14 0 20z" fill="#f4a9c4"/><path d="M24 36c-8-2-12-9-12-14 6 1 10 7 12 14zM24 36c8-2 12-9 12-14-6 1-10 7-12 14z" fill="#e86a98"/><ellipse cx="24" cy="34" rx="3" ry="1.5" fill="#f6d34a"/></svg>',
  erable: '<svg viewBox="0 0 48 48"><path d="M24 4l4 9 8-4-2 9 9 2-7 6 4 7-9-1-1 8h-4l-1-8-9 1 4-7-7-6 9-2-2-9 8 4z" fill="#d9432a"/><path d="M24 20v26" stroke="#4b3426" stroke-width="2"/></svg>',
  cerisier: '<svg viewBox="0 0 48 48"><g fill="#f4b3c8">' + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="24" cy="13" rx="6" ry="9" transform="rotate(${a} 24 24)"/>`).join('') + '</g><circle cx="24" cy="24" r="4" fill="#ea94b2"/><circle cx="24" cy="24" r="1.8" fill="#f6d34a"/></svg>',
  pin: '<svg viewBox="0 0 48 48"><path d="M24 44c0-10-4-14-2-24" stroke="#3a2c22" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="24" rx="11" ry="4.5" fill="#2d5a39"/><ellipse cx="32" cy="17" rx="12" ry="4.5" fill="#3c7448"/><ellipse cx="22" cy="10" rx="9" ry="4" fill="#4a8653"/></svg>',
  lanterne: '<svg viewBox="0 0 48 48"><rect x="15" y="40" width="18" height="4" fill="#8e8b84"/><rect x="21" y="27" width="6" height="13" fill="#b9b5ab"/><rect x="16" y="24" width="16" height="4" fill="#9a958c"/><rect x="18" y="13" width="12" height="11" fill="#9a958c"/><rect x="21" y="15" width="6" height="7" fill="#ffcf6e"/><path d="M9 13c6-1 9-4 11-8h8c2 4 5 7 11 8z" fill="#6e6b66"/></svg>',
};
const BIOME_ORDER = ['zen', 'prairie', 'serre', 'cactus', 'bonsai'];
const BIOME_THUMB = { zen: 'montagnes', prairie: 'lieu_prairie', serre: 'lieu_serre', cactus: 'lieu_cactus', bonsai: 'lieu_bonsai' };

// ---------- sauvegarde ----------
async function load() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return L.sanitize(value ? JSON.parse(value) : null, clock());
  } catch {
    return L.createState(clock());
  }
}
function save() {
  lastSave = performance.now();
  if (DEMO) return;
  Preferences.set({ key: KEY, value: JSON.stringify(state) }).catch(() => {});
}

// ---------- temps ----------
function currentHour() {
  if (HOUR !== null) return HOUR;
  if (CYCLE) return ((performance.now() / 1000 / CYCLE) * 24 + 8) % 24;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
function currentSeason() {
  return SEASON || L.season(clock());
}

// ---------- interface ----------
function updateHud() {
  $('#dewCount').textContent = state.dew;
  $('#pvBtn').classList.toggle('dot', !!state.pvUnseen);
  $('#placesBtn').classList.toggle('dot', !!state.placesUnseen);
  const h = currentHour();
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('#clock').textContent = state.biome === 'zen' ? `${seasonName(currentSeason())} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` : biomeName(state.biome);
}

let toastTimer = 0;
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

function floatText(x, y, text) {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1500);
}

function flyDrop(x, y) {
  const el = document.createElement('div');
  el.className = 'fly';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  const target = $('#dew').getBoundingClientRect();
  requestAnimationFrame(() => {
    el.style.transform = `translate(${target.left + 18 - x}px, ${target.top + target.height / 2 - y}px) scale(0.6)`;
    el.style.opacity = '0.4';
  });
  setTimeout(() => {
    el.remove();
    updateHud();
    const pill = $('#dew');
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
  }, 760);
}

function setTool(tl) {
  tool = tl;
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('active', b.dataset.tool === (tl === 'plant' ? 'seeds' : tl));
  if (tl !== 'plant') seedType = null;
}

const SHEETS = ['#seeds', '#card', '#menu', '#lieux', '#credits'];
function closeSheets() {
  for (const id of SHEETS) $(id).classList.add('hidden');
  cardId = null;
}
const anySheetOpen = () => SHEETS.some((id) => !$(id).classList.contains('hidden'));

// Emplacements où cette plante peut aller dans le lieu affiché (sans regarder s'ils sont libres).
function fittingSlots(type, biome = state.biome) {
  const def = L.PLANTS[type];
  return slotsOf(biome).filter((sl) => sl.kind === def.where && (!sl.allow || sl.allow.includes(def.cat)));
}
function freeSlots(type) {
  return fittingSlots(type).filter((sl) => !L.plantAt(state, sl.id));
}

const RARITY_ORDER = ['legendaire', 'precieuse', 'rare', 'commune'];
const RARITY_NOTES = { commune: [4, 6], rare: [3, 5, 7], precieuse: [2, 4, 6, 8], legendaire: [1, 3, 5, 7, 9, 10] };

function startPlanting(type) {
  const def = L.PLANTS[type];
  if (!fittingSlots(type).length) {
    const places = BIOME_ORDER.filter((b) => b !== state.biome && L.biomeUnlocked(state, b) && fittingSlots(type, b).length).map(biomeName).join(', ');
    toast(t('notHere', { name: plantName(type), places }), 4200);
    return false;
  }
  if (!freeSlots(type).length) { toast(def.where === 'water' ? t('pondFull') : t('gardenFull')); return false; }
  seedType = type;
  setTool('plant');
  closeSheets();
  toast(t('tapSlot', { water: def.where === 'water', name: plantName(type) }), 3500);
  A.chime(4, 0.06);
  return true;
}

function listHeading(list, text) {
  const li = document.createElement('li');
  li.className = 'list-head';
  li.textContent = text;
  list.append(li);
}

function openSeeds() {
  closeSheets();
  const list = $('#seedList');
  list.replaceChildren();
  // le sachet de graines de collection
  const all = Object.keys(L.PLANTS);
  const known = all.filter((ty) => state.collection[ty]?.planted).length;
  const pk = document.createElement('li');
  const poor = state.dew < L.PACKET_COST;
  pk.innerHTML = `<button class="packet${poor ? ' locked' : ''}"><div class="pk-art"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 8h24l-2 34H14z" fill="#d9c49a" stroke="#8a6b3c" stroke-width="2" stroke-linejoin="round"/><path d="M12 8l4 6h16l4-6" fill="#c4a874" stroke="#8a6b3c" stroke-width="2" stroke-linejoin="round"/><path d="M24 36V24" stroke="#4f7f35" stroke-width="2.4" stroke-linecap="round"/><path d="M24 27c-5 0-7-3-7-7 4 0 7 2 7 7zM24 25c0-4 3-6 7-6 0 4-3 6-7 6z" fill="#7fb24a"/></svg></div>
    <div><b>${t('packet')}</b><p>${t('packetDesc', { n: all.filter((ty) => L.PLANTS[ty].collection).length })}</p></div>
    <div class="cost"><strong>${L.PACKET_COST} 💧</strong><span>${known}/${all.length}</span></div></button>`;
  pk.querySelector('button').addEventListener('click', () => {
    A.initAudio();
    if (poor) { toast(t('packetPoor', { n: L.PACKET_COST })); return; }
    openPacket();
  });
  list.append(pk);
  // l'inventaire de graines tirées des sachets
  const owned = Object.entries(state.seeds).filter(([, n]) => n > 0)
    .sort(([a], [b]) => RARITY_ORDER.indexOf(L.PLANTS[a].rarity) - RARITY_ORDER.indexOf(L.PLANTS[b].rarity) || plantName(a).localeCompare(plantName(b)));
  if (owned.length) listHeading(list, t('yourSeeds'));
  for (const [type, n] of owned) {
    const def = L.PLANTS[type];
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = `seed own r-${def.rarity}${fittingSlots(type).length ? '' : ' elsewhere'}`;
    b.innerHTML = `<div class="ic"><img src="sprites/c_${type}.webp" alt="" loading="lazy"></div><div><b>${plantName(type)}</b><p>${rarityName(def.rarity)} · ${familyOne(def.cat)}${state.collection[type]?.planted ? '' : ` · ${t('neverPlanted')}`}</p></div><div class="cost"><strong>×${n}</strong><span>${L.formatDuration(def.growMs)}</span></div>`;
    b.addEventListener('click', () => { A.initAudio(); startPlanting(type); });
    li.append(b);
    list.append(li);
  }
  listHeading(list, t('gardenPlants'));
  for (const [type, def] of Object.entries(L.PLANTS)) {
    if (def.collection) continue;
    const li = document.createElement('li');
    const b = document.createElement('button');
    const missing = def.cost - state.dew;
    b.className = `seed${missing > 0 ? ' locked' : ''}${fittingSlots(type).length ? '' : ' elsewhere'}`;
    const time = def.growMs ? L.formatDuration(def.growMs) : t('instant');
    b.innerHTML = `<div class="ic">${ICONS[type]}</div><div><b>${plantName(type)}</b><p>${plantDesc(type)}</p></div><div class="cost"><strong>${def.cost ? def.cost + ' 💧' : t('free')}</strong><span>${time}</span></div>`;
    b.addEventListener('click', () => {
      A.initAudio();
      if (missing > 0) { toast(t('missingDew', { n: missing })); return; }
      startPlanting(type);
    });
    li.append(b);
    list.append(li);
  }
  $('#seeds').classList.remove('hidden');
}

// Ouvre un sachet : le sachet tremble, s'ouvre, puis la plante apparaît dans un halo de sa rareté.
function openPacket() {
  const r = L.drawPacket(state);
  if (!r) return;
  save();
  updateHud();
  closeSheets();
  const def = L.PLANTS[r.type];
  const el = $('#reveal');
  el.className = `r-${r.rarity}`;
  el.innerHTML = `<div class="rv-packet"></div>
    <div class="rv-card">
      <div class="rv-glow"></div>
      <img src="sprites/c_${r.type}.webp" alt="">
      <span class="rv-rarity">${rarityName(r.rarity)}</span>
      <h2>${plantName(r.type)}</h2><p class="latin">${def.latin}</p>
      <p class="rv-new">${r.isNew ? t('newSpecies') : t('oneMore')}</p>
      <div class="actions"><button class="btn primary" data-act="plant">${t('plantNow')}</button><button class="btn" data-act="keep">${t('keep')}</button></div>
    </div>`;
  el.classList.remove('hidden');
  A.chime(2, 0.05);
  setTimeout(() => {
    el.classList.add('open');
    RARITY_NOTES[r.rarity].forEach((n, i) => A.chime(n, 0.08, 0.1 + i * 0.13));
  }, 900);
  const close = () => { el.classList.add('hidden'); el.classList.remove('open'); };
  el.querySelector('[data-act="plant"]').addEventListener('click', () => { close(); if (!startPlanting(r.type)) openSeeds(); });
  el.querySelector('[data-act="keep"]').addEventListener('click', () => { close(); openSeeds(); });
}

function renderCard() {
  const p = state.plants.find((x) => x.id === cardId);
  const card = $('#card');
  if (!p) { card.classList.add('hidden'); cardId = null; return; }
  const def = L.PLANTS[p.type];
  const now = clock();
  const facts = [];
  if (def.growMs) {
    facts.push(p.growth >= 1 ? t('mature') : t('matureIn', { d: L.formatDuration(L.timeLeft(p, now)) }));
    facts.push(L.isWatered(p, now) ? `<span class="wet">${t('watered', { d: L.formatDuration(p.wateredUntil - now) })}</span>` : t('dry', { grown: p.growth >= 1 }));
  }
  if (def.dewEvery) facts.push(p.growth >= 1 ? t('dewStock', { n: p.drops, max: L.MAX_DROPS }) : t('dewEvery', { d: L.formatDuration(def.dewEvery) }));
  card.innerHTML = `<div class="grab"></div><h2>${plantName(p.type)} <small>${stageName(p.type, L.stageOf(p))}</small></h2>
    ${def.growMs ? `<div class="bar"><i style="width:${Math.round(p.growth * 100)}%"></i></div>` : ''}
    <div class="facts">${facts.map((f) => (f.startsWith('<span') ? f : `<span>${f}</span>`)).join('')}</div>
    <div class="actions">${def.growMs ? `<button class="btn primary" data-act="water">${t('water')}</button>` : ''}<button class="btn" data-act="sheet">${t('pavilion')}</button><button class="btn danger" data-act="uproot">${t('uproot')}</button></div>`;
  card.querySelector('[data-act="water"]')?.addEventListener('click', () => doWater(p.id));
  card.querySelector('[data-act="sheet"]').addEventListener('click', () => { closeSheets(); pavilion.open(p.type); });
  const up = card.querySelector('[data-act="uproot"]');
  up.addEventListener('click', () => {
    if (!up.classList.contains('sure')) { up.classList.add('sure'); up.textContent = t('sure'); return; }
    L.uproot(state, p.id);
    scene.forget(p.id);
    closeSheets();
    toast(t('uprooted', { name: plantName(p.type) }));
    save();
  });
  card.classList.remove('hidden');
}

function openCard(id) {
  closeSheets();
  cardId = id;
  renderCard();
  A.chime(5, 0.05);
}

// ---------- lieux ----------
function openPlaces() {
  closeSheets();
  state.placesUnseen = false;
  updateHud();
  const list = $('#lieuxList');
  list.replaceChildren();
  const found = L.discovered(state);
  for (const b of BIOME_ORDER) {
    const open = L.biomeUnlocked(state, b);
    const slots = slotsOf(b);
    const used = slots.filter((sl) => L.plantAt(state, sl.id)).length;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = `place${open ? '' : ' locked'}${b === state.biome ? ' here' : ''}`;
    const status = !open ? t('unlockAt', { n: L.BIOMES[b].unlock, k: Math.min(found, L.BIOMES[b].unlock) }) : b === state.biome ? t('here') : t('slotsUsed', { n: used, m: slots.length });
    btn.innerHTML = `<div class="pl-thumb" style="background-image:url(sprites/${BIOME_THUMB[b]}.webp)"></div><div><b>${biomeName(b)}</b><p>${t('biomeDesc')[b]}</p><span class="pl-status">${status}</span></div>`;
    btn.addEventListener('click', () => {
      A.initAudio();
      if (!open) { A.chime(1, 0.04); return; }
      goTo(b);
    });
    li.append(btn);
    list.append(li);
  }
  $('#lieux').classList.remove('hidden');
}

function goTo(biome) {
  closeSheets();
  setTool('main');
  state.biome = biome;
  updateHud();
  toast(t('welcomeBiome', { name: biomeName(biome) }));
  [3, 5, 7].forEach((n, i) => A.chime(n, 0.05, i * 0.15));
  save();
}

function checkUnlocks(silent) {
  if (!state.biomesOpen) state.biomesOpen = [];
  for (const b of BIOME_ORDER) {
    if (!L.biomeUnlocked(state, b) || state.biomesOpen.includes(b)) continue;
    state.biomesOpen.push(b);
    if (silent) continue;
    state.placesUnseen = true;
    toast(t('biomeUnlocked', { name: biomeName(b) }), 4200);
    [2, 4, 6, 8].forEach((n, i) => A.chime(n, 0.07, i * 0.14));
  }
}

// ---------- conseils de départ ----------
const HINTS = [
  ['rake', () => (state.biome === 'zen' ? t('hintRake') : null)],
  ['seed', () => (state.plants.length ? null : t('hintSeed'))],
  ['water', () => (state.plants.some((p) => L.PLANTS[p.type].growMs) ? t('hintWater') : null)],
  ['drop', () => (state.plants.some((p) => p.drops) ? t('hintDrop') : null)],
];
function updateHint() {
  const el = $('#hint');
  for (const [key, text] of HINTS) {
    if (state.hintsDone.includes(key)) continue;
    const msg = text();
    if (msg) { el.textContent = msg; el.classList.remove('hidden'); return; }
    if (key === 'seed' && state.plants.length) continue;
    break;
  }
  el.classList.add('hidden');
}
function hintDone(key) {
  if (!state.hintsDone.includes(key)) { state.hintsDone.push(key); updateHint(); }
}

// ---------- actions ----------
function doWater(id, x, y) {
  const p = state.plants.find((q) => q.id === id);
  if (!p) return false;
  if (!L.water(state, id, clock())) return false;
  A.pour();
  if (x !== undefined) scene.splash(x, y);
  toast(t('wateredToast', { name: plantName(p.type), grown: p.growth >= 1, d: L.formatDuration(p.wateredUntil - clock()) }));
  hintDone('seed');
  hintDone('water');
  if (cardId === id) renderCard();
  save();
  return true;
}

function doCollect(hit) {
  if (!L.collect(state, hit.id)) return;
  A.collectSound(collected++);
  scene.burst(hit.x, hit.y, 'rgba(180,235,255,A)');
  flyDrop(hit.x, hit.y);
  hintDone('drop');
  if (cardId === hit.id) renderCard();
  save();
}

function doPlant(slot) {
  const def = L.PLANTS[seedType];
  const r = L.plant(state, slot, seedType, clock());
  if (!r.ok) { toast(r.reason === 'rosée' ? t('noDew') : r.reason === 'graine' ? t('noSeed') : t('cantPlant')); return; }
  const { x, y } = scene.slotScreen(slot);
  A.plantSound();
  scene.burst(x, y - 10, 'rgba(200,255,170,A)');
  if (def.cost) floatText(x - 14, y - 40, `−${def.cost}`);
  if (r.discovered) state.pvUnseen = true;
  if (r.firstBloom) floatText(x + 10, y - 70, `+${L.FIRST_BLOOM_REWARD} 💧`);
  if (r.discovered) toast(t('discoveredToast', { name: plantName(r.plant.type) }), 3200);
  else toast(t('plantedToast', { name: plantName(r.plant.type), d: def.growMs ? L.formatDuration(def.growMs) : '' }));
  hintDone('seed');
  setTool('main');
  checkUnlocks(false);
  updateHud();
  save();
}

// ---------- gestes ----------
let down = null;
function pos(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
const inZen = () => state.biome === 'zen';

canvas.addEventListener('pointerdown', (e) => {
  A.initAudio();
  if (anySheetOpen()) { closeSheets(); down = null; return; }
  const [x, y] = pos(e);
  canvas.setPointerCapture(e.pointerId);
  down = { x, y, lx: x, ly: y, lt: performance.now(), moved: false, mode: null, rakeLen: 0, watered: new Set(), lastSplash: 0 };
  if (tool === 'water') { down.mode = 'water'; waterAt(x, y); }
  else if (tool === 'main' && inZen() && scene.onSand(x, y) && !scene.hitDrop(x, y) && scene.rakeBegin(x, y)) down.mode = 'rake';
});

canvas.addEventListener('pointermove', (e) => {
  if (!down) return;
  const [x, y] = pos(e);
  if (Math.hypot(x - down.x, y - down.y) > 10) down.moved = true;
  const now = performance.now();
  const v = Math.hypot(x - down.lx, y - down.ly) / Math.max(1, now - down.lt) * 16;
  down.lx = x; down.ly = y; down.lt = now;
  if (down.mode === 'rake') {
    down.rakeLen += scene.rakeMove(x, y);
    A.rakeSpeed(v);
  } else if (down.mode === 'water') waterAt(x, y);
});

function endPointer(e) {
  if (!down) return;
  const [x, y] = pos(e);
  const d = down;
  down = null;
  if (d.mode === 'rake') {
    A.rakeSpeed(0);
    const stroke = scene.rakeEnd();
    if (stroke && d.moved) {
      state.strokes.push(stroke);
      let total = state.strokes.reduce((n, st) => n + st.length, 0);
      while (state.strokes.length > 1 && (state.strokes.length > 80 || total > 5000)) total -= state.strokes.shift().length;
      const gained = L.rake(state, d.rakeLen, clock());
      if (gained) { floatText(x, y - 30, `+${gained} 💧`); A.collectSound(collected++); updateHud(); }
      hintDone('rake');
      save();
      return;
    }
  }
  if (!d.moved) tap(x, y);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function waterAt(x, y) {
  const now = performance.now();
  if (now - down.lastSplash > 90) { scene.splash(x, y); down.lastSplash = now; }
  if (inZen() && scene.inPond(x, y) && Math.random() < 0.3) scene.ripple(x, y);
  const h = scene.hitPlant(x, y);
  if (h && !down.watered.has(h.id)) {
    down.watered.add(h.id);
    doWater(h.id, x, y);
  }
}

function tap(x, y) {
  const drop = scene.hitDrop(x, y);
  if (drop) return doCollect(drop);
  if (tool === 'plant') {
    const slot = scene.hitSlot(x, y, freeSlots(seedType));
    if (slot) return doPlant(slot);
    setTool('main');
    toast(t('cancelPlant'));
    return;
  }
  const h = scene.hitPlant(x, y);
  if (h && tool !== 'water') return openCard(h.id);
  if (inZen() && scene.inPond(x, y)) {
    scene.ripple(x, y, true);
    A.drop(0.12);
    A.chime(2 + Math.floor(Math.random() * 5), 0.07, 0.05);
  }
}

for (const b of document.querySelectorAll('.tool')) {
  b.addEventListener('click', () => {
    A.initAudio();
    const tl = b.dataset.tool;
    if (tl === 'seeds') return openSeeds();
    closeSheets();
    setTool(tl);
    if (tl === 'water') toast(t('waterHelp'));
  });
}

$('#pvBtn').addEventListener('click', () => {
  A.initAudio();
  closeSheets();
  pavilion.open();
});
$('#placesBtn').addEventListener('click', () => { A.initAudio(); openPlaces(); });
$('#menuBtn').addEventListener('click', () => {
  closeSheets();
  renderMenu();
  $('#menu').classList.remove('hidden');
});
function renderMenu() {
  $('#soundBtn').innerHTML = t('sound', { on: !state.muted });
  applyStatic();
}
$('#soundBtn').addEventListener('click', () => {
  state.muted = !state.muted;
  A.setMuted(state.muted);
  renderMenu();
  save();
});
$('#langBtn').addEventListener('click', () => {
  state.lang = getLang() === 'fr' ? 'en' : 'fr';
  setLang(state.lang);
  renderMenu();
  updateHud();
  updateHint();
  save();
});
// Crédits des photos de référence, triés par nom de plante dans la langue du jeu.
$('#creditsBtn').addEventListener('click', () => {
  closeSheets();
  const box = $('#credits');
  box.querySelector('h2').textContent = t('creditsTitle');
  box.querySelector('.sub').textContent = t('creditsSub', { n: CREDITS.length });
  const list = $('#creditsList');
  list.replaceChildren();
  const STAGE = { jeune: { fr: 'jeune', en: 'young' }, adulte: { fr: 'adulte', en: 'mature' } };
  const nameOf = (id) => {
    if (id === 'pousse') return getLang() === 'en' ? 'Seedling' : 'Pousse';
    const [type, stage] = L.PLANTS[id] ? [id] : id.split('_');
    return L.PLANTS[type] ? plantName(type) + (stage ? ` (${STAGE[stage][getLang()]})` : '') : id;
  };
  for (const [id, author, licence, url] of [...CREDITS].sort((a, b) => nameOf(a[0]).localeCompare(nameOf(b[0])))) {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = nameOf(id);
    const s = document.createElement('span'); s.textContent = `${author} · ${licence}`;
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t('creditsOpen');
    li.append(b, s, a);
    list.append(li);
  }
  box.classList.remove('hidden');
});
$('#smoothBtn').addEventListener('click', () => {
  state.strokes = [];
  scene.bakeSand([]);
  closeSheets();
  toast(t('smoothed'));
  save();
});
$('#zenBtn').addEventListener('click', () => {
  closeSheets();
  document.body.classList.add('zen');
  $('#unzen').classList.remove('hidden');
});
$('#unzen').addEventListener('click', () => {
  document.body.classList.remove('zen');
  $('#unzen').classList.add('hidden');
});
$('#dew').addEventListener('click', () => toast(t('dewInfo', { n: state.dew, earned: state.rake.earned, cap: L.RAKE_DAILY_CAP })));

// ---------- cycle de vie ----------
function awayMessage(sum) {
  if (sum.elapsed <= 15 * 60000 || !state.plants.length) return;
  const ready = state.plants.reduce((n, p) => n + p.drops, 0);
  toast(t('away', { d: L.formatDuration(sum.elapsed), ready }), 5000);
}

function catchUp(showWelcome) {
  const sum = L.advance(state, clock());
  if (showWelcome) awayMessage(sum);
  return sum;
}

function tick() {
  const sum = catchUp(false);
  for (const type of sum.firstBlooms) {
    state.pvUnseen = true;
    toast(t('firstBloom', { name: plantName(type), n: L.FIRST_BLOOM_REWARD }), 4200);
  }
  for (const p of sum.matured) {
    if (sum.firstBlooms.length) break;
    toast(t('maturedToast', { name: plantName(p.type) }), 3500);
    A.chime(4, 0.08); A.chime(6, 0.07, 0.2); A.chime(8, 0.06, 0.4);
  }
  if (cardId) renderCard();
  updateHud();
  updateHint();
  if (performance.now() - lastSave > 15000) save();
}

function onHide() {
  save();
  A.pauseAudio();
}
function onShow() {
  A.resumeAudio();
  catchUp(true);
  updateHud();
}
document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
App.addListener('backButton', () => {
  if (!$('#reveal').classList.contains('hidden')) { $('#reveal').classList.add('hidden'); return; }
  if (pavilion.close()) return;
  if (anySheetOpen()) closeSheets();
  else if (tool !== 'main') setTool('main');
  else if (document.body.classList.contains('zen')) $('#unzen').click();
  else if (state.biome !== 'zen') goTo('zen');
  else App.minimizeApp();
}).catch(() => {});

window.addEventListener('resize', () => scene.resize(state.strokes));

let last = performance.now();
let acc = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  acc += dt;
  if (acc >= 1) { acc = 0; tick(); }
  const hour = currentHour();
  A.setNight(skyAt(hour).night);
  scene.draw(state, {
    t: ts / 1000, dt, hour, season: currentSeason(), now: clock(), biome: state.biome,
    selectedSlots: tool === 'plant' && seedType ? freeSlots(seedType) : null,
    highlightId: cardId,
  });
  requestAnimationFrame(frame);
}

// ?demo=1 : jardin déjà adulte (?demo=0.3 : à 30 % de croissance), jamais sauvegardé.
function demoState() {
  const s = L.createState(clock());
  s.dew = 999;
  const pick = {
    s1: 'cerisier', s2: 'pin', s3: 'bambou', s4: 'erable', s5: 'mousse', s6: 'lanterne', s7: 'mousse', w1: 'lotus', w2: 'nenuphar_rose', s9: 'azalee', s10: 'hortensia', s11: 'iris_japon',
    'prairie:1': 'tulipe', 'prairie:2': 'coquelicot', 'prairie:3': 'lupin', 'prairie:6': 'tournesol', 'prairie:9': 'lavande', 'prairie:12': 'marguerite', 'prairie:13': 'pivoine',
    'serre:1': 'phalaenopsis', 'serre:2': 'fougere_arbo', 'serre:4': 'hibiscus', 'serre:5': 'nenuphar_blanc', 'serre:6': 'victoria', 'serre:8': 'cymbidium',
    'cactus:2': 'saguaro', 'cactus:5': 'echinocactus', 'cactus:6': 'agave', 'cactus:9': 'aloe', 'cactus:12': 'opuntia',
    'bonsai:1': 'genevrier', 'bonsai:2': 'erable_trident', 'bonsai:3': 'ume', 'bonsai:4': 'azalee', 'bonsai:5': 'olivier',
  };
  for (const type of Object.values(pick)) if (L.PLANTS[type].collection) s.seeds[type] = (s.seeds[type] || 0) + 1;
  const slots = [...SLOTS, ...Object.values(BIOME_VIEW).flatMap((b) => b.slots)];
  for (const [slot, type] of Object.entries(pick)) {
    const r = L.plant(s, slots.find((x) => x.id === slot), type, clock(), Math.random());
    if (!r.ok) continue;
    r.plant.growth = Math.min(1, Number(params.get('demo')) || 1);
    r.plant.drops = slot === 's1' || slot === 's4' ? 2 : 0;
  }
  for (const p of s.plants) if (p.growth >= 1) L.entry(s, p.type).matured = 1;
  delete s.collection.pin; // une espèce encore inconnue, pour voir les silhouettes
  // une partie de la collection déjà découverte, et quelques graines en réserve
  Object.keys(L.PLANTS).filter((ty) => L.PLANTS[ty].collection).forEach((ty, i) => {
    if (i % 3 === 0) Object.assign(L.entry(s, ty), { planted: 1, matured: i % 2 ? 0 : 1, dew: i % 7 });
    if (i % 23 === 5) s.seeds[ty] = 1 + (i % 2);
  });
  s.dew = 42;
  s.hintsDone = HINTS.map(([k]) => k);
  if (L.BIOMES[params.get('biome')]) s.biome = params.get('biome');
  return s;
}
const DEMO = params.has('demo');

async function start() {
  state = DEMO ? demoState() : await load();
  if (params.get('lang')) state.lang = params.get('lang');
  setLang(state.lang || detectLang());
  applyStatic();
  checkUnlocks(true);
  A.setMuted(state.muted);
  scene.resize(state.strokes);
  const sum = catchUp(false);
  updateHud();
  requestAnimationFrame(frame);
  const splash = $('#splash');
  const enter = () => {
    A.initAudio();
    splash.classList.add('out');
    setTimeout(() => splash.remove(), 1300);
    [2, 4, 6, 7].forEach((n, i) => A.chime(n, 0.07, 0.15 + i * 0.22));
    awayMessage(sum);
    setTimeout(updateHint, 1400);
  };
  splash.addEventListener('pointerdown', enter, { once: true });
}

start();
