import * as THREE from 'three';
import { G } from './state.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { buildHumanoid, applyPose, blendPoses, locoPose, idlePose } from './models.js';
import { Hebra } from './sword.js';
import { Trail } from './effects.js';
import { ATTACKS, POSES, sampleKeys, hitEnemy, softTarget, abilityAvailable, computeDamage } from './combat.js';
import { ITEMS, makeGear } from './data/items.js';
import { TREES, ABILITIES } from './data/skills.js';
import { clamp, lerp, damp, dampAngle, angleDiff, rand } from './util.js';
import { glowTexture } from './world/structures.js';

const GRAV = 26;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _hand = new THREE.Vector3(), _dir = new THREE.Vector3();
const ALL_NODES = {};
for (const t in TREES) for (const n of TREES[t].nodes) ALL_NODES[n.id] = { ...n, tree: t };

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.facing = Math.PI;
    this.mode = 'rigid';
    this.state = 'ground';
    this.onGround = true;
    this.radius = 0.45;
    this.height = 1.75;
    this.phase = 0;
    this.speed = 0;
    this.airJumps = 1;
    this.iframes = 0;
    this.hurtT = 0;
    this.action = null;
    this.buffer = null; this.bufferT = 0;
    this.cooldowns = {};
    this.dodgeT = 0; this.dodgeDir = new THREE.Vector3();
    this.combatT = 0;
    this.staminaLock = false;
    this.lastHurt = 0;
    this.blessT = 0;
    this.poseT = 0;
    this.stepT = 0;
    this.dead = false;
    // progresión
    this.level = 1; this.xp = 0; this.gold = 50;
    this.attrs = { str: 5, vit: 5, agi: 5, spi: 5 };
    this.attrPts = 0; this.skillPts = 1;
    this.skills = {};
    this.abilitySlots = [null, null, null];
    this.inv = { pocion_menor: 3, manzana: 2 };
    this.gear = [];
    this.equip = { head: null, chest: null, legs: null, amulet: null, rune: null };
    this.stats = {};
    this.recalc();
    this.hp = this.stats.maxHp; this.mana = this.stats.maxMana; this.stamina = this.stats.maxStamina;
    // visuales
    this.hebra = new Hebra();
    this.trail = new Trail(14, 0xffe7a0);
    this.sail = this.makeSail();
    this.rebuildModel();
    scene.add(this.group);
    scene.add(this.hebra.group);
    scene.add(this.trail.mesh);
  }

  attachTo(scene) {
    this.scene = scene;
    scene.add(this.group); scene.add(this.hebra.group); scene.add(this.trail.mesh);
  }

  makeSail() {
    const g = new THREE.Group();
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute([-1.3, 0, 0, 1.3, 0, 0, 0, 0.5, -0.5, 0, 0.05, 0.9, -1.3, 0, 0, 1.3, 0, 0, 0, 0.5, -0.5, 0, 0.05, 0.9], 3));
    shape.setIndex([0, 2, 1, 0, 1, 3]);
    shape.computeVertexNormals();
    const m = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: 0x9ff5ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    g.add(m);
    g.visible = false;
    return g;
  }

  look() {
    const chest = this.equip.chest;
    return {
      skin: 0xf3d5bb, hair: 0xe9dcb0, robe: chest?.tint ?? 0x3f7fd8, pants: 0x6b5a45, boots: 0x5a3e2a, belt: 0x6b4a2a,
      ears: true, pony: true, band: 0x3a6ad0, scarf: 0xe8e0d0, sleeve: chest?.tint ?? 0x3f7fd8, glove: 0x6b4a2a,
      hood: this.equip.head && this.equip.head.name.includes('Capucha') ? 0x3a5a8a : null, armor: !!(chest && chest.name.match(/Coraza|Armadura/)),
    };
  }
  rebuildModel() {
    if (this.rig) this.group.remove(this.rig.root);
    const ol = G.quality === 'baja' ? 0 : 0.02;
    this.rig = buildHumanoid(this.look(), { outline: ol });
    this.group.add(this.rig.root);
    this.rig.torso.add(this.sail);
    this.sail.position.set(0, 1.3, 0);
  }

  // ---------- progresión ----------
  skill(id) { return this.skills[id] || 0; }
  fragments() { return ['frag_verde', 'frag_azul', 'frag_blanco'].filter((f) => this.inv[f]).length; }
  totalAttr(k) {
    let v = this.attrs[k] || 0;
    for (const s in this.equip) { const it = this.equip[s]; if (it && it.stats[k]) v += it.stats[k]; }
    return v;
  }
  recalc() {
    const st = this.stats;
    const str = this.totalAttr('str'), vit = this.totalAttr('vit'), agi = this.totalAttr('agi'), spi = this.totalAttr('spi');
    let def = 0, crit = 0;
    for (const s in this.equip) { const it = this.equip[s]; if (it) { def += it.stats.def || 0; crit += it.stats.crit || 0; } }
    st.str = str; st.vit = vit; st.agi = agi; st.spi = spi;
    st.maxHp = Math.round((60 + vit * 8 + this.level * 4) * (1 + this.skill('e_vigor') * 0.1));
    st.atk = Math.round(10 + str * 2 + this.level * 1.5);
    st.def = Math.round(def + this.level * 0.5);
    st.crit = Math.min(75, 5 + agi * 0.5 + crit + this.skill('r_halcon') * 4);
    st.maxStamina = 100 + agi * 5;
    st.maxMana = 50 + spi * 6;
    st.speed = 1 + agi * 0.004;
    if (this.hp !== undefined) { this.hp = Math.min(this.hp, st.maxHp); this.mana = Math.min(this.mana, st.maxMana); }
  }
  xpNext() { return Math.round(80 * Math.pow(this.level, 1.55)); }
  addXp(n) {
    if (this.level >= 50) return;
    this.xp += Math.round(n);
    let up = false;
    while (this.xp >= this.xpNext() && this.level < 50) {
      this.xp -= this.xpNext(); this.level++; this.attrPts += 3; this.skillPts += 1; up = true;
    }
    if (up) {
      this.recalc();
      this.hp = this.stats.maxHp; this.mana = this.stats.maxMana;
      audio.play('levelup');
      G.fx.levelUp(this.pos);
      G.ui.levelUp(this.level);
      G.companion.say('levelUp', true);
    }
  }
  canLearn(id) {
    const n = ALL_NODES[id];
    if (!n || this.skillPts <= 0 || this.skill(id) >= n.max) return false;
    return n.req.every((r) => this.skill(r) > 0);
  }
  learn(id) {
    if (!this.canLearn(id)) return false;
    this.skills[id] = this.skill(id) + 1; this.skillPts--;
    const n = ALL_NODES[id];
    if (n.ability && !this.abilitySlots.includes(n.ability)) {
      const free = this.abilitySlots.indexOf(null);
      if (free >= 0) this.abilitySlots[free] = n.ability;
    }
    this.recalc();
    return true;
  }
  // ---------- inventario ----------
  count(id) { return this.inv[id] || 0; }
  addItem(id, n = 1, silent = false) {
    this.inv[id] = (this.inv[id] || 0) + n;
    if (!silent) G.ui.itemGet(ITEMS[id], n);
    G.quests?.onItem();
  }
  removeItem(id, n = 1) { this.inv[id] = Math.max(0, (this.inv[id] || 0) - n); if (!this.inv[id]) delete this.inv[id]; G.quests?.onItem(); }
  addGear(g, silent = false) { this.gear.push(g); if (!silent) G.ui.itemGet(g, 1); }
  equipGear(uid) {
    const i = this.gear.findIndex((g) => g.uid === uid);
    if (i < 0) return;
    const g = this.gear[i];
    this.gear.splice(i, 1);
    if (this.equip[g.slot]) this.gear.push(this.equip[g.slot]);
    this.equip[g.slot] = g;
    this.recalc();
    if (g.slot === 'chest' || g.slot === 'head') this.rebuildModel();
  }
  unequip(slot) {
    if (!this.equip[slot]) return;
    this.gear.push(this.equip[slot]); this.equip[slot] = null; this.recalc();
    if (slot === 'chest' || slot === 'head') this.rebuildModel();
  }
  useItem(id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'consumable' || !this.count(id) || this.dead) return false;
    let healed = 0;
    if (it.heal) healed += it.heal;
    if (it.healPct) healed += this.stats.maxHp * it.healPct;
    if (healed) this.hp = Math.min(this.stats.maxHp, this.hp + healed);
    if (it.mana) this.mana = Math.min(this.stats.maxMana, this.mana + it.mana);
    this.removeItem(id, 1);
    audio.play('pickup');
    G.fx.heal(this.pos);
    G.ui.toast(`${it.icon} ${it.name}`);
    return true;
  }
  quickPotion() {
    const order = this.hp / this.stats.maxHp < 0.4 ? ['pocion_mayor', 'pocion', 'estofado', 'pocion_menor', 'manzana', 'seta'] : ['pocion_menor', 'manzana', 'seta', 'pocion', 'estofado', 'pocion_mayor'];
    for (const id of order) if (this.count(id)) return this.useItem(id);
    G.ui.toast('No tienes pociones');
    audio.play('deny');
    return false;
  }

  // ---------- combate ----------
  resolveAttack(id) {
    let def = ATTACKS[id];
    if (!def) return null;
    if (def.req && !this.skill(def.req)) { id = def.fallback; def = ATTACKS[id]; }
    return id;
  }
  startAttack(id) {
    id = this.resolveAttack(id);
    if (!id) return false;
    const def = ATTACKS[id];
    if (def.forceFlex && this.mode !== 'flex') this.setMode('flex', true);
    // orientación hacia el objetivo o la dirección de input
    const wish = this.wishDir();
    const tgt = softTarget(this, def.mode === 'flex' ? 10 : 7);
    if (tgt) this.facing = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
    else if (wish.lengthSq() > 0.01) this.facing = Math.atan2(wish.x, wish.z);
    this.action = { id, def, t: 0, hits: new Map(), lastMulti: -1, finDone: false, followed: false, slamPhase: 0, rainT: 0, rainN: 0, spinBase: this.facing };
    this.state = 'attack';
    audio.play(def.sfx || 'swing', { pitch: rand(0.9, 1.1) });
    if (def.air) { this.vel.y = Math.max(this.vel.y, def.slam ? 4 : 1.5); }
    if (def.name) G.ui.comboName(def.name);
    if (def.heal) {
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * def.heal);
      G.fx.heal(this.pos); G.fx.ring(this.pos, 4, [0.5, 1, 0.6], 0.6);
    }
    if (def.iframes) this.iframes = Math.max(this.iframes, def.iframes);
    this.combatT = 5;
    return true;
  }
  wishDir() {
    const cy = G.cam.yaw;
    const fx = Math.sin(cy), fz = Math.cos(cy);
    const rx = -Math.cos(cy), rz = Math.sin(cy);
    return _v3.set(fx * input.move.y + rx * input.move.x, 0, fz * input.move.y + rz * input.move.x);
  }
  setMode(m, silent = false) {
    if (this.mode === m) return;
    this.mode = m;
    this.hebra.setMode(m);
    this.trail.mat.uniforms.color.value.set(m === 'rigid' ? 0xffe7a0 : 0x6fffd8);
    this.trail.falloff = m === 'rigid' ? 1 : 2.5;
    this.trail.maxOpacity = m === 'rigid' ? 0.85 : 0.5;
    if (!silent) {
      audio.play('switch');
      G.fx.sparkle(_v.copy(this.pos).setY(this.pos.y + 1.2), m === 'rigid' ? [1, 0.85, 0.4] : [0.4, 1, 0.8], 24);
      G.ui.modeChanged(m);
      if (!G.flags['tip_' + m]) { G.flags['tip_' + m] = true; G.companion.say(m === 'flex' ? 'switchFlex' : 'switchRigid', true); }
    }
  }

  updateAttack(dt) {
    const a = this.action, d = a.def;
    const prevT = a.t;
    a.t += dt;
    // Caída meteoro
    if (d.slam) {
      if (a.slamPhase === 0) {
        if (a.t > 0.15) { a.slamPhase = 1; this.vel.y = -38; }
        else this.vel.y = Math.max(this.vel.y - GRAV * dt, 2);
      }
      if (a.slamPhase === 1 && this.onGround) {
        a.slamPhase = 2; a.t = 1.7;
        const big = this.skill('r_meteoro') ? 1.45 : 1;
        this.aoe(d, d.range * big, big);
        G.fx.ring(this.pos, d.range * big * 1.3, [1, 0.85, 0.4], 0.5);
        G.fx.dust(this.pos, 24);
        audio.play('boom');
      }
      if (a.slamPhase === 1 && a.t > 1.6) a.t = 1.6;
      if (a.t >= d.dur) this.endAction();
      return;
    }
    // embestida (Estocada Celeste)
    if (d.dash && a.t < 0.3) {
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      this.pos.x += fx * d.dash * dt; this.pos.z += fz * d.dash * dt;
      G.fx.particles.emit(this.pos.x, this.pos.y + 1, this.pos.z, { count: 3, color: [1, 0.9, 0.6], speed: 1, up: 0, life: 0.3, size: 0.8, grav: 0 });
    }
    // avance (lunge)
    if (d.lunge && a.t >= d.lunge[0] && a.t <= d.lunge[1]) {
      const tgt = softTarget(this, 8);
      const close = tgt && tgt.pos.distanceTo(this.pos) < 1.4 + tgt.radius;
      if (!close) { this.pos.x += Math.sin(this.facing) * d.lunge[2] * dt; this.pos.z += Math.cos(this.facing) * d.lunge[2] * dt; }
    }
    // gravedad reducida en ataques aéreos
    if (d.air) this.vel.y -= GRAV * 0.28 * dt;
    // seguimiento del lanzador
    if (d.follow && !a.followed && a.t >= d.hit[1] && (input.down('heavy') || input.down('jump'))) {
      a.followed = true; this.vel.y = 13.2; this.onGround = false; this.airJumps = 1;
    }
    // absorción (torbellino)
    if (d.vacuum) for (const e of G.enemies) {
      if (e.dead || !e.active || e.heavy) continue;
      _v.subVectors(this.pos, e.pos).setY(0);
      const dist = _v.length();
      if (dist < d.range && dist > 1.5) e.pos.addScaledVector(_v.normalize(), dt * 4);
    }
    // curación / lluvia
    if (d.rain && a.t > 0.3) {
      a.rainT -= dt;
      if (a.rainT <= 0 && a.rainN < d.rain) { a.rainT = 0.07; a.rainN++; this.rainBlade(); }
    }
    // impactos
    if (d.range && a.t >= d.hit[0] && prevT <= d.hit[1]) {
      if (d.multi) {
        const idx = Math.floor((a.t - d.hit[0]) / d.multi);
        if (idx !== a.lastMulti) { a.lastMulti = idx; a.hits.clear(); this.doHits(d, a); if (d.sfx === 'whip' || d.sfx === 'swing') if (idx > 0) audio.play(d.sfx, { pitch: rand(1, 1.3) }); }
      } else this.doHits(d, a);
    }
    if (d.finisher && !a.finDone && a.t >= d.finisher.t) {
      a.finDone = true; a.hits.clear();
      this.doHits({ ...d, ...d.finisher, stun: 0.5 }, a);
      audio.play('heavy'); G.shake = 0.5;
    }
    if (d.ring && prevT < d.hit[0] && a.t >= d.hit[0]) { G.fx.ring(this.pos, d.ring, d.bind ? [0.4, 1, 0.8] : [1, 0.8, 0.4], 0.6); G.fx.dust(this.pos, 20); }
    // encadenar
    if (a.t >= (d.cancel ?? d.dur) && this.buffer) {
      const b = this.buffer; this.buffer = null;
      if (b === 'dodge') { this.endAction(); this.startDodge(); return; }
      const nx = d.next && d.next[b];
      if (nx !== undefined && nx !== null) {
        const nd = ATTACKS[nx];
        if (nd && (nd.mode === 'any' || nd.mode === this.mode) && !!nd.air === !this.onGround) { this.startAttack(nx); return; }
      }
      this.endAction();
      this.tryAttack(b);
      return;
    }
    if (a.t >= d.dur) this.endAction();
  }
  endAction() {
    this.action = null;
    this.state = this.onGround ? 'ground' : 'air';
  }
  doHits(d, a) {
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    const range = d.range * (this.mode === 'flex' && d.mode === 'flex' ? 1 + this.skill('f_alcance') * 0.12 : 1);
    const halfArc = (d.arc * Math.PI) / 360;
    let pulledHeavy = null, pulls = 0;
    for (const e of G.enemies) {
      if (e.dead || !e.active || a.hits.has(e)) continue;
      const pts = e.hitPoints ? e.hitPoints() : [e.pos];
      let hitPt = null;
      for (const p of pts) {
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > range + e.radius) continue;
        const dy = p.y - this.pos.y;
        if (dy > 3.2 + (e.height || 2) || dy < -(e.height || 2) - 1.8) continue;
        if (d.arc < 360 && dist > e.radius + 0.4) {
          const ang = Math.atan2(dx, dz);
          if (Math.abs(angleDiff(this.facing, ang)) > halfArc + Math.atan2(e.radius, dist)) continue;
        }
        hitPt = p; break;
      }
      if (!hitPt) continue;
      a.hits.set(e, true);
      if (d.pull) {
        if (e.heavy) { pulledHeavy = e; hitEnemy(e, d, this, { moveId: a.id }); continue; }
        if (pulls > 0 && !this.skill('f_tiron')) continue;
        pulls++;
        e.pullTo(_v.set(this.pos.x + fx * 1.8, this.pos.y, this.pos.z + fz * 1.8));
      }
      hitEnemy(e, d, this, { moveId: a.id, point: hitPt !== e.pos ? _v2.copy(hitPt) : null });
      if (d.airHit && !this.onGround) { this.vel.y = Math.max(this.vel.y, 2.2); e.airHold(); }
      if (d.bounce) this.vel.y = d.bounce;
    }
    if (pulledHeavy) {
      // Hebra nos lanza hacia el enemigo pesado
      _v.subVectors(pulledHeavy.pos, this.pos).setY(0);
      const dist = _v.length();
      if (dist > 2.5) { this.zip = { dir: _v.clone().normalize(), t: Math.min(0.35, (dist - 2) / 22) }; this.vel.y = 5; }
    }
  }
  aoe(d, radius, mult = 1) {
    for (const e of G.enemies) {
      if (e.dead || !e.active) continue;
      if (e.pos.distanceTo(this.pos) < radius + e.radius) hitEnemy(e, d, this, { mult, moveId: 'aoe' });
    }
  }
  rainBlade() {
    const cands = G.enemies.filter((e) => !e.dead && e.active && e.pos.distanceTo(this.pos) < 16);
    let p;
    if (cands.length) p = cands[Math.floor(Math.random() * cands.length)].pos.clone();
    else p = this.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6)));
    const top = p.clone().setY(p.y + 9);
    for (let i = 0; i < 10; i++) { const q = top.clone().lerp(p, i / 10); G.fx.particles.emit(q.x, q.y, q.z, { count: 2, color: [0.8, 0.7, 1], speed: 0.3, up: 0, life: 0.35, size: 0.7, grav: 0 }); }
    G.fx.ring(p, 2.5, [0.8, 0.7, 1], 0.35);
    audio.play('swing', { pitch: 1.6 });
    for (const e of G.enemies) {
      if (e.dead || !e.active) continue;
      if (e.pos.distanceTo(p) < 2.8) hitEnemy(e, { dmg: 1.3, kb: 1, launch: 4, ability: true, stun: 0.4 }, this, { moveId: 'lluvia' });
    }
  }
  tryAttack(kind) {
    if (this.state === 'swim' || this.state === 'climb' || this.state === 'dead') return;
    const air = !this.onGround;
    let id;
    if (this.mode === 'rigid') id = air ? (kind === 'L' ? 'a1' : 'aH') : (kind === 'L' ? 'r1' : 'rHeavy');
    else id = air ? (kind === 'L' ? 'fa1' : 'faH') : (kind === 'L' ? 'f1' : 'fH');
    this.startAttack(id);
  }
  useAbility(slot) {
    const id = this.abilitySlots[slot];
    if (!id) { G.ui.toast('Espacio vacío: asigna habilidades en el menú (P)'); return; }
    if (!abilityAvailable(this, id)) { audio.play('deny'); G.ui.toast((this.cooldowns[id] || 0) > 0 ? 'Habilidad en recarga' : 'Espíritu insuficiente'); return; }
    if (this.state === 'swim' || this.dead) return;
    const ab = ABILITIES[id];
    this.mana -= ab.cost;
    this.cooldowns[id] = ab.cd;
    this.action = null;
    this.startAttack('ab_' + id);
  }
  startDodge() {
    if (this.stamina < 12 || this.state === 'swim' || this.state === 'climb') return;
    this.stamina -= 18;
    const w = this.wishDir();
    if (w.lengthSq() < 0.01) w.set(-Math.sin(this.facing), 0, -Math.cos(this.facing)); // paso atrás
    this.dodgeDir.copy(w).normalize();
    this.dodgeT = 0.34;
    this.iframes = 0.3;
    this.perfectWindow = 0.16;
    this.state = 'dodge';
    this.action = null;
    audio.play('dodge');
    G.fx.dust(this.pos, 6);
  }
  // Llamado por enemigos/proyectiles
  takeDamage(amount, from, { kb = 4, unblockable = false } = {}) {
    if (this.dead) return false;
    if (this.iframes > 0) {
      if (this.state === 'dodge' && this.perfectWindow > 0 && !G.slowmo) {
        const dur = 2.5 + this.skill('e_tiempo') * 1.5;
        G.slowmo = dur;
        audio.play('slowmo');
        G.ui.flash('#7af0ff');
        G.ui.comboName('¡Tiempo Élfico!');
        G.style.add(120, 'perfect');
        if (!G.flags.tipPerfect) { G.flags.tipPerfect = true; G.companion.say('perfect', true); }
      }
      return false;
    }
    const dmg = Math.max(1, Math.round(amount * (100 / (100 + this.stats.def * 3))));
    this.hp -= dmg;
    this.iframes = 0.7;
    G.style.hurt();
    G.fx.damageNumber(_v.copy(this.pos).setY(this.pos.y + 0.4), dmg, { color: '#ff5a5a' });
    G.fx.hit(_v.copy(this.pos).setY(this.pos.y + 1.1), [1, 0.3, 0.3], 10);
    audio.play('hurt');
    G.shake = Math.max(G.shake, 0.35);
    G.ui.flash('#ff2a2a');
    const armored = this.action && this.action.def.armor;
    if (!armored) {
      this.action = null;
      this.state = 'hurt'; this.hurtT = 0.38;
      if (from) { _v.subVectors(this.pos, from).setY(0).normalize(); this.kbVel = _v.clone().multiplyScalar(kb); }
    }
    if (this.hp <= 0) this.die();
    else if (this.hp < this.stats.maxHp * 0.25) G.companion.say('lowHp');
    return true;
  }
  die() {
    if (this.skill('e_bendicion') && G.time > this.blessT) {
      this.blessT = G.time + 300;
      this.hp = Math.round(this.stats.maxHp * 0.5);
      G.fx.heal(this.pos); G.fx.ring(this.pos, 6, [1, 1, 0.6], 0.8);
      G.ui.comboName('¡Bendición de Sylvaren!');
      this.iframes = 2;
      return;
    }
    this.hp = 0; this.dead = true; this.state = 'dead'; this.action = null;
    G.lockTarget = null;
    G.companion.say('death', true);
    setTimeout(() => G.ui.showDeath(), 1600);
  }
  respawn(p) {
    this.dead = false; this.state = 'ground';
    this.hp = this.stats.maxHp; this.mana = this.stats.maxMana; this.stamina = this.stats.maxStamina;
    this.vel.set(0, 0, 0);
    this.pos.copy(p);
    this.iframes = 2;
    this.rig.body.rotation.set(0, 0, 0);
  }

  // ---------- actualización ----------
  update(dt) {
    const env = G.env;
    const st = this.stats;
    this.iframes = Math.max(0, this.iframes - dt);
    this.perfectWindow = Math.max(0, (this.perfectWindow || 0) - dt);
    this.combatT = Math.max(0, this.combatT - dt);
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.mana = Math.min(st.maxMana, this.mana + dt * (1.2 + st.spi * 0.05) * (1 + this.skill('e_fluir') * 0.2));
    if (this.bufferT > 0) { this.bufferT -= dt; if (this.bufferT <= 0) this.buffer = null; }

    if (this.dead) { this.animate(dt); this.updateSword(dt); return; }

    // ----- entradas de combate -----
    const ui = G.ui.blocking();
    if (!ui) {
      if (input.pressed('switch')) {
        const newMode = this.mode === 'rigid' ? 'flex' : 'rigid';
        if (this.action && this.skill('f_cambio') && this.action.t > this.action.def.hit[0] && !this.action.def.ability && this.action.id !== 'sw') {
          this.setMode(newMode); this.action = null; this.startAttack('sw');
        } else {
          if (this.action) G.style.add(40, 'switch');
          this.setMode(newMode);
        }
      }
      const atkL = input.pressed('attack'), atkH = input.pressed('heavy');
      if (atkL || atkH) {
        const k = atkL ? 'L' : 'H';
        if (this.action) { this.buffer = k; this.bufferT = 0.45; }
        else if (this.state === 'ground' || this.state === 'air' || this.state === 'glide') { if (this.state === 'glide') this.state = 'air'; this.tryAttack(k); }
      }
      if (input.pressed('dodge')) {
        if (this.action && !this.action.def.ability) { this.buffer = 'dodge'; this.bufferT = 0.3; if (this.action.t > (this.action.def.hit[1] || 0)) { this.endAction(); this.startDodge(); this.buffer = null; } }
        else if (this.state === 'ground' || this.state === 'air') this.startDodge();
      }
      for (let i = 0; i < 3; i++) if (input.pressed('ab' + (i + 1))) this.useAbility(i);
      if (input.pressed('potion')) this.quickPotion();
      if (input.pressed('lock')) this.toggleLock();
    }
    if (G.lockTarget && (G.lockTarget.dead || G.lockTarget.pos.distanceTo(this.pos) > 32)) G.lockTarget = null;

    const wish = ui ? _v3.set(0, 0, 0) : this.wishDir();
    const moving = wish.lengthSq() > 0.01;
    const ground = env.heightAt(this.pos.x, this.pos.z);
    const water = env.waterDepth ? env.waterDepth(this.pos.x, this.pos.z, ground) : 0;
    let sprint = input.down('sprint') && moving && !this.staminaLock;

    // ----- estados -----
    if (this.zip) {
      this.zip.t -= dt;
      this.pos.addScaledVector(this.zip.dir, 26 * dt);
      if (this.zip.t <= 0) this.zip = null;
    }
    if (this.state === 'attack' && this.action) {
      this.updateAttack(dt);
      if (!this.action?.def.air || this.onGround) this.vel.x = this.vel.z = 0;
    } else if (this.state === 'dodge') {
      this.dodgeT -= dt;
      const k = this.dodgeT / 0.34;
      this.pos.addScaledVector(this.dodgeDir, (7 + 13 * k) * dt);
      if (!this.onGround) this.vel.y -= GRAV * 0.5 * dt;
      this.facing = dampAngle(this.facing, Math.atan2(this.dodgeDir.x, this.dodgeDir.z), 20, dt);
      if (this.dodgeT <= 0) this.state = this.onGround ? 'ground' : 'air';
    } else if (this.state === 'hurt') {
      this.hurtT -= dt;
      if (this.kbVel) { this.pos.addScaledVector(this.kbVel, dt); this.kbVel.multiplyScalar(Math.exp(-6 * dt)); }
      if (this.hurtT <= 0) this.state = this.onGround ? 'ground' : 'air';
    } else if (this.state === 'swim') {
      const sp = (sprint && this.stamina > 0 ? 6 : 3.4);
      if (sprint) this.stamina -= dt * 22;
      else if (moving) this.stamina -= dt * 3;
      if (moving) { this.pos.addScaledVector(wish, sp * dt); this.facing = dampAngle(this.facing, Math.atan2(wish.x, wish.z), 8, dt); }
      this.speed = moving ? sp : 0;
      const surface = env.waterLevel - 1.15;
      this.pos.y = damp(this.pos.y, surface, 8, dt); this.vel.y = 0;
      if (this.stamina <= 0) { this.stamina = 0; this.drown(); }
      if (water < 1.15) this.state = 'ground';
      if (!ui && input.pressed('jump') && this.stamina > 10) { this.vel.y = 6; this.stamina -= 10; this.state = 'air'; this.onGround = false; this.pos.y += 0.3; }
      this.phase += dt * (moving ? 5 : 2);
    } else if (this.state === 'climb') {
      const n = env.normalAt(this.pos.x, this.pos.z);
      const downhill = _v.set(n.x, 0, n.z).normalize();
      this.stamina -= dt * (moving ? 11 : 4);
      if (moving) {
        this.pos.addScaledVector(wish, 3.0 * dt);
        this.facing = dampAngle(this.facing, Math.atan2(-downhill.x, -downhill.z), 10, dt);
      }
      this.pos.y = env.heightAt(this.pos.x, this.pos.z);
      this.speed = moving ? 3 : 0;
      this.phase += dt * (moving ? 6 : 0);
      if (!ui && input.pressed('jump') && this.stamina > 15) { this.stamina -= 15; this.vel.y = 8; this.pos.addScaledVector(downhill, 0.5); this.state = 'air'; this.onGround = false; }
      else if (this.stamina <= 0) { this.stamina = 0; this.staminaLock = true; this.state = 'air'; this.onGround = false; this.vel.y = -2; this.pos.addScaledVector(downhill, 0.6); }
      else if (n.y > 0.72 || (!moving && false)) this.state = 'ground';
      else {
        // dejar de escalar si nos movemos cuesta abajo
        if (moving && wish.dot(downhill) > 0.6) this.state = 'ground';
      }
    } else {
      // ground / air / glide
      const maxSp = (sprint && this.onGround ? 10.5 : this.state === 'glide' ? (this.skill('e_vela') ? 12 : 9) : 6.4) * st.speed;
      const lockStrafe = G.lockTarget && this.onGround && !sprint;
      if (moving) {
        const accel = this.onGround ? 14 : 5;
        this.vel.x = damp(this.vel.x, wish.x * maxSp, accel, dt);
        this.vel.z = damp(this.vel.z, wish.z * maxSp, accel, dt);
        if (lockStrafe) this.facing = dampAngle(this.facing, Math.atan2(G.lockTarget.pos.x - this.pos.x, G.lockTarget.pos.z - this.pos.z), 12, dt);
        else this.facing = dampAngle(this.facing, Math.atan2(wish.x, wish.z), this.onGround ? 12 : 5, dt);
      } else {
        const dec = this.onGround ? 12 : 1.5;
        this.vel.x = damp(this.vel.x, 0, dec, dt); this.vel.z = damp(this.vel.z, 0, dec, dt);
        if (lockStrafe) this.facing = dampAngle(this.facing, Math.atan2(G.lockTarget.pos.x - this.pos.x, G.lockTarget.pos.z - this.pos.z), 10, dt);
      }
      if (sprint && this.onGround) { this.stamina -= dt * 16; }
      this.speed = Math.hypot(this.vel.x, this.vel.z);
      // salto / doble salto / planeo
      if (!ui && input.pressed('jump')) {
        if (this.onGround) {
          this.vel.y = 10; this.onGround = false; this.state = 'air'; this.airJumps = 1;
          audio.play('jump'); G.fx.dust(this.pos, 5);
        } else if (this.state === 'air' && this.airJumps > 0) {
          this.airJumps--; this.vel.y = 9.5; audio.play('jump', { pitch: 1.3 });
          G.fx.sparkle(this.pos, [0.6, 1, 0.9], 12);
        }
      }
      if (this.state === 'air' && !this.onGround && input.down('jump') && this.vel.y < -1 && this.airJumps === 0 && this.stamina > 1 && !this.staminaLock) {
        this.state = 'glide';
        if (!G.flags.glide) { G.flags.glide = true; G.companion.say('glide', true); }
      }
      if (this.state === 'glide') {
        this.stamina -= dt * (this.skill('e_vela') ? 4 : 8);
        if (!input.down('jump') || this.stamina <= 0 || this.onGround) this.state = this.onGround ? 'ground' : 'air';
      }
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      // escalada
      if (this.onGround && moving && this.state === 'ground') {
        const n = env.normalAt(this.pos.x, this.pos.z);
        if (n.y < 0.66) {
          const up = _v.set(-n.x, 0, -n.z).normalize();
          if (wish.dot(up) > 0.3 && this.stamina > 5 && !this.staminaLock) {
            this.state = 'climb';
            if (!G.flags.climb) { G.flags.climb = true; G.companion.say('climb', true); }
          }
        }
      }
    }
    if (sprint || this.state === 'glide' || this.state === 'climb' || (this.state === 'swim' && moving)) this.staminaUse = 0.6;
    this.staminaUse = Math.max(0, (this.staminaUse || 0) - dt);
    if (this.staminaUse <= 0 && this.state !== 'swim') this.stamina = Math.min(st.maxStamina, this.stamina + dt * (this.onGround ? 38 : 12));
    if (this.stamina <= 0) { this.stamina = 0; this.staminaLock = true; }
    if (this.staminaLock && this.stamina > st.maxStamina * 0.3) this.staminaLock = false;

    // ----- física vertical -----
    if (this.state !== 'swim' && this.state !== 'climb') {
      const gscale = this.state === 'glide' ? 0.12 : 1;
      if (!(this.state === 'attack' && this.action?.def.air)) this.vel.y -= GRAV * gscale * dt;
      if (this.state === 'glide') this.vel.y = Math.max(this.vel.y, -2.4);
      this.pos.y += this.vel.y * dt;
      const g2 = env.heightAt(this.pos.x, this.pos.z);
      const floor = Math.max(g2, env.floorAt ? env.floorAt(this.pos.x, this.pos.z, this.pos.y) : -1e9);
      if (this.pos.y <= floor + 0.02 || (this.onGround && this.pos.y - floor < 0.7 && this.vel.y <= 0.1)) {
        if (!this.onGround && this.vel.y < -6) { audio.play('land'); G.fx.dust(this.pos, 8); }
        if (!this.onGround && this.vel.y < -27) {
          const fd = Math.round((-this.vel.y - 27) * 4);
          if (fd > 0) { this.iframes = 0; this.takeDamage(fd, null, { kb: 0 }); }
        }
        this.pos.y = floor;
        this.vel.y = 0;
        if (!this.onGround) { this.onGround = true; this.airJumps = 1; if (this.state === 'air' || this.state === 'glide') this.state = 'ground'; }
      } else if (this.pos.y > floor + 0.05) {
        this.onGround = false;
        if (this.state === 'ground') this.state = 'air';
      }
      // agua
      if (env.waterDepth && env.waterLevel - floor > 1.3 && this.pos.y < env.waterLevel - 1.0 && this.state !== 'attack') {
        if (this.state !== 'swim') { audio.play('splash'); G.fx.sparkle(_v.copy(this.pos).setY(env.waterLevel), [0.8, 0.95, 1], 20); if (!G.flags.swim) { G.flags.swim = true; G.companion.say('swim', true); } }
        this.state = 'swim'; this.vel.set(0, 0, 0); this.onGround = false; this.action = null;
      }
      // deslizamiento en pendientes pronunciadas
      if (this.onGround && this.state === 'ground') {
        const n = env.normalAt(this.pos.x, this.pos.z);
        if (n.y < 0.6) { this.pos.x += n.x * dt * 6; this.pos.z += n.z * dt * 6; }
      }
    }
    // colisiones
    env.collide(this.pos, this.radius, this.height);
    env.clamp(this.pos);
    if (this.state === 'ground' || this.state === 'climb') {
      const g3 = env.heightAt(this.pos.x, this.pos.z);
      if (this.pos.y < g3) this.pos.y = g3;
    }
    // pasos
    if (this.onGround && this.speed > 1 && this.state === 'ground') {
      this.stepT -= dt * this.speed * 0.32;
      if (this.stepT <= 0) { this.stepT = 1; audio.play('step'); }
    }

    this.animate(dt);
    this.updateSword(dt);
  }

  drown() {
    this.takeDamage(Math.round(this.stats.maxHp * 0.2), null, { kb: 0 });
    // volver a la orilla más cercana
    const env = G.env;
    for (let r = 4; r < 80; r += 4) for (let a = 0; a < 16; a++) {
      const x = this.pos.x + Math.cos(a / 16 * 6.283) * r, z = this.pos.z + Math.sin(a / 16 * 6.283) * r;
      const h = env.heightAt(x, z);
      if (h > env.waterLevel + 0.3) { this.pos.set(x, h, z); this.state = 'ground'; this.stamina = this.stats.maxStamina * 0.5; return; }
    }
  }

  toggleLock() {
    if (G.lockTarget) {
      // cambiar al siguiente objetivo o quitar
      const others = G.enemies.filter((e) => !e.dead && e.active && e !== G.lockTarget && e.pos.distanceTo(this.pos) < 25);
      if (others.length) { others.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos)); G.lockTarget = others[0]; }
      else G.lockTarget = null;
      return;
    }
    let best = null, bs = 1e9;
    const cy = G.cam.yaw;
    for (const e of G.enemies) {
      if (e.dead || !e.active) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d > 25) continue;
      const a = Math.abs(angleDiff(cy, Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z)));
      const s = d + a * 8;
      if (s < bs) { bs = s; best = e; }
    }
    G.lockTarget = best;
    if (best) audio.play('ui');
  }

  animate(dt) {
    const rig = this.rig;
    this.poseT += dt;
    let pose, k = 1 - Math.exp(-14 * dt);
    const bodyRot = rig.body.rotation;
    let bodyX = 0, bodyYextra = 0;
    this.sail.visible = this.state === 'glide';
    if (this.dead) {
      pose = { hipsY: -0.75, torso: [0.3, 0, 0], shL: [-0.3, 0, 1.2], shR: [-0.3, 0, -1.2], lgL: [-1.4, 0, 0], knL: [1.8, 0, 0], lgR: [-1.4, 0, 0], knR: [1.8, 0, 0], head: [0.4, 0, 0] };
      bodyX = 0; k = 1 - Math.exp(-5 * dt);
    } else if (this.action) {
      const a = this.action, d = a.def;
      const pk = sampleKeys(d.pose, Math.min(a.t, d.dur));
      // mezclar entre poses nombradas
      const keys = d.pose;
      let i = 0; while (i < keys.length - 1 && a.t > keys[i + 1][0]) i++;
      const A = POSES[keys[i][1]], B = POSES[(keys[i + 1] || keys[i])[1]];
      const span = (keys[i + 1] ? keys[i + 1][0] - keys[i][0] : 1) || 1;
      const f = clamp((a.t - keys[i][0]) / span, 0, 1);
      pose = blendPoses(A, B, f * f * (3 - 2 * f));
      k = 1 - Math.exp(-30 * dt);
      if (d.spinBody) bodyYextra = -clamp(a.t / (d.dur * 0.8), 0, 1) * Math.PI * 2 * d.spinBody;
      void pk;
    } else if (this.state === 'dodge') {
      pose = POSES.airTuck;
      const t = 1 - this.dodgeT / 0.34;
      bodyX = t * Math.PI * 2; k = 1 - Math.exp(-25 * dt);
    } else if (this.state === 'hurt') {
      pose = { hipsY: -0.1, torso: [-0.5, 0, 0], head: [-0.4, 0, 0], shL: [-0.5, 0, 0.8], shR: [-0.5, 0, -0.8], lgL: [0.3, 0, 0], knL: [0.3, 0, 0], lgR: [-0.3, 0, 0], knR: [0.5, 0, 0] };
    } else if (this.state === 'swim') {
      const s = Math.sin(this.phase);
      pose = { hipsY: 0, torso: [0, 0, 0], head: [-1.0, 0, 0], shL: [-2.2 + s * 1.2, 0, 0.4], shR: [-2.2 - s * 1.2, 0, -0.4], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], lgL: [s * 0.4, 0, 0], lgR: [-s * 0.4, 0, 0] };
      bodyX = 1.25;
    } else if (this.state === 'climb') {
      const s = Math.sin(this.phase);
      pose = { hipsY: -0.1, torso: [0.3, 0, 0], head: [-0.5, 0, 0], shL: [-2.6 + s * 0.5, 0, 0.3], shR: [-2.6 - s * 0.5, 0, -0.3], elL: [-0.6, 0, 0], elR: [-0.6, 0, 0], lgL: [-0.8 - s * 0.4, 0, 0], knL: [1.2, 0, 0], lgR: [-0.8 + s * 0.4, 0, 0], knR: [1.2, 0, 0] };
      bodyX = -0.35;
    } else if (this.state === 'glide') {
      pose = { hipsY: 0, torso: [0.2, 0, 0], head: [-0.3, 0, 0], shL: [-2.9, 0, 0.35], shR: [-2.9, 0, -0.35], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], lgL: [0.3, 0, 0], knL: [0.5, 0, 0], lgR: [0.15, 0, 0], knR: [0.4, 0, 0] };
    } else if (!this.onGround) {
      pose = this.vel.y > 0 ? { hipsY: 0, torso: [-0.1, 0, 0], shL: [-0.5, 0, 0.6], shR: [-0.8, 0, -0.6], lgL: [-0.9, 0, 0], knL: [1.3, 0, 0], lgR: [0.2, 0, 0], knR: [0.4, 0, 0] }
        : { hipsY: 0, torso: [0.1, 0, 0], shL: [-0.3, 0, 1.0], shR: [-0.3, 0, -1.0], lgL: [-0.4, 0, 0], knL: [0.5, 0, 0], lgR: [-0.1, 0, 0], knR: [0.3, 0, 0] };
      if (this.airJumps === 0 && this.vel.y > 2) { pose = POSES.airTuck; bodyX = (1 - this.vel.y / 9.5) * Math.PI * 2; }
    } else {
      const sp = this.speed;
      if (sp > 0.4) {
        this.phase += dt * (sp * 1.35 + 2);
        pose = locoPose(this.phase, clamp(sp / 6.4, 0.3, 1), clamp((sp - 6.5) / 4, 0, 1));
      } else {
        pose = idlePose(this.poseT);
        if (this.combatT > 0) pose = blendPoses(pose, POSES.ready, 0.7);
      }
    }
    applyPose(rig, pose, k);
    bodyRot.x = this.state === 'dodge' || (pose === POSES.airTuck) ? bodyX : damp(bodyRot.x, bodyX, 10, dt);
    this.group.rotation.y = this.facing + bodyYextra;
    // parpadeo con invulnerabilidad tras golpe
    rig.root.visible = !(this.iframes > 0 && this.state === 'hurt' && Math.floor(G.time * 30) % 2 === 0);
  }

  updateSword(dt) {
    this.rig.handR.getWorldPosition(_hand);
    const a = this.action;
    let attacking = false, ext = 0, wave = 0;
    const face = this.group.rotation.y;
    if (a) {
      const b = sampleKeys(a.def.blade, Math.min(a.t, a.def.dur));
      const yaw = (b[1] * Math.PI) / 180, pitch = (b[2] * Math.PI) / 180;
      ext = b[3] ?? 1;
      // blade dir en espacio local y luego al mundo (la rotación del cuerpo ya incluye el giro)
      const lx = Math.sin(yaw) * Math.cos(pitch), ly = Math.sin(pitch), lz = Math.cos(yaw) * Math.cos(pitch);
      const baseYaw = a.def.spinBody ? a.spinBase : face;
      const c = Math.cos(baseYaw), s = Math.sin(baseYaw);
      _dir.set(lx * c + lz * s, ly, -lx * s + lz * c).normalize();
      attacking = true;
      wave = this.mode === 'flex' ? 0.5 : 0;
    } else if (this.state === 'glide') {
      _dir.set(0, 1, 0);
    } else if (this.state === 'climb' || this.state === 'swim') {
      _dir.set(-Math.sin(face) * 0.3, -0.9, -Math.cos(face) * 0.3).normalize();
    } else {
      // en reposo: hoja hacia atrás y abajo
      const yaw = this.combatT > 0 ? -0.5 : Math.PI * 0.85, pitch = this.combatT > 0 ? 0.35 : -0.9;
      const lx = Math.sin(yaw) * Math.cos(pitch), ly = Math.sin(pitch), lz = Math.cos(yaw) * Math.cos(pitch);
      const c = Math.cos(face), s = Math.sin(face);
      _dir.set(lx * c + lz * s, ly, -lx * s + lz * c).normalize();
    }
    const whipLen = 7 * (1 + this.skill('f_alcance') * 0.12);
    this.hebra.update(dt, _hand, _dir, { attacking: attacking && this.mode === 'flex', whipLen, ext, wave, time: G.time, groundAt: G.env.heightAt });
    const on = attacking && a.t >= (a.def.hit[0] - 0.08) && a.t <= a.def.hit[1] + 0.06 && a.def.range > 0;
    this.trail.push(this.hebra.point(this.mode === 'rigid' ? 0.3 : 0.55), this.hebra.tip());
    this.trail.update(dt, on);
  }
}
