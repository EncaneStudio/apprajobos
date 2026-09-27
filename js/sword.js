import * as THREE from 'three';
import { canvasTexture, clamp } from './util.js';
import { glowTexture } from './world/structures.js';

// Hebra: la cuerda mágica que se endurece (espada) o se vuelve flexible (látigo)
const N = 22;      // puntos de la cuerda
const RS = 7;      // vértices por anillo

export class Hebra {
  constructor() {
    this.pts = []; this.prev = []; this.target = [];
    for (let i = 0; i < N; i++) { this.pts.push(new THREE.Vector3()); this.prev.push(new THREE.Vector3()); this.target.push(new THREE.Vector3()); }
    this.mode = 'rigid';
    this.hardness = 1;         // 0 = flexible, 1 = rígida
    this.length = 1.75;
    this.targetLength = 1.75;
    this.initialized = false;

    const tex = canvasTexture(64, 256, (ctx, w, h) => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      for (let y = -w; y < h + w; y += 16) {
        ctx.strokeStyle = 'rgba(120,90,40,0.55)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + w * 0.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, y + 5); ctx.lineTo(w, y + 5 + w * 0.5); ctx.stroke();
      }
    }, true);
    const vcount = N * RS;
    const g = new THREE.BufferGeometry();
    this.posArr = new Float32Array(vcount * 3);
    this.norArr = new Float32Array(vcount * 3);
    const uv = new Float32Array(vcount * 2);
    const idx = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < RS; j++) {
      uv[(i * RS + j) * 2] = j / (RS - 1); uv[(i * RS + j) * 2 + 1] = i * 0.6;
      if (i < N - 1) {
        const a = i * RS + j, b = i * RS + ((j + 1) % RS), c = (i + 1) * RS + j, d = (i + 1) * RS + ((j + 1) % RS);
        idx.push(a, c, b, b, c, d);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.norArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.MeshToonMaterial({ color: 0xf3d58a, map: tex, emissive: 0xffc860, emissiveIntensity: 0.55 });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    // halo del núcleo
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    this.glow.scale.setScalar(0.9);
    this.tipGlow = this.glow.clone(); this.tipGlow.material = this.glow.material.clone();
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.glow, this.tipGlow);
    this._t = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._n = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.colRigid = new THREE.Color(0xffc860); this.colFlex = new THREE.Color(0x40ffc8);
    this.baseRigid = new THREE.Color(0xf3d58a); this.baseFlex = new THREE.Color(0x9ff5d8);
    this.pulse = 0;
  }

  setMode(m) { this.mode = m; this.pulse = 1; }

  // hand: posición mundial; dir: dirección de la hoja; ext: 0..1 extensión del látigo; wave: ondulación
  update(dt, hand, dir, { attacking = false, whipLen = 6, ext = 0, wave = 0, time = 0, sideVec = null, groundAt = null } = {}) {
    const rigid = this.mode === 'rigid';
    this.hardness = clamp(this.hardness + (rigid ? dt * 7 : -dt * 7), 0, 1);
    this.targetLength = rigid ? 1.75 : (attacking ? 1.8 + (whipLen - 1.8) * ext : 1.7);
    this.length += (this.targetLength - this.length) * Math.min(1, dt * (attacking ? 25 : 8));
    const L = this.length, seg = L / (N - 1);
    if (!this.initialized) {
      for (let i = 0; i < N; i++) { this.pts[i].copy(hand).addScaledVector(dir, seg * i); this.prev[i].copy(this.pts[i]); }
      this.initialized = true;
    }
    // forma objetivo
    const side = sideVec || this._n.set(dir.z, 0, -dir.x).normalize();
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      this.target[i].copy(hand).addScaledVector(dir, L * f);
      if (!rigid && attacking && wave) this.target[i].addScaledVector(side, Math.sin(f * 9 - time * 30) * wave * f * (1 - f) * 2);
    }
    // integración verlet
    const g = rigid ? 0 : -22;
    const stiff = rigid ? 1 : attacking ? 0.42 : 0.0;
    for (let i = 1; i < N; i++) {
      const p = this.pts[i], pr = this.prev[i];
      const vx = (p.x - pr.x) * 0.9, vy = (p.y - pr.y) * 0.9, vz = (p.z - pr.z) * 0.9;
      pr.copy(p);
      p.x += vx; p.y += vy + g * dt * dt; p.z += vz;
      const s = Math.max(stiff, this.hardness);
      if (s > 0) p.lerp(this.target[i], s);
    }
    this.pts[0].copy(hand); this.prev[0].copy(hand);
    // restricciones de distancia
    const iters = this.hardness > 0.99 ? 0 : 4;
    for (let k = 0; k < iters; k++) {
      this.pts[0].copy(hand);
      for (let i = 0; i < N - 1; i++) {
        const a = this.pts[i], b = this.pts[i + 1];
        const d = this._t.subVectors(b, a); const len = d.length() || 1e-4;
        const diff = (len - seg) / len;
        if (i === 0) b.addScaledVector(d, -diff);
        else { a.addScaledVector(d, diff * 0.5); b.addScaledVector(d, -diff * 0.5); }
      }
    }
    // no atravesar el suelo
    if (this.hardness < 0.99 && groundAt) {
      for (let i = 1; i < N; i++) { const p = this.pts[i]; const gy = groundAt(p.x, p.z) + 0.04; if (p.y < gy) p.y = gy; }
    }
    this.buildMesh();
    // colores
    this.pulse = Math.max(0, this.pulse - dt * 3);
    const h = this.hardness;
    this.mat.emissive.copy(this.colFlex).lerp(this.colRigid, h);
    this.mat.color.copy(this.baseFlex).lerp(this.baseRigid, h);
    this.mat.emissiveIntensity = 0.5 + this.pulse * 1.5 + (attacking ? 0.3 : 0);
    this.glow.position.copy(hand);
    this.glow.material.color.copy(this.mat.emissive);
    this.tipGlow.position.copy(this.pts[N - 1]);
    this.tipGlow.material.color.copy(this.mat.emissive);
    this.tipGlow.scale.setScalar(0.5 + this.pulse * 2 + (attacking ? 0.4 : 0));
  }

  tip() { return this.pts[N - 1]; }
  mid() { return this.pts[Math.floor(N / 2)]; }
  point(f) { return this.pts[Math.round(clamp(f, 0, 1) * (N - 1))]; }

  buildMesh() {
    const P = this.pts, pos = this.posArr, nor = this.norArr;
    const t = this._t, a = this._a, b = this._b;
    const rigid = this.hardness;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (i < N - 1) t.subVectors(P[i + 1], p); else t.subVectors(p, P[i - 1]);
      t.normalize();
      a.crossVectors(t, this._up);
      if (a.lengthSq() < 1e-4) a.set(1, 0, 0);
      a.normalize();
      b.crossVectors(a, t).normalize();
      const f = i / (N - 1);
      // grosor: rígida = hoja afilada hacia la punta; flexible = cuerda uniforme
      let r = 0.055 * (1 - f * 0.25);
      const bladeR = f < 0.12 ? 0.07 : 0.075 * (1 - Math.pow(f, 3)) + 0.004;
      r = r + (bladeR - r) * rigid;
      if (i === N - 1) r = 0.004;
      for (let j = 0; j < RS; j++) {
        const ang = (j / RS) * Math.PI * 2 + f * 6 * (1 - rigid);
        const c = Math.cos(ang), s = Math.sin(ang);
        // hoja algo aplanada en modo rígido
        const flat = 1 - 0.55 * rigid;
        const nx = a.x * c + b.x * s * flat, ny = a.y * c + b.y * s * flat, nz = a.z * c + b.z * s * flat;
        const k = (i * RS + j) * 3;
        pos[k] = p.x + nx * r; pos[k + 1] = p.y + ny * r; pos[k + 2] = p.z + nz * r;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nor[k] = nx / nl; nor[k + 1] = ny / nl; nor[k + 2] = nz / nl;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }
}
