import { G } from './state.js';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyC: 'dodge', KeyQ: 'switch', KeyE: 'interact', KeyF: 'lock',
  Digit1: 'ab1', Digit2: 'ab2', Digit3: 'ab3', Digit4: 'potion', KeyR: 'potion',
  KeyI: 'inventory', Tab: 'inventory', KeyP: 'skills', KeyJ: 'quests', KeyM: 'map', Escape: 'pause',
  KeyZ: 'attack', KeyX: 'heavy', KeyV: 'dodge',
};

class Input {
  constructor() {
    this.state = {};
    this.prev = {};
    this.edge = {};
    this.look = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.joy = { x: 0, y: 0, active: false };
    this.wheel = 0;
    this.touchActs = {};
    this.gpActs = {};
    this.gpMove = { x: 0, y: 0 };
    this.locked = false;
    this.lastInputTouch = false;
  }

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const a = KEYMAP[e.code];
      if (a) {
        if (!this.state[a]) this.edge[a] = true;
        this.state[a] = true;
        if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      }
      this.lastInputTouch = false;
    });
    window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this.state[a] = false; });
    window.addEventListener('blur', () => { this.state = {}; });

    canvas.addEventListener('mousedown', (e) => {
      if (G.paused) return;
      if (!this.locked && !G.isTouch) { canvas.requestPointerLock?.(); }
      const a = e.button === 0 ? 'attack' : e.button === 2 ? 'heavy' : e.button === 1 ? 'lock' : null;
      if (a) { if (!this.state[a]) this.edge[a] = true; this.state[a] = true; }
    });
    window.addEventListener('mouseup', (e) => {
      const a = e.button === 0 ? 'attack' : e.button === 2 ? 'heavy' : e.button === 1 ? 'lock' : null;
      if (a) this.state[a] = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.lockT = performance.now(); });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked || performance.now() - this.lockT < 120) return;
      // descartar picos espurios al capturar el puntero
      if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
      this.look.x += e.movementX; this.look.y += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    this.initTouch();
  }

  initTouch() {
    const root = document.getElementById('touch');
    if (!root) return;
    const joyEl = document.getElementById('joy');
    const knob = document.getElementById('joyKnob');
    let joyId = null, joyCx = 0, joyCy = 0;
    const camTouches = new Map();
    const R = 55;

    const onStart = (e) => {
      this.lastInputTouch = true;
      for (const t of e.changedTouches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const btn = el && el.closest('[data-act]');
        if (btn) {
          const a = btn.dataset.act;
          if (!this.touchActs[a]) this.edge[a] = true;
          this.touchActs[a] = t.identifier;
          btn.classList.add('on');
          if (a === 'attack' || a === 'heavy') { camTouches.set(t.identifier, { x: t.clientX, y: t.clientY, btn: true }); }
          continue;
        }
        if (t.clientX < window.innerWidth * 0.42 && joyId === null) {
          joyId = t.identifier; joyCx = t.clientX; joyCy = t.clientY;
          joyEl.style.left = (joyCx - 70) + 'px'; joyEl.style.top = (joyCy - 70) + 'px';
          joyEl.classList.add('on');
          this.joy.active = true;
        } else {
          camTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
      if (!G.paused) e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - joyCx, dy = t.clientY - joyCy;
          const l = Math.hypot(dx, dy);
          if (l > R) { dx *= R / l; dy *= R / l; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.joy.x = dx / R; this.joy.y = -dy / R;
        } else if (camTouches.has(t.identifier)) {
          const c = camTouches.get(t.identifier);
          this.look.x += (t.clientX - c.x) * 1.6;
          this.look.y += (t.clientY - c.y) * 1.6;
          c.x = t.clientX; c.y = t.clientY;
        }
      }
      if (!G.paused) e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null; this.joy.x = 0; this.joy.y = 0; this.joy.active = false;
          knob.style.transform = ''; joyEl.classList.remove('on');
        }
        camTouches.delete(t.identifier);
        for (const a in this.touchActs) {
          if (this.touchActs[a] === t.identifier) {
            delete this.touchActs[a];
            root.querySelectorAll(`[data-act="${a}"]`).forEach((b) => b.classList.remove('on'));
          }
        }
      }
    };
    root.addEventListener('touchstart', onStart, { passive: false });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd);
    root.addEventListener('touchcancel', onEnd);
    // Botones de UI (menús) en móvil
    document.querySelectorAll('[data-uiact]').forEach((b) => {
      b.addEventListener('click', () => { this.edge[b.dataset.uiact] = true; });
    });
  }

  pollGamepad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps && [...gps].find((g) => g && g.connected);
    this.gpActs = {};
    this.gpMove.x = 0; this.gpMove.y = 0;
    if (!gp) return;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    this.gpMove.x = dz(gp.axes[0]); this.gpMove.y = -dz(gp.axes[1]);
    this.look.x += dz(gp.axes[2]) * 14; this.look.y += dz(gp.axes[3]) * 10;
    const map = { 0: 'jump', 2: 'attack', 3: 'heavy', 1: 'dodge', 4: 'switch', 5: 'lock', 6: 'sprint', 7: 'interact', 9: 'pause', 8: 'inventory', 12: 'ab1', 14: 'ab2', 15: 'ab3', 13: 'potion', 10: 'sprint' };
    for (const i in map) {
      const b = gp.buttons[i];
      if (b && b.pressed) {
        const a = map[i];
        this.gpActs[a] = true;
        if (!this.prev['gp_' + a]) this.edge[a] = true;
      }
    }
    for (const a of Object.values(map)) this.prev['gp_' + a] = !!this.gpActs[a];
  }

  update() {
    this.pollGamepad();
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y += 1;
    if (this.down('down')) y -= 1;
    const l = Math.hypot(x, y);
    if (l > 0) { x /= l; y /= l; }
    if (this.joy.active) { x = this.joy.x; y = this.joy.y; }
    if (this.gpMove.x || this.gpMove.y) { x = this.gpMove.x; y = this.gpMove.y; }
    this.move.x = x; this.move.y = y;
  }

  down(a) { return !!this.state[a] || this.touchActs[a] !== undefined || !!this.gpActs[a]; }
  pressed(a) { return !!this.edge[a]; }
  consume(a) { const v = !!this.edge[a]; this.edge[a] = false; return v; }
  endFrame() { this.edge = {}; this.look.x = 0; this.look.y = 0; this.wheel = 0; }
  releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }
}

export const input = new Input();
