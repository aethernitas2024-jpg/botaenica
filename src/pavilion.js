// Pavillon des plantes : la collection, la carte des origines et le quiz.
import { PLANTS, QUIZ_REWARD } from './logic.js';
import { LANDS } from './data/carte.js';
import {
  t, getLang, plantName, plantFact, stageName, rarityName, familyName, edu, originOf, habitatOf, tipOf, bloomOf, heightOf,
} from './i18n.js';

const $ = (s) => document.querySelector(s);
const img = (name) => `sprites/${name}.webp`;
const FAMILY_ORDER = ['arbre', 'arbuste', 'fleur', 'fougere', 'succulente', 'aquatique', 'decor'];
const RARITY_RANK = { undefined: 0, commune: 1, rare: 2, precieuse: 3, legendaire: 4 };
const QUIZ_MIN = 4;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const CONTINENTS = {
  fr: { nam: 'Amérique du Nord et centrale', sam: 'Amérique du Sud', eur: 'Europe', afr: 'Afrique', asi: 'Asie', oce: 'Océanie' },
  en: { nam: 'North and Central America', sam: 'South America', eur: 'Europe', afr: 'Africa', asi: 'Asia', oce: 'Oceania' },
};
function continentOf(lat, lon) {
  if (lon < -30) return lat > 12 ? 'nam' : 'sam';
  if (lon < 60) {
    if (lat > 36 && lon < 45) return 'eur';
    if (lon < 52 && lat < 36 && !(lat > 13 && lon > 34)) return 'afr';
    return 'asi';
  }
  return lat < -10 && lon > 110 ? 'oce' : 'asi';
}

function adultImage(type) {
  if (PLANTS[type].collection) return `c_${type}`;
  return type === 'lanterne' ? 'lanterne' : `${type}_adulte`;
}

function stagesOf(type) {
  const def = PLANTS[type];
  const n = def.stages.length;
  if (type === 'lanterne') return [[stageName(type, 0), 'lanterne']];
  if (def.collection) return def.where === 'water' ? [[stageName(type, n - 1), `c_${type}`]] : [[stageName(type, 1), 'pousse'], [stageName(type, n - 1), `c_${type}`]];
  const out = [];
  if (type !== 'mousse' && type !== 'lotus') out.push([stageName(type, 1), 'pousse']);
  out.push([stageName(type, Math.floor((n - 1) / 2)), `${type}_jeune`]);
  out.push([stageName(type, n - 1), `${type}_adulte`]);
  return out;
}

function portrait(type, e) {
  const def = PLANTS[type];
  if (def.collection || type === 'lanterne') return adultImage(type);
  return e && e.matured ? `${type}_adulte` : `${type}_jeune`;
}

// Plantes du jardin d'abord, puis par famille, puis de la plus commune à la plus rare.
const ORDER = Object.keys(PLANTS).sort((a, b) => {
  const A = PLANTS[a], B = PLANTS[b];
  return (A.collection ? 1 : 0) - (B.collection ? 1 : 0)
    || FAMILY_ORDER.indexOf(A.cat) - FAMILY_ORDER.indexOf(B.cat)
    || RARITY_RANK[A.rarity] - RARITY_RANK[B.rarity]
    || A.name.localeCompare(B.name);
});

export function createPavilion({ getState, onOpen, onClose, sound, reward, quizLeft }) {
  const room = $('#pavillon');
  const grid = $('#pvGrid');
  const detail = $('#pvDetail');
  const filters = $('#pvFilters');
  let filter = 'tout';
  let tab = 'collection';
  room.style.backgroundImage = `linear-gradient(180deg, rgba(24,16,10,0.35), rgba(16,10,6,0.78)), url(${img('pavillon')})`;
  const known = () => ORDER.filter((ty) => getState().collection[ty]?.planted);

  // ---------- onglets ----------
  function renderTabs() {
    const tabs = $('#pvTabs');
    tabs.replaceChildren();
    for (const [key, label] of [['collection', t('tabCollection')], ['map', t('tabMap')], ['quiz', t('tabQuiz')]]) {
      const b = document.createElement('button');
      b.className = key === tab ? 'on' : '';
      b.textContent = label;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(key === tab));
      b.addEventListener('click', () => { tab = key; sound(5); render(); });
      tabs.append(b);
    }
    $('#pvCollection').classList.toggle('hidden', tab !== 'collection');
    $('#pvMap').classList.toggle('hidden', tab !== 'map');
    $('#pvQuiz').classList.toggle('hidden', tab !== 'quiz');
  }

  function render() {
    const state = getState();
    const k = known().length;
    const bloomed = ORDER.filter((ty) => state.collection[ty]?.matured).length;
    $('#pvProgress').textContent = t('pvProgress', { known: k, total: ORDER.length, bloomed });
    $('#pavillon .pv-head h2').textContent = t('pavilion');
    renderTabs();
    if (tab === 'collection') renderCollection();
    else if (tab === 'map') renderMap();
    else if (!quiz) renderQuiz();
  }

  // ---------- collection ----------
  function renderFilters(state) {
    filters.replaceChildren();
    const chips = [['tout', t('allFamilies')], ...FAMILY_ORDER.filter((f) => f !== 'decor').map((f) => [f, familyName(f)])];
    for (const [key, label] of chips) {
      const types = ORDER.filter((ty) => key === 'tout' || PLANTS[ty].cat === key);
      const k = types.filter((ty) => state.collection[ty]?.planted).length;
      const b = document.createElement('button');
      b.className = key === filter ? 'on' : '';
      b.textContent = `${label} ${k}/${types.length}`;
      b.addEventListener('click', () => { filter = key; sound(4); renderCollection(); });
      filters.append(b);
    }
  }

  function renderCollection() {
    const state = getState();
    renderFilters(state);
    grid.replaceChildren();
    for (const type of ORDER) {
      const def = PLANTS[type];
      if (filter !== 'tout' && def.cat !== filter) continue;
      const e = state.collection[type];
      const b = document.createElement('button');
      b.className = `niche r-${def.rarity || 'jardin'}${e ? '' : ' unknown'}${e?.matured ? ' bloomed' : ''}`;
      const name = e ? plantName(type) : '???';
      const sub = e ? `<i>${def.latin}</i>` : def.collection ? (state.seeds[type] ? t('seedInStock') : t('inPacket')) : `${def.cost ? def.cost + ' 💧' : t('free')} · ${t('toPlant')}`;
      const rar = def.rarity ? `<span class="rar">${rarityName(def.rarity)}</span>` : '';
      b.innerHTML = `<div class="stage"><img src="${img(e ? portrait(type, e) : adultImage(type))}" alt="" loading="lazy"></div>
        <div class="plinth"></div><b>${name}</b><small>${sub}</small>${rar}${e?.matured ? `<span class="seal">${t('bloomedSeal')}</span>` : ''}`;
      b.addEventListener('click', () => {
        if (!e) { sound(2); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        openDetail(type);
      });
      grid.append(b);
    }
  }

  function openDetail(type) {
    const def = PLANTS[type];
    const e = getState().collection[type] || { planted: 0, matured: 0, dew: 0 };
    const stages = stagesOf(type);
    const ed = edu(type);
    const card = ed ? `<div class="pv-id">
        <div><span>${t('origin')}</span><b>${originOf(type)}</b></div>
        <div><span>${t('habitat')}</span><b>${habitatOf(type)}</b></div>
        <div><span>${t('height')}</span><b>${heightOf(type)}</b></div>
        <div><span>${t('bloomLabel')}</span><b>${bloomOf(type)}</b></div>
      </div>` : '';
    detail.className = `sheet r-${def.rarity || 'jardin'}`;
    detail.innerHTML = `<div class="grab"></div>
      <div class="pv-hero"><img src="${img(portrait(type, e))}" alt=""></div>
      <h2>${plantName(type)}</h2><p class="latin">${def.latin}${def.rarity ? ` · <span style="color:var(--rar)">${rarityName(def.rarity)}</span>` : ''}</p>
      <div class="pv-stages">${stages.map(([label, name], i) => {
        const seen = e.matured || i < stages.length - 1;
        return `<figure class="${seen ? '' : 'veiled'}"><img src="${img(name)}" alt=""><figcaption>${seen ? label : '?'}</figcaption></figure>`;
      }).join('')}</div>
      ${card}
      <div class="pv-fact"><span>${t('didYouKnow')}</span>${plantFact(type)}</div>
      ${ed ? `<div class="pv-fact pv-tip"><span>${t('gardenerTip')}</span>${tipOf(type)}</div>` : ''}
      <div class="pv-stats"><div><b>${e.planted}</b>${t('planted', { n: e.planted })}</div><div><b>${e.matured}</b>${t('bloomedN', { n: e.matured })}</div><div><b>${e.dew}</b>${t('dropsCollected')}</div></div>`;
    detail.classList.remove('hidden');
    sound(6);
  }

  // ---------- carte des origines ----------
  let mapDots = [];
  function renderMap() {
    const types = known().filter((ty) => edu(ty));
    $('#pvMapIntro').textContent = t('mapIntro', { n: types.length });
    const cv = $('#pvMapCanvas');
    const W = cv.parentElement.clientWidth || 340;
    const H = Math.round(W * 0.58);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const LAT_TOP = 80, LAT_BOT = -56;
    const px = (lon) => ((lon + 180) / 360) * W;
    const py = (lat) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * H;
    // océan façon papier ancien, puis terres à l'encre
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e9dcc0'); g.addColorStop(1, '#dcc9a6');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,90,50,0.18)'; c.lineWidth = 1;
    for (let lon = -150; lon <= 150; lon += 30) { c.beginPath(); c.moveTo(px(lon), 0); c.lineTo(px(lon), H); c.stroke(); }
    for (let lat = -40; lat <= 60; lat += 20) { c.beginPath(); c.moveTo(0, py(lat)); c.lineTo(W, py(lat)); c.stroke(); }
    c.fillStyle = '#b8a37a'; c.strokeStyle = '#7d6440'; c.lineWidth = 1.2; c.lineJoin = 'round';
    for (const poly of LANDS) {
      c.beginPath();
      poly.forEach(([lon, lat], i) => (i ? c.lineTo(px(lon), py(lat)) : c.moveTo(px(lon), py(lat))));
      c.closePath(); c.fill(); c.stroke();
    }
    const RC = { commune: '#5f7d4e', rare: '#2f7fb8', precieuse: '#8a5cc2', legendaire: '#c4931a', undefined: '#c25b7c' };
    mapDots = [];
    const seen = new Map();
    for (const ty of types) {
      const o = edu(ty).origin;
      const key = `${o.lat},${o.lon}`;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      // plusieurs espèces au même endroit : petite spirale pour qu'elles restent visibles
      const a = n * 2.4, r = n ? 4 + n * 1.6 : 0;
      const x = px(o.lon) + Math.cos(a) * r, y = py(o.lat) + Math.sin(a) * r;
      mapDots.push({ x, y, ty });
      c.fillStyle = 'rgba(255,250,235,0.9)';
      c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = RC[PLANTS[ty].rarity];
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    }
    // liste par continent
    const lang = getLang();
    const groups = {};
    for (const ty of types) {
      const o = edu(ty).origin;
      (groups[continentOf(o.lat, o.lon)] ||= []).push(ty);
    }
    const list = $('#pvMapList');
    list.replaceChildren();
    for (const k of ['asi', 'eur', 'afr', 'nam', 'sam', 'oce']) {
      if (!groups[k]) continue;
      const li = document.createElement('li');
      li.innerHTML = `<b>${CONTINENTS[lang][k]} <small>${groups[k].length}</small></b><span></span>`;
      const span = li.querySelector('span');
      for (const ty of groups[k].sort((a, b) => plantName(a).localeCompare(plantName(b)))) {
        const chip = document.createElement('button');
        chip.textContent = plantName(ty);
        chip.addEventListener('click', () => openDetail(ty));
        span.append(chip);
      }
      list.append(li);
    }
  }
  $('#pvMapCanvas').addEventListener('click', (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let best = null, bd = 18;
    for (const d of mapDots) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } }
    if (best) openDetail(best.ty);
  });

  // ---------- quiz ----------
  let quiz = null;
  function makeQuestion() {
    const pool = known().filter((ty) => edu(ty));
    const all = ORDER.filter((ty) => edu(ty));
    const q = pick(pool);
    const others = (fn) => {
      const right = fn(q);
      const seen = new Set([right]);
      const out = [];
      for (const ty of shuffle(all)) {
        const v = fn(ty);
        if (!v || seen.has(v)) continue;
        seen.add(v); out.push(v);
        if (out.length === 3) break;
      }
      return { right, options: shuffle([right, ...out]) };
    };
    const kinds = ['name', 'latin', 'origin', 'bloom', 'height'];
    const fact = plantFact(q);
    if (!fact.toLowerCase().includes(plantName(q).toLowerCase().split(' ')[0])) kinds.push('fact', 'fact');
    const kind = pick(kinds);
    const name = plantName(q);
    if (kind === 'name') return { q, kind, text: t('qName'), showImg: true, ...others(plantName) };
    if (kind === 'latin') return { q, kind, text: t('qLatin', { name }), showImg: true, ...others((ty) => PLANTS[ty].latin) };
    if (kind === 'origin') return { q, kind, text: t('qOrigin', { name }), showImg: true, ...others(originOf) };
    if (kind === 'bloom') return { q, kind, text: t('qBloom', { name }), showImg: true, ...others(bloomOf) };
    if (kind === 'height') return { q, kind, text: t('qHeight', { name }), showImg: true, ...others(heightOf) };
    return { q, kind, text: t('qFact'), quote: fact, showImg: false, ...others(plantName) };
  }

  function renderQuiz() {
    const box = $('#pvQuiz');
    box.replaceChildren();
    if (known().filter((ty) => edu(ty)).length < QUIZ_MIN) {
      box.innerHTML = `<p class="pv-intro">${t('quizLocked', { n: QUIZ_MIN })}</p>`;
      quiz = null;
      return;
    }
    quiz = makeQuestion();
    const left = quizLeft();
    box.innerHTML = `<p class="pv-intro">${left > 0 ? t('quizIntro', { left, reward: QUIZ_REWARD }) : t('quizDone')}</p>
      <div class="qz-card">
        ${quiz.showImg ? `<img src="${img(adultImage(quiz.q))}" alt="">` : ''}
        <h3>${quiz.text}</h3>
        ${quiz.quote ? `<blockquote>${quiz.quote}</blockquote>` : ''}
        <div class="qz-options"></div>
        <p class="qz-feedback" aria-live="polite"></p>
      </div>`;
    const opts = box.querySelector('.qz-options');
    for (const o of quiz.options) {
      const b = document.createElement('button');
      b.textContent = o;
      b.addEventListener('click', () => answer(b, o));
      opts.append(b);
    }
  }

  function answer(btn, value) {
    if (!quiz || quiz.done) return;
    quiz.done = true;
    const ok = value === quiz.right;
    for (const b of document.querySelectorAll('.qz-options button')) {
      b.disabled = true;
      if (b.textContent === quiz.right) b.classList.add('right');
    }
    if (!ok) btn.classList.add('wrong');
    const n = reward(ok);
    if (!ok) sound(1);
    const fb = document.querySelector('.qz-feedback');
    fb.innerHTML = `<b>${ok ? t('right', { n }) : t('wrong', { a: quiz.right })}</b><span>${plantName(quiz.q)} · ${originOf(quiz.q)}. ${plantFact(quiz.q)}</span>`;
    const next = document.createElement('button');
    next.className = 'btn primary';
    next.textContent = t('next');
    next.addEventListener('click', () => { quiz = null; sound(4); renderQuiz(); });
    fb.after(next);
  }

  // ---------- ouverture et fermeture ----------
  function open(type) {
    quiz = null;
    render();
    room.classList.remove('hidden', 'leaving');
    onOpen();
    if (type && getState().collection[type]) openDetail(type);
  }

  // Ferme d'abord la fiche, puis la pièce ; renvoie false s'il n'y avait rien à fermer.
  function close() {
    if (!detail.classList.contains('hidden')) { detail.classList.add('hidden'); return true; }
    if (room.classList.contains('hidden')) return false;
    room.classList.add('leaving');
    setTimeout(() => room.classList.add('hidden'), 350);
    onClose();
    return true;
  }

  $('#pvClose').addEventListener('click', () => { detail.classList.add('hidden'); close(); });
  room.addEventListener('click', (ev) => { if (ev.target === room || ev.target === grid) detail.classList.add('hidden'); });
  window.addEventListener('resize', () => { if (tab === 'map' && !room.classList.contains('hidden')) renderMap(); });

  return { open, close, isOpen: () => !room.classList.contains('hidden') };
}
