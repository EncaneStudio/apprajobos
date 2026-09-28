import { G } from './state.js';
import { rand, choice } from './util.js';

// Audio procedural con WebAudio: efectos + música generativa (piano disperso al estilo BotW)
class Audio {
  constructor() { this.ctx = null; this.mode = 'explore'; this.nextNote = 0; this.beat = 0; this.nextBeat = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musBus = this.ctx.createGain(); this.musBus.connect(this.master);
    // Reverb sencilla
    this.rev = this.ctx.createConvolver();
    const len = this.ctx.sampleRate * 2.4;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.rev.buffer = buf;
    this.revGain = this.ctx.createGain(); this.revGain.gain.value = 0.35;
    this.rev.connect(this.revGain); this.revGain.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = G.settings.vol;
    this.musBus.gain.value = G.settings.music * 0.6;
  }

  // --- primitivas ---
  tone(freq, dur, { type = 'sine', vol = 0.2, attack = 0.005, when = 0, bus = this.sfxBus, rev = 0, slide = 0, detune = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { vol = 0.2, freq = 1000, q = 1, type = 'bandpass', when = 0, slide = 0, bus = this.sfxBus, attack = 0.003 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // --- efectos ---
  play(name, opt = {}) {
    if (!this.ctx) return;
    const p = opt.pitch || 1;
    switch (name) {
      case 'swing': this.noise(0.18, { vol: 0.25, freq: 900 * p, q: 1.5, slide: 2.8 }); break;
      case 'heavy': this.noise(0.32, { vol: 0.35, freq: 400 * p, q: 1.2, slide: 3 }); this.tone(90, 0.25, { type: 'triangle', vol: 0.15, slide: 0.6 }); break;
      case 'whip': this.noise(0.12, { vol: 0.25, freq: 1400, q: 2, slide: 3 }); this.noise(0.06, { vol: 0.4, freq: 5000, q: 1, when: 0.09, type: 'highpass' }); break;
      case 'hit': this.noise(0.12, { vol: 0.45, freq: 1800 * p, q: 0.8, slide: 0.3 }); this.tone(140 * p, 0.12, { type: 'square', vol: 0.12, slide: 0.4 }); break;
      case 'crit': this.play('hit', { pitch: 1.3 }); this.tone(1400, 0.25, { type: 'triangle', vol: 0.12, rev: 0.4 }); break;
      case 'hurt': this.noise(0.2, { vol: 0.4, freq: 500, slide: 0.4 }); this.tone(220, 0.2, { type: 'sawtooth', vol: 0.1, slide: 0.5 }); break;
      case 'enemyDie': this.noise(0.5, { vol: 0.3, freq: 600, slide: 0.2, q: 0.6 }); this.tone(300, 0.4, { type: 'triangle', vol: 0.12, slide: 0.3 }); break;
      case 'jump': this.noise(0.12, { vol: 0.12, freq: 700, slide: 1.8 }); break;
      case 'land': this.noise(0.1, { vol: 0.15, freq: 300, type: 'lowpass' }); break;
      case 'dodge': this.noise(0.22, { vol: 0.25, freq: 2000, q: 0.7, slide: 0.4 }); break;
      case 'step': this.noise(0.06, { vol: 0.05, freq: 500 + rand(-100, 100), type: 'lowpass' }); break;
      case 'switch':
        this.tone(660, 0.18, { type: 'triangle', vol: 0.12, rev: 0.3 }); this.tone(990, 0.25, { type: 'sine', vol: 0.1, when: 0.06, rev: 0.4 }); break;
      case 'pickup': [0, 4, 7, 12].forEach((s, i) => this.tone(880 * Math.pow(2, s / 12), 0.25, { type: 'triangle', vol: 0.1, when: i * 0.05, rev: 0.3 })); break;
      case 'coin': this.tone(1320, 0.1, { type: 'square', vol: 0.06 }); this.tone(1760, 0.2, { type: 'square', vol: 0.06, when: 0.07 }); break;
      case 'chest': [0, 2, 4, 5, 7, 9, 11, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.35, { type: 'triangle', vol: 0.1, when: i * 0.07, rev: 0.4 }));
        this.tone(1046, 1.2, { type: 'sine', vol: 0.12, when: 0.6, rev: 0.6 }); break;
      case 'levelup': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 0.6, { type: 'triangle', vol: 0.11, when: i * 0.08, rev: 0.5 })); break;
      case 'quest': [0, 7, 12, 16].forEach((s, i) => this.tone(440 * Math.pow(2, s / 12), 0.8, { type: 'sine', vol: 0.12, when: i * 0.12, rev: 0.6 })); break;
      case 'ui': this.tone(1200, 0.06, { type: 'sine', vol: 0.07 }); break;
      case 'uiOpen': this.tone(700, 0.1, { type: 'sine', vol: 0.08 }); this.tone(1050, 0.12, { type: 'sine', vol: 0.07, when: 0.05, rev: 0.3 }); break;
      case 'deny': this.tone(200, 0.15, { type: 'square', vol: 0.06 }); break;
      case 'slowmo': this.tone(300, 1.2, { type: 'sine', vol: 0.15, slide: 0.5, rev: 0.7 }); this.noise(0.8, { vol: 0.12, freq: 3000, slide: 0.2 }); break;
      case 'magic': this.tone(520, 0.5, { type: 'sine', vol: 0.12, slide: 2, rev: 0.5 }); this.noise(0.4, { vol: 0.12, freq: 4000, slide: 0.5 }); break;
      case 'boom': this.noise(0.6, { vol: 0.5, freq: 200, type: 'lowpass', slide: 0.3 }); this.tone(60, 0.5, { type: 'sine', vol: 0.3, slide: 0.5 }); break;
      case 'arrow': this.noise(0.15, { vol: 0.12, freq: 2500, slide: 0.5 }); break;
      case 'alert': this.tone(900, 0.12, { type: 'square', vol: 0.05 }); this.tone(1300, 0.15, { type: 'square', vol: 0.05, when: 0.1 }); break;
      case 'echo': [0, 5, 9, 14].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), 0.5, { type: 'sine', vol: 0.09, when: i * 0.09, rev: 0.7 })); break;
      case 'splash': this.noise(0.4, { vol: 0.25, freq: 900, q: 0.5, slide: 0.4 }); break;
      case 'portal': this.tone(200, 1.5, { type: 'sine', vol: 0.15, slide: 4, rev: 0.8 }); this.noise(1.2, { vol: 0.15, freq: 600, slide: 5 }); break;
      case 'block': this.tone(800, 0.1, { type: 'square', vol: 0.08 }); this.noise(0.1, { vol: 0.2, freq: 3000 }); break;
      case 'talk': this.tone(rand(500, 700), 0.04, { type: 'triangle', vol: 0.035 }); break;
      case 'hebra': this.tone(rand(900, 1200), 0.05, { type: 'sine', vol: 0.04, rev: 0.2 }); break;
    }
  }

  setMode(m) { this.mode = m; }

  update() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.mode === 'combat' || this.mode === 'boss') {
      if (now >= this.nextBeat) {
        const bpm = this.mode === 'boss' ? 150 : 132;
        const step = 60 / bpm / 2;
        const b = this.beat % 16;
        const root = this.mode === 'boss' ? 55 : 73.4;
        if (b % 4 === 0) this.tone(root, 0.22, { type: 'sine', vol: 0.35, slide: 0.5, bus: this.musBus });
        if (b % 8 === 4) this.noise(0.15, { vol: 0.22, freq: 1500, q: 0.6, bus: this.musBus });
        if (b % 2 === 1) this.noise(0.04, { vol: 0.07, freq: 8000, type: 'highpass', bus: this.musBus });
        const bassline = [0, 0, 3, 0, 5, 0, 3, 7, 0, 0, 3, 0, 8, 7, 5, 3];
        this.tone(root * 2 * Math.pow(2, bassline[b] / 12), step * 0.9, { type: 'sawtooth', vol: 0.05, bus: this.musBus });
        if (b === 0 || b === 8) {
          const ch = [0, 3, 7].map((s) => root * 4 * Math.pow(2, (s + (this.beat % 32 < 16 ? 0 : -2)) / 12));
          ch.forEach((f) => this.tone(f, step * 7, { type: 'triangle', vol: 0.03, bus: this.musBus, attack: 0.1 }));
        }
        this.beat++;
        this.nextBeat = Math.max(now, this.nextBeat) + step;
        if (this.nextBeat < now) this.nextBeat = now + step;
      }
      return;
    }
    if (now >= this.nextNote) {
      const night = G.dayTime < 6 || G.dayTime > 20;
      let scale, base;
      if (this.mode === 'dungeon') { scale = [0, 2, 3, 7, 8, 12]; base = 196; }
      else if (this.mode === 'village') { scale = [0, 2, 4, 7, 9, 12, 14]; base = 392; }
      else { scale = night ? [0, 3, 5, 7, 10, 12] : [0, 2, 4, 7, 9, 12, 16]; base = night ? 293.7 : 349.2; }
      const n = choice(scale);
      const f = base * Math.pow(2, n / 12) * (Math.random() < 0.25 ? 0.5 : 1);
      // "piano": fundamental + armónicos rápidos
      this.tone(f, 2.6, { type: 'triangle', vol: 0.07, rev: 0.6, bus: this.musBus, attack: 0.004 });
      this.tone(f * 2, 1.2, { type: 'sine', vol: 0.025, rev: 0.6, bus: this.musBus });
      if (Math.random() < 0.35) this.tone(f * Math.pow(2, choice([4, 7, 12]) / 12), 2.2, { type: 'triangle', vol: 0.045, rev: 0.7, bus: this.musBus, when: rand(0.15, 0.4) });
      if (Math.random() < 0.12) this.tone(base / 2, 4, { type: 'sine', vol: 0.05, rev: 0.8, bus: this.musBus, attack: 0.6 });
      this.nextNote = now + rand(this.mode === 'village' ? 0.5 : 1.2, this.mode === 'village' ? 1.6 : 3.8);
    }
  }
}

export const audio = new Audio();
