import * as THREE from 'three';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const TAU = Math.PI * 2;

export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export function dampAngle(cur, target, lambda, dt) {
  return cur + angleDiff(cur, target) * (1 - Math.exp(-lambda * dt));
}
export function hash2(x, z) {
  let h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((z | 0) + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

// ---------- Materiales toon (cel shading suave estilo BotW) ----------
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  _grad.minFilter = THREE.NearestFilter;
  _grad.magFilter = THREE.NearestFilter;
  _grad.generateMipmaps = false;
  _grad.needsUpdate = true;
  return _grad;
}
export function toonMat(color = 0xffffff, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
}
export function vcToonMat(opts = {}) {
  return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), ...opts });
}

const _outlineMats = new Map();
export function outlineMat(thick = 0.025, color = 0x1b1a24) {
  const k = thick + ':' + color;
  if (_outlineMats.has(k)) return _outlineMats.get(k);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thick.toFixed(4)};`);
  };
  _outlineMats.set(k, m);
  return m;
}
export function addOutline(mesh, thick = 0.025) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat(thick));
  o.raycast = () => {};
  mesh.add(o);
  return o;
}

// ---------- Construcción de mallas con colores por vértice ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();
/** items: [{g, c, p:[x,y,z], r:[x,y,z], s:[x,y,z]|number}] -> BufferGeometry no indexada con color */
export function mergeColored(items) {
  const pos = [], nor = [], col = [];
  const nm = new THREE.Matrix3();
  for (const it of items) {
    let g = it.g.index ? it.g.toNonIndexed() : it.g;
    const p = it.p || [0, 0, 0], r = it.r || [0, 0, 0];
    const sc = it.s === undefined ? [1, 1, 1] : typeof it.s === 'number' ? [it.s, it.s, it.s] : it.s;
    _m.compose(_v.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(sc[0], sc[1], sc[2]));
    nm.getNormalMatrix(_m);
    const pa = g.attributes.position, na = g.attributes.normal;
    _c.set(it.c === undefined ? 0xffffff : it.c);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      tmp.fromBufferAttribute(pa, i).applyMatrix4(_m);
      pos.push(tmp.x, tmp.y, tmp.z);
      tmp.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      nor.push(tmp.x, tmp.y, tmp.z);
      col.push(_c.r, _c.g, _c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Geometrías compartidas
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 12, 9),
  sphereLo: new THREE.IcosahedronGeometry(0.5, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  dodeca: new THREE.DodecahedronGeometry(0.5, 0),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
  torus: new THREE.TorusGeometry(0.5, 0.12, 6, 16),
};

export function canvasTexture(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export function fmt(n) { return Math.round(n).toLocaleString('es-ES'); }
