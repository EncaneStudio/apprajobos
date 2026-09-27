import * as THREE from 'three';
import { G } from './state.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { ITEMS, RARITY, SLOTS, STAT_NAMES, ELEM_NAMES, randomGear, makeGear } from './data/items.js';
import { TREES, ABILITIES, ATTRS, STYLE_RANKS } from './data/skills.js';
import { QUESTS } from './data/quests.js';
import { NPCS } from './data/npcs.js';
import { WAYPOINTS, DUNGEON_SITES, VILLAGE, ECHOES } from './data/worlddata.js';
import { DUNGEONS, DIFFS } from './dungeon.js';
import { getHeight, terrainColor, getNormal, WATER_Y, HALF, WORLD } from './world/terrain.js';
import { fmt, clamp } from './util.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const HEART = '<svg viewBox="0 0 24 22"><path d="M12 21.3 10.6 20C5.4 15.3 2 12.2 2 8.4 2 5.3 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.3 22 8.4c0 3.8-3.4 6.9-8.6 11.6L12 21.3z"/></svg>';
const _v = new THREE.Vector3();

export class UI {
  constructor() {
    this.open = null;      // overlay abierto
    this.toastQ = [];
    this.hearts = -1;
    this.lastHp = -1;
    this.bannerT = 0;
    this.hebraT = 0;
    this.comboT = 0;
    this.barPool = [];
    this.mapFog = new Uint8Array(64 * 64);
    this.selTab = 'inventario';
    this.selItem = null;
    this.selNode = null;
    this.pendingAbility = null;
    this.frame = 0;
  }

  init() {
    this.el = {
      hearts: $('#hearts'), mana: $('#manaFill'), xp: $('#xpFill'), lvl: $('#lvl'), gold: $('#gold'),
      stamina: $('#stamina'), staminaArc: $('#staminaArc'), mm: $('#minimap'), clock: $('#clock'), tracker: $('#tracker'),
      style: $('#style'), styleRank: $('#styleRank'), styleName: $('#styleName'), styleFill: $('#styleFill'),
      combo: $('#combo'), prompt: $('#prompt'), banner: $('#banner'), region: $('#region'), toasts: $('#toasts'), feed: $('#feed'),
      hebra: $('#hebra'), hebraText: $('#hebraText'), boss: $('#bossbar'), bossName: $('#bossName'), bossFill: $('#bossFill'), bossLag: $('#bossLag'),
      bars: $('#barLayer'), reticle: $('#reticle'), flash: $('#flash'), slowmo: $('#slowmo'), marker: $('#qmarker'), markerDist: $('#qmarkerDist'),
      abil: $('#abilities'), mode: $('#modeIcon'),
    };
    this.mmCtx = this.el.mm.getContext('2d');
    // tabs de menú
    document.querySelectorAll('#menu .tabs button').forEach((b) => b.addEventListener('click', () => { audio.play('ui'); this.showTab(b.dataset.tab); }));
    $('#menuClose').addEventListener('click', () => this.closeAll());
    $('#dlg').addEventListener('click', () => this.advanceDialogue());
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closeAll()));
    this.buildAbilityBar();
  }

  blocking() { return !!this.open; }

  // ================= HUD =================
  update(dt) {
    const pl = G.player;
    this.frame++;
    // corazones
    const nh = Math.ceil(pl.stats.maxHp / 20);
    if (nh !== this.hearts) {
      this.hearts = nh;
      this.el.hearts.innerHTML = Array.from({ length: nh }, () => `<span class="heart"><span class="hbg">${HEART}</span><span class="hfg">${HEART}</span></span>`).join('');
      this.lastHp = -1;
    }
    if (pl.hp !== this.lastHp) {
      this.lastHp = pl.hp;
      const fgs = this.el.hearts.querySelectorAll('.hfg');
      fgs.forEach((f, i) => {
        const v = clamp((pl.hp - i * 20) / 20, 0, 1);
        const q = Math.ceil(v * 4) / 4;
        f.style.clipPath = `inset(0 ${100 - q * 100}% 0 0)`;
      });
      this.el.hearts.classList.toggle('low', pl.hp < pl.stats.maxHp * 0.25);
    }
    this.el.mana.style.width = (pl.mana / pl.stats.maxMana) * 100 + '%';
    this.el.xp.style.width = (pl.xp / pl.xpNext()) * 100 + '%';
    this.el.lvl.textContent = pl.level;
    this.el.gold.textContent = fmt(pl.gold);
    // rueda de aguante
    const sPct = pl.stamina / pl.stats.maxStamina;
    const show = sPct < 0.999 && !pl.dead;
    this.el.stamina.style.opacity = show ? 1 : 0;
    if (show) {
      _v.copy(pl.pos).setY(pl.pos.y + 1.4).project(G.camera);
      const x = (_v.x * 0.5 + 0.5) * innerWidth + 55, y = (-_v.y * 0.5 + 0.5) * innerHeight - 30;
      this.el.stamina.style.transform = `translate(${x}px, ${y}px)`;
      this.el.staminaArc.style.strokeDashoffset = 113 * (1 - sPct);
      this.el.staminaArc.style.stroke = pl.staminaLock ? '#ff5a4a' : sPct < 0.3 ? '#ffd24a' : '#7de26a';
    }
    // estilo
    const st = G.style, rk = STYLE_RANKS[st.rank];
    const vis = st.points > 5;
    this.el.style.classList.toggle('on', vis);
    if (vis) {
      if (this.el.styleRank.textContent !== rk.r) { this.el.styleRank.textContent = rk.r; this.el.styleRank.classList.remove('pop'); void this.el.styleRank.offsetWidth; this.el.styleRank.classList.add('pop'); }
      this.el.styleRank.style.color = rk.color;
      this.el.styleName.textContent = rk.name;
      this.el.styleFill.style.width = st.progress() * 100 + '%';
      this.el.styleFill.style.background = rk.color;
    }
    // habilidades
    this.updateAbilityBar();
    // reloj
    if (this.frame % 15 === 0) {
      const h = Math.floor(G.dayTime), m = Math.floor((G.dayTime - h) * 60);
      const icon = G.inDungeon ? '🏛️' : G.dayTime > 6 && G.dayTime < 19 ? '☀️' : '🌙';
      this.el.clock.innerHTML = `${icon} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    // interacción
    const it = G.game.nearestInteractable();
    this.curInteract = it;
    if (it && !this.open && !pl.dead) {
      this.el.prompt.innerHTML = `<b>${G.isTouch ? '✋' : 'E'}</b> ${esc(it.label)}`;
      this.el.prompt.classList.add('on');
    } else this.el.prompt.classList.remove('on');
    document.body.classList.toggle('canInteract', !!it && !this.open);
    // temporizadores de avisos
    this.comboT -= dt; if (this.comboT <= 0) this.el.combo.classList.remove('on');
    this.hebraT -= dt; if (this.hebraT <= 0) this.el.hebra.classList.remove('on');
    this.bannerT -= dt; if (this.bannerT <= 0) this.el.banner.classList.remove('on');
    this.el.slowmo.classList.toggle('on', G.slowmo > 0);
    this.updateBars();
    this.updateBoss(dt);
    this.updateMarker();
    if (this.frame % 3 === 0) this.drawMinimap();
  }

  buildAbilityBar() {
    const keys = G.isTouch ? ['', '', ''] : ['1', '2', '3'];
    this.el.abil.innerHTML = [0, 1, 2].map((i) => `<div class="aslot" data-slot="${i}"><span class="aicon"></span><span class="acd"></span><span class="akey">${keys[i]}</span></div>`).join('')
      + `<div class="aslot potion"><span class="aicon">🧪</span><span class="acount"></span><span class="akey">${G.isTouch ? '' : '4'}</span></div>`;
    this.el.abil.querySelectorAll('.aslot[data-slot]').forEach((s) => s.addEventListener('click', () => G.player.useAbility(+s.dataset.slot)));
  }
  updateAbilityBar() {
    const pl = G.player;
    const slots = this.el.abil.querySelectorAll('.aslot[data-slot]');
    slots.forEach((s, i) => {
      const id = pl.abilitySlots[i];
      const ab = ABILITIES[id];
      const icon = s.querySelector('.aicon'), cd = s.querySelector('.acd');
      icon.textContent = ab ? ab.icon : '·';
      const c = id ? (pl.cooldowns[id] || 0) / ab.cd : 0;
      cd.style.height = c * 100 + '%';
      s.classList.toggle('dis', !!ab && pl.mana < ab.cost);
      s.classList.toggle('empty', !ab);
    });
    const pots = ['pocion_menor', 'pocion', 'pocion_mayor', 'manzana', 'seta', 'estofado'].reduce((a, k) => a + pl.count(k), 0);
    this.el.abil.querySelector('.acount').textContent = pots;
    const mi = pl.mode === 'rigid' ? '⚔️' : '〰️';
    if (this.el.mode.dataset.m !== pl.mode) { this.el.mode.dataset.m = pl.mode; this.el.mode.innerHTML = `<span>${mi}</span><small>${pl.mode === 'rigid' ? 'Espada' : 'Látigo'}</small>`; this.el.mode.className = 'mode ' + pl.mode; }
    // botones táctiles de habilidades
    document.querySelectorAll('#touch [data-act^="ab"]').forEach((b) => {
      const i = +b.dataset.act.slice(2) - 1; const id = pl.abilitySlots[i];
      b.textContent = id ? ABILITIES[id].icon : '·';
      b.style.opacity = id && (pl.cooldowns[id] || 0) <= 0 && pl.mana >= ABILITIES[id].cost ? 1 : 0.4;
    });
  }
  modeChanged(m) { this.comboName(m === 'rigid' ? 'Hebra: Espada' : 'Hebra: Látigo'); }

  updateBars() {
    const pl = G.player;
    let used = 0;
    const W = innerWidth, H = innerHeight;
    for (const e of G.enemies) {
      if (e.dead || e.boss || e.crystal) continue;
      const d = e.pos.distanceTo(pl.pos);
      const locked = G.lockTarget === e;
      if (d > 32 || (!locked && e.hp >= e.maxHp && !e.aggro)) continue;
      _v.copy(e.pos).setY(e.pos.y + e.height + 0.5).project(G.camera);
      if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) continue;
      let b = this.barPool[used];
      if (!b) { b = document.createElement('div'); b.className = 'ebar'; b.innerHTML = '<span class="en"></span><div class="eb"><i></i></div>'; this.el.bars.appendChild(b); this.barPool.push(b); }
      used++;
      b.style.display = 'block';
      b.style.transform = `translate(${(_v.x * 0.5 + 0.5) * W}px, ${(-_v.y * 0.5 + 0.5) * H}px)`;
      b.querySelector('i').style.width = (e.hp / e.maxHp) * 100 + '%';
      const nm = b.querySelector('.en');
      const txt = locked || d < 12 ? `${e.name} · Nv ${e.level}` : '';
      if (nm.textContent !== txt) nm.textContent = txt;
      b.classList.toggle('alert', e.state === 'alert');
    }
    for (let i = used; i < this.barPool.length; i++) this.barPool[i].style.display = 'none';
    const lt = G.lockTarget;
    if (lt && !lt.dead) {
      _v.copy(lt.pos).setY(lt.pos.y + lt.height * 0.55).project(G.camera);
      this.el.reticle.style.display = _v.z < 1 ? 'block' : 'none';
      this.el.reticle.style.transform = `translate(${(_v.x * 0.5 + 0.5) * W}px, ${(-_v.y * 0.5 + 0.5) * H}px)`;
    } else this.el.reticle.style.display = 'none';
  }
  bossBar(e) { this.boss = e; this.el.boss.classList.toggle('on', !!e); if (e) { this.el.bossName.textContent = e.name; this.bossLag = 1; } }
  updateBoss(dt) {
    const e = this.boss;
    if (!e) return;
    const p = Math.max(0, e.hp / e.maxHp);
    this.el.bossFill.style.width = p * 100 + '%';
    this.bossLag = Math.max(p, (this.bossLag || 1) - dt * 0.25);
    this.el.bossLag.style.width = this.bossLag * 100 + '%';
  }

  updateMarker() {
    const q = G.quests.tracked;
    const loc = q && !G.inDungeon ? G.quests.targetLoc(q) : null;
    const m = this.el.marker;
    if (!loc) { m.style.display = 'none'; return; }
    const pl = G.player;
    const y = getHeight(loc[0], loc[1]) + 3;
    const dist = Math.hypot(loc[0] - pl.pos.x, loc[1] - pl.pos.z);
    if (dist < 6) { m.style.display = 'none'; return; }
    _v.set(loc[0], y, loc[1]).project(G.camera);
    let x = _v.x, yy = _v.y;
    const behind = _v.z > 1;
    if (behind) { x = -x; yy = -yy; }
    const edge = behind || Math.abs(x) > 0.9 || Math.abs(yy) > 0.85;
    if (edge) { const k = Math.max(Math.abs(x) / 0.9, Math.abs(yy) / 0.85); x /= k; yy /= k; if (behind) yy = -0.85; }
    m.style.display = 'block';
    m.style.transform = `translate(${(x * 0.5 + 0.5) * innerWidth}px, ${(-yy * 0.5 + 0.5) * innerHeight}px)`;
    this.el.markerDist.textContent = dist > 999 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m';
    m.classList.toggle('main', QUESTS[q].type === 'main');
  }

  refreshTracker() {
    const q = G.quests.tracked;
    if (!q || !G.quests.active[q]) { this.el.tracker.innerHTML = ''; this.el.tracker.style.display = 'none'; return; }
    const d = QUESTS[q];
    this.el.tracker.style.display = 'block';
    this.el.tracker.innerHTML = `<div class="tq ${d.type}">${d.type === 'main' ? '◆' : '◇'} ${esc(d.name)}</div><div class="to">${esc(G.quests.progressText(q))}</div>`;
  }

  // ---------- avisos ----------
  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3800);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }
  itemGet(item, n) {
    if (!item) return;
    const d = document.createElement('div');
    const col = item.rarity !== undefined ? RARITY[item.rarity].color : '#fff';
    d.className = 'feedItem';
    d.innerHTML = `<span class="fi">${item.icon || '📦'}</span><span style="color:${col}">${esc(item.name)}</span>${n > 1 ? ` <b>×${n}</b>` : ''}`;
    this.el.feed.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3000);
    setTimeout(() => d.remove(), 3600);
    while (this.el.feed.children.length > 6) this.el.feed.firstChild.remove();
    this.refreshTracker();
  }
  comboName(n) {
    const c = this.el.combo;
    c.textContent = n;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    this.comboT = 1.2;
  }
  hebraSay(text) {
    this.el.hebraText.textContent = '';
    this.el.hebra.classList.add('on');
    this.hebraT = Math.max(4, text.length * 0.07);
    let i = 0;
    clearInterval(this._hebraI);
    this._hebraI = setInterval(() => {
      i += 2;
      this.el.hebraText.textContent = text.slice(0, i);
      if (i % 6 === 0) audio.play('hebra');
      if (i >= text.length) clearInterval(this._hebraI);
    }, 28);
  }
  bigBanner(title, sub = '', kind = '') {
    const b = this.el.banner;
    b.className = 'banner ' + kind;
    b.innerHTML = `<div class="bt">${esc(title)}</div><div class="bl"></div><div class="bs">${esc(sub)}</div>`;
    void b.offsetWidth;
    b.classList.add('on');
    this.bannerT = 3.6;
  }
  regionName(n) {
    const r = this.el.region;
    r.textContent = n;
    r.classList.remove('on'); void r.offsetWidth; r.classList.add('on');
  }
  flash(color) {
    const f = this.el.flash;
    f.style.background = color;
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  levelUp(lv) {
    this.bigBanner(`¡Nivel ${lv}!`, '+3 puntos de característica · +1 punto de habilidad', 'main');
    this.flash('#ffe7a0');
  }

  // ================= Diálogos =================
  openDialogue(npc, lines, options, onEnd, ctx) {
    this.open = 'dialogue';
    G.paused = true;
    input.releasePointer();
    this.dlg = { npc, lines, options, onEnd, i: 0, typing: false };
    $('#dlg').classList.add('on');
    this.showLine();
  }
  showLine() {
    const d = this.dlg;
    const [who, text] = d.lines[d.i];
    const name = who === 'H' ? 'Hebra' : who === 'E' ? 'Eryn' : d.npc.def.name;
    const box = $('#dlg');
    box.className = 'on who-' + who;
    $('#dlgName').textContent = name;
    $('#dlgRole').textContent = who === 'N' ? d.npc.def.role : who === 'H' ? 'Espada parlante' : 'Tú';
    $('#dlgOpts').innerHTML = '';
    const t = $('#dlgText');
    t.textContent = '';
    d.typing = true;
    let i = 0;
    clearInterval(this._dlgI);
    this._dlgI = setInterval(() => {
      i += 2;
      t.textContent = text.slice(0, i);
      if (i % 4 === 0) audio.play(who === 'H' ? 'hebra' : 'talk');
      if (i >= text.length) { clearInterval(this._dlgI); d.typing = false; this.lineDone(); }
    }, 22);
    d.full = text;
  }
  lineDone() {
    const d = this.dlg;
    if (d.i === d.lines.length - 1 && d.options) {
      $('#dlgOpts').innerHTML = d.options.map((o, i) => `<button data-o="${i}">${esc(o.t)}</button>`).join('');
      $('#dlgOpts').querySelectorAll('button').forEach((b) => b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        audio.play('ui');
        const o = d.options[+b.dataset.o];
        this.closeDialogue();
        o.a(G.quests.ctx(d.npc));
      }));
    }
  }
  advanceDialogue() {
    const d = this.dlg;
    if (!d) return;
    if (d.typing) { clearInterval(this._dlgI); $('#dlgText').textContent = d.full; d.typing = false; this.lineDone(); return; }
    if (d.i === d.lines.length - 1 && d.options) return;
    d.i++;
    if (d.i >= d.lines.length) this.closeDialogue();
    else this.showLine();
  }
  closeDialogue() {
    const d = this.dlg;
    $('#dlg').classList.remove('on');
    this.dlg = null;
    this.open = null;
    G.paused = false;
    d?.onEnd?.();
  }

  // ================= Menú principal =================
  openMenu(tab = 'inventario') {
    if (this.open && this.open !== 'menu') return;
    this.open = 'menu';
    G.paused = true;
    input.releasePointer();
    $('#menu').classList.add('on');
    audio.play('uiOpen');
    this.showTab(tab);
  }
  closeAll() {
    if (this.open === 'dialogue') { this.closeDialogue(); return; }
    if (this.open === 'death' || this.open === 'title' || this.open === 'ending') return;
    document.querySelectorAll('.overlay.on').forEach((o) => o.classList.remove('on'));
    this.open = null;
    G.paused = false;
    this.pendingAbility = null;
    audio.play('ui');
  }
  showTab(tab) {
    this.selTab = tab;
    document.querySelectorAll('#menu .tabs button').forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
    const c = $('#menuBody');
    const fn = { inventario: this.tabInventory, equipo: this.tabEquip, habilidades: this.tabSkills, personaje: this.tabChar, misiones: this.tabQuests, mapa: this.tabMap, ajustes: this.tabSettings }[tab];
    c.innerHTML = '';
    c.className = 'body tab-' + tab;
    fn.call(this, c);
  }

  itemCard(it, count) {
    if (it.gear) {
      const r = RARITY[it.rarity];
      const stats = Object.entries(it.stats).map(([k, v]) => `<div>${STAT_NAMES[k]} <b>+${v}</b></div>`).join('');
      return `<div class="card"><div class="ch" style="color:${r.color}">${it.icon} ${esc(it.name)}</div><div class="cr" style="color:${r.color}">${r.name} · ${SLOTS[it.slot]} · Nv ${it.level}</div>
        <div class="cs">${stats}${it.elem ? `<div class="elem">✦ ${ELEM_NAMES[it.elem]}</div>` : ''}</div><div class="cp">Valor: ${fmt(it.price)} 🪙</div></div>`;
    }
    return `<div class="card"><div class="ch">${it.icon} ${esc(it.name)}${count ? ` ×${count}` : ''}</div><div class="cd">${esc(it.desc)}</div>${it.price ? `<div class="cp">Valor: ${it.price} 🪙</div>` : ''}</div>`;
  }

  tabInventory(c) {
    const pl = G.player;
    const groups = { consumable: 'Consumibles', material: 'Materiales', quest: 'Objetos clave' };
    let html = `<div class="cols"><div class="col grow">`;
    for (const g in groups) {
      const ids = Object.keys(pl.inv).filter((id) => ITEMS[id] && ITEMS[id].type === g && pl.inv[id] > 0);
      html += `<h3>${groups[g]}</h3><div class="grid">`;
      html += ids.length ? ids.map((id) => `<button class="slot ${this.selItem === id ? 'sel' : ''}" data-id="${id}"><span>${ITEMS[id].icon}</span><b>${pl.inv[id]}</b></button>`).join('') : '<div class="empty">Nada por aquí</div>';
      html += `</div>`;
    }
    html += `</div><div class="col side" id="invSide">`;
    const sel = this.selItem && ITEMS[this.selItem] && pl.count(this.selItem) ? this.selItem : null;
    if (sel) {
      html += this.itemCard(ITEMS[sel], pl.count(sel));
      if (ITEMS[sel].type === 'consumable') html += `<button class="btn" id="useBtn">Usar</button>`;
    } else html += `<div class="hint">Selecciona un objeto.<br><br>🪙 Lúmenes: <b>${fmt(pl.gold)}</b></div>`;
    html += `</div></div>`;
    c.innerHTML = html;
    c.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => { this.selItem = b.dataset.id; audio.play('ui'); this.showTab('inventario'); }));
    $('#useBtn')?.addEventListener('click', () => { pl.useItem(sel); this.showTab('inventario'); });
  }

  tabEquip(c) {
    const pl = G.player;
    let html = `<div class="cols"><div class="col"><h3>Equipado</h3><div class="eqslots">`;
    for (const s in SLOTS) {
      const it = pl.equip[s];
      html += `<button class="eq ${it ? 'has' : ''}" data-slot="${s}" style="${it ? `border-color:${RARITY[it.rarity].color}` : ''}"><span class="ei">${it ? it.icon : '＋'}</span><span><small>${SLOTS[s]}</small><br>${it ? `<b style="color:${RARITY[it.rarity].color}">${esc(it.name)}</b>` : '<i>Vacío</i>'}</span></button>`;
    }
    html += `</div><div class="hebraInfo"><b>Hebra</b> · Indestructible<br>Fragmentos del Hilo: ${pl.fragments()}/3 (+${pl.fragments() * 10}% daño)</div></div><div class="col grow"><h3>Mochila (${pl.gear.length})</h3><div class="gearlist">`;
    const sorted = [...pl.gear].sort((a, b) => b.rarity - a.rarity || b.level - a.level);
    html += sorted.length ? sorted.map((g) => {
      const cur = pl.equip[g.slot];
      const better = score(g) > (cur ? score(cur) : 0);
      return `<button class="gi ${this.selItem === g.uid ? 'sel' : ''}" data-uid="${g.uid}"><span>${g.icon}</span><span style="color:${RARITY[g.rarity].color}">${esc(g.name)}</span><small>${SLOTS[g.slot]} · Nv${g.level}</small>${better ? '<em>▲</em>' : ''}</button>`;
    }).join('') : '<div class="empty">Derrota monstruos, abre cofres y supera mazmorras para conseguir equipo.</div>';
    html += `</div></div><div class="col side">`;
    const g = pl.gear.find((x) => x.uid === this.selItem);
    if (g) {
      html += this.itemCard(g);
      const cur = pl.equip[g.slot];
      if (cur) {
        html += `<div class="cmp"><small>Comparado con lo equipado:</small>`;
        const keys = new Set([...Object.keys(g.stats), ...Object.keys(cur.stats)]);
        for (const k of keys) { const d = (g.stats[k] || 0) - (cur.stats[k] || 0); if (d) html += `<div>${STAT_NAMES[k]} <b class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</b></div>`; }
        html += `</div>`;
      }
      html += `<button class="btn" id="eqBtn">Equipar</button>`;
    } else html += '<div class="hint">Selecciona una pieza para ver sus detalles. Pulsa un espacio equipado para quitarlo.</div>';
    html += `</div></div>`;
    c.innerHTML = html;
    c.querySelectorAll('.gi').forEach((b) => b.addEventListener('click', () => { this.selItem = +b.dataset.uid; audio.play('ui'); this.showTab('equipo'); }));
    c.querySelectorAll('.eq.has').forEach((b) => b.addEventListener('click', () => { pl.unequip(b.dataset.slot); audio.play('ui'); this.showTab('equipo'); }));
    $('#eqBtn')?.addEventListener('click', () => { pl.equipGear(g.uid); audio.play('switch'); this.selItem = null; this.showTab('equipo'); });
  }

  tabSkills(c) {
    const pl = G.player;
    let html = `<div class="sp">Puntos de habilidad: <b>${pl.skillPts}</b> <small>(ganas 1 por nivel, por cada 3 Ecos y con fragmentos)</small></div><div class="trees">`;
    for (const tid in TREES) {
      const T = TREES[tid];
      html += `<div class="tree" style="--tc:${T.color}"><div class="th">${T.icon} ${T.name}</div><div class="td">${T.desc}</div><div class="tgrid"><svg class="tlines" viewBox="0 0 300 500" preserveAspectRatio="none">`;
      for (const n of T.nodes) for (const r of n.req) {
        const rn = T.nodes.find((x) => x.id === r);
        const on = pl.skill(r) > 0;
        html += `<line x1="${rn.x * 100 + 50}" y1="${rn.y * 100 + 50}" x2="${n.x * 100 + 50}" y2="${n.y * 100 + 50}" class="${on ? 'on' : ''}"/>`;
      }
      html += `</svg>`;
      for (const n of T.nodes) {
        const rank = pl.skill(n.id);
        const can = pl.canLearn(n.id);
        html += `<button class="node ${rank ? 'got' : ''} ${can ? 'can' : ''} ${this.selNode === n.id ? 'sel' : ''} ${rank >= n.max ? 'max' : ''}" data-id="${n.id}" style="left:${n.x * 33.3 + 16.6}%;top:${n.y * 20 + 10}%">
          <span>${n.ability ? ABILITIES[n.ability].icon : rank >= n.max ? '★' : '✦'}</span><small>${rank}/${n.max}</small></button>`;
      }
      html += `</div></div>`;
    }
    html += `</div><div class="skillSide">`;
    const sel = this.selNode && Object.values(TREES).flatMap((t) => t.nodes).find((n) => n.id === this.selNode);
    if (sel) {
      const rank = pl.skill(sel.id);
      html += `<div class="card"><div class="ch">${esc(sel.name)} <small>${rank}/${sel.max}</small></div><div class="cd">${esc(sel.desc)}</div>
        ${sel.req.length ? `<div class="cr">Requiere: ${sel.req.map((r) => Object.values(TREES).flatMap((t) => t.nodes).find((n) => n.id === r).name).join(', ')}</div>` : ''}
        ${sel.ability ? `<div class="cr">Coste: ${ABILITIES[sel.ability].cost} espíritu · Recarga ${ABILITIES[sel.ability].cd}s</div>` : ''}</div>`;
      html += pl.canLearn(sel.id) ? `<button class="btn" id="learnBtn">Aprender (1 punto)</button>` : rank >= sel.max ? '<div class="hint">Dominado</div>' : '<div class="hint">Requisitos no cumplidos o sin puntos</div>';
    } else html += '<div class="hint">Selecciona un talento del árbol.</div>';
    // asignación de habilidades
    const learned = Object.keys(ABILITIES).filter((a) => Object.values(TREES).some((t) => t.nodes.some((n) => n.ability === a && pl.skill(n.id))));
    html += `<h3>Habilidades activas</h3><div class="abAssign">`;
    html += learned.length ? learned.map((a) => `<button class="abl ${this.pendingAbility === a ? 'sel' : ''}" data-ab="${a}">${ABILITIES[a].icon} ${ABILITIES[a].name}</button>`).join('') : '<div class="empty">Aprende habilidades en los árboles.</div>';
    html += `</div><div class="abSlots">${[0, 1, 2].map((i) => `<button class="abs" data-s="${i}"><b>${i + 1}</b> ${pl.abilitySlots[i] ? ABILITIES[pl.abilitySlots[i]].icon + ' ' + ABILITIES[pl.abilitySlots[i]].name : '—'}</button>`).join('')}</div>`;
    html += this.pendingAbility ? '<div class="hint">Ahora pulsa un espacio (1-3)</div>' : '';
    html += `</div>`;
    c.innerHTML = html;
    c.querySelectorAll('.node').forEach((b) => b.addEventListener('click', () => { this.selNode = b.dataset.id; audio.play('ui'); this.showTab('habilidades'); }));
    $('#learnBtn')?.addEventListener('click', () => { if (pl.learn(sel.id)) { audio.play('levelup'); this.showTab('habilidades'); } });
    c.querySelectorAll('.abl').forEach((b) => b.addEventListener('click', () => { this.pendingAbility = b.dataset.ab; audio.play('ui'); this.showTab('habilidades'); }));
    c.querySelectorAll('.abs').forEach((b) => b.addEventListener('click', () => {
      if (!this.pendingAbility) return;
      const s = +b.dataset.s;
      const prev = pl.abilitySlots.indexOf(this.pendingAbility);
      if (prev >= 0) pl.abilitySlots[prev] = pl.abilitySlots[s];
      pl.abilitySlots[s] = this.pendingAbility;
      this.pendingAbility = null; audio.play('switch'); this.showTab('habilidades');
    }));
  }

  tabChar(c) {
    const pl = G.player, st = pl.stats;
    const t = Math.floor(G.playTime);
    let html = `<div class="cols"><div class="col grow"><div class="charHead"><div class="bigLvl">${pl.level}</div><div><h2>Eryn</h2><div>Elfo de Sylvaren · Portador de Hebra</div>
      <div class="xpbar"><i style="width:${(pl.xp / pl.xpNext()) * 100}%"></i></div><small>${fmt(pl.xp)} / ${fmt(pl.xpNext())} EXP</small></div></div>
      <h3>Características <small>(${pl.attrPts} puntos disponibles)</small></h3><div class="attrs">`;
    for (const k in ATTRS) {
      html += `<div class="attr"><div><b>${ATTRS[k].name}</b> <span>${pl.attrs[k]}${st[k] !== pl.attrs[k] ? ` <em>(+${st[k] - pl.attrs[k]})</em>` : ''}</span><br><small>${ATTRS[k].desc}</small></div>
        <button class="plus" data-a="${k}" ${pl.attrPts ? '' : 'disabled'}>＋</button></div>`;
    }
    html += `</div></div><div class="col side"><h3>Estadísticas</h3><div class="stats">
      <div>❤️ Vida <b>${Math.round(pl.hp)} / ${st.maxHp}</b></div><div>🔮 Espíritu <b>${Math.round(pl.mana)} / ${st.maxMana}</b></div>
      <div>🟢 Aguante <b>${st.maxStamina}</b></div><div>⚔️ Ataque <b>${st.atk}</b></div><div>🛡️ Defensa <b>${st.def}</b></div>
      <div>🎯 Crítico <b>${st.crit.toFixed(1)}%</b></div><div>💨 Velocidad <b>${Math.round(st.speed * 100)}%</b></div></div>
      <h3>Progreso</h3><div class="stats">
      <div>📜 Misiones completadas <b>${G.quests.done.size}</b></div><div>✨ Ecos del Bosque <b>${G.echoes.size} / ${ECHOES.length}</b></div>
      <div>💎 Fragmentos <b>${pl.fragments()} / 3</b></div><div>🗺️ Regiones <b>${G.regions.size}</b></div>
      <div>🏆 Mejor rango de estilo <b>${STYLE_RANKS[G.style.best].r}</b></div><div>⏱️ Tiempo de juego <b>${Math.floor(t / 3600)}h ${Math.floor((t % 3600) / 60)}m</b></div></div></div></div>`;
    c.innerHTML = html;
    c.querySelectorAll('.plus').forEach((b) => b.addEventListener('click', () => {
      if (pl.attrPts <= 0) return;
      pl.attrs[b.dataset.a]++; pl.attrPts--;
      const hpPct = pl.hp / pl.stats.maxHp;
      pl.recalc(); pl.hp = Math.round(pl.stats.maxHp * hpPct);
      audio.play('ui'); this.showTab('personaje');
    }));
  }

  tabQuests(c) {
    const q = G.quests;
    const act = Object.keys(q.active).sort((a, b) => (QUESTS[a].type === 'main' ? -1 : 1) - (QUESTS[b].type === 'main' ? -1 : 1));
    const sel = this.selQuest && (q.active[this.selQuest] || q.done.has(this.selQuest)) ? this.selQuest : act[0];
    let html = `<div class="cols"><div class="col"><h3>En curso</h3><div class="qlist">`;
    html += act.map((id) => `<button class="qi ${QUESTS[id].type} ${sel === id ? 'sel' : ''}" data-q="${id}">${QUESTS[id].type === 'main' ? '◆' : '◇'} ${esc(QUESTS[id].name)}${q.tracked === id ? ' 📍' : ''}</button>`).join('') || '<div class="empty">Sin misiones activas. ¡Habla con los aldeanos!</div>';
    html += `</div><h3>Completadas</h3><div class="qlist done">${[...q.done].map((id) => `<button class="qi ${sel === id ? 'sel' : ''}" data-q="${id}">✔ ${esc(QUESTS[id].name)}</button>`).join('') || '<div class="empty">—</div>'}</div></div><div class="col grow">`;
    if (sel) {
      const d = QUESTS[sel];
      const a = q.active[sel];
      html += `<div class="qd"><div class="qt ${d.type}">${d.type === 'main' ? 'Misión principal' : 'Misión secundaria'}</div><h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p><p class="giver">Encargada por: ${esc(NPCS[d.giver]?.name || '')}</p><ul>`;
      d.stages.forEach((s, i) => {
        const done = q.done.has(sel) || (a && i < a.stage);
        const cur = a && i === a.stage;
        if (done || cur) html += `<li class="${done ? 'ok' : 'cur'}">${done ? '✔' : '▸'} ${esc(cur ? q.progressText(sel) : s.text)}</li>`;
      });
      html += `</ul><div class="rew">Recompensa: ${d.rewards.xp ? d.rewards.xp + ' EXP' : ''}${d.rewards.gold ? ' · ' + d.rewards.gold + ' 🪙' : ''}${d.rewards.gear ? ' · Equipo' : ''}${d.rewards.sp ? ' · ' + d.rewards.sp + ' pts habilidad' : ''}</div>`;
      if (a) html += `<button class="btn" id="trackBtn">${q.tracked === sel ? 'Siguiendo' : 'Seguir esta misión'}</button>`;
      html += `</div>`;
    }
    html += `</div></div>`;
    c.innerHTML = html;
    c.querySelectorAll('.qi').forEach((b) => b.addEventListener('click', () => { this.selQuest = b.dataset.q; audio.play('ui'); this.showTab('misiones'); }));
    $('#trackBtn')?.addEventListener('click', () => { q.tracked = sel; this.refreshTracker(); audio.play('ui'); this.showTab('misiones'); });
  }

  // ---------- Mapa ----------
  buildMapImage() {
    const N = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(N, N);
    const col = new THREE.Color();
    const hs = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -HALF + (i + 0.5) * (WORLD / N), z = -HALF + (j + 0.5) * (WORLD / N);
      const h = getHeight(x, z); hs[j * N + i] = h;
      const n = getNormal(x, z);
      if (h < WATER_Y) { const d = Math.min(1, (WATER_Y - h) / 10); col.setRGB(0.36 - d * 0.15, 0.7 - d * 0.25, 0.78 - d * 0.1); }
      else terrainColor(x, z, h, n.y, col);
      const shade = 0.75 + (n.x * -0.6 + n.z * -0.4) * 0.9 + 0.25;
      const k = (j * N + i) * 4;
      img.data[k] = clamp(col.r * shade * 255, 0, 255); img.data[k + 1] = clamp(col.g * shade * 255, 0, 255); img.data[k + 2] = clamp(col.b * shade * 255, 0, 255); img.data[k + 3] = 255;
    }
    // curvas de nivel
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
      const a = Math.floor(hs[j * N + i] / 15), b = Math.floor(hs[j * N + i - 1] / 15), c = Math.floor(hs[(j - 1) * N + i] / 15);
      if ((a !== b || a !== c) && hs[j * N + i] > WATER_Y) { const k = (j * N + i) * 4; img.data[k] *= 0.8; img.data[k + 1] *= 0.8; img.data[k + 2] *= 0.8; }
    }
    ctx.putImageData(img, 0, 0);
    // estética "pergamino" azulado (BotW)
    const big = document.createElement('canvas');
    big.width = big.height = 768;
    const b = big.getContext('2d');
    b.imageSmoothingEnabled = true;
    b.drawImage(cv, 0, 0, 768, 768);
    b.globalAlpha = 0.12; b.fillStyle = '#2a4a5a'; b.fillRect(0, 0, 768, 768); b.globalAlpha = 1;
    this.mapImg = big;
  }
  revealMap(x, z, r) {
    const cells = 64, cs = WORLD / cells;
    const cx = Math.floor((x + HALF) / cs), cz = Math.floor((z + HALF) / cs), rr = Math.ceil(r / cs);
    for (let j = cz - rr; j <= cz + rr; j++) for (let i = cx - rr; i <= cx + rr; i++) {
      if (i < 0 || j < 0 || i >= cells || j >= cells) continue;
      if ((i - cx) ** 2 + (j - cz) ** 2 <= rr * rr) this.mapFog[j * cells + i] = 1;
    }
    this.fogDirty = true;
  }
  fogCanvas() {
    if (!this.fogCv) { this.fogCv = document.createElement('canvas'); this.fogCv.width = this.fogCv.height = 64; }
    if (this.fogDirty) {
      const ctx = this.fogCv.getContext('2d');
      const img = ctx.createImageData(64, 64);
      for (let i = 0; i < 64 * 64; i++) { img.data[i * 4] = 18; img.data[i * 4 + 1] = 32; img.data[i * 4 + 2] = 44; img.data[i * 4 + 3] = this.mapFog[i] ? 0 : 235; }
      ctx.putImageData(img, 0, 0);
      this.fogDirty = false;
    }
    return this.fogCv;
  }
  drawMarkers(ctx, toX, toY, scale, full) {
    const pl = G.player;
    const icon = (x, y, ch, size, color) => { ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color || '#fff'; ctx.fillText(ch, toX(x), toY(y)); };
    for (const w of WAYPOINTS) if (G.waypoints.has(w.id) || full) {
      const on = G.waypoints.has(w.id);
      if (!on && !this.discovered(w.x, w.z)) continue;
      ctx.fillStyle = on ? '#4fe3ff' : '#ff9a3a'; ctx.strokeStyle = '#102030'; ctx.lineWidth = 2;
      ctx.beginPath(); const X = toX(w.x), Y = toY(w.z), s = full ? 7 : 5; ctx.moveTo(X, Y - s); ctx.lineTo(X + s * 0.7, Y); ctx.lineTo(X, Y + s); ctx.lineTo(X - s * 0.7, Y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const d of DUNGEON_SITES) if (this.discovered(d.x, d.z)) icon(d.x, d.z, '🏛️', full ? 18 : 12);
    if (this.discovered(VILLAGE.x, VILLAGE.z)) icon(VILLAGE.x, VILLAGE.z, '🏘️', full ? 18 : 12);
    if (!full) {
      for (const e of G.enemies) if (!e.dead && (e.aggro || e.pos.distanceTo(pl.pos) < 50)) { ctx.fillStyle = e.boss ? '#ff4fd8' : '#ff4a3a'; ctx.beginPath(); ctx.arc(toX(e.pos.x), toY(e.pos.z), e.boss ? 4 : 2.5, 0, 7); ctx.fill(); }
      for (const n of G.npcs) { const m = G.quests.npcMarker(n.id); if (m) icon(n.pos.x, n.pos.z, m === 'turnin' || m === 'main' ? '?' : '!', 12, m === 'main' ? '#7af0ff' : '#ffd84a'); }
    }
    const q = G.quests.tracked;
    const loc = q ? G.quests.targetLoc(q) : null;
    if (loc) {
      ctx.fillStyle = QUESTS[q].type === 'main' ? '#7af0ff' : '#ffd84a'; ctx.strokeStyle = '#102030'; ctx.lineWidth = 2;
      const X = toX(loc[0]), Y = toY(loc[1]), s = full ? 8 : 6;
      ctx.beginPath(); ctx.moveTo(X, Y - s * 1.6); ctx.lineTo(X + s, Y - s * 0.4); ctx.lineTo(X, Y + s * 0.6); ctx.lineTo(X - s, Y - s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // jugador
    const X = toX(pl.pos.x), Y = toY(pl.pos.z);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(-pl.facing + Math.PI);
    ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
    const s = full ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.7, s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  discovered(x, z) {
    const cs = WORLD / 64;
    const i = Math.floor((x + HALF) / cs), j = Math.floor((z + HALF) / cs);
    return i >= 0 && j >= 0 && i < 64 && j < 64 && this.mapFog[j * 64 + i] === 1;
  }
  drawMinimap() {
    const ctx = this.mmCtx, W = this.el.mm.width, H = this.el.mm.height;
    ctx.clearRect(0, 0, W, H);
    if (G.inDungeon || !this.mapImg) {
      ctx.fillStyle = 'rgba(20,30,40,0.7)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9fd8e8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(G.inDungeon ? G.game.dungeon?.def.name || '' : '', W / 2, H / 2);
      if (G.inDungeon) { ctx.font = '12px sans-serif'; ctx.fillText(G.game.dungeon.diff.name, W / 2, H / 2 + 18); }
      return;
    }
    const pl = G.player;
    const range = 110; // metros visibles (radio)
    const scale = W / (range * 2);
    const toX = (x) => W / 2 + (x - pl.pos.x) * scale, toY = (z) => H / 2 + (z - pl.pos.z) * scale;
    const mpx = this.mapImg.width / WORLD;
    const sx = (pl.pos.x - range + HALF) * mpx, sy = (pl.pos.z - range + HALF) * mpx;
    ctx.drawImage(this.mapImg, sx, sy, range * 2 * mpx, range * 2 * mpx, 0, 0, W, H);
    const fc = this.fogCanvas(), fpx = 64 / WORLD;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fc, (pl.pos.x - range + HALF) * fpx, (pl.pos.z - range + HALF) * fpx, range * 2 * fpx, range * 2 * fpx, 0, 0, W, H);
    // cono de cámara
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-G.cam.yaw + Math.PI);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 60); grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 60, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
    this.drawMarkers(ctx, toX, toY, scale, false);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', W / 2, 12);
  }
  tabMap(c) {
    c.innerHTML = `<div class="mapWrap"><canvas id="bigMap" width="760" height="760"></canvas><div class="mapSide"><h3>Mapa de Sylvaren</h3>
      <p class="hint">${G.inDungeon ? 'No puedes viajar desde una mazmorra.' : 'Pulsa una <b style="color:#4fe3ff">Piedra de Viento</b> activada para viajar al instante.'}</p>
      <div class="legend"><div><i style="background:#4fe3ff"></i> Piedra activa</div><div><i style="background:#ff9a3a"></i> Piedra inactiva</div><div>🏛️ Mazmorra</div><div>🏘️ Aldea</div><div><i style="background:#ffd84a"></i> Objetivo de misión</div></div>
      <div id="mapInfo" class="hint"></div></div></div>`;
    const cv = $('#bigMap'), ctx = cv.getContext('2d');
    const W = cv.width;
    const scale = W / WORLD;
    const toX = (x) => (x + HALF) * scale, toY = (z) => (z + HALF) * scale;
    const draw = (hover) => {
      ctx.drawImage(this.mapImg, 0, 0, W, W);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.fogCanvas(), 0, 0, W, W);
      this.drawMarkers(ctx, toX, toY, scale, true);
      if (hover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(toX(hover.x), toY(hover.z), 14, 0, 7); ctx.stroke(); }
    };
    draw();
    const pick = (ev) => {
      const r = cv.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * WORLD - HALF, z = ((ev.clientY - r.top) / r.height) * WORLD - HALF;
      let best = null, bd = 40;
      for (const w of WAYPOINTS) { const d = Math.hypot(w.x - x, w.z - z); if (d < bd && (G.waypoints.has(w.id) || this.discovered(w.x, w.z))) { bd = d; best = w; } }
      for (const d of DUNGEON_SITES) { const dd = Math.hypot(d.x - x, d.z - z); if (dd < bd && this.discovered(d.x, d.z)) { bd = dd; best = { ...d, dungeon: true }; } }
      return best;
    };
    cv.addEventListener('mousemove', (ev) => {
      const w = pick(ev); draw(w);
      const info = $('#mapInfo');
      if (!w) { info.innerHTML = ''; return; }
      if (w.dungeon) { const D = DUNGEONS[w.id]; info.innerHTML = `<b>${D.name}</b><br>${D.desc}<br>Nivel recomendado: ${D.baseLevel}+<br>Máx. dificultad superada: ${G.dungeonClears[w.id] ? DIFFS[G.dungeonClears[w.id] - 1].name : '—'}`; }
      else info.innerHTML = `<b>${w.name}</b><br>${G.waypoints.has(w.id) ? 'Clic para viajar' : 'Aún no activada'}`;
    });
    cv.addEventListener('click', (ev) => {
      const w = pick(ev);
      if (!w || w.dungeon || !G.waypoints.has(w.id)) return;
      if (G.inDungeon) { this.toast('No puedes viajar desde una mazmorra'); return; }
      if (G.enemies.some((e) => e.aggro && !e.dead && e.pos.distanceTo(G.player.pos) < 30)) { this.toast('¡No puedes viajar en combate!'); audio.play('deny'); return; }
      this.closeAll();
      G.game.fastTravel(w);
    });
  }

  tabSettings(c) {
    const s = G.settings;
    c.innerHTML = `<div class="cols"><div class="col grow"><h3>Ajustes</h3><div class="settings">
      <label>Calidad gráfica <select id="setQ"><option value="auto">Automática</option><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select><small>Requiere recargar</small></label>
      <label>Sensibilidad de cámara <input id="setSens" type="range" min="0.3" max="2.5" step="0.1" value="${s.sens}"></label>
      <label><input id="setInv" type="checkbox" ${s.invertY ? 'checked' : ''}> Invertir eje vertical</label>
      <label>Volumen de efectos <input id="setVol" type="range" min="0" max="1" step="0.05" value="${s.vol}"></label>
      <label>Volumen de música <input id="setMus" type="range" min="0" max="1" step="0.05" value="${s.music}"></label>
      <label>Controles táctiles <select id="setTouch"><option value="auto">Automático</option><option value="on">Siempre</option><option value="off">Nunca</option></select></label>
      </div><div class="row"><button class="btn" id="saveBtn">💾 Guardar partida</button><button class="btn alt" id="titleBtn">Volver al título</button></div></div>
      <div class="col side"><h3>Controles</h3>${controlsHTML()}</div></div>`;
    $('#setQ').value = s.quality; $('#setTouch').value = s.touch;
    const save = () => { localStorage.setItem('sylvaren_settings', JSON.stringify(s)); audio.applyVolume(); };
    $('#setQ').onchange = (e) => { s.quality = e.target.value; save(); this.toast('La calidad se aplicará al recargar'); };
    $('#setSens').oninput = (e) => { s.sens = +e.target.value; save(); };
    $('#setInv').onchange = (e) => { s.invertY = e.target.checked; save(); };
    $('#setVol').oninput = (e) => { s.vol = +e.target.value; save(); };
    $('#setMus').oninput = (e) => { s.music = +e.target.value; save(); };
    $('#setTouch').onchange = (e) => { s.touch = e.target.value; save(); G.game.applyTouch(); };
    $('#saveBtn').onclick = () => { G.save(true); };
    $('#titleBtn').onclick = () => { G.save(); location.reload(); };
  }

  // ================= Otras pantallas =================
  openShop(type) {
    this.open = 'shop'; G.paused = true; input.releasePointer();
    this.shopType = type;
    if (!this.shopStock || this.shopDay !== Math.floor(G.playTime / 600) || this.shopStockType !== type) this.genStock(type);
    $('#shop').classList.add('on');
    this.renderShop();
  }
  genStock(type) {
    const pl = G.player;
    this.shopDay = Math.floor(G.playTime / 600); this.shopStockType = type;
    if (type === 'merchant') this.shopStock = [{ id: 'pocion_menor' }, { id: 'pocion' }, { id: 'pocion_mayor' }, { id: 'elixir' }, { id: 'manzana' }];
    else this.shopStock = Array.from({ length: 6 }, () => ({ gear: randomGear(pl.level, 8) }));
  }
  renderShop() {
    const pl = G.player;
    const title = this.shopType === 'merchant' ? 'Tesoros de Pim' : 'Forja de Hilda';
    let html = `<div class="shopHead"><h2>${title}</h2><div>🪙 <b>${fmt(pl.gold)}</b></div><button class="x" data-close>✕</button></div><div class="cols"><div class="col grow"><h3>Comprar</h3><div class="shoplist">`;
    this.shopStock.forEach((s, i) => {
      if (s.sold) return;
      const it = s.gear || ITEMS[s.id];
      const price = s.gear ? Math.round(s.gear.price * 2.2) : it.price;
      const col = s.gear ? RARITY[s.gear.rarity].color : '#fff';
      html += `<button class="si" data-buy="${i}" ${pl.gold < price ? 'disabled' : ''}><span>${it.icon}</span><span style="color:${col}">${esc(it.name)}${s.gear ? ` <small>(${SLOTS[s.gear.slot]} Nv${s.gear.level})</small>` : ''}</span><b>${fmt(price)} 🪙</b></button>`;
    });
    html += `</div></div><div class="col grow"><h3>Vender</h3><div class="shoplist">`;
    for (const id in pl.inv) {
      const it = ITEMS[id];
      if (!it || it.type === 'quest' || !pl.inv[id]) continue;
      const price = Math.max(1, Math.round(it.price * (it.type === 'material' ? 1 : 0.4)));
      html += `<button class="si" data-sell="${id}"><span>${it.icon}</span><span>${esc(it.name)} ×${pl.inv[id]}</span><b>+${price} 🪙</b></button>`;
    }
    for (const g of pl.gear) html += `<button class="si" data-sellg="${g.uid}"><span>${g.icon}</span><span style="color:${RARITY[g.rarity].color}">${esc(g.name)}</span><b>+${fmt(g.price)} 🪙</b></button>`;
    html += `</div><button class="btn alt" id="sellMats">Vender todos los materiales</button></div></div>`;
    const box = $('#shopBox');
    box.innerHTML = html;
    box.querySelector('[data-close]').onclick = () => this.closeAll();
    box.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
      const s = this.shopStock[+b.dataset.buy];
      const price = s.gear ? Math.round(s.gear.price * 2.2) : ITEMS[s.id].price;
      if (pl.gold < price) return;
      pl.gold -= price; audio.play('coin');
      if (s.gear) { pl.addGear(s.gear, true); s.sold = true; } else pl.addItem(s.id, 1, true);
      this.renderShop();
    });
    box.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => {
      const id = b.dataset.sell, it = ITEMS[id];
      pl.gold += Math.max(1, Math.round(it.price * (it.type === 'material' ? 1 : 0.4))); pl.removeItem(id, 1); audio.play('coin'); this.renderShop();
    });
    box.querySelectorAll('[data-sellg]').forEach((b) => b.onclick = () => {
      const i = pl.gear.findIndex((g) => g.uid === +b.dataset.sellg);
      if (i >= 0) { pl.gold += pl.gear[i].price; pl.gear.splice(i, 1); audio.play('coin'); this.renderShop(); }
    });
    $('#sellMats').onclick = () => {
      let t = 0;
      for (const id in pl.inv) if (ITEMS[id]?.type === 'material') { t += ITEMS[id].price * pl.inv[id]; delete pl.inv[id]; }
      pl.gold += t; if (t) audio.play('coin'); this.renderShop();
    };
  }

  openDungeonSelect(id) {
    const D = DUNGEONS[id];
    this.open = 'dselect'; G.paused = true; input.releasePointer();
    const cleared = G.dungeonClears[id] || 0;
    let html = `<div class="dsHead" style="--dc:#${D.portal.toString(16).padStart(6, '0')}"><h2>${D.name}</h2><p>${D.desc}</p><small>Nivel base ${D.baseLevel} · Los enemigos escalan con tu nivel</small></div><div class="diffs">`;
    DIFFS.forEach((d, i) => {
      const unlocked = i <= cleared;
      const best = G.dungeonBest[id + '_' + i];
      html += `<button class="diff" data-d="${i}" ${unlocked ? '' : 'disabled'} style="--c:${d.color}"><b>${d.name}</b><small>Nv enemigos ${Math.max(D.baseLevel, G.player.level) + d.lvl + (i ? '' : '')}</small>
        <small>Vida ×${d.hp} · Daño ×${d.dmg}</small><small>Botín ${['normal', 'mejorado', 'excelente', 'legendario'][i]}</small>${best ? `<small>Mejor: ${fmtTime(best)}</small>` : ''}${unlocked ? '' : '<em>🔒 Supera la dificultad anterior</em>'}</button>`;
    });
    html += `</div><div class="row"><button class="btn alt" data-close>Volver</button></div>`;
    const box = $('#dselBox');
    box.innerHTML = html;
    $('#dsel').classList.add('on');
    box.querySelector('[data-close]').onclick = () => this.closeAll();
    box.querySelectorAll('.diff').forEach((b) => b.onclick = () => { this.closeAll(); G.game.enterDungeon(id, +b.dataset.d); });
  }
  dungeonComplete(r) {
    const box = $('#dcomp');
    box.innerHTML = `<div class="dcIn"><div class="dcT">¡Mazmorra superada!</div><div class="dcN">${esc(r.name)} · <span style="color:${r.diff.color}">${r.diff.name}</span></div>
      <div class="dcRank r${r.rank}">${r.rank}</div><div class="dcS">Tiempo: <b>${fmtTime(r.time)}</b> · EXP: <b>+${fmt(r.xp)}</b></div>
      ${r.newDiff ? `<div class="dcU">🔓 Dificultad ${r.newDiff} desbloqueada</div>` : ''}<div class="dcH">Abre el cofre del tesoro y usa el portal para salir</div></div>`;
    box.classList.add('on');
    audio.play('chest');
    setTimeout(() => box.classList.remove('on'), 6000);
  }
  openRest() {
    this.open = 'rest'; G.paused = true; input.releasePointer();
    $('#rest').classList.add('on');
    document.querySelectorAll('#rest [data-h]').forEach((b) => b.onclick = () => {
      const h = +b.dataset.h;
      this.closeAll();
      const f = $('#fade'); f.classList.add('on');
      setTimeout(() => {
        G.dayTime = h;
        G.player.hp = G.player.stats.maxHp; G.player.mana = G.player.stats.maxMana;
        G.save();
        f.classList.remove('on');
        this.toast('Has descansado. Vida y espíritu restaurados.');
      }, 900);
    });
  }
  showDeath() {
    this.open = 'death'; G.paused = true; input.releasePointer();
    $('#death').classList.add('on');
    $('#deathBtn').onclick = () => { $('#death').classList.remove('on'); this.open = null; G.paused = false; G.game.respawn(); };
  }
  showEnding() {
    this.open = 'ending'; G.paused = true; input.releasePointer();
    $('#ending').classList.add('on');
    $('#endBtn').onclick = () => { $('#ending').classList.remove('on'); this.open = null; G.paused = false; };
  }
}

function score(g) { return Object.values(g.stats).reduce((a, b) => a + b, 0) + g.rarity * 2; }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

export function controlsHTML() {
  return `<div class="controls"><div><b>Ordenador</b></div>
    <div><kbd>WASD</kbd> Moverse · <kbd>Ratón</kbd> Cámara</div><div><kbd>Mayús</kbd> Esprintar · <kbd>Espacio</kbd> Saltar / doble salto / planear (mantener)</div>
    <div><kbd>Clic izq.</kbd> Golpe rápido · <kbd>Clic der.</kbd> Golpe pesado</div><div><kbd>Q</kbd> Cambiar Hebra: Espada ⇄ Látigo</div>
    <div><kbd>C</kbd> Esquivar (esquiva perfecta = Tiempo Élfico)</div><div><kbd>F</kbd> / <kbd>Rueda</kbd> Fijar objetivo · <kbd>E</kbd> Interactuar</div>
    <div><kbd>1 2 3</kbd> Habilidades · <kbd>4</kbd>/<kbd>R</kbd> Poción</div><div><kbd>I</kbd> Inventario · <kbd>P</kbd> Habilidades · <kbd>J</kbd> Misiones · <kbd>M</kbd> Mapa · <kbd>Esc</kbd> Menú</div>
    <div><b>Combos</b></div><div>Espada: L-L-L-L · L-P (Alzamiento, mantén P para seguir al enemigo) · L-L-P (Tormenta) · En el aire: L-L-L, P = Caída Meteoro</div>
    <div>Látigo: L-L-L (Espiral) · P = Tirón (atrae enemigos o te lanza hacia los grandes) · Aire: P = Látigo Descendente</div>
    <div><b>Móvil</b></div><div>Joystick izquierdo para moverte, arrastra a la derecha para la cámara y usa los botones.</div>
    <div><b>Mando</b></div><div>Compatible con mandos estándar (X/□ golpe, Y/△ pesado, A salto, B esquiva, LB cambio, RB fijar).</div></div>`;
}
