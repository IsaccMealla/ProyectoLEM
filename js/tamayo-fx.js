/**
 * Historia Viva · Efectos de la "Máquina del Tiempo"
 * ---------------------------------------------------------------------------
 * - tamayo-animator : da vida al modelo 3D estático de Franz Tamayo mediante
 *                     deformación en el vertex shader (respiración, mirada al
 *                     usuario, gestos, habla y efecto de materialización).
 * - time-tunnel     : túnel de viaje en el tiempo alrededor de la cámara (VR).
 * - time-ambience   : cielo degradado, estrellas, partículas y suelo polar.
 * - time-dial       : diales de reloj que giran más rápido durante el viaje.
 * - face-camera     : orienta una entidad (p. ej. un texto) hacia la cámara.
 * - HistoriaFX      : sonidos sintetizados y overlay 2D de viaje (modo AR).
 */
(function () {
  'use strict';

  const FX = (window.HistoriaFX = window.HistoriaFX || {});

  /* ───────────────────────── Utilidades ───────────────────────── */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInCubic = (p) => p * p * p;
  const envelope = (p, a, b) => smooth(0, a, p) * (1 - smooth(b, 1, p));
  FX.utils = { clamp, smooth, easeInOutCubic, easeOutCubic, easeInCubic, envelope };

  function hexToRgb(hex) {
    let c = String(hex || '#ffffff').replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  FX.hexToRgb = hexToRgb;

  /* ───────────────────────── Audio sintetizado ───────────────────────── */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  // Desbloquear el audio con la primera interacción del usuario
  ['pointerdown', 'touchend', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => getAudioCtx(), { passive: true });
  });

  /** Sonido de "salto temporal": ruido filtrado + oscilador ascendente + campanita de llegada. */
  FX.whoosh = function (direction, seconds) {
    const c = getAudioCtx();
    if (!c || c.state !== 'running') return;
    const dir = direction < 0 ? -1 : 1;
    const d = Math.max(0.8, seconds || 2.2);
    const t0 = c.currentTime;

    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.28, t0 + d * 0.35);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    master.connect(c.destination);

    const len = Math.floor(c.sampleRate * d);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(dir > 0 ? 240 : 2600, t0);
    band.frequency.exponentialRampToValueAtTime(dir > 0 ? 3200 : 260, t0 + d * 0.45);
    band.frequency.exponentialRampToValueAtTime(420, t0 + d);
    noise.connect(band);
    band.connect(master);
    noise.start(t0);
    noise.stop(t0 + d);

    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const og = c.createGain();
    og.gain.value = 0.05;
    osc.frequency.setValueAtTime(dir > 0 ? 70 : 560, t0);
    osc.frequency.exponentialRampToValueAtTime(dir > 0 ? 640 : 60, t0 + d * 0.45);
    osc.frequency.exponentialRampToValueAtTime(110, t0 + d);
    osc.connect(lp);
    lp.connect(og);
    og.connect(master);
    osc.start(t0);
    osc.stop(t0 + d);

    [660, 990, 1320].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const t = t0 + d * 0.45 + i * 0.07;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 1);
    });
  };

  /** Pitidos cortos de confirmación para los comandos de voz. */
  FX.beep = function (kind) {
    const c = getAudioCtx();
    if (!c || c.state !== 'running') return;
    const notes = kind === 'error' ? [240, 170] : kind === 'listen' ? [620, 880] : [880, 1320];
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const t = c.currentTime + i * 0.09;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.18);
    });
  };

  /** Fuerza que una entidad A-Frame se dibuje encima de todo (HUD 3D). */
  FX.renderOnTop = function (el, order) {
    if (!el || !el.object3D) return;
    el.object3D.traverse((node) => {
      if (!node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        m.depthTest = false;
        m.depthWrite = false;
        m.transparent = true;
      });
      node.renderOrder = order || 1000;
    });
  };

  /* ───────────────────────── Overlay 2D de viaje temporal (AR) ───────────────────────── */
  FX.createWarpOverlay = function (opts) {
    const canvas = opts && opts.canvas;
    if (!canvas || !canvas.getContext) return { play() {}, stop() {} };
    const g = canvas.getContext('2d');
    const label = opts.label || null;
    const stars = [];
    for (let i = 0; i < 260; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
    let raf = 0;
    let cfg = null;
    let last = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round((canvas.clientWidth || window.innerWidth) * dpr));
      const h = Math.max(1, Math.round((canvas.clientHeight || window.innerHeight) * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    }

    function respawn(s, z) {
      s.x = Math.random() * 2 - 1;
      s.y = Math.random() * 2 - 1;
      s.z = z;
    }

    function frame(now) {
      if (!cfg) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const p = (now - cfg.start) / cfg.duration;
      if (p >= 1) { stop(); return; }

      const I = p < 0.25 ? easeInCubic(p / 0.25) : p > 0.65 ? 1 - easeOutCubic((p - 0.65) / 0.35) : 1;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.hypot(cx, cy);
      const c = cfg.rgb;

      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, W, H);
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.32 * I})`);
      grad.addColorStop(0.28, `rgba(8,10,20,${0.55 * I})`);
      grad.addColorStop(1, `rgba(0,0,0,${0.9 * I})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);

      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      const speed = (0.15 + 2.4 * I) * cfg.dir;
      const focal = Math.min(W, H) * 0.5;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { respawn(s, 1); continue; }
        if (s.z > 1) { respawn(s, 0.04); continue; }
        const x0 = cx + (s.x / pz) * focal;
        const y0 = cy + (s.y / pz) * focal;
        const x1 = cx + (s.x / s.z) * focal;
        const y1 = cy + (s.y / s.z) * focal;
        const a = I * (1 - s.z);
        const w = 0.6 + (1 - s.z) * 3 * dpr;
        g.strokeStyle = `rgba(${(c.r + 255) >> 1},${(c.g + 255) >> 1},${(c.b + 255) >> 1},${a})`;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      }

      for (let k = 0; k < 3; k++) {
        const rp = (p * 2.2 + k / 3) % 1;
        const rr = (cfg.dir > 0 ? rp : 1 - rp) * R * 1.1;
        g.strokeStyle = `rgba(${c.r},${c.g},${c.b},${I * (1 - rp) * 0.55})`;
        g.lineWidth = 2.5 * dpr;
        g.beginPath();
        g.arc(cx, cy, Math.max(1, rr), 0, Math.PI * 2);
        g.stroke();
      }

      const flash = Math.max(0, 1 - Math.abs(p - 0.42) / 0.08);
      if (flash > 0) {
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(255,255,255,${flash * 0.55})`;
        g.fillRect(0, 0, W, H);
      }

      if (cfg.yearEl) {
        const q = clamp((p - 0.06) / 0.6, 0, 1);
        const value = q < 1 ? String(Math.round(cfg.from + (cfg.to - cfg.from) * easeInOutCubic(q))) : cfg.finalLabel;
        if (cfg.yearEl.textContent !== value) cfg.yearEl.textContent = value;
      }
      if (label && p > 0.86) label.classList.remove('is-active');

      raf = requestAnimationFrame(frame);
    }

    function play(o) {
      o = o || {};
      resize();
      cancelAnimationFrame(raf);
      cfg = {
        start: performance.now(),
        duration: o.duration || 1900,
        dir: o.direction < 0 ? -1 : 1,
        rgb: hexToRgb(o.color || '#ffd166'),
        from: Number(o.from) || 0,
        to: Number(o.to) || 0,
        finalLabel: o.finalLabel || String(o.to || ''),
        yearEl: opts.yearEl || null
      };
      if (opts.captionEl) opts.captionEl.textContent = o.caption || '';
      if (opts.titleEl) opts.titleEl.textContent = o.title || '';
      if (cfg.yearEl) cfg.yearEl.textContent = String(cfg.from);
      if (label) {
        label.style.setProperty('--warp-color', o.color || '#ffd166');
        label.classList.add('is-active');
      }
      canvas.classList.add('is-active');
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      cfg = null;
      canvas.classList.remove('is-active');
      if (label) label.classList.remove('is-active');
      g.clearRect(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    return { play, stop };
  };

  /* ───────────────────────── Componentes A-Frame ───────────────────────── */
  if (!window.AFRAME) {
    console.warn('[Historia Viva] A-Frame no está disponible: efectos 3D desactivados.');
    return;
  }
  const THREE = window.AFRAME.THREE || window.THREE;

  let dotTexture = null;
  function softDot() {
    if (dotTexture) return dotTexture;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    dotTexture = new THREE.CanvasTexture(c);
    return dotTexture;
  }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) {
        (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
      }
    });
  }

  /* ── GLSL de deformación del personaje ── */
  const GLSL_COMMON = `
uniform float uTime;
uniform vec3 uHead;
uniform vec3 uBody;
uniform vec2 uArmR;
uniform vec2 uArmL;
uniform float uBreath;
uniform float uHeight;
uniform float uReveal;
uniform vec3 uGlow;
uniform float uFlash;
varying float vTamayoY;
`;

  const GLSL_VERTEX = `
mat3 tamayoRotX(float a){ float c = cos(a); float s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }
mat3 tamayoRotY(float a){ float c = cos(a); float s = sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 tamayoRotZ(float a){ float c = cos(a); float s = sin(a); return mat3(c,s,0.0, -s,c,0.0, 0.0,0.0,1.0); }
vec3 tamayoApply(vec3 p, vec3 v, bool isPoint){
  float H = uHeight;
  float y = p.y;
  vec3 r = v;
  float band = smoothstep(0.30 * H, 0.44 * H, y) * (1.0 - smoothstep(0.80 * H, 0.86 * H, y));
  float wR = (1.0 - smoothstep(-0.14 * H, -0.095 * H, p.x)) * band;
  float wL = smoothstep(0.095 * H, 0.14 * H, p.x) * band;
  if (wR > 0.0001) {
    vec3 shR = vec3(-0.11 * H, 0.80 * H, 0.0);
    mat3 mR = tamayoRotZ(-uArmR.x * wR) * tamayoRotX(-uArmR.y * wR);
    r = isPoint ? (mR * (r - shR) + shR) : (mR * r);
  }
  if (wL > 0.0001) {
    vec3 shL = vec3(0.11 * H, 0.80 * H, 0.0);
    mat3 mL = tamayoRotZ(uArmL.x * wL) * tamayoRotX(-uArmL.y * wL);
    r = isPoint ? (mL * (r - shL) + shL) : (mL * r);
  }
  float wH = smoothstep(0.82 * H, 0.89 * H, y);
  if (wH > 0.0001) {
    vec3 nk = vec3(0.0, 0.85 * H, 0.0);
    mat3 mH = tamayoRotY(uHead.x * wH) * tamayoRotX(uHead.y * wH) * tamayoRotZ(uHead.z * wH);
    r = isPoint ? (mH * (r - nk) + nk) : (mH * r);
  }
  if (isPoint) {
    float b = smoothstep(0.58 * H, 0.66 * H, y) * (1.0 - smoothstep(0.76 * H, 0.84 * H, y));
    r.xz *= 1.0 + uBreath * b;
  }
  float wB = smoothstep(0.34 * H, 0.62 * H, y);
  float wT = smoothstep(0.28 * H, 0.80 * H, y);
  vec3 hp = vec3(0.0, 0.45 * H, 0.0);
  mat3 mB = tamayoRotY(uBody.y * wT) * tamayoRotX(uBody.x * wB) * tamayoRotZ(uBody.z * wB);
  r = isPoint ? (mB * (r - hp) + hp) : (mB * r);
  return r;
}
`;

  const GLSL_FRAG_START = `void main() {
  float tRevealY = uReveal * (uHeight + 0.1) - 0.05;
  if (vTamayoY > tRevealY) discard;`;

  const GLSL_FRAG_END = `
  float tEdge = 1.0 - smoothstep(0.0, 0.06, tRevealY - vTamayoY);
  float tActive = 1.0 - step(0.999, uReveal);
  float tScan = step(0.85, fract(vTamayoY * 80.0 - uTime * 1.6));
  gl_FragColor.rgb += uGlow * (tEdge * tActive * 2.4 + tScan * tActive * 0.22 + uFlash);
  #include <dithering_fragment>`;

  /* ── Gestos procedurales (p = progreso 0..1) ── */
  const GESTURES = {
    wave: { dur: 2.6, fn(p, o) { const e = envelope(p, 0.18, 0.82); o.armR.x += (0.95 + 0.2 * Math.sin(p * Math.PI * 10)) * e; o.armR.y += 0.35 * e; o.head.z += 0.07 * e; o.body.z -= 0.035 * e; } },
    bow: { dur: 2.2, fn(p, o) { const e = envelope(p, 0.3, 0.7); o.body.x += 0.42 * e; o.head.y += 0.16 * e; o.armR.y += 0.1 * e; o.armL.y += 0.1 * e; } },
    nod: { dur: 1.5, fn(p, o) { const e = envelope(p, 0.1, 0.9); o.head.y += 0.13 * (0.5 - 0.5 * Math.cos(p * Math.PI * 6)) * e; } },
    think: { dur: 3.0, fn(p, o) { const e = envelope(p, 0.2, 0.8); o.head.z += 0.15 * e; o.head.y += 0.1 * e; o.head.x -= 0.22 * e; o.armR.y += 0.85 * e; o.armR.x -= 0.08 * e; o.body.y -= 0.06 * e; } },
    indicate: { dur: 2.6, fn(p, o) { const e = envelope(p, 0.2, 0.8); o.body.y += 0.3 * e; o.head.x += 0.4 * e; o.armL.x += 0.8 * e; o.armL.y += 0.45 * e; } },
    walk: { dur: 3.2, fn(p, o) { const e = envelope(p, 0.08, 0.92); const ph = p * Math.PI * 6; o.fwd += 0.22 * Math.sin(Math.PI * p); o.posY += 0.012 * Math.abs(Math.sin(ph)) * e; o.body.z += 0.045 * Math.sin(ph) * e; o.body.x += 0.04 * e; o.armR.y += 0.28 * Math.sin(ph) * e; o.armL.y -= 0.28 * Math.sin(ph) * e; } },
    spin: { dur: 1.8, fn(p, o) { o.spin += Math.PI * 2 * easeInOutCubic(p); const e = Math.sin(Math.PI * p); o.posY += 0.04 * e; o.armR.x += 0.45 * e; o.armL.x += 0.45 * e; } },
    jump: { dur: 1.2, fn(p, o) {
      if (p < 0.25) { const c = Math.sin((p / 0.25) * Math.PI); o.sy -= 0.08 * c; o.sx += 0.04 * c; o.body.x += 0.1 * c; }
      else if (p < 0.75) { const s = Math.sin(((p - 0.25) / 0.5) * Math.PI); o.posY += 0.16 * s; o.sy += 0.04 * s; o.armR.x += 0.6 * s; o.armL.x += 0.6 * s; }
      else { const r = Math.sin(((p - 0.75) / 0.25) * Math.PI); o.sy -= 0.07 * r; o.sx += 0.035 * r; }
    } },
    celebrate: { dur: 2.8, fn(p, o) { const e = envelope(p, 0.12, 0.88); const q = (p * 2) % 1; o.posY += 0.09 * Math.max(0, Math.sin(Math.PI * q)) * e; o.armR.x += 1.0 * e; o.armL.x += 1.0 * e; o.armR.y += 0.4 * e; o.armL.y += 0.4 * e; o.head.y -= 0.1 * e; o.flash += 0.12 * e; } },
    materialize: { dur: 1.6, fn(p, o) { const k = 1 - easeOutCubic(p); o.spin -= 1.4 * k; o.posY += 0.05 * k; o.flash += 0.5 * k; } }
  };
  GESTURES.speak = GESTURES.nod;
  GESTURES.greet = GESTURES.wave;
  FX.gestures = Object.keys(GESTURES);

  function speechEnvelope(T) {
    const gate = smooth(-0.2, 0.4, Math.sin(T * 1.9) + 0.6 * Math.sin(T * 0.77 + 2.0));
    const syllables = 0.5 + 0.5 * Math.sin(T * 10.5) * Math.sin(T * 3.7 + 0.5);
    return gate * syllables;
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  AFRAME.registerComponent('tamayo-animator', {
    schema: {
      lookAtCamera: { default: true },
      talking: { default: false },
      glow: { type: 'color', default: '#ffd166' },
      intensity: { default: 1 },
      bodyFollow: { default: 0.5 },
      height: { default: 0.98 }
    },

    init() {
      this.time = 0;
      this.uniforms = {
        uTime: { value: 0 },
        uHead: { value: new THREE.Vector3() },
        uBody: { value: new THREE.Vector3() },
        uArmR: { value: new THREE.Vector2() },
        uArmL: { value: new THREE.Vector2() },
        uBreath: { value: 0 },
        uHeight: { value: this.data.height },
        uReveal: { value: 1 },
        uGlow: { value: new THREE.Color(this.data.glow) },
        uFlash: { value: 0 }
      };
      this.cur = { head: new THREE.Vector3(), body: new THREE.Vector3(), armR: new THREE.Vector2(), armL: new THREE.Vector2(), follow: 0 };
      this.out = { head: new THREE.Vector3(), body: new THREE.Vector3(), armR: new THREE.Vector2(), armL: new THREE.Vector2(), posY: 0, fwd: 0, spin: 0, sx: 1, sy: 1, flash: 0 };
      this.gestures = [];
      this.reveal = null;
      this.base = null;
      this.glance = { next: 3 + Math.random() * 3, start: -10, dur: 1.4, yaw: 0, pitch: 0 };
      this.emph = { next: 1.5, start: -10, dur: 1.2, arm: 0, amount: 0 };
      this.tmp = new THREE.Vector3();
      this.onModel = this.onModel.bind(this);
      this.onGesture = (e) => this.play(e.detail && e.detail.type);
      this.el.addEventListener('model-loaded', this.onModel);
      this.el.addEventListener('tamayo-gesture', this.onGesture);
      if (this.el.getObject3D('mesh')) this.onModel();
    },

    update(old) {
      if (old && old.glow !== this.data.glow) this.uniforms.uGlow.value.set(this.data.glow);
    },

    remove() {
      this.el.removeEventListener('model-loaded', this.onModel);
      this.el.removeEventListener('tamayo-gesture', this.onGesture);
    },

    onModel() {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      let maxY = 0;
      mesh.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        node.geometry.computeBoundingBox();
        if (node.geometry.boundingBox) maxY = Math.max(maxY, node.geometry.boundingBox.max.y);
        node.frustumCulled = false;
        (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => this.patch(m));
      });
      if (maxY > 0.05) this.uniforms.uHeight.value = maxY;
    },

    patch(material) {
      if (!material || material.userData.tamayoPatched) return;
      material.userData.tamayoPatched = true;
      const U = this.uniforms;
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, U);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\n' + GLSL_COMMON + GLSL_VERTEX)
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = tamayoApply(position, objectNormal, false);')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = tamayoApply(position, transformed, true);\n  vTamayoY = position.y;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
          .replace('void main() {', GLSL_FRAG_START)
          .replace('#include <dithering_fragment>', GLSL_FRAG_END);
      };
      material.customProgramCacheKey = () => 'tamayo-animator-v1';
      material.needsUpdate = true;
    },

    /** Reproduce un gesto: wave, bow, nod, think, indicate, walk, spin, jump, celebrate, materialize. */
    play(type) {
      const g = GESTURES[type];
      if (!g) return false;
      this.gestures = this.gestures.filter((x) => x.type !== type);
      this.gestures.push({ type, start: this.time, dur: g.dur, fn: g.fn });
      return true;
    },

    /** Efecto holográfico de (des)materialización: 0 = invisible, 1 = completo. */
    revealTo(to, ms) {
      this.reveal = { from: this.uniforms.uReveal.value, to: clamp(to, 0, 1), start: this.time, dur: Math.max(0.05, (ms || 1000) / 1000) };
    },

    setReveal(v) {
      this.reveal = null;
      this.uniforms.uReveal.value = clamp(v, 0, 1);
    },

    setGlow(color) {
      this.uniforms.uGlow.value.set(color);
    },

    setTalking(on) {
      this.data.talking = !!on;
    },

    captureBase() {
      const o = this.el.object3D;
      this.base = { pos: o.position.clone(), rotY: o.rotation.y, scale: o.scale.clone() };
    },

    tick(time, dtMs) {
      const dt = Math.min(dtMs || 16, 50) / 1000;
      if (!this.base) this.captureBase();
      this.time += dt;
      const T = this.time;
      const U = this.uniforms;
      const k = this.data.intensity;
      const o = this.out;
      U.uTime.value = T;

      o.head.set(0, 0, 0); o.body.set(0, 0, 0); o.armR.set(0, 0); o.armL.set(0, 0);
      o.posY = 0; o.fwd = 0; o.spin = 0; o.sx = 1; o.sy = 1; o.flash = 0;

      // Respiración y balanceo natural
      U.uBreath.value = (0.016 * Math.sin(T * 1.7) + 0.004) * k;
      o.body.z += 0.022 * Math.sin(T * 0.63) * k;
      o.body.y += 0.035 * Math.sin(T * 0.41) * k;
      o.body.x += 0.012 * Math.sin(T * 0.9 + 1.0) * k;
      o.head.z += 0.025 * Math.sin(T * 0.5 + 0.3) * k;
      o.posY += 0.004 * Math.sin(T * 1.7) * k;

      // Mirar al usuario (cabeza + giro parcial del cuerpo)
      let lookYaw = 0;
      let lookPitch = 0;
      const cam = this.el.sceneEl && this.el.sceneEl.camera;
      const parent = this.el.object3D.parent;
      if (this.data.lookAtCamera && cam && parent) {
        cam.getWorldPosition(this.tmp);
        parent.worldToLocal(this.tmp);
        this.tmp.sub(this.base.pos);
        const yaw = wrapAngle(Math.atan2(this.tmp.x, this.tmp.z) - this.base.rotY);
        if (Math.abs(yaw) < 2.3) {
          lookYaw = yaw;
          const horiz = Math.max(Math.hypot(this.tmp.x, this.tmp.z), 0.05);
          const headY = U.uHeight.value * 0.9 * this.base.scale.y;
          lookPitch = Math.atan2(headY - this.tmp.y, horiz);
        }
      }
      const followTarget = clamp(lookYaw * this.data.bodyFollow, -1.0, 1.0);

      // Miradas ocasionales alrededor
      if (T > this.glance.next) {
        this.glance.start = T;
        this.glance.dur = 1.2 + Math.random();
        this.glance.yaw = (Math.random() * 2 - 1) * 0.55;
        this.glance.pitch = (Math.random() * 2 - 1) * 0.12;
        this.glance.next = T + this.glance.dur + 3 + Math.random() * 4;
      }
      const gp = (T - this.glance.start) / this.glance.dur;
      const ge = gp >= 0 && gp <= 1 ? envelope(gp, 0.25, 0.75) * (this.data.talking ? 0.35 : 1) : 0;
      o.head.x += clamp(lookYaw - followTarget + this.glance.yaw * ge, -0.75, 0.75);
      o.head.y += clamp(lookPitch * 0.7, -0.3, 0.35) + this.glance.pitch * ge;

      // Habla: asentimientos y gestos de énfasis con las manos
      if (this.data.talking) {
        const e = speechEnvelope(T);
        o.head.y += 0.05 * e;
        o.head.x += 0.05 * Math.sin(T * 1.3);
        o.head.z += 0.035 * Math.sin(T * 2.1);
        o.body.x += 0.02 * e;
        o.body.y += 0.04 * Math.sin(T * 0.8);
        if (T > this.emph.next) {
          this.emph.start = T;
          this.emph.dur = 1.1 + Math.random() * 0.9;
          this.emph.arm = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? 1 : 2;
          this.emph.amount = 0.25 + Math.random() * 0.35;
          this.emph.next = T + 2.2 + Math.random() * 2.6;
        }
        const ep = (T - this.emph.start) / this.emph.dur;
        if (ep >= 0 && ep <= 1) {
          const a = this.emph.amount * Math.sin(Math.PI * ep);
          if (this.emph.arm !== 2) { o.armR.y += a; o.armR.x += a * 0.25; }
          if (this.emph.arm !== 1) { o.armL.y += a; o.armL.x += a * 0.25; }
        }
      }

      // Gestos activos
      for (let i = this.gestures.length - 1; i >= 0; i--) {
        const g = this.gestures[i];
        const p = (T - g.start) / g.dur;
        if (p >= 1) { this.gestures.splice(i, 1); continue; }
        g.fn(Math.max(0, p), o);
      }

      // Suavizado
      const sH = 1 - Math.exp(-dt * 8);
      const sB = 1 - Math.exp(-dt * 6);
      const sA = 1 - Math.exp(-dt * 10);
      this.cur.head.lerp(o.head, sH);
      this.cur.body.lerp(o.body, sB);
      this.cur.armR.lerp(o.armR, sA);
      this.cur.armL.lerp(o.armL, sA);
      this.cur.follow += (followTarget - this.cur.follow) * (1 - Math.exp(-dt * 2.5));
      U.uHead.value.copy(this.cur.head);
      U.uBody.value.copy(this.cur.body);
      U.uArmR.value.copy(this.cur.armR);
      U.uArmL.value.copy(this.cur.armL);
      U.uFlash.value = U.uFlash.value * Math.exp(-dt * 4) + o.flash * (1 - Math.exp(-dt * 12));

      // Transformación rígida
      const obj = this.el.object3D;
      const b = this.base;
      const rotY = b.rotY + this.cur.follow + o.spin;
      const fwd = o.fwd * b.scale.y;
      obj.rotation.y = rotY;
      obj.position.set(
        b.pos.x + Math.sin(b.rotY + this.cur.follow) * fwd,
        b.pos.y + o.posY * b.scale.y,
        b.pos.z + Math.cos(b.rotY + this.cur.follow) * fwd
      );
      obj.scale.set(b.scale.x * o.sx, b.scale.y * o.sy, b.scale.z * o.sx);

      // Materialización
      if (this.reveal) {
        const p = clamp((T - this.reveal.start) / this.reveal.dur, 0, 1);
        U.uReveal.value = this.reveal.from + (this.reveal.to - this.reveal.from) * easeInOutCubic(p);
        if (p >= 1) this.reveal = null;
      }
    }
  });

  /* ── Túnel del tiempo (hijo de la cámara) ── */
  AFRAME.registerComponent('time-tunnel', {
    schema: {
      color: { type: 'color', default: '#ffd166' },
      count: { default: 320 },
      rings: { default: 10 }
    },

    init() {
      const N = this.data.count;
      this.group = new THREE.Group();
      this.group.visible = false;
      this.color = new THREE.Color(this.data.color);
      this.white = new THREE.Color(1, 1, 1);
      this.head = new THREE.Color();

      this.angle = new Float32Array(N);
      this.radius = new Float32Array(N);
      this.z = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        this.angle[i] = Math.random() * Math.PI * 2;
        this.radius[i] = 0.5 + Math.pow(Math.random(), 0.7) * 3.2;
        this.z[i] = -0.5 - Math.random() * 40;
      }
      this.positions = new Float32Array(N * 6);
      this.colors = new Float32Array(N * 6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
      this.lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false });
      this.lines = new THREE.LineSegments(geo, this.lineMat);
      this.lines.frustumCulled = false;
      this.lines.renderOrder = 1000;
      this.group.add(this.lines);

      this.rings = [];
      const ringGeo = new THREE.RingGeometry(0.965, 1.0, 72);
      const R = this.data.rings;
      for (let i = 0; i < R; i++) {
        const m = new THREE.MeshBasicMaterial({ color: this.color.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const ring = new THREE.Mesh(ringGeo, m);
        ring.position.z = -2 - i * (36 / R);
        ring.renderOrder = 1000;
        ring.frustumCulled = false;
        this.group.add(ring);
        this.rings.push(ring);
      }

      this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: this.color.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false }));
      this.core.position.z = -30;
      this.core.scale.set(14, 14, 1);
      this.core.renderOrder = 999;
      this.group.add(this.core);

      this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false });
      this.flash = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), this.flashMat);
      this.flash.position.z = -0.5;
      this.flash.renderOrder = 1001;
      this.group.add(this.flash);

      this.anim = null;
      this.setColor(this.data.color);
      this.el.setObject3D('timeTunnel', this.group);
    },

    remove() {
      this.el.removeObject3D('timeTunnel');
      disposeObject(this.group);
    },

    setColor(c) {
      this.color.set(c);
      this.rings.forEach((r, i) => r.material.color.copy(this.color).lerp(this.white, (i % 3) * 0.25));
      this.core.material.color.copy(this.color);
    },

    /** Lanza el viaje: { duration, color, direction (1 futuro / -1 pasado) } */
    warp(opts) {
      opts = opts || {};
      this.anim = { start: performance.now(), dur: opts.duration || 2400, dir: opts.direction < 0 ? -1 : 1 };
      if (opts.color) this.setColor(opts.color);
      this.group.visible = true;
      this.el.sceneEl.timeWarpDirection = this.anim.dir;
    },

    tick(t, dtMs) {
      const scene = this.el.sceneEl;
      if (!this.anim) {
        if (this.group.visible) this.group.visible = false;
        scene.timeWarpIntensity = 0;
        return;
      }
      const dt = Math.min(dtMs || 16, 50) / 1000;
      const p = (performance.now() - this.anim.start) / this.anim.dur;
      if (p >= 1) {
        this.anim = null;
        this.group.visible = false;
        scene.timeWarpIntensity = 0;
        return;
      }
      const I = p < 0.28 ? easeInCubic(p / 0.28) : p > 0.62 ? 1 - easeOutCubic((p - 0.62) / 0.38) : 1;
      scene.timeWarpIntensity = I;
      const dir = this.anim.dir;
      const speed = (3 + 55 * I) * dir;
      const len = 0.15 + I * 5.5;
      this.head.copy(this.color).lerp(this.white, 0.45);

      const N = this.data.count;
      const pos = this.positions;
      const col = this.colors;
      for (let i = 0; i < N; i++) {
        let z = this.z[i] + speed * dt;
        if (z > -0.4) z -= 40;
        else if (z < -40.4) z += 40;
        this.z[i] = z;
        const a = (this.angle[i] += dt * 0.6 * I * dir);
        const r = this.radius[i];
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const o = i * 6;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z - len * dir;
        const fade = smooth(-40, -28, z);
        col[o] = this.head.r * fade; col[o + 1] = this.head.g * fade; col[o + 2] = this.head.b * fade;
        col[o + 3] = 0; col[o + 4] = 0; col[o + 5] = 0;
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.geometry.attributes.color.needsUpdate = true;
      this.lineMat.opacity = I;

      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        let z = ring.position.z + speed * 0.45 * dt;
        if (z > -0.3) z -= 38;
        else if (z < -38.3) z += 38;
        ring.position.z = z;
        ring.rotation.z += dt * (0.8 + i * 0.15) * dir;
        const s = 1.6 + 0.3 * Math.sin(t * 0.001 + i);
        ring.scale.set(s, s, 1);
        ring.material.opacity = I * 0.7 * smooth(-38, -24, z) * smooth(-0.3, -2.5, z);
      }
      this.core.material.opacity = I * 0.85;
      const cs = 12 + 4 * Math.sin(t * 0.006);
      this.core.scale.set(cs, cs, 1);
      this.flashMat.opacity = Math.max(0, 1 - Math.abs(p - 0.42) / 0.07) * 0.75;
    }
  });

  /* ── Ambientación: cielo, estrellas, suelo polar y partículas ── */
  AFRAME.registerComponent('time-ambience', {
    schema: {
      sky: { type: 'color', default: '#0f1118' },
      color: { type: 'color', default: '#d5aa46' },
      stars: { default: 1200 },
      motes: { default: 160 },
      center: { type: 'vec3', default: { x: 0, y: 0, z: -2.3 } }
    },

    init() {
      const d = this.data;
      this.group = new THREE.Group();
      this.curSky = new THREE.Color(d.sky);
      this.targetSky = new THREE.Color(d.sky);
      this.curTheme = new THREE.Color(d.color);
      this.targetTheme = new THREE.Color(d.color);
      this.time = 0;

      // Cielo degradado con auroras temporales
      this.skyMat = new THREE.ShaderMaterial({
        uniforms: { uSky: { value: this.curSky.clone() }, uTheme: { value: this.curTheme.clone() }, uTime: { value: 0 }, uWarp: { value: 0 } },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform vec3 uSky; uniform vec3 uTheme; uniform float uTime; uniform float uWarp; varying vec3 vDir;',
          'void main(){',
          '  float h = vDir.y;',
          '  vec3 zenith = uSky * 0.45;',
          '  vec3 horizon = mix(uSky * 1.6, uTheme, 0.28);',
          '  vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.55, h));',
          '  col = mix(col, uSky * 0.3, smoothstep(0.0, -0.4, h));',
          '  float ang = atan(vDir.z, vDir.x);',
          '  float aur = smoothstep(0.05, 0.35, h) * (1.0 - smoothstep(0.35, 0.75, h));',
          '  aur *= 0.5 + 0.5 * sin(ang * 5.0 + uTime * 0.07 + sin(ang * 3.0 - uTime * 0.05) * 1.5);',
          '  col += uTheme * aur * (0.10 + uWarp * 0.6);',
          '  gl_FragColor = vec4(col, 1.0);',
          '  gl_FragColor = linearToOutputTexel(gl_FragColor);',
          '}'
        ].join('\n'),
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      });
      const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 40, 20), this.skyMat);
      sky.renderOrder = -10;
      sky.frustumCulled = false;
      this.group.add(sky);

      // Estrellas
      const starCount = d.stars;
      const sp = new Float32Array(starCount * 3);
      const sc = new Float32Array(starCount * 3);
      const tint = new THREE.Color();
      for (let i = 0; i < starCount; i++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        let y = u;
        if (y < -0.15 && Math.random() < 0.7) y = -y;
        const rr = Math.sqrt(1 - y * y);
        const R = 110 + Math.random() * 25;
        sp[i * 3] = Math.cos(th) * rr * R;
        sp[i * 3 + 1] = y * R;
        sp[i * 3 + 2] = Math.sin(th) * rr * R;
        const roll = Math.random();
        tint.setRGB(1, 1, 1);
        if (roll < 0.2) tint.setRGB(1, 0.86, 0.6);
        else if (roll < 0.35) tint.setRGB(0.7, 0.82, 1);
        const lum = 0.55 + Math.random() * 0.45;
        sc[i * 3] = tint.r * lum; sc[i * 3 + 1] = tint.g * lum; sc[i * 3 + 2] = tint.b * lum;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
      this.stars.frustumCulled = false;
      this.group.add(this.stars);

      // Suelo polar (cuadrícula de "máquina del tiempo")
      const gp = [];
      for (let r = 2; r <= 14; r += 2) {
        const seg = 96;
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI * 2;
          const a1 = ((i + 1) / seg) * Math.PI * 2;
          gp.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
        }
      }
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        gp.push(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2, Math.cos(a) * 14, 0, Math.sin(a) * 14);
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
      this.gridMat = new THREE.LineBasicMaterial({ color: this.curTheme.clone(), transparent: true, opacity: 0.2, depthWrite: false });
      this.grid = new THREE.LineSegments(gg, this.gridMat);
      this.grid.position.set(d.center.x, 0.004, d.center.z);
      this.group.add(this.grid);

      // Partículas de tiempo que flotan alrededor del personaje
      const M = d.motes;
      this.mAngle = new Float32Array(M);
      this.mRadius = new Float32Array(M);
      this.mY = new Float32Array(M);
      this.mSpeed = new Float32Array(M);
      this.mPos = new Float32Array(M * 3);
      for (let i = 0; i < M; i++) {
        this.mAngle[i] = Math.random() * Math.PI * 2;
        this.mRadius[i] = 0.7 + Math.random() * 4.5;
        this.mY[i] = Math.random() * 4.2;
        this.mSpeed[i] = 0.5 + Math.random();
      }
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(this.mPos, 3));
      this.moteMat = new THREE.PointsMaterial({ size: 0.07, map: softDot(), color: this.curTheme.clone(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      this.motes = new THREE.Points(mg, this.moteMat);
      this.motes.frustumCulled = false;
      this.group.add(this.motes);

      this.el.setObject3D('ambience', this.group);
      this.onTheme = (e) => {
        if (!e.detail) return;
        if (e.detail.color) this.targetTheme.set(e.detail.color);
        if (e.detail.sky) this.targetSky.set(e.detail.sky);
      };
      this.el.sceneEl.addEventListener('time-theme', this.onTheme);
    },

    remove() {
      this.el.sceneEl.removeEventListener('time-theme', this.onTheme);
      this.el.removeObject3D('ambience');
      disposeObject(this.group);
    },

    tick(t, dtMs) {
      const dt = Math.min(dtMs || 16, 50) / 1000;
      this.time += dt;
      const warp = this.el.sceneEl.timeWarpIntensity || 0;
      const dir = this.el.sceneEl.timeWarpDirection || 1;
      const k = 1 - Math.exp(-dt * 2.2);
      this.curSky.lerp(this.targetSky, k);
      this.curTheme.lerp(this.targetTheme, k);
      const u = this.skyMat.uniforms;
      u.uSky.value.copy(this.curSky);
      u.uTheme.value.copy(this.curTheme);
      u.uTime.value = this.time;
      u.uWarp.value = warp;
      this.gridMat.color.copy(this.curTheme);
      this.gridMat.opacity = 0.2 + warp * 0.35;
      this.moteMat.color.copy(this.curTheme);
      this.stars.rotation.y += dt * (0.004 + warp * 0.25 * dir);
      this.grid.rotation.y -= dt * (0.01 + warp * 1.2 * dir);

      const c = this.data.center;
      for (let i = 0; i < this.mY.length; i++) {
        let y = this.mY[i] + (0.08 + warp * 2.2) * this.mSpeed[i] * dt;
        if (y > 4.2) y = 0.1;
        this.mY[i] = y;
        const a = (this.mAngle[i] += ((0.05 + warp * 2.5 * dir) * dt) / Math.max(0.6, this.mRadius[i] * 0.5));
        const r = this.mRadius[i];
        this.mPos[i * 3] = c.x + Math.cos(a) * r;
        this.mPos[i * 3 + 1] = y;
        this.mPos[i * 3 + 2] = c.z + Math.sin(a) * r;
      }
      this.motes.geometry.attributes.position.needsUpdate = true;
    }
  });

  /* ── Dial de reloj animado ── */
  AFRAME.registerComponent('time-dial', {
    schema: {
      radius: { default: 1 },
      inner: { default: 0.8 },
      ticks: { default: 60 },
      color: { type: 'color', default: '#d5aa46' },
      speed: { default: 0.05 },
      hands: { default: false },
      opacity: { default: 0.8 }
    },

    init() {
      const d = this.data;
      this.group = new THREE.Group();
      this.cur = new THREE.Color(d.color);
      this.target = new THREE.Color(d.color);
      const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

      const tp = [];
      for (let i = 0; i < d.ticks; i++) {
        const a = (i / d.ticks) * Math.PI * 2;
        const major = i % 5 === 0;
        const r0 = d.radius * (major ? 0.86 : 0.93);
        tp.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * d.radius, Math.sin(a) * d.radius, 0);
      }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
      this.tickMat = new THREE.LineBasicMaterial(Object.assign({ color: this.cur.clone(), opacity: d.opacity }, additive));
      this.ticksObj = new THREE.LineSegments(tg, this.tickMat);
      this.group.add(this.ticksObj);

      const circle = (r, seg) => {
        const pts = [];
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          pts.push(Math.cos(a) * r, Math.sin(a) * r, 0);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return g;
      };
      this.ringMat = new THREE.LineBasicMaterial(Object.assign({ color: this.cur.clone(), opacity: d.opacity * 0.7 }, additive));
      this.group.add(new THREE.LineLoop(circle(d.radius * 1.03, 128), this.ringMat));

      this.innerGroup = new THREE.Group();
      this.innerGroup.add(new THREE.LineLoop(circle(d.inner, 96), this.ringMat));
      const dp = [];
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        const a1 = a0 + 0.18;
        dp.push(Math.cos(a0) * d.inner * 0.94, Math.sin(a0) * d.inner * 0.94, 0, Math.cos(a1) * d.inner * 0.94, Math.sin(a1) * d.inner * 0.94, 0);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
      this.innerGroup.add(new THREE.LineSegments(dg, this.tickMat));
      this.group.add(this.innerGroup);

      this.bandMat = new THREE.MeshBasicMaterial(Object.assign({ color: this.cur.clone(), opacity: d.opacity * 0.18, side: THREE.DoubleSide }, additive));
      this.group.add(new THREE.Mesh(new THREE.RingGeometry(d.inner * 0.985, d.radius * 0.84, 96), this.bandMat));

      if (d.hands) {
        this.handMat = new THREE.MeshBasicMaterial(Object.assign({ color: this.cur.clone(), opacity: Math.min(1, d.opacity + 0.2), side: THREE.DoubleSide }, additive));
        const makeHand = (len, w) => {
          const g = new THREE.PlaneGeometry(w, len);
          g.translate(0, len / 2, 0.01);
          return new THREE.Mesh(g, this.handMat);
        };
        this.hourHand = makeHand(d.radius * 0.5, d.radius * 0.045);
        this.minuteHand = makeHand(d.radius * 0.8, d.radius * 0.025);
        this.hourHand.rotation.z = -1.1;
        this.group.add(this.hourHand, this.minuteHand);
        this.group.add(new THREE.Mesh(new THREE.CircleGeometry(d.radius * 0.05, 24), this.handMat));
      }

      this.el.setObject3D('dial', this.group);
      this.onTheme = (e) => { if (e.detail && e.detail.color) this.target.set(e.detail.color); };
      this.el.sceneEl.addEventListener('time-theme', this.onTheme);
    },

    update(old) {
      if (old && old.color && old.color !== this.data.color) this.target.set(this.data.color);
    },

    setColor(c) { this.target.set(c); },

    remove() {
      this.el.sceneEl.removeEventListener('time-theme', this.onTheme);
      this.el.removeObject3D('dial');
      disposeObject(this.group);
    },

    tick(t, dtMs) {
      const dt = Math.min(dtMs || 16, 50) / 1000;
      const scene = this.el.sceneEl;
      const warp = scene.timeWarpIntensity || 0;
      const dir = scene.timeWarpDirection || 1;
      const sp = this.data.speed * (1 + warp * 40) * (warp > 0.01 ? dir : 1);
      this.ticksObj.rotation.z -= sp * dt;
      this.innerGroup.rotation.z += sp * 1.6 * dt;
      if (this.minuteHand) {
        const hs = (0.25 + warp * 28) * (warp > 0.01 ? dir : 1);
        this.minuteHand.rotation.z -= hs * dt;
        this.hourHand.rotation.z -= (hs / 12) * dt;
      }
      this.cur.lerp(this.target, 1 - Math.exp(-dt * 2.5));
      const boost = 1 + warp * 0.8;
      this.tickMat.color.copy(this.cur).multiplyScalar(boost);
      this.ringMat.color.copy(this.cur).multiplyScalar(boost);
      this.bandMat.color.copy(this.cur);
      this.bandMat.opacity = this.data.opacity * (0.18 + warp * 0.4);
      if (this.handMat) this.handMat.color.copy(this.cur).multiplyScalar(boost);
    }
  });

  /* ── Orientar hacia la cámara (solo eje Y) ── */
  AFRAME.registerComponent('face-camera', {
    init() { this.v = new THREE.Vector3(); },
    tick() {
      const cam = this.el.sceneEl.camera;
      const o = this.el.object3D;
      if (!cam || !o.parent) return;
      cam.getWorldPosition(this.v);
      o.parent.worldToLocal(this.v);
      o.rotation.y = Math.atan2(this.v.x - o.position.x, this.v.z - o.position.z);
    }
  });
})();
