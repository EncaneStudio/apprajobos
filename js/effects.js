import * as THREE from 'three';
import { G } from './state.js';
import { rand } from './util.js';

// ---------- Partículas ----------
const PVS = `
attribute float size; attribute vec4 pcolor;
varying vec4 vColor;
void main(){
  vColor = pcolor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const PFS = `
varying vec4 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

export class Particles {
  constructor(max = 2500) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.addMat = new THREE.ShaderMaterial({ vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.addMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  attach(scene) { scene.add(this.points); }
  emit(x, y, z, { count = 10, color = [1, 0.9, 0.5], speed = 5, up = 2, life = 0.6, size = 0.4, grav = -8, spread = 1, alpha = 1, jitter = 0 } = {}) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = x + rand(-jitter, jitter); this.pos[i * 3 + 1] = y + rand(-jitter, jitter); this.pos[i * 3 + 2] = z + rand(-jitter, jitter);
      const a = Math.random() * Math.PI * 2, e = (Math.random() * 2 - 1) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * sp * Math.sqrt(1 - e * e * 0.5);
      this.vel[i * 3 + 1] = up * (0.5 + Math.random()) + e * sp * 0.5;
      this.vel[i * 3 + 2] = Math.sin(a) * sp * Math.sqrt(1 - e * e * 0.5);
      const c = Array.isArray(color[0]) ? color[Math.floor(Math.random() * color.length)] : color;
      this.col[i * 4] = c[0]; this.col[i * 4 + 1] = c[1]; this.col[i * 4 + 2] = c[2]; this.col[i * 4 + 3] = alpha;
      this.alpha[i] = alpha;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
      this.baseSize[i] = size * (0.6 + Math.random() * 0.8);
      this.grav[i] = grav;
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      const drag = Math.exp(-2.2 * dt);
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.baseSize[i] * (0.4 + k * 0.6);
      this.col[i * 4 + 3] = this.alpha[i] * k;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
  clear() { this.life.fill(0); }
}

// ---------- Anillos de onda / marcas en el suelo ----------
const ringGeo = new THREE.RingGeometry(0.85, 1, 40);
ringGeo.rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 36);
discGeo.rotateX(-Math.PI / 2);

export class FX {
  constructor() {
    this.particles = new Particles(G.quality === 'baja' ? 1200 : 2500);
    this.rings = [];
    this.telegraphs = [];
    this.dmgPool = [];
    this.dmgLayer = document.getElementById('dmgLayer');
    this.trails = [];
  }
  attach(scene) {
    this.particles.attach(scene);
    for (const r of this.rings) scene.add(r.mesh);
    for (const t of this.telegraphs) scene.add(t.mesh);
    this.scene = scene;
  }
  hit(p, color = [1, 0.95, 0.6], n = 14) {
    this.particles.emit(p.x, p.y, p.z, { count: n, color, speed: 9, up: 2, life: 0.35, size: 0.35, grav: -12 });
    this.particles.emit(p.x, p.y, p.z, { count: 3, color: [1, 1, 1], speed: 1, up: 0.2, life: 0.15, size: 1.4, grav: 0 });
  }
  dust(p, n = 6) { this.particles.emit(p.x, p.y + 0.1, p.z, { count: n, color: [0.75, 0.7, 0.6], speed: 2, up: 1, life: 0.6, size: 0.7, grav: -1, alpha: 0.35 }); }
  deathPuff(p, color = [0.55, 0.3, 0.75]) {
    this.particles.emit(p.x, p.y + 1, p.z, { count: 40, color: [color, [0.2, 0.1, 0.3], [0.9, 0.6, 1]], speed: 4, up: 3, life: 1.1, size: 1.1, grav: 1.5, alpha: 0.8, jitter: 0.6 });
  }
  sparkle(p, color = [0.6, 1, 0.5], n = 20) { this.particles.emit(p.x, p.y, p.z, { count: n, color, speed: 3, up: 3, life: 1, size: 0.35, grav: -2 }); }
  heal(p) { this.particles.emit(p.x, p.y + 1, p.z, { count: 40, color: [[0.5, 1, 0.6], [1, 1, 0.7]], speed: 2, up: 4, life: 1.2, size: 0.4, grav: 1, jitter: 0.8 }); }
  levelUp(p) {
    this.particles.emit(p.x, p.y + 1, p.z, { count: 90, color: [[1, 0.9, 0.4], [1, 1, 1], [0.5, 0.9, 1]], speed: 6, up: 8, life: 1.6, size: 0.5, grav: -3, jitter: 0.5 });
    this.ring(p, 8, [1, 0.9, 0.5], 0.8);
  }
  ring(p, radius = 5, color = [1, 1, 1], dur = 0.45) {
    let r = this.rings.find((x) => !x.active);
    if (!r) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      mesh.renderOrder = 6;
      r = { mesh }; this.rings.push(r);
    }
    if (r.mesh.parent !== this.scene) this.scene.add(r.mesh);
    r.active = true; r.t = 0; r.dur = dur; r.radius = radius;
    r.mesh.position.set(p.x, p.y + 0.15, p.z);
    r.mesh.material.color.setRGB(color[0], color[1], color[2]);
    r.mesh.visible = true;
  }
  // Marca de ataque en el suelo (círculo que se llena)
  telegraph(p, radius, dur, color = 0xff3a2a) {
    let t = this.telegraphs.find((x) => !x.active);
    if (!t) {
      const g = new THREE.Group();
      const edge = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }));
      g.add(edge, fill);
      g.renderOrder = 4;
      t = { mesh: g, edge, fill }; this.telegraphs.push(t);
    }
    if (t.mesh.parent !== this.scene) this.scene.add(t.mesh);
    t.active = true; t.t = 0; t.dur = dur;
    t.mesh.position.set(p.x, p.y + 0.12, p.z);
    t.mesh.scale.setScalar(radius);
    t.edge.material.color.set(color); t.fill.material.color.set(color);
    t.fill.scale.setScalar(0.01);
    t.mesh.visible = true;
    return t;
  }
  damageNumber(p, amount, { crit = false, color = null, text = null } = {}) {
    let el = this.dmgPool.find((d) => !d.active);
    if (!el) {
      const div = document.createElement('div');
      div.className = 'dmg';
      this.dmgLayer.appendChild(div);
      el = { div }; this.dmgPool.push(el);
    }
    el.active = true; el.t = 0; el.p = p.clone(); el.p.y += 1.8; el.vx = rand(-0.8, 0.8);
    el.div.textContent = text || Math.round(amount);
    el.div.className = 'dmg' + (crit ? ' crit' : '') + (text ? ' txt' : '');
    el.div.style.color = color || '';
    el.div.style.display = 'block';
  }
  update(dt) {
    this.particles.update(dt);
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.active = false; r.mesh.visible = false; continue; }
      const s = r.radius * (0.2 + 0.8 * Math.sqrt(k));
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = 1 - k;
    }
    for (const t of this.telegraphs) {
      if (!t.active) continue;
      t.t += dt;
      const k = t.t / t.dur;
      if (k >= 1) { t.active = false; t.mesh.visible = false; continue; }
      t.fill.scale.setScalar(Math.max(0.01, k));
      t.edge.material.opacity = 0.5 + 0.4 * Math.sin(t.t * 20);
    }
    const cam = G.camera;
    const v = new THREE.Vector3();
    const w = window.innerWidth, h = window.innerHeight;
    for (const d of this.dmgPool) {
      if (!d.active) continue;
      d.t += dt;
      if (d.t > 0.9) { d.active = false; d.div.style.display = 'none'; continue; }
      d.p.y += dt * (1.6 - d.t * 1.5); d.p.x += d.vx * dt;
      v.copy(d.p).project(cam);
      if (v.z > 1) { d.div.style.display = 'none'; continue; }
      d.div.style.display = 'block';
      const sc = d.t < 0.1 ? 0.6 + d.t * 8 : 1.4 - Math.min(0.4, (d.t - 0.1) * 2);
      d.div.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${sc})`;
      d.div.style.opacity = d.t > 0.6 ? 1 - (d.t - 0.6) / 0.3 : 1;
    }
  }
  clear() {
    this.particles.clear();
    for (const r of this.rings) { r.active = false; r.mesh.visible = false; }
    for (const t of this.telegraphs) { t.active = false; t.mesh.visible = false; }
  }
}

// ---------- Estela del arma ----------
export class Trail {
  constructor(len = 14, color = 0xffe7a0) {
    this.len = len;
    this.base = []; this.tip = [];
    for (let i = 0; i < len; i++) { this.base.push(new THREE.Vector3()); this.tip.push(new THREE.Vector3()); }
    const pos = new Float32Array(len * 2 * 3), alpha = new Float32Array(len * 2);
    const idx = [];
    for (let i = 0; i < len - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 } },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 color; uniform float opacity; varying float vA; void main(){ gl_FragColor = vec4(color*1.4, vA*opacity); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.geo = g;
    this.active = false;
    this.fade = 0;
  }
  reset(b, t) { for (let i = 0; i < this.len; i++) { this.base[i].copy(b); this.tip[i].copy(t); } }
  push(b, t) {
    if (!this.active) { this.reset(b, t); this.active = true; }
    const lb = this.base.pop(), lt = this.tip.pop();
    lb.copy(b); lt.copy(t);
    this.base.unshift(lb); this.tip.unshift(lt);
  }
  update(dt, on) {
    this.fade = on ? Math.min(1, this.fade + dt * 12) : Math.max(0, this.fade - dt * 5);
    if (this.fade <= 0) { this.active = false; this.mesh.visible = false; return; }
    this.mesh.visible = true;
    this.mat.uniforms.opacity.value = this.fade * 0.85;
    const pos = this.geo.attributes.position.array, al = this.geo.attributes.alpha.array;
    for (let i = 0; i < this.len; i++) {
      const b = this.base[i], t = this.tip[i];
      pos[i * 6] = b.x; pos[i * 6 + 1] = b.y; pos[i * 6 + 2] = b.z;
      pos[i * 6 + 3] = t.x; pos[i * 6 + 4] = t.y; pos[i * 6 + 5] = t.z;
      const a = 1 - i / (this.len - 1);
      al[i * 2] = a * 0.2; al[i * 2 + 1] = a;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
  }
}
