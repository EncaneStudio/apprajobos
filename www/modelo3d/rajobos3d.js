/* Rajobos 3D — personaje estilo cel-shading con rig procedural y animaciones.
   Requiere window.THREE (r149). Expone window.Rajobos3D.create(canvas, opciones). */
(function () {
  'use strict';
  var TAU = Math.PI * 2, PI = Math.PI;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function angLerp(a, b, t) {
    var d = ((b - a + PI) % TAU + TAU) % TAU - PI;
    return a + d * t;
  }

  /* ---------- keyframes: [[tiempo, {clave: valor}, easing?], ...] ---------- */
  var EASE = { io: easeIO, out: easeOut, in: easeIn, lin: function (t) { return t; } };
  function sampleKeys(t, list) {
    if (t <= list[0][0]) return list[0][1];
    for (var i = 0; i < list.length - 1; i++) {
      var a = list[i], b = list[i + 1];
      if (t < b[0]) {
        var u = (t - a[0]) / (b[0] - a[0]);
        var e = (EASE[b[2]] || easeIO)(u);
        var out = {}, k;
        for (k in a[1]) out[k] = a[1][k];
        for (k in b[1]) if (!(k in out)) out[k] = 0;
        for (k in out) out[k] = lerp(out[k], b[1][k] || 0, e);
        return out;
      }
    }
    return list[list.length - 1][1];
  }

  function create(canvas, options) {
    var T = window.THREE;
    var opts = Object.assign({ outline: true, shadows: true, timeOfDay: 'dia' }, options || {});
    if (T.ColorManagement) T.ColorManagement.legacyMode = false;

    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    var maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(36, 1, 0.05, 1200);
    var R = rng(20160518);

    /* ================= TEXTURAS PINTADAS ================= */
    function makeTex(w, h, draw, o) {
      o = o || {};
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); draw(g, w, h);
      var t = new T.CanvasTexture(c);
      t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso;
      if (o.wrap) { t.wrapS = t.wrapT = T.RepeatWrapping; }
      if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
      return t;
    }
    function speckle(g, w, h, n, cols, a0, a1, s0, s1, mask) {
      for (var i = 0; i < n; i++) {
        var x = R() * w, y = R() * h;
        if (mask && R() > mask(x / w, y / h)) continue;
        g.globalAlpha = lerp(a0, a1, R());
        g.fillStyle = cols[(R() * cols.length) | 0];
        var s = lerp(s0, s1, R());
        g.beginPath(); g.ellipse(x, y, s, s * lerp(0.5, 1, R()), R() * PI, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    function strokes(g, w, h, n, cols, a0, a1, len, wid, ang, mask) {
      g.lineCap = 'round';
      for (var i = 0; i < n; i++) {
        var x = R() * w, y = R() * h;
        if (mask && R() > mask(x / w, y / h)) continue;
        var an = (ang == null ? R() * PI : ang + (R() - 0.5) * 0.5);
        var l = len * lerp(0.5, 1.2, R());
        g.globalAlpha = lerp(a0, a1, R());
        g.strokeStyle = cols[(R() * cols.length) | 0];
        g.lineWidth = wid * lerp(0.5, 1.3, R());
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(an) * l * 0.5 + (R() - 0.5) * l * 0.3, y + Math.sin(an) * l * 0.5, x + Math.cos(an) * l, y + Math.sin(an) * l);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    function radial(g, x, y, r, rgb, a) {
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }

    var SKIN = '#eab48f';
    var skinTex = makeTex(256, 256, function (g, w, h) {
      g.fillStyle = SKIN; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 900, ['#f4c7a4', '#dca27f', '#efb994'], 0.08, 0.22, 2, 8);
      strokes(g, w, h, 120, ['#f7cfae', '#d99d7b'], 0.05, 0.12, 30, 6);
    }, { wrap: true });

    function stubbleDots(g, w, h, n, mask) {
      speckle(g, w, h, n, ['#4a3a36', '#56443e', '#3c2e2b'], 0.08, 0.22, 0.5, 1.0, mask);
    }
    var headTex = makeTex(512, 256, function (g, w, h) {
      g.fillStyle = SKIN; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 1600, ['#f4c7a4', '#dca27f', '#efb994'], 0.07, 0.2, 2, 9);
      strokes(g, w, h, 220, ['#f7cfae', '#d99d7b'], 0.05, 0.12, 36, 7);
      var fx = w * 0.25;
      radial(g, fx - w * 0.095, h * 0.56, h * 0.11, '232,122,108', 0.3);
      radial(g, fx + w * 0.095, h * 0.56, h * 0.11, '232,122,108', 0.3);
      radial(g, fx, h * 0.5, h * 0.05, '240,150,120', 0.18);
      // sombra suave de barba (base)
      var mask = function (u, v) {
        var du = Math.abs(u - 0.25);
        var front = du < 0.25 ? 1 : 0;
        var beard = sstep(0.575, 0.66, v) * front * (1 - sstep(0.19, 0.25, du) * sstep(0.62, 0.5, v));
        var side = (1 - sstep(0.17, 0.2, Math.abs(du - 0.2) + 0.15)) * sstep(0.43, 0.5, v) * (1 - sstep(0.62, 0.7, v));
        var burn = (Math.abs(du - 0.205) < 0.028 ? 1 : 0) * sstep(0.42, 0.46, v);
        var lip = (du < 0.038 && v > 0.603 && v < 0.63) ? 0 : 1;
        var nose = (du < 0.03 && v < 0.585) ? 0 : 1;
        return Math.min(1, Math.max(beard, burn, side * 0.0)) * lip * nose;
      };
      g.globalAlpha = 1;
      var c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      var g2 = c2.getContext('2d');
      for (var y = 0; y < h; y += 2) for (var x = 0; x < w * 0.5; x += 2) {
        var m = mask(x / w, y / h);
        if (m > 0.01) { g2.fillStyle = 'rgba(92,78,84,' + (0.36 * m) + ')'; g2.fillRect(x, y, 2, 2); }
      }
      g.drawImage(c2, 0, 0);
      g.filter = 'blur(1.5px)'; g.drawImage(c2, 0, 0); g.filter = 'none'; stubbleDots(g, w, h, 5000, mask);
    });
    var jawTex = makeTex(256, 128, function (g, w, h) {
      g.fillStyle = SKIN; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(92,78,84,0.36)'; g.fillRect(0, 0, w, h);
      stubbleDots(g, w, h, 2500, null);
      speckle(g, w, h, 300, ['#dca27f'], 0.1, 0.2, 2, 6);
    }, { wrap: true });

    var irisTex = makeTex(128, 128, function (g, w, h) {
      g.fillStyle = '#f7f3ec'; g.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      var gr = g.createRadialGradient(cx, cy, 4, cx, cy, 62);
      gr.addColorStop(0, '#a8dcff'); gr.addColorStop(0.45, '#4a94e0'); gr.addColorStop(0.85, '#2a5fae'); gr.addColorStop(1, '#152c55');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 62, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,235,255,0.5)'; g.lineWidth = 1.5;
      for (var i = 0; i < 40; i++) { var a = i / 40 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); g.lineTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52); g.stroke(); }
      g.fillStyle = '#0a0f1c'; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 18, cy - 20, 12, 0, TAU); g.fill();
      g.globalAlpha = 0.7; g.beginPath(); g.arc(cx - 16, cy + 18, 5, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 16);
    });

    var HAIR = '#2b1d16';
    var hairTex = makeTex(256, 256, function (g, w, h) {
      g.fillStyle = HAIR; g.fillRect(0, 0, w, h);
      strokes(g, w, h, 900, ['#3f2b21', '#1b120e', '#4b3428'], 0.25, 0.6, 60, 2, PI / 2);
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(120,88,68,0)'); gr.addColorStop(0.35, 'rgba(120,88,68,0.35)'); gr.addColorStop(0.5, 'rgba(120,88,68,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { wrap: true });
    var capTex = makeTex(512, 256, function (g, w, h) {
      g.fillStyle = HAIR; g.fillRect(0, 0, w, h);
      strokes(g, w, h, 2200, ['#3f2b21', '#1b120e', '#4b3428'], 0.25, 0.6, 50, 2, PI / 2);
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(110,80,62,0.25)'); gr.addColorStop(0.3, 'rgba(110,80,62,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // degradado (fade) lateral: pelo rapado
      var fade = g.createLinearGradient(0, h * 0.6, 0, h * 0.85);
      fade.addColorStop(0, 'rgba(70,52,44,0)'); fade.addColorStop(1, 'rgba(78,58,48,0.85)');
      g.fillStyle = fade; g.fillRect(0, h * 0.5, w, h * 0.5);
      speckle(g, w, h, 5000, ['#20150f', '#33231b'], 0.4, 0.8, 0.6, 1.4, function (u, v) { return sstep(0.6, 0.8, v); });
    }, { wrap: true });

    // Camiseta blanca con estampado
    function shirtBase(g, w, h) {
      g.fillStyle = '#f4f1e9'; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.05; g.strokeStyle = '#8c8676';
      for (var y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.globalAlpha = 1;
      strokes(g, w, h, 60, ['#d8d2c4', '#e3ddd0'], 0.25, 0.45, 70, 10, null);
      speckle(g, w, h, 600, ['#e6e1d6', '#fbf9f4'], 0.2, 0.4, 1, 3);
    }
    var shirtTex = makeTex(512, 256, shirtBase, { wrap: true });
    var shirtChestTex = makeTex(512, 512, function (g, w, h) {
      shirtBase(g, w, h);
      // pliegues en la zona baja
      strokes(g, w, h, 40, ['#cfc8b8'], 0.25, 0.4, 90, 8, 0.3, function (u, v) { return v > 0.75 ? 1 : 0; });
      // estampado frontal centrado en u=0.5
      g.save();
      g.translate(w * 0.535, h * 0.36);
      g.scale(0.8, 1.85);
      g.fillStyle = '#1f2c44';
      g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.fill();
      g.fillStyle = '#f4f1e9';
      g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill();
      g.strokeStyle = '#2a8fe0'; g.lineWidth = 3;
      for (var r = 12; r < 36; r += 5) { g.beginPath(); g.arc(0, 0, r, -PI * 0.9, -PI * 0.1); g.stroke(); }
      g.fillStyle = '#1f2c44';
      g.font = '900 34px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('RJ', 0, 6);
      g.fillStyle = '#2a8fe0'; g.font = '700 9px sans-serif';
      g.fillText('RAJOBOS', 0, 30);
      g.restore();
      speckle(g, w, h, 500, ['#f4f1e9'], 0.15, 0.4, 0.5, 1.5, function (u, v) { return Math.abs(u - 0.535) < 0.1 && Math.abs(v - 0.36) < 0.2 ? 1 : 0; });
    }, { wrap: true });

    function denimBase(g, w, h) {
      g.fillStyle = '#3d5f90'; g.fillRect(0, 0, w, h);
      g.lineWidth = 1;
      for (var i = -h; i < w + h; i += 3) {
        g.strokeStyle = (i / 3) % 2 ? 'rgba(40,62,98,0.5)' : 'rgba(110,140,185,0.25)';
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h * 0.6, h); g.stroke();
      }
      speckle(g, w, h, 1500, ['#6d8fbf', '#2c4670', '#8aa7cf'], 0.1, 0.3, 0.6, 2);
      // desgaste frontal
      var gr = g.createLinearGradient(w * 0.3, 0, w * 0.7, 0);
      gr.addColorStop(0, 'rgba(150,180,215,0)'); gr.addColorStop(0.5, 'rgba(150,180,215,0.35)'); gr.addColorStop(1, 'rgba(150,180,215,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // costuras laterales
      g.setLineDash([5, 4]); g.strokeStyle = '#d79a4a'; g.lineWidth = 1.6;
      [0.25, 0.75].forEach(function (u) { g.beginPath(); g.moveTo(w * u - 3, 0); g.lineTo(w * u - 3, h); g.stroke(); g.beginPath(); g.moveTo(w * u + 3, 0); g.lineTo(w * u + 3, h); g.stroke(); });
      g.setLineDash([]);
    }
    var denimTex = makeTex(256, 512, function (g, w, h) {
      denimBase(g, w, h);
      g.strokeStyle = 'rgba(170,195,225,0.35)'; g.lineWidth = 2;
      for (var i = 0; i < 5; i++) { var y = h * (0.42 + i * 0.02); g.beginPath(); g.moveTo(w * 0.42, y); g.quadraticCurveTo(w * 0.5, y + 6, w * 0.58, y - 2); g.stroke(); }
    });
    var pelvisTex = makeTex(512, 256, function (g, w, h) {
      denimBase(g, w, h);
      g.strokeStyle = '#d79a4a'; g.lineWidth = 2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(w * 0.5 + 10, 0); g.lineTo(w * 0.5 + 10, h * 0.55); g.quadraticCurveTo(w * 0.5 + 8, h * 0.7, w * 0.5, h * 0.72); g.stroke();
      [[0.38, 1], [0.62, -1]].forEach(function (p) {
        g.beginPath(); g.moveTo(w * p[0] - p[1] * 40, 0); g.quadraticCurveTo(w * p[0] - p[1] * 10, h * 0.3, w * p[0] + p[1] * 12, h * 0.36); g.stroke();
      });
      [0.08, 0.92].forEach(function (u) { g.strokeRect(w * u - 22, h * 0.15, 44, h * 0.5); });
      g.setLineDash([]);
      g.fillStyle = '#c98f3e'; g.beginPath(); g.arc(w * 0.5, h * 0.06, 5, 0, TAU); g.fill();
    });

    var beltTex = makeTex(512, 64, function (g, w, h) {
      g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ece8df';
      for (var x = 0; x < w; x += 32) {
        g.beginPath(); g.moveTo(x, h * 0.22); g.lineTo(x + 16, h * 0.78); g.lineTo(x + 32, h * 0.22); g.lineTo(x + 26, h * 0.22); g.lineTo(x + 16, h * 0.55); g.lineTo(x + 6, h * 0.22); g.fill();
        g.fillRect(x + 14, h * 0.2, 4, 4);
      }
      g.fillStyle = '#2a8fe0';
      for (var x2 = 16; x2 < w; x2 += 64) { g.beginPath(); g.moveTo(x2, h * 0.3); g.lineTo(x2 + 5, h * 0.42); g.lineTo(x2, h * 0.54); g.lineTo(x2 - 5, h * 0.42); g.fill(); }
      g.strokeStyle = '#8f8a80'; g.setLineDash([4, 3]); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.moveTo(0, h - 5); g.lineTo(w, h - 5); g.stroke(); g.setLineDash([]);
    }, { wrap: true });

    function leather(base, dark, light) {
      return makeTex(256, 256, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        speckle(g, w, h, 1500, [dark, light], 0.1, 0.3, 1, 5);
        strokes(g, w, h, 80, [light], 0.12, 0.25, 26, 1.5, null);
        g.strokeStyle = '#d8b58a'; g.setLineDash([6, 5]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, 10); g.lineTo(w, 10); g.moveTo(0, h - 10); g.lineTo(w, h - 10); g.stroke(); g.setLineDash([]);
      }, { wrap: true });
    }
    var leatherTex = leather('#74492b', '#4e2f1a', '#9a6a44');
    var bootTex = leather('#5b3a23', '#3a2415', '#80583a');
    var wrapTex = makeTex(128, 128, function (g, w, h) {
      g.fillStyle = '#dccaa3'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(140,110,70,0.5)'; g.lineWidth = 2;
      for (var i = -h; i < w; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
      speckle(g, w, h, 300, ['#b9a47c', '#f0e2c2'], 0.2, 0.4, 0.5, 1.5);
    }, { wrap: true });

    var vinylTex = makeTex(512, 512, function (g, w, h) {
      var cx = w / 2, cy = h / 2;
      g.fillStyle = '#101114'; g.fillRect(0, 0, w, h);
      for (var r = 250; r > 90; r -= 2) {
        g.strokeStyle = (r % 4) ? '#1c1d22' : '#0b0b0e'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      }
      if (g.createConicGradient) {
        var cg = g.createConicGradient(0.6, cx, cy);
        cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.08, 'rgba(190,220,255,0.22)'); cg.addColorStop(0.16, 'rgba(255,255,255,0)');
        cg.addColorStop(0.5, 'rgba(255,255,255,0)'); cg.addColorStop(0.58, 'rgba(190,220,255,0.18)'); cg.addColorStop(0.66, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 252, 0, TAU); g.fill();
      }
      var lg = g.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 90);
      lg.addColorStop(0, '#5fb8ff'); lg.addColorStop(1, '#1d6fc4');
      g.fillStyle = lg; g.beginPath(); g.arc(cx, cy, 88, 0, TAU); g.fill();
      g.strokeStyle = '#e9f5ff'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 80, 0, TAU); g.stroke();
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 900 30px "Arial Black", Impact, sans-serif'; g.fillText('RAJOBOS', cx, cy - 28);
      g.font = '700 13px sans-serif'; g.fillText('LATIN HOUSE · 33⅓', cx, cy + 34);
      g.fillStyle = '#0b1a2e'; g.beginPath(); g.arc(cx, cy, 10, 0, TAU); g.fill();
    });

    var clothTex = makeTex(512, 256, function (g, w, h) {
      g.fillStyle = '#efe2c2'; g.fillRect(0, 0, w, h);
      strokes(g, w, h, 300, ['#e2d2ad', '#f7ecd2'], 0.2, 0.4, 40, 2, 0);
      g.fillStyle = '#b8412e'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
      g.fillStyle = '#efe2c2';
      for (var x = 0; x < w; x += 20) { g.beginPath(); g.moveTo(x, 26); g.lineTo(x + 10, 14); g.lineTo(x + 20, 26); g.fill(); g.beginPath(); g.moveTo(x, h - 26); g.lineTo(x + 10, h - 14); g.lineTo(x + 20, h - 26); g.fill(); }
      g.fillStyle = '#2a7fd4'; g.fillRect(0, 44, w, 14); g.fillRect(0, h - 58, w, 14);
      for (var x3 = 24; x3 < w; x3 += 48) {
        g.fillStyle = '#2a7fd4'; g.beginPath(); g.moveTo(x3, h / 2 - 34); g.lineTo(x3 + 16, h / 2); g.lineTo(x3, h / 2 + 34); g.lineTo(x3 - 16, h / 2); g.fill();
        g.fillStyle = '#efe2c2'; g.beginPath(); g.arc(x3, h / 2, 6, 0, TAU); g.fill();
      }
    });

    /* ================= MATERIALES ================= */
    var ramp = (function () {
      var w = 256, d = new Uint8Array(w * 4);
      for (var i = 0; i < w; i++) {
        var x = i / (w - 1);
        var v = 0.5 + 0.38 * sstep(0.46, 0.53, x) + 0.12 * sstep(0.78, 0.84, x);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(v * 255); d[i * 4 + 3] = 255;
      }
      var t = new T.DataTexture(d, w, 1, T.RGBAFormat);
      t.minFilter = t.magFilter = T.LinearFilter; t.needsUpdate = true;
      return t;
    })();
    var rimU = { value: 0.6 }, rimColU = { value: new T.Color('#fff1d6') };
    function rimPatch(sh) {
      sh.uniforms.uRim = rimU; sh.uniforms.uRimCol = rimColU;
      sh.fragmentShader = 'uniform float uRim;\nuniform vec3 uRimCol;\n' + sh.fragmentShader.replace('#include <output_fragment>',
        'float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);\n' +
        'rimF = smoothstep(0.62, 0.95, rimF);\n' +
        'outgoingLight += uRimCol * rimF * uRim * (0.3 + 0.7 * diffuseColor.rgb);\n' +
        '#include <output_fragment>');
    }
    function toon(color, map, extra) {
      var m = new T.MeshToonMaterial(Object.assign({ color: color, map: map || null, gradientMap: ramp }, extra || {}));
      m.onBeforeCompile = rimPatch;
      m.customProgramCacheKey = function () { return 'rjtoon'; };
      return m;
    }
    var outlineMats = {}, outlineMeshes = [];
    function outlineMat(w) {
      if (outlineMats[w]) return outlineMats[w];
      var m = new T.MeshBasicMaterial({ color: 0x2a211d, side: T.BackSide });
      var u = { value: w };
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uW = u;
        sh.vertexShader = 'uniform float uW;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * uW;');
      };
      m.customProgramCacheKey = function () { return 'rjoutline'; };
      outlineMats[w] = m; return m;
    }

    var MAT = {
      skin: toon('#ffffff', skinTex), head: toon('#ffffff', headTex), jaw: toon('#ffffff', jawTex),
      hair: toon('#ffffff', hairTex, { side: T.DoubleSide }), cap: toon('#ffffff', capTex),
      brow: toon('#231912'), lash: new T.MeshBasicMaterial({ color: 0x1a120e }),
      eyeWhite: new T.MeshBasicMaterial({ color: 0xf6f2ea }), iris: new T.MeshBasicMaterial({ map: irisTex }),
      mouth: toon('#a45a4f'), mouthIn: new T.MeshBasicMaterial({ color: 0x4a1d1d }), teeth: new T.MeshBasicMaterial({ color: 0xf3efe6 }),
      shirt: toon('#ffffff', shirtTex), shirtChest: toon('#ffffff', shirtChestTex),
      denim: toon('#ffffff', denimTex), pelvis: toon('#ffffff', pelvisTex), belt: toon('#ffffff', beltTex),
      leather: toon('#ffffff', leatherTex), boot: toon('#ffffff', bootTex), wrap: toon('#ffffff', wrapTex),
      glove: toon('#3a2a20'), sole: toon('#2a1e17'),
      metal: toon('#d9dde2', null, { emissive: new T.Color('#1b2230') }), gold: toon('#d8ad52'),
      blade: toon('#e6edf5', null, { emissive: new T.Color('#3a8fe8'), emissiveIntensity: 0 }),
      fuller: new T.MeshBasicMaterial({ color: 0x57b9ff }),
      gem: new T.MeshBasicMaterial({ color: 0x46b4ff }),
      gripWrap: toon('#24466f'),
      phones: toon('#1d1e23'), phonesAccent: new T.MeshBasicMaterial({ color: 0x3aa0ff }),
      slate: toon('#2b2f38'), screen: new T.MeshBasicMaterial({ color: 0x5fd0ff }),
      vinylTop: toon('#ffffff', vinylTex), vinylSide: toon('#15161a'),
      wood: toon('#8a5a34'), string: new T.LineBasicMaterial({ color: 0xf3ead6 }),
      cloth: toon('#ffffff', clothTex, { side: T.DoubleSide }), feather: toon('#c9412e')
    };

    /* ================= GEOMETRÍA ================= */
    function latheGeo(ctrl, zScale, seg, n) {
      n = n || 18; seg = seg || 28;
      var y0 = ctrl[0][0], y1 = ctrl[ctrl.length - 1][0], pts = [];
      for (var i = 0; i <= n; i++) {
        var y = lerp(y0, y1, i / n), j = 0;
        while (j < ctrl.length - 2 && y > ctrl[j + 1][0]) j++;
        var a = ctrl[j], b = ctrl[j + 1];
        var u = (y - a[0]) / (b[0] - a[0] || 1);
        u = u * u * (3 - 2 * u);
        pts.push(new T.Vector2(Math.max(0.0005, lerp(a[1], b[1], u)), y));
      }
      var g = new T.LatheGeometry(pts, seg, PI, TAU);
      if (zScale && zScale !== 1) g.scale(1, 1, zScale);
      g.computeVertexNormals();
      return g;
    }
    function ell(rx, ry, rz, ws, hs) { var g = new T.SphereGeometry(1, ws || 24, hs || 16); g.scale(rx, ry, rz); return g; }
    function cap(r, len, rs) { return new T.CapsuleGeometry(r, len, 4, rs || 10); }

    var OUT_W = 0.0042;
    function add(parent, geo, mat, pos, rot, o) {
      o = o || {};
      var m = new T.Mesh(geo, mat);
      if (pos) m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
      m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false;
      parent.add(m);
      if (o.ol !== 0) {
        var ol = new T.Mesh(geo, outlineMat(o.ol || OUT_W));
        ol.castShadow = false; ol.receiveShadow = false;
        m.add(ol); outlineMeshes.push(ol);
      }
      return m;
    }
    function grp(parent, pos, rot) {
      var g = new T.Group();
      if (pos) g.position.set(pos[0], pos[1], pos[2]);
      if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
      if (parent) parent.add(g);
      return g;
    }
    function ring(parent, r, tube, y, mat, zs, rs) {
      var g = new T.TorusGeometry(r, tube, 6, rs || 28); g.rotateX(PI / 2); if (zs) g.scale(1, 1, zs);
      return add(parent, g, mat, [0, y, 0], null, { ol: 0 });
    }

    /* ================= PERSONAJE ================= */
    var HIP_Y = 0.99;
    var root = grp(scene);
    var rig = grp(root, [0, HIP_Y, 0]);
    var hips = grp(rig);
    var B = {};
    B.hips = hips; B.rig = rig;

    // pelvis / vaqueros
    add(hips, latheGeo([[-0.17, 0.132], [-0.1, 0.156], [-0.02, 0.163], [0.03, 0.16], [0.06, 0.152]], 0.76), MAT.pelvis);
    add(hips, ell(0.075, 0.05, 0.07), MAT.denim, [0, -0.15, 0], null, { ol: 0 });
    add(hips, latheGeo([[-0.002, 0.166], [0.048, 0.162]], 0.77, 40, 2), MAT.belt, null, null, { ol: 0.003 });
    var buckle = add(hips, new T.BoxGeometry(0.056, 0.044, 0.012), MAT.metal, [0, 0.023, 0.128], null, { ol: 0 });
    add(buckle, new T.BoxGeometry(0.036, 0.026, 0.006), MAT.phones, [0, 0, 0.005], null, { ol: 0 });
    add(buckle, new T.OctahedronGeometry(0.008), MAT.gem, [0, 0, 0.009], null, { ol: 0, shadow: false });
    // bolsa y tableta (lado derecho = -x)
    var pouch = grp(hips, [-0.155, -0.035, 0.02], [0, 0, 0.12]);
    add(pouch, ell(0.03, 0.05, 0.05), MAT.leather, [0, 0, 0]);
    var slateG = grp(hips, [-0.16, -0.04, -0.06], [0, -PI / 2, 0.08]);
    add(slateG, new T.BoxGeometry(0.1, 0.13, 0.016), MAT.slate, [0, 0, 0], null, { ol: 0 });
    add(slateG, new T.PlaneGeometry(0.078, 0.098), MAT.screen, [0, 0, 0.0085], null, { ol: 0, shadow: false });
    add(slateG, new T.RingGeometry(0.012, 0.018, 20), MAT.slate, [0, 0.008, 0.009], null, { ol: 0, shadow: false });

    // columna / abdomen
    var spine = grp(hips, [0, 0.06, 0]); B.spine = spine;
    add(spine, latheGeo([[-0.018, 0.17], [0.02, 0.165], [0.1, 0.153], [0.2, 0.156]], 0.72), MAT.shirt);
    var chest = grp(spine, [0, 0.17, 0]); B.chest = chest;
    add(chest, latheGeo([[-0.07, 0.156], [0.0, 0.162], [0.08, 0.177], [0.16, 0.186], [0.22, 0.179], [0.27, 0.142], [0.3, 0.085], [0.318, 0.05]], 0.7, 32, 22), MAT.shirtChest);
    var collarG = new T.TorusGeometry(0.058, 0.011, 8, 28); collarG.rotateX(PI / 2);
    add(chest, collarG, MAT.shirt, [0, 0.302, 0.004], [0.12, 0, 0], { ol: 0.003 });

    // bandolera
    var strapPts = [[-0.13, 0.29, 0.02], [-0.07, 0.2, 0.135], [0.03, 0.08, 0.142], [0.12, -0.02, 0.128], [0.182, -0.06, 0.05], [0.18, -0.05, -0.06], [0.1, 0.03, -0.138], [0.0, 0.14, -0.142], [-0.1, 0.24, -0.1], [-0.155, 0.29, -0.03]]
      .map(function (p) { return new T.Vector3(p[0], p[1], p[2]); });
    var strapGeo = new T.TubeGeometry(new T.CatmullRomCurve3(strapPts, true), 80, 0.013, 6, true);
    add(chest, strapGeo, MAT.leather, null, null, { ol: 0.003 });
    var strapBuckle = add(chest, new T.CylinderGeometry(0.024, 0.024, 0.01, 18), MAT.gold, [0.025, 0.09, 0.148], [PI / 2 - 0.1, 0, 0.6], { ol: 0.002 });
    add(strapBuckle, new T.OctahedronGeometry(0.01), MAT.gem, [0, 0.008, 0], null, { ol: 0, shadow: false });

    // cuello, auriculares
    var neck = grp(chest, [0, 0.3, 0]); B.neck = neck;
    add(neck, new T.CylinderGeometry(0.05, 0.057, 0.1, 18), MAT.skin, [0, 0.035, 0], null, { ol: 0 });
    var phonesNeck = grp(neck, [0, 0.0, 0.0], [0.25, 0, 0]);
    (function () {
      var g = 0.62;
      var band = new T.TorusGeometry(0.09, 0.012, 8, 36, TAU - 2 * g); band.rotateZ(PI / 2 + g); band.rotateX(PI / 2);
      add(phonesNeck, band, MAT.phones, [0, 0.0, 0], null, { ol: 0.003 });
      [-1, 1].forEach(function (s) {
        var cup = grp(phonesNeck, [s * (Math.sin(g) * 0.09 + 0.012), -0.012, Math.cos(g) * 0.09 - 0.005], [0, s * 0.55, s * PI / 2]);
        add(cup, new T.CylinderGeometry(0.036, 0.036, 0.026, 22), MAT.phones, null, null, { ol: 0.003 });
        add(cup, new T.TorusGeometry(0.03, 0.004, 6, 22), MAT.phonesAccent, [0, -s * 0.0135, 0], [PI / 2, 0, 0], { ol: 0, shadow: false });
      });
    })();

    // cabeza
    var head = grp(neck, [0, 0.07, 0]); B.head = head;
    var HC = [0, 0.1, 0], HR = [0.099, 0.124, 0.113];
    var headG = new T.SphereGeometry(1, 48, 32); headG.scale(HR[0], HR[1], HR[2]);
    add(head, headG, MAT.head, HC);
    add(head, ell(0.078, 0.064, 0.09, 32, 20), MAT.jaw, [0, 0.046, 0.013], null, { ol: 0 });
    // orejas
    [-1, 1].forEach(function (s) {
      var ear = add(head, ell(0.013, 0.031, 0.021), MAT.skin, [s * 0.097, 0.098, -0.006], [0, s * 0.2, s * -0.08], { ol: 0.003 });
      add(ear, ell(0.006, 0.02, 0.012), MAT.mouth, [s * 0.006, 0, 0.002], null, { ol: 0, shadow: false });
    });
    // nariz
    add(head, ell(0.013, 0.026, 0.017), MAT.skin, [0, 0.092, 0.107], [-0.28, 0, 0], { ol: 0.0025 });
    add(head, ell(0.011, 0.0095, 0.011), MAT.skin, [0, 0.076, 0.115], null, { ol: 0.0025 });
    [-1, 1].forEach(function (s) { add(head, ell(0.008, 0.007, 0.008), MAT.skin, [s * 0.011, 0.074, 0.111], null, { ol: 0.002 }); });
    // ojos
    var eyes = [], brows = [];
    [-1, 1].forEach(function (s) {
      var eg = grp(head, [s * 0.039, 0.112, 0.098], [0, s * 0.35, 0]);
      add(eg, ell(0.02, 0.0135, 0.006, 20, 12), MAT.eyeWhite, [0, 0, 0.004], null, { ol: 0, shadow: false });
      var irisG = new T.CircleGeometry(0.0102, 28);
      var iris = add(eg, irisG, MAT.iris, [0, -0.0005, 0.0102], null, { ol: 0, shadow: false });
      iris.scale.set(1, 1.08, 1);
      var lashG = new T.TorusGeometry(0.0205, 0.0026, 6, 24, PI * 1.02); lashG.rotateZ(-0.01);
      add(eg, lashG, MAT.lash, [0, -0.002, 0.008], null, { ol: 0, shadow: false, scale: [1.05, 0.72, 1] });
      add(eg, new T.TorusGeometry(0.019, 0.0012, 4, 16, PI * 0.6), MAT.lash, [0, 0.001, 0.008], [0, 0, PI + PI * 0.2], { ol: 0, shadow: false, scale: [1, 0.6, 1] });
      eyes.push(eg);
      var bg = grp(head, [s * 0.041, 0.146, 0.099], [0, s * 0.32, 0]);
      var brow = add(bg, cap(0.0058, 0.034, 8), MAT.brow, [0, 0, 0], [0, 0, PI / 2], { ol: 0, scale: [1.4, 1, 0.6] });
      brow.userData.s = s;
      brows.push(bg);
    });
    // boca
    var mouthG = grp(head, [0, 0.053, 0.108]);
    var lipG = new T.TorusGeometry(0.05, 0.0028, 6, 18, 0.6); lipG.rotateZ(-PI / 2 - 0.3);
    var lip = add(mouthG, lipG, MAT.mouth, [0, 0.05, 0], null, { ol: 0, shadow: false });
    var mouthOpen = add(mouthG, ell(0.016, 0.01, 0.005), MAT.mouthIn, [0, -0.002, -0.002], null, { ol: 0, shadow: false });
    add(mouthOpen, ell(0.012, 0.003, 0.002), MAT.teeth, [0, 0.0055, 0.003], null, { ol: 0, shadow: false });
    // pelo
    var HAIR_C = [0, 0.1, -0.004], HAIR_R = [HR[0] * 1.045, HR[1] * 1.04, HR[2] * 1.045];
    (function buildHair() {
      var th = PI * 0.8;
      var g = new T.SphereGeometry(1, 48, 28, 0, TAU, 0, th);
      var p = g.attributes.position, v = new T.Vector3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize();
        var theta = Math.acos(clamp(v.y, -1, 1));
        var alpha = Math.abs(Math.atan2(v.x, v.z));
        var lim = PI * (0.25 + 0.3 * sstep(0.15, PI / 2, alpha) + 0.23 * sstep(PI / 2, PI, alpha));
        var k = theta > lim ? 0.93 : (1.0 + 0.12 * Math.pow(Math.max(0, v.y), 1.6) * (1 - 0.5 * sstep(PI / 2, PI, alpha)));
        if (theta <= lim && theta > lim - 0.12) k = lerp(1.0, k, 0.4);
        p.setXYZ(i, v.x * HAIR_R[0] * k, v.y * HAIR_R[1] * k, v.z * HAIR_R[2] * k);
      }
      g.computeVertexNormals();
      add(head, g, MAT.cap, HAIR_C, null, { ol: 0.0035 });

      function tuftGeo(len, r0, bend, flat) {
        var sl = 7, sr = 7, pos = [], uv = [], idx = [];
        for (var i2 = 0; i2 <= sl; i2++) {
          var t = i2 / sl, y = len * t, zc = -bend * t * t * len, r = r0 * (1 - t * 0.92) * (1 - 0.15 * t);
          for (var j = 0; j <= sr; j++) {
            var a = j / sr * TAU;
            pos.push(Math.cos(a) * r, y, zc + Math.sin(a) * r * flat);
            uv.push(j / sr, t);
          }
        }
        for (i2 = 0; i2 < sl; i2++) for (j = 0; j < sr; j++) {
          var a0 = i2 * (sr + 1) + j, b0 = a0 + sr + 1;
          idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
        }
        var gg = new T.BufferGeometry();
        gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        gg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        gg.setIndex(idx); gg.computeVertexNormals();
        return gg;
      }
      var Y = new T.Vector3(0, 1, 0), q = new T.Quaternion();
      var rows = 7, cols = 13;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var theta = lerp(0.12, 1.02, r / (rows - 1)) + (R() - 0.5) * 0.08;
        var alpha = lerp(-1.35, 1.35, c / (cols - 1)) + (R() - 0.5) * 0.12;
        var front = Math.max(0, Math.cos(alpha)) * (1 - sstep(0.5, 1.1, theta));
        var lim = PI * (0.25 + 0.3 * sstep(0.15, PI / 2, Math.abs(alpha)));
        if (theta > lim - 0.05) continue;
        var d = new T.Vector3(Math.sin(theta) * Math.sin(alpha), Math.cos(theta), Math.sin(theta) * Math.cos(alpha));
        var kk = 1.0 + 0.12 * Math.pow(Math.max(0, d.y), 1.6);
        var pos = new T.Vector3(d.x * HAIR_R[0] * kk * 0.96 + HAIR_C[0], d.y * HAIR_R[1] * kk * 0.96 + HAIR_C[1], d.z * HAIR_R[2] * kk * 0.96 + HAIR_C[2]);
        var n = new T.Vector3(d.x / HAIR_R[0], d.y / HAIR_R[1], d.z / HAIR_R[2]).normalize();
        var dir = n.clone().multiplyScalar(0.5 + 0.5 * front).add(new T.Vector3(0, 0.3 * front, -0.95 + 0.35 * front)).normalize();
        var len = lerp(0.04, 0.072, front) * lerp(0.85, 1.15, R());
        var tg = tuftGeo(len, lerp(0.024, 0.032, front), lerp(1.3, 1.1, front), 0.5);
        var m = add(head, tg, MAT.hair, [pos.x, pos.y, pos.z], null, { ol: 0.0025 });
        q.setFromUnitVectors(Y, dir); m.quaternion.copy(q);
        m.rotateY((R() - 0.5) * 0.6);
      }
      // patillas
      [-1, 1].forEach(function (s) {
        add(head, ell(0.006, 0.026, 0.012), MAT.hair, [s * 0.093, 0.1, 0.03], [0, s * 0.25, 0], { ol: 0 });
      });
    })();
    // auriculares en la cabeza (baile)
    var phonesHead = grp(head, [0, 0.1, -0.005]);
    (function () {
      var band = new T.TorusGeometry(0.128, 0.011, 8, 36, PI);
      add(phonesHead, band, MAT.phones, [0, 0.005, 0], null, { ol: 0.003 });
      [-1, 1].forEach(function (s) {
        var cup = grp(phonesHead, [s * 0.118, -0.005, 0], [0, 0, s * PI / 2]);
        add(cup, new T.CylinderGeometry(0.04, 0.04, 0.03, 22), MAT.phones, null, null, { ol: 0.003 });
        add(cup, new T.TorusGeometry(0.034, 0.004, 6, 22), MAT.phonesAccent, [0, -s * 0.016, 0], [PI / 2, 0, 0], { ol: 0, shadow: false });
      });
    })();
    phonesHead.visible = false;

    // brazos
    function buildArm(s) {
      var sfx = s > 0 ? 'L' : 'R';
      var up = grp(chest, [s * 0.19, 0.232, -0.005]); up.rotation.order = 'YXZ'; B['uArm' + sfx] = up;
      add(up, ell(0.06, 0.054, 0.058), MAT.shirt, [0, -0.016, 0]);
      add(up, latheGeo([[-0.14, 0.061], [-0.07, 0.062], [0.0, 0.063]], 1, 22, 6), MAT.shirt);
      ring(up, 0.061, 0.004, -0.139, MAT.shirt, 1, 22);
      add(up, latheGeo([[-0.285, 0.037], [-0.2, 0.042], [-0.1, 0.047], [0, 0.048]], 1, 20, 8), MAT.skin);
      add(up, new T.SphereGeometry(0.038, 16, 12), MAT.skin, [0, -0.285, 0], null, { ol: 0 });
      var lo = grp(up, [0, -0.285, 0]); B['lArm' + sfx] = lo;
      add(lo, latheGeo([[-0.25, 0.03], [-0.15, 0.037], [-0.03, 0.04], [0, 0.038]], 1, 20, 8), MAT.skin);
      add(lo, latheGeo([[-0.245, 0.036], [-0.2, 0.04], [-0.12, 0.044], [-0.075, 0.045]], 1, 20, 6), MAT.leather, null, null, { ol: 0.003 });
      [-0.1, -0.155, -0.21].forEach(function (y) { ring(lo, 0.044 - (y + 0.1) * -0.03, 0.005, y, MAT.wrap, 1, 20); });
      var hand = grp(lo, [0, -0.25, 0]); B['hand' + sfx] = hand;
      add(hand, ell(0.022, 0.048, 0.041), MAT.glove, [0, -0.042, 0], null, { ol: 0.0025 });
      add(hand, new T.CylinderGeometry(0.034, 0.032, 0.03, 16), MAT.glove, [0, -0.01, 0], null, { ol: 0, scale: [0.72, 1, 1.1] });
      var fingers = [];
      [[0.028, 1.0], [0.0095, 1.08], [-0.009, 1.02], [-0.026, 0.84]].forEach(function (f) {
        var fg = grp(hand, [-s * 0.002, -0.086, f[0]]);
        var L1 = 0.02 * f[1], L2 = 0.017 * f[1];
        add(fg, cap(0.0093, L1, 8), MAT.skin, [0, -L1 / 2 - 0.006, 0], null, { ol: 0.002 });
        var j = grp(fg, [0, -L1 - 0.012, 0]);
        add(j, cap(0.0085, L2, 8), MAT.skin, [0, -L2 / 2 - 0.004, 0], null, { ol: 0.002 });
        fingers.push({ a: fg, b: j });
      });
      var th = grp(hand, [-s * 0.01, -0.028, 0.034], [-0.6, 0, 0]);
      add(th, cap(0.0105, 0.022, 8), MAT.glove, [0, -0.016, 0], null, { ol: 0.002 });
      var thj = grp(th, [0, -0.034, 0]);
      add(thj, cap(0.0095, 0.016, 8), MAT.skin, [0, -0.01, 0], null, { ol: 0.002 });
      var sock = grp(hand, [-s * 0.024, -0.072, 0]);
      return { up: up, lo: lo, hand: hand, fingers: fingers, thumb: th, thumbJ: thj, sock: sock, s: s };
    }
    var armL = buildArm(1), armR = buildArm(-1);

    // piernas
    function buildLeg(s) {
      var sfx = s > 0 ? 'L' : 'R';
      var th = grp(hips, [s * 0.088, -0.07, 0]); B['thigh' + sfx] = th;
      add(th, latheGeo([[-0.44, 0.056], [-0.3, 0.064], [-0.12, 0.074], [0.02, 0.079], [0.07, 0.07]], 1, 24, 10), MAT.denim);
      var sh = grp(th, [0, -0.44, 0]); B['shin' + sfx] = sh;
      add(sh, new T.SphereGeometry(0.058, 18, 12), MAT.denim, null, null, { ol: 0 });
      add(sh, latheGeo([[-0.25, 0.05], [-0.15, 0.052], [-0.05, 0.056], [0.0, 0.057]], 1, 24, 8), MAT.denim);
      add(sh, latheGeo([[-0.405, 0.05], [-0.33, 0.047], [-0.22, 0.056], [-0.15, 0.064], [-0.105, 0.068]], 1, 24, 10), MAT.boot);
      ring(sh, 0.069, 0.008, -0.105, MAT.boot, 1, 24);
      [-0.2, -0.255, -0.31].forEach(function (y, i) { ring(sh, 0.058 - i * 0.004, 0.0055, y, MAT.wrap, 1, 24); });
      var ft = grp(sh, [0, -0.405, 0]); B['foot' + sfx] = ft;
      add(ft, ell(0.055, 0.05, 0.115), MAT.boot, [0, -0.032, 0.045]);
      add(ft, ell(0.047, 0.035, 0.05), MAT.boot, [0, -0.045, 0.12], null, { ol: 0 });
      add(ft, ell(0.06, 0.017, 0.128), MAT.sole, [0, -0.064, 0.046], null, { ol: 0.003 });
      return { th: th, sh: sh, ft: ft };
    }
    buildLeg(1); buildLeg(-1);

    /* ---------- equipo ---------- */
    // Espada: agarre en el origen, hoja hacia +y
    var sword = new T.Group();
    (function () {
      add(sword, new T.CylinderGeometry(0.0155, 0.017, 0.15, 12), MAT.gripWrap, [0, 0, 0], null, { ol: 0.002 });
      for (var i = 0; i < 6; i++) ring(sword, 0.017, 0.0035, -0.06 + i * 0.024, MAT.gold, 1, 14).rotation.z = 0.25;
      add(sword, new T.SphereGeometry(0.024, 16, 12), MAT.gold, [0, -0.088, 0], null, { ol: 0.002 });
      add(sword, new T.OctahedronGeometry(0.012), MAT.gem, [0, -0.1, 0], null, { ol: 0, shadow: false });
      var gs = new T.Shape();
      gs.moveTo(-0.11, 0.012); gs.quadraticCurveTo(-0.06, -0.012, 0, -0.016); gs.quadraticCurveTo(0.06, -0.012, 0.11, 0.012);
      gs.quadraticCurveTo(0.07, 0.03, 0.03, 0.02); gs.lineTo(0, 0.034); gs.lineTo(-0.03, 0.02); gs.quadraticCurveTo(-0.07, 0.03, -0.11, 0.012);
      var gg = new T.ExtrudeGeometry(gs, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 });
      gg.translate(0, 0, -0.011);
      add(sword, gg, MAT.gold, [0, 0.086, 0], null, { ol: 0.002 });
      add(sword, new T.OctahedronGeometry(0.016), MAT.gem, [0, 0.092, 0], [0, 0, 0], { ol: 0, shadow: false, scale: [1, 1.3, 1.6] });
      var bs = new T.Shape();
      bs.moveTo(-0.027, 0); bs.lineTo(-0.025, 0.6); bs.quadraticCurveTo(-0.018, 0.68, 0, 0.73); bs.quadraticCurveTo(0.018, 0.68, 0.025, 0.6); bs.lineTo(0.027, 0); bs.lineTo(-0.027, 0);
      var bg = new T.ExtrudeGeometry(bs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 2, curveSegments: 12 });
      bg.translate(0, 0, -0.003);
      add(sword, bg, MAT.blade, [0, 0.105, 0], null, { ol: 0.002 });
      [-1, 1].forEach(function (s) {
        add(sword, new T.PlaneGeometry(0.009, 0.45), MAT.fuller, [0, 0.36, s * 0.0072], [0, s > 0 ? 0 : PI, 0], { ol: 0, shadow: false });
      });
    })();
    var swordHold = new T.Group(); swordHold.add(sword); swordHold.rotation.x = PI / 2;
    // funda en la espalda
    var backSword = grp(chest, [-0.15, 0.36, -0.2], [0.18, 0, PI + 0.5]);
    var sheath = grp(chest, [-0.15, 0.36, -0.2], [0.18, 0, PI + 0.5]);
    add(sheath, new T.CylinderGeometry(0.042, 0.03, 0.7, 12), MAT.leather, [0, 0.47, 0], null, { scale: [1, 1, 0.4] });
    add(sheath, new T.CylinderGeometry(0.045, 0.045, 0.04, 12), MAT.gold, [0, 0.135, 0], null, { scale: [1, 1, 0.45] });
    add(sheath, new T.ConeGeometry(0.031, 0.06, 12), MAT.gold, [0, 0.85, 0], [PI, 0, 0], { scale: [1, 1, 0.45] });
    ring(sheath, 0.04, 0.004, 0.34, MAT.phonesAccent, 0.4, 16);
    ring(sheath, 0.036, 0.004, 0.6, MAT.phonesAccent, 0.4, 16);

    // Escudo vinilo
    var shield = new T.Group();
    (function () {
      var g = new T.CylinderGeometry(0.27, 0.27, 0.022, 48);
      var m = new T.Mesh(g, [MAT.vinylSide, MAT.vinylTop, MAT.vinylSide]);
      m.rotation.x = PI / 2; m.castShadow = true; m.receiveShadow = true; shield.add(m);
      var ol = new T.Mesh(g, outlineMat(0.004)); m.add(ol); outlineMeshes.push(ol);
      var rim = new T.TorusGeometry(0.272, 0.012, 8, 48);
      add(shield, rim, MAT.metal, [0, 0, 0], null, { ol: 0.002 });
      add(shield, new T.CylinderGeometry(0.03, 0.03, 0.03, 16), MAT.metal, [0, 0, -0.02], [PI / 2, 0, 0], { ol: 0 });
      add(shield, new T.BoxGeometry(0.03, 0.16, 0.02), MAT.leather, [0, 0, -0.02], null, { ol: 0 });
    })();
    var shieldArm = grp(armL.lo, [0.06, -0.135, 0.005], [0, PI / 2, 0]);
    var shieldBack = grp(chest, [0.02, 0.1, -0.215], [0, PI, 0.3]);

    // Arco
    var bow = new T.Group();
    var bowTipA = new T.Vector3(), bowTipB = new T.Vector3(), bowRest = new T.Vector3();
    (function () {
      var arc = 1.35, rr = 0.5;
      var tg = new T.TorusGeometry(rr, 0.012, 8, 40, arc); tg.rotateZ(-arc / 2); tg.translate(-rr, 0, 0);
      var mm = new T.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
      tg.applyMatrix4(mm);
      add(bow, tg, MAT.wood, null, null, { ol: 0.002 });
      add(bow, new T.CylinderGeometry(0.018, 0.018, 0.1, 10), MAT.gripWrap, [0, 0, 0], [PI / 2, 0, 0], { ol: 0.002 });
      var ty = rr - rr * Math.cos(arc / 2), tz = rr * Math.sin(arc / 2);
      bowTipA.set(0, ty, tz); bowTipB.set(0, ty, -tz); bowRest.set(0, ty, 0);
      [bowTipA, bowTipB].forEach(function (p) { add(bow, new T.SphereGeometry(0.016, 10, 8), MAT.gold, [p.x, p.y, p.z], null, { ol: 0 }); });
    })();
    var bowString = new T.Line(new T.BufferGeometry().setFromPoints([bowTipA, bowRest, bowTipB]), MAT.string);
    bow.add(bowString);
    var arrow = new T.Group();
    (function () {
      add(arrow, new T.CylinderGeometry(0.005, 0.005, 0.72, 6), MAT.wood, [0, 0.36, 0], null, { ol: 0 });
      add(arrow, new T.ConeGeometry(0.014, 0.05, 8), MAT.metal, [0, 0.74, 0], null, { ol: 0 });
      [0, 1, 2].forEach(function (i) {
        var f = add(arrow, new T.PlaneGeometry(0.03, 0.08), MAT.feather, [0, 0.05, 0], [0, i * TAU / 3, 0], { ol: 0 });
        f.material = MAT.feather; f.geometry.translate(0.016, 0, 0);
      });
    })();
    scene.add(arrow); arrow.visible = false;
    var bowSock = grp(armL.hand, [0.024, -0.072, 0]);
    bowSock.add(bow); bow.visible = false;

    // Paravela
    var glider = grp(chest, [0, 0.0, 0]);
    (function () {
      var barY = 0.73, cy = 1.28;
      add(glider, new T.CylinderGeometry(0.014, 0.014, 0.5, 10), MAT.wood, [0, barY, 0.08], [0, 0, PI / 2], { ol: 0.002 });
      var w = 1.9, dpt = 0.95, sx = 22, sz = 8;
      var g = new T.PlaneGeometry(w, dpt, sx, sz), p = g.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getY(i);
        var nx = x / (w / 2);
        var y = cy + 0.34 * (1 - nx * nx) + 0.06 * Math.cos(z / dpt * PI);
        p.setXYZ(i, x * (1 - 0.08 * Math.abs(z / dpt)), y, z * (1 - 0.25 * nx * nx) + 0.08);
      }
      g.computeVertexNormals();
      add(glider, g, MAT.cloth, null, null, { ol: 0.004 });
      function pole(a, b) {
        var va = new T.Vector3(a[0], a[1], a[2]), vb = new T.Vector3(b[0], b[1], b[2]);
        var len = va.distanceTo(vb);
        var m = add(glider, new T.CylinderGeometry(0.01, 0.01, len, 8), MAT.wood, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], null, { ol: 0 });
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      }
      pole([-0.24, barY, 0.08], [-0.8, cy + 0.08, 0.08]); pole([0.24, barY, 0.08], [0.8, cy + 0.08, 0.08]);
      pole([-0.24, barY, 0.08], [-0.25, cy + 0.3, 0.08]); pole([0.24, barY, 0.08], [0.25, cy + 0.3, 0.08]);
      for (var k = -3; k <= 3; k++) {
        var xx = k / 3 * 0.9, nx2 = xx / (w / 2);
        var yy = cy + 0.34 * (1 - nx2 * nx2) - 0.012;
        add(glider, new T.CylinderGeometry(0.008, 0.008, dpt * (1 - 0.25 * nx2 * nx2), 6), MAT.wood, [xx, yy, 0.08], [PI / 2, 0, 0], { ol: 0 });
      }
    })();
    glider.visible = false;

    /* ================= ESCENARIO ================= */
    var sky = new T.Mesh(new T.SphereGeometry(600, 48, 24), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new T.Color() }, uHor: { value: new T.Color() }, uLow: { value: new T.Color() }, uSun: { value: new T.Vector3(0, 1, 0) }, uSunCol: { value: new T.Color() }, uCloud: { value: new T.Color() }, uTime: { value: 0 }, uStars: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
      fragmentShader: [
        'uniform vec3 uTop,uHor,uLow,uSunCol,uCloud; uniform vec3 uSun; uniform float uTime,uStars; varying vec3 vDir;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
        'float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=0.5;}return s;}',
        'void main(){ vec3 d=normalize(vDir); float y=d.y;',
        ' vec3 c = y>0.0 ? mix(uHor,uTop,pow(clamp(y,0.0,1.0),0.55)) : mix(uHor,uLow,clamp(-y*4.0,0.0,1.0));',
        ' float sd=max(dot(d,normalize(uSun)),0.0);',
        ' c += uSunCol*pow(sd,900.0)*1.5 + uSunCol*pow(sd,12.0)*0.25;',
        ' if(y>0.0){ vec2 uv=d.xz/(y+0.12)*1.6 + vec2(uTime*0.01,0.0); float cl=fbm(uv); cl=smoothstep(0.52,0.72,cl)*smoothstep(0.0,0.25,y);',
        '  float st = step(0.9975, h(floor(d.xz/(y+0.3)*260.0)))*uStars*smoothstep(0.05,0.3,y); c += vec3(st);',
        '  c = mix(c, uCloud, cl*0.85); }',
        ' gl_FragColor=vec4(c,1.0);',
        ' #include <encodings_fragment>',
        '}'].join('\n')
    }));
    sky.frustumCulled = false; sky.renderOrder = -10;
    scene.add(sky);

    // suelo con colinas
    var groundGeo = new T.PlaneGeometry(420, 420, 140, 140); groundGeo.rotateX(-PI / 2);
    (function () {
      var p = groundGeo.attributes.position, cols = [], c = new T.Color();
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getZ(i), d = Math.sqrt(x * x + z * z);
        var hgt = (Math.sin(x * 0.045) * Math.cos(z * 0.04) * 4 + Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.09) * 1.6) * sstep(24, 60, d) + sstep(60, 200, d) * 10 * (0.6 + 0.4 * Math.sin(Math.atan2(z, x) * 3));
        p.setY(i, hgt);
        var t = 0.5 + 0.5 * Math.sin(x * 0.07 + z * 0.05);
        c.set('#6fa33c').lerp(new T.Color('#9bbf4c'), t * 0.6).lerp(new T.Color('#4f8a33'), sstep(0, 12, hgt) * 0.4);
        cols.push(c.r, c.g, c.b);
      }
      groundGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      groundGeo.computeVertexNormals();
    })();
    var ground = new T.Mesh(groundGeo, toon('#ffffff', null, { vertexColors: true }));
    ground.receiveShadow = true; scene.add(ground);

    // hierba instanciada
    var grassU = { uTime: { value: 0 }, uPlayer: { value: new T.Vector3() }, uBase: { value: new T.Color('#4c8a2e') }, uTip: { value: new T.Color('#b9d86a') }, uFog: { value: new T.Color() }, uFogNear: { value: 30 }, uFogFar: { value: 200 }, uLight: { value: 1 } };
    var grass;
    (function () {
      var bg = new T.PlaneGeometry(0.06, 0.24, 1, 4), p = bg.attributes.position;
      for (var i = 0; i < p.count; i++) { var y = p.getY(i) + 0.12, t = y / 0.24; p.setXYZ(i, p.getX(i) * (1 - t * 0.9), y, 0); }
      var N = 20000;
      var rnd = new Float32Array(N);
      var mat = new T.ShaderMaterial({
        uniforms: grassU, side: T.DoubleSide,
        vertexShader: [
          'uniform float uTime; uniform vec3 uPlayer; attribute float aRand; varying float vH; varying float vR; varying vec3 vW;',
          'void main(){ vH = uv.y; vR = aRand;',
          ' vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0);',
          ' float h2 = vH*vH;',
          ' float wv = sin(uTime*1.6 + w.x*0.3 + w.z*0.22)*0.6 + sin(uTime*2.7 + w.x*0.9 + w.z*0.4)*0.25;',
          ' vec2 bend = vec2(0.09,0.05)*wv*h2;',
          ' vec2 dd = w.xz - uPlayer.xz; float dist = length(dd);',
          ' float push = (1.0 - smoothstep(0.1, 0.8, dist)) * h2 * 0.28 * step(uPlayer.y, 0.6);',
          ' bend += normalize(dd + vec2(0.0001)) * push; w.xz += bend; w.y -= push*0.6;',
          ' vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }'].join('\n'),
        fragmentShader: [
          'uniform vec3 uBase,uTip,uFog; uniform float uFogNear,uFogFar,uLight; varying float vH; varying float vR; varying vec3 vW;',
          'void main(){ vec3 c = mix(uBase, uTip, smoothstep(0.0,1.0,vH)) * (0.82 + 0.36*vR) * uLight;',
          ' float d = distance(vW, cameraPosition); c = mix(c, uFog, smoothstep(uFogNear, uFogFar, d));',
          ' gl_FragColor = vec4(c,1.0);',
          ' #include <encodings_fragment>',
          '}'].join('\n')
      });
      grass = new T.InstancedMesh(bg, mat, N);
      var m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), pos = new T.Vector3(), eu = new T.Euler();
      for (var k = 0; k < N; k++) {
        var r = 28 * Math.sqrt(R()), a = R() * TAU;
        pos.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        eu.set((R() - 0.5) * 0.3, R() * TAU, (R() - 0.5) * 0.3); q.setFromEuler(eu);
        var sc = lerp(0.6, 1.35, R()) * (1 - 0.35 * sstep(18, 28, r));
        s.set(lerp(0.8, 1.3, R()), sc, 1);
        m4.compose(pos, q, s); grass.setMatrixAt(k, m4);
        rnd[k] = R();
      }
      bg.setAttribute('aRand', new T.InstancedBufferAttribute(rnd, 1));
      grass.frustumCulled = false;
      scene.add(grass);
    })();

    // flores
    (function () {
      var fg = new T.IcosahedronGeometry(0.035, 0);
      var cols = ['#f6f2ff', '#8fc8ff', '#ffd35a', '#ff9bb3'];
      cols.forEach(function (col, ci) {
        var n = 90, im = new T.InstancedMesh(fg, toon(col, null, { emissive: new T.Color(col), emissiveIntensity: 0.25 }), n);
        var m4 = new T.Matrix4();
        for (var i = 0; i < n; i++) {
          var r = 2.5 + 22 * Math.sqrt(R()), a = R() * TAU;
          m4.makeTranslation(Math.cos(a) * r, 0.28 + R() * 0.12, Math.sin(a) * r);
          im.setMatrixAt(i, m4);
        }
        scene.add(im);
      });
    })();

    // árboles y rocas
    (function () {
      var trunkM = toon('#6b4a33'), leafM = [toon('#4f8f3a'), toon('#5f9f40'), toon('#3f7c34')], rockM = toon('#9a9a8f');
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * TAU + R() * 0.3, r = 16 + R() * 20;
        var t = grp(scene, [Math.cos(a) * r, 0, Math.sin(a) * r], [0, R() * TAU, 0]);
        var hgt = 2.5 + R() * 2.2;
        add(t, new T.CylinderGeometry(0.16, 0.28, hgt, 10), trunkM, [0, hgt / 2, 0], null, { ol: 0.02 });
        for (var k = 0; k < 4; k++) {
          var sz = 1.1 + R() * 0.9;
          add(t, new T.IcosahedronGeometry(sz, 2), leafM[k % 3], [(R() - 0.5) * 1.4, hgt + (R() - 0.2) * 1.2, (R() - 0.5) * 1.4], null, { ol: 0.03 });
        }
      }
      for (var j = 0; j < 10; j++) {
        var a2 = R() * TAU, r2 = 7 + R() * 18;
        var s = 0.3 + R() * 0.9;
        add(scene, new T.DodecahedronGeometry(s, 1), rockM, [Math.cos(a2) * r2, s * 0.35, Math.sin(a2) * r2], [R(), R(), R()], { ol: 0.015, scale: [1.3, 0.7, 1] });
      }
      var mtM = toon('#6f86a8');
      for (var m = 0; m < 22; m++) {
        var a3 = m / 22 * TAU, r3 = 230 + R() * 60, hh = 60 + R() * 70;
        var mt = new T.Mesh(new T.ConeGeometry(hh * 0.9, hh, 7), mtM);
        mt.position.set(Math.cos(a3) * r3, hh / 2 - 5, Math.sin(a3) * r3); mt.rotation.y = R() * TAU;
        scene.add(mt);
        var snow = new T.Mesh(new T.ConeGeometry(hh * 0.9 * 0.28, hh * 0.28, 7), toon('#eef3f8'));
        snow.position.set(mt.position.x, hh - 5 - hh * 0.14 + 0.2, mt.position.z); snow.rotation.y = mt.rotation.y; scene.add(snow);
      }
    })();

    // agua
    var waterU = { uTime: { value: 0 }, uPlayer: { value: new T.Vector3() }, uDeep: { value: new T.Color('#1d6f9e') }, uShal: { value: new T.Color('#5cc6d8') }, uFoam: { value: new T.Color('#f2fbff') }, uSky: { value: new T.Color('#bfe3f5') } };
    var water = new T.Mesh(new T.CircleGeometry(60, 96), new T.ShaderMaterial({
      uniforms: waterU, transparent: true,
      vertexShader: 'uniform float uTime; varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); w.y += sin(w.x*0.8+uTime*1.3)*0.025 + sin(w.z*1.1+uTime*1.7)*0.02; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: [
        'uniform float uTime; uniform vec3 uPlayer,uDeep,uShal,uFoam,uSky; varying vec3 vW;',
        'void main(){ vec3 v = normalize(cameraPosition - vW); float fr = pow(1.0 - clamp(v.y,0.0,1.0), 3.0);',
        ' float rip = sin(vW.x*3.0+uTime*2.0)*sin(vW.z*2.6-uTime*1.6); vec3 c = mix(uShal, uDeep, 0.5+0.2*rip);',
        ' c = mix(c, uSky, fr*0.7);',
        ' float d = length(vW.xz - uPlayer.xz); float foam = smoothstep(0.08,0.0,abs(d - 0.45 - 0.12*sin(uTime*4.0))) + smoothstep(0.06,0.0,abs(d - mod(uTime*0.8,1.6) - 0.5))*0.6*(1.0-mod(uTime*0.8,1.6)/1.6);',
        ' float glint = step(0.93, sin(vW.x*9.0+uTime)*sin(vW.z*8.0-uTime*1.3));',
        ' c = mix(c, uFoam, clamp(foam + glint*0.35,0.0,1.0));',
        ' gl_FragColor = vec4(c, 0.86);',
        ' #include <encodings_fragment>',
        '}'].join('\n')
    }));
    water.rotation.x = -PI / 2; water.position.y = -1; water.visible = false; scene.add(water);

    // luces
    var hemi = new T.HemisphereLight(0xbfe0ff, 0x6d8a4a, 0.6); scene.add(hemi);
    var sun = new T.DirectionalLight(0xfff4dc, 1.1);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 40;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    scene.fog = new T.Fog(0xb9dcef, 40, 330);

    // partículas: motas, chispas, estelas de viento
    function dotTex() {
      return makeTex(64, 64, function (g, w, h) { radial(g, 32, 32, 30, '255,255,255', 1); });
    }
    var dotT = dotTex(); dotT.encoding = T.LinearEncoding;
    var motesN = 160, motesPos = new Float32Array(motesN * 3), motesSeed = [];
    for (var mi = 0; mi < motesN; mi++) { motesSeed.push([R() * 16 - 8, R() * 3, R() * 16 - 8, R() * TAU]); }
    var motesGeo = new T.BufferGeometry(); motesGeo.setAttribute('position', new T.BufferAttribute(motesPos, 3));
    var motes = new T.Points(motesGeo, new T.PointsMaterial({ size: 0.06, map: dotT, color: 0xfff6c8, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 }));
    motes.frustumCulled = false; scene.add(motes);

    var SPARK_N = 160, sparkPos = new Float32Array(SPARK_N * 3), sparkVel = [], sparkLife = new Float32Array(SPARK_N);
    for (var si = 0; si < SPARK_N; si++) sparkVel.push(new T.Vector3());
    var sparkGeo = new T.BufferGeometry(); sparkGeo.setAttribute('position', new T.BufferAttribute(sparkPos, 3));
    var sparkMat = new T.PointsMaterial({ size: 0.07, map: dotT, color: 0x9fd8ff, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    var sparks = new T.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks);
    var sparkIdx = 0;
    function burst(p, n, speed, col) {
      if (col) sparkMat.color.set(col);
      for (var i = 0; i < n; i++) {
        var k = sparkIdx++ % SPARK_N;
        sparkPos[k * 3] = p.x; sparkPos[k * 3 + 1] = p.y; sparkPos[k * 3 + 2] = p.z;
        sparkVel[k].set(R() - 0.5, R() - 0.3, R() - 0.5).normalize().multiplyScalar(speed * lerp(0.4, 1, R()));
        sparkLife[k] = lerp(0.35, 0.7, R());
      }
    }

    var WIND_N = 40, windPos = new Float32Array(WIND_N * 6), windSeed = [];
    for (var wi = 0; wi < WIND_N; wi++) windSeed.push([R() * 6 - 3, R() * 4 - 2, R() * 10, lerp(0.5, 1.4, R())]);
    var windGeo = new T.BufferGeometry(); windGeo.setAttribute('position', new T.BufferAttribute(windPos, 3));
    var wind = new T.LineSegments(windGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
    wind.frustumCulled = false; scene.add(wind);

    // estela de la espada
    var TRAIL_N = 18, trailBase = [], trailTip = [];
    for (var ti = 0; ti < TRAIL_N; ti++) { trailBase.push(new T.Vector3()); trailTip.push(new T.Vector3()); }
    var trailPos = new Float32Array(TRAIL_N * 2 * 3), trailA = new Float32Array(TRAIL_N * 2), trailIdx = [];
    for (ti = 0; ti < TRAIL_N; ti++) { trailA[ti * 2] = trailA[ti * 2 + 1] = 1 - ti / (TRAIL_N - 1); }
    for (ti = 0; ti < TRAIL_N - 1; ti++) { var a0 = ti * 2; trailIdx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
    var trailGeo = new T.BufferGeometry();
    trailGeo.setAttribute('position', new T.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('aA', new T.BufferAttribute(trailA, 1));
    trailGeo.setIndex(trailIdx);
    var trailU = { uO: { value: 0 } };
    var trail = new T.Mesh(trailGeo, new T.ShaderMaterial({
      uniforms: trailU, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aA; varying float vA; void main(){ vA=aA; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform float uO; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55,0.82,1.0)*vA*vA*uO, 1.0); }'
    }));
    trail.frustumCulled = false; scene.add(trail);
    var trailInit = false;

    /* ================= HORA DEL DÍA ================= */
    var TOD = {
      dia: { top: '#3f8fe0', hor: '#c6e6f6', low: '#9dc5a0', sun: '#fff3d8', si: 1.15, sd: [0.55, 0.8, 0.45], hs: '#c4e2ff', hg: '#6d8a4a', hi: 0.62, fog: '#bcdcee', cloud: '#ffffff', rim: '#fff1d6', rs: 0.55, stars: 0, grass: 1, deep: '#1d6f9e', shal: '#5cc6d8' },
      atardecer: { top: '#34427e', hor: '#f6a66c', low: '#6d5d6a', sun: '#ffb27a', si: 1.0, sd: [-0.7, 0.28, 0.4], hs: '#f3b89a', hg: '#5a5a48', hi: 0.55, fog: '#e7a88a', cloud: '#ffd2b0', rim: '#ffc28e', rs: 0.85, stars: 0.2, grass: 0.85, deep: '#27416b', shal: '#d98c72' },
      noche: { top: '#070f28', hor: '#23386a', low: '#0f1a2a', sun: '#a9c2ff', si: 0.55, sd: [0.3, 0.7, -0.5], hs: '#5d76b8', hg: '#1c2a2a', hi: 0.45, fog: '#1b2a4c', cloud: '#34466e', rim: '#8fb4ff', rs: 0.9, stars: 1, grass: 0.45, deep: '#0c1e3a', shal: '#2a4a7a' }
    };
    var sunDir = new T.Vector3(0.55, 0.8, 0.45);
    function setTimeOfDay(k) {
      var d = TOD[k] || TOD.dia;
      sky.material.uniforms.uTop.value.set(d.top); sky.material.uniforms.uHor.value.set(d.hor); sky.material.uniforms.uLow.value.set(d.low);
      sky.material.uniforms.uSunCol.value.set(d.sun); sky.material.uniforms.uCloud.value.set(d.cloud); sky.material.uniforms.uStars.value = d.stars;
      sunDir.set(d.sd[0], d.sd[1], d.sd[2]).normalize(); sky.material.uniforms.uSun.value.copy(sunDir);
      sun.color.set(d.sun); sun.intensity = d.si;
      hemi.color.set(d.hs); hemi.groundColor.set(d.hg); hemi.intensity = d.hi;
      scene.fog.color.set(d.fog); grassU.uFog.value.set(d.fog); grassU.uLight.value = d.grass;
      rimColU.value.set(d.rim); rimU.value = d.rs;
      waterU.uDeep.value.set(d.deep); waterU.uShal.value.set(d.shal); waterU.uSky.value.set(d.hor);
    }
    setTimeOfDay(opts.timeOfDay);

    /* ================= POSES Y ANIMACIONES ================= */
    var BONES = ['rig', 'hips', 'spine', 'chest', 'neck', 'head', 'uArmL', 'lArmL', 'handL', 'uArmR', 'lArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
    var DEF = { fL: 0.3, fR: 0.3, radius: 4, speed: 0, water: -0.6, lift: 0, rootY: 0, hipsY: 0, glow: 0, brow: 0, mouth: 0, smile: 0.3, draw: 0, trail: 0, lean: 0 };
    function Pose() { this.v = {}; for (var k in DEF) this.v[k] = DEF[k]; }
    Pose.prototype.r = function (b, x, y, z) { var v = this.v; v[b + '.x'] = (v[b + '.x'] || 0) + (x || 0); v[b + '.y'] = (v[b + '.y'] || 0) + (y || 0); v[b + '.z'] = (v[b + '.z'] || 0) + (z || 0); return this; };
    Pose.prototype.s = function (k, val) { this.v[k] = val; return this; };
    Pose.prototype.add = function (k, val) { this.v[k] = (this.v[k] || 0) + val; return this; };
    Pose.prototype.keys = function (obj) { for (var k in obj) this.v[k] = (this.v[k] || 0) + obj[k]; return this; };
    // helpers anatómicos (valores escritos para el lado izquierdo; el derecho se refleja)
    function arm(p, s, x, y, z, elbow, hx, hy, hz) {
      var f = s > 0 ? 'L' : 'R';
      p.r('uArm' + f, x, s * (y || 0), s * (z || 0));
      p.r('lArm' + f, elbow || 0, 0, 0);
      p.r('hand' + f, hx || 0, s * (hy || 0), s * (hz || 0));
    }
    function leg(p, s, x, z, knee, foot, y) {
      var f = s > 0 ? 'L' : 'R';
      p.r('thigh' + f, x, s * (y || 0), s * (z || 0));
      p.r('shin' + f, knee || 0, 0, 0);
      p.r('foot' + f, foot || 0, 0, 0);
    }
    function legH(v, f) {
      var tx = v['thigh' + f + '.x'] || 0, tz = v['thigh' + f + '.z'] || 0, kx = v['shin' + f + '.x'] || 0;
      return (0.44 * Math.cos(tx) + 0.405 * Math.cos(tx + kx)) * Math.cos(tz) + 0.082;
    }
    function autoHips(p, extra) {
      var h = Math.max(legH(p.v, 'L'), legH(p.v, 'R'));
      p.s('hipsY', h + 0.07 - HIP_Y + (extra || 0));
    }
    function flatFeet(p) {
      ['L', 'R'].forEach(function (f) { p.v['foot' + f + '.x'] = -((p.v['thigh' + f + '.x'] || 0) + (p.v['shin' + f + '.x'] || 0)) + (p.v['foot' + f + '.x'] || 0); });
    }
    function breathe(p, t, a) { var b = Math.sin(t * 1.7); p.r('chest', -0.015 * b * (a || 1), 0, 0); return b; }

    function gait(p, t, o) {
      var ph = t * o.freq * TAU;
      [1, -1].forEach(function (s) {
        var q = ph + (s > 0 ? 0 : PI), sw = Math.sin(q), cq = Math.cos(q);
        var thx = -o.stride * sw - (o.crouch || 0);
        var knee = (o.knee0 || 0.08) + o.knee * Math.pow(Math.max(0, cq), 1.4) + (o.kneeBack || 0) * Math.max(0, -sw);
        var foot = -(thx + knee) * 0.8 + (-0.25 * Math.max(0, sw) + 0.35 * Math.max(0, -sw) * Math.max(0, -cq)) * (o.footAmp || 1);
        leg(p, s, thx, 0.02, knee, foot);
        arm(p, s, (o.armBase || 0) + o.arm * sw, 0, o.armOut || 0.1, -((o.elbow || 0.15) + (o.elbowAmp || 0.2) * Math.max(0, -sw)), 0, 0, 0);
      });
      p.r('hips', 0, 0.12 * Math.sin(ph) * (o.twist || 1), 0.03 * Math.cos(ph * 2) * 0);
      p.r('chest', 0, -0.16 * Math.sin(ph) * (o.twist || 1), 0);
      p.r('spine', o.lean || 0, 0, 0);
      p.r('head', -(o.lean || 0) * 0.6, 0.06 * Math.sin(ph), 0);
      autoHips(p, (o.bob || 0.02) * (o.bobSign || 1) * Math.cos(ph * 2) - 0.01);
      p.s('speed', o.speed); p.s('radius', o.radius || 4.5);
    }

    function stance(p, t, amt) {
      amt = amt == null ? 1 : amt;
      var b = Math.sin(t * 2.2);
      leg(p, 1, -0.38 * amt, 0.1 * amt, 0.5 * amt, 0);
      leg(p, -1, 0.3 * amt, 0.12 * amt, 0.42 * amt, 0);
      p.r('hips', 0, -0.35 * amt, 0);
      p.r('spine', 0.12 * amt + 0.01 * b, 0.12 * amt, 0);
      p.r('chest', 0.02, 0.12 * amt, 0);
      p.r('head', -0.1 * amt, 0.1 * amt, 0);
      // brazo derecho: espada al frente
      arm(p, -1, -0.35 * amt, -0.2 * amt, 0.2 * amt, -1.35 * amt, 0.6 * amt, 0.0, 0.1 * amt);
      // brazo izquierdo: escudo
      arm(p, 1, -0.9 * amt, -0.35 * amt, 0.35 * amt, -1.55 * amt, 0.2 * amt, 0.0, 0.0);
      flatFeet(p);
      autoHips(p, -0.01 + 0.006 * b);
      p.s('brow', -0.8 * amt);
      p.s('fL', 1); p.s('fR', 1);
    }

    var ANIMS = {};
    function def(name, o) { o.name = name; ANIMS[name] = o; }

    def('reposo', {
      flags: {}, fn: function (t, p) {
        var b = breathe(p, t);
        p.r('spine', 0.02, 0, 0);
        arm(p, 1, 0.04 + 0.015 * b, 0, 0.12, -0.14, 0.05, 0, 0);
        arm(p, -1, 0.04 + 0.015 * b, 0, 0.12, -0.14, 0.05, 0, 0);
        var sh = Math.sin(t * 0.45);
        leg(p, 1, -0.04, 0.05 + 0.02 * sh, 0.05, 0);
        leg(p, -1, 0.03, 0.06 - 0.02 * sh, 0.03 + 0.05 * Math.max(0, sh), 0);
        p.r('hips', 0, 0.05, -0.02 * sh);
        p.r('chest', 0, -0.03, 0.02 * sh);
        p.r('head', 0.03 * Math.sin(t * 0.6), 0.35 * Math.sin(t * 0.33) * sstep(0.2, 0.9, Math.abs(Math.sin(t * 0.33))), 0);
        flatFeet(p); autoHips(p, 0.003 * b);
        p.s('smile', 0.5);
      }
    });
    def('andar', { flags: {}, fn: function (t, p) { breathe(p, t, 0.5); gait(p, t, { freq: 0.95, stride: 0.42, knee: 0.75, arm: 0.35, elbow: 0.15, elbowAmp: 0.2, lean: 0.04, bob: 0.018, speed: 1.4, radius: 4.5 }); p.s('smile', 0.4); } });
    def('correr', { flags: {}, fn: function (t, p) { gait(p, t, { freq: 1.35, stride: 0.8, knee: 1.55, kneeBack: 0.5, knee0: 0.2, arm: 0.8, armBase: -0.1, elbow: 1.35, elbowAmp: 0.25, lean: 0.24, bob: 0.035, bobSign: -1, speed: 5.2, radius: 6.5, twist: 1.3 }); p.s('mouth', 0.2); p.s('brow', -0.2); } });
    def('agacharse', {
      flags: {}, fn: function (t, p) {
        var b = breathe(p, t, 1.5);
        leg(p, 1, -1.25, 0.14, 2.05, 0);
        leg(p, -1, -0.8, 0.12, 2.25, 0.25);
        p.r('spine', 0.5 + 0.01 * b, 0, 0); p.r('chest', 0.12, 0, 0);
        p.r('head', -0.55, 0.45 * Math.sin(t * 0.7), 0); p.r('neck', -0.1, 0, 0);
        arm(p, 1, -0.55, 0, 0.22, -1.1, 0.1, 0, 0);
        arm(p, -1, -0.35, 0, 0.3, -0.9, 0.1, 0, 0);
        flatFeet(p); autoHips(p, -0.01 + 0.004 * b);
        p.s('brow', -0.3); p.s('smile', 0);
      }
    });
    def('sigilo', {
      flags: {}, fn: function (t, p) {
        gait(p, t, { freq: 0.62, stride: 0.34, knee: 0.7, knee0: 1.2, crouch: 0.85, arm: 0.18, armBase: -0.35, armOut: 0.28, elbow: 0.9, elbowAmp: 0.15, lean: 0.55, bob: 0.012, speed: 0.95, radius: 4, twist: 0.6 });
        p.r('chest', 0.1, 0, 0); p.r('head', -0.2, 0, 0);
        p.s('brow', -0.4); p.s('smile', 0);
      }
    });
    def('saltar', {
      flags: {}, loop: 1.5, fn: function (t, p) {
        t = t % 1.5;
        var K = sampleKeys(t, [
          [0.0, {}],
          [0.22, { 'thighL.x': -0.75, 'thighR.x': -0.7, 'shinL.x': 1.35, 'shinR.x': 1.3, 'spine.x': 0.35, 'uArmL.x': 0.6, 'uArmR.x': 0.6, 'lArmL.x': -0.3, 'lArmR.x': -0.3, 'head.x': -0.2 }, 'io'],
          [0.34, { 'thighL.x': 0.1, 'thighR.x': 0.15, 'shinL.x': 0.05, 'shinR.x': 0.1, 'footL.x': 0.6, 'footR.x': 0.6, 'spine.x': -0.1, 'uArmL.x': -2.4, 'uArmR.x': -2.4, 'uArmL.z': 0.25, 'uArmR.z': -0.25, 'lArmL.x': -0.3, 'lArmR.x': -0.3, 'head.x': -0.15 }, 'out'],
          [0.68, { 'thighL.x': -1.0, 'thighR.x': -0.35, 'shinL.x': 1.5, 'shinR.x': 0.9, 'footL.x': 0.2, 'footR.x': 0.3, 'spine.x': 0.15, 'uArmL.x': -0.35, 'uArmR.x': -0.2, 'uArmL.z': 1.15, 'uArmR.z': -1.15, 'lArmL.x': -0.6, 'lArmR.x': -0.5 }, 'io'],
          [0.98, { 'thighL.x': -0.35, 'thighR.x': -0.3, 'shinL.x': 0.4, 'shinR.x': 0.35, 'footL.x': 0.35, 'footR.x': 0.35, 'spine.x': 0.05, 'uArmL.x': -0.25, 'uArmR.x': -0.25, 'uArmL.z': 0.8, 'uArmR.z': -0.8, 'lArmL.x': -0.4, 'lArmR.x': -0.4 }, 'io'],
          [1.1, { 'thighL.x': -1.05, 'thighR.x': -1.0, 'shinL.x': 1.8, 'shinR.x': 1.75, 'spine.x': 0.45, 'uArmL.x': -0.3, 'uArmR.x': -0.3, 'uArmL.z': 0.5, 'uArmR.z': -0.5, 'lArmL.x': -0.7, 'lArmR.x': -0.7, 'head.x': -0.3 }, 'out'],
          [1.5, {}, 'io']
        ]);
        p.keys(K);
        leg(p, 1, 0, 0.06, 0.05, 0); leg(p, -1, 0, 0.06, 0.05, 0);
        arm(p, 1, 0.04, 0, 0.12, -0.14); arm(p, -1, 0.04, 0, 0.12, -0.14);
        var air = t > 0.34 && t < 1.02;
        if (!air) { flatFeet(p); autoHips(p, 0); }
        else {
          var u = (t - 0.34) / 0.68;
          p.s('hipsY', lerp(0, -0.02, u));
          p.s('rootY', 1.05 * 4 * u * (1 - u));
        }
        p.s('mouth', t > 0.3 && t < 0.5 ? 0.6 : 0.05); p.s('brow', 0.3);
      }
    });

    def('combo', {
      flags: { sword: 1, shield: 1, trail: 1 }, loop: 2.2, fn: function (t, p) {
        t = t % 2.2;
        stance(p, t);
        var K = sampleKeys(t, [
          [0.0, {}],
          [0.16, { 'uArmR.x': -0.9, 'uArmR.y': -1.15, 'uArmR.z': -0.6, 'lArmR.x': 0.7, 'handR.x': 0.6, 'handR.y': 0.2, 'chest.y': -0.55, 'spine.y': -0.2, 'hips.y': -0.1, 'head.y': 0.3 }, 'io'],
          [0.3, { 'uArmR.x': -1.0, 'uArmR.y': 1.1, 'uArmR.z': -0.4, 'lArmR.x': 0.95, 'handR.x': 0.9, 'handR.y': 0.2, 'chest.y': 0.55, 'spine.y': 0.25, 'hips.y': 0.25, 'thighL.x': -0.2, 'head.y': -0.4, 'mouth': 0.7 }, 'out'],
          [0.5, { 'uArmR.x': -1.05, 'uArmR.y': 1.2, 'uArmR.z': -0.5, 'lArmR.x': 0.5, 'handR.x': 0.7, 'handR.y': 2.8, 'chest.y': 0.45, 'spine.y': 0.25, 'hips.y': 0.2, 'head.y': -0.3 }, 'io'],
          [0.64, { 'uArmR.x': -0.95, 'uArmR.y': -1.1, 'uArmR.z': -0.55, 'lArmR.x': 0.95, 'handR.x': 0.85, 'handR.y': 2.8, 'chest.y': -0.6, 'spine.y': -0.25, 'hips.y': -0.2, 'thighL.x': -0.1, 'head.y': 0.3, 'mouth': 0.7 }, 'out'],
          [0.88, { 'uArmR.x': -2.35, 'uArmR.y': -0.2, 'uArmR.z': -0.25, 'lArmR.x': -1.2, 'handR.x': -0.1, 'handR.y': 0, 'spine.x': -0.2, 'chest.x': -0.12, 'chest.y': -0.15, 'head.x': 0.05 }, 'io'],
          [1.02, { 'uArmR.x': -0.55, 'uArmR.y': 0.25, 'uArmR.z': -0.1, 'lArmR.x': 0.9, 'handR.x': 1.3, 'handR.y': 0, 'spine.x': 0.38, 'chest.x': 0.12, 'chest.y': 0.1, 'thighL.x': -0.4, 'shinL.x': 0.4, 'thighR.x': 0.2, 'rootY': 0, 'head.x': -0.25, 'mouth': 1.0 }, 'out'],
          [1.5, { 'uArmR.x': -0.55, 'uArmR.y': 0.25, 'uArmR.z': -0.1, 'lArmR.x': 0.9, 'handR.x': 1.3, 'spine.x': 0.34, 'chest.x': 0.1, 'thighL.x': -0.4, 'shinL.x': 0.4, 'thighR.x': 0.2, 'head.x': -0.25 }, 'io'],
          [2.2, {}, 'io']
        ]);
        p.keys(K); flatFeet(p);
        autoHips(p, -0.01);
        p.s('trail', t < 1.15 ? 1 : 0);
      }
    });

    def('giratorio', {
      flags: { sword: 1, shield: 1, trail: 1 }, loop: 2.6, fn: function (t, p) {
        t = t % 2.6;
        stance(p, t, 0.5);
        var charge = { 'thighL.x': -0.55, 'thighL.z': 0.2, 'shinL.x': 1.0, 'thighR.x': 0.1, 'thighR.z': -0.35, 'shinR.x': 0.9, 'spine.x': 0.25, 'chest.y': -0.6, 'spine.y': -0.3, 'uArmR.x': -0.3, 'uArmR.y': -1.4, 'uArmR.z': -0.7, 'lArmR.x': 0.2, 'handR.x': 1.1, 'handR.y': 0.1, 'uArmL.x': -0.3, 'uArmL.z': 0.3, 'head.y': 0.2, 'head.x': -0.2 };
        var spin = { 'thighL.x': -0.5, 'thighL.z': 0.25, 'shinL.x': 0.9, 'thighR.x': 0.0, 'thighR.z': -0.3, 'shinR.x': 0.8, 'spine.x': 0.2, 'chest.y': 0.2, 'uArmR.x': -1.35, 'uArmR.y': -1.2, 'uArmR.z': -0.3, 'lArmR.x': 0.3, 'handR.x': 1.3, 'uArmL.x': -0.6, 'uArmL.z': 0.8, 'mouth': 1.0 };
        var K = sampleKeys(t, [[0, {}], [0.35, charge, 'io'], [1.0, charge, 'lin'], [1.12, spin, 'out'], [1.75, spin, 'lin'], [2.1, charge, 'io'], [2.6, {}, 'io']]);
        p.keys(K);
        var sp = sstep(1.08, 1.75, t);
        p.r('rig', 0, -TAU * 2 * sp, 0);
        var glow = t < 1.08 ? sstep(0.3, 1.0, t) * (1.2 + 0.4 * Math.sin(t * 40)) : (t < 1.8 ? 1.4 * (1 - sstep(1.4, 1.8, t)) : 0);
        p.s('glow', glow);
        p.s('trail', t > 1.05 && t < 1.85 ? 1 : 0);
        p.s('fR', 1);
        flatFeet(p); autoHips(p, -0.01);
        p.s('brow', -1);
      }
    });

    def('escudo', {
      flags: { sword: 1, shield: 1 }, loop: 1.8, fn: function (t, p) {
        t = t % 1.8;
        stance(p, t, 0.8);
        var guard = { 'uArmL.x': -0.4, 'uArmL.y': 0.25, 'uArmL.z': -0.05, 'lArmL.x': -0.45, 'lArmL.y': 1.5, 'handL.x': 0.1, 'spine.x': 0.12, 'chest.y': 0.3, 'head.x': -0.1, 'uArmR.x': 0.25, 'uArmR.z': -0.15, 'lArmR.x': 0.3, 'thighL.x': -0.1, 'shinL.x': 0.2, 'thighR.x': 0.05, 'shinR.x': 0.15 };
        var hit = Object.assign({}, guard, { 'spine.x': -0.02, 'chest.x': -0.1, 'uArmL.x': -0.25, 'lArmL.x': -0.75, 'head.x': 0.02, 'mouth': 0.5 });
        var K = sampleKeys(t, [[0, guard], [0.8, guard, 'io'], [0.86, hit, 'out'], [1.25, guard, 'io'], [1.8, guard, 'io']]);
        p.keys(K); flatFeet(p); autoHips(p, -0.02);
        p.s('brow', -1);
        p.s('impact', t > 0.8 && t < 0.86 ? 1 : 0);
      }
    });

    def('arco', {
      flags: { bow: 1 }, loop: 2.4, fn: function (t, p) {
        t = t % 2.4;
        var b = breathe(p, t);
        leg(p, 1, -0.2, 0.14, 0.18, 0); leg(p, -1, 0.15, 0.16, 0.12, 0);
        p.r('hips', 0, -0.7, 0); p.r('chest', 0, -0.5, 0); p.r('head', -0.05, 1.05, 0.05); p.r('neck', 0, 0.1, 0);
        var aim = { 'uArmL.x': -1.55, 'uArmL.y': 1.2, 'uArmL.z': 0.1, 'lArmL.x': -0.1, 'handL.x': 0.0, 'handL.y': 0, 'handL.z': 0.0 };
        var pull = { 'uArmR.x': -1.5, 'uArmR.y': 0.35, 'uArmR.z': -0.1, 'lArmR.x': -2.3, 'handR.x': 0.4, 'draw': 1 };
        var reach = { 'uArmR.x': -1.4, 'uArmR.y': 1.1, 'uArmR.z': -0.1, 'lArmR.x': -0.3, 'handR.x': 0.2, 'draw': 0.0 };
        var rel = { 'uArmR.x': -1.1, 'uArmR.y': -0.35, 'uArmR.z': -0.9, 'lArmR.x': -0.6, 'handR.x': -0.2, 'draw': 0 };
        var K = sampleKeys(t, [[0, Object.assign({}, aim, reach)], [0.3, Object.assign({}, aim, reach), 'io'], [1.1, Object.assign({}, aim, pull), 'io'], [1.55, Object.assign({}, aim, pull), 'lin'], [1.62, Object.assign({}, aim, rel), 'out'], [2.1, Object.assign({}, aim, rel), 'io'], [2.4, Object.assign({}, aim, reach), 'io']]);
        p.keys(K);
        p.s('arrow', t < 1.58 ? 1 : 0);
        p.s('release', t >= 1.58 && t < 1.64 ? 1 : 0);
        p.s('nock', t > 0.3 && t < 1.58 ? 1 : 0);
        p.s('fL', 1); p.s('fR', 0.75);
        flatFeet(p); autoHips(p, 0.003 * b);
        p.s('brow', -0.6); p.s('smile', 0.1);
      }
    });

    def('planear', {
      flags: { glider: 1 }, fn: function (t, p) {
        var sw = Math.sin(t * 1.3);
        arm(p, 1, -2.75, 0, 0.3, -0.5, 0.2, 0, 0);
        arm(p, -1, -2.75, 0, 0.3, -0.5, 0.2, 0, 0);
        leg(p, 1, 0.15 + 0.12 * sw, 0.06, 0.35 + 0.1 * sw, 0.35);
        leg(p, -1, 0.05 - 0.12 * sw, 0.06, 0.25 - 0.1 * sw, 0.35);
        p.r('spine', -0.05, 0, 0); p.r('head', -0.1, 0.2 * Math.sin(t * 0.5), 0);
        p.r('rig', 0.12, 0, -0.2 + 0.05 * Math.sin(t * 0.7));
        p.s('lift', 3.2 + 0.25 * Math.sin(t * 0.6)); p.s('speed', 4.2); p.s('radius', 7.5);
        p.s('fL', 1); p.s('fR', 1); p.s('smile', 0.8); p.s('brow', 0.4);
      }
    });

    def('nadar', {
      flags: { swim: 1 }, fn: function (t, p) {
        var f = 0.7, ph = t * f * TAU;
        [1, -1].forEach(function (s) {
          var q = (ph + (s > 0 ? 0 : PI)) % TAU;
          var u = q / TAU;
          var st = u < 0.6 ? (u / 0.6) * PI : PI + ((u - 0.6) / 0.4) * PI;
          var ax = -PI + st;
          var el = u < 0.6 ? -0.5 * Math.sin(u / 0.6 * PI) : -1.2 * Math.sin((u - 0.6) / 0.4 * PI);
          arm(p, s, ax, 0, 0.25 + (u >= 0.6 ? 0.35 * Math.sin((u - 0.6) / 0.4 * PI) : 0), el, 0.2, 0, 0);
          var k = Math.sin(t * TAU * 2.2 + (s > 0 ? 0 : PI));
          leg(p, s, 0.05 + 0.22 * k, 0.05, 0.25 + 0.2 * Math.max(0, k), 0.8);
        });
        p.r('rig', 1.35, 0, 0.12 * Math.sin(ph));
        p.r('head', -0.75, 0.25 * Math.sin(ph), 0); p.r('neck', -0.35, 0, 0);
        p.r('chest', 0, 0.15 * Math.sin(ph), 0);
        p.s('lift', -0.46); p.s('water', 0.55); p.s('speed', 1.3); p.s('radius', 4);
        p.s('fL', 0.2); p.s('fR', 0.2); p.s('mouth', 0.15);
      }
    });

    def('baile', {
      flags: { phones: 1 }, fn: function (t, p) {
        var bpm = 124 / 60, ph = t * bpm * TAU, beat = Math.abs(Math.sin(ph / 2));
        leg(p, 1, -0.15 - 0.1 * beat, 0.15, 0.3 + 0.25 * beat, 0);
        leg(p, -1, -0.1 - 0.1 * beat, 0.15, 0.25 + 0.25 * beat, 0);
        p.r('hips', 0, 0.15 * Math.sin(ph / 4), 0.05 * Math.sin(ph / 2));
        p.r('spine', 0.08 + 0.05 * beat, 0, 0);
        p.r('head', 0.18 * beat - 0.05, 0.2 * Math.sin(ph / 4), 0);
        arm(p, -1, -2.2, 0.2, 0.9, -2.3, 0.2, 0, 0);
        var sc = Math.sin(ph);
        arm(p, 1, -0.9, -0.35 + 0.18 * sc, 0.2, -1.4, 0.3, 0, 0.3 * sc);
        flatFeet(p); autoHips(p, 0);
        p.s('smile', 1); p.s('brow', 0.5); p.s('fL', 0.7); p.s('fR', 0.8);
      }
    });

    /* ---------- estado del reproductor ---------- */
    var cur = ANIMS.reposo, curT = 0, prev = null, prevT = 0, fade = 1, FADE = 0.32;
    var speedMul = 1, flags = {};
    var lift = 0, waterLevel = -0.6, gliderScale = 0;
    var yaw = 0, pos = new T.Vector3(0, 0, 0), blinkT = 2.5, blinkP = 0;
    var arrowFly = null, prevRelease = 0, prevImpact = 0;

    function evalAnim(a, t) { var p = new Pose(); a.fn(t, p); return p.v; }
    function blendV(A, Bv, u) {
      var o = {}, k;
      for (k in A) o[k] = A[k];
      for (k in Bv) { var a = (k in o) ? o[k] : 0; o[k] = a + (Bv[k] - a) * u; }
      for (k in A) if (!(k in Bv)) o[k] = A[k] * (1 - u) + (DEF[k] != null ? DEF[k] : 0) * u;
      return o;
    }
    function applyFlags(f) {
      flags = f || {};
      (flags.sword ? armR.sock : backSword).add(swordHold);
      swordHold.rotation.set(flags.sword ? PI / 2 : 0, 0, 0);
      swordHold.position.set(0, 0, 0);
      (flags.shield ? shieldArm : shieldBack).add(shield);
      bow.visible = !!flags.bow;
      phonesHead.visible = !!flags.phones; phonesNeck.visible = !flags.phones;
      trailInit = false;
    }
    applyFlags({});

    function play(name) {
      var a = ANIMS[name];
      if (!a) return;
      if (a === cur) { return; }
      prev = cur; prevT = curT; cur = a; curT = 0; fade = 0;
      applyFlags(a.flags);
    }

    var tmpV = new T.Vector3(), tmpV2 = new T.Vector3(), tmpQ = new T.Quaternion();
    function setCurl(arm, c) {
      var s = arm.s;
      arm.fingers.forEach(function (f, i) {
        var cc = c * (1 + i * 0.04);
        f.a.rotation.set(0, 0, -s * cc * 1.35);
        f.b.rotation.set(0, 0, -s * cc * 1.5);
      });
      arm.thumb.rotation.set(-0.6 - 0.2 * c, 0, -s * 0.9 * c);
      arm.thumbJ.rotation.set(0, 0, -s * 0.6 * c);
    }

    function applyPose(v, dt) {
      for (var i = 0; i < BONES.length; i++) {
        var b = BONES[i], o = B[b];
        o.rotation.x = v[b + '.x'] || 0; o.rotation.y = v[b + '.y'] || 0; o.rotation.z = v[b + '.z'] || 0;
      }
      hips.position.y = v.hipsY || 0;
      // desplazamiento en círculo
      var spd = v.speed || 0, Rr = v.radius || 4;
      if (spd > 0.01) {
        var d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        var tx, tz, ix, iz;
        if (d < 0.001) { tx = 0; tz = 1; ix = 0; iz = 0; }
        else { tx = -pos.z / d; tz = pos.x / d; ix = -pos.x / d; iz = -pos.z / d; }
        var corr = clamp(1.2 * (d - Rr), -2, 2);
        var dx = tx + ix * corr, dz = tz + iz * corr;
        var want = Math.atan2(dx, dz);
        yaw = angLerp(yaw, want, 1 - Math.exp(-3 * dt * Math.min(1, spd)));
        pos.x += Math.sin(yaw) * spd * dt; pos.z += Math.cos(yaw) * spd * dt;
      }
      lift += (v.lift - lift) * (1 - Math.exp(-(v.lift > lift ? 2.2 : 3.0) * dt));
      waterLevel += (v.water - waterLevel) * (1 - Math.exp(-2.5 * dt));
      root.position.set(pos.x, lift + (v.rootY || 0), pos.z);
      root.rotation.y = yaw;
      // cara
      var brow = v.brow || 0;
      brows.forEach(function (bg) { var s = bg.children[0].userData.s; bg.rotation.z = s * (0.1 - 0.16 * brow); bg.position.y = 0.146 + 0.004 * brow; });
      var mo = clamp(v.mouth || 0, 0, 1);
      mouthOpen.scale.set(0.7 + 0.5 * mo, Math.max(0.01, mo), 1); mouthOpen.visible = mo > 0.04;
      lip.scale.set(1 - 0.25 * mo, 0.5 + (v.smile || 0) * 0.9, 1); lip.visible = mo < 0.5;
      // parpadeo
      blinkT -= dt;
      if (blinkT < 0) { blinkP = 0.14; blinkT = 2 + R() * 3.5; }
      var bl = 1;
      if (blinkP > 0) { blinkP -= dt; bl = Math.max(0.08, Math.abs(blinkP - 0.07) / 0.07); }
      eyes.forEach(function (e) { e.scale.y = bl; });
      // dedos
      setCurl(armL, flags.shield || flags.bow ? 1 : (v.fL == null ? 0.3 : v.fL));
      setCurl(armR, flags.sword ? 1 : (v.fR == null ? 0.3 : v.fR));
      // brillo de la hoja
      MAT.blade.emissiveIntensity = v.glow || 0;
      MAT.fuller.color.setRGB(0.34 + 0.4 * (v.glow || 0), 0.72 + 0.2 * (v.glow || 0), 1);
      // paravela
      var gt = flags.glider ? 1 : 0;
      gliderScale += (gt - gliderScale) * (1 - Math.exp(-10 * dt));
      glider.visible = gliderScale > 0.02; glider.scale.setScalar(Math.max(0.001, gliderScale));
      // agua
      water.visible = waterLevel > -0.4; water.position.y = waterLevel;
    }

    function updateBow(v, dt) {
      if (!flags.bow) { arrow.visible = false; return; }
      bow.updateWorldMatrix(true, false);
      var draw = v.draw || 0;
      var mid = tmpV.copy(bowRest);
      if (draw > 0.02 || v.nock) {
        armR.sock.getWorldPosition(tmpV2);
        bow.worldToLocal(tmpV2);
        var k = clamp(v.nock ? 1 : draw, 0, 1);
        mid.lerp(tmpV2, k);
      }
      var pa = bowString.geometry.attributes.position;
      pa.setXYZ(1, mid.x, mid.y, mid.z); pa.needsUpdate = true;
      // flecha
      if (v.arrow > 0.5 && v.nock) {
        arrow.visible = true;
        var nockW = bow.localToWorld(mid.clone());
        var gripW = bow.localToWorld(new T.Vector3(0, -0.02, 0));
        var dir = gripW.clone().sub(nockW);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        dir.normalize();
        arrow.position.copy(nockW);
        arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        arrow.userData.dir = dir;
      } else if (!arrowFly) arrow.visible = false;
      if (v.release && !prevRelease && arrow.userData.dir) {
        arrowFly = { t: 0, dir: arrow.userData.dir.clone() };
      }
      prevRelease = v.release || 0;
      if (arrowFly) {
        arrowFly.t += dt; arrow.visible = arrowFly.t < 0.9;
        arrow.position.addScaledVector(arrowFly.dir, dt * 28);
        if (arrowFly.t > 0.9) arrowFly = null;
      }
    }

    function updateTrail(v, dt) {
      var on = flags.sword && v.trail > 0.5;
      var target = on ? 1 : 0;
      trailU.uO.value += (target - trailU.uO.value) * (1 - Math.exp(-12 * dt));
      trail.visible = trailU.uO.value > 0.01;
      sword.updateWorldMatrix(true, false);
      var b = sword.localToWorld(tmpV.set(0, 0.2, 0)), tip = sword.localToWorld(tmpV2.set(0, 0.83, 0));
      if (!trailInit) { for (var i = 0; i < TRAIL_N; i++) { trailBase[i].copy(b); trailTip[i].copy(tip); } trailInit = true; }
      for (var j = TRAIL_N - 1; j > 0; j--) { trailBase[j].copy(trailBase[j - 1]); trailTip[j].copy(trailTip[j - 1]); }
      trailBase[0].copy(b); trailTip[0].copy(tip);
      for (var k = 0; k < TRAIL_N; k++) {
        trailPos[k * 6] = trailBase[k].x; trailPos[k * 6 + 1] = trailBase[k].y; trailPos[k * 6 + 2] = trailBase[k].z;
        trailPos[k * 6 + 3] = trailTip[k].x; trailPos[k * 6 + 4] = trailTip[k].y; trailPos[k * 6 + 5] = trailTip[k].z;
      }
      trailGeo.attributes.position.needsUpdate = true;
    }

    function updateFx(v, dt, time) {
      // chispas de impacto
      if (v.impact && !prevImpact) { shield.getWorldPosition(tmpV); burst(tmpV, 40, 3.2, 0xffe08a); }
      prevImpact = v.impact || 0;
      if ((v.glow || 0) > 0.6 && R() < 0.5) { sword.localToWorld(tmpV.set(0, 0.2 + R() * 0.6, 0)); burst(tmpV, 1, 0.5, 0x9fd8ff); }
      for (var i = 0; i < SPARK_N; i++) {
        if (sparkLife[i] > 0) {
          sparkLife[i] -= dt;
          sparkVel[i].y -= 4 * dt;
          sparkPos[i * 3] += sparkVel[i].x * dt; sparkPos[i * 3 + 1] += sparkVel[i].y * dt; sparkPos[i * 3 + 2] += sparkVel[i].z * dt;
          if (sparkLife[i] <= 0) sparkPos[i * 3 + 1] = -100;
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
      // motas
      for (var m = 0; m < motesN; m++) {
        var s = motesSeed[m];
        motesPos[m * 3] = pos.x + s[0] + Math.sin(time * 0.3 + s[3]) * 0.6;
        motesPos[m * 3 + 1] = 0.3 + ((s[1] + time * 0.12 + Math.sin(time + s[3]) * 0.1) % 3) + lift * 0.7;
        motesPos[m * 3 + 2] = pos.z + s[2] + Math.cos(time * 0.25 + s[3]) * 0.6;
      }
      motesGeo.attributes.position.needsUpdate = true;
      // viento
      var wo = flags.glider ? 0.55 : 0;
      wind.material.opacity += (wo - wind.material.opacity) * (1 - Math.exp(-4 * dt));
      wind.visible = wind.material.opacity > 0.01;
      if (wind.visible) {
        var fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        for (var w = 0; w < WIND_N; w++) {
          var ws = windSeed[w];
          var along = 5 - ((ws[2] + time * 9 * ws[3]) % 10);
          var cx = pos.x + rx * ws[0] + fx * along, cz = pos.z + rz * ws[0] + fz * along, cy = root.position.y + 1.2 + ws[1];
          var L = 0.6 * ws[3];
          windPos[w * 6] = cx; windPos[w * 6 + 1] = cy; windPos[w * 6 + 2] = cz;
          windPos[w * 6 + 3] = cx - fx * L; windPos[w * 6 + 4] = cy; windPos[w * 6 + 5] = cz - fz * L;
        }
        windGeo.attributes.position.needsUpdate = true;
      }
    }

    /* ================= CÁMARA ================= */
    var cam = { theta: 0.35, phi: 1.36, dist: 4.6, target: new T.Vector3(0, 1.1, 0), auto: false };
    var camGoal = { theta: cam.theta, phi: cam.phi, dist: cam.dist };
    var drag = null;
    function onDown(e) { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { } }
    function onMove(e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      camGoal.theta -= dx * 0.008; camGoal.phi = clamp(camGoal.phi - dy * 0.006, 0.35, 1.62);
    }
    function onUp(e) { drag = null; try { canvas.releasePointerCapture(e.pointerId); } catch (err) { } }
    function onWheel(e) { e.preventDefault(); camGoal.dist = clamp(camGoal.dist * Math.exp(e.deltaY * 0.001), 1.4, 14); }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.style.touchAction = 'none';

    function updateCamera(dt) {
      if (cam.auto && !drag) camGoal.theta += dt * 0.25;
      var k = 1 - Math.exp(-10 * dt);
      cam.theta += (camGoal.theta - cam.theta) * k; cam.phi += (camGoal.phi - cam.phi) * k; cam.dist += (camGoal.dist - cam.dist) * k;
      rig.getWorldPosition(tmpV);
      var extra = flags.glider ? 0.6 : 0;
      var ty = (flags.glider ? tmpV.y + 0.4 : Math.max(0.55, tmpV.y + 0.15 + (root.position.y - lift) * -0.4));
      if (flags.swim) ty = tmpV.y + 0.15;
      tmpV.y = ty;
      cam.target.lerp(tmpV, 1 - Math.exp(-5 * dt));
      var d = cam.dist + extra * 2.5;
      camera.position.set(
        cam.target.x + d * Math.sin(cam.phi) * Math.sin(cam.theta),
        cam.target.y + d * Math.cos(cam.phi),
        cam.target.z + d * Math.sin(cam.phi) * Math.cos(cam.theta));
      if (camera.position.y < 0.15) camera.position.y = 0.15;
      camera.lookAt(cam.target);
    }

    /* ================= BUCLE ================= */
    function resize() {
      var w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(canvas); }
    resize();

    var clock = new T.Clock(), time = 0, raf = 0, running = true, frozen = null;
    function step(dt) {
      time += dt;
      var sdt = dt * speedMul;
      curT += sdt; if (prev) prevT += sdt;
      var v = evalAnim(cur, curT);
      if (prev) {
        fade = Math.min(1, fade + dt / FADE);
        v = blendV(evalAnim(prev, prevT), v, easeIO(fade));
        if (fade >= 1) prev = null;
      }
      applyPose(v, sdt);
      scene.updateMatrixWorld();
      updateBow(v, sdt);
      updateTrail(v, sdt);
      updateFx(v, sdt, time);
      updateCamera(dt);
      grassU.uTime.value = time; grassU.uPlayer.value.set(pos.x, root.position.y, pos.z);
      waterU.uTime.value = time; waterU.uPlayer.value.set(pos.x, 0, pos.z);
      sky.material.uniforms.uTime.value = time; sky.position.copy(camera.position);
      sun.position.copy(root.position).addScaledVector(sunDir, 15); sun.target.position.copy(root.position);
      renderer.render(scene, camera);
    }
    function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      var dt = Math.min(0.05, clock.getDelta());
      if (frozen == null) step(dt);
    }
    loop();

    var api = {
      play: play,
      list: function () { return Object.keys(ANIMS); },
      current: function () { return cur.name; },
      setSpeed: function (x) { speedMul = x; },
      setTimeOfDay: setTimeOfDay,
      setOutline: function (on) { outlineMeshes.forEach(function (m) { m.visible = !!on; }); },
      setAutoRotate: function (on) { cam.auto = !!on; },
      resetCamera: function () { camGoal.theta = yaw + 0.35; camGoal.phi = 1.36; camGoal.dist = 4.6; },
      // depuración: fija una animación en un instante y una vista
      debugPose: function (name, t, theta, phi, dist, ty) {
        frozen = true; play(name); prev = null; fade = 1; curT = t; pos.set(0, 0, 0); yaw = 0;
        lift = evalAnim(cur, t).lift; waterLevel = evalAnim(cur, t).water; gliderScale = cur.flags.glider ? 1 : 0;
        cam.theta = camGoal.theta = theta; cam.phi = camGoal.phi = phi; cam.dist = camGoal.dist = dist;
        for (var i = 0; i < 40; i++) { curT = t; step(1 / 60); }
        var v = evalAnim(cur, t); applyPose(v, 0); scene.updateMatrixWorld(); updateBow(v, 0);
        rig.getWorldPosition(cam.target); cam.target.y += flags.glider ? 0.4 : 0.15; if (!flags.glider && !flags.swim) cam.target.y = Math.max(0.55, cam.target.y); if (ty != null) cam.target.y = ty;
        updateCamera(0); renderer.render(scene, camera);
      },
      dispose: function () {
        running = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('wheel', onWheel);
        renderer.dispose();
      }
    };
    api.setOutline(opts.outline);
    return api;
  }

  window.Rajobos3D = { create: create };
})();
