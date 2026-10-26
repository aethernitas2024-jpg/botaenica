import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, plant, water, advance, collect, rake, stageOf, timeLeft, sanitize,
  canPlant, PLANTS, MAX_DROPS, RAKE_DAILY_CAP, RAKE_LENGTH_PER_DEW, formatDuration, FIRST_BLOOM_REWARD, PACKET_COST, RARITIES, drawPacket, BIOMES, biomeUnlocked, discovered, quizAnswer, quizLeft, QUIZ_REWARD, QUIZ_DAILY,
} from '../src/logic.js';

const MIN = 60000;
const T0 = new Date(2026, 9, 23, 10, 0).getTime();
const land = { id: 'a', kind: 'land' };
const pond = { id: 'w', kind: 'water' };

test('planter coûte de la rosée et respecte le type de sol', () => {
  const s = createState(T0);
  assert.equal(canPlant(s, pond, 'bambou').reason, 'terre');
  assert.equal(canPlant(s, land, 'lotus').reason, 'eau');
  assert.equal(canPlant(s, land, 'pin').reason, 'rosée');
  const r = plant(s, land, 'bambou', T0, 0.5);
  assert.ok(r.ok);
  assert.equal(s.dew, 5 - PLANTS.bambou.cost);
  assert.equal(canPlant(s, land, 'mousse').reason, 'occupé');
});

test('la mousse mûrit en 10 minutes, deux fois plus vite arrosée', () => {
  const s = createState(T0);
  const { plant: p } = plant(s, land, 'mousse', T0);
  advance(s, T0 + 5 * MIN);
  assert.equal(p.growth, 0.5);
  water(s, p.id, T0 + 5 * MIN);
  advance(s, T0 + 7.5 * MIN);
  assert.equal(p.growth, 1);
  assert.equal(stageOf(p), PLANTS.mousse.stages.length - 1);
});

test('l’arrosage s’arrête après sa durée', () => {
  const s = createState(T0);
  s.dew = 100;
  const { plant: p } = plant(s, land, 'pin', T0, 0.1);
  water(s, p.id, T0);
  advance(s, T0 + 4 * 60 * MIN); // 2 h x2 puis 2 h x1 = 6 h effectives sur 24
  assert.ok(Math.abs(p.growth - 0.25) < 1e-9);
});

test('une plante mûre produit de la rosée plafonnée à 3 gouttes', () => {
  const s = createState(T0);
  const { plant: p } = plant(s, land, 'mousse', T0);
  const sum = advance(s, T0 + 10 * MIN + 10 * 24 * 60 * MIN);
  assert.equal(p.drops, MAX_DROPS);
  assert.equal(sum.produced, MAX_DROPS);
  assert.equal(sum.matured.length, 1);
  assert.equal(collect(s, p.id), 1);
  assert.equal(s.dew, 6 + FIRST_BLOOM_REWARD);
  assert.equal(p.drops, MAX_DROPS - 1);
});

test('ratisser donne de la rosée avec un plafond quotidien', () => {
  const s = createState(T0);
  assert.equal(rake(s, RAKE_LENGTH_PER_DEW * 2.5, T0), 2);
  rake(s, 1000, T0);
  assert.equal(s.rake.earned, RAKE_DAILY_CAP);
  assert.equal(rake(s, 1000, T0), 0);
  assert.equal(rake(s, RAKE_LENGTH_PER_DEW, T0 + 24 * 60 * MIN), 1);
});

test('temps restant tient compte de l’arrosage', () => {
  const s = createState(T0);
  const { plant: p } = plant(s, land, 'mousse', T0);
  assert.equal(timeLeft(p, T0), 10 * MIN);
  water(s, p.id, T0);
  assert.equal(timeLeft(p, T0), 5 * MIN);
  assert.equal(formatDuration(5 * MIN), '5 min');
  assert.equal(formatDuration(125 * MIN), '2 h 05');
});

test('une sauvegarde abîmée redonne un jardin neuf', () => {
  assert.equal(sanitize(null, T0).dew, 5);
  assert.equal(sanitize({ version: 1, dew: -3, plants: [{ type: 'licorne' }] }, T0).plants.length, 0);
  const ok = sanitize({ version: 1, dew: 9, plants: [{ id: 4, type: 'mousse', growth: 1 }] }, T0);
  assert.equal(ok.dew, 9);
  assert.equal(ok.nextId, 5);
});

test('arroser une plante mûre double sa rosée', () => {
  const s = createState(T0);
  const { plant: p } = plant(s, land, 'mousse', T0);
  advance(s, T0 + 10 * MIN);
  water(s, p.id, T0 + 10 * MIN);
  advance(s, T0 + 30 * MIN); // 20 min arrosées = 40 min effectives = 2 gouttes
  assert.equal(p.drops, 2);
});

test('la collection suit chaque espèce et offre la première floraison', () => {
  const s = createState(T0);
  const r = plant(s, land, 'mousse', T0);
  assert.equal(r.discovered, true);
  assert.equal(s.collection.mousse.planted, 1);
  const sum = advance(s, T0 + 10 * MIN);
  assert.deepEqual(sum.firstBlooms, ['mousse']);
  assert.equal(s.dew, 5 + FIRST_BLOOM_REWARD);
  s.plants[0].drops = 1;
  collect(s, s.plants[0].id);
  assert.equal(s.collection.mousse.dew, 1);
  // une deuxième mousse ne redonne pas la récompense
  plant(s, { id: 'b', kind: 'land' }, 'mousse', T0 + 10 * MIN);
  const sum2 = advance(s, T0 + 20 * MIN);
  assert.equal(sum2.firstBlooms.length, 0);
  assert.equal(s.collection.mousse.matured, 2);
});

test('une ancienne sauvegarde retrouve sa collection', () => {
  const s = sanitize({ version: 1, dew: 3, plants: [{ id: 1, type: 'bambou', growth: 1 }, { id: 2, type: 'pin', growth: 0.2 }] }, T0);
  assert.deepEqual(s.collection.bambou, { planted: 1, matured: 1, dew: 0 });
  assert.deepEqual(s.collection.pin, { planted: 1, matured: 0, dew: 0 });
});

test('un sachet coûte de la rosée et donne une graine de collection', () => {
  const s = createState(T0);
  s.dew = PACKET_COST - 1;
  assert.equal(drawPacket(s), null);
  s.dew = PACKET_COST;
  const r = drawPacket(s, () => 0); // tirage minimal : commune, première espèce encore inconnue
  assert.equal(s.dew, 0);
  assert.equal(r.rarity, 'commune');
  assert.equal(s.seeds[r.type], 1);
  assert.equal(r.isNew, true);
  assert.equal(PLANTS[r.type].collection, true);
});

test('le dernier pour cent du tirage donne une légendaire', () => {
  const s = createState(T0);
  s.dew = PACKET_COST;
  const r = drawPacket(s, () => 0.999);
  assert.equal(r.rarity, 'legendaire');
});

test('une espèce de collection se plante avec sa graine, sans rosée', () => {
  const s = createState(T0);
  assert.equal(canPlant(s, land, 'ginkgo').reason, 'graine');
  s.seeds.ginkgo = 1;
  const r = plant(s, land, 'ginkgo', T0);
  assert.ok(r.ok);
  assert.equal(s.seeds.ginkgo, 0);
  assert.equal(s.dew, 5);
  assert.equal(r.discovered, true);
  assert.equal(canPlant(s, pond, 'nenuphar_blanc').reason, 'graine');
  s.seeds.nenuphar_blanc = 1;
  assert.equal(canPlant(s, { id: 'z', kind: 'land' }, 'nenuphar_blanc').reason, 'eau');
});

test('les 200 espèces sont bien rangées', () => {
  const coll = Object.values(PLANTS).filter((d) => d.collection);
  assert.equal(coll.length, 200);
  for (const d of coll) {
    assert.ok(RARITIES[d.rarity], d.name);
    assert.ok(d.stages.length >= 3, d.name);
    assert.ok(d.fact.length > 10 && d.latin, d.name);
  }
});

test('les lieux se débloquent avec les découvertes et filtrent les familles', () => {
  const s = createState(T0);
  assert.equal(biomeUnlocked(s, 'zen'), true);
  assert.equal(biomeUnlocked(s, 'prairie'), false);
  ['ginkgo', 'tulipe', 'iris_japon', 'aloe', 'riz', 'chene', 'lierre', 'houx'].forEach((t) => { s.collection[t] = { planted: 1, matured: 0, dew: 0 }; });
  assert.equal(discovered(s), 8);
  assert.equal(biomeUnlocked(s, 'prairie'), true);
  s.seeds.ginkgo = 1;
  assert.equal(canPlant(s, { id: 'prairie:1', kind: 'land', allow: BIOMES.prairie.allow }, 'ginkgo').reason, 'lieu');
  s.seeds.tulipe = 1;
  assert.ok(canPlant(s, { id: 'prairie:1', kind: 'land', allow: BIOMES.prairie.allow }, 'tulipe').ok);
});

test('le quiz rapporte de la rosée, avec un plafond par jour', () => {
  const s = createState(T0);
  assert.equal(quizAnswer(s, false, T0), 0);
  assert.equal(quizAnswer(s, true, T0), QUIZ_REWARD);
  assert.equal(s.dew, 5 + QUIZ_REWARD);
  for (let i = 0; i < 20; i++) quizAnswer(s, true, T0);
  assert.equal(quizLeft(s, T0), 0);
  assert.equal(s.dew, 5 + QUIZ_REWARD * QUIZ_DAILY);
  assert.equal(quizLeft(s, T0 + 24 * 60 * MIN), QUIZ_DAILY);
});
