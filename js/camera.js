import * as THREE from 'three';
import { G } from './state.js';
import { input } from './input.js';
import { clamp, damp, dampAngle, angleDiff } from './util.js';

// Cámara en tercera persona con órbita, colisión con el terreno y fijado de objetivo
export class ThirdPersonCam {
  constructor(camera) {
    this.cam = camera;
    this.yaw = Math.PI; this.pitch = 0.28;
    this.dist = 6.2; this.targetDist = 6.2;
    this.target = new THREE.Vector3();
    this.curDist = 6.2;
    this.shakeOff = new THREE.Vector3();
  }
  snapBehind(p) { this.yaw = p.facing; this.target.copy(p.pos).setY(p.pos.y + 1.5); }
  update(dt, rawDt) {
    const p = G.player;
    const sens = 0.0026 * G.settings.sens;
    if (!G.ui.blocking()) {
      this.yaw -= input.look.x * sens;
      this.pitch += input.look.y * sens * (G.settings.invertY ? -1 : 1);
      this.targetDist = clamp(this.targetDist + input.wheel * 0.8, 3, 13);
    }
    // fijado de objetivo
    const lt = G.lockTarget;
    if (lt && !lt.dead) {
      const mid = lt.pos;
      const want = Math.atan2(mid.x - p.pos.x, mid.z - p.pos.z);
      this.yaw = dampAngle(this.yaw, want, 6, rawDt);
      const d = Math.hypot(mid.x - p.pos.x, mid.z - p.pos.z);
      this.pitch = damp(this.pitch, clamp(0.35 - d * 0.01 + (lt.boss ? 0.1 : 0), 0.12, 0.5), 3, rawDt);
    } else if (input.lastInputTouch && input.move.y !== 0 && Math.abs(input.look.x) < 0.1 && p.speed > 2 && !p.action) {
      // en móvil, la cámara se recoloca suavemente tras el jugador
      this.yaw = dampAngle(this.yaw, p.facing, 0.6 * Math.abs(input.move.x) + 0.2, rawDt);
    }
    this.pitch = clamp(this.pitch, -0.55, 1.2);
    const bossZoom = lt && lt.boss ? 3 : 0;
    const want = this.targetDist + (p.state === 'glide' ? 2 : 0) + bossZoom;
    const tgt = this.target;
    const ty = p.pos.y + (p.state === 'swim' ? 0.8 : 1.55);
    tgt.x = damp(tgt.x, p.pos.x, 14, rawDt);
    tgt.z = damp(tgt.z, p.pos.z, 14, rawDt);
    tgt.y = damp(tgt.y, ty, p.onGround ? 10 : 6, rawDt);
    const cp = Math.cos(this.pitch);
    const dx = -Math.sin(this.yaw) * cp, dz = -Math.cos(this.yaw) * cp, dy = Math.sin(this.pitch);
    // colisión con el terreno (muestreo a lo largo del rayo)
    let d = want;
    const env = G.env;
    for (let s = 0.8; s <= want; s += 0.6) {
      const x = tgt.x + dx * s, y = tgt.y + dy * s, z = tgt.z + dz * s;
      if (y < env.heightAt(x, z) + 0.5) { d = Math.max(1.2, s - 0.6); break; }
    }
    if (G.inDungeon) {
      // no atravesar paredes: acercar si el punto está fuera de las salas
      d = Math.min(d, want);
    }
    this.curDist = d < this.curDist ? d : damp(this.curDist, d, 3, rawDt);
    const c = this.cam.position;
    c.set(tgt.x + dx * this.curDist, tgt.y + dy * this.curDist, tgt.z + dz * this.curDist);
    const minY = env.heightAt(c.x, c.z) + 0.4;
    if (c.y < minY) c.y = minY;
    // temblor
    if (G.shake > 0) {
      const s = G.shake * 0.35;
      c.x += (Math.random() - 0.5) * s; c.y += (Math.random() - 0.5) * s; c.z += (Math.random() - 0.5) * s;
      G.shake = Math.max(0, G.shake - rawDt * 2.5);
    }
    if (lt && !lt.dead) {
      const look = new THREE.Vector3().copy(tgt).lerp(new THREE.Vector3(lt.pos.x, lt.pos.y + lt.height * 0.5, lt.pos.z), 0.25);
      this.cam.lookAt(look);
    } else this.cam.lookAt(tgt);
    // FOV dinámico al esprintar / Tiempo Élfico
    const fov = 60 + (p.speed > 9 ? 6 : 0) + (G.slowmo > 0 ? -4 : 0);
    this.cam.fov = damp(this.cam.fov, fov, 4, rawDt);
    this.cam.updateProjectionMatrix();
  }
}
