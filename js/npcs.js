import * as THREE from 'three';
import { G } from './state.js';
import { buildHumanoid, applyPose, idlePose, locoPose } from './models.js';
import { canvasTexture, dampAngle, rand, choice } from './util.js';

function markerTex(ch, color) {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,20,10,0.85)'; ctx.strokeText(ch, w / 2, h / 2 + 3);
    ctx.fillStyle = color; ctx.fillText(ch, w / 2, h / 2 + 3);
  });
}
let TEX = null;
function markers() {
  if (!TEX) TEX = { offer: markerTex('!', '#ffd84a'), main: markerTex('!', '#7af0ff'), turnin: markerTex('?', '#ffd84a'), shop: markerTex('$', '#9dff8a') };
  return TEX;
}

export class NPC {
  constructor(id, def) {
    this.id = id; this.def = def;
    this.rig = buildHumanoid({ ...def.look, elf: def.look.ears }, { outline: G.quality === 'baja' ? 0 : 0.02 });
    this.group = new THREE.Group();
    this.group.add(this.rig.root);
    this.pos = this.group.position;
    this.home = new THREE.Vector3();
    this.facing = rand(0, 6.28);
    this.target = null; this.wanderT = rand(2, 6);
    this.talking = false; this.t = rand(0, 10);
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markers().offer, depthTest: false, transparent: true }));
    this.marker.scale.setScalar(0.8);
    this.marker.position.y = 2.5 * (def.look.height || 1);
    this.marker.renderOrder = 20;
    this.group.add(this.marker);
  }
  place(scene, x, y, z) { this.pos.set(x, y, z); this.home.copy(this.pos); scene.add(this.group); }

  update(dt) {
    this.t += dt;
    const pl = G.player;
    const d = this.pos.distanceTo(pl.pos);
    this.group.visible = d < 110;
    if (!this.group.visible) return;
    let moving = false;
    if (this.talking || d < 4) {
      this.facing = dampAngle(this.facing, Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z), 5, dt);
    } else if (this.def.wander) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = rand(3, 7); this.target = this.home.clone().add(new THREE.Vector3(rand(-1, 1) * this.def.wander, 0, rand(-1, 1) * this.def.wander)); }
      if (this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
        if (Math.hypot(dx, dz) > 0.5) {
          this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 5, dt);
          this.pos.x += Math.sin(this.facing) * 1.4 * dt; this.pos.z += Math.cos(this.facing) * 1.4 * dt;
          this.pos.y = G.env.heightAt(this.pos.x, this.pos.z);
          moving = true;
        }
      }
    }
    this.group.rotation.y = this.facing;
    if (d < 70) {
      const pose = moving ? locoPose(this.t * 7, 0.5) : idlePose(this.t);
      if (this.talking) { pose.shR = [-0.4 + Math.sin(this.t * 4) * 0.3, 0, -0.4]; pose.elR = [-1, 0, 0]; }
      applyPose(this.rig, pose, 1 - Math.exp(-8 * dt));
    }
    // marcador de misión
    const st = G.quests.npcMarker(this.id);
    const tex = markers();
    if (st) { this.marker.visible = true; this.marker.material.map = tex[st]; this.marker.position.y = 2.4 * (this.def.look.height || 1) + Math.sin(this.t * 3) * 0.1; }
    else if (this.def.shop) { this.marker.visible = d < 25; this.marker.material.map = tex.shop; }
    else this.marker.visible = false;
  }

  talk() {
    const ctx = G.quests.ctx(this);
    const topic = this.def.topics.find((t) => t.when(ctx));
    if (!topic) return;
    let lines = topic.lines;
    if (topic.rand && Math.random() < 0.7) lines = [['N', choice(topic.rand)]];
    this.talking = true;
    G.ui.openDialogue(this, lines, topic.options, () => {
      this.talking = false;
      if (topic.then) topic.then(ctx);
    }, ctx);
  }
}
