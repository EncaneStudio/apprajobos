import * as THREE from 'three';
import { GLTFLoader } from '../lib/addons/loaders/GLTFLoader.js';
import { toonGradient } from './util.js';

/**
 * Modelo del protagonista (Guardián Silverleaf, GLB con esqueleto).
 * El humanoide procedural de models.js sigue calculando las poses de forma invisible
 * y aquí se copian sus rotaciones a los huesos del modelo.
 */
const URL = 'assets/guardian.glb';
const MODEL_H = 1.9;
const SPREAD = 0.15; // separación extra de los brazos: el modelo tiene hombros más anchos
const DOWN = new THREE.Vector3(0, -1, 0);
const CHAIN = { uArmL: 'lArmL', lArmL: 'handL', uArmR: 'lArmR', lArmR: 'handR', thighL: 'shinL', shinL: 'footL', thighR: 'shinR', shinR: 'footR' };
const UPPER = { handL: 'lArmL', handR: 'lArmR' };

let model = null, loading = null;

function outlineSkinMat(thick) {
  const m = new THREE.MeshBasicMaterial({ color: 0x1b1a24, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thick.toFixed(4)};`);
  };
  return m;
}

function prepare(gltf) {
  const root = gltf.scene, bones = {}, skinned = [];
  root.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isSkinnedMesh) skinned.push(o); });
  if (!bones.hips || !skinned.length) throw new Error('GLB sin esqueleto');
  root.updateMatrixWorld(true);
  // Reorientar huesos: torso alineado con el mundo, extremidades con -Y hacia la siguiente articulación.
  const list = [];
  root.traverse((o) => { if (o.isBone) list.push(o); });
  const wp = {}, oldW = new Map();
  for (const b of list) { oldW.set(b, b.matrixWorld.clone()); wp[b.name] = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); }
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m = new THREE.Matrix4(), inv = new THREE.Matrix4();
  for (const b of list) {
    oldW.get(b).decompose(p, q, sc);
    const n = b.name;
    if (CHAIN[n]) q.setFromUnitVectors(DOWN, wp[CHAIN[n]].clone().sub(wp[n]).normalize());
    else if (UPPER[n]) q.setFromUnitVectors(DOWN, wp[n].clone().sub(wp[UPPER[n]]).normalize());
    else if (n !== 'hilt') q.identity();
    m.compose(p, q, sc).premultiply(inv.copy(b.parent.matrixWorld).invert());
    m.decompose(b.position, b.quaternion, b.scale);
    b.updateMatrixWorld(true);
  }
  const rest = {};
  for (const b of list) rest[b.name] = { p: b.position.clone(), q: b.quaternion.clone() };
  const outlines = [];
  for (const sm of skinned) {
    sm.skeleton.calculateInverses();
    const src = sm.material;
    if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
    sm.material = new THREE.MeshToonMaterial({ map: src.map, normalMap: src.normalMap || null, gradientMap: toonGradient() });
    sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
    const ol = new THREE.SkinnedMesh(sm.geometry, outlineSkinMat(0.012));
    ol.bind(sm.skeleton, sm.bindMatrix);
    ol.frustumCulled = false; ol.raycast = () => {};
    sm.parent.add(ol); ol.position.copy(sm.position); ol.quaternion.copy(sm.quaternion); ol.scale.copy(sm.scale);
    outlines.push(ol);
  }
  const hipsY = wp.hips.y;
  // mano derecha: punto de agarre para Hebra
  const handSocket = new THREE.Group();
  handSocket.position.set(0.022, -0.06, 0);
  bones.handR.add(handSocket);
  return { root, bones, rest, outlines, hipsY, handSocket };
}

export function loadGuardian() {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      new GLTFLoader().load(URL, (g) => {
        try { model = prepare(g); resolve(model); } catch (e) { reject(e); }
      }, undefined, reject);
    }).catch((e) => { console.warn('No se pudo cargar el modelo del protagonista:', e); return null; });
  }
  return loading;
}

export function guardianReady() { return !!model; }

/** Sustituye la malla procedural del rig por el modelo con esqueleto. */
export function attachGuardian(rig, { outline = true } = {}) {
  if (!model) return false;
  rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.body);
  const procH = box.max.y - Math.min(0, box.min.y);
  const scale = THREE.MathUtils.clamp(procH / MODEL_H, 0.85, 1.15);
  rig.body.traverse((o) => { if (o.isMesh) o.visible = false; });
  model.root.scale.setScalar(scale);
  model.root.position.set(0, 0, 0);
  rig.body.add(model.root);
  for (const ol of model.outlines) ol.visible = outline;
  rig.guardian = { ...model, scale };
  rig.handR = model.handSocket;
  return true;
}

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _half = new THREE.Quaternion();
function copyRot(bone, src, zExtra = 0) {
  _e.set(src.rotation.x, src.rotation.y, src.rotation.z + zExtra, src.rotation.order);
  bone.quaternion.setFromEuler(_e);
}

/** Copia la pose del humanoide procedural a los huesos del modelo. */
export function driveGuardian(rig) {
  const g = rig.guardian;
  if (!g) return;
  const b = g.bones;
  copyRot(b.hips, rig.hips);
  b.hips.position.copy(g.rest.hips.p);
  b.hips.position.y += (rig.hips.position.y - 0.95) / g.scale;
  // el torso procedural es una sola pieza: se reparte entre columna y pecho
  _q.setFromEuler(rig.torso.rotation);
  _half.identity().slerp(_q, 0.5);
  b.spine.quaternion.copy(_half);
  b.chest.quaternion.copy(_half);
  copyRot(b.head, rig.head);
  b.neck.quaternion.identity();
  copyRot(b.uArmL, rig.shL, SPREAD);
  copyRot(b.uArmR, rig.shR, -SPREAD);
  copyRot(b.lArmL, rig.elL);
  copyRot(b.lArmR, rig.elR);
  copyRot(b.thighL, rig.lgL);
  copyRot(b.thighR, rig.lgR);
  copyRot(b.shinL, rig.knL);
  copyRot(b.shinR, rig.knR);
  // pies: compensan parte del giro de pierna para no clavar la punta
  b.footL.rotation.set(-(rig.lgL.rotation.x + rig.knL.rotation.x) * 0.5, 0, 0);
  b.footR.rotation.set(-(rig.lgR.rotation.x + rig.knR.rotation.x) * 0.5, 0, 0);
}
