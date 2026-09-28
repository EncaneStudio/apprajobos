import * as THREE from 'three';
import { G } from './state.js';
import { audio } from './audio.js';
import { STYLE_RANKS, ABILITIES } from './data/skills.js';
import { clamp, rand, lerp, angleDiff } from './util.js';

// ---------- Poses de ataque (brazo derecho empuña a Hebra) ----------
export const POSES = {
  ready: { hipsY: -0.06, torso: [0.12, 0, 0], shR: [-0.5, 0, -0.35], elR: [-0.7, 0, 0], shL: [0.1, 0, 0.35], elL: [-0.5, 0, 0], lgL: [-0.35, 0, 0.05], knL: [0.35, 0, 0], lgR: [0.25, 0, -0.05], knR: [0.25, 0, 0] },
  windR: { hipsY: -0.1, torso: [0.1, -0.8, 0], head: [0, 0.5, 0], shR: [-0.6, 0, -1.2], elR: [-0.5, 0, 0], shL: [-0.4, 0, 0.6], elL: [-0.6, 0, 0], lgL: [-0.5, 0, 0], knL: [0.5, 0, 0], lgR: [0.35, 0, 0], knR: [0.3, 0, 0] },
  slashL: { hipsY: -0.14, torso: [0.2, 0.75, 0], head: [0, -0.5, 0], shR: [-1.5, 0, 0.7], elR: [-0.15, 0, 0], shL: [0.4, 0, 0.9], elL: [-0.3, 0, 0], lgL: [-0.7, 0, 0], knL: [0.6, 0, 0], lgR: [0.5, 0, 0], knR: [0.2, 0, 0] },
  windL: { hipsY: -0.1, torso: [0.1, 0.8, 0], head: [0, -0.5, 0], shR: [-1.3, 0, 0.9], elR: [-1.3, 0, 0], shL: [0.2, 0, 0.4], elL: [-0.5, 0, 0], lgL: [-0.4, 0, 0], knL: [0.4, 0, 0], lgR: [0.3, 0, 0], knR: [0.3, 0, 0] },
  slashR: { hipsY: -0.14, torso: [0.2, -0.8, 0], head: [0, 0.5, 0], shR: [-1.4, 0, -1.3], elR: [-0.1, 0, 0], shL: [-0.6, 0, 0.4], elL: [-0.8, 0, 0], lgL: [-0.6, 0, 0], knL: [0.5, 0, 0], lgR: [0.5, 0, 0], knR: [0.3, 0, 0] },
  over: { hipsY: -0.02, torso: [-0.25, 0, 0], head: [-0.2, 0, 0], shR: [-2.9, 0, -0.2], elR: [-0.6, 0, 0], shL: [-2.6, 0, 0.3], elL: [-0.6, 0, 0], lgL: [-0.3, 0, 0], knL: [0.2, 0, 0], lgR: [0.2, 0, 0], knR: [0.2, 0, 0] },
  down: { hipsY: -0.22, torso: [0.5, 0, 0], head: [0.1, 0, 0], shR: [-1.1, 0, -0.1], elR: [-0.1, 0, 0], shL: [-0.9, 0, 0.2], elL: [-0.3, 0, 0], lgL: [-0.8, 0, 0], knL: [0.8, 0, 0], lgR: [0.5, 0, 0], knR: [0.5, 0, 0] },
  thrust: { hipsY: -0.18, torso: [0.25, -0.35, 0], shR: [-1.57, 0.2, 0], elR: [0, 0, 0], shL: [0.4, 0, 0.6], elL: [-0.4, 0, 0], lgL: [-0.8, 0, 0], knL: [0.5, 0, 0], lgR: [0.6, 0, 0], knR: [0.1, 0, 0] },
  up: { hipsY: 0.02, torso: [-0.35, 0.2, 0], head: [-0.3, 0, 0], shR: [-3.0, 0, -0.3], elR: [0, 0, 0], shL: [-0.2, 0, 0.8], elL: [-0.3, 0, 0], lgL: [-0.5, 0, 0], knL: [0.3, 0, 0], lgR: [0.2, 0, 0], knR: [0.1, 0, 0] },
  spin: { hipsY: -0.12, torso: [0.1, 0, 0], shR: [-1.57, 0, -1.4], elR: [0, 0, 0], shL: [-0.3, 0, 1.3], elL: [0, 0, 0], lgL: [-0.4, 0, 0.2], knL: [0.4, 0, 0], lgR: [0.3, 0, -0.2], knR: [0.3, 0, 0] },
  crouch: { hipsY: -0.3, torso: [0.35, -0.3, 0], shR: [-0.4, 0, -0.8], elR: [-1.2, 0, 0], shL: [-0.6, 0, 0.3], elL: [-0.6, 0, 0], lgL: [-1.0, 0, 0], knL: [1.3, 0, 0], lgR: [0.1, 0, 0], knR: [1.1, 0, 0] },
  airTuck: { hipsY: 0, torso: [0.3, 0, 0], shR: [-1.0, 0, -0.6], elR: [-1.0, 0, 0], shL: [-0.8, 0, 0.5], elL: [-1.0, 0, 0], lgL: [-1.2, 0, 0], knL: [1.8, 0, 0], lgR: [-0.8, 0, 0], knR: [1.6, 0, 0] },
  cast: { hipsY: -0.08, torso: [-0.1, 0, 0], head: [-0.25, 0, 0], shR: [-2.4, 0, -0.5], elR: [-0.2, 0, 0], shL: [-2.4, 0, 0.5], elL: [-0.2, 0, 0], lgL: [-0.2, 0, 0.1], knL: [0.2, 0, 0], lgR: [0.2, 0, -0.1], knR: [0.2, 0, 0] },
};

// blade: [t, yaw°, pitch°, ext]  (yaw + = hacia la izquierda del personaje)
const spinBlade = (turns, dur, pitch = 0, ext = 1) => {
  const k = [];
  for (let i = 0; i <= 12; i++) k.push([(i / 12) * dur, -180 + (360 * turns * i) / 12, pitch, ext]);
  return k;
};
const tormentaBlade = () => {
  const k = [[0, -100, 10]];
  for (let i = 1; i <= 12; i++) k.push([0.06 * i, i % 2 ? 100 : -100, rand(-20, 25)]);
  k.push([0.8, 0, 110], [0.86, 0, -40], [1.05, 0, -40]);
  return k;
};
const tormentaPose = () => {
  const k = [[0, 'windR']];
  for (let i = 1; i <= 12; i++) k.push([0.06 * i, i % 2 ? 'slashL' : 'slashR']);
  k.push([0.8, 'over'], [0.86, 'down'], [1.05, 'down']);
  return k;
};

export const ATTACKS = {
  // ===== Modo rígido (espada) =====
  r1: { mode: 'rigid', dur: 0.4, hit: [0.1, 0.2], cancel: 0.2, range: 2.8, arc: 150, dmg: 1, kb: 2.5, lunge: [0, 0.14, 5], sfx: 'swing',
    blade: [[0, -120, 15], [0.08, -110, 10], [0.2, 100, -10], [0.4, 80, -15]], pose: [[0, 'windR'], [0.08, 'windR'], [0.2, 'slashL'], [0.4, 'slashL']], next: { L: 'r2', H: 'rLaunch' } },
  r2: { mode: 'rigid', dur: 0.4, hit: [0.09, 0.19], cancel: 0.2, range: 2.8, arc: 150, dmg: 1.05, kb: 2.5, lunge: [0, 0.12, 5], sfx: 'swing',
    blade: [[0, 110, 10], [0.07, 110, 5], [0.19, -100, -5], [0.4, -90, -10]], pose: [[0, 'windL'], [0.07, 'windL'], [0.19, 'slashR'], [0.4, 'slashR']], next: { L: 'r3', H: 'rTormenta' } },
  r3: { mode: 'rigid', dur: 0.48, hit: [0.16, 0.26], cancel: 0.27, range: 3, arc: 90, dmg: 1.35, kb: 4, lunge: [0.05, 0.18, 6], sfx: 'heavy', shake: 0.25,
    blade: [[0, 0, 110], [0.12, 0, 130], [0.24, 0, -50], [0.48, 0, -40]], pose: [[0, 'over'], [0.12, 'over'], [0.24, 'down'], [0.48, 'down']], next: { L: 'r4', H: 'rHeavy' } },
  r4: { mode: 'rigid', dur: 0.62, hit: [0.12, 0.36], cancel: 0.5, range: 3.3, arc: 360, dmg: 1.9, kb: 9, lunge: [0, 0.2, 4], sfx: 'heavy', name: 'Remolino de Hebra', spinBody: 1, shake: 0.4, hitstop: 0.09,
    blade: spinBlade(1, 0.4, -5).concat([[0.62, 180, -20]]), pose: [[0, 'spin'], [0.62, 'spin']], next: { L: 'r1', H: 'rHeavy' } },
  rHeavy: { mode: 'rigid', dur: 0.72, hit: [0.32, 0.42], cancel: 0.52, range: 3.6, arc: 70, dmg: 2.4, kb: 8, lunge: [0.28, 0.4, 13], sfx: 'heavy', name: 'Golpe de Hebra', shake: 0.5, hitstop: 0.1, armor: true,
    blade: [[0, -40, 30], [0.28, -40, 40], [0.34, 0, 2], [0.72, 0, -5]], pose: [[0, 'crouch'], [0.28, 'crouch'], [0.34, 'thrust'], [0.72, 'thrust']], next: { L: 'r1', H: null } },
  rLaunch: { mode: 'rigid', dur: 0.55, hit: [0.14, 0.24], cancel: 0.36, range: 2.9, arc: 120, dmg: 1.2, kb: 0.4, launch: 12.5, sfx: 'heavy', name: 'Alzamiento', follow: true, shake: 0.2,
    blade: [[0, -10, -60], [0.1, -10, -70], [0.22, 0, 130], [0.55, 0, 120]], pose: [[0, 'down'], [0.1, 'down'], [0.22, 'up'], [0.55, 'up']], next: { L: 'r3', H: null } },
  rTormenta: { mode: 'rigid', dur: 1.05, hit: [0.06, 0.78], multi: 0.065, cancel: 0.95, range: 3, arc: 160, dmg: 0.33, kb: 0.4, stun: 0.3, sfx: 'swing', name: 'Tormenta de Cortes', req: 'r_danza', fallback: 'rHeavy',
    finisher: { t: 0.86, dmg: 1.8, kb: 7, range: 3.2, arc: 120 }, blade: tormentaBlade(), pose: tormentaPose(), lunge: [0, 0.8, 1.5], next: { L: 'r1', H: null } },
  // aéreos
  a1: { mode: 'rigid', air: true, dur: 0.34, hit: [0.07, 0.17], cancel: 0.17, range: 2.8, arc: 160, dmg: 0.9, kb: 1, airHit: true, sfx: 'swing',
    blade: [[0, -110, 20], [0.07, -110, 15], [0.17, 100, -5], [0.34, 80, -10]], pose: [[0, 'windR'], [0.17, 'slashL'], [0.34, 'slashL']], next: { L: 'a2', H: 'aH' } },
  a2: { mode: 'rigid', air: true, dur: 0.34, hit: [0.07, 0.17], cancel: 0.17, range: 2.8, arc: 160, dmg: 0.95, kb: 1, airHit: true, sfx: 'swing',
    blade: [[0, 110, 15], [0.07, 110, 10], [0.17, -100, -5], [0.34, -90, -10]], pose: [[0, 'windL'], [0.17, 'slashR'], [0.34, 'slashR']], next: { L: 'a3', H: 'aH' } },
  a3: { mode: 'rigid', air: true, dur: 0.45, hit: [0.14, 0.24], cancel: 0.3, range: 3, arc: 100, dmg: 1.4, kb: 5, launch: -14, sfx: 'heavy', name: 'Hachazo Aéreo', shake: 0.3,
    blade: [[0, 0, 120], [0.12, 0, 130], [0.24, 0, -60], [0.45, 0, -50]], pose: [[0, 'over'], [0.24, 'down'], [0.45, 'down']], next: { L: null, H: 'aH' } },
  aH: { mode: 'rigid', air: true, dur: 2.0, slam: true, hit: [0, 0], range: 4.8, arc: 360, dmg: 2.2, kb: 7, launch: 7, sfx: 'heavy', name: 'Caída Meteoro', shake: 0.8, hitstop: 0.1,
    blade: [[0, 0, -80], [2, 0, -80]], pose: [[0, 'down'], [2, 'down']], next: {} },
  // ===== Modo flexible (látigo) =====
  f1: { mode: 'flex', dur: 0.46, hit: [0.13, 0.22], cancel: 0.24, range: 7, arc: 36, dmg: 0.95, kb: 2.5, stun: 0.25, sfx: 'whip', lunge: [0, 0.1, 2],
    blade: [[0, -30, 50, 0.1], [0.1, -10, 25, 0.5], [0.18, 0, 2, 1], [0.3, 0, -4, 1], [0.46, 0, -10, 0.25]], pose: [[0, 'over'], [0.12, 'thrust'], [0.46, 'thrust']], next: { L: 'f2', H: 'fH' } },
  f2: { mode: 'flex', dur: 0.52, hit: [0.12, 0.3], cancel: 0.3, range: 6.5, arc: 210, dmg: 1, kb: 3, stun: 0.25, sfx: 'whip',
    blade: [[0, -120, 8, 0.6], [0.08, -115, 5, 1], [0.3, 115, 0, 1], [0.52, 90, -5, 0.3]], pose: [[0, 'windR'], [0.3, 'slashL'], [0.52, 'slashL']], next: { L: 'f3', H: 'fH' } },
  f3: { mode: 'flex', dur: 0.75, hit: [0.08, 0.55], multi: 0.14, cancel: 0.6, range: 6.2, arc: 360, dmg: 0.75, kb: 4.5, sfx: 'whip', name: 'Espiral de Hebra', spinBody: 2, shake: 0.2,
    blade: spinBlade(2, 0.6, 3).concat([[0.75, 180, -10, 0.3]]), pose: [[0, 'spin'], [0.75, 'spin']], next: { L: 'f1', H: 'fH' } },
  fH: { mode: 'flex', dur: 0.62, hit: [0.15, 0.24], cancel: 0.45, range: 9.5, arc: 44, dmg: 0.7, kb: 0, pull: true, stun: 0.9, sfx: 'whip', name: 'Tirón',
    blade: [[0, -20, 20, 0.2], [0.12, 0, 5, 1], [0.24, 0, 3, 1], [0.4, 0, 10, 0.3], [0.62, 0, 0, 0.2]], pose: [[0, 'windR'], [0.14, 'thrust'], [0.3, 'thrust'], [0.62, 'ready']], next: { L: 'f2', H: null } },
  fa1: { mode: 'flex', air: true, dur: 0.42, hit: [0.1, 0.22], cancel: 0.22, range: 6, arc: 80, dmg: 0.85, kb: 1, airHit: true, sfx: 'whip',
    blade: [[0, -60, 20, 0.4], [0.18, 30, -10, 1], [0.42, 20, -10, 0.3]], pose: [[0, 'windR'], [0.2, 'slashL'], [0.42, 'slashL']], next: { L: 'fa2', H: 'faH' } },
  fa2: { mode: 'flex', air: true, dur: 0.5, hit: [0.1, 0.3], cancel: 0.3, range: 6, arc: 220, dmg: 0.9, kb: 2, airHit: true, sfx: 'whip',
    blade: [[0, 110, 0, 0.6], [0.3, -110, -10, 1], [0.5, -90, -10, 0.3]], pose: [[0, 'windL'], [0.3, 'slashR'], [0.5, 'slashR']], next: { L: null, H: 'faH' } },
  faH: { mode: 'flex', air: true, dur: 0.6, hit: [0.14, 0.26], cancel: 0.45, range: 7, arc: 120, dmg: 1.5, kb: 3, launch: -16, bounce: 9, sfx: 'whip', name: 'Látigo Descendente', shake: 0.3,
    blade: [[0, 0, 80, 0.4], [0.14, 0, -45, 1], [0.3, 0, -60, 1], [0.6, 0, -40, 0.3]], pose: [[0, 'over'], [0.14, 'down'], [0.6, 'down']], next: {} },
  // ===== Especiales =====
  sw: { mode: 'any', dur: 0.5, hit: [0.08, 0.18], cancel: 0.3, range: 4.5, arc: 360, dmg: 2.2, kb: 6, launch: 5, sfx: 'switch', name: '¡Transmutación!', shake: 0.4, hitstop: 0.08,
    blade: spinBlade(1, 0.3, 10, 0.6).concat([[0.5, 180, 0, 0.4]]), pose: [[0, 'spin'], [0.5, 'ready']], spinBody: 1, next: { L: null, H: null } },
  // Habilidades
  ab_estocada: { mode: 'any', dur: 0.55, hit: [0.05, 0.35], range: 2.4, arc: 360, dmg: 2.6, kb: 6, sfx: 'heavy', name: 'Estocada Celeste', ability: true, dash: 42, iframes: 0.4, multi: 0.3,
    blade: [[0, 0, 0, 1], [0.55, 0, 0, 1]], pose: [[0, 'thrust'], [0.55, 'thrust']], next: {} },
  ab_onda: { mode: 'any', dur: 0.8, hit: [0.36, 0.42], range: 7.5, arc: 360, dmg: 3.2, kb: 10, launch: 9, sfx: 'boom', name: 'Onda de Choque', ability: true, shake: 1, hitstop: 0.12, armor: true, ring: 8,
    blade: [[0, 0, 120], [0.3, 0, 130], [0.38, 0, -85], [0.8, 0, -85]], pose: [[0, 'over'], [0.3, 'over'], [0.38, 'down'], [0.8, 'down']], next: {} },
  ab_torbellino: { mode: 'any', dur: 1.3, hit: [0.05, 1.2], multi: 0.1, range: 7, arc: 360, dmg: 0.55, kb: 1.2, sfx: 'whip', name: 'Torbellino de Hebra', ability: true, spinBody: 4, vacuum: true, armor: true, forceFlex: true,
    blade: spinBlade(4, 1.2, 5).concat([[1.3, 180, 0, 0.3]]), pose: [[0, 'spin'], [1.3, 'spin']], next: {} },
  ab_prision: { mode: 'any', dur: 0.8, hit: [0.3, 0.35], range: 12, arc: 360, dmg: 1, kb: 0, bind: 4, sfx: 'magic', name: 'Nudo Prisión', ability: true, ring: 12,
    blade: spinBlade(1, 0.3, 30, 1).concat([[0.8, 180, 30, 0.3]]), pose: [[0, 'cast'], [0.8, 'cast']], forceFlex: true, next: {} },
  ab_sanar: { mode: 'any', dur: 0.8, hit: [0, 0], range: 0, arc: 0, dmg: 0, heal: 0.35, sfx: 'magic', name: 'Luz Sanadora', ability: true,
    blade: [[0, 0, 90], [0.8, 0, 90]], pose: [[0, 'cast'], [0.8, 'cast']], next: {} },
  ab_lluvia: { mode: 'any', dur: 0.9, hit: [0, 0], range: 0, arc: 0, dmg: 0, rain: 12, sfx: 'magic', name: 'Lluvia de Filos', ability: true,
    blade: [[0, 0, 90], [0.9, 0, 90]], pose: [[0, 'cast'], [0.9, 'cast']], next: {} },
};

export function sampleKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0] || 1);
      const e = f * f * (3 - 2 * f);
      const out = [t];
      for (let j = 1; j < a.length; j++) out.push(typeof a[j] === 'number' ? lerp(a[j], b[j] ?? a[j], e) : (f < 0.5 ? a[j] : b[j]));
      return out;
    }
  }
  return keys[keys.length - 1];
}

// ---------- Medidor de estilo ----------
export class Style {
  constructor() { this.points = 0; this.idle = 0; this.recent = []; this.rank = 0; this.best = 0; this.total = 0; this.samples = 0; }
  add(pts, move) {
    const rep = this.recent.filter((m) => m === move).length;
    const mult = rep >= 3 ? 0.35 : rep === 2 ? 0.6 : 1;
    this.recent.push(move); if (this.recent.length > 5) this.recent.shift();
    this.points = Math.min(1800, this.points + pts * mult);
    this.idle = 0;
    this.updateRank();
  }
  hurt() { this.points = Math.max(0, this.points - 380); this.updateRank(); }
  updateRank() {
    let r = 0;
    for (let i = 0; i < STYLE_RANKS.length; i++) if (this.points >= STYLE_RANKS[i].pts) r = i;
    if (r > this.rank) {
      if (r === 4) G.companion?.say('rankS', true);
      if (r === 6) G.companion?.say('rankSSS', true);
      if (r >= 3) audio.play('ui');
    }
    this.rank = r;
    if (r > this.best) this.best = r;
  }
  update(dt, inCombat) {
    this.idle += dt;
    if (this.idle > 2.2) { this.points = Math.max(0, this.points - dt * (40 + this.points * 0.12)); this.updateRank(); }
    if (inCombat) { this.total += this.rank; this.samples++; }
  }
  progress() {
    const cur = STYLE_RANKS[this.rank], nxt = STYLE_RANKS[this.rank + 1];
    if (!nxt) return 1;
    return (this.points - cur.pts) / (nxt.pts - cur.pts);
  }
  xpMult() { return 1 + this.rank * 0.15; }
}

// ---------- Daño a enemigos ----------
const _v = new THREE.Vector3();
export function computeDamage(p, mult, { ability = false, mode = p.mode } = {}) {
  const S = p.stats;
  let d = S.atk * mult;
  if (mode === 'rigid') d *= 1 + (p.skill('r_temple') * 0.08);
  else d *= 1 + (p.skill('f_serpiente') * 0.1);
  if (p.skill('r_juicio') && G.style.rank >= 4) d *= 1.25;
  if (ability) d *= 1 + S.spi * 0.03;
  d *= 1 + p.fragments() * 0.1;
  const crit = Math.random() * 100 < S.crit;
  if (crit) d *= 1.8;
  d *= rand(0.92, 1.08);
  return { dmg: Math.max(1, Math.round(d)), crit };
}

export function hitEnemy(e, def, p, { mult = 1, dirOverride = null, point = null, moveId = '?' } = {}) {
  if (e.dead) return;
  const { dmg, crit } = computeDamage(p, (def.dmg ?? 1) * mult, { ability: def.ability });
  const dir = dirOverride || _v.subVectors(e.pos, p.pos).setY(0).normalize();
  if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
  e.takeHit(dmg, { dir, kb: def.kb || 0, launch: def.launch || 0, stun: (def.stun || 0.2) * (1 + p.skill('f_serpiente') * 0.15), crit, bind: def.bind, air: !p.onGround });
  const hp = point || _v.copy(e.pos).setY(e.pos.y + e.height * 0.6);
  G.fx.hit(hp, crit ? [1, 0.5, 0.3] : p.mode === 'rigid' ? [1, 0.9, 0.5] : [0.4, 1, 0.8], crit ? 22 : 12);
  G.fx.damageNumber(hp, dmg, { crit });
  audio.play(crit ? 'crit' : 'hit', { pitch: rand(0.9, 1.15) });
  G.hitstop = Math.max(G.hitstop, def.hitstop || (crit ? 0.07 : 0.045));
  G.shake = Math.max(G.shake, (def.shake || 0.12) * (crit ? 1.5 : 1));
  G.style.add((def.dmg || 1) * 26 + (crit ? 15 : 0) + (!p.onGround ? 12 : 0), moveId);
  // regeneración de espíritu al golpear
  p.mana = Math.min(p.stats.maxMana, p.mana + 1.2 + p.skill('e_fluir') * 1.5);
  // runa elemental
  const rune = p.equip.rune;
  if (rune && rune.elem && Math.random() < 0.25 && !e.dead) {
    if (rune.elem === 'fuego') { e.burn = 3; e.burnDmg = Math.max(1, Math.round(p.stats.atk * 0.25)); G.fx.damageNumber(hp, 0, { text: '¡Quemado!', color: '#ff8a3a' }); }
    else if (rune.elem === 'hielo') { e.slow = 3; G.fx.damageNumber(hp, 0, { text: '¡Congelado!', color: '#8ad8ff' }); }
    else if (rune.elem === 'rayo') chainLightning(e, p, dmg * 0.5);
  }
  if (p.skill('f_celeste') && p.mode === 'flex' && Math.random() < 0.35) chainLightning(e, p, dmg * 0.4);
}

function chainLightning(src, p, dmg) {
  let n = 0;
  for (const o of G.enemies) {
    if (o === src || o.dead || n >= 2) continue;
    if (o.pos.distanceTo(src.pos) < 7) {
      n++;
      o.takeHit(Math.round(dmg), { dir: _v.subVectors(o.pos, src.pos).setY(0).normalize(), kb: 1, stun: 0.4 });
      const a = src.pos.clone().setY(src.pos.y + 1.2), b = o.pos.clone().setY(o.pos.y + 1.2);
      for (let i = 0; i <= 6; i++) { const q = a.clone().lerp(b, i / 6); G.fx.particles.emit(q.x, q.y, q.z, { count: 3, color: [0.7, 0.8, 1], speed: 1, up: 0, life: 0.25, size: 0.5, grav: 0 }); }
      G.fx.damageNumber(b, Math.round(dmg), { color: '#aac8ff' });
    }
  }
}

// Busca un objetivo "suave" para orientar el ataque
export function softTarget(p, maxDist = 7, arcDeg = 140) {
  if (G.lockTarget && !G.lockTarget.dead) return G.lockTarget;
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (e.dead || !e.active) continue;
    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist) continue;
    const a = Math.abs(angleDiff(p.facing, Math.atan2(dx, dz)));
    if (a > (arcDeg * Math.PI) / 360) continue;
    const score = d + a * 3;
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}

export function abilityAvailable(p, id) {
  const ab = ABILITIES[id];
  if (!ab) return false;
  return (p.cooldowns[id] || 0) <= 0 && p.mana >= ab.cost;
}
