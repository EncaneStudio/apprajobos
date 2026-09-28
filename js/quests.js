import { G } from './state.js';
import { audio } from './audio.js';
import { QUESTS } from './data/quests.js';
import { NPCS } from './data/npcs.js';
import { makeGear, rollRarity } from './data/items.js';
import { DUNGEON_SITES, WAYPOINTS } from './data/worlddata.js';

export class Quests {
  constructor() { this.active = {}; this.done = new Set(); this.tracked = null; }

  state(id) { return this.done.has(id) ? 'done' : this.active[id] ? 'active' : 'none'; }
  stage(id) { return this.active[id] ? this.active[id].stage : -1; }
  atStage(id, i) { return !!this.active[id] && this.active[id].stage === i; }
  canOffer(id) {
    const q = QUESTS[id];
    if (!q || this.state(id) !== 'none') return false;
    if (q.req && !this.done.has(q.req)) return false;
    return true;
  }
  cur(id) { const a = this.active[id]; return a ? QUESTS[id].stages[a.stage] : null; }

  start(id, silent = false) {
    if (this.state(id) !== 'none') return;
    this.active[id] = { stage: 0, count: 0 };
    const q = QUESTS[id];
    if (!this.tracked || q.type === 'main') this.tracked = id;
    if (!silent) {
      audio.play('quest');
      G.ui.bigBanner(q.type === 'main' ? 'Misión principal' : 'Nueva misión', q.name, q.type === 'main' ? 'main' : 'side');
    }
    this.checkAuto(id);
    G.ui.refreshTracker();
  }

  advance(id) {
    const a = this.active[id];
    if (!a) return;
    const q = QUESTS[id];
    const st = q.stages[a.stage];
    // al entregar tras una etapa de recolección, se retiran los objetos
    if (st.type === 'talk' && a.stage > 0) {
      const prev = q.stages[a.stage - 1];
      if (prev.type === 'collect' && prev.take) G.player.removeItem(prev.item, prev.count);
    }
    a.stage++; a.count = 0;
    if (a.stage >= q.stages.length) this.complete(id);
    else { audio.play('ui'); G.ui.toast('📜 ' + q.stages[a.stage].text); this.checkAuto(id); }
    G.ui.refreshTracker();
  }

  complete(id) {
    const q = QUESTS[id];
    delete this.active[id];
    this.done.add(id);
    const pl = G.player, r = q.rewards || {};
    audio.play('quest');
    G.ui.bigBanner('¡Misión completada!', q.name, q.type === 'main' ? 'main' : 'side');
    G.companion.say('quest');
    if (r.gold) { pl.gold += r.gold; G.ui.itemGet({ name: `${r.gold} Lúmenes`, icon: '🪙' }, 1); }
    if (r.items) for (const [it, n] of r.items) pl.addItem(it, n);
    if (r.gear) pl.addGear(r.gear.slot ? makeGear(r.gear.slot, pl.level, r.gear.rarity) : makeGearOfRarity(pl.level, r.gear.rarity));
    if (r.sp) { pl.skillPts += r.sp; G.ui.toast(`✨ +${r.sp} puntos de habilidad`); }
    if (r.xp) pl.addXp(r.xp);
    if (this.tracked === id) this.tracked = null;
    if (q.next) setTimeout(() => this.start(q.next), 2600);
    if (!this.tracked) this.tracked = Object.keys(this.active)[0] || null;
    G.save?.();
  }

  checkAuto(id) {
    const a = this.active[id];
    if (!a) return;
    const st = QUESTS[id].stages[a.stage];
    if (st.type === 'collect' && G.player.count(st.item) >= st.count) this.advance(id);
    else if (st.type === 'echo' && G.echoes.size >= st.count) this.advance(id);
    else if (st.type === 'waypoint' && G.waypoints.has(st.id)) this.advance(id);
    else if (st.type === 'dungeon') {
      const clears = G.dungeonClears;
      const ok = Object.keys(clears).some((k) => (st.id === 'any' || k === st.id) && clears[k] >= st.minDiff + 1);
      if (ok && st.id !== 'any') this.advance(id);
    }
  }

  // ---------- eventos ----------
  onKill(type) {
    for (const id in this.active) {
      const st = this.cur(id);
      if (st && st.type === 'kill' && st.targets.includes(type)) {
        this.active[id].count++;
        if (this.active[id].count >= st.count) this.advance(id);
        else G.ui.refreshTracker();
      }
    }
  }
  onItem() { for (const id in this.active) { const st = this.cur(id); if (st && st.type === 'collect') this.checkAuto(id); } G.ui?.refreshTracker(); }
  onEcho() { for (const id in this.active) this.checkAuto(id); }
  onWaypoint() { for (const id in this.active) this.checkAuto(id); }
  onDungeon(did, diff) {
    for (const id in this.active) {
      const st = this.cur(id);
      if (st && st.type === 'dungeon' && (st.id === did || st.id === 'any') && diff >= st.minDiff) this.advance(id);
    }
  }

  npcMarker(npcId) {
    for (const id in this.active) {
      const st = this.cur(id);
      if (st && st.type === 'talk' && st.npc === npcId) return QUESTS[id].type === 'main' ? 'main' : 'turnin';
    }
    for (const id in QUESTS) if (QUESTS[id].giver === npcId && QUESTS[id].type === 'side' && this.canOffer(id)) return 'offer';
    return null;
  }

  targetLoc(id) {
    const st = this.cur(id);
    if (!st) return null;
    if (st.loc) return st.loc;
    if (st.type === 'talk') { const n = G.npcs.find((x) => x.id === st.npc); return n ? [n.pos.x, n.pos.z] : [NPCS[st.npc].x, NPCS[st.npc].z]; }
    if (st.type === 'dungeon' && st.id !== 'any') { const d = DUNGEON_SITES.find((x) => x.id === st.id); return [d.x, d.z]; }
    if (st.type === 'waypoint') { const w = WAYPOINTS.find((x) => x.id === st.id); return [w.x, w.z]; }
    return null;
  }
  progressText(id) {
    const st = this.cur(id), a = this.active[id];
    if (!st) return '';
    if (st.type === 'kill') return `${st.text} (${a.count}/${st.count})`;
    if (st.type === 'collect') return `${st.text} (${Math.min(st.count, G.player.count(st.item))}/${st.count})`;
    if (st.type === 'echo') return `${st.text} (${Math.min(st.count, G.echoes.size)}/${st.count})`;
    return st.text;
  }

  ctx(npc) {
    return {
      at: (id, i) => this.atStage(id, i),
      active: (id) => this.state(id) === 'active',
      stage: (id) => this.stage(id),
      done: (id) => this.done.has(id),
      canOffer: (id) => this.canOffer(id),
      start: (id) => this.start(id),
      advance: (id) => this.advance(id),
      shop: (t) => G.ui.openShop(t),
      ending: () => setTimeout(() => G.ui.showEnding(), 1500),
      npc,
    };
  }

  serialize() { return { active: this.active, done: [...this.done], tracked: this.tracked }; }
  load(o) { if (!o) return; this.active = o.active || {}; this.done = new Set(o.done || []); this.tracked = o.tracked || null; }
}

function makeGearOfRarity(level, rarity) {
  const slots = ['head', 'chest', 'legs', 'amulet', 'rune'];
  return makeGear(slots[Math.floor(Math.random() * slots.length)], level, rarity ?? rollRarity(10));
}
