import * as THREE from 'three';
import { G } from './state.js';
import { audio } from './audio.js';
import { buildHumanoid, buildWolf, buildWisp, buildSerpent, applyPose, locoPose, idlePose } from './models.js';
import { LOOT, randomGear } from './data/items.js';
import { clamp, rand, randInt, choice, damp, dampAngle, angleDiff, GEO } from './util.js';
import { glowTexture } from './world/structures.js';

export const TYPES = {
  goblin: { name: 'Trasgo', hp: 40, dmg: 8, speed: 4.3, radius: 0.5, height: 1.5, xp: 20, gold: [2, 7], ai: 'melee', range: 1.9, windup: 0.55, cd: 1.3, poise: 0, aggro: 20,
    build: () => buildHumanoid({ skin: choice([0xd0503a, 0xc0443a, 0x5a7ac8]), robe: 0x6b4a2a, height: 0.82, club: true, nose: 0x9a3a2a, helm: Math.random() < 0.3 ? 0x8a8a90 : null }, { kind: 'goblin', outline: ol() }) },
  archer: { name: 'Trasgo arquero', hp: 32, dmg: 7, speed: 3.8, radius: 0.5, height: 1.5, xp: 22, gold: [3, 8], ai: 'ranged', range: 24, keep: 13, windup: 0.9, cd: 2.2, proj: 'arrow', aggro: 26,
    build: () => buildHumanoid({ skin: 0x5a9a48, robe: 0x4a3a2a, height: 0.8, archerBow: true, nose: 0x3a6a2a }, { kind: 'goblin', outline: ol() }) },
  wolf: { name: 'Lobo sombrío', hp: 34, dmg: 7, speed: 7.8, radius: 0.7, height: 1.1, xp: 22, gold: [0, 3], ai: 'lunge', range: 4, windup: 0.45, cd: 1.6, aggro: 24, quad: true,
    build: () => buildWolf(choice([0x3d3a4a, 0x4a4050, 0x5a5a66]), ol()) },
  brute: { name: 'Ogro', hp: 190, dmg: 22, speed: 3.2, radius: 1.1, height: 3.3, xp: 90, gold: [15, 30], ai: 'smash', range: 3.3, windup: 1.05, cd: 2.2, heavy: true, poise: 60, aggro: 20, aoe: 3.4,
    build: () => buildHumanoid({ skin: choice([0x4a6aa8, 0x7a5aa8, 0x3a8a6a]), robe: 0x5a3a22, height: 1.9, bigclub: true, nose: 0x3a3a6a, horn: 0xd8c8a0, helm: Math.random() < 0.5 ? 0x7a6a5a : null }, { kind: 'brute', outline: ol(0.03) }) },
  golem: { name: 'Gólem de piedra', hp: 300, dmg: 28, speed: 2.5, radius: 1.3, height: 3.6, xp: 140, gold: [20, 45], ai: 'slam', range: 3.8, windup: 1.25, cd: 2.6, heavy: true, poise: 110, aggro: 18, aoe: 4.6,
    build: () => buildHumanoid({ robe: 0x8a857a, pants: 0x6e6a62, glow: 0x7af0ff, height: 1.7, moss: 0x6a9a3a }, { kind: 'golem', outline: ol(0.03) }) },
  wisp: { name: 'Espectro', hp: 46, dmg: 10, speed: 3.6, radius: 0.6, height: 1.8, xp: 35, gold: [4, 10], ai: 'caster', range: 20, keep: 9, windup: 0.8, cd: 2.4, proj: 'orb', aggro: 24, float: true,
    build: () => buildWisp(0x6a4ab0, 0xd0a0ff, ol()) },
  // ---------- jefes ----------
  boss_treant: { name: 'Guardián Raíz-Antigua', boss: true, hp: 800, dmg: 21, speed: 3.2, radius: 2.2, height: 6, xp: 900, gold: [300, 400], ai: 'boss', heavy: true, poise: 260,
    attacks: ['swipe', 'slam', 'eruption', 'summon'], minion: 'wolf', color: 'green',
    build: () => buildHumanoid({ robe: 0x6a5238, pants: 0x4a3a28, glow: 0x9aff6a, height: 3.4, moss: 0x5aa83a, crown: 0x7ac048 }, { kind: 'golem', outline: ol(0.03) }) },
  boss_serpent: { name: 'Nhal, Serpiente Abisal', boss: true, hp: 950, dmg: 23, speed: 7, radius: 1.8, height: 3, xp: 1200, gold: [400, 550], ai: 'serpent', heavy: true, poise: 300,
    build: () => buildSerpent(0x2a7a8a, 0xd8e0a0, ol(0.035)) },
  boss_golem: { name: 'Hrimtar, Gólem Glacial', boss: true, hp: 1250, dmg: 27, speed: 3, radius: 2.4, height: 6.5, xp: 1600, gold: [500, 700], ai: 'boss', heavy: true, poise: 380,
    attacks: ['slam', 'charge', 'eruption', 'orbs', 'swipe'], minion: 'wisp', color: 'ice',
    build: () => buildHumanoid({ robe: 0xa8d8f0, pants: 0x7ab0d8, glow: 0x3af0ff, height: 3.7, crown: 0xe8f8ff }, { kind: 'golem', outline: ol(0.03) }) },
  boss_herald: { name: 'Heraldo del Vacío', boss: true, hp: 1900, dmg: 32, speed: 5, radius: 1.4, height: 5, xp: 3500, gold: [1200, 1500], ai: 'boss', heavy: true, poise: 450, float: true,
    attacks: ['swipe', 'charge', 'orbs', 'eruption', 'summon', 'swipe'], minion: 'wisp', color: 'void',
    build: () => buildHumanoid({ robe: 0x1a1024, pants: 0x2a1a38, glow: 0xc050ff, height: 2.4, scythe: true }, { kind: 'herald', outline: ol(0.03) }) },
  boss_ogre: { name: 'Campeón Gruk', boss: true, hp: 900, dmg: 25, speed: 3.8, radius: 1.6, height: 4.5, xp: 1000, gold: [350, 500], ai: 'boss', heavy: true, poise: 280,
    attacks: ['swipe', 'slam', 'charge', 'summon'], minion: 'goblin', color: 'fire',
    build: () => buildHumanoid({ skin: 0xa83a3a, robe: 0x2a2a2a, height: 2.6, bigclub: true, nose: 0x6a2a2a, horn: 0xffd060, helm: 0xc0a040 }, { kind: 'brute', outline: ol(0.03) }) },
};
function ol(t = 0.022) { return G.quality === 'baja' ? 0 : t; }

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const BOSS_COLORS = { green: 0x7aff5a, ice: 0x6ae8ff, void: 0xc050ff, fire: 0xff7a3a };

export class Enemy {
  constructor(type, level, pos, opts = {}) {
    const T = TYPES[type];
    this.type = type; this.T = T; this.level = level;
    const diff = opts.diff || { hp: 1, dmg: 1 };
    const lm = 1 + 0.28 * (level - 1);
    this.maxHp = Math.round(T.hp * lm * diff.hp);
    this.hp = this.maxHp;
    this.dmg = T.dmg * (1 + 0.15 * (level - 1)) * diff.dmg;
    this.xp = Math.round(T.xp * (1 + 0.25 * (level - 1)));
    this.name = T.name; this.boss = !!T.boss; this.heavy = !!T.heavy;
    this.radius = T.radius; this.height = T.height;
    this.speed = T.speed;
    this.rig = T.build();
    this.mesh = this.rig.root;
    this.mesh.position.copy(pos);
    this.pos = this.mesh.position;
    this.home = pos.clone();
    this.vel = new THREE.Vector3();
    this.facing = rand(0, Math.PI * 2);
    this.state = 'idle'; this.t = 0; this.cd = rand(0.5, 1.5);
    this.stun = 0; this.bind = 0; this.juggle = 0; this.flash = 0;
    this.poise = 0; this.poiseT = 0;
    this.wanderT = rand(1, 4); this.wanderTarget = pos.clone();
    this.onGround = true; this.dead = false; this.active = true; this.aggro = false;
    this.phase = rand(0, 10);
    this.camp = opts.camp || null;
    this.dungeon = opts.dungeon || false;
    this.alertT = 0;
    this.burn = 0; this.burnTick = 0; this.slow = 0;
    this.lastHitT = -10;
    this.summoned = 0;
    this.patternI = 0;
    if (this.rig.mat) { this.rig.mat.emissive = new THREE.Color(0); }
    if (type === 'boss_serpent') this.initSerpent();
    if (this.boss) { this.aggroRange = 60; } else this.aggroRange = T.aggro || 20;
    this.bindFx = null;
  }

  addTo(scene) { scene.add(this.mesh); }
  remove() { this.mesh.parent?.remove(this.mesh); if (this.bindFx) this.bindFx.parent?.remove(this.bindFx); }

  // ---------- serpiente ----------
  initSerpent() {
    this.trail = [];
    for (let i = 0; i < 80; i++) this.trail.push(this.pos.clone());
    this.submerged = 0;
    this.mesh.position.set(0, 0, 0);
    this.pos = new THREE.Vector3().copy(this.home);
    this.rig.head.position.copy(this.pos);
  }
  hitPoints() {
    if (this.type !== 'boss_serpent') return [this.pos];
    if (this.submerged > 0.5) return [];
    return [this.pos, ...this.rig.segs.filter((s, i) => i % 3 === 0 && s.position.y > 0).map((s) => s.position)];
  }

  // ---------- recibir daño ----------
  takeHit(dmg, { dir, kb = 0, launch = 0, stun = 0.2, crit = false, bind = 0, air = false } = {}) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.1;
    this.lastHitT = G.time;
    if (!this.aggro) this.setAggro();
    if (this.hp <= 0) { this.die(); return; }
    // equilibrio (poise)
    let stagger = !this.heavy;
    if (this.heavy) {
      this.poise += dmg; this.poiseT = 3;
      const maxP = this.T.poise * (1 + 0.2 * (this.level - 1));
      if (this.poise >= maxP) {
        this.poise = 0; stagger = true;
        stun = this.boss ? 2.8 : 2;
        G.fx.damageNumber(_v.copy(this.pos).setY(this.pos.y + this.height), 0, { text: '¡Aturdido!', color: '#ffd84a' });
        audio.play('block');
        this.state = 'stunned'; this.t = 0;
      }
    }
    if (bind) {
      this.bind = this.boss ? bind * 0.4 : bind;
      this.showBind(true);
    }
    if (stagger) {
      if (this.state === 'windup' || this.state === 'attack') this.state = 'hurt';
      if (this.state !== 'stunned') this.state = 'hurt';
      this.stun = Math.max(this.stun, stun);
      if (dir && kb) { this.vel.x = dir.x * kb * 1.5; this.vel.z = dir.z * kb * 1.5; }
      if (launch && (!this.heavy || this.state === 'stunned') && this.type !== 'boss_serpent') {
        this.vel.y = launch > 0 ? launch : launch;
        if (launch > 0) { this.onGround = false; this.juggle = 0.5; }
      }
    } else if (dir && kb) { this.vel.x = dir.x * kb * 0.25; this.vel.z = dir.z * kb * 0.25; }
  }
  airHold() { if (!this.onGround) { this.vel.y = Math.max(this.vel.y, 2.6); this.juggle = 0.45; } }
  pullTo(p) { if (this.heavy) return; this.pullTarget = p.clone(); this.pullT = 0.22; this.state = 'hurt'; this.stun = 0.9; }
  showBind(on) {
    if (on && !this.bindFx) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(this.radius + 0.3, 0.07, 6, 20), new THREE.MeshBasicMaterial({ color: 0x40ffc8 }));
      g.rotation.x = Math.PI / 2;
      this.bindFx = g;
    }
    if (on) { this.mesh.parent?.add(this.bindFx); } else if (this.bindFx) this.bindFx.parent?.remove(this.bindFx);
  }
  setAggro() {
    if (this.aggro) return;
    this.aggro = true; this.state = 'alert'; this.t = 0; this.alertT = 0.6;
    if (!this.boss) audio.play('alert');
    if (this.camp) for (const e of G.enemies) if (e.camp === this.camp && !e.aggro && !e.dead) { e.aggro = true; e.state = 'alert'; e.t = 0; e.alertT = rand(0.3, 0.8); }
  }
  die() {
    this.dead = true; this.hp = 0; this.state = 'dead'; this.t = 0;
    this.showBind(false);
    const p = this.pos.clone();
    G.fx.deathPuff(p, this.boss ? [1, 0.8, 0.4] : [0.55, 0.3, 0.75]);
    audio.play('enemyDie');
    if (G.lockTarget === this) G.lockTarget = null;
    const pl = G.player;
    const xp = Math.round(this.xp * G.style.xpMult());
    pl.addXp(xp);
    const gold = randInt(this.T.gold[0], this.T.gold[1]) * Math.max(1, Math.round(this.level * 0.6));
    pl.gold += gold;
    G.fx.damageNumber(p.clone().setY(p.y + this.height + 0.5), 0, { text: `+${xp} EXP`, color: '#9fe8ff' });
    if (gold) audio.play('coin');
    const baseType = this.type.startsWith('boss') ? null : this.type;
    if (baseType && LOOT[baseType]) for (const [id, ch] of LOOT[baseType]) if (Math.random() < ch) pl.addItem(id, 1);
    if (!this.boss && Math.random() < 0.04 + this.level * 0.003) pl.addGear(randomGear(this.level, 0));
    G.style.add(this.boss ? 400 : 60, 'kill');
    G.quests.onKill(baseType || this.type);
    if (this.type === 'brute' && !G.flags.bruteTip) { G.flags.bruteTip = true; }
    if (this.onDeath) this.onDeath(this);
  }

  // ---------- actualización ----------
  update(dt) {
    const pl = G.player, env = G.env;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.poiseT -= dt; if (this.poiseT <= 0) this.poise = Math.max(0, this.poise - dt * 30);
    if (this.slow > 0) { this.slow -= dt; dt *= 0.5; }
    if (this.burn > 0) {
      this.burn -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) { this.burnTick = 0.5; this.hp -= this.burnDmg; G.fx.damageNumber(_v.copy(this.pos).setY(this.pos.y + this.height), this.burnDmg, { color: '#ff8a3a' }); G.fx.particles.emit(this.pos.x, this.pos.y + 1, this.pos.z, { count: 6, color: [1, 0.5, 0.1], speed: 1, up: 2, life: 0.5, size: 0.5, grav: 2 }); if (this.hp <= 0) this.die(); }
    }
    if (this.dead) {
      if (this.type === 'boss_serpent') { for (const s of this.rig.segs) s.position.y -= dt * 3; this.rig.head.position.y -= dt * 3; }
      else { this.mesh.scale.multiplyScalar(Math.exp(-3 * dt)); this.mesh.position.y += dt * 0.5; }
      return this.t < 1.2;
    }
    if (this.type === 'boss_serpent') { this.updateSerpent(dt, pl); return true; }
    const toP = _v.subVectors(pl.pos, this.pos); toP.y = 0;
    const dist = toP.length();
    const T = this.T;
    // percepción
    if (!this.aggro && !pl.dead && dist < this.aggroRange && Math.abs(pl.pos.y - this.pos.y) < 12) this.setAggro();
    if (this.aggro && !this.boss && !this.dungeon && (dist > 60 || this.pos.distanceTo(this.home) > 70 || pl.dead)) {
      this.aggro = false; this.state = 'return'; this.hp = this.maxHp;
    }
    // atadura
    if (this.bind > 0) {
      this.bind -= dt;
      if (this.bindFx) { this.bindFx.position.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z); this.bindFx.rotation.z += dt * 3; }
      if (this.bind <= 0) this.showBind(false);
    }
    const canAct = this.bind <= 0 && this.stun <= 0 && this.onGround;
    let moveSpeed = 0;
    // tirón
    if (this.pullT > 0) {
      this.pullT -= dt;
      this.pos.lerp(_v2.copy(this.pullTarget).setY(this.pos.y), 1 - Math.exp(-22 * dt));
    }
    switch (this.state) {
      case 'idle': {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = rand(2, 5);
          this.wanderTarget.set(this.home.x + rand(-8, 8), 0, this.home.z + rand(-8, 8));
        }
        _v2.subVectors(this.wanderTarget, this.pos).setY(0);
        if (_v2.length() > 1) { moveSpeed = this.speed * 0.3; this.facing = dampAngle(this.facing, Math.atan2(_v2.x, _v2.z), 4, dt); }
        break;
      }
      case 'return': {
        _v2.subVectors(this.home, this.pos).setY(0);
        if (_v2.length() < 2) this.state = 'idle';
        else { moveSpeed = this.speed; this.facing = dampAngle(this.facing, Math.atan2(_v2.x, _v2.z), 8, dt); }
        break;
      }
      case 'alert':
        this.facing = dampAngle(this.facing, Math.atan2(toP.x, toP.z), 10, dt);
        this.alertT -= dt;
        if (this.alertT <= 0) this.state = 'chase';
        break;
      case 'chase': {
        if (!canAct) break;
        this.cd -= dt;
        this.facing = dampAngle(this.facing, Math.atan2(toP.x, toP.z), 8, dt);
        if (T.ai === 'ranged' || T.ai === 'caster') {
          if (dist > T.range) moveSpeed = this.speed;
          else if (dist < T.keep) { moveSpeed = -this.speed * 0.8; }
          else { this.strafe = this.strafe || (Math.random() < 0.5 ? 1 : -1); this.strafeMove(dt, toP, this.strafe); }
          if (this.cd <= 0 && dist < T.range) this.beginWindup();
        } else if (this.boss) {
          if (this.cd <= 0) this.bossPick(dist);
          else if (dist > 4) moveSpeed = this.speed;
          else { this.strafe = this.strafe || 1; this.strafeMove(dt, toP, this.strafe * 0.5); }
        } else {
          // mantener cierta distancia mientras recarga, rodeando al jugador
          const crowd = G.enemies.filter((e) => e !== this && !e.dead && e.aggro && e.state === 'chase' && e.pos.distanceTo(pl.pos) < dist).length;
          if (dist > T.range * 0.9 + crowd * 1.2) moveSpeed = this.speed;
          else if (this.cd <= 0 && crowd < 2) this.beginWindup();
          else { this.strafe = this.strafe || (Math.random() < 0.5 ? 1 : -1); this.strafeMove(dt, toP, this.strafe); }
        }
        break;
      }
      case 'windup': {
        this.facing = dampAngle(this.facing, Math.atan2(toP.x, toP.z), this.heavy ? 3 : 7, dt);
        if (this.t >= this.windupDur) { this.state = 'attack'; this.t = 0; this.attackStart(dist, toP); }
        break;
      }
      case 'attack': {
        if (T.ai === 'lunge' && this.t < 0.25) { this.pos.x += Math.sin(this.facing) * 14 * dt; this.pos.z += Math.cos(this.facing) * 14 * dt; this.checkMelee(1.6, 90); }
        if (this.t > (this.attackDur || 0.35)) { this.state = 'recover'; this.t = 0; }
        break;
      }
      case 'charging': {
        this.pos.x += this.chargeDir.x * 20 * dt; this.pos.z += this.chargeDir.z * 20 * dt;
        this.checkMelee(this.radius + 1.2, 360, 1.2);
        G.fx.dust(this.pos, 1);
        if (this.t > 0.7) { this.state = 'recover'; this.t = 0; }
        break;
      }
      case 'recover':
        if (this.t > (this.boss ? 0.8 : this.heavy ? 1.0 : 0.5)) { this.state = 'chase'; this.cd = this.boss ? (this.cdNext ?? 1.5) : this.T.cd ? rand(this.T.cd * 0.7, this.T.cd * 1.3) : rand(1.2, 2.2); }
        break;
      case 'hurt':
        this.stun -= dt;
        if (this.stun <= 0 && this.onGround) { this.state = 'chase'; this.cd = Math.max(this.cd, 0.4); }
        break;
      case 'stunned':
        this.stun -= dt;
        if (this.stun <= 0) { this.state = 'chase'; this.cd = 0.8; }
        break;
    }
    if (this.state !== 'hurt' && this.state !== 'stunned') this.stun = Math.max(0, this.stun - dt);
    // movimiento
    if (moveSpeed && canAct) {
      this.pos.x += Math.sin(this.facing) * moveSpeed * dt;
      this.pos.z += Math.cos(this.facing) * moveSpeed * dt;
    }
    this.speedNow = Math.abs(moveSpeed);
    // física
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const fr = Math.exp(-(this.onGround ? 7 : 1) * dt);
    this.vel.x *= fr; this.vel.z *= fr;
    const ground = env.heightAt(this.pos.x, this.pos.z);
    const floatH = T.float ? 0.4 + Math.sin(this.phase + G.time * 2) * 0.2 : 0;
    if (!this.onGround || this.vel.y !== 0) {
      this.juggle -= dt;
      this.vel.y -= 24 * (this.juggle > 0 ? 0.3 : 1) * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= ground + floatH) {
        if (this.vel.y < -12) { G.fx.dust(this.pos, 10); G.shake = Math.max(G.shake, 0.2); audio.play('land'); }
        this.pos.y = ground + floatH; this.vel.y = 0; this.onGround = true;
      } else this.onGround = false;
    } else {
      this.pos.y = damp(this.pos.y, ground + floatH, 12, dt);
    }
    // agua: los enemigos no se meten en el agua profunda
    if (env.waterDepth && env.waterLevel - ground > 1.0 && !T.float) { this.pos.x -= Math.sin(this.facing) * moveSpeed * dt * 2; this.pos.z -= Math.cos(this.facing) * moveSpeed * dt * 2; }
    env.collide(this.pos, this.radius * 0.8, this.height);
    env.clamp(this.pos);
    this.animate(dt);
    return true;
  }
  strafeMove(dt, toP, dir) {
    const a = Math.atan2(toP.x, toP.z) + (Math.PI / 2) * dir;
    this.pos.x += Math.sin(a) * this.speed * 0.45 * dt; this.pos.z += Math.cos(a) * this.speed * 0.45 * dt;
    if (Math.random() < dt * 0.5) this.strafe = -this.strafe;
  }
  beginWindup() {
    this.state = 'windup'; this.t = 0;
    this.windupDur = this.T.windup * (G.slowmo > 0 ? 1 : 1);
    if (this.T.aoe) {
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      this.aoeCenter = _v2.set(this.pos.x + fx * 2, this.pos.y, this.pos.z + fz * 2).clone();
      G.fx.telegraph(this.aoeCenter, this.T.aoe, this.windupDur);
    }
  }
  attackStart(dist, toP) {
    const T = this.T;
    this.attackDur = 0.35;
    if (T.ai === 'melee') { this.checkMelee(T.range + 0.4, 100); audio.play('swing', { pitch: 0.8 }); }
    else if (T.ai === 'lunge') { audio.play('dodge', { pitch: 0.7 }); this.attackDur = 0.4; }
    else if (T.ai === 'smash' || T.ai === 'slam') {
      this.aoeHit(this.aoeCenter, T.aoe, 1);
      G.fx.ring(this.aoeCenter, T.aoe * 1.2, [1, 0.8, 0.5], 0.4); G.fx.dust(this.aoeCenter, 16);
      audio.play('boom'); G.shake = Math.max(G.shake, 0.5);
      this.attackDur = 0.5;
    } else if (T.ai === 'ranged' || T.ai === 'caster') {
      const from = _v2.copy(this.pos).setY(this.pos.y + this.height * 0.75);
      const target = G.player.pos.clone().setY(G.player.pos.y + 1);
      // leve predicción
      target.addScaledVector(G.player.vel, 0.25);
      if (T.proj === 'arrow') { spawnProjectile('arrow', from, target, this.dmg, 30); audio.play('arrow'); }
      else {
        spawnProjectile('orb', from, target, this.dmg, 13);
        if (this.level > 5) { spawnProjectile('orb', from, target.clone().add(new THREE.Vector3(3, 0, 0)), this.dmg, 12); spawnProjectile('orb', from, target.clone().add(new THREE.Vector3(-3, 0, 0)), this.dmg, 12); }
        audio.play('magic');
      }
    }
  }
  checkMelee(range, arcDeg, mult = 1) {
    if (this.hitDone === this.t0id) return;
    const pl = G.player;
    const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > range + pl.radius || Math.abs(pl.pos.y - this.pos.y) > 2.5) return;
    if (arcDeg < 360 && Math.abs(angleDiff(this.facing, Math.atan2(dx, dz))) > (arcDeg * Math.PI) / 360) return;
    if (pl.takeDamage(this.dmg * mult, this.pos, { kb: this.heavy ? 10 : 5 }) || pl.iframes > 0) this.hitDone = this.t0id;
  }
  aoeHit(c, r, mult = 1) {
    const pl = G.player;
    const d = Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z);
    if (d < r + pl.radius && Math.abs(pl.pos.y - c.y) < 3) pl.takeDamage(this.dmg * mult, c, { kb: 12 });
  }

  // ---------- IA de jefe ----------
  bossPick(dist) {
    const atks = this.T.attacks;
    let a = atks[this.patternI % atks.length];
    this.patternI++;
    const hpPct = this.hp / this.maxHp;
    if (a === 'summon') {
      if ((hpPct < 0.66 && this.summoned < 1) || (hpPct < 0.33 && this.summoned < 2)) { this.summoned++; }
      else a = 'swipe';
    }
    if (a === 'swipe' && dist > 7) a = choice(['charge', 'eruption', 'orbs'].filter((x) => atks.includes(x))) || 'slam';
    this.bossAtk = a;
    this.state = 'windup'; this.t = 0;
    const enraged = hpPct < 0.5;
    const col = BOSS_COLORS[this.T.color] || 0xff3a2a;
    switch (a) {
      case 'swipe': this.windupDur = enraged ? 0.55 : 0.75; break;
      case 'slam': this.windupDur = 1.1; this.aoeCenter = this.pos.clone(); G.fx.telegraph(this.aoeCenter, 7, this.windupDur); break;
      case 'charge': this.windupDur = 0.8; break;
      case 'eruption': {
        this.windupDur = 1.2; this.erupts = [];
        const pp = G.player.pos;
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const c = i === 0 ? pp.clone() : pp.clone().add(new THREE.Vector3(rand(-9, 9), 0, rand(-9, 9)));
          c.y = G.env.heightAt(c.x, c.z);
          this.erupts.push(c);
          G.fx.telegraph(c, 3, this.windupDur, col);
        }
        break;
      }
      case 'orbs': this.windupDur = 0.9; break;
      case 'summon': this.windupDur = 1.0; break;
    }
    this.cdNext = enraged ? rand(0.6, 1.2) : rand(1.2, 2);
  }
  bossExecute() {
    const a = this.bossAtk;
    this.attackDur = 0.5;
    const col = BOSS_COLORS[this.T.color] || 0xff3a2a;
    const c3 = new THREE.Color(col);
    const colArr = [c3.r, c3.g, c3.b];
    switch (a) {
      case 'swipe': this.t0id = Math.random(); this.checkMelee(this.radius + 3.5, 150, 1); audio.play('heavy', { pitch: 0.7 }); G.fx.ring(this.pos, this.radius + 3.5, colArr, 0.3); break;
      case 'slam': this.aoeHit(this.aoeCenter, 7, 1.3); G.fx.ring(this.aoeCenter, 8.5, colArr, 0.5); G.fx.dust(this.aoeCenter, 30); audio.play('boom'); G.shake = 0.8; break;
      case 'charge': {
        this.chargeDir = _v2.subVectors(G.player.pos, this.pos).setY(0).normalize().clone();
        this.facing = Math.atan2(this.chargeDir.x, this.chargeDir.z);
        this.state = 'charging'; this.t = 0; this.t0id = Math.random(); audio.play('dodge', { pitch: 0.5 });
        break;
      }
      case 'eruption':
        for (const c of this.erupts) { this.aoeHit(c, 3, 1.1); G.fx.particles.emit(c.x, c.y, c.z, { count: 25, color: [colArr, [1, 1, 1]], speed: 3, up: 12, life: 0.8, size: 0.7, grav: -20 }); G.fx.ring(c, 3.5, colArr, 0.35); }
        audio.play('boom'); G.shake = 0.5;
        break;
      case 'orbs': {
        const from = this.pos.clone().setY(this.pos.y + this.height * 0.7);
        const n = this.hp / this.maxHp < 0.5 ? 14 : 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + G.time;
          const tgt = from.clone().add(new THREE.Vector3(Math.cos(ang) * 10, -this.height * 0.5, Math.sin(ang) * 10));
          spawnProjectile('orb', from, tgt, this.dmg * 0.7, 9, col);
        }
        spawnProjectile('orb', from, G.player.pos.clone().setY(G.player.pos.y + 1), this.dmg * 0.8, 14, col);
        audio.play('magic');
        break;
      }
      case 'summon': {
        const n = 3;
        for (let i = 0; i < n; i++) {
          const p = this.pos.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(-8, 8)));
          p.y = G.env.heightAt(p.x, p.z);
          const e = spawnEnemy(this.T.minion, Math.max(1, this.level - 2), p, { dungeon: true, diff: this.diff });
          e.setAggro();
          G.fx.deathPuff(p, colArr);
        }
        audio.play('portal');
        break;
      }
    }
  }

  updateSerpent(dt, pl) {
    const head = this.rig.head;
    const env = G.env;
    const toP = _v.subVectors(pl.pos, this.pos); toP.y = 0;
    const dist = toP.length();
    if (!this.aggro && dist < 50) this.setAggro();
    this.cd -= dt;
    const canAct = this.bind <= 0 && this.state !== 'stunned';
    if (this.bind > 0) { this.bind -= dt; if (this.bind <= 0) this.showBind(false); }
    if (this.state === 'stunned') { this.stun -= dt; if (this.stun <= 0) { this.state = 'chase'; this.cd = 1; } }
    let baseY = env.heightAt(this.pos.x, this.pos.z) + 2.5;
    switch (this.state) {
      case 'idle': case 'alert': if (this.aggro) this.state = 'chase'; break;
      case 'hurt': this.state = 'chase'; break;
      case 'chase': {
        if (!canAct) break;
        const ang = Math.atan2(toP.x, toP.z) + Math.sin(G.time * 1.3) * 0.7;
        this.facing = dampAngle(this.facing, ang, 2.5, dt);
        const sp = dist > 9 ? this.speed : this.speed * 0.4;
        this.pos.x += Math.sin(this.facing) * sp * dt; this.pos.z += Math.cos(this.facing) * sp * dt;
        if (this.cd <= 0) {
          const r = Math.random();
          const enraged = this.hp / this.maxHp < 0.5;
          if (dist < 12 && r < 0.45) { this.state = 'bite_w'; this.t = 0; this.windupDur = enraged ? 0.5 : 0.7; }
          else if (r < 0.75) { this.state = 'dive'; this.t = 0; }
          else { this.state = 'spit_w'; this.t = 0; }
        }
        break;
      }
      case 'bite_w':
        this.facing = dampAngle(this.facing, Math.atan2(toP.x, toP.z), 6, dt);
        baseY += 1.5;
        if (this.t > this.windupDur) { this.state = 'bite'; this.t = 0; this.t0id = Math.random(); audio.play('heavy', { pitch: 0.6 }); }
        break;
      case 'bite':
        this.pos.x += Math.sin(this.facing) * 22 * dt; this.pos.z += Math.cos(this.facing) * 22 * dt;
        baseY -= 1;
        this.checkMelee(2.8, 360, 1.1);
        if (this.t > 0.45) { this.state = 'chase'; this.cd = rand(1, 2); }
        break;
      case 'dive':
        this.submerged = Math.min(1, this.submerged + dt * 1.5);
        if (this.submerged >= 1 && this.t > 0.8) {
          this.state = 'under'; this.t = 0;
          this.emerge = pl.pos.clone(); this.emerge.y = env.heightAt(this.emerge.x, this.emerge.z);
          G.fx.telegraph(this.emerge, 4.5, 1.1, 0x3af0ff);
        }
        break;
      case 'under':
        if (this.t > 1.1) {
          this.pos.set(this.emerge.x, this.pos.y, this.emerge.z);
          for (const p of this.trail) p.set(this.emerge.x, this.emerge.y - 6, this.emerge.z);
          this.submerged = 0;
          const c = this.emerge;
          const d = Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z);
          if (d < 4.5 + pl.radius) pl.takeDamage(this.dmg * 1.3, c, { kb: 14 });
          G.fx.particles.emit(c.x, c.y, c.z, { count: 50, color: [[0.6, 0.95, 1], [1, 1, 1]], speed: 4, up: 14, life: 1, size: 0.8, grav: -22 });
          G.fx.ring(c, 6, [0.5, 0.9, 1], 0.5);
          audio.play('splash'); audio.play('boom'); G.shake = 0.7;
          this.state = 'rise'; this.t = 0;
        }
        break;
      case 'rise': baseY += 3 * (1 - this.t); if (this.t > 1) { this.state = 'chase'; this.cd = rand(0.8, 1.6); } break;
      case 'spit_w':
        this.facing = dampAngle(this.facing, Math.atan2(toP.x, toP.z), 6, dt);
        baseY += 2;
        if (this.t > 0.7) {
          const from = head.position.clone();
          for (let i = -2; i <= 2; i++) {
            const tgt = pl.pos.clone().setY(pl.pos.y + 1);
            const side = new THREE.Vector3(Math.cos(this.facing), 0, -Math.sin(this.facing)).multiplyScalar(i * 3);
            spawnProjectile('orb', from, tgt.add(side), this.dmg * 0.7, 15, 0x3af0ff);
          }
          audio.play('magic');
          this.state = 'chase'; this.cd = rand(1.2, 2);
        }
        break;
    }
    env.clamp(this.pos);
    env.collide(this.pos, 1.5, 3);
    // cuerpo
    const sub = this.submerged;
    this.pos.y = damp(this.pos.y, baseY - sub * 9, 6, dt);
    head.position.copy(this.pos);
    head.rotation.set(-0.1 + (this.state === 'bite_w' ? -0.5 : 0), this.facing, 0);
    this.trail.unshift(this.trail.pop().copy(this.pos));
    const segs = this.rig.segs;
    for (let i = 0; i < segs.length; i++) {
      const p = this.trail[Math.min(this.trail.length - 1, 5 + i * 5)];
      segs[i].position.set(p.x, p.y - 0.3 - Math.max(0, i - 7) * 0.5 - sub * 2, p.z);
    }
    if (this.rig.mat) {
      const f = this.flash > 0 ? 0.9 : this.state === 'bite_w' || this.state === 'spit_w' ? 0.35 + Math.sin(G.time * 30) * 0.25 : 0;
      this.rig.mat.emissive.setRGB(f, this.flash > 0 ? f : f * 0.2, this.flash > 0 ? f : f * 0.1);
    }
    this.flash = Math.max(0, this.flash - dt);
  }

  animate(dt) {
    const r = this.rig, T = this.T;
    this.phase += dt * (this.speedNow || 0) * 1.3;
    // tinte: blanco al recibir golpe, rojo al cargar ataque
    if (r.mat) {
      let e = 0, eg = 0, eb = 0;
      if (this.flash > 0) { e = eg = eb = 0.9; }
      else if (this.state === 'windup') { const k = 0.35 + Math.sin(G.time * 28) * 0.25; e = k; eg = k * 0.15; eb = k * 0.1; }
      else if (this.state === 'stunned') { e = 0.3; eg = 0.3; eb = 0.05; }
      if (this.bind > 0) { eg = Math.max(eg, 0.25); eb = Math.max(eb, 0.2); }
      r.mat.emissive.setRGB(e, eg, eb);
    }
    this.mesh.rotation.y = this.facing;
    if (T.quad) {
      const s = Math.sin(this.phase * 1.8), run = Math.min(1, (this.speedNow || 0) / 5);
      r.legs[0].rotation.x = s * 0.8 * run; r.legs[3].rotation.x = s * 0.8 * run;
      r.legs[1].rotation.x = -s * 0.8 * run; r.legs[2].rotation.x = -s * 0.8 * run;
      r.body.position.y = 0.75 + Math.abs(s) * 0.08 * run;
      r.tail.rotation.y = Math.sin(G.time * 6) * 0.4;
      r.head.rotation.x = this.state === 'windup' ? 0.3 : this.state === 'attack' ? -0.4 : 0;
      r.body.rotation.x = this.state === 'windup' ? 0.15 : 0;
      r.body.rotation.z = !this.onGround ? G.time * 8 : 0;
      return;
    }
    if (T.float && !r.hips) {
      r.body.position.y = 1.4 + Math.sin(G.time * 2 + this.phase) * 0.15;
      r.orb.position.y = this.state === 'windup' ? 0.6 : 0;
      r.orb.scale.setScalar(this.state === 'windup' ? 0.22 + this.t * 0.3 : 0.22);
      r.body.rotation.z = !this.onGround ? G.time * 6 : 0;
      return;
    }
    let pose;
    const sp = this.speedNow || 0;
    if (this.state === 'windup') {
      const f = Math.min(1, this.t / (this.windupDur || 0.5));
      pose = T.ai === 'ranged' ? { torso: [0, -0.3, 0], shL: [-1.57, 0.3, 0.2], shR: [-1.57, -0.5, -0.3], elR: [-1.5 * f, 0, 0] }
        : { hipsY: -0.1 * f, torso: [-0.3 * f, 0.4 * f, 0], shR: [-2.8 * f, 0, -0.3], elR: [-0.6, 0, 0], shL: [-1.2 * f, 0, 0.4 * f], elL: [-0.4, 0, 0], lgL: [-0.3, 0, 0], knL: [0.3, 0, 0] };
    } else if (this.state === 'attack' || this.state === 'charging') {
      pose = T.ai === 'ranged' || T.ai === 'caster' ? { torso: [0, -0.2, 0], shL: [-1.57, 0.3, 0.2], shR: [-1.2, -0.3, -0.5] }
        : { hipsY: -0.2, torso: [0.5, -0.3, 0], shR: [-0.8, 0, 0.3], elR: [-0.1, 0, 0], shL: [-0.4, 0, 0.3], lgL: [-0.6, 0, 0], knL: [0.6, 0, 0], lgR: [0.4, 0, 0] };
    } else if (this.state === 'hurt' || this.state === 'stunned' || !this.onGround) {
      pose = { hipsY: 0, torso: [-0.5, 0, 0.2], head: [-0.4, 0, 0], shL: [-0.8, 0, 1.2], shR: [-0.8, 0, -1.2], lgL: [-0.5, 0, 0], knL: [0.8, 0, 0], lgR: [0.3, 0, 0], knR: [0.5, 0, 0] };
      if (this.state === 'stunned') pose.head = [0.3, Math.sin(G.time * 5) * 0.4, 0];
    } else if (this.state === 'alert') {
      pose = { hipsY: 0.05, torso: [-0.2, 0, 0], shL: [-2.5, 0, 0.3], shR: [-2.5, 0, -0.3], head: [-0.3, 0, 0] };
    } else if (sp > 0.3) pose = locoPose(this.phase * 2, Math.min(1, sp / 4), sp > 4 ? 0.5 : 0);
    else pose = idlePose(G.time + this.phase);
    applyPose(r, pose, 1 - Math.exp(-14 * dt));
  }
}
// ataque a punto de golpear: el jefe tiene su propia ejecución
const origAttackStart = Enemy.prototype.attackStart;
Enemy.prototype.attackStart = function (dist, toP) {
  this.t0id = Math.random();
  if (this.boss && this.T.ai === 'boss') { this.bossExecute(); if (this.state === 'charging') return; this.cd = this.cdNext; return; }
  origAttackStart.call(this, dist, toP);
};

// ---------- Proyectiles ----------
const arrowGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 5); arrowGeo.rotateX(Math.PI / 2);
export function spawnProjectile(kind, from, to, dmg, speed, color = 0xd0a0ff) {
  let mesh;
  if (kind === 'arrow') mesh = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xf0e0c0 }));
  else {
    mesh = new THREE.Group();
    const core = new THREE.Mesh(GEO.sphereLo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    core.scale.setScalar(0.35);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(1.6);
    mesh.add(core, halo);
  }
  mesh.position.copy(from);
  const vel = new THREE.Vector3().subVectors(to, from).normalize().multiplyScalar(speed);
  if (kind === 'arrow') { vel.y += 1.5; mesh.lookAt(to); }
  G.scene.add(mesh);
  G.projectiles.push({ kind, mesh, pos: mesh.position, vel, dmg, life: 5, color });
}
export function updateProjectiles(dt) {
  const pl = G.player;
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    p.life -= dt;
    if (p.kind === 'arrow') { p.vel.y -= 6 * dt; p.mesh.lookAt(_v.copy(p.pos).add(p.vel)); }
    p.pos.addScaledVector(p.vel, dt);
    let dead = p.life <= 0;
    const ground = G.env.heightAt(p.pos.x, p.pos.z);
    if (p.pos.y < ground) dead = true;
    const dx = pl.pos.x - p.pos.x, dy = pl.pos.y + 1 - p.pos.y, dz = pl.pos.z - p.pos.z;
    if (!dead && dx * dx + dy * dy + dz * dz < 0.9) {
      pl.takeDamage(p.dmg, p.pos, { kb: 4 });
      dead = true;
    }
    if (dead) {
      if (p.kind === 'orb') { const c = new THREE.Color(p.color); G.fx.particles.emit(p.pos.x, p.pos.y, p.pos.z, { count: 10, color: [c.r, c.g, c.b], speed: 3, up: 1, life: 0.4, size: 0.5 }); }
      p.mesh.parent?.remove(p.mesh);
      G.projectiles.splice(i, 1);
    }
  }
}
export function clearProjectiles() { for (const p of G.projectiles) p.mesh.parent?.remove(p.mesh); G.projectiles.length = 0; }

export function spawnEnemy(type, level, pos, opts = {}) {
  const e = new Enemy(type, level, pos, opts);
  e.diff = opts.diff;
  e.addTo(G.scene);
  G.enemies.push(e);
  return e;
}

export function updateEnemies(dt) {
  const list = G.enemies;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    const alive = e.update(dt);
    if (!alive) { e.remove(); list.splice(i, 1); }
  }
  // separación simple
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.dead || b.dead || a.type === 'boss_serpent' || b.type === 'boss_serpent') continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, rr = a.radius + b.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-4) {
      const d = Math.sqrt(d2), push = (rr - d) * 0.5;
      a.pos.x -= (dx / d) * push; a.pos.z -= (dz / d) * push; b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
    }
  }
  // empujar al jugador fuera de los enemigos
  const pl = G.player;
  for (const e of list) {
    if (e.dead || e.type === 'boss_serpent') continue;
    const dx = pl.pos.x - e.pos.x, dz = pl.pos.z - e.pos.z, rr = e.radius + pl.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-4 && Math.abs(pl.pos.y - e.pos.y) < e.height) {
      const d = Math.sqrt(d2);
      pl.pos.x = e.pos.x + (dx / d) * rr; pl.pos.z = e.pos.z + (dz / d) * rr;
    }
  }
}
