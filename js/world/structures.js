import * as THREE from 'three';
import { GEO, mergeColored, vcToonMat, toonMat, canvasTexture, addOutline } from '../util.js';

const MAT = { vc: null };
function vc() { return MAT.vc || (MAT.vc = vcToonMat()); }
export const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, fog: true });

function meshOf(items, cast = true) {
  const m = new THREE.Mesh(mergeColored(items), vc());
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}

// ---------- Casas de la aldea (estilo Hateno) ----------
export function house({ w = 7, d = 6, hgt = 3.4, roof = 0xb84a3a, wall = 0xf1e6cf, timber = 0x6e4b30, stone = 0x9a948a, two = false } = {}) {
  const g = new THREE.Group();
  const H = two ? hgt * 1.7 : hgt;
  const items = [
    { g: GEO.box, c: stone, p: [0, 0.4, 0], s: [w + 0.4, 0.8, d + 0.4] },
    { g: GEO.box, c: wall, p: [0, 0.8 + H / 2, 0], s: [w, H, d] },
    // vigas
    { g: GEO.box, c: timber, p: [w / 2, 0.8 + H / 2, d / 2], s: [0.3, H, 0.3] },
    { g: GEO.box, c: timber, p: [-w / 2, 0.8 + H / 2, d / 2], s: [0.3, H, 0.3] },
    { g: GEO.box, c: timber, p: [w / 2, 0.8 + H / 2, -d / 2], s: [0.3, H, 0.3] },
    { g: GEO.box, c: timber, p: [-w / 2, 0.8 + H / 2, -d / 2], s: [0.3, H, 0.3] },
    { g: GEO.box, c: timber, p: [0, 0.8 + H, d / 2 + 0.02], s: [w, 0.3, 0.1] },
    { g: GEO.box, c: timber, p: [0, 0.8 + H * 0.5, d / 2 + 0.02], s: [w, 0.2, 0.1] },
    // puerta y ventanas
    { g: GEO.box, c: 0x5a3a22, p: [0, 0.8 + 1.1, d / 2 + 0.06], s: [1.2, 2.2, 0.12] },
    { g: GEO.box, c: 0x3b5d7a, p: [w * 0.3, 0.8 + H * 0.62, d / 2 + 0.06], s: [0.9, 0.8, 0.1] },
    { g: GEO.box, c: 0x3b5d7a, p: [-w * 0.3, 0.8 + H * 0.62, d / 2 + 0.06], s: [0.9, 0.8, 0.1] },
    { g: GEO.box, c: 0x3b5d7a, p: [w / 2 + 0.06, 0.8 + H * 0.6, 0], s: [0.1, 0.8, 0.9] },
    // chimenea
    { g: GEO.box, c: stone, p: [w * 0.3, 0.8 + H + 1.6, -d * 0.2], s: [0.7, 2.4, 0.7] },
  ];
  // tejado a dos aguas
  const rw = w + 1.2, rd = d / 2 + 0.7, rh = 2.2;
  const slope = Math.atan2(rh, rd);
  const len = Math.hypot(rh, rd);
  items.push({ g: GEO.box, c: roof, p: [0, 0.8 + H + rh / 2, rd / 2 - 0.05], r: [slope, 0, 0], s: [rw, 0.25, len] });
  items.push({ g: GEO.box, c: roof, p: [0, 0.8 + H + rh / 2, -rd / 2 + 0.05], r: [-slope, 0, 0], s: [rw, 0.25, len] });
  // hastiales
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-d / 2, 0, 0, d / 2, 0, 0, 0, rh, 0, d / 2, 0, 0, -d / 2, 0, 0, 0, rh, 0], 3));
  tri.computeVertexNormals();
  items.push({ g: tri, c: wall, p: [w / 2, 0.8 + H, 0], r: [0, Math.PI / 2, 0] });
  items.push({ g: tri, c: wall, p: [-w / 2, 0.8 + H, 0], r: [0, Math.PI / 2, 0] });
  g.add(meshOf(items));
  g.userData.box = { hw: w / 2 + 0.3, hd: d / 2 + 0.3 };
  return g;
}

export function windmill() {
  const g = new THREE.Group();
  g.add(meshOf([
    { g: new THREE.CylinderGeometry(1.6, 2.6, 9, 8), c: 0xe9dfc8, p: [0, 4.5, 0] },
    { g: new THREE.ConeGeometry(2.3, 2.6, 8), c: 0x8a4a35, p: [0, 10.3, 0] },
    { g: GEO.box, c: 0x5a3a22, p: [0, 1.1, 2.4], s: [1.1, 2.2, 0.3], r: [0.25, 0, 0] },
  ]));
  const blades = new THREE.Group();
  blades.position.set(0, 8.2, 2.3);
  const items = [{ g: GEO.cyl, c: 0x6e4b30, s: [0.5, 0.6, 0.5], r: [Math.PI / 2, 0, 0] }];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    items.push({ g: GEO.box, c: 0x6e4b30, p: [Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.2], r: [0, 0, a], s: [5.4, 0.18, 0.18] });
    items.push({ g: GEO.box, c: 0xf5f0e0, p: [Math.cos(a) * 3.1 - Math.sin(a) * 0.45, Math.sin(a) * 3.1 + Math.cos(a) * 0.45, 0.25], r: [0, 0, a], s: [4.2, 0.8, 0.05] });
  }
  blades.add(meshOf(items));
  g.add(blades);
  g.userData.anim = (dt) => { blades.rotation.z += dt * 0.6; };
  return g;
}

export function well() {
  return meshOf([
    { g: new THREE.CylinderGeometry(1.3, 1.4, 1, 12, 1, true), c: 0x9a948a, p: [0, 0.5, 0] },
    { g: new THREE.TorusGeometry(1.3, 0.18, 6, 14), c: 0x857f75, p: [0, 1, 0], r: [Math.PI / 2, 0, 0] },
    { g: new THREE.CircleGeometry(1.2, 12), c: 0x3d7ea8, p: [0, 0.6, 0], r: [-Math.PI / 2, 0, 0] },
    { g: GEO.box, c: 0x6e4b30, p: [1.2, 1.8, 0], s: [0.18, 2.4, 0.18] },
    { g: GEO.box, c: 0x6e4b30, p: [-1.2, 1.8, 0], s: [0.18, 2.4, 0.18] },
    { g: GEO.cone4, c: 0x8a4a35, p: [0, 3.4, 0], s: [3.6, 1.2, 3.6], r: [0, Math.PI / 4, 0] },
  ]);
}

export function stall(cloth = 0xd9534f) {
  const items = [
    { g: GEO.box, c: 0x8a6440, p: [0, 0.5, 0], s: [3, 1, 1.4] },
    { g: GEO.box, c: 0x6e4b30, p: [1.4, 1.3, 0.6], s: [0.12, 2.6, 0.12] },
    { g: GEO.box, c: 0x6e4b30, p: [-1.4, 1.3, 0.6], s: [0.12, 2.6, 0.12] },
    { g: GEO.box, c: 0x6e4b30, p: [1.4, 1.5, -0.6], s: [0.12, 3, 0.12] },
    { g: GEO.box, c: 0x6e4b30, p: [-1.4, 1.5, -0.6], s: [0.12, 3, 0.12] },
    { g: GEO.box, c: cloth, p: [0, 2.8, 0], s: [3.3, 0.1, 1.8], r: [-0.25, 0, 0] },
    { g: GEO.sphere, c: 0xe8453c, p: [0.6, 1.15, 0.2], s: 0.3 }, { g: GEO.sphere, c: 0xf2c94c, p: [0.2, 1.15, 0.3], s: 0.3 },
    { g: GEO.sphere, c: 0x7cc242, p: [-0.3, 1.15, 0.1], s: 0.3 }, { g: GEO.box, c: 0xc49a6c, p: [-0.9, 1.2, 0], s: [0.5, 0.4, 0.5] },
  ];
  return meshOf(items);
}

export function forge() {
  const g = new THREE.Group();
  g.add(meshOf([
    { g: GEO.box, c: 0x7d776d, p: [0, 1, 0], s: [2.4, 2, 2] },
    { g: GEO.box, c: 0x2a2320, p: [0, 1, 1.01], s: [1, 0.8, 0.05] },
    { g: GEO.box, c: 0x7d776d, p: [0, 3, -0.3], s: [0.9, 2.5, 0.9] },
    { g: GEO.box, c: 0x3b3b40, p: [2.2, 0.55, 0.5], s: [0.9, 0.5, 0.45] },
    { g: GEO.box, c: 0x3b3b40, p: [2.2, 0.25, 0.5], s: [0.5, 0.5, 0.35] },
    { g: GEO.box, c: 0x6e4b30, p: [-0.3, 3.1, 1.6], s: [4.8, 0.15, 2.8], r: [0.18, 0, 0] },
    { g: GEO.box, c: 0x6e4b30, p: [-2.4, 1.6, 2.6], s: [0.15, 3.2, 0.15] }, { g: GEO.box, c: 0x6e4b30, p: [1.8, 1.6, 2.6], s: [0.15, 3.2, 0.15] },
  ]));
  const fire = new THREE.Mesh(GEO.box, glowMat(0xff7a2a));
  fire.scale.set(0.8, 0.5, 0.1); fire.position.set(0, 0.95, 1.02);
  g.add(fire);
  g.userData.anim = (dt, t) => { fire.material.color.setHSL(0.06 + Math.sin(t * 9) * 0.015, 1, 0.55 + Math.sin(t * 13) * 0.05); };
  return g;
}

export function fence(len = 6) {
  const items = [];
  const n = Math.max(2, Math.round(len / 2));
  for (let i = 0; i <= n; i++) items.push({ g: GEO.box, c: 0x7a5a3c, p: [-len / 2 + (len / n) * i, 0.55, 0], s: [0.16, 1.1, 0.16] });
  items.push({ g: GEO.box, c: 0x8a6a48, p: [0, 0.75, 0], s: [len, 0.1, 0.08] });
  items.push({ g: GEO.box, c: 0x8a6a48, p: [0, 0.4, 0], s: [len, 0.1, 0.08] });
  return meshOf(items);
}

export function lantern() {
  const g = new THREE.Group();
  g.add(meshOf([{ g: GEO.box, c: 0x4a3a2a, p: [0, 1.3, 0], s: [0.14, 2.6, 0.14] }, { g: GEO.box, c: 0x4a3a2a, p: [0.3, 2.55, 0], s: [0.6, 0.08, 0.08] }, { g: GEO.cone4, c: 0x3a2a1a, p: [0.55, 2.55, 0], s: [0.45, 0.25, 0.45], r: [0, Math.PI / 4, 0] }]));
  const l = new THREE.Mesh(GEO.box, glowMat(0xffd27a));
  l.scale.set(0.25, 0.3, 0.25); l.position.set(0.55, 2.28, 0);
  g.add(l);
  g.userData.lamp = l;
  return g;
}

export function bigTree() {
  const I = new THREE.IcosahedronGeometry(1, 1);
  return meshOf([
    { g: new THREE.CylinderGeometry(0.7, 1.3, 7, 8), c: 0x6e5236, p: [0, 3.5, 0] },
    { g: new THREE.CylinderGeometry(0.25, 0.4, 3, 6), c: 0x6e5236, p: [1.3, 6, 0], r: [0, 0, -0.9] },
    { g: new THREE.CylinderGeometry(0.25, 0.4, 3, 6), c: 0x6e5236, p: [-1.2, 6.2, 0.4], r: [0.2, 0, 0.9] },
    { g: I, c: 0x6aa83c, p: [0, 9, 0], s: [5, 3.6, 5] }, { g: I, c: 0x7cbb46, p: [2.8, 8.2, 1], s: [3, 2.4, 3] },
    { g: I, c: 0x5a9434, p: [-2.6, 8.5, -1.2], s: [3.2, 2.6, 3.2] }, { g: I, c: 0x84c450, p: [0.4, 11, 0.3], s: [3, 2.2, 3] },
    { g: I, c: 0xf4a8c8, p: [1.8, 10.2, 2.4], s: [1.2, 0.8, 1.2] }, { g: I, c: 0xf4a8c8, p: [-2.2, 10.5, 1.5], s: [1, 0.7, 1] },
  ]);
}

// ---------- Campamento de monstruos ----------
export function tent(color = 0x9b7b56) {
  return meshOf([
    { g: new THREE.ConeGeometry(2.2, 3.2, 5), c: color, p: [0, 1.6, 0] },
    { g: GEO.box, c: 0x3a2a1a, p: [0, 0.8, 1.7], s: [0.9, 1.4, 0.2], r: [-0.45, 0, 0] },
    { g: GEO.cyl, c: 0x5a4028, p: [0, 3.4, 0], s: [0.1, 0.9, 0.1] },
    { g: GEO.cone, c: 0xe8e0d0, p: [0, 3.95, 0], s: [0.25, 0.3, 0.25], r: [Math.PI, 0, 0] },
  ]);
}
export function bonfire() {
  const g = new THREE.Group();
  const items = [];
  for (let i = 0; i < 5; i++) { const a = i * 1.256; items.push({ g: GEO.cyl, c: 0x5a3a22, p: [Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4], r: [Math.PI / 2 - 0.4, a, 0], s: [0.18, 1.3, 0.18] }); }
  for (let i = 0; i < 8; i++) { const a = i * 0.785; items.push({ g: GEO.dodeca, c: 0x7a746a, p: [Math.cos(a) * 1.1, 0.15, Math.sin(a) * 1.1], s: 0.45 }); }
  g.add(meshOf(items));
  const f1 = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 }));
  const f2 = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.95 }));
  f1.scale.set(0.9, 1.6, 0.9); f1.position.y = 0.9; f2.scale.set(0.5, 1.0, 0.5); f2.position.y = 0.7;
  g.add(f1, f2);
  g.userData.anim = (dt, t) => {
    f1.scale.y = 1.5 + Math.sin(t * 11) * 0.2; f2.scale.y = 1 + Math.sin(t * 15 + 1) * 0.15;
    f1.rotation.y += dt * 2; f2.rotation.y -= dt * 3;
  };
  return g;
}
export function totem() {
  return meshOf([
    { g: GEO.cyl, c: 0x6e4b30, p: [0, 1.8, 0], s: [0.25, 3.6, 0.25] },
    { g: GEO.sphere, c: 0xe8e0d0, p: [0, 3.7, 0.05], s: [0.8, 0.7, 0.75] },
    { g: GEO.box, c: 0x1a1a1a, p: [0.17, 3.75, 0.35], s: [0.18, 0.18, 0.1] }, { g: GEO.box, c: 0x1a1a1a, p: [-0.17, 3.75, 0.35], s: [0.18, 0.18, 0.1] },
    { g: GEO.cone, c: 0xe8e0d0, p: [0.35, 4.1, 0], s: [0.15, 0.6, 0.15], r: [0, 0, -0.5] }, { g: GEO.cone, c: 0xe8e0d0, p: [-0.35, 4.1, 0], s: [0.15, 0.6, 0.15], r: [0, 0, 0.5] },
    { g: GEO.box, c: 0xb03a2e, p: [0, 2.8, 0.2], s: [0.7, 0.4, 0.05] },
  ]);
}
export function crate() {
  return meshOf([{ g: GEO.box, c: 0x9a7448, p: [0, 0.5, 0], s: [1, 1, 1] }, { g: GEO.box, c: 0x6e4b30, p: [0, 0.5, 0.505], s: [1, 0.15, 0.02] }, { g: GEO.box, c: 0x6e4b30, p: [0, 0.5, -0.505], s: [1, 0.15, 0.02] }]);
}

// ---------- Cofre ----------
export function chest(rare = false) {
  const g = new THREE.Group();
  const base = rare ? 0x3a4f8a : 0x8a5a2e, trim = rare ? 0xd9c27a : 0xc9a24a;
  g.add(meshOf([
    { g: GEO.box, c: base, p: [0, 0.35, 0], s: [1.2, 0.7, 0.8] },
    { g: GEO.box, c: trim, p: [0, 0.35, 0], s: [1.25, 0.12, 0.85] },
    { g: GEO.box, c: trim, p: [0.5, 0.35, 0], s: [0.1, 0.72, 0.82] }, { g: GEO.box, c: trim, p: [-0.5, 0.35, 0], s: [0.1, 0.72, 0.82] },
  ]));
  const lid = new THREE.Group();
  lid.position.set(0, 0.7, -0.4);
  lid.add(meshOf([
    { g: new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), c: base, p: [0, 0, 0.4], r: [0, 0, Math.PI / 2] },
    { g: GEO.box, c: trim, p: [0, 0.05, 0.8], s: [0.25, 0.3, 0.06] },
  ]));
  g.add(lid);
  g.userData.lid = lid;
  return g;
}

// ---------- Piedra de viento (punto de viaje rápido) ----------
export function waypointStone() {
  const g = new THREE.Group();
  g.add(meshOf([
    { g: new THREE.CylinderGeometry(2.4, 2.8, 0.6, 8), c: 0x8e877c, p: [0, 0.3, 0] },
    { g: new THREE.CylinderGeometry(0.7, 1.0, 5, 6), c: 0x6a6e78, p: [0, 3, 0] },
    { g: new THREE.ConeGeometry(0.7, 1.2, 6), c: 0x6a6e78, p: [0, 6.1, 0] },
  ]));
  const rune = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.86, 0.35, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xff9a3a }));
  rune.position.y = 3.5;
  const rune2 = rune.clone(); rune2.material = rune.material; rune2.position.y = 2.3; rune2.scale.set(1.06, 1, 1.06);
  g.add(rune, rune2);
  const orb = new THREE.Mesh(GEO.ico, new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.85 }));
  orb.position.y = 7.4; orb.scale.setScalar(0.7);
  g.add(orb);
  g.userData.setActive = (a) => { const c = a ? 0x4fe3ff : 0xff9a3a; rune.material.color.set(c); orb.material.color.set(c); };
  g.userData.anim = (dt, t) => { orb.rotation.y += dt; orb.rotation.x += dt * 0.6; orb.position.y = 7.4 + Math.sin(t * 2) * 0.2; };
  return g;
}

// ---------- Entrada de mazmorra ----------
export function dungeonGate(color = 0x4fe3ff, stone = 0x8a8478) {
  const g = new THREE.Group();
  const items = [
    { g: new THREE.CylinderGeometry(7, 7.8, 1, 10), c: stone, p: [0, 0.5, 0] },
    { g: new THREE.CylinderGeometry(5.5, 6, 0.6, 10), c: stone, p: [0, 1.3, 0] },
    { g: GEO.box, c: stone, p: [3.3, 5, 0], s: [1.4, 7.4, 1.6] },
    { g: GEO.box, c: stone, p: [-3.3, 5, 0], s: [1.4, 7.4, 1.6] },
    { g: GEO.box, c: stone, p: [0, 9.1, 0], s: [8.6, 1.2, 2] },
    { g: GEO.box, c: 0x6d675d, p: [0, 10, 0], s: [5, 0.7, 1.6] },
    { g: GEO.cone4, c: 0x6d675d, p: [0, 10.8, 0], s: [1.4, 1, 1.4], r: [0, Math.PI / 4, 0] },
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const h = 2 + (i % 3) * 1.4;
    items.push({ g: GEO.box, c: 0x7d776d, p: [Math.cos(a) * 9.5, h / 2 + 0.3, Math.sin(a) * 9.5], s: [1, h, 1], r: [0, a, (i % 2 ? 0.1 : -0.08)] });
  }
  g.add(meshOf(items));
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float time; uniform vec3 color; varying vec2 vUv;
      void main(){ vec2 p = vUv-0.5; float r = length(p)*2.0; float a = atan(p.y,p.x);
      float sw = sin(a*5.0 + r*12.0 - time*3.0)*0.5+0.5;
      float edge = smoothstep(1.0, 0.85, r);
      vec3 c = mix(color*0.4, color*1.6, sw*(1.0-r)) + vec3(1.0)*pow(1.0-r,4.0);
      gl_FragColor = vec4(c, edge*0.92); }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), portalMat);
  portal.scale.set(1, 1.35, 1);
  portal.position.set(0, 5, 0);
  g.add(portal);
  const glyphs = [];
  for (let i = 0; i < 2; i++) {
    const gl = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color }));
    gl.scale.set(0.3, 3.5, 0.1); gl.position.set(i ? 3.3 : -3.3, 5, 0.82);
    g.add(gl); glyphs.push(gl);
  }
  g.userData.anim = (dt) => { portalMat.uniforms.time.value += dt; };
  g.userData.pillars = [[3.3, 0], [-3.3, 0]];
  return g;
}

export function ruinPillar(h = 5, broken = true) {
  const items = [
    { g: GEO.box, c: 0x8a8478, p: [0, 0.3, 0], s: [1.8, 0.6, 1.8] },
    { g: new THREE.CylinderGeometry(0.6, 0.7, h, 8), c: 0x9b958a, p: [0, h / 2 + 0.6, 0], r: [broken ? 0.05 : 0, 0, broken ? 0.06 : 0] },
  ];
  if (!broken) items.push({ g: GEO.box, c: 0x8a8478, p: [0, h + 0.9, 0], s: [1.8, 0.6, 1.8] });
  else items.push({ g: GEO.dodeca, c: 0x9b958a, p: [1.4, 0.4, 0.6], s: [1.1, 0.8, 1.1] });
  return meshOf(items);
}

export function echoOrb() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(GEO.ico, new THREE.MeshBasicMaterial({ color: 0xb8ff7a }));
  core.scale.setScalar(0.45);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x9dff6a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(2.4);
  g.add(core, halo);
  g.userData.anim = (dt, t) => { core.rotation.y += dt * 2; core.rotation.z += dt; g.position.y = g.userData.baseY + Math.sin(t * 2.2) * 0.3; halo.material.opacity = 0.7 + Math.sin(t * 5) * 0.2; };
  return g;
}

export function mushroom() {
  return meshOf([
    { g: GEO.cyl, c: 0xf0e6d0, p: [0, 0.18, 0], s: [0.12, 0.36, 0.12] },
    { g: new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c: 0xd8452f, p: [0, 0.34, 0], s: [0.6, 0.45, 0.6] },
    { g: GEO.sphere, c: 0xffffff, p: [0.12, 0.52, 0.08], s: 0.08 }, { g: GEO.sphere, c: 0xffffff, p: [-0.1, 0.5, -0.1], s: 0.07 },
  ], false);
}

let _glow = null;
export function glowTexture() {
  if (_glow) return _glow;
  _glow = canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  return _glow;
}

export function questItemMesh(color = 0xffd27a) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(GEO.torus, new THREE.MeshBasicMaterial({ color }));
  core.scale.setScalar(0.6);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(2);
  g.add(core, halo);
  g.userData.anim = (dt, t) => { core.rotation.y += dt * 2; g.position.y = g.userData.baseY + Math.sin(t * 2) * 0.2; };
  return g;
}
