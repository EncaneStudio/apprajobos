import * as THREE from 'three';
import { G } from '../state.js';
import { mulberry32 } from '../noise.js';
import { GEO, mergeColored, vcToonMat, smoothstep, hash2, clamp } from '../util.js';
import { getHeight, getNormal, forestDensity, pathDist, isSnow, northMask, HALF, terrainColor, terrainNoise } from './terrain.js';
import { VILLAGE } from '../data/worlddata.js';

// ---------- Árboles y rocas instanciados por regiones ----------
function broadleafGeos() {
  const trunk = mergeColored([
    { g: new THREE.CylinderGeometry(0.22, 0.38, 3.2, 7), c: 0x7a5a3c, p: [0, 1.6, 0] },
    { g: new THREE.CylinderGeometry(0.1, 0.16, 1.4, 5), c: 0x7a5a3c, p: [0.45, 2.6, 0], r: [0, 0, -0.8] },
  ]);
  const I = new THREE.IcosahedronGeometry(1, 1);
  const canopy = mergeColored([
    { g: I, c: 0x6fae3e, p: [0, 3.9, 0], s: [2.1, 1.7, 2.1] },
    { g: I, c: 0x7fbf48, p: [0.9, 4.6, 0.4], s: [1.4, 1.2, 1.4] },
    { g: I, c: 0x5e9a36, p: [-0.8, 4.3, -0.5], s: [1.5, 1.3, 1.5] },
    { g: I, c: 0x86c650, p: [0.1, 5.2, -0.2], s: [1.2, 1.0, 1.2] },
  ]);
  return { trunk, canopy };
}
function pineGeos() {
  const trunk = mergeColored([{ g: new THREE.CylinderGeometry(0.16, 0.3, 2.4, 6), c: 0x5e4630, p: [0, 1.2, 0] }]);
  const C = new THREE.ConeGeometry(1, 1, 8);
  const canopy = mergeColored([
    { g: C, c: 0x2f6a3e, p: [0, 2.8, 0], s: [2.2, 2.6, 2.2] },
    { g: C, c: 0x3a7a47, p: [0, 4.3, 0], s: [1.7, 2.3, 1.7] },
    { g: C, c: 0x44894f, p: [0, 5.7, 0], s: [1.15, 2.0, 1.15] },
  ]);
  return { trunk, canopy };
}
function rockGeo() {
  const g = new THREE.DodecahedronGeometry(1, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.9 + Math.sin(i * 7.1) * 0.12), p.getY(i) * 0.75, p.getZ(i) * (0.9 + Math.cos(i * 3.3) * 0.12));
  g.computeVertexNormals();
  return mergeColored([{ g, c: 0xa29b90 }]);
}

export function buildVegetation(scene, colliders, exclusions, quality) {
  const rnd = mulberry32(99);
  const step = quality === 'baja' ? 12 : quality === 'alta' ? 8 : 9.5;
  const RS = 400, NR = Math.ceil((HALF * 2) / RS);
  const buckets = [];
  for (let i = 0; i < NR * NR; i++) buckets.push({ broad: [], pine: [], rock: [] });
  const excluded = (x, z) => {
    for (const e of exclusions) if ((x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r) return true;
    return false;
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let x = -HALF + 20; x < HALF - 20; x += step) for (let z = -HALF + 20; z < HALF - 20; z += step) {
    const px = x + (rnd() - 0.5) * step * 0.9, pz = z + (rnd() - 0.5) * step * 0.9;
    const f = forestDensity(px, pz);
    const r = rnd();
    const lone = 0.025;
    if (r > Math.max(f * 0.85, lone)) continue;
    const h = getHeight(px, pz);
    if (h < 1.2) continue;
    const ny = getNormal(px, pz).y;
    if (ny < 0.72 || isSnow(px, pz, h)) continue;
    if (pathDist(px, pz) < 5) continue;
    if (excluded(px, pz)) continue;
    const pine = h > 55 || northMask(px, pz) > 0.35 || (px < -500 && rnd() < 0.35);
    const sc = 0.8 + rnd() * 0.7;
    const b = buckets[Math.floor((px + HALF) / RS) * NR + Math.floor((pz + HALF) / RS)];
    (pine ? b.pine : b.broad).push([px, h - 0.2, pz, sc, rnd() * Math.PI * 2, rnd()]);
    colliders.addCircle(px, pz, 0.45 * sc, h + 6 * sc, h - 2);
  }
  // rocas
  const rstep = quality === 'baja' ? 30 : 22;
  for (let x = -HALF + 30; x < HALF - 30; x += rstep) for (let z = -HALF + 30; z < HALF - 30; z += rstep) {
    const px = x + (rnd() - 0.5) * rstep, pz = z + (rnd() - 0.5) * rstep;
    const h = getHeight(px, pz);
    const n = northMask(px, pz);
    if (rnd() > 0.22 + n * 0.4) continue;
    if (pathDist(px, pz) < 4 || excluded(px, pz) || Math.hypot(px - VILLAGE.x, pz - VILLAGE.z) < 90) continue;
    const sc = rnd() < 0.15 ? 2.5 + rnd() * 3 : 0.5 + rnd() * 1.3;
    const b = buckets[Math.floor((px + HALF) / RS) * NR + Math.floor((pz + HALF) / RS)];
    b.rock.push([px, h - sc * 0.25, pz, sc, rnd() * 6.28, rnd()]);
    if (sc > 1.2) colliders.addCircle(px, pz, sc * 0.85, h + sc * 0.6, h - 2);
  }

  const bl = broadleafGeos(), pn = pineGeos(), rk = rockGeo();
  const trunkMat = vcToonMat(), canopyMat = vcToonMat(), rockMat = vcToonMat();
  const shadows = quality !== 'baja';
  const col = new THREE.Color();
  const group = new THREE.Group();
  const make = (geo, mat, list, tint, cast) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t[4]);
      s.set(t[3], t[3] * (0.9 + t[5] * 0.3), t[3]);
      m.compose(v.set(t[0], t[1], t[2]), q, s);
      im.setMatrixAt(i, m);
      tint(col, t, i);
      im.setColorAt(i, col);
    });
    im.castShadow = cast && shadows; im.receiveShadow = shadows;
    im.computeBoundingSphere();
    group.add(im);
  };
  for (const b of buckets) {
    make(bl.trunk, trunkMat, b.broad, (c, t) => c.setScalar(t[5] < 0.15 ? 1.6 : 1), true);
    make(bl.canopy, canopyMat, b.broad, (c, t) => {
      const autumn = t[5] > 0.93;
      if (autumn) c.setRGB(1.5, 0.9, 0.45); else c.setRGB(0.85 + t[5] * 0.3, 0.9 + t[5] * 0.2, 0.8 + t[5] * 0.15);
    }, true);
    make(pn.trunk, trunkMat, b.pine, (c) => c.setScalar(1), true);
    make(pn.canopy, canopyMat, b.pine, (c, t) => c.setRGB(0.85 + t[5] * 0.3, 0.9 + t[5] * 0.2, 0.9), true);
    make(rk, rockMat, b.rock, (c, t) => c.setScalar(0.85 + t[5] * 0.3), true);
  }
  scene.add(group);
  return group;
}

// ---------- Hierba y flores alrededor del jugador ----------
const GRASS_VS = `
attribute vec3 offset; attribute vec4 data; attribute vec3 tint;
uniform float time; uniform vec3 playerPos; uniform vec3 center; uniform float radius;
varying vec3 vColor; varying float vH;
#include <fog_pars_vertex>
void main(){
  vec3 p = position;
  float h = p.y;
  float fade = 1.0 - smoothstep(radius*0.72, radius, length(offset.xz - center.xz));
  p.y *= data.x * fade; p.xz *= mix(0.6, 1.0, fade) * (0.8 + data.x*0.3);
  float c = cos(data.y), s = sin(data.y);
  p.xz = vec2(p.x*c - p.z*s, p.x*s + p.z*c);
  vec3 wp = offset + p;
  float w = sin(time*1.7 + offset.x*0.13 + offset.z*0.09)*0.6 + sin(time*3.3 + offset.x*0.5 + offset.z*0.3)*0.25;
  float hh = h*h;
  wp.x += w * hh * 0.28 * data.x; wp.z += w * hh * 0.16 * data.x;
  vec2 d = wp.xz - playerPos.xz; float pd = length(d);
  float push = (1.0 - smoothstep(0.0, 1.3, pd)) * h * step(abs(wp.y - playerPos.y), 2.0);
  wp.xz += (d / max(pd, 0.001)) * push * 0.55; wp.y -= push * 0.35 * data.x;
  vH = h;
  vColor = mix(tint * 0.55, tint * 1.12, h);
  if (data.w > 0.5) vColor = mix(vec3(0.35,0.55,0.2), tint, step(0.55, h));
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GRASS_FS = `
uniform vec3 light; varying vec3 vColor; varying float vH;
#include <fog_pars_fragment>
void main(){
  gl_FragColor = vec4(vColor * light, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function bladeGeo() {
  const g = new THREE.BufferGeometry();
  const w = 0.07;
  const v = [-w, 0, 0, w, 0, 0, -w * 0.7, 0.5, 0.02, w * 0.7, 0.5, 0.02, 0, 1, 0.08];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  return g;
}
function flowerGeo() {
  const g = new THREE.BufferGeometry();
  const v = [
    -0.015, 0, 0, 0.015, 0, 0, 0, 0.55, 0,
    -0.06, 0.5, -0.06, 0.06, 0.5, 0.06, 0, 0.58, 0, 0.06, 0.5, -0.06, -0.06, 0.5, 0.06, 0, 0.58, 0,
    -0.07, 0.55, 0, 0.07, 0.55, 0, 0, 0.55, 0.07, 0, 0.55, -0.07,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 10, 9, 10, 12]);
  return g;
}

const FLOWER_COLS = [[1, 1, 1], [1, 0.9, 0.3], [0.5, 0.65, 1], [1, 0.45, 0.45], [0.95, 0.6, 1]];

export class GrassField {
  constructor(scene, quality) {
    this.quality = quality;
    this.cellSize = 8;
    this.radius = quality === 'baja' ? 26 : quality === 'alta' ? 46 : 36;
    this.spacing = quality === 'baja' ? 0.8 : quality === 'alta' ? 0.45 : 0.55;
    this.cells = new Map();
    this.lastCx = null; this.lastCz = null; this.dirty = true;
    const cap = Math.ceil(Math.PI * this.radius * this.radius / (this.spacing * this.spacing) * 1.15);
    this.cap = cap; this.fcap = Math.ceil(cap * 0.08);
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, playerPos: { value: new THREE.Vector3() }, center: { value: new THREE.Vector3() }, radius: { value: this.radius }, light: { value: new THREE.Color(1, 1, 1) },
    }]);
    const mat = new THREE.ShaderMaterial({ vertexShader: GRASS_VS, fragmentShader: GRASS_FS, uniforms: this.uniforms, fog: true, side: THREE.DoubleSide });
    this.grass = this.makeMesh(bladeGeo(), cap, mat);
    this.flowers = this.makeMesh(flowerGeo(), this.fcap, mat);
    scene.add(this.grass.mesh); scene.add(this.flowers.mesh);
  }
  makeMesh(base, cap, mat) {
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position);
    const off = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); off.setUsage(THREE.DynamicDrawUsage);
    const dat = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); dat.setUsage(THREE.DynamicDrawUsage);
    const tin = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); tin.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('offset', off); g.setAttribute('data', dat); g.setAttribute('tint', tin);
    g.instanceCount = 0;
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    return { mesh, g, off, dat, tin, cap };
  }
  genCell(cx, cz) {
    const cs = this.cellSize, sp = this.spacing;
    const go = [], gd = [], gt = [], fo = [], fd = [], ft = [];
    const col = new THREE.Color();
    const x0 = cx * cs, z0 = cz * cs;
    // densidad a nivel de celda (muestreo en esquinas)
    for (let x = x0; x < x0 + cs; x += sp) for (let z = z0; z < z0 + cs; z += sp) {
      const r1 = hash2(x * 100, z * 100), r2 = hash2(z * 97 + 3, x * 91 + 7);
      const px = x + (r1 - 0.5) * sp, pz = z + (r2 - 0.5) * sp;
      const h = getHeight(px, pz);
      if (h < 0.6) continue;
      if (h > 70) { if (r1 > 0.25) continue; }
      if (isSnow(px, pz, h)) continue;
      const ny = getNormal(px, pz).y;
      if (ny < 0.8) continue;
      const pd = pathDist(px, pz);
      if (pd < 2.2 && r2 > (pd / 2.2) * 0.5) continue;
      const vd = Math.hypot(px - VILLAGE.x, pz - VILLAGE.z);
      const patchN = terrainNoise.noise(px * 0.05, pz * 0.05);
      if (patchN < -0.45 && r1 > 0.2) continue;
      const fl = hash2(px * 13, pz * 17);
      terrainColor(px, pz, h, ny, col);
      if (fl > 0.975 && vd > 20) {
        const fc = FLOWER_COLS[Math.floor(hash2(px * 3, pz * 5) * FLOWER_COLS.length)];
        fo.push(px, h, pz); fd.push(0.55 + r1 * 0.35, r2 * 6.28, 0, 1); ft.push(fc[0], fc[1], fc[2]);
        continue;
      }
      const sc = (0.32 + r1 * 0.42) * (patchN > 0.3 ? 1.45 : 1) * (vd < 60 ? 0.6 : 1);
      go.push(px, h, pz); gd.push(sc, r2 * 6.28, 0, 0); gt.push(col.r * 1.05, col.g * 1.08, col.b * 0.95);
    }
    return { go: new Float32Array(go), gd: new Float32Array(gd), gt: new Float32Array(gt), fo: new Float32Array(fo), fd: new Float32Array(fd), ft: new Float32Array(ft) };
  }
  update(dt, pos, visible) {
    this.grass.mesh.visible = this.flowers.mesh.visible = visible;
    if (!visible) return;
    this.uniforms.time.value += dt;
    this.uniforms.playerPos.value.copy(pos);
    const cs = this.cellSize;
    const cx = Math.floor(pos.x / cs), cz = Math.floor(pos.z / cs);
    if (cx !== this.lastCx || cz !== this.lastCz) { this.dirty = true; this.lastCx = cx; this.lastCz = cz; }
    const R = Math.ceil(this.radius / cs);
    // generar celdas que faltan (limitado por frame)
    let budget = this.cells.size === 0 ? 10000 : 2;
    for (let r = 0; r <= R && budget > 0; r++) for (let dx = -r; dx <= r && budget > 0; dx++) for (let dz = -r; dz <= r && budget > 0; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const k = (cx + dx) + ',' + (cz + dz);
      if (!this.cells.has(k)) { this.cells.set(k, this.genCell(cx + dx, cz + dz)); budget--; this.dirty = true; }
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.uniforms.center.value.set(cx * cs + cs / 2, 0, cz * cs + cs / 2);
    let gi = 0, fi = 0;
    const G_ = this.grass, F_ = this.flowers;
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      if ((dx * dx + dz * dz) * cs * cs > (this.radius + cs) ** 2) continue;
      const c = this.cells.get((cx + dx) + ',' + (cz + dz));
      if (!c) continue;
      const n = c.go.length / 3;
      if (gi + n <= G_.cap) {
        G_.off.array.set(c.go, gi * 3); G_.dat.array.set(c.gd, gi * 4); G_.tin.array.set(c.gt, gi * 3); gi += n;
      }
      const fn = c.fo.length / 3;
      if (fi + fn <= F_.cap) {
        F_.off.array.set(c.fo, fi * 3); F_.dat.array.set(c.fd, fi * 4); F_.tin.array.set(c.ft, fi * 3); fi += fn;
      }
    }
    G_.g.instanceCount = gi; F_.g.instanceCount = fi;
    for (const X of [G_, F_]) { X.off.needsUpdate = true; X.dat.needsUpdate = true; X.tin.needsUpdate = true; }
    // limpiar caché lejana
    if (this.cells.size > (2 * R + 1) ** 2 * 3) {
      for (const k of this.cells.keys()) {
        const [a, b] = k.split(',').map(Number);
        if (Math.abs(a - cx) > R + 3 || Math.abs(b - cz) > R + 3) this.cells.delete(k);
      }
    }
  }
  setLight(c) { this.uniforms.light.value.copy(c); }
}
