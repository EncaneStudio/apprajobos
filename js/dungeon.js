import * as THREE from 'three';
import { G } from './state.js';
import { audio } from './audio.js';
import { Colliders } from './world/colliders.js';
import * as S from './world/structures.js';
import { spawnEnemy, clearProjectiles } from './enemies.js';
import { randomGear, rollRarity, makeGear } from './data/items.js';
import { GEO, mergeColored, vcToonMat, canvasTexture, rand, randInt, choice, fmt } from './util.js';

export const DUNGEONS = {
  bosque: { name: 'Santuario Musgoso', baseLevel: 4, portal: 0x7aff5a, stone: 0x7d8a6a, rooms: 5, enemies: ['goblin', 'wolf', 'archer', 'goblin'], boss: 'boss_treant', reward: 'frag_verde', par: 300,
    theme: { floor: 0x6a7a5a, floor2: 0x5a6a4a, wall: 0x56664a, accent: 0x7aff5a, fog: 0x1c2a1a, amb: 0x8aa878, prop: 'roots' }, desc: 'Un santuario engullido por el bosque. Algo antiguo protege sus raíces.' },
  templo: { name: 'Templo Sumergido', baseLevel: 6, portal: 0x3af0ff, stone: 0x6a8a9a, rooms: 5, enemies: ['goblin', 'archer', 'wisp'], boss: 'boss_serpent', reward: 'frag_azul', par: 330,
    theme: { floor: 0x4a6a7a, floor2: 0x3e5a6a, wall: 0x3a5a6a, accent: 0x3af0ff, fog: 0x0e1e2a, amb: 0x7799bb, prop: 'water' }, desc: 'Salas inundadas bajo el Lago Espejo. Algo enorme se mueve bajo el agua.' },
  cripta: { name: 'Cripta Helada', baseLevel: 8, portal: 0xc8f0ff, stone: 0x9aaab8, rooms: 5, enemies: ['golem', 'wisp', 'wolf'], boss: 'boss_golem', reward: 'frag_blanco', par: 360,
    theme: { floor: 0x9ab0c0, floor2: 0x8aa0b4, wall: 0x7a90a8, accent: 0x8ae8ff, fog: 0x1a2230, amb: 0xa0b8d0, prop: 'ice' }, desc: 'Túneles de hielo eterno excavados por gigantes de piedra.' },
  ciudadela: { name: 'Ciudadela Caída', baseLevel: 12, portal: 0xc050ff, stone: 0x5a5060, rooms: 6, enemies: ['brute', 'wisp', 'golem', 'archer', 'goblin'], boss: 'boss_herald', final: true, par: 480,
    theme: { floor: 0x4a4050, floor2: 0x3e3446, wall: 0x3a3040, accent: 0xc050ff, fog: 0x120a1a, amb: 0x8a70a0, prop: 'void' }, desc: 'El corazón del Vacío. El Heraldo aguarda en el salón del trono.' },
  arena: { name: 'Arena de los Ecos', baseLevel: 5, portal: 0xffb040, stone: 0x9a8a6a, arena: true, waves: 8, enemies: ['goblin', 'archer', 'wolf', 'brute', 'wisp', 'golem'], boss: 'boss_ogre', par: 420,
    theme: { floor: 0xb09a70, floor2: 0xa08a60, wall: 0x8a7a5a, accent: 0xffb040, fog: 0x2a2014, amb: 0xc0a880, prop: 'arena' }, desc: 'Ocho oleadas de enemigos y un campeón. Solo para los valientes.' },
};

export const DIFFS = [
  { name: 'Normal', hp: 1, dmg: 1, lvl: 0, loot: 0, xp: 1, color: '#9fe8a0' },
  { name: 'Difícil', hp: 1.7, dmg: 1.4, lvl: 3, loot: 15, xp: 1.6, color: '#ffd84a' },
  { name: 'Heroico', hp: 2.6, dmg: 1.9, lvl: 6, loot: 30, xp: 2.4, color: '#ff8a3a' },
  { name: 'Mítico', hp: 4, dmg: 2.6, lvl: 10, loot: 50, xp: 3.5, color: '#ff4fd8' },
];

const ROOM = 36, CORR = 16, BOSS_ROOM = 52;
const _v = new THREE.Vector3();

// Diana de cristal para el puzle
class Crystal {
  constructor(pos, color, onLit) {
    this.pos = pos.clone(); this.radius = 0.8; this.height = 3; this.dead = false; this.active = true; this.lit = false; this.crystal = true; this.heavy = true;
    this.name = 'Cristal de Eco'; this.level = 0; this.maxHp = 1; this.hp = 1;
    this.mesh = new THREE.Group();
    const base = new THREE.Mesh(mergeColored([{ g: new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8), c: 0x6a6a72, p: [0, 0.3, 0] }]), vcToonMat());
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), new THREE.MeshToonMaterial({ color: 0x5a6a7a, emissive: 0x111111 }));
    this.core.position.y = 2; this.core.scale.set(0.8, 1.5, 0.8);
    this.mesh.add(base, this.core);
    this.mesh.position.copy(pos);
    this.color = color; this.onLit = onLit;
  }
  addTo(s) { s.add(this.mesh); }
  remove() { this.mesh.parent?.remove(this.mesh); }
  takeHit() {
    if (this.lit) return;
    this.lit = true;
    this.core.material.color.set(this.color); this.core.material.emissive.set(this.color); this.core.material.emissiveIntensity = 0.8;
    audio.play('echo');
    G.fx.sparkle(_v.copy(this.pos).setY(2), [0.6, 1, 1], 30);
    this.active = false;
    this.onLit();
  }
  pullTo() {} airHold() {} setAggro() {}
  update(dt) { this.core.rotation.y += dt * (this.lit ? 3 : 0.5); return true; }
}

export class Dungeon {
  constructor(id, diffIdx) {
    this.id = id; this.def = DUNGEONS[id]; this.diffIdx = diffIdx; this.diff = DIFFS[diffIdx];
    this.level = Math.max(this.def.baseLevel, G.player.level) + this.diff.lvl;
    this.scene = new THREE.Scene();
    this.colliders = new Colliders(12);
    this.doors = [];
    this.rooms = [];
    this.anims = [];
    this.interactables = [];
    this.startTime = G.time;
    this.hurtCount = 0;
    this.deaths = 0;
    this.completed = false;
    this.waveI = 0; this.waveT = 0;
    this.build();
    this.env = {
      heightAt: () => 0,
      normalAt: () => _v.set(0, 1, 0),
      waterLevel: -100,
      waterDepth: null,
      collide: (pos, r, h) => { this.colliders.resolve(pos, r, h); for (const d of this.doors) if (d.closed) this.resolveDoor(d, pos, r); },
      clamp: () => {},
      blocked: (x, z, y) => y < 7.5 && this.colliders.blocked(x, z, y),
      floorAt: null,
    };
  }

  // ---------- construcción ----------
  build() {
    const th = this.def.theme, sc = this.scene;
    sc.background = new THREE.Color(th.fog);
    sc.fog = new THREE.Fog(th.fog, 25, 95);
    sc.add(new THREE.HemisphereLight(th.amb, 0x202020, 1.1));
    sc.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(20, 40, 10); sc.add(dl);
    this.floorTex = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, w / 2 - 2, h / 2 - 2); ctx.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 2);
      ctx.strokeRect(1, h / 2 + 1, w / 2 - 2, h / 2 - 2); ctx.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 2, h / 2 - 2);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    }, true);
    if (this.def.arena) this.buildArena();
    else this.buildRooms();
  }
  floorMat(c, rep) { const t = this.floorTex.clone(); t.needsUpdate = true; t.repeat.set(rep, rep); return new THREE.MeshLambertMaterial({ color: c, map: t }); }
  addWall(x, z, w, d, h = 7) {
    const th = this.def.theme;
    const m = new THREE.Mesh(mergeColored([
      { g: GEO.box, c: th.wall, p: [0, h / 2, 0], s: [w, h, d] },
      { g: GEO.box, c: 0x2a2a2a, p: [0, 0.25, 0], s: [w + 0.2, 0.5, d + 0.2] },
      { g: GEO.box, c: th.wall, p: [0, h + 0.3, 0], s: [w + 0.4, 0.6, d + 0.4] },
    ]), vcToonMat());
    m.position.set(x, 0, z);
    this.scene.add(m);
    this.colliders.addBox(x, z, w / 2, d / 2, 0);
  }
  addTorch(x, z, light = false) {
    const th = this.def.theme;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(mergeColored([{ g: GEO.cyl, c: 0x3a3a3a, p: [0, 1.3, 0], s: [0.3, 2.6, 0.3] }, { g: GEO.cyl, c: 0x2a2a2a, p: [0, 2.7, 0], s: [0.7, 0.3, 0.7] }]), vcToonMat()));
    const f = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.9 }));
    f.position.y = 3.3; f.scale.set(0.5, 1, 0.5);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glowTexture(), color: th.accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.y = 3.3; halo.scale.setScalar(3);
    g.add(f, halo);
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.colliders.addCircle(x, z, 0.4);
    const ph = Math.random() * 10;
    this.anims.push((dt, t) => { f.scale.y = 1 + Math.sin(t * 12 + ph) * 0.15; halo.material.opacity = 0.7 + Math.sin(t * 9 + ph) * 0.2; });
    if (light) { const pl = new THREE.PointLight(th.accent, 40, 30, 1.6); pl.position.set(x, 4, z); this.scene.add(pl); }
  }
  addProps(cx, cz, half) {
    const th = this.def.theme;
    const prop = th.prop;
    const items = [];
    const R = () => rand(-half + 4, half - 4);
    for (let i = 0; i < 7; i++) {
      const x = R(), z = R();
      if (Math.hypot(x, z) < 6 || Math.abs(x) < 5) continue;
      if (prop === 'roots') items.push({ g: GEO.cyl, c: 0x5a4028, p: [x, 0.3, z], r: [Math.PI / 2, rand(0, 3), rand(-0.3, 0.3)], s: [0.4, rand(4, 8), 0.4] }, { g: GEO.ico, c: 0x4a8a3a, p: [x + 1, 0.4, z], s: [1.4, 0.8, 1.4] });
      else if (prop === 'ice' || prop === 'void') items.push({ g: new THREE.OctahedronGeometry(1, 0), c: prop === 'ice' ? 0xbfeaff : 0x9a4ad0, p: [x, 1.2, z], r: [rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3)], s: [0.6, rand(1.5, 2.8), 0.6] });
      else if (prop === 'water') items.push({ g: new THREE.CylinderGeometry(2.4, 2.4, 0.05, 16), c: 0x3a9ab8, p: [x, 0.03, z] });
      else items.push({ g: GEO.box, c: 0x8a6a48, p: [x, 0.5, z], s: [1, 1, 1] });
    }
    if (items.length) { const m = new THREE.Mesh(mergeColored(items), vcToonMat()); m.position.set(cx, 0, cz); this.scene.add(m); }
  }
  buildRooms() {
    const n = this.def.rooms, th = this.def.theme;
    let z = 0;
    const layout = [];
    for (let i = 0; i < n; i++) {
      const boss = i === n - 1;
      const half = (boss ? BOSS_ROOM : ROOM) / 2;
      const cz = z - half;
      let type = i === 0 ? 'entry' : boss ? 'boss' : 'combat';
      if (i === 2 && n >= 5) type = 'crystals';
      layout.push({ i, cz, half, type });
      z = cz - half - CORR;
    }
    for (const r of layout) {
      const { cz, half } = r;
      // suelo
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), this.floorMat(r.type === 'boss' ? th.floor2 : th.floor, half / 3));
      fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, cz);
      this.scene.add(fl);
      // paredes con huecos para pasillos (ancho 8)
      const gap = 4;
      const seg = half - gap;
      // norte (−z) y sur (+z)
      for (const side of [-1, 1]) {
        const wz = cz + side * half;
        const hasGap = (side === -1 && r.i < layout.length - 1) || (side === 1 && r.i > 0);
        if (hasGap) { this.addWall(-(gap + seg / 2), wz, seg, 1.2); this.addWall(gap + seg / 2, wz, seg, 1.2); }
        else this.addWall(0, wz, half * 2, 1.2);
      }
      this.addWall(-half, cz, 1.2, half * 2);
      this.addWall(half, cz, 1.2, half * 2);
      // columnas y antorchas
      const pc = half * 0.55;
      for (const [px, pz] of [[pc, pc], [-pc, pc], [pc, -pc], [-pc, -pc]]) {
        if (r.type === 'boss' && Math.random() < 0.5) continue;
        const p = S.ruinPillar(6, false); p.position.set(px, 0, cz + pz); this.scene.add(p); this.colliders.addCircle(px, cz + pz, 0.85);
      }
      this.addTorch(half - 2.5, cz + half - 2.5, true); this.addTorch(-half + 2.5, cz - half + 2.5, false);
      this.addTorch(-half + 2.5, cz + half - 2.5, false); this.addTorch(half - 2.5, cz - half + 2.5, r.type === 'boss');
      if (r.type !== 'entry') this.addProps(0, cz, half);
      // pasillo hacia la siguiente sala
      if (r.i < layout.length - 1) {
        const cz2 = cz - half - CORR / 2;
        const cf = new THREE.Mesh(new THREE.PlaneGeometry(gap * 2, CORR + 0.5), this.floorMat(th.floor2, 2));
        cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0, cz2); this.scene.add(cf);
        this.addWall(-gap - 0.6, cz2, 1.2, CORR); this.addWall(gap + 0.6, cz2, 1.2, CORR);
        // puertas en ambos extremos
        r.exitDoor = this.addDoor(0, cz - half);
        layout[r.i + 1].entryDoor = this.addDoor(0, cz - half - CORR);
      }
      this.rooms.push({ ...r, cleared: r.type === 'entry', started: false, waves: 0 });
    }
    // portal de salida en la entrada
    const entry = this.rooms[0];
    this.spawnPoint = new THREE.Vector3(0, 0, entry.cz + entry.half - 6);
    this.addExitPortal(new THREE.Vector3(0, 0, entry.cz + entry.half - 2), false);
    const sign = S.waypointStone(); sign.position.set(8, 0, entry.cz + 4); sign.userData.setActive(true); this.scene.add(sign); this.anims.push(sign.userData.anim);
    this.colliders.addCircle(8, entry.cz + 4, 1.2);
  }
  buildArena() {
    const th = this.def.theme;
    const half = 30;
    const fl = new THREE.Mesh(new THREE.CircleGeometry(half, 48), this.floorMat(th.floor, 10));
    fl.rotation.x = -Math.PI / 2; this.scene.add(fl);
    const ring = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = Math.cos(a) * (half + 1), z = Math.sin(a) * (half + 1);
      ring.push({ g: GEO.box, c: th.wall, p: [x, 2.5, z], r: [0, -a, 0], s: [1.5, 5, 5] });
      ring.push({ g: GEO.box, c: 0x7a6a4a, p: [Math.cos(a) * (half + 5), 5, Math.sin(a) * (half + 5)], r: [0, -a, 0], s: [4, 10, 5.2] });
      this.colliders.addCircle(x, z, 2.6);
    }
    const m = new THREE.Mesh(mergeColored(ring), vcToonMat()); this.scene.add(m);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.addTorch(Math.cos(a) * (half - 3), Math.sin(a) * (half - 3), i % 2 === 0); }
    this.rooms.push({ i: 0, cz: 0, half, type: 'arena', cleared: false, started: false });
    this.spawnPoint = new THREE.Vector3(0, 0, half - 6);
    this.addExitPortal(new THREE.Vector3(0, 0, half - 2.5), false);
  }
  addDoor(x, z) {
    const th = this.def.theme;
    const bars = [];
    for (let i = -3; i <= 3; i++) bars.push({ g: GEO.cyl, c: 0x3a3a40, p: [i * 1.1, 3, 0], s: [0.22, 6, 0.22] });
    bars.push({ g: GEO.box, c: 0x3a3a40, p: [0, 5.5, 0], s: [8, 0.4, 0.3] });
    const m = new THREE.Mesh(mergeColored(bars), vcToonMat({ emissive: th.accent, emissiveIntensity: 0.15 }));
    m.position.set(x, -6.5, z);
    this.scene.add(m);
    const d = { x, z, mesh: m, closed: false, y: -6.5 };
    this.doors.push(d);
    return d;
  }
  resolveDoor(d, pos, r) {
    if (Math.abs(pos.x - d.x) > 4.5) return;
    const dz = pos.z - d.z;
    if (Math.abs(dz) < r + 0.3) pos.z = d.z + Math.sign(dz || 1) * (r + 0.3);
  }
  setDoors(room, closed) {
    for (const d of [room.entryDoor, room.exitDoor]) if (d) { d.closed = closed; }
    audio.play(closed ? 'boom' : 'portal');
  }
  addExitPortal(pos, final) {
    const g = S.dungeonGate(this.def.portal, this.def.stone);
    g.scale.setScalar(0.6);
    g.position.copy(pos);
    this.scene.add(g); this.anims.push(g.userData.anim);
    this.interactables.push({ pos: pos.clone(), r: 3.5, kind: 'exit', label: final ? 'Salir victorioso de la mazmorra' : 'Salir de la mazmorra', action: () => G.game.exitDungeon() });
    return g;
  }

  // ---------- combate de salas ----------
  enemyTypes() { return this.def.enemies; }
  spawnWave(room, count, types) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), r = rand(5, room.half - 5);
      const p = new THREE.Vector3(Math.cos(a) * r, 0, room.cz + Math.sin(a) * r);
      const type = choice(types);
      const e = spawnEnemy(type, this.level + (Math.random() < 0.25 ? 1 : 0), p, { dungeon: true, diff: this.diff });
      e.setAggro();
      e.xp = Math.round(e.xp * this.diff.xp);
      G.fx.deathPuff(p, [0.4, 0.4, 0.5]);
      list.push(e);
    }
    return list;
  }
  startRoom(room) {
    room.started = true;
    if (room.type === 'combat') {
      this.setDoors(room, true);
      const base = 3 + Math.floor(room.i / 2) + (this.diffIdx >= 2 ? 1 : 0);
      room.waveList = [base, base + 1];
      room.wave = 0;
      room.enemies = this.spawnWave(room, room.waveList[0], this.enemyTypes().filter((t) => t !== 'golem' || room.i > 1));
      G.ui.toast(`⚔️ Oleada 1/${room.waveList.length}`);
    } else if (room.type === 'crystals') {
      this.setDoors(room, true);
      room.lit = 0;
      G.ui.toast('💎 Golpea los tres Cristales de Eco para abrir las puertas');
      const cols = [0xff6a6a, 0x6aff9a, 0x6ab0ff];
      room.crystals = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        const c = new Crystal(new THREE.Vector3(Math.cos(a) * 11, 0, room.cz + Math.sin(a) * 11), cols[i], () => {
          room.lit++;
          if (room.lit >= 3) this.clearRoom(room, true);
        });
        c.addTo(this.scene);
        G.enemies.push(c);
        room.crystals.push(c);
      }
      room.enemies = this.spawnWave(room, 2 + Math.floor(this.diffIdx / 2), this.enemyTypes());
    } else if (room.type === 'boss') {
      this.setDoors(room, true);
      const p = new THREE.Vector3(0, 0, room.cz - 8);
      const boss = spawnEnemy(this.def.boss, this.level + 2, p, { dungeon: true, diff: this.diff });
      boss.xp = Math.round(boss.xp * this.diff.xp);
      boss.setAggro();
      boss.onDeath = () => this.bossDefeated(boss);
      room.boss = boss;
      G.ui.bossBar(boss);
      G.ui.bigBanner(boss.name, 'Guardián de ' + this.def.name, 'boss');
      G.companion.say('boss', true);
      audio.setMode('boss');
      G.shake = 0.5;
    } else if (room.type === 'arena') {
      this.waveI = 0; this.waveT = 2.5; room.enemies = [];
      G.ui.bigBanner('Arena de los Ecos', `Sobrevive a ${this.def.waves} oleadas`, 'boss');
      audio.setMode('combat');
    }
  }
  clearRoom(room, chest = false) {
    room.cleared = true;
    this.setDoors(room, false);
    G.ui.toast('✅ Sala despejada · las puertas se abren');
    if (room.crystals) for (const c of room.crystals) { c.remove(); const i = G.enemies.indexOf(c); if (i >= 0) G.enemies.splice(i, 1); }
    if (room.enemies) for (const e of room.enemies) if (!e.dead) e.die();
    if (chest || room.i === 1) this.spawnChest(new THREE.Vector3(0, 0, room.cz), false);
    audio.setMode('dungeon');
  }
  spawnChest(pos, big) {
    const ch = S.chest(big);
    if (big) ch.scale.setScalar(1.5);
    ch.position.copy(pos);
    this.scene.add(ch);
    G.fx.sparkle(_v.copy(pos).setY(1), [1, 0.9, 0.4], 40);
    const it = { pos: pos.clone(), r: 2.8, kind: 'chest', label: big ? 'Abrir cofre del tesoro' : 'Abrir cofre', opened: false,
      cond: () => !it.opened,
      action: () => {
        it.opened = true;
        ch.userData.lid.rotation.x = -1.9;
        audio.play('chest');
        if (big) this.bigReward(); else this.smallReward();
      } };
    this.interactables.push(it);
  }
  smallReward() {
    const pl = G.player;
    const gold = randInt(30, 60) * this.level * (1 + this.diffIdx * 0.5);
    pl.gold += Math.round(gold);
    G.ui.itemGet({ name: `${Math.round(gold)} Lúmenes`, icon: '🪙' }, 1);
    pl.addItem(this.level > 8 ? 'pocion' : 'pocion_menor', randInt(1, 2));
    if (Math.random() < 0.5 + this.diffIdx * 0.15) pl.addGear(randomGear(this.level, this.diff.loot));
  }
  bigReward() {
    const pl = G.player;
    const gold = Math.round(120 * this.level * (1 + this.diffIdx));
    pl.gold += gold;
    G.ui.itemGet({ name: `${fmt(gold)} Lúmenes`, icon: '🪙' }, 1);
    const n = 1 + this.diffIdx + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) pl.addGear(randomGear(this.level, this.diff.loot + 10));
    if (this.diffIdx >= 3 || Math.random() < 0.08 * (this.diffIdx + 1)) pl.addGear(makeGear(choice(['chest', 'amulet', 'rune', 'head']), this.level, 4));
    pl.addItem('pocion', 2 + this.diffIdx);
    pl.addItem('elixir', 1 + this.diffIdx);
    if (this.def.reward && !pl.count(this.def.reward)) {
      pl.addItem(this.def.reward, 1);
      G.ui.bigBanner('¡Fragmento del Hilo Eterno!', 'Hebra recupera parte de su poder · +10% daño', 'main');
      G.companion.say('fragment', true);
      pl.skillPts += 1;
    }
  }
  bossDefeated(boss) {
    G.ui.bossBar(null);
    audio.setMode('dungeon');
    G.companion.say('bossKill', true);
    const room = this.rooms[this.rooms.length - 1];
    for (const e of G.enemies) if (!e.dead && e !== boss) e.die();
    if (room.entryDoor) room.entryDoor.closed = false;
    setTimeout(() => this.complete(room), 1800);
  }
  complete(room) {
    if (this.completed) return;
    this.completed = true;
    const time = G.time - this.startTime;
    const style = G.style.samples ? G.style.total / G.style.samples : 0;
    let score = 0;
    score += time < this.def.par ? 3 : time < this.def.par * 1.6 ? 2 : 1;
    score += style > 3 ? 3 : style > 2 ? 2 : style > 1 ? 1 : 0;
    score += this.deaths === 0 ? 2 : 0;
    score += this.hurtCount < 5 ? 1 : 0;
    const rank = score >= 8 ? 'S' : score >= 6 ? 'A' : score >= 4 ? 'B' : 'C';
    const pl = G.player;
    const xp = Math.round(this.def.baseLevel * 90 * this.diff.xp * (rank === 'S' ? 1.5 : rank === 'A' ? 1.25 : 1));
    pl.addXp(xp);
    const prev = G.dungeonClears[this.id] || 0;
    G.dungeonClears[this.id] = Math.max(prev, this.diffIdx + 1);
    const best = G.dungeonBest[this.id + '_' + this.diffIdx];
    if (!best || time < best) G.dungeonBest[this.id + '_' + this.diffIdx] = time;
    const cz = this.def.arena ? 0 : room.cz;
    this.spawnChest(new THREE.Vector3(0, 0, cz), true);
    this.addExitPortal(new THREE.Vector3(0, 0, cz - (this.def.arena ? 12 : 14)), true);
    G.ui.dungeonComplete({ name: this.def.name, diff: this.diff, time, rank, xp, newDiff: prev < this.diffIdx + 1 && this.diffIdx < 3 ? DIFFS[this.diffIdx + 1].name : null });
    G.quests.onDungeon(this.id, this.diffIdx);
    G.save?.();
  }

  // ---------- actualización ----------
  update(dt) {
    for (const a of this.anims) a(dt, G.time);
    for (const d of this.doors) { const ty = d.closed ? 0 : -6.5; d.y += (ty - d.y) * Math.min(1, dt * 8); d.mesh.position.y = d.y; }
    const pl = G.player;
    for (const room of this.rooms) {
      if (room.cleared) continue;
      const inside = Math.abs(pl.pos.x) < room.half - 2 && Math.abs(pl.pos.z - room.cz) < room.half - 2;
      if (!room.started && inside) { this.startRoom(room); if (room.type === 'combat') { audio.setMode('combat'); if (!G.flags.dCombat) { G.flags.dCombat = true; } } }
      if (room.started && room.type === 'combat') {
        const alive = room.enemies.filter((e) => !e.dead).length;
        if (alive === 0) {
          room.wave++;
          if (room.wave < room.waveList.length) {
            room.enemies = this.spawnWave(room, room.waveList[room.wave], this.enemyTypes());
            G.ui.toast(`⚔️ Oleada ${room.wave + 1}/${room.waveList.length}`);
          } else this.clearRoom(room);
        }
      }
      if (room.started && room.type === 'arena' && !room.cleared) this.updateArena(dt, room);
    }
  }
  updateArena(dt, room) {
    const alive = room.enemies.filter((e) => !e.dead).length;
    if (alive > 0) return;
    if (this.waveI >= this.def.waves) {
      room.cleared = true;
      this.complete(room);
      return;
    }
    this.waveT -= dt;
    if (this.waveT > 0) return;
    this.waveI++;
    this.waveT = 3;
    const w = this.waveI;
    if (w === this.def.waves) {
      G.ui.bigBanner(`Oleada final`, 'El campeón entra en la arena', 'boss');
      const boss = spawnEnemy(this.def.boss, this.level + 2, new THREE.Vector3(0, 0, -10), { dungeon: true, diff: this.diff });
      boss.setAggro(); boss.xp = Math.round(boss.xp * this.diff.xp);
      boss.onDeath = () => { G.ui.bossBar(null); };
      G.ui.bossBar(boss);
      room.enemies = [boss];
      audio.setMode('boss');
    } else {
      G.ui.bigBanner(`Oleada ${w}`, `${this.def.waves - w} restantes`, 'side');
      const pool = this.def.enemies.slice(0, Math.min(this.def.enemies.length, 2 + Math.floor(w / 1.5)));
      room.enemies = this.spawnWave(room, 3 + w, pool);
      if (w === 4) room.enemies.push(...this.spawnWave(room, 1, ['brute']));
    }
  }
  nearestInteractable(pos) {
    let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (it.cond && !it.cond()) continue;
      const d = Math.hypot(pos.x - it.pos.x, pos.z - it.pos.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  onPlayerDeath() {
    this.deaths++;
    // reiniciar la sala en curso
    for (const room of this.rooms) {
      if (room.started && !room.cleared) {
        room.started = false;
        this.setDoors(room, false);
        if (room.crystals) for (const c of room.crystals) c.remove();
        room.crystals = null;
      }
    }
    for (const e of G.enemies) e.remove();
    G.enemies.length = 0;
    clearProjectiles();
    G.ui.bossBar(null);
    audio.setMode('dungeon');
  }
  dispose() {
    const shared = new Set(Object.values(GEO));
    this.scene.traverse((o) => { if (o.isMesh && !o.isSprite && o.geometry && !shared.has(o.geometry)) o.geometry.dispose(); });
  }
}
