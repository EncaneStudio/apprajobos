import * as THREE from 'three';
import { Simplex } from '../noise.js';
import { clamp, lerp, smoothstep, canvasTexture } from '../util.js';
import { PADS, PATHS, VILLAGE } from '../data/worlddata.js';

export const WORLD = 1600, HALF = 800, WATER_Y = 0;
export let SEG = 320;
export let CELL = WORLD / SEG;
const nz = new Simplex(20240);
const nz2 = new Simplex(777);

let heights = null;

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) {
    const s = distToSeg(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
    if (s < d) d = s;
  }
  return d;
}

export function northMask(x, z) { return smoothstep(-110, -400, z + nz.noise(x * 0.004, 3.3) * 70); }

function basicHeight(x, z) {
  let h = 10;
  h += nz.fbm(x * 0.0025 + 11, z * 0.0025 - 7, 4) * 16;
  h += nz2.fbm(x * 0.012, z * 0.012, 2) * 2.2;
  const ridge = nz.ridged(x * 0.004 + 40, z * 0.004, 5);
  const north = northMask(x, z);
  h += north * (28 + ridge * 155);
  const west = smoothstep(-150, -380, x);
  h += west * nz2.fbm(x * 0.006, z * 0.006, 3) * 16;
  const d = Math.max(Math.abs(x), Math.abs(z));
  const edge = smoothstep(600, 770, d);
  h += edge * (70 + ridge * 90);
  // Lago Espejo
  const dl = Math.hypot(x - 380, (z - 120) * 1.15) + nz.noise(x * 0.01, z * 0.01) * 22;
  const lake = 1 - smoothstep(80, 175, dl);
  h = lerp(h, -14, lake);
  // Estanques y marjal
  const p = nz2.fbm(x * 0.004 - 30, z * 0.004 + 50, 2);
  const marsh = smoothstep(260, 420, z) * smoothstep(-150, -330, x);
  h -= smoothstep(-0.28 + marsh * 0.25, -0.55 + marsh * 0.2, p) * 22 * (1 - north);
  // Ríos suaves: valle hacia el lago
  const river = Math.abs(nz.noise(x * 0.0022 + 5, z * 0.0022 - 9));
  h -= (1 - smoothstep(0.0, 0.05, river)) * 9 * (1 - north) * (1 - edge) * smoothstep(-100, 50, x);
  return h;
}

const padH = new Map();
export function rawHeight(x, z) {
  let h = basicHeight(x, z);
  for (const pd of PADS) {
    const d = Math.hypot(x - pd.x, z - pd.z);
    if (d < pd.r1) {
      let ph = pd.h;
      if (ph === null) {
        if (!padH.has(pd)) padH.set(pd, basicHeight(pd.x, pd.z));
        ph = padH.get(pd);
      }
      h = lerp(h, ph, 1 - smoothstep(pd.r0, pd.r1, d));
    }
  }
  // caminos ligeramente hundidos/suaves
  return h;
}

export function getHeight(x, z) {
  if (!heights) return rawHeight(x, z);
  const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
  const ix = clamp(Math.floor(fx), 0, SEG - 1), iz = clamp(Math.floor(fz), 0, SEG - 1);
  const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1);
  const W = SEG + 1;
  const h00 = heights[iz * W + ix], h10 = heights[iz * W + ix + 1];
  const h01 = heights[(iz + 1) * W + ix], h11 = heights[(iz + 1) * W + ix + 1];
  // Triangulación de PlaneGeometry: (a=00,b=01,d=10) y (b=01,c=11,d=10)
  if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
  return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
}

const _n = new THREE.Vector3();
export function getNormal(x, z, out = _n) {
  const e = 1.5;
  const hl = getHeight(x - e, z), hr = getHeight(x + e, z), hd = getHeight(x, z - e), hu = getHeight(x, z + e);
  return out.set(hl - hr, 2 * e, hd - hu).normalize();
}

export function forestDensity(x, z) {
  const west = smoothstep(-130, -300, x) * (1 - smoothstep(560, 640, Math.abs(z)) * 0.5);
  const patch = smoothstep(0.12, 0.45, nz2.fbm(x * 0.005 + 100, z * 0.005 - 40, 3));
  const n = northMask(x, z);
  const pines = n * (1 - smoothstep(60, 120, rawHeightCached(x, z))) * 0.8;
  let f = Math.max(west * 0.95, patch * 0.75, pines);
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  f *= smoothstep(80, 130, dv);
  return f;
}
function rawHeightCached(x, z) { return heights ? getHeight(x, z) : rawHeight(x, z); }

export function isSnow(x, z, h) { return h > 118 + nz.noise(x * 0.02, z * 0.02) * 12; }

// Color base del terreno por posición
const C = {
  grass: new THREE.Color('#8db543'), grass2: new THREE.Color('#a9c253'), grassDry: new THREE.Color('#c2bd5c'),
  forest: new THREE.Color('#4f7d34'), forest2: new THREE.Color('#3f6a2d'),
  dirt: new THREE.Color('#b39666'), sand: new THREE.Color('#dccb98'),
  rock: new THREE.Color('#8e877c'), rock2: new THREE.Color('#6f6a62'), snow: new THREE.Color('#f2f6fa'),
  marsh: new THREE.Color('#6b7a45'), mud: new THREE.Color('#5d5638'),
};
const _col = new THREE.Color();
export function terrainColor(x, z, h, ny, out = _col) {
  const n = nz2.noise(x * 0.03, z * 0.03) * 0.5 + 0.5;
  const n2 = nz.noise(x * 0.008 + 50, z * 0.008) * 0.5 + 0.5;
  out.copy(C.grass).lerp(C.grass2, n).lerp(C.grassDry, smoothstep(0.55, 0.85, n2) * 0.6);
  const f = forestDensity(x, z);
  out.lerp(n > 0.5 ? C.forest : C.forest2, smoothstep(0.35, 0.7, f));
  const marsh = smoothstep(260, 420, z) * smoothstep(-150, -330, x);
  out.lerp(C.marsh, marsh * 0.7);
  const pd = pathDist(x, z);
  out.lerp(C.dirt, (1 - smoothstep(1.8, 3.6, pd + n * 1.2)) * 0.9);
  // arena en la orilla
  out.lerp(marsh > 0.4 ? C.mud : C.sand, 1 - smoothstep(0.4, 2.2, h));
  // roca por pendiente y altitud
  const rockAmt = Math.max(1 - smoothstep(0.62, 0.8, ny), smoothstep(75, 110, h) * 0.85);
  out.lerp(n > 0.45 ? C.rock : C.rock2, rockAmt);
  if (isSnow(x, z, h)) out.lerp(C.snow, smoothstep(0.55, 0.75, ny) * 0.95 + 0.05);
  if (h < -1) out.lerp(C.sand, 0.5).multiplyScalar(0.85);
  return out;
}

export function buildTerrain(quality) {
  SEG = quality === 'baja' ? 224 : quality === 'alta' ? 384 : 320;
  CELL = WORLD / SEG;
  const W = SEG + 1;
  heights = null;
  const hs = new Float32Array(W * W);
  for (let iz = 0; iz < W; iz++) for (let ix = 0; ix < W; ix++) {
    hs[iz * W + ix] = rawHeight(-HALF + ix * CELL, -HALF + iz * CELL);
  }
  heights = hs;
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ix = i % W, iz = Math.floor(i / W);
    pos.setY(i, hs[iz * W + ix]);
    uv.setXY(i, ix * 0.35, iz * 0.35);
  }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i);
    terrainColor(x, z, h, nor.getY(i), _col);
    colors[i * 3] = _col.r; colors[i * 3 + 1] = _col.g; colors[i * 3 + 2] = _col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const detail = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 200 + Math.random() * 55;
      ctx.fillStyle = `rgba(${v},${v},${v * 0.95},0.5)`;
      const s = 1 + Math.random() * 4;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s * (0.5 + Math.random()));
    }
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = 'rgba(150,160,120,0.25)';
      ctx.beginPath(); const x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y); ctx.lineTo(x + Math.random() * 6 - 3, y - 4 - Math.random() * 6); ctx.stroke();
    }
  }, true);
  detail.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: detail });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

export function isInWorld(x, z) { return Math.abs(x) < HALF - 40 && Math.abs(z) < HALF - 40; }
export { nz as terrainNoise };
