import * as THREE from 'three';
import { G } from './state.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { World } from './world/world.js';
import { Player } from './player.js';
import { ThirdPersonCam } from './camera.js';
import { FX } from './effects.js';
import { Style } from './combat.js';
import { UI, controlsHTML } from './ui.js';
import { Quests } from './quests.js';
import { Companion } from './companion.js';
import { updateEnemies, updateProjectiles, clearProjectiles } from './enemies.js';
import { Dungeon, DUNGEONS } from './dungeon.js';
import { WAYPOINTS, DUNGEON_SITES, VILLAGE } from './data/worlddata.js';
import { setUid } from './data/items.js';
import { getHeight } from './world/terrain.js';

const SAVE_KEY = 'sylvaren_save_v1';
const $ = (s) => document.querySelector(s);

class Game {
  constructor() { G.game = this; }

  async boot() {
    // ajustes
    try { Object.assign(G.settings, JSON.parse(localStorage.getItem('sylvaren_settings') || '{}')); } catch (e) {}
    G.isTouch = G.settings.touch === 'on' || (G.settings.touch === 'auto' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window));
    const q = G.settings.quality;
    G.quality = q !== 'auto' ? q : G.isTouch ? 'baja' : 'media';
    this.applyTouch();
    $('#controlsHelp').innerHTML = controlsHTML();

    const canvas = $('#game');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: G.quality !== 'baja', powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, G.quality === 'alta' ? 2 : G.quality === 'media' ? 1.5 : 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = G.quality !== 'baja';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    G.renderer = renderer;
    G.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1400);
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); });
    input.init(canvas);

    // estado persistente base
    G.waypoints = new Set(); G.echoes = new Set(); G.regions = new Set();
    G.dungeonClears = {}; G.dungeonBest = {}; G.playTime = 0;
    G.quests = new Quests();
    G.companion = new Companion();
    G.style = new Style();
    G.ui = new UI(); G.ui.init();
    G.save = (manual) => this.save(manual);
    this.saveData = this.readSave();
    if (this.saveData) { this.applyGlobalsFromSave(this.saveData); }

    await this.step('Tejiendo el terreno de Sylvaren...');
    this.world = new World(G.quality);
    G.overworld = this.world.scene;
    G.scene = this.world.scene;
    G.env = this.world.env;
    await this.step('Plantando bosques...');
    G.fx = new FX(); G.fx.attach(G.scene);
    this.player = new Player(G.scene);
    G.player = this.player;
    G.cam = new ThirdPersonCam(G.camera);
    await this.step('Dibujando el mapa...');
    G.ui.buildMapImage();
    const sp = this.spawnPos();
    this.player.pos.copy(sp);
    G.cam.snapBehind(this.player);
    // precalentar render
    renderer.compile(G.scene, G.camera);
    await this.step('¡Listo!');
    $('#loading').classList.add('hide');
    this.showTitle();
    this.clock = new THREE.Clock();
    this.saveT = 60;
    this.loop();
  }
  step(msg) { $('#loadMsg').textContent = msg; return new Promise((r) => setTimeout(r, 30)); }

  applyTouch() {
    G.isTouch = G.settings.touch === 'on' || (G.settings.touch === 'auto' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window));
    document.body.classList.toggle('touch', G.isTouch);
    G.ui?.buildAbilityBar?.();
  }

  spawnPos() {
    const x = 8, z = 188;
    return new THREE.Vector3(x, getHeight(x, z), z);
  }

  // ---------- título ----------
  showTitle() {
    G.ui.open = 'title';
    $('#title').classList.add('on');
    $('#btnContinue').style.display = this.saveData ? '' : 'none';
    $('#btnContinue').onclick = () => this.start(true);
    $('#btnNew').onclick = () => {
      if (this.saveData && !confirm('¿Empezar una nueva partida? Se sobrescribirá la partida guardada.')) return;
      localStorage.removeItem(SAVE_KEY);
      if (this.saveData) { location.reload(); return; }
      this.start(false);
    };
    $('#btnControls').onclick = () => $('#controlsHelp').classList.toggle('on');
  }
  start(load) {
    audio.init();
    $('#title').classList.remove('on');
    G.ui.open = null;
    G.started = true; G.paused = false;
    document.body.classList.add('started');
    if (load && this.saveData) this.loadPlayer(this.saveData);
    else {
      G.flags = {};
      this.player.facing = Math.PI;
      G.cam.snapBehind(this.player);
      setTimeout(() => { G.quests.start('mq1'); }, 1500);
      setTimeout(() => G.companion.say('intro', true), 4500);
      G.ui.bigBanner('Aldea Brisaclara', 'Sylvaren · El Hilo Eterno');
      G.regions.add('aldea');
    }
    G.ui.refreshTracker();
    audio.setMode('village');
    if (!G.isTouch) setTimeout(() => $('#game').requestPointerLock?.(), 100);
  }

  // ---------- bucle ----------
  loop() {
    requestAnimationFrame(() => this.loop());
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    input.update();
    if (!G.started) {
      // sobrevuelo de título
      const t = performance.now() * 0.00004;
      G.camera.position.set(Math.cos(t) * 140, 70, 160 + Math.sin(t) * 140);
      G.camera.lookAt(0, 20, 150);
      G.dayTime = 9.5;
      this.world.sky.update(rawDt, G.camera.position);
      this.world.water.userData.update(rawDt, this.world.sky);
      this.world.grass.update(rawDt, this.player.pos, true);
      for (const a of this.world.anims) a(rawDt, performance.now() / 1000);
      G.renderer.render(G.scene, G.camera);
      input.endFrame();
      return;
    }
    this.handleMenuKeys();
    if (!G.paused) {
      let pdt = rawDt, edt = rawDt;
      if (G.hitstop > 0) { G.hitstop -= rawDt; pdt *= 0.1; edt *= 0.1; }
      if (G.slowmo > 0) { G.slowmo -= rawDt; edt *= 0.28; }
      G.time += rawDt; G.playTime += rawDt;
      if (!G.inDungeon) G.dayTime = (G.dayTime + rawDt * (24 / 1200)) % 24;
      this.player.update(pdt);
      updateEnemies(edt);
      updateProjectiles(edt);
      if (G.inDungeon) this.dungeon.update(rawDt); else this.world.update(rawDt);
      G.fx.update(rawDt);
      G.companion.update(rawDt);
      const combat = G.enemies.some((e) => e.aggro && !e.dead && !e.crystal && e.pos.distanceTo(this.player.pos) < 40);
      G.style.update(rawDt, combat);
      if (input.pressed('interact')) { const it = this.nearestInteractable(); if (it) it.action(); }
      // música
      if (!G.ui.boss) audio.setMode(combat ? 'combat' : G.inDungeon ? 'dungeon' : this.world.inVillage ? 'village' : 'explore');
      this.saveT -= rawDt;
      if (this.saveT <= 0) { this.saveT = 60; if (!G.inDungeon && !combat) this.save(); }
    }
    audio.update();
    G.cam.update(rawDt, rawDt);
    if (G.inDungeon) this.world.sky.update(0, this.player.pos);
    G.ui.update(rawDt);
    G.renderer.render(G.scene, G.camera);
    input.endFrame();
  }

  handleMenuKeys() {
    const ui = G.ui;
    if (ui.open === 'dialogue') {
      if (input.pressed('interact') || input.pressed('jump') || input.pressed('attack')) ui.advanceDialogue();
      if (input.pressed('pause')) ui.closeDialogue();
      return;
    }
    if (ui.open === 'death' || ui.open === 'title' || ui.open === 'ending') return;
    const tabs = { inventory: 'inventario', skills: 'habilidades', quests: 'misiones', map: 'mapa' };
    if (input.pressed('pause')) { if (ui.open) ui.closeAll(); else ui.openMenu('inventario'); return; }
    for (const k in tabs) if (input.pressed(k)) {
      if (ui.open === 'menu' && ui.selTab === tabs[k]) ui.closeAll();
      else if (!ui.open || ui.open === 'menu') ui.openMenu(tabs[k]);
    }
  }

  nearestInteractable() {
    if (this.player.dead) return null;
    return G.inDungeon ? this.dungeon?.nearestInteractable(this.player.pos) : this.world.nearestInteractable(this.player.pos);
  }

  fade(cb) {
    const f = $('#fade');
    f.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 150); }, 450);
  }

  clearEnemies() {
    for (const e of G.enemies) e.remove();
    G.enemies.length = 0;
    for (const id in this.world.campRuntime) { const rt = this.world.campRuntime[id]; rt.spawned = false; rt.enemies = []; }
    clearProjectiles();
    G.lockTarget = null;
  }

  // ---------- mazmorras ----------
  enterDungeon(id, diff) {
    audio.play('portal');
    this.fade(() => {
      const site = DUNGEON_SITES.find((d) => d.id === id);
      const fx = Math.sin(site.rot), fz = Math.cos(site.rot);
      this.returnPos = new THREE.Vector3(site.x + fx * 9, 0, site.z + fz * 9);
      this.returnPos.y = getHeight(this.returnPos.x, this.returnPos.z);
      this.clearEnemies();
      G.fx.clear();
      this.dungeon = new Dungeon(id, diff);
      G.scene = this.dungeon.scene;
      G.env = this.dungeon.env;
      G.inDungeon = true;
      this.player.attachTo(G.scene);
      G.fx.attach(G.scene);
      this.player.pos.copy(this.dungeon.spawnPoint);
      this.player.vel.set(0, 0, 0);
      this.player.facing = Math.PI;
      this.player.state = 'ground';
      G.cam.snapBehind(this.player);
      G.style.total = 0; G.style.samples = 0;
      audio.setMode('dungeon');
      G.ui.bigBanner(DUNGEONS[id].name, 'Dificultad: ' + this.dungeon.diff.name, 'boss');
      setTimeout(() => G.companion.say('dungeon', true), 2500);
    });
  }
  exitDungeon() {
    audio.play('portal');
    this.fade(() => {
      for (const e of G.enemies) e.remove();
      G.enemies.length = 0;
      clearProjectiles();
      G.fx.clear();
      G.ui.bossBar(null);
      G.scene = this.world.scene;
      G.env = this.world.env;
      G.inDungeon = false;
      this.player.attachTo(G.scene);
      G.fx.attach(G.scene);
      this.player.pos.copy(this.returnPos);
      this.player.facing = Math.atan2(this.returnPos.x - (this.dungeon ? DUNGEON_SITES.find((d) => d.id === this.dungeon.id).x : 0), this.returnPos.z - (this.dungeon ? DUNGEON_SITES.find((d) => d.id === this.dungeon.id).z : 0));
      G.cam.snapBehind(this.player);
      this.dungeon?.dispose();
      this.dungeon = null;
      this.world.grass.cells.clear();
      audio.setMode('explore');
      this.save();
    });
  }

  fastTravel(w) {
    audio.play('portal');
    this.fade(() => {
      this.clearEnemies();
      const x = w.x, z = w.z + 4;
      this.player.pos.set(x, getHeight(x, z), z);
      this.player.vel.set(0, 0, 0);
      this.player.state = 'ground';
      this.world.grass.cells.clear();
      G.cam.snapBehind(this.player);
      G.ui.regionName(w.name);
    });
  }

  respawn() {
    const pl = this.player;
    if (G.inDungeon) {
      this.dungeon.onPlayerDeath();
      pl.respawn(this.dungeon.spawnPoint);
    } else {
      this.clearEnemies();
      let best = null, bd = 1e9;
      for (const w of WAYPOINTS) if (G.waypoints.has(w.id)) { const d = Math.hypot(w.x - pl.pos.x, w.z - pl.pos.z); if (d < bd) { bd = d; best = w; } }
      const p = best ? new THREE.Vector3(best.x, 0, best.z + 4) : this.spawnPos();
      p.y = getHeight(p.x, p.z);
      pl.respawn(p);
      this.world.grass.cells.clear();
    }
    G.cam.snapBehind(pl);
    G.style.points = 0;
  }

  // ---------- guardado ----------
  readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  applyGlobalsFromSave(s) {
    G.waypoints = new Set(s.waypoints || []);
    G.echoes = new Set(s.echoes || []);
    G.regions = new Set(s.regions || []);
    G.dungeonClears = s.dungeonClears || {};
    G.dungeonBest = s.dungeonBest || {};
    G.flags = s.flags || {};
    G.playTime = s.playTime || 0;
    G.dayTime = s.dayTime ?? 9.5;
    G.quests.load(s.quests);
    if (s.fog) { const bin = atob(s.fog); for (let i = 0; i < bin.length && i < G.ui.mapFog.length; i++) G.ui.mapFog[i] = bin.charCodeAt(i); G.ui.fogDirty = true; }
  }
  loadPlayer(s) {
    const p = this.player, d = s.player;
    Object.assign(p, { level: d.level, xp: d.xp, gold: d.gold, attrs: d.attrs, attrPts: d.attrPts, skillPts: d.skillPts, skills: d.skills, abilitySlots: d.abilitySlots, inv: d.inv, gear: d.gear, equip: d.equip });
    let maxUid = 0;
    for (const g of [...p.gear, ...Object.values(p.equip).filter(Boolean)]) maxUid = Math.max(maxUid, g.uid);
    setUid(maxUid + 1);
    p.recalc();
    p.hp = Math.min(d.hp ?? p.stats.maxHp, p.stats.maxHp); p.mana = p.stats.maxMana; p.stamina = p.stats.maxStamina;
    p.rebuildModel();
    if (d.mode) p.setMode(d.mode, true);
    if (d.pos) p.pos.set(d.pos[0], getHeight(d.pos[0], d.pos[2]), d.pos[2]);
    p.facing = d.facing || 0;
    this.world.refreshWaypoints();
    this.world.loadCamps(s.camps);
    G.cam.snapBehind(p);
    G.ui.bigBanner('Bienvenido de nuevo', `Nivel ${p.level} · ${G.quests.tracked ? '' : 'Explora Sylvaren'}`);
  }
  save(manual = false) {
    if (!G.started) return;
    const p = this.player;
    const pos = G.inDungeon ? this.returnPos : p.pos;
    const s = {
      v: 1,
      player: { level: p.level, xp: p.xp, gold: p.gold, attrs: p.attrs, attrPts: p.attrPts, skillPts: p.skillPts, skills: p.skills, abilitySlots: p.abilitySlots, inv: p.inv, gear: p.gear, equip: p.equip, hp: p.hp, mode: p.mode, pos: [pos.x, pos.y, pos.z], facing: p.facing },
      quests: G.quests.serialize(), waypoints: [...G.waypoints], echoes: [...G.echoes], regions: [...G.regions],
      dungeonClears: G.dungeonClears, dungeonBest: G.dungeonBest, flags: G.flags, playTime: G.playTime, dayTime: G.dayTime,
      fog: btoa(String.fromCharCode(...G.ui.mapFog)), camps: this.world.serializeCamps(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      if (manual) G.ui.toast('💾 Partida guardada');
      else { const i = $('#saveIcon'); i.classList.remove('on'); void i.offsetWidth; i.classList.add('on'); }
    } catch (e) { if (manual) G.ui.toast('No se pudo guardar'); }
  }
}

const game = new Game();
game.boot().catch((e) => {
  console.error(e);
  const m = document.getElementById('loadMsg');
  if (m) m.textContent = 'Error al iniciar: ' + e.message + ' — Asegúrate de que tu navegador soporta WebGL.';
});
window.G = G;
