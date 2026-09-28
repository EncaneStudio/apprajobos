import { G } from './state.js';
import { HEBRA } from './data/npcs.js';
import { choice } from './util.js';

// Hebra, la espada parlante: comenta lo que ocurre
export class Companion {
  constructor() { this.cd = 0; this.idleT = 60; this.last = {}; this.wasNight = false; this.wasCombat = false; }
  say(key, force = false) {
    const lines = HEBRA[key];
    if (!lines) return;
    if (!force && (this.cd > 0 || (this.last[key] && G.time - this.last[key] < 60))) return;
    let l = choice(lines);
    if (lines.length > 1 && l === this.lastLine) l = choice(lines);
    this.lastLine = l;
    this.last[key] = G.time;
    this.cd = 8;
    G.ui.hebraSay(l);
  }
  update(dt) {
    this.cd -= dt;
    this.idleT -= dt;
    const pl = G.player;
    const combat = G.enemies.some((e) => e.aggro && !e.dead && !e.crystal);
    if (combat && !this.wasCombat) { this.say('combat'); if (!G.flags.lockTip) { G.flags.lockTip = true; setTimeout(() => this.say('firstEnemyTip', true), 4000); } }
    if (combat && G.enemies.some((e) => e.type === 'brute' && e.aggro && !e.dead)) this.say('brute');
    this.wasCombat = combat;
    const night = G.dayTime > 20 || G.dayTime < 5;
    if (night && !this.wasNight && !G.inDungeon) this.say('night');
    this.wasNight = night;
    if (this.idleT <= 0) {
      this.idleT = 70 + Math.random() * 60;
      if (!combat && !G.ui.blocking() && pl.speed > 0.5) this.say('idle');
    }
  }
}
