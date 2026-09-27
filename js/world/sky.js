import * as THREE from 'three';
import { G } from '../state.js';
import { canvasTexture, lerp, smoothstep, rand } from '../util.js';

const skyVS = `
varying vec3 vDir;
void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`;
const skyFS = `
uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor; uniform vec3 sunDir; uniform vec3 sunColor; uniform float night; uniform float time;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(horizonColor, topColor, pow(smoothstep(0.0, 0.65, h), 0.8));
  col = mix(col, groundColor, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(sd, 900.0) * 3.0 + pow(sd, 12.0) * 0.35 + pow(sd, 3.0)*0.12);
  // luna
  float md = max(dot(d, -sunDir), 0.0);
  col += vec3(0.85,0.9,1.0) * pow(md, 1400.0) * 2.0 * night;
  // estrellas
  if (night > 0.01 && h > 0.0) {
    vec3 sp = floor(d * 260.0);
    float s = hash(sp);
    float tw = 0.6 + 0.4*sin(time*2.0 + s*50.0);
    col += vec3(step(0.9975, s)) * tw * night * smoothstep(0.0, 0.3, h);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const KEYS = [
  // hora, top, horizon, luz sol, intensidad, ambiente
  { t: 0, top: '#081230', hor: '#1d2b55', sun: '#8aa4ff', si: 0.35, amb: 0.55 },
  { t: 5, top: '#101d45', hor: '#35406e', sun: '#8aa4ff', si: 0.35, amb: 0.6 },
  { t: 6.3, top: '#4a6aa8', hor: '#f7a86b', sun: '#ffb070', si: 1.2, amb: 0.8 },
  { t: 8, top: '#3f8fe0', hor: '#bfe4f7', sun: '#fff3dc', si: 2.4, amb: 1.0 },
  { t: 16, top: '#3a8ae0', hor: '#c4e6f5', sun: '#fff2d6', si: 2.4, amb: 1.0 },
  { t: 18.5, top: '#4b5ea8', hor: '#f59a5e', sun: '#ff9a55', si: 1.3, amb: 0.8 },
  { t: 20, top: '#1a2552', hor: '#4a4a7a', sun: '#8aa4ff', si: 0.4, amb: 0.6 },
  { t: 24, top: '#081230', hor: '#1d2b55', sun: '#8aa4ff', si: 0.35, amb: 0.55 },
];

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;
    this.uniforms = {
      topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() }, groundColor: { value: new THREE.Color('#6a7f8a') },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color('#fff4dd') }, night: { value: 0 }, time: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: skyVS, fragmentShader: skyFS, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.castShadow = quality !== 'baja';
    const sm = quality === 'alta' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5b6b3a, 1.0);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(this.ambient);
    scene.fog = new THREE.Fog(0xbfe4f7, 90, quality === 'baja' ? 380 : 560);
    this.fogFar = scene.fog.far;

    // Nubes esponjosas
    const tex = canvasTexture(256, 128, (ctx, w, h) => {
      for (let i = 0; i < 26; i++) {
        const x = w * 0.18 + Math.random() * w * 0.64, y = h * 0.45 + Math.random() * h * 0.25, r = 18 + Math.random() * 34;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      const g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(170,185,210,0.35)');
      ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    });
    this.cloudMat = new THREE.SpriteMaterial({ map: tex, fog: false, transparent: true, depthWrite: false, opacity: 0.95 });
    this.clouds = [];
    const n = quality === 'baja' ? 14 : 28;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const a = Math.random() * Math.PI * 2, r = rand(150, 700);
      s.position.set(Math.cos(a) * r, rand(170, 260), Math.sin(a) * r);
      const sz = rand(140, 280);
      s.scale.set(sz, sz * 0.5, 1);
      s.renderOrder = -5;
      scene.add(s);
      this.clouds.push(s);
    }
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color();
  }

  update(dt, center) {
    const u = this.uniforms;
    u.time.value += dt;
    const t = G.dayTime;
    let k0 = KEYS[0], k1 = KEYS[1];
    for (let i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { k0 = KEYS[i]; k1 = KEYS[i + 1]; break; }
    const f = (t - k0.t) / (k1.t - k0.t || 1);
    u.topColor.value.set(k0.top).lerp(this._c1.set(k1.top), f);
    u.horizonColor.value.set(k0.hor).lerp(this._c1.set(k1.hor), f);
    const sunC = this._c2.set(k0.sun).lerp(this._c1.set(k1.sun), f);
    u.sunColor.value.copy(sunC);
    const si = lerp(k0.si, k1.si, f), amb = lerp(k0.amb, k1.amb, f);
    // posición del sol
    const ang = ((t - 6) / 12) * Math.PI;
    const sd = u.sunDir.value.set(Math.cos(ang) * 0.8, Math.sin(ang), 0.35).normalize();
    const isNight = t < 5.8 || t > 19.6;
    u.night.value = Math.min(1, smoothstep(18.8, 20.5, t) + (1 - smoothstep(4.5, 6.2, t)));
    const lightDir = isNight ? sd.clone().negate() : sd.clone();
    if (lightDir.y < 0.15) lightDir.y = 0.15;
    lightDir.normalize();
    this.sun.position.copy(center).addScaledVector(lightDir, 150);
    this.sun.target.position.copy(center);
    this.sun.color.copy(sunC);
    this.sun.intensity = G.inDungeon ? 0 : si;
    this.hemi.intensity = amb;
    this.hemi.color.copy(u.horizonColor.value).lerp(this._c1.set('#ffffff'), 0.4);
    this.ambient.intensity = 0.2 + (isNight ? 0.15 : 0);
    if (this.scene.fog) this.scene.fog.color.copy(u.horizonColor.value).lerp(u.topColor.value, 0.15);
    this.dome.position.copy(G.camera.position);
    // nubes
    const cc = this._c1.copy(u.horizonColor.value).lerp(this._c2.set('#ffffff'), isNight ? 0.2 : 0.75);
    this.cloudMat.color.copy(cc);
    for (const c of this.clouds) {
      c.position.x += dt * 3;
      if (c.position.x > 800) c.position.x = -800;
    }
  }
}
