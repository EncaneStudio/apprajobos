import * as THREE from 'three';
import { GEO, mergeColored, vcToonMat, addOutline, lerp } from './util.js';

const CAP = new THREE.CapsuleGeometry(1, 1, 3, 8);

function part(items, mat, parent, outline) {
  const m = new THREE.Mesh(mergeColored(items), mat);
  m.castShadow = true;
  parent.add(m);
  if (outline) addOutline(m, outline);
  return m;
}

/**
 * Humanoide articulado. kind: 'elf' | 'goblin' | 'brute' | 'golem' | 'herald'
 */
export function buildHumanoid(look = {}, { outline = 0.022, kind = 'elf' } = {}) {
  const mat = vcToonMat();
  const s = look.height || 1;
  const w = look.wide ? 1.25 : 1;
  const skin = look.skin ?? 0xf2d0b0, hair = look.hair ?? 0xd8c07a, robe = look.robe ?? 0x3f7fd8;
  const pants = look.pants ?? 0x5a4a3a, boots = look.boots ?? 0x4a3526, belt = look.belt ?? 0x6b4a2a;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const head = new THREE.Group(); head.position.y = 0.6; torso.add(head);
  const ol = outline;
  const golem = kind === 'golem', gob = kind === 'goblin', brute = kind === 'brute', herald = kind === 'herald';

  // ----- torso -----
  const T = [];
  if (golem) {
    T.push({ g: GEO.dodeca, c: robe, p: [0, 0.3, 0], s: [0.85, 0.75, 0.6] });
    T.push({ g: GEO.dodeca, c: pants, p: [0, -0.02, 0], s: [0.5, 0.35, 0.4] });
    T.push({ g: GEO.box, c: look.glow ?? 0x7af0ff, p: [0, 0.3, 0.27], s: [0.14, 0.14, 0.05] });
    T.push({ g: GEO.dodeca, c: pants, p: [0.36, 0.52, 0], s: [0.34, 0.3, 0.34] }, { g: GEO.dodeca, c: pants, p: [-0.36, 0.52, 0], s: [0.34, 0.3, 0.34] });
    if (look.moss) T.push({ g: GEO.ico, c: look.moss, p: [0.1, 0.62, -0.1], s: [0.5, 0.2, 0.4] }, { g: GEO.ico, c: look.moss, p: [-0.25, 0.55, 0.1], s: [0.3, 0.15, 0.3] });
  } else if (herald) {
    T.push({ g: new THREE.ConeGeometry(0.34, 1.3, 8), c: robe, p: [0, -0.15, 0] });
    T.push({ g: GEO.sphere, c: pants, p: [0, 0.35, 0], s: [0.46, 0.5, 0.3] });
    T.push({ g: GEO.box, c: look.glow ?? 0xc050ff, p: [0, 0.35, 0.15], s: [0.06, 0.3, 0.03] });
    T.push({ g: GEO.cone, c: pants, p: [0.26, 0.55, 0], s: [0.18, 0.4, 0.18], r: [0, 0, -0.5] }, { g: GEO.cone, c: pants, p: [-0.26, 0.55, 0], s: [0.18, 0.4, 0.18], r: [0, 0, 0.5] });
  } else {
    const belly = brute ? 1.35 : gob ? 1.1 : 1;
    T.push({ g: GEO.sphere, c: gob || brute ? skin : robe, p: [0, 0.3, 0.0], s: [0.38 * w * belly, 0.52, 0.26 * belly] });
    T.push({ g: GEO.cyl, c: belt, p: [0, 0.04, 0], s: [0.37 * w * belly, 0.08, 0.26 * belly] });
    if (gob || brute) {
      T.push({ g: new THREE.CylinderGeometry(0.19, 0.24, 0.28, 8), c: robe, p: [0, -0.1, 0], s: [w * belly, 1, belly] });
      T.push({ g: GEO.box, c: 0x3a2a1a, p: [0.05, 0.32, 0.12 * belly], r: [0, 0, 0.8], s: [0.06, 0.55, 0.04] });
    } else {
      T.push({ g: new THREE.CylinderGeometry(0.19, look.child ? 0.24 : 0.27, 0.36, 10), c: robe, p: [0, -0.12, 0], s: [w, 1, 1] });
      T.push({ g: GEO.cyl, c: skin, p: [0, 0.55, 0], s: [0.1, 0.12, 0.1] });
      if (look.armor) T.push({ g: GEO.sphere, c: 0x9aa0a8, p: [0, 0.38, 0.02], s: [0.4 * w, 0.34, 0.28] }, { g: GEO.sphere, c: 0x9aa0a8, p: [0.22 * w, 0.5, 0], s: 0.2 }, { g: GEO.sphere, c: 0x9aa0a8, p: [-0.22 * w, 0.5, 0], s: 0.2 });
      if (look.scarf) T.push({ g: GEO.torus, c: look.scarf, p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0], s: [0.34, 0.34, 0.6] });
    }
  }
  const torsoMesh = part(T, mat, torso, ol);

  // ----- cabeza -----
  const H = [];
  if (golem) {
    H.push({ g: GEO.dodeca, c: robe, p: [0, 0.12, 0.05], s: [0.42, 0.34, 0.38] });
    H.push({ g: GEO.box, c: look.glow ?? 0x7af0ff, p: [0.08, 0.14, 0.22], s: [0.07, 0.05, 0.03] }, { g: GEO.box, c: look.glow ?? 0x7af0ff, p: [-0.08, 0.14, 0.22], s: [0.07, 0.05, 0.03] });
    if (look.crown) H.push({ g: GEO.cone, c: look.crown, p: [0.12, 0.35, 0], s: [0.08, 0.3, 0.08] }, { g: GEO.cone, c: look.crown, p: [-0.12, 0.35, 0], s: [0.08, 0.3, 0.08] }, { g: GEO.cone, c: look.crown, p: [0, 0.4, 0.05], s: [0.08, 0.36, 0.08] });
  } else if (herald) {
    H.push({ g: GEO.cone, c: robe, p: [0, 0.2, -0.03], s: [0.42, 0.62, 0.42] });
    H.push({ g: GEO.sphere, c: 0x0a0612, p: [0, 0.1, 0.06], s: [0.3, 0.32, 0.28] });
    H.push({ g: GEO.box, c: look.glow ?? 0xc050ff, p: [0.06, 0.12, 0.2], s: [0.07, 0.03, 0.02] }, { g: GEO.box, c: look.glow ?? 0xc050ff, p: [-0.06, 0.12, 0.2], s: [0.07, 0.03, 0.02] });
    H.push({ g: GEO.cone, c: 0x2a2030, p: [0.16, 0.42, 0], s: [0.06, 0.4, 0.06], r: [0, 0, -0.5] }, { g: GEO.cone, c: 0x2a2030, p: [-0.16, 0.42, 0], s: [0.06, 0.4, 0.06], r: [0, 0, 0.5] });
  } else {
    const hs = gob ? 1.35 : brute ? 1.1 : look.child ? 1.15 : 1;
    H.push({ g: GEO.sphere, c: skin, p: [0, 0.13 * hs, 0], s: [0.34 * hs, 0.38 * hs, 0.36 * hs] });
    const eyeC = gob || brute ? 0xffe14a : 0x2a3a5a;
    H.push({ g: GEO.sphere, c: eyeC, p: [0.07 * hs, 0.14 * hs, 0.16 * hs], s: [0.05, 0.07, 0.03] }, { g: GEO.sphere, c: eyeC, p: [-0.07 * hs, 0.14 * hs, 0.16 * hs], s: [0.05, 0.07, 0.03] });
    if (gob || brute) {
      H.push({ g: GEO.sphere, c: 0x111111, p: [0.07 * hs, 0.14 * hs, 0.175 * hs], s: [0.025, 0.04, 0.02] }, { g: GEO.sphere, c: 0x111111, p: [-0.07 * hs, 0.14 * hs, 0.175 * hs], s: [0.025, 0.04, 0.02] });
      H.push({ g: GEO.sphere, c: look.nose ?? 0xc05a4a, p: [0, 0.07 * hs, 0.19 * hs], s: [0.12, 0.08, 0.08] });
      H.push({ g: GEO.cone, c: 0xf0e8d0, p: [0.05, 0.0, 0.17 * hs], s: [0.03, 0.07, 0.03] }, { g: GEO.cone, c: 0xf0e8d0, p: [-0.05, 0.0, 0.17 * hs], s: [0.03, 0.07, 0.03] });
      H.push({ g: GEO.cone, c: look.horn ?? 0xeae0c8, p: [0, 0.38 * hs, 0.05], s: [0.07, 0.22, 0.07], r: [0.3, 0, 0] });
      H.push({ g: GEO.cone, c: skin, p: [0.2 * hs, 0.16 * hs, -0.02], s: [0.08, 0.22, 0.05], r: [0, 0, -1.3] }, { g: GEO.cone, c: skin, p: [-0.2 * hs, 0.16 * hs, -0.02], s: [0.08, 0.22, 0.05], r: [0, 0, 1.3] });
      if (look.helm) H.push({ g: new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c: look.helm, p: [0, 0.2 * hs, 0], s: [0.38 * hs, 0.36 * hs, 0.4 * hs] });
    } else {
      // pelo
      H.push({ g: GEO.sphere, c: hair, p: [0, 0.2, -0.02], s: [0.37, 0.34, 0.38] });
      H.push({ g: GEO.box, c: hair, p: [0, 0.28, 0.13], s: [0.3, 0.1, 0.12], r: [0.4, 0, 0] });
      if (look.long) H.push({ g: GEO.cone, c: hair, p: [0, -0.05, -0.2], s: [0.14, 0.45, 0.1], r: [-0.25, 0, 0] });
      if (look.pony) H.push({ g: GEO.cone, c: hair, p: [0, 0.02, -0.24], s: [0.1, 0.38, 0.1], r: [2.7, 0, 0] }, { g: GEO.sphere, c: look.band ?? 0x3a6ad0, p: [0, 0.2, -0.2], s: 0.07 });
      if (look.beard) H.push({ g: GEO.cone, c: hair, p: [0, -0.02, 0.1], s: [0.2, 0.25, 0.14], r: [Math.PI + 0.3, 0, 0] });
      if (look.ears !== false && (look.ears || look.elf)) {
        H.push({ g: GEO.cone, c: skin, p: [0.2, 0.15, -0.02], s: [0.06, 0.24, 0.04], r: [0.2, 0, -1.15] });
        H.push({ g: GEO.cone, c: skin, p: [-0.2, 0.15, -0.02], s: [0.06, 0.24, 0.04], r: [0.2, 0, 1.15] });
      }
      if (look.hat) H.push({ g: GEO.cyl, c: look.hatC ?? 0x7a5a3a, p: [0, 0.34, 0], s: [0.5, 0.04, 0.5] }, { g: GEO.cone, c: look.hatC ?? 0x7a5a3a, p: [0, 0.46, 0], s: [0.3, 0.26, 0.3] });
      if (look.hood) H.push({ g: GEO.sphere, c: look.hood, p: [0, 0.2, -0.04], s: [0.42, 0.42, 0.42] }, { g: GEO.cone, c: look.hood, p: [0, 0.2, -0.28], s: [0.2, 0.3, 0.12], r: [-2, 0, 0] });
    }
  }
  const headMesh = part(H, mat, head, ol);

  // ----- brazos -----
  const armLen = golem ? 1.3 : brute ? 1.15 : 1;
  const armR = golem ? 0.12 : brute ? 0.085 : 0.06;
  const sx = golem ? 0.46 : 0.23 * w * (brute ? 1.3 : 1);
  const sleeve = gob || brute ? skin : golem ? pants : herald ? robe : (look.sleeve ?? robe);
  const shR = new THREE.Group(); shR.position.set(-sx, 0.46, 0); torso.add(shR);
  const shL = new THREE.Group(); shL.position.set(sx, 0.46, 0); torso.add(shL);
  const mkUpper = (p) => part(golem ? [{ g: GEO.dodeca, c: sleeve, p: [0, -0.15 * armLen, 0], s: [0.26, 0.4 * armLen, 0.26] }]
    : [{ g: CAP, c: sleeve, p: [0, -0.14 * armLen, 0], s: [armR, 0.1 * armLen, armR] }], mat, p, ol);
  mkUpper(shR); mkUpper(shL);
  const elR = new THREE.Group(); elR.position.y = -0.3 * armLen; shR.add(elR);
  const elL = new THREE.Group(); elL.position.y = -0.3 * armLen; shL.add(elL);
  const mkFore = (p) => part(golem ? [{ g: GEO.dodeca, c: robe, p: [0, -0.18, 0], s: [0.3, 0.42, 0.3] }, { g: GEO.dodeca, c: pants, p: [0, -0.42, 0], s: [0.32, 0.26, 0.32] }]
    : [{ g: CAP, c: gob || brute ? skin : herald ? robe : (look.glove ?? skin), p: [0, -0.12 * armLen, 0], s: [armR * 0.9, 0.09 * armLen, armR * 0.9] }, { g: GEO.sphere, c: herald ? 0x1a1020 : skin, p: [0, -0.27 * armLen, 0], s: armR * 1.6 }], mat, p, ol);
  mkFore(elR); mkFore(elL);
  const handR = new THREE.Group(); handR.position.y = (golem ? -0.45 : -0.28) * armLen; elR.add(handR);
  const handL = new THREE.Group(); handL.position.y = (golem ? -0.45 : -0.28) * armLen; elL.add(handL);

  // ----- piernas -----
  const lgR = new THREE.Group(); lgR.position.set(-0.1 * w * (golem ? 2 : 1), -0.04, 0); hips.add(lgR);
  const lgL = new THREE.Group(); lgL.position.set(0.1 * w * (golem ? 2 : 1), -0.04, 0); hips.add(lgL);
  const knR = new THREE.Group(); knR.position.y = -0.42; lgR.add(knR);
  const knL = new THREE.Group(); knL.position.y = -0.42; lgL.add(knL);
  if (!herald) {
    const legC = gob || brute ? skin : pants;
    const mkThigh = (p) => part(golem ? [{ g: GEO.dodeca, c: pants, p: [0, -0.2, 0], s: [0.32, 0.42, 0.32] }] : [{ g: CAP, c: legC, p: [0, -0.2, 0], s: [0.075 * (brute ? 1.4 : 1), 0.14, 0.075 * (brute ? 1.4 : 1)] }], mat, p, ol);
    mkThigh(lgR); mkThigh(lgL);
    const mkShin = (p) => part(golem ? [{ g: GEO.dodeca, c: robe, p: [0, -0.28, 0.03], s: [0.34, 0.4, 0.4] }]
      : [{ g: CAP, c: gob || brute ? skin : boots, p: [0, -0.2, 0], s: [0.065, 0.13, 0.065] }, { g: GEO.box, c: gob || brute ? 0x4a3a2a : boots, p: [0, -0.42, 0.04], s: [0.13, 0.1, 0.24] }], mat, p, ol);
    mkShin(knR); mkShin(knL);
  }

  // ----- accesorios -----
  if (look.staff) part([{ g: GEO.cyl, c: 0x6e4b30, p: [0, 0, 0], s: [0.04, 1.8, 0.04] }, { g: GEO.ico, c: 0x7af0ff, p: [0, 0.95, 0], s: 0.16 }], mat, handL);
  if (look.bow) part([{ g: new THREE.TorusGeometry(0.45, 0.025, 4, 12, Math.PI), c: 0x6e4b30, r: [0, Math.PI / 2, Math.PI / 2] }], mat, handL);
  if (look.spear) part([{ g: GEO.cyl, c: 0x6e4b30, p: [0, 0.3, 0], s: [0.035, 2.2, 0.035] }, { g: GEO.cone, c: 0xc0c8d0, p: [0, 1.5, 0], s: [0.08, 0.3, 0.08] }], mat, handL);
  let weapon = null;
  if (look.club) weapon = part([{ g: GEO.cyl, c: 0x7a5a3c, p: [0, 0, 0.3], r: [Math.PI / 2, 0, 0], s: [0.05, 0.7, 0.05] }, { g: GEO.cyl, c: 0x6a4a2c, p: [0, 0, 0.72], r: [Math.PI / 2, 0, 0], s: [0.11, 0.35, 0.11] }, { g: GEO.cone, c: 0xdad0c0, p: [0.09, 0, 0.75], r: [0, 0, -Math.PI / 2], s: [0.04, 0.1, 0.04] }], mat, handR, ol);
  if (look.bigclub) weapon = part([{ g: GEO.cyl, c: 0x7a5a3c, p: [0, 0, 0.5], r: [Math.PI / 2, 0, 0], s: [0.08, 1.2, 0.08] }, { g: GEO.dodeca, c: 0x8a847a, p: [0, 0, 1.2], s: [0.4, 0.4, 0.55] }], mat, handR, ol);
  if (look.archerBow) weapon = part([{ g: new THREE.TorusGeometry(0.4, 0.025, 4, 12, Math.PI), c: 0x5a3a22, r: [Math.PI / 2, 0, Math.PI / 2] }, { g: GEO.box, c: 0xeeeeee, p: [0, 0, 0], s: [0.01, 0.01, 0.8], r: [0, 0, 0] }], mat, handL, ol);
  if (look.scythe) weapon = part([{ g: GEO.cyl, c: 0x2a2030, p: [0, 0, 0.3], r: [Math.PI / 2, 0, 0], s: [0.04, 1.8, 0.04] }, { g: GEO.box, c: look.glow ?? 0xc050ff, p: [0.35, 0, 1.15], r: [0, 0.4, 0], s: [0.7, 0.05, 0.15] }], mat, handR, ol);

  const rig = { root, body, hips, torso, head, shL, shR, elL, elR, lgL, lgR, knL, knR, handR, handL, mat, weapon, s, torsoMesh, headMesh };
  resetPose(rig);
  return rig;
}

export const JOINTS = ['hips', 'torso', 'head', 'shL', 'shR', 'elL', 'elR', 'lgL', 'lgR', 'knL', 'knR'];
export function resetPose(rig) { for (const j of JOINTS) rig[j].rotation.set(0, 0, 0); }

// pose: { joint: [x,y,z] }, hipsY
export function applyPose(rig, pose, k) {
  for (const j of JOINTS) {
    const r = rig[j].rotation, t = pose[j];
    if (t) { r.x = lerp(r.x, t[0], k); r.y = lerp(r.y, t[1], k); r.z = lerp(r.z, t[2], k); }
    else { r.x = lerp(r.x, 0, k); r.y = lerp(r.y, 0, k); r.z = lerp(r.z, 0, k); }
  }
  const hy = 0.95 + (pose.hipsY || 0);
  rig.hips.position.y = lerp(rig.hips.position.y, hy, k);
}

export function blendPoses(a, b, t) {
  const out = { hipsY: lerp(a.hipsY || 0, b.hipsY || 0, t) };
  for (const j of JOINTS) {
    const x = a[j] || Z3, y = b[j] || Z3;
    out[j] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  }
  return out;
}
const Z3 = [0, 0, 0];

// Ciclo de locomoción procedural
export function locoPose(phase, amt, run = 0) {
  const s = Math.sin(phase), c = Math.cos(phase);
  const a = amt * (0.7 + run * 0.35);
  return {
    hipsY: -Math.abs(s) * 0.05 * amt - run * 0.04,
    hips: [0, s * 0.1 * amt, 0],
    torso: [0.08 * amt + run * 0.2, -s * 0.15 * amt, 0],
    head: [-0.05 * amt - run * 0.12, s * 0.08 * amt, 0],
    lgL: [-s * 0.75 * a, 0, 0], lgR: [s * 0.75 * a, 0, 0],
    knL: [Math.max(0, c) * 1.1 * a + 0.05, 0, 0], knR: [Math.max(0, -c) * 1.1 * a + 0.05, 0, 0],
    shL: [s * 0.7 * a, 0, 0.12], shR: [-s * 0.7 * a, 0, -0.12],
    elL: [-0.3 - run * 0.9, 0, 0], elR: [-0.3 - run * 0.9, 0, 0],
  };
}
export function idlePose(t) {
  const b = Math.sin(t * 1.8);
  return {
    hipsY: b * 0.008, torso: [b * 0.02, 0, 0], head: [-b * 0.02, Math.sin(t * 0.5) * 0.15, 0],
    shL: [0.05, 0, 0.12 + b * 0.02], shR: [0.05, 0, -0.12 - b * 0.02], elL: [-0.2, 0, 0], elR: [-0.2, 0, 0],
    lgL: [0, 0, 0.04], lgR: [0, 0, -0.04], knL: [0.04, 0, 0], knR: [0.04, 0, 0],
  };
}

// ---------- Lobo (cuadrúpedo) ----------
export function buildWolf(color = 0x3d3a4a, outline = 0.02) {
  const mat = vcToonMat();
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.75; root.add(body);
  part([
    { g: GEO.sphere, c: color, p: [0, 0, 0], s: [0.55, 0.55, 1.3] },
    { g: GEO.sphere, c: 0x2a2833, p: [0, 0.18, 0.1], s: [0.5, 0.35, 1.0] },
    { g: GEO.sphere, c: 0xd8d0c8, p: [0, -0.12, 0.4], s: [0.35, 0.3, 0.5] },
  ], mat, body, outline);
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.7); body.add(head);
  part([
    { g: GEO.sphere, c: color, p: [0, 0, 0.1], s: [0.42, 0.4, 0.46] },
    { g: GEO.box, c: color, p: [0, -0.06, 0.38], s: [0.2, 0.18, 0.36] },
    { g: GEO.sphere, c: 0x111111, p: [0, -0.02, 0.56], s: 0.08 },
    { g: GEO.cone, c: color, p: [0.12, 0.25, 0.02], s: [0.1, 0.22, 0.08] }, { g: GEO.cone, c: color, p: [-0.12, 0.25, 0.02], s: [0.1, 0.22, 0.08] },
    { g: GEO.box, c: 0xff3a3a, p: [0.1, 0.06, 0.28], s: [0.07, 0.035, 0.03] }, { g: GEO.box, c: 0xff3a3a, p: [-0.1, 0.06, 0.28], s: [0.07, 0.035, 0.03] },
  ], mat, head, outline);
  const tail = new THREE.Group(); tail.position.set(0, 0.15, -0.62); body.add(tail);
  part([{ g: GEO.cone, c: color, p: [0, 0, -0.3], r: [-Math.PI / 2 - 0.4, 0, 0], s: [0.14, 0.6, 0.14] }], mat, tail, outline);
  const legs = [];
  for (const [x, z] of [[0.18, 0.4], [-0.18, 0.4], [0.18, -0.4], [-0.18, -0.4]]) {
    const l = new THREE.Group(); l.position.set(x, -0.1, z); body.add(l);
    part([{ g: CAP, c: color, p: [0, -0.3, 0], s: [0.07, 0.22, 0.07] }], mat, l, outline);
    legs.push(l);
  }
  return { root, body, head, tail, legs, mat, s: 1 };
}

// ---------- Espectro flotante ----------
export function buildWisp(color = 0x8a5ad0, glow = 0xd0a0ff, outline = 0.02) {
  const mat = vcToonMat();
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.4; root.add(body);
  part([
    { g: new THREE.ConeGeometry(0.5, 1.4, 8, 1, true), c: color, p: [0, -0.3, 0], r: [Math.PI, 0, 0] },
    { g: GEO.sphere, c: color, p: [0, 0.35, 0], s: [0.55, 0.55, 0.55] },
    { g: GEO.sphere, c: 0x100818, p: [0, 0.33, 0.1], s: [0.38, 0.4, 0.38] },
    { g: GEO.box, c: glow, p: [0.08, 0.36, 0.28], s: [0.06, 0.1, 0.03] }, { g: GEO.box, c: glow, p: [-0.08, 0.36, 0.28], s: [0.06, 0.1, 0.03] },
  ], mat, body, outline);
  const orb = new THREE.Mesh(GEO.ico, new THREE.MeshBasicMaterial({ color: glow }));
  orb.scale.setScalar(0.22); orb.position.set(0.5, 0, 0.3);
  body.add(orb);
  return { root, body, orb, mat, s: 1 };
}

// ---------- Serpiente (jefe) ----------
export function buildSerpent(color = 0x2a7a8a, belly = 0xd8e0a0, outline = 0.03) {
  const mat = vcToonMat();
  const root = new THREE.Group();
  const head = new THREE.Group(); root.add(head);
  part([
    { g: GEO.sphere, c: color, p: [0, 0, 0], s: [1.6, 1.3, 2.2] },
    { g: GEO.box, c: color, p: [0, -0.2, 1.1], s: [1.1, 0.5, 1.2] },
    { g: GEO.sphere, c: 0xffe04a, p: [0.55, 0.35, 0.7], s: [0.3, 0.25, 0.25] }, { g: GEO.sphere, c: 0xffe04a, p: [-0.55, 0.35, 0.7], s: [0.3, 0.25, 0.25] },
    { g: GEO.cone, c: 0xf0f0e0, p: [0.35, -0.55, 1.4], r: [Math.PI, 0, 0], s: [0.1, 0.4, 0.1] }, { g: GEO.cone, c: 0xf0f0e0, p: [-0.35, -0.55, 1.4], r: [Math.PI, 0, 0], s: [0.1, 0.4, 0.1] },
    { g: GEO.cone, c: belly, p: [0, 0.7, -0.4], r: [-0.6, 0, 0], s: [0.2, 0.9, 0.2] }, { g: GEO.cone, c: belly, p: [0.5, 0.5, -0.5], r: [-0.6, 0, -0.4], s: [0.15, 0.7, 0.15] }, { g: GEO.cone, c: belly, p: [-0.5, 0.5, -0.5], r: [-0.6, 0, 0.4], s: [0.15, 0.7, 0.15] },
  ], mat, head, outline);
  const segs = [];
  const segGeo = mergeColored([{ g: GEO.sphere, c: color, s: [1.3, 1.3, 1.3] }, { g: GEO.sphere, c: belly, p: [0, -0.3, 0], s: [1.0, 0.8, 1.1] }, { g: GEO.cone, c: belly, p: [0, 0.65, 0], s: [0.15, 0.4, 0.15] }]);
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(segGeo, mat);
    const sc = 1 - i * 0.055;
    m.scale.setScalar(sc);
    m.castShadow = true;
    if (outline) addOutline(m, outline / sc);
    root.add(m); segs.push(m);
  }
  return { root, head, segs, mat, s: 1 };
}
