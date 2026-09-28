import * as THREE from 'three';
import { G } from '../state.js';
import { audio } from '../audio.js';
import { buildTerrain, getHeight, getNormal, WATER_Y, HALF, forestDensity, pathDist } from './terrain.js';
import { Sky } from './sky.js';
import { buildWater } from './water.js';
import { buildVegetation, GrassField } from './vegetation.js';
import { Colliders } from './colliders.js';
import * as S from './structures.js';
import { VILLAGE, REGIONS, DUNGEON_SITES, WAYPOINTS, CAMPS, ECHOES, CHESTS, PADS } from '../data/worlddata.js';
import { mulberry32 } from '../noise.js';
import { NPC } from '../npcs.js';
import { NPCS } from '../data/npcs.js';
import { spawnEnemy } from '../enemies.js';
import { randomGear, ITEMS } from '../data/items.js';
import { DUNGEONS } from '../dungeon.js';
import { rand, randInt, clamp } from '../util.js';

const _v = new THREE.Vector3();

export class World {
  constructor(quality) {
    this.quality = quality;
    const scene = new THREE.Scene();
    this.scene = scene;
    this.colliders = new Colliders(16);
    this.anims = [];
    this.interactables = [];
    this.lamps = [];
    this.campRuntime = {};
    this.regionT = 0;
    this.curRegion = null;

    this.sky = new Sky(scene, quality);
    this.terrain = buildTerrain(quality);
    scene.add(this.terrain);
    this.water = buildWater(quality);
    scene.add(this.water);

    const exclusions = [{ x: VILLAGE.x, z: VILLAGE.z, r: 120 }];
    for (const d of DUNGEON_SITES) exclusions.push({ x: d.x, z: d.z, r: 26 });
    for (const w of WAYPOINTS) exclusions.push({ x: w.x, z: w.z, r: 10 });
    for (const c of CAMPS) exclusions.push({ x: c.x, z: c.z, r: 18 });
    for (const p of PADS) exclusions.push({ x: p.x, z: p.z, r: p.r0 });
    this.exclusions = exclusions;
    this.buildVillage();
    this.buildCamps();
    this.buildDungeonGates();
    this.buildWaypoints();
    this.buildRuins();
    this.buildCollectibles();
    buildVegetation(scene, this.colliders, exclusions, quality);
    this.grass = new GrassField(scene, quality);
    this.spawnNPCs();

    this.env = {
      heightAt: getHeight,
      normalAt: (x, z) => getNormal(x, z),
      waterLevel: WATER_Y,
      waterDepth: (x, z, g) => WATER_Y - (g ?? getHeight(x, z)),
      collide: (pos, r, h) => this.colliders.resolve(pos, r, h),
      blocked: (x, z, y) => this.colliders.blocked(x, z, y),
      clamp: (pos) => { pos.x = clamp(pos.x, -HALF + 45, HALF - 45); pos.z = clamp(pos.z, -HALF + 45, HALF - 45); },
      floorAt: null,
    };
  }

  place(obj, x, z, rot = 0, yOff = 0) {
    obj.position.set(x, getHeight(x, z) + yOff, z);
    obj.rotation.y = rot;
    this.scene.add(obj);
    if (obj.userData.anim) this.anims.push(obj.userData.anim);
    return obj;
  }

  // ---------- Aldea ----------
  buildVillage() {
    const V = VILLAGE;
    const houses = [
      [-45, 125, 0.7, { roof: 0xb84a3a }], [48, 122, -0.8, { roof: 0x3a6ab8, two: true }], [-54, 168, 1.5, { roof: 0x4a8a4a }],
      [56, 200, -2.2, { roof: 0xb8843a }], [-32, 214, 2.6, { roof: 0x8a3a6a, two: true }], [24, 96, 0.1, { roof: 0xb84a3a }],
      [-62, 208, 2.1, { roof: 0x3a6ab8 }], [66, 158, -1.6, { roof: 0x4a8a4a }],
    ];
    for (const [x, z, r, o] of houses) {
      const h = S.house({ ...o, w: 7 + rand(-0.5, 1), d: 6 });
      this.place(h, V.x + x, V.z - 160 + z, r);
      const b = h.userData.box;
      this.colliders.addBox(V.x + x, V.z - 160 + z, b.hw, b.hd, r, getHeight(V.x + x, V.z - 160 + z) + 8);
    }
    const wm = S.windmill(); this.place(wm, -24, 96, 0.4); this.colliders.addCircle(-24, 96, 2.8);
    const well = S.well(); this.place(well, 0, 165); this.colliders.addCircle(0, 165, 1.6);
    const tree = S.bigTree(); this.place(tree, -16, 150); this.colliders.addCircle(-16, 150, 1.4);
    const st = S.stall(0xd9534f); this.place(st, -18, 140.5, Math.PI); this.colliders.addBox(-18, 140.5, 1.6, 0.8, Math.PI);
    const st2 = S.stall(0x3a8ad9); this.place(st2, 26, 146, Math.PI * 0.9); this.colliders.addBox(26, 146, 1.6, 0.8, Math.PI * 0.9);
    const fg = S.forge(); this.place(fg, 46, 172, -Math.PI / 2); this.colliders.addBox(46, 172, 1.4, 1.2, -Math.PI / 2);
    const fire = S.bonfire(); this.place(fire, 10, 182);
    this.interactables.push({ pos: new THREE.Vector3(10, getHeight(10, 182), 182), r: 3, label: 'Descansar junto a la hoguera', kind: 'rest', action: () => G.ui.openRest() });
    // manzanos
    for (const [x, z] of [[-70, 140], [72, 120], [-5, 235], [60, 230]]) {
      const t = S.bigTree(); t.scale.setScalar(0.55); this.place(t, x, z); this.colliders.addCircle(x, z, 0.8);
      const apple = { pos: new THREE.Vector3(x + 1.5, getHeight(x, z), z + 1.5), r: 3, label: 'Recoger manzanas', kind: 'pick', next: 0,
        cond: () => G.time > apple.next, action: () => { G.player.addItem('manzana', randInt(1, 3)); apple.next = G.time + 240; audio.play('pickup'); } };
      this.interactables.push(apple);
    }
    // vallas
    const rnd = mulberry32(5);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      if (Math.abs(Math.sin(a - Math.PI / 2)) > 0.97 || Math.abs(Math.cos(a)) > 0.985 || (a > 1.3 && a < 1.8)) continue;
      const r = 92 + rnd() * 6;
      const x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r;
      if (pathDist(x, z) < 6) continue;
      const f = S.fence(8); this.place(f, x, z, -a + Math.PI / 2);
    }
    // farolas
    for (const [x, z] of [[8, 205], [-8, 120], [30, 160], [-30, 160], [12, 240], [-60, 145], [58, 140]]) {
      const l = S.lantern(); this.place(l, x, z, rand(0, 6)); this.lamps.push(l.userData.lamp);
    }
    // cajas y barriles decorativos
    for (let i = 0; i < 10; i++) { const c = S.crate(); const x = rand(-60, 60), z = V.z + rand(-60, 60); if (Math.hypot(x, z - V.z) < 25) continue; this.place(c, x, z, rand(0, 6)); this.colliders.addCircle(x, z, 0.7); }
  }

  // ---------- Campamentos ----------
  buildCamps() {
    for (const c of CAMPS) {
      const rt = { def: c, spawned: false, enemies: [], cleared: false, clearedAt: -1e9, chestOpened: false };
      this.campRuntime[c.id] = rt;
      if (c.tents) {
        const fire = S.bonfire(); this.place(fire, c.x, c.z);
        for (let i = 0; i < c.tents; i++) {
          const a = (i / c.tents) * Math.PI * 2 + 0.5;
          const tx = c.x + Math.cos(a) * 7, tz = c.z + Math.sin(a) * 7;
          const t = S.tent(c.lvl > 6 ? 0x6a5a4a : 0x9b7b56); this.place(t, tx, tz, -a - Math.PI / 2); this.colliders.addCircle(tx, tz, 2);
        }
        const tt = S.totem(); this.place(tt, c.x + 4, c.z - 5); this.colliders.addCircle(c.x + 4, c.z - 5, 0.4);
        for (let i = 0; i < 3; i++) { const cr = S.crate(); const x = c.x - 5 + i * 1.1, z = c.z + 5; this.place(cr, x, z, rand(0, 1)); }
      }
      if (c.chest) {
        const ch = S.chest(false);
        const x = c.x + 2, z = c.z + 3.5;
        this.place(ch, x, z, rand(0, 6));
        this.colliders.addCircle(x, z, 0.7);
        const it = {
          pos: new THREE.Vector3(x, getHeight(x, z), z), r: 2.6, kind: 'chest', mesh: ch,
          get label() { return rt.cleared ? 'Abrir cofre' : 'Cofre sellado (derrota a los monstruos)'; },
          cond: () => !rt.chestOpened,
          action: () => {
            if (!rt.cleared) { audio.play('deny'); G.ui.toast('El cofre está sellado por la magia de los monstruos'); return; }
            rt.chestOpened = true; this.openChest(ch, c.lvl + 1, 0);
          },
        };
        this.interactables.push(it);
      }
    }
    // cofres ocultos
    CHESTS.forEach(([x, z], i) => {
      const ch = S.chest(i % 3 === 0);
      this.place(ch, x, z, rand(0, 6));
      this.colliders.addCircle(x, z, 0.7);
      const id = 'chest_' + i;
      const lvl = 2 + Math.round(Math.hypot(x, z - 160) / 80);
      const it = { pos: new THREE.Vector3(x, getHeight(x, z), z), r: 2.6, kind: 'chest', label: 'Abrir cofre', mesh: ch,
        cond: () => !G.flags[id], action: () => { G.flags[id] = true; this.openChest(ch, lvl, i % 3 === 0 ? 20 : 5); } };
      this.interactables.push(it);
      if (G.flags[id]) ch.userData.lid.rotation.x = -1.9;
    });
  }
  openChest(ch, lvl, bonus) {
    const pl = G.player;
    audio.play('chest');
    G.companion.say('chest');
    const lid = ch.userData.lid;
    let t = 0;
    const anim = (dt) => { t += dt; lid.rotation.x = -Math.min(1.9, t * 4); return t < 0.6; };
    this.anims.push((dt) => { if (anim(dt) === false) {} });
    G.fx.sparkle(_v.copy(ch.position).setY(ch.position.y + 1), [1, 0.9, 0.4], 40);
    const gold = randInt(20, 50) * lvl;
    pl.gold += gold;
    G.ui.itemGet({ name: `${gold} Lúmenes`, icon: '🪙' }, 1);
    pl.addGear(randomGear(lvl, bonus));
    if (Math.random() < 0.6) pl.addItem(lvl > 6 ? 'pocion' : 'pocion_menor', randInt(1, 2));
    if (Math.random() < 0.3) pl.addItem('elixir', 1);
  }

  // ---------- Mazmorras ----------
  buildDungeonGates() {
    this.gates = {};
    for (const d of DUNGEON_SITES) {
      const def = DUNGEONS[d.id];
      const g = S.dungeonGate(def.portal, def.stone);
      this.place(g, d.x, d.z, d.rot, -0.3);
      for (const [px] of g.userData.pillars) {
        const c = Math.cos(d.rot), s = Math.sin(d.rot);
        this.colliders.addCircle(d.x + px * c, d.z - px * s, 1.1);
      }
      this.gates[d.id] = g;
      this.interactables.push({ pos: new THREE.Vector3(d.x, getHeight(d.x, d.z) + 1, d.z), r: 4.5, kind: 'dungeon', label: `Entrar: ${def.name}`, action: () => G.ui.openDungeonSelect(d.id) });
    }
  }

  // ---------- Piedras de viento ----------
  buildWaypoints() {
    this.wpMeshes = {};
    for (const w of WAYPOINTS) {
      const m = S.waypointStone();
      this.place(m, w.x, w.z);
      this.colliders.addCircle(w.x, w.z, 1.2);
      this.wpMeshes[w.id] = m;
      m.userData.setActive(G.waypoints.has(w.id));
      this.interactables.push({
        pos: new THREE.Vector3(w.x, getHeight(w.x, w.z), w.z), r: 3.6, kind: 'waypoint',
        get label() { return G.waypoints.has(w.id) ? `${w.name} · Viajar` : `Activar ${w.name}`; },
        action: () => {
          if (!G.waypoints.has(w.id)) this.activateWaypoint(w);
          else G.ui.openMenu('mapa');
        },
      });
    }
  }
  activateWaypoint(w) {
    G.waypoints.add(w.id);
    this.wpMeshes[w.id].userData.setActive(true);
    audio.play('portal');
    G.fx.ring(this.wpMeshes[w.id].position, 12, [0.3, 0.9, 1], 1);
    G.fx.sparkle(_v.copy(this.wpMeshes[w.id].position).setY(this.wpMeshes[w.id].position.y + 4), [0.4, 0.9, 1], 60);
    G.ui.bigBanner(w.name, 'Piedra de Viento activada · Viaje rápido disponible');
    G.ui.revealMap(w.x, w.z, 260);
    G.quests.onWaypoint(w.id);
    G.player.hp = G.player.stats.maxHp;
  }
  refreshWaypoints() { for (const id in this.wpMeshes) this.wpMeshes[id].userData.setActive(G.waypoints.has(id)); }

  // ---------- Ruinas ----------
  buildRuins() {
    const rnd = mulberry32(31);
    let n = 0;
    for (let i = 0; i < 400 && n < 45; i++) {
      const x = (rnd() - 0.5) * 1400, z = (rnd() - 0.5) * 1400;
      if (this.exclusions.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < (e.r + 10) ** 2)) continue;
      if (pathDist(x, z) < 6 || getHeight(x, z) < 1.5 || getNormal(x, z).y < 0.85) continue;
      const cnt = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < cnt; k++) {
        const px = x + (rnd() - 0.5) * 12, pz = z + (rnd() - 0.5) * 12;
        const p = S.ruinPillar(3 + rnd() * 5, rnd() < 0.7);
        this.place(p, px, pz, rnd() * 6, -0.2);
        this.colliders.addCircle(px, pz, 0.8);
      }
      n++;
    }
  }

  // ---------- Coleccionables ----------
  buildCollectibles() {
    this.echoes = [];
    ECHOES.forEach(([x, z], i) => {
      const id = 'echo_' + i;
      if (G.echoes.has(id)) return;
      const m = S.echoOrb();
      const gy = Math.max(getHeight(x, z), WATER_Y);
      m.userData.baseY = gy + 1.4;
      this.place(m, x, z, 0, 1.4);
      m.position.y = gy + 1.4;
      this.echoes.push({ id, mesh: m, x, z });
    });
    // setas en el bosque
    this.mushrooms = [];
    const rnd = mulberry32(77);
    let n = 0;
    for (let i = 0; i < 3000 && n < 70; i++) {
      const x = -650 + rnd() * 450, z = -300 + rnd() * 700;
      if (forestDensity(x, z) < 0.55 || getHeight(x, z) < 1) continue;
      const m = S.mushroom();
      this.place(m, x, z, rnd() * 6);
      const it = { pos: new THREE.Vector3(x, getHeight(x, z), z), r: 1.8, kind: 'pick', label: 'Recoger Seta rojiza', mesh: m, next: 0,
        cond: () => G.time > it.next, action: () => { G.player.addItem('seta', 1); it.next = G.time + 300; m.visible = false; audio.play('pickup'); } };
      this.interactables.push(it);
      this.mushrooms.push(it);
      n++;
    }
    // amuleto de Mira
    const am = S.questItemMesh(0x9dff9a);
    am.userData.baseY = getHeight(372, 262) + 0.8;
    this.place(am, 372, 262, 0, 0.8);
    this.amulet = am;
    this.interactables.push({ pos: new THREE.Vector3(372, getHeight(372, 262), 262), r: 2.2, kind: 'pick', label: 'Recoger amuleto', mesh: am,
      cond: () => G.quests.atStage('sq_amuleto', 0) && !G.player.count('amuleto_mira'),
      action: () => { G.player.addItem('amuleto_mira', 1); audio.play('pickup'); } });
  }

  // ---------- NPCs ----------
  spawnNPCs() {
    this.npcs = [];
    for (const id in NPCS) {
      const d = NPCS[id];
      const n = new NPC(id, d);
      n.place(this.scene, d.x, getHeight(d.x, d.z), d.z);
      this.npcs.push(n);
      this.interactables.push({ pos: n.pos, r: 2.8, kind: 'npc', label: `Hablar · ${d.name}`, npc: n, action: () => n.talk() });
    }
    G.npcs = this.npcs;
  }

  // ---------- Actualización ----------
  update(dt) {
    const pl = G.player;
    this.sky.update(dt, pl.pos);
    this.water.userData.update(dt, this.sky);
    const light = _v.set(1, 1, 1).multiplyScalar(0.55 + this.sky.sun.intensity * 0.22 + this.sky.hemi.intensity * 0.2);
    this.grass.setLight(new THREE.Color(Math.min(1.25, light.x), Math.min(1.25, light.y), Math.min(1.25, light.z)).lerp(this.sky.uniforms.sunColor.value, 0.12));
    this.grass.update(dt, pl.pos, true);
    for (const a of this.anims) a(dt, G.time);
    // farolas por la noche
    const night = G.dayTime < 6.5 || G.dayTime > 18.8;
    for (const l of this.lamps) l.material.color.set(night ? 0xffd27a : 0x9a8a6a);
    for (const n of this.npcs) n.update(dt);
    // ecos
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const e = this.echoes[i];
      const d = Math.hypot(pl.pos.x - e.x, pl.pos.z - e.z);
      if (d < 1.8 && Math.abs(pl.pos.y + 1 - e.mesh.position.y) < 2.5) {
        G.echoes.add(e.id);
        this.scene.remove(e.mesh);
        this.echoes.splice(i, 1);
        audio.play('echo');
        G.fx.sparkle(e.mesh.position, [0.7, 1, 0.5], 40);
        const n = G.echoes.size;
        G.ui.bigBanner('¡Eco del Bosque!', `${n} / ${ECHOES.length} encontrados` + (n % 3 === 0 ? ' · +1 punto de habilidad' : ''));
        if (n % 3 === 0) pl.skillPts++;
        pl.addXp(40);
        G.companion.say('echo');
        G.quests.onEcho();
      }
    }
    for (const m of this.mushrooms) if (!m.mesh.visible && G.time > m.next) m.mesh.visible = true;
    this.amulet.visible = G.quests.atStage('sq_amuleto', 0) && !pl.count('amuleto_mira');
    this.updateCamps();
    this.updateRoamers(dt);
    // regiones y niebla del mapa
    this.regionT -= dt;
    if (this.regionT <= 0) {
      this.regionT = 1;
      G.ui.revealMap(pl.pos.x, pl.pos.z, 90);
      let best = null, bs = 1e9;
      for (const r of REGIONS) {
        const d = Math.hypot(pl.pos.x - r.x, pl.pos.z - r.z) / r.r;
        if (d < 1 && d < bs) { bs = d; best = r; }
      }
      if (best && best !== this.curRegion) {
        this.curRegion = best;
        if (!G.regions.has(best.id)) {
          G.regions.add(best.id);
          G.ui.bigBanner(best.name, 'Nueva región descubierta');
          pl.addXp(30);
        } else G.ui.regionName(best.name);
      }
      const inVillage = Math.hypot(pl.pos.x - VILLAGE.x, pl.pos.z - VILLAGE.z) < 100;
      this.inVillage = inVillage;
    }
  }

  updateCamps() {
    const pl = G.player;
    for (const id in this.campRuntime) {
      const rt = this.campRuntime[id], c = rt.def;
      const d = Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z);
      if (!rt.spawned && d < 150) {
        if (rt.cleared && G.time - rt.clearedAt < 600) continue;
        if (rt.cleared) { rt.cleared = false; rt.chestOpened = rt.chestOpened; }
        rt.spawned = true; rt.enemies = [];
        c.enemies.forEach((type, i) => {
          const a = (i / c.enemies.length) * Math.PI * 2;
          const r = type === 'wolf' ? 4 : 5 + Math.random() * 3;
          const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
          const e = spawnEnemy(type, c.lvl + (Math.random() < 0.3 ? 1 : 0), new THREE.Vector3(x, getHeight(x, z), z), { camp: id });
          rt.enemies.push(e);
        });
      } else if (rt.spawned && d > 220) {
        for (const e of rt.enemies) if (!e.dead) { e.remove(); const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); }
        rt.spawned = false; rt.enemies = [];
      } else if (rt.spawned && !rt.cleared && rt.enemies.length && rt.enemies.every((e) => e.dead)) {
        rt.cleared = true; rt.clearedAt = G.time;
        G.ui.toast('⚔️ Campamento despejado');
        if (c.chest && !rt.chestOpened) G.ui.toast('El cofre del campamento se ha desbloqueado');
        pl.addXp(20 * c.lvl);
      }
    }
  }

  // Monstruos errantes: espectros de noche, lobos en el bosque, trasgos en las praderas
  updateRoamers(dt) {
    this.roamT = (this.roamT ?? 20) - dt;
    if (this.roamT > 0) return;
    this.roamT = 15;
    const pl = G.player;
    this.roamers = (this.roamers || []).filter((e) => {
      if (e.dead) return false;
      if (e.pos.distanceTo(pl.pos) > 170 && !e.aggro) { e.remove(); const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); return false; }
      return true;
    });
    if (this.inVillage || this.roamers.length >= 4 || Math.random() < 0.35) return;
    const night = G.dayTime < 5.5 || G.dayTime > 20;
    const a = Math.random() * Math.PI * 2, r = rand(45, 65);
    const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r;
    const h = getHeight(x, z);
    if (h < 1 || Math.abs(x) > HALF - 60 || Math.abs(z) > HALF - 60 || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 130) return;
    const type = night ? 'wisp' : forestDensity(x, z) > 0.5 ? 'wolf' : 'goblin';
    const lvl = clamp(Math.round(1 + Math.hypot(x - VILLAGE.x, z - VILLAGE.z) / 65), 1, 16);
    const n = type === 'wisp' ? 1 : randInt(1, 3);
    for (let i = 0; i < n; i++) {
      const px = x + rand(-3, 3), pz = z + rand(-3, 3);
      this.roamers.push(spawnEnemy(type, lvl, new THREE.Vector3(px, getHeight(px, pz), pz)));
    }
  }

  nearestInteractable(pos) {
    let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (it.cond && !it.cond()) continue;
      const d = Math.hypot(pos.x - it.pos.x, pos.z - it.pos.z);
      if (d < it.r && d < bd && Math.abs(pos.y - it.pos.y) < 4) { bd = d; best = it; }
    }
    return best;
  }

  serializeCamps() {
    const o = {};
    for (const id in this.campRuntime) { const r = this.campRuntime[id]; o[id] = { chestOpened: r.chestOpened }; }
    return o;
  }
  loadCamps(o) { if (!o) return; for (const id in o) if (this.campRuntime[id]) this.campRuntime[id].chestOpened = o[id].chestOpened; }
}
