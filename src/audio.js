// Ambiance sonore entièrement synthétisée (Web Audio) : vent, carillon, gouttes, grillons, râteau.
const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66];

let ac = null;
let master, bus, rakeGain, rakeFilter;
let muted = false;
let timers = [];
let nightLevel = 0;

function noiseBuffer(seconds, brown) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

function impulse(seconds) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.85;
  master.connect(ac.destination);
  const verb = ac.createConvolver();
  verb.buffer = impulse(3.2);
  const wet = ac.createGain();
  wet.gain.value = 0.4;
  verb.connect(wet).connect(master);
  bus = ac.createGain();
  bus.connect(master);
  bus.connect(verb);

  // vent : bruit brun filtré, respiration lente
  const wind = ac.createBufferSource();
  wind.buffer = noiseBuffer(4, true);
  wind.loop = true;
  const wf = ac.createBiquadFilter();
  wf.type = 'lowpass';
  wf.frequency.value = 420;
  const wg = ac.createGain();
  wg.gain.value = 0.16;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lg = ac.createGain();
  lg.gain.value = 0.09;
  lfo.connect(lg).connect(wg.gain);
  const lfo2 = ac.createOscillator();
  lfo2.frequency.value = 0.05;
  const lg2 = ac.createGain();
  lg2.gain.value = 180;
  lfo2.connect(lg2).connect(wf.frequency);
  wind.connect(wf).connect(wg).connect(master);
  wind.start(); lfo.start(); lfo2.start();

  // râteau : bruit blanc en bande, volume piloté par la vitesse du doigt
  const rk = ac.createBufferSource();
  rk.buffer = noiseBuffer(2, false);
  rk.loop = true;
  rakeFilter = ac.createBiquadFilter();
  rakeFilter.type = 'bandpass';
  rakeFilter.frequency.value = 1600;
  rakeFilter.Q.value = 0.7;
  rakeGain = ac.createGain();
  rakeGain.gain.value = 0;
  rk.connect(rakeFilter).connect(rakeGain).connect(master);
  rk.start();

  scheduleAmbient();
}

function scheduleAmbient() {
  const loop = (fn, min, max) => {
    const go = () => {
      timers.push(setTimeout(() => { if (!muted && ac && ac.state === 'running') fn(); go(); }, min + Math.random() * (max - min)));
    };
    go();
  };
  loop(() => {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) setTimeout(() => chime(Math.floor(Math.random() * PENTA.length), 0.035), i * (180 + Math.random() * 300));
  }, 7000, 16000);
  loop(() => drop(0.03), 3500, 9000);
  loop(() => { if (nightLevel > 0.5) cricket(); }, 900, 2600);
}

export function setNight(n) {
  nightLevel = n;
}

export function chime(i = 4, vol = 0.12, when = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const f = PENTA[Math.max(0, Math.min(PENTA.length - 1, i))];
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  g.connect(bus);
  for (const [mult, amp] of [[1, 1], [2.76, 0.25], [5.4, 0.08]]) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * mult;
    const og = ac.createGain();
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + 3.3);
  }
}

export function drop(vol = 0.1) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  const f0 = 700 + Math.random() * 600;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + 0.09);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.2);
}

function cricket() {
  const t = ac.currentTime;
  for (let i = 0; i < 3; i++) {
    const o = ac.createOscillator();
    o.frequency.value = 4300 + Math.random() * 200;
    const g = ac.createGain();
    const s = t + i * 0.07;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.012, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.05);
    o.connect(g).connect(master);
    o.start(s);
    o.stop(s + 0.06);
  }
}

export function pour() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(1.2, false);
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2600;
  f.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
  for (let i = 0; i < 4; i++) setTimeout(() => drop(0.05), 150 + i * 160 + Math.random() * 80);
}

export function plantSound() {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.32);
  chime(3, 0.08, 0.12);
  chime(5, 0.07, 0.3);
}

export function collectSound(n = 0) {
  chime(6 + (n % 4), 0.1);
  chime(8 + (n % 3), 0.05, 0.08);
}

export function rakeSpeed(v) {
  if (!ac) return;
  const target = muted ? 0 : Math.min(0.22, v * 0.012);
  rakeGain.gain.setTargetAtTime(target, ac.currentTime, 0.04);
  rakeFilter.frequency.setTargetAtTime(1200 + Math.min(1600, v * 30), ac.currentTime, 0.08);
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ac.currentTime, 0.2);
}

export function pauseAudio() {
  if (ac && ac.state === 'running') ac.suspend();
}

export function resumeAudio() {
  if (ac && ac.state === 'suspended') ac.resume();
}
