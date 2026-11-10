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
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
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
    if (!canvas || !canvas.getContext) return { play() { }, stop() { } };
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
  /* ── GLSL de deformación del personaje (piernas, brazos, torso, cabeza y boca) ── */
  const GLSL_COMMON = `
uniform float uTime;
uniform vec3 uHead;
uniform vec3 uBody;
uniform vec2 uArmR;
uniform vec2 uArmL;
uniform vec2 uLegR;
uniform vec2 uLegL;
uniform float uMouth;
uniform float uFaceZ;
uniform float uBreath;
uniform float uHeight;
uniform float uReveal;
uniform vec3 uGlow;
uniform float uFlash;
varying float vTamayoY;
varying float vMouthCavity;
`;

  const GLSL_VERTEX = `
mat3 tamayoRotX(float a){ float c = cos(a); float s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }
mat3 tamayoRotY(float a){ float c = cos(a); float s = sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 tamayoRotZ(float a){ float c = cos(a); float s = sin(a); return mat3(c,s,0.0, -s,c,0.0, 0.0,0.0,1.0); }
vec3 tamayoApply(vec3 p, vec3 v, bool isPoint){
  float H = uHeight;
  float y = p.y;
  vec3 r = v;

  // Deformación de Piernas para Caminata y Zancada (y desde 0.0 hasta 0.50 * H)
  float bandLeg = 1.0 - smoothstep(0.40 * H, 0.48 * H, y);
  float legR_weight = (1.0 - smoothstep(-0.015 * H, 0.015 * H, p.x)) * bandLeg;
  float legL_weight = smoothstep(-0.015 * H, 0.015 * H, p.x) * bandLeg;
  // Deformación de Piernas para Caminata, Zancada y Elevación de Pie (y desde 0.0 hasta 0.50 * H)
  float bandLeg = 1.0 - smoothstep(0.41 * H, 0.49 * H, y);
  float legR_weight = (1.0 - smoothstep(-0.012 * H, 0.012 * H, p.x)) * bandLeg;
  float legL_weight = smoothstep(-0.012 * H, 0.012 * H, p.x) * bandLeg;

  if (legR_weight > 0.0001) {
    vec3 hipR = vec3(-0.065 * H, 0.46 * H, 0.0);
    mat3 mHipR = tamayoRotX(uLegR.x * legR_weight);
    float kneeR_weight = (1.0 - smoothstep(0.18 * H, 0.26 * H, y)) * legR_weight;
    float kneeR_weight = (1.0 - smoothstep(0.19 * H, 0.27 * H, y)) * legR_weight;
    vec3 kneeR = vec3(-0.065 * H, 0.24 * H, 0.0);
    mat3 mKneeR = tamayoRotX(-uLegR.y * kneeR_weight);
    r = isPoint ? (mHipR * (r - hipR) + hipR) : (mHipR * r);
    r = isPoint ? (mKneeR * (r - kneeR) + kneeR) : (mKneeR * r);
    if (isPoint) {
      r.y += 0.036 * H * uLegR.y * kneeR_weight;
    }
  }

  if (legL_weight > 0.0001) {
    vec3 hipL = vec3(0.065 * H, 0.46 * H, 0.0);
    mat3 mHipL = tamayoRotX(uLegL.x * legL_weight);
    float kneeL_weight = (1.0 - smoothstep(0.18 * H, 0.26 * H, y)) * legL_weight;
    float kneeL_weight = (1.0 - smoothstep(0.19 * H, 0.27 * H, y)) * legL_weight;
    vec3 kneeL = vec3(0.065 * H, 0.24 * H, 0.0);
    mat3 mKneeL = tamayoRotX(-uLegL.y * kneeL_weight);
    r = isPoint ? (mHipL * (r - hipL) + hipL) : (mHipL * r);
    r = isPoint ? (mKneeL * (r - kneeL) + kneeL) : (mKneeL * r);
    if (isPoint) {
      r.y += 0.036 * H * uLegL.y * kneeL_weight;
    }
  }

  // Deformación de Brazos
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

  // Articulación de Boca, Mandíbula y Bigote al hablar (antes de rotar la cabeza)
  if (uMouth > 0.001) {
    float faceFront = smoothstep(uFaceZ * 0.22, uFaceZ * 0.62, p.z);
    float mouthWidth = 1.0 - smoothstep(0.018 * H, 0.048 * H, abs(p.x));
    float jawBand = smoothstep(0.826 * H, 0.846 * H, y) * (1.0 - smoothstep(0.871 * H, 0.878 * H, y));
    float upperLipBand = smoothstep(0.874 * H, 0.880 * H, y) * (1.0 - smoothstep(0.892 * H, 0.902 * H, y));
    float wJaw = faceFront * mouthWidth * jawBand;
    float wLip = faceFront * mouthWidth * upperLipBand;
    if (isPoint) {
      // La mandíbula inferior desciende y pivota levemente hacia atrás al vocalizar
      r.y -= 0.026 * H * uMouth * wJaw;
      r.z -= 0.010 * H * uMouth * wJaw;
      // El labio superior y el bigote se elevan y se abren sutilmente
      r.y += 0.0085 * H * uMouth * wLip;
      r.z += 0.004 * H * uMouth * wLip;
      r.x += p.x * 0.08 * uMouth * (wJaw + wLip);
    } else if (wJaw > 0.01) {
      r = tamayoRotX(0.22 * uMouth * wJaw) * r;
    }
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
  if (vMouthCavity > 0.01) {
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.07, 0.025, 0.025), clamp(vMouthCavity * 0.88, 0.0, 0.88));
  }
  float tEdge = 1.0 - smoothstep(0.0, 0.06, tRevealY - vTamayoY);
  float tActive = 1.0 - step(0.999, uReveal);
  float tScan = step(0.85, fract(vTamayoY * 80.0 - uTime * 1.6));
  gl_FragColor.rgb += uGlow * (tEdge * tActive * 2.4 + tScan * tActive * 0.22 + uFlash);
  #include <dithering_fragment>`;

  /* ── Gestos procedurales (p = progreso 0..1) ── */
  const GESTURES = {
    wave: { dur: 2.6, fn(p, o) { const e = envelope(p, 0.18, 0.82); o.armR.x += (0.95 + 0.2 * Math.sin(p * Math.PI * 10)) * e; o.armR.y += 0.35 * e; o.head.z += 0.07 * e; o.body.z -= 0.035 * e; } },
    bow: { dur: 2.2, fn(p, o) { const e = envelope(p, 0.3, 0.7); o.body.x += 0.42 * e; o.head.y += 0.16 * e; o.armR.y += 0.1 * e; o.armL.y += 0.1 * e; o.legL.x += 0.1 * e; } },
    nod: { dur: 1.5, fn(p, o) { const e = envelope(p, 0.1, 0.9); o.head.y += 0.13 * (0.5 - 0.5 * Math.cos(p * Math.PI * 6)) * e; } },
    think: { dur: 3.0, fn(p, o) { const e = envelope(p, 0.2, 0.8); o.head.z += 0.15 * e; o.head.y += 0.1 * e; o.head.x -= 0.22 * e; o.armR.y += 0.85 * e; o.armR.x -= 0.08 * e; o.body.y -= 0.06 * e; } },
    indicate: { dur: 2.6, fn(p, o) { const e = envelope(p, 0.2, 0.8); o.body.y += 0.3 * e; o.head.x += 0.4 * e; o.armL.x += 0.8 * e; o.armL.y += 0.45 * e; o.legL.x += 0.12 * e; } },
    walk: { dur: 3.2, fn(p, o) { const e = envelope(p, 0.08, 0.92); const ph = p * Math.PI * 6; o.fwd += 0.22 * Math.sin(Math.PI * p); o.posY += 0.012 * Math.abs(Math.sin(ph)) * e; o.body.z += 0.045 * Math.sin(ph) * e; o.body.x += 0.04 * e; o.armR.y += 0.28 * Math.sin(ph) * e; o.armL.y -= 0.28 * Math.sin(ph) * e; o.legR.x += 0.38 * Math.sin(ph) * e; o.legL.x -= 0.38 * Math.sin(ph) * e; } },
    spin: { dur: 1.8, fn(p, o) { o.spin += Math.PI * 2 * easeInOutCubic(p); const e = Math.sin(Math.PI * p); o.posY += 0.04 * e; o.armR.x += 0.45 * e; o.armL.x += 0.45 * e; } },
    jump: {
      dur: 1.2, fn(p, o) {
        if (p < 0.25) { const c = Math.sin((p / 0.25) * Math.PI); o.sy -= 0.08 * c; o.sx += 0.04 * c; o.body.x += 0.1 * c; }
        else if (p < 0.75) { const s = Math.sin(((p - 0.25) / 0.5) * Math.PI); o.posY += 0.16 * s; o.sy += 0.04 * s; o.armR.x += 0.6 * s; o.armL.x += 0.6 * s; }
        else { const r = Math.sin(((p - 0.75) / 0.25) * Math.PI); o.sy -= 0.07 * r; o.sx += 0.035 * r; }
      }
    },
    celebrate: { dur: 2.8, fn(p, o) { const e = envelope(p, 0.12, 0.88); const q = (p * 2) % 1; o.posY += 0.09 * Math.max(0, Math.sin(Math.PI * q)) * e; o.armR.x += 1.0 * e; o.armL.x += 1.0 * e; o.armR.y += 0.4 * e; o.armL.y += 0.4 * e; o.head.y -= 0.1 * e; o.flash += 0.12 * e; } },
    materialize: { dur: 1.6, fn(p, o) { const k = 1 - easeOutCubic(p); o.spin -= 1.4 * k; o.posY += 0.05 * k; o.flash += 0.5 * k; } },

    /* Coreografías Predeterminadas por Escena Histórica */
    scene1_despertar: {
      dur: 4.8,
      fn(p, o) {
        if (p < 0.38) {
          const k = Math.sin((p / 0.38) * Math.PI);
          o.body.x += 0.32 * k;
          o.head.y += 0.12 * k;
          o.armR.y += 0.15 * k;
          o.armL.y += 0.15 * k;
          o.legL.x += 0.12 * k;
        } else if (p < 0.72) {
          const k = Math.sin(((p - 0.38) / 0.34) * Math.PI);
          o.armR.y += 0.55 * k;
          o.armR.x -= 0.12 * k;
          o.head.z += 0.08 * k;
          o.head.x += 0.15 * k;
        } else {
          const k = Math.sin(((p - 0.72) / 0.28) * Math.PI);
          o.armR.x += 0.85 * k;
          o.armR.y += 0.35 * k;
          o.head.y -= 0.08 * k;
          o.body.y += 0.08 * k;
        }
      }
    },
    scene2_pedagogia: {
      dur: 5.2,
      fn(p, o) {
        if (p < 0.45) {
          const k = Math.sin((p / 0.45) * Math.PI);
          o.armR.y += 0.9 * k;
          o.armR.x -= 0.1 * k;
          o.armL.x += 0.2 * k;
          o.head.z += 0.18 * k;
          o.head.x -= 0.22 * k;
          o.body.x += 0.06 * k;
        } else if (p < 0.8) {
          const k = Math.sin(((p - 0.45) / 0.35) * Math.PI);
          o.armR.x += 0.98 * k;
          o.armR.y += 0.45 * k;
          o.head.x += 0.28 * k;
          o.head.y += 0.12 * Math.sin(p * 24) * k;
          o.body.y += 0.22 * k;
          o.legR.x += 0.15 * k;
        } else {
          const k = Math.sin(((p - 0.8) / 0.2) * Math.PI);
          o.head.y += 0.14 * (0.5 - 0.5 * Math.cos(p * Math.PI * 8)) * k;
          o.armR.y += 0.25 * k;
        }
      }
    },
    scene3_fundacion: {
      dur: 5.0,
      fn(p, o) {
        if (p < 0.5) {
          const k = Math.sin((p / 0.5) * Math.PI);
          o.body.y += 0.38 * k;
          o.head.x += 0.45 * k;
          o.armL.x += 0.85 * k;
          o.armL.y += 0.4 * k;
          o.armR.x += 0.45 * k;
          o.legL.x += 0.15 * k;
        } else if (p < 0.8) {
          const k = Math.sin(((p - 0.5) / 0.3) * Math.PI);
          o.head.y += 0.12 * Math.sin(p * 18) * k;
          o.armR.y += 0.4 * k;
          o.body.x += 0.08 * k;
        } else {
          const k = Math.sin(((p - 0.8) / 0.2) * Math.PI);
          o.armR.x += 0.85 * k;
          o.armL.x += 0.85 * k;
          o.head.y -= 0.1 * k;
          o.body.x -= 0.04 * k;
        }
      }
    },
    scene4_crecimiento: {
      dur: 5.2,
      fn(p, o) {
        if (p < 0.45) {
          const k = Math.sin((p / 0.45) * Math.PI);
          o.armL.x += 0.95 * k;
          o.armL.y += 0.45 * k;
          o.head.x -= 0.4 * k;
          o.body.y -= 0.25 * k;
          o.legL.x += 0.18 * k;
          o.legR.x -= 0.1 * k;
        } else if (p < 0.82) {
          const k = Math.sin(((p - 0.45) / 0.37) * Math.PI);
          o.armR.x += 0.95 * k;
          o.armR.y += 0.45 * k;
          o.head.x += 0.4 * k;
          o.body.y += 0.25 * k;
          o.legR.x += 0.18 * k;
          o.legL.x -= 0.1 * k;
        } else {
          const k = Math.sin(((p - 0.82) / 0.18) * Math.PI);
          o.head.y += 0.1 * (0.5 - 0.5 * Math.cos(p * Math.PI * 6)) * k;
          o.armR.y += 0.2 * k;
          o.armL.y += 0.2 * k;
        }
      }
    },
    scene5_legado: {
      dur: 5.4,
      fn(p, o) {
        if (p < 0.35) {
          const k = Math.sin((p / 0.35) * Math.PI);
          o.armR.x += (0.95 + 0.15 * Math.sin(p * Math.PI * 12)) * k;
          o.armR.y += 0.35 * k;
          o.head.z += 0.08 * k;
        } else if (p < 0.72) {
          const k = Math.sin(((p - 0.35) / 0.37) * Math.PI);
          o.fwd += 0.18 * k;
          o.body.x += 0.14 * k;
          o.armR.x += 0.78 * k;
          o.armR.y += 0.32 * k;
          o.legL.x += 0.26 * k;
          o.legR.x -= 0.14 * k;
          o.head.y += 0.08 * Math.sin(p * 18) * k;
        } else {
          const k = Math.sin(((p - 0.72) / 0.28) * Math.PI);
          o.armR.x += 1.1 * k;
          o.armL.x += 1.1 * k;
          o.armR.y += 0.42 * k;
          o.armL.y += 0.42 * k;
          o.head.y -= 0.14 * k;
          o.flash += 0.15 * k;
        }
      }
    }
  };
  GESTURES.speak = GESTURES.nod;
  GESTURES.greet = GESTURES.wave;
  FX.gestures = Object.keys(GESTURES);

  function speechEnvelope(T) {
    const gate = smooth(-0.2, 0.4, Math.sin(T * 1.9) + 0.6 * Math.sin(T * 0.77 + 2.0));
    const syllables = 0.5 + 0.5 * Math.sin(T * 10.5) * Math.sin(T * 3.7 + 0.5);
    return gate * syllables;
  }

  /**
   * Movimientos Grabados Continuos por Escena (0..4):
   * Cada escena tiene su propia grabación en bucle (14 s) donde Franz Tamayo
   * da pasos reales moviendo piernas y rodillas, gira hacia las estaciones 3D
   * e imágenes históricas, gesticula y articula la boca mientras explica la historia.
   */
  function applyWalkSteps(ph, weight, o) {
    const step = Math.sin(ph);
    const stepCos = Math.cos(ph);
    o.legR.x += 0.48 * step * weight;
    o.legR.y += Math.max(0, -step) * 0.46 * weight;
    o.legL.x -= 0.48 * step * weight;
    o.legL.y += Math.max(0, step) * 0.46 * weight;
    o.armR.y += 0.36 * step * weight;
    o.armL.y -= 0.36 * step * weight;
    o.body.z += 0.038 * stepCos * weight;
    o.body.y += 0.065 * step * weight;
    o.posY += 0.022 * Math.abs(step) * weight;
  }

  const SCENE_RECORDINGS = [
    // Escena 0 (1879 · El Despertar de un Genio): camina al frente, reverencia, pasea hacia su obra poética y recita
    {
      dur: 14.0,
      fn(p, T, o) {
        if (p < 0.24) {
          const u = p / 0.24;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.26 * Math.sin(u * Math.PI * 0.5);
          o.mouth = Math.max(o.mouth, 0.65 * speechEnvelope(T * 1.15) * w);
        } else if (p < 0.48) {
          const u = (p - 0.24) / 0.24;
          const w = envelope(u, 0.15, 0.85);
          o.fwd += 0.26;
          o.body.x += 0.28 * Math.sin(u * Math.PI);
          o.head.y += 0.14 * Math.sin(u * Math.PI);
          o.armR.x += 0.65 * w;
          o.armR.y += 0.38 * w;
          o.legL.x += 0.16 * w;
          o.mouth = Math.max(o.mouth, 0.85 * speechEnvelope(T * 1.2) * w);
        } else if (p < 0.76) {
          const u = (p - 0.48) / 0.28;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w * 0.85, o);
          o.fwd += 0.26 - 0.12 * Math.sin(u * Math.PI);
          o.spin -= 0.38 * Math.sin(u * Math.PI);
          o.head.x -= 0.32 * w;
          o.armL.x += 0.82 * w;
          o.armL.y += 0.42 * w;
          o.mouth = Math.max(o.mouth, 0.78 * speechEnvelope(T * 1.1) * w);
        } else {
          const u = (p - 0.76) / 0.24;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.26 * (1 - easeInOutCubic(u));
          o.armR.x += 0.55 * w;
          o.head.y += 0.08 * Math.sin(u * Math.PI * 4) * w;
          o.mouth = Math.max(o.mouth, 0.6 * speechEnvelope(T) * w);
        }
      }
    },
    // Escena 1 (1910 · Creación de la Pedagogía Nacional): paso de catedrático, lectura de manuscrito y discurso magistral
    {
      dur: 14.0,
      fn(p, T, o) {
        if (p < 0.26) {
          const u = p / 0.26;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.24 * easeInOutCubic(u);
          o.spin -= 0.22 * easeInOutCubic(u);
          o.armL.y += 0.55 * w;
          o.mouth = Math.max(o.mouth, 0.75 * speechEnvelope(T * 1.2) * w);
        } else if (p < 0.54) {
          const u = (p - 0.26) / 0.28;
          const w = envelope(u, 0.14, 0.86);
          o.fwd += 0.24;
          o.spin -= 0.22;
          o.armR.x += (0.88 + 0.14 * Math.sin(u * Math.PI * 8)) * w;
          o.armR.y += 0.52 * w;
          o.armL.y += 0.48 * w;
          o.head.x += 0.22 * Math.sin(u * Math.PI * 2) * w;
          o.head.y += 0.11 * Math.sin(u * Math.PI * 6) * w;
          o.legR.x += 0.18 * w;
          o.mouth = Math.max(o.mouth, 0.92 * speechEnvelope(T * 1.28) * w);
        } else if (p < 0.78) {
          const u = (p - 0.54) / 0.24;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w * 0.9, o);
          o.fwd += 0.24;
          o.spin += (-0.22 + 0.48 * easeInOutCubic(u));
          o.armR.y += 0.78 * w;
          o.head.z += 0.14 * w;
          o.mouth = Math.max(o.mouth, 0.72 * speechEnvelope(T * 1.15) * w);
        } else {
          const u = (p - 0.78) / 0.22;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.24 * (1 - easeInOutCubic(u));
          o.spin += 0.26 * (1 - easeInOutCubic(u));
          o.mouth = Math.max(o.mouth, 0.65 * speechEnvelope(T) * w);
        }
      }
    },
    // Escena 2 (1993 · Fundación de UNIFRANZ): camina hacia la maqueta de la Casona 1993 y fotos históricas, homenajea a los fundadores
    {
      dur: 14.0,
      fn(p, T, o) {
        if (p < 0.25) {
          const u = p / 0.25;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.28 * easeInOutCubic(u);
          o.armR.x += 0.55 * w;
          o.mouth = Math.max(o.mouth, 0.8 * speechEnvelope(T * 1.18) * w);
        } else if (p < 0.52) {
          const u = (p - 0.25) / 0.27;
          const w = envelope(u, 0.14, 0.86);
          o.fwd += 0.28;
          o.body.y += 0.28 * w;
          o.head.x += 0.34 * w;
          o.armL.x += 0.86 * w;
          o.armL.y += 0.44 * w;
          o.armR.x += 0.52 * w;
          o.legL.x += 0.2 * w;
          o.mouth = Math.max(o.mouth, 0.9 * speechEnvelope(T * 1.25) * w);
        } else if (p < 0.78) {
          const u = (p - 0.52) / 0.26;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w * 0.85, o);
          o.fwd += 0.28 - 0.08 * Math.sin(u * Math.PI);
          o.spin += 0.32 * Math.sin(u * Math.PI);
          o.armR.x += 0.82 * w;
          o.armL.x += 0.82 * w;
          o.armR.y += 0.35 * w;
          o.armL.y += 0.35 * w;
          o.mouth = Math.max(o.mouth, 0.84 * speechEnvelope(T * 1.2) * w);
        } else {
          const u = (p - 0.78) / 0.22;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.28 * (1 - easeInOutCubic(u));
          o.body.x += 0.18 * Math.sin(u * Math.PI);
          o.mouth = Math.max(o.mouth, 0.65 * speechEnvelope(T) * w);
        }
      }
    },
    // Escena 3 (Expansión · Cuatro Sedes en Bolivia): recorre el mapa señalando La Paz, El Alto, Cochabamba y Santa Cruz
    {
      dur: 14.0,
      fn(p, T, o) {
        if (p < 0.25) {
          const u = p / 0.25;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.25 * easeInOutCubic(u);
          o.spin -= 0.35 * easeInOutCubic(u);
          o.armL.x += 0.88 * w;
          o.armL.y += 0.42 * w;
          o.mouth = Math.max(o.mouth, 0.82 * speechEnvelope(T * 1.2) * w);
        } else if (p < 0.55) {
          const u = (p - 0.25) / 0.30;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w * 0.9, o);
          o.fwd += 0.25;
          o.spin += -0.35 + 0.70 * easeInOutCubic(u);
          o.armR.x += 0.92 * w;
          o.armR.y += 0.45 * w;
          o.head.x += 0.35 * Math.sin(u * Math.PI) * w;
          o.mouth = Math.max(o.mouth, 0.9 * speechEnvelope(T * 1.26) * w);
        } else if (p < 0.78) {
          const u = (p - 0.55) / 0.23;
          const w = envelope(u, 0.14, 0.86);
          o.fwd += 0.25;
          o.spin += 0.35 * (1 - easeInOutCubic(u));
          o.armR.x += 0.85 * w;
          o.armL.x += 0.85 * w;
          o.legR.x += 0.18 * w;
          o.legL.x -= 0.12 * w;
          o.mouth = Math.max(o.mouth, 0.85 * speechEnvelope(T * 1.18) * w);
        } else {
          const u = (p - 0.78) / 0.22;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.25 * (1 - easeInOutCubic(u));
          o.mouth = Math.max(o.mouth, 0.65 * speechEnvelope(T) * w);
        }
      }
    },
    // Escena 4 (Hoy · Más de 30 Años de Legado Vivo): caminata entusiasta, señala la llama del saber y celebra el futuro
    {
      dur: 14.0,
      fn(p, T, o) {
        if (p < 0.26) {
          const u = p / 0.26;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.30 * easeInOutCubic(u);
          o.armR.x += (0.9 + 0.15 * Math.sin(u * Math.PI * 10)) * w;
          o.armR.y += 0.36 * w;
          o.mouth = Math.max(o.mouth, 0.88 * speechEnvelope(T * 1.24) * w);
        } else if (p < 0.54) {
          const u = (p - 0.26) / 0.28;
          const w = envelope(u, 0.14, 0.86);
          applyWalkSteps(u * Math.PI * 6, w * 0.8, o);
          o.fwd += 0.30;
          o.spin += 0.36 * Math.sin(u * Math.PI);
          o.armR.x += 0.95 * w;
          o.armL.x += 0.65 * w;
          o.armR.y += 0.42 * w;
          o.head.y -= 0.1 * w;
          o.mouth = Math.max(o.mouth, 0.92 * speechEnvelope(T * 1.3) * w);
        } else if (p < 0.78) {
          const u = (p - 0.54) / 0.24;
          const w = envelope(u, 0.14, 0.86);
          o.fwd += 0.30;
          o.armR.x += 1.05 * w;
          o.armL.x += 1.05 * w;
          o.armR.y += 0.44 * w;
          o.armL.y += 0.44 * w;
          o.posY += 0.04 * Math.abs(Math.sin(u * Math.PI * 2)) * w;
          o.flash += 0.08 * w;
          o.mouth = Math.max(o.mouth, 0.86 * speechEnvelope(T * 1.22) * w);
        } else {
          const u = (p - 0.78) / 0.22;
          const w = envelope(u, 0.12, 0.88);
          applyWalkSteps(u * Math.PI * 6, w, o);
          o.fwd += 0.30 * (1 - easeInOutCubic(u));
          o.mouth = Math.max(o.mouth, 0.7 * speechEnvelope(T) * w);
        }
      }
    }
  ];

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  AFRAME.registerComponent('tamayo-animator', {
    schema: {
      lookAtCamera: { default: true },
      talking: { default: false },
      walking: { default: false },
      autoGestures: { default: true },
      sceneIndex: { default: 0 },
      sceneLoop: { default: true },
      glow: { type: 'color', default: '#ffd166' },
      intensity: { default: 1 },
      bodyFollow: { default: 0.5 },
      height: { default: 0.98 },
      locked: { default: false }
    },

    init() {
      this.time = 0;
      this.sceneStartTime = 0;
      this.uniforms = {
        uTime: { value: 0 },
        uHead: { value: new THREE.Vector3() },
        uBody: { value: new THREE.Vector3() },
        uArmR: { value: new THREE.Vector2() },
        uArmL: { value: new THREE.Vector2() },
        uLegR: { value: new THREE.Vector2() },
        uLegL: { value: new THREE.Vector2() },
        uMouth: { value: 0 },
        uFaceZ: { value: 0.095 },
        uBreath: { value: 0 },
        uHeight: { value: this.data.height },
        uReveal: { value: 1 },
        uGlow: { value: new THREE.Color(this.data.glow) },
        uFlash: { value: 0 }
      };
      this.cur = {
        head: new THREE.Vector3(),
        body: new THREE.Vector3(),
        armR: new THREE.Vector2(),
        armL: new THREE.Vector2(),
        legR: new THREE.Vector2(),
        legL: new THREE.Vector2(),
        mouth: 0,
        follow: 0
      };
      this.out = {
        head: new THREE.Vector3(),
        body: new THREE.Vector3(),
        armR: new THREE.Vector2(),
        armL: new THREE.Vector2(),
        legR: new THREE.Vector2(),
        legL: new THREE.Vector2(),
        mouth: 0,
        posY: 0,
        fwd: 0,
        spin: 0,
        sx: 1,
        sy: 1,
        flash: 0
      };
      this.gestures = [];
      this.reveal = null;
      this.base = null;
      this.glance = { next: 3 + Math.random() * 3, start: -10, dur: 1.4, yaw: 0, pitch: 0 };
      this.emph = { next: 1.5, start: -10, dur: 1.2, arm: 0, amount: 0 };
      this.nextAuto = 6 + Math.random() * 4;
      this.tmp = new THREE.Vector3();
      this.onModel = this.onModel.bind(this);
      this.onGesture = (e) => this.play(e.detail && e.detail.type);
      this.el.addEventListener('model-loaded', this.onModel);
      this.el.addEventListener('tamayo-gesture', this.onGesture);
      if (this.el.getObject3D('mesh')) this.onModel();
    },

    update(old) {
      if (old && old.glow !== this.data.glow) this.uniforms.uGlow.value.set(this.data.glow);
      if (old && old.locked !== this.data.locked) this.setLocked(this.data.locked);
    },

    remove() {
      this.el.removeEventListener('model-loaded', this.onModel);
      this.el.removeEventListener('tamayo-gesture', this.onGesture);
    },

    setLocked(isLocked) {
      this.data.locked = !!isLocked;
      if (isLocked) {
        this.gestures = [];
        this.data.talking = false;
        this.uniforms.uGlow.value.set('#64748b'); // Tono pétreo / estatua inerte
        this.uniforms.uBreath.value = 0;
        this.uniforms.uMouth.value = 0;
        this.cur.head.set(0, 0, 0);
        this.cur.body.set(0, 0, 0);
        this.cur.armR.set(0, 0);
        this.cur.armL.set(0, 0);
        this.cur.legR.set(0, 0);
        this.cur.legL.set(0, 0);
        this.cur.mouth = 0;
        this.uniforms.uHead.value.set(0, 0, 0);
        this.uniforms.uBody.value.set(0, 0, 0);
        this.uniforms.uArmR.value.set(0, 0);
        this.uniforms.uArmL.value.set(0, 0);
        this.uniforms.uLegR.value.set(0, 0);
        this.uniforms.uLegL.value.set(0, 0);
      } else {
        this.uniforms.uGlow.value.set(this.data.glow);
        this.uniforms.uFlash.value = 0.85; // Destello dorado de despertar histórico
      }
    },

    isLocked() {
      return !!this.data.locked;
    },

    setWalking(isWalking) {
      this.data.walking = !!isWalking;
    },

    isWalking() {
      return !!this.data.walking;
    },

    setSceneIndex(sceneIndex) {
      const idx = clamp(Number(sceneIndex) || 0, 0, SCENE_RECORDINGS.length - 1);
      this.data.sceneIndex = idx;
      this.sceneStartTime = this.time;
    },

    onModel() {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      let maxY = 0;
      let maxZ = 0;
      mesh.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        node.geometry.computeBoundingBox();
        if (node.geometry.boundingBox) maxY = Math.max(maxY, node.geometry.boundingBox.max.y);
        if (node.geometry.boundingBox) {
          maxY = Math.max(maxY, node.geometry.boundingBox.max.y);
          maxZ = Math.max(maxZ, node.geometry.boundingBox.max.z);
        }
        node.frustumCulled = false;
        (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => this.patch(m));
      });
      if (maxY > 0.05) this.uniforms.uHeight.value = maxY;
      if (maxZ > 0.02) this.uniforms.uFaceZ.value = maxZ;
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
          .replace('#include <begin_vertex>', `#include <begin_vertex>
  transformed = tamayoApply(position, transformed, true);
  vTamayoY = position.y;
  float mBandY = smoothstep(0.868 * uHeight, 0.874 * uHeight, position.y) * (1.0 - smoothstep(0.876 * uHeight, 0.882 * uHeight, position.y));
  float mBandX = 1.0 - smoothstep(0.012 * uHeight, 0.026 * uHeight, abs(position.x));
  float mBandZ = smoothstep(uFaceZ * 0.40, uFaceZ * 0.72, position.z);
  vMouthCavity = mBandY * mBandX * mBandZ * clamp(uMouth * 1.4, 0.0, 1.0);`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
          .replace('void main() {', GLSL_FRAG_START)
          .replace('#include <dithering_fragment>', GLSL_FRAG_END);
      };
      material.customProgramCacheKey = () => 'tamayo-animator-v3';
      material.needsUpdate = true;
    },

  /** Reproduce un gesto: wave, bow, nod, think, indicate, walk, spin, jump, celebrate, materialize, etc. */
  play(type) {
  if (this.data.locked) return false;
  const g = GESTURES[type];
  if (!g) return false;
  this.gestures = this.gestures.filter((x) => x.type !== type);
  this.gestures.push({ type, start: this.time, dur: g.dur, fn: g.fn });
  return true;
},

/** Reproduce la coreografía predeterminada correspondiente a la escena histórica (0 a 4) */
/** Reproduce la coreografía predeterminada correspondiente a la escena histórica (0 a 4) y activa su bucle grabado */
playSceneChoreography(sceneIndex) {
  this.setSceneIndex(sceneIndex);
  const choreo = ['scene1_despertar', 'scene2_pedagogia', 'scene3_fundacion', 'scene4_crecimiento', 'scene5_legado'];
  const name = choreo[sceneIndex] || choreo[0];
  return this.play(name);
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

  if (this.data.locked) {
    U.uBreath.value = 0;
    U.uMouth.value = 0;
    U.uHead.value.set(0, 0, 0);
    U.uBody.value.set(0, 0, 0);
    U.uArmR.value.set(0, 0);
    U.uArmL.value.set(0, 0);
    U.uFlash.value = Math.max(0, U.uFlash.value * 0.85);
    return;
  }

  o.head.set(0, 0, 0); o.body.set(0, 0, 0); o.armR.set(0, 0); o.armL.set(0, 0);
  o.legR.set(0, 0); o.legL.set(0, 0);
  o.mouth = 0;
  o.posY = 0; o.fwd = 0; o.spin = 0; o.sx = 1; o.sy = 1; o.flash = 0;

  // Respiración y balanceo natural
  U.uBreath.value = (0.016 * Math.sin(T * 1.7) + 0.004) * k;
  o.body.z += 0.022 * Math.sin(T * 0.63) * k;
  o.body.y += 0.035 * Math.sin(T * 0.41) * k;
  o.body.x += 0.012 * Math.sin(T * 0.9 + 1.0) * k;
  o.head.z += 0.025 * Math.sin(T * 0.5 + 0.3) * k;
  o.posY += 0.004 * Math.sin(T * 1.7) * k;

  // Reproducción continua del movimiento grabado de la escena actual (cuando no está caminando hacia un punto lejano)
  if (this.data.sceneLoop && !this.data.walking) {
    const rec = SCENE_RECORDINGS[clamp(this.data.sceneIndex || 0, 0, SCENE_RECORDINGS.length - 1)];
    if (rec) {
      const pLoop = ((T - this.sceneStartTime) % rec.dur) / rec.dur;
      rec.fn(Math.max(0, pLoop), T, o);
    }
  }

  // Animación de Caminata procedural (estilo Pokémon GO: pasos, cadencia y balanceo)
  if (this.data.walking) {
    const walkFreq = 4.6;
    const step = Math.sin(T * walkFreq);
    const stepCos = Math.cos(T * walkFreq);

    // Balanceo alternado de brazos
    o.armR.y += 0.48 * step;
    o.armR.y += 0.50 * step;
    o.armR.x += 0.16 * Math.max(0, stepCos);
    o.armL.y -= 0.48 * step;
    o.armL.y -= 0.50 * step;
    o.armL.x += 0.16 * Math.max(0, -stepCos);

    // Movimiento de piernas con zancada real y flexión de rodillas
    o.legR.x += 0.44 * step;
    o.legR.y += Math.max(0, -step) * 0.42;
    o.legL.x -= 0.44 * step;
    o.legL.y += Math.max(0, step) * 0.42;
    // Movimiento de piernas con zancada amplia y flexión de rodillas
    o.legR.x += 0.52 * step;
    o.legR.y += Math.max(0, -step) * 0.50;
    o.legL.x -= 0.52 * step;
    o.legL.y += Math.max(0, step) * 0.50;

    // Giro y balanceo de torso para equilibrio
    o.body.y += 0.08 * step;
    o.body.z += 0.045 * stepCos;
    o.body.y += 0.09 * step;
    o.body.z += 0.048 * stepCos;
    o.body.x += 0.07; // leve inclinación al avanzar

    // Rebote vertical al pisar
    o.posY += 0.024 * Math.abs(step);
    o.posY += 0.026 * Math.abs(step);
  } else {
    // En reposo: microbalanceo y cambio sutil de peso entre piernas
    // Microbalanceo adicional entre piernas
    o.legR.x += 0.02 * Math.sin(T * 0.7);
    o.legL.x -= 0.02 * Math.sin(T * 0.7);
  }

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
  // Al caminar mira hacia donde avanza: sin giro de cuerpo y solo un vistazo leve al usuario
  if (this.data.walking) {
    lookYaw *= 0.3;
    lookPitch *= 0.3;
  }
  const followTarget = this.data.walking ? 0 : clamp(lookYaw * this.data.bodyFollow, -1.0, 1.0);

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
  // Habla: movimiento realista de boca, mandíbula y bigote + asentimientos y gestos de énfasis
  if (this.data.talking) {
    const e = speechEnvelope(T);
    o.head.y += 0.05 * e;
    const syllabic = 0.35 + 0.65 * Math.abs(Math.sin(T * 13.5)) * (0.6 + 0.4 * Math.cos(T * 5.3));
    o.mouth = Math.max(o.mouth, clamp(e * 1.15 * syllabic + 0.12 * Math.abs(Math.sin(T * 9.2)), 0, 1));
    o.head.y += 0.055 * e;
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

  // Gestos espontáneos en reposo (piensa, asiente, señala, saluda, hace reverencia)
  if (this.data.autoGestures && !this.data.talking && !this.data.walking && this.gestures.length === 0 && T > this.nextAuto) {
    const idle = ['think', 'nod', 'indicate', 'wave', 'bow', 'think', 'nod'];
    this.play(idle[Math.floor(Math.random() * idle.length)]);
    this.nextAuto = T + 7 + Math.random() * 6;
  } else if (this.data.talking || this.data.walking) {
    this.nextAuto = Math.max(this.nextAuto, T + 4);
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
  const sL = 1 - Math.exp(-dt * 10);
  const sM = 1 - Math.exp(-dt * 18);
  this.cur.head.lerp(o.head, sH);
  this.cur.body.lerp(o.body, sB);
  this.cur.armR.lerp(o.armR, sA);
  this.cur.armL.lerp(o.armL, sA);
  this.cur.legR.lerp(o.legR, sL);
  this.cur.legL.lerp(o.legL, sL);
  this.cur.mouth += (o.mouth - this.cur.mouth) * sM;
  this.cur.follow += (followTarget - this.cur.follow) * (1 - Math.exp(-dt * 2.5));
  U.uHead.value.copy(this.cur.head);
  U.uBody.value.copy(this.cur.body);
  U.uArmR.value.copy(this.cur.armR);
  U.uArmL.value.copy(this.cur.armL);
  U.uLegR.value.copy(this.cur.legR);
  U.uLegL.value.copy(this.cur.legL);
  U.uMouth.value = clamp(this.cur.mouth, 0, 1);
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

/**
 * Componente tamayo-walker:
 * Controla el desplazamiento autónomo y por toque de Franz Tamayo por el espacio real.
 * Permite que camine naturalmente por el lugar con orientación y pausas inteligentes.
 */
AFRAME.registerComponent('tamayo-walker', {
  schema: {
    speed: { default: 0.68 },
    roamRadius: { default: 1.6 },
    autoRoam: { default: true }
  },

  init() {
    this.targetPos = new THREE.Vector3();
    this.originPos = new THREE.Vector3();
    this.isMoving = false;
    this.isRoaming = this.data.autoRoam;
    this.nextRoamTime = 3.0;
    this.hasOrigin = false;
    this.onCompleteCallback = null;

    this.onModel = () => {
      const o = this.el.object3D;
      this.originPos.copy(o.position);
      this.targetPos.copy(o.position);
      this.hasOrigin = true;
    };

    this.el.addEventListener('model-loaded', this.onModel);
    setTimeout(() => { if (!this.hasOrigin) this.onModel(); }, 500);
  },

  getAnimator() {
    const fig = this.el.querySelector('[tamayo-animator]') || this.el;
    return (fig && fig.components) ? fig.components['tamayo-animator'] : null;
  },

  walkTo(x, z, onComplete) {
    if (!this.hasOrigin) {
      this.originPos.copy(this.el.object3D.position);
      this.hasOrigin = true;
    }
    this.targetPos.set(x, this.originPos.y, z);
    this.isMoving = true;
    this.onCompleteCallback = onComplete || null;

    const animator = this.getAnimator();
    if (animator) animator.setWalking(true);
  },

  setRoaming(enable) {
    this.isRoaming = !!enable;
    if (!this.isRoaming && !this.isMoving) {
      const animator = this.getAnimator();
      if (animator) animator.setWalking(false);
    } else if (this.isRoaming && !this.isMoving) {
      this.pickNextWaypoint();
    }
  },

  toggleRoaming() {
    this.setRoaming(!this.isRoaming);
    return this.isRoaming;
  },

  pickNextWaypoint() {
    if (!this.hasOrigin) {
      this.originPos.copy(this.el.object3D.position);
      this.hasOrigin = true;
    }
    // Escoge un punto al azar en abanico frontal para mantenerse visible ante la cámara
    const angle = (Math.random() - 0.5) * Math.PI * 1.5;
    const dist = 0.5 + Math.random() * this.data.roamRadius;
    const tx = this.originPos.x + Math.sin(angle) * dist;
    const tz = this.originPos.z + Math.cos(angle) * dist * 0.7;

    this.walkTo(tx, tz, () => {
      // Al llegar a la meta, espera 2.5 a 4.5 segundos antes del siguiente paseo
      const sceneTime = (this.el.sceneEl ? this.el.sceneEl.time : performance.now()) / 1000;
      this.nextRoamTime = sceneTime + 2.5 + Math.random() * 2.5;
    });
  },

  tick(time, dtMs) {
    const dt = Math.min(dtMs || 16, 50) / 1000;
    const T = time / 1000;
    const obj = this.el.object3D;

    if (!this.hasOrigin) {
      this.originPos.copy(obj.position);
      this.hasOrigin = true;
    }

    const animator = this.getAnimator();
    if (animator && animator.data.locked) {
      this.isMoving = false;
      animator.setWalking(false);
      return;
    }

    if (this.isMoving) {
      const dx = this.targetPos.x - obj.position.x;
      const dz = this.targetPos.z - obj.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.05) {
        // Orientar rotación hacia la dirección de avance
        const desiredYaw = Math.atan2(dx, dz);
        const diffYaw = wrapAngle(desiredYaw - obj.rotation.y);
        obj.rotation.y += diffYaw * Math.min(1, dt * 5.5);

        // Avanzar la posición en el plano XZ
        const step = Math.min(dist, this.data.speed * dt);
        obj.position.x += (dx / dist) * step;
        obj.position.z += (dz / dist) * step;

        if (animator) animator.setWalking(true);
      } else {
        // Ha llegado a la posición deseada
        obj.position.x = this.targetPos.x;
        obj.position.z = this.targetPos.z;
        this.isMoving = false;
        if (animator) animator.setWalking(false);

        if (this.onCompleteCallback) {
          const cb = this.onCompleteCallback;
          this.onCompleteCallback = null;
          cb();
        }
      }
    } else if (this.isRoaming && T > this.nextRoamTime) {
      this.pickNextWaypoint();
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

  /** Cambia suavemente el color temático y del cielo. */
  setTheme(color, sky) {
    if (color) this.targetTheme.set(color);
    if (sky) this.targetSky.set(sky);
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

  /** Giro acelerado del dial durante un salto temporal ('forward' | 'backward'). */
  spin(direction, ms) {
    this.spinAnim = { start: performance.now(), dur: Math.max(200, ms || 1600), dir: direction === 'backward' || direction < 0 ? -1 : 1 };
  },

  remove() {
    this.el.sceneEl.removeEventListener('time-theme', this.onTheme);
    this.el.removeObject3D('dial');
    disposeObject(this.group);
  },

  tick(t, dtMs) {
    const dt = Math.min(dtMs || 16, 50) / 1000;
    const scene = this.el.sceneEl;
    let warp = scene.timeWarpIntensity || 0;
    let dir = scene.timeWarpDirection || 1;
    if (this.spinAnim) {
      const sp0 = (performance.now() - this.spinAnim.start) / this.spinAnim.dur;
      if (sp0 >= 1) this.spinAnim = null;
      else {
        warp = Math.max(warp, Math.sin(Math.PI * sp0));
        dir = this.spinAnim.dir;
      }
    }
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

/* ═══════════════════════════════════════════════════════════════════════
   npc-person · Personaje secundario (estudiante) procedural y animado
   Modos: 'circle' (pasea en círculo), 'roam' (deambula y se detiene),
          'idle' (de pie conversando con gestos).
   ═══════════════════════════════════════════════════════════════════════ */
AFRAME.registerComponent('npc-person', {
  schema: {
    mode: { default: 'circle', oneOf: ['circle', 'roam', 'idle'] },
    center: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    radius: { default: 4 },
    speed: { default: 0.55 },
    clockwise: { default: true },
    phase: { default: 0 },
    facing: { default: 0 },
    scale: { default: 1 },
    skin: { type: 'color', default: '#c99a74' },
    hair: { type: 'color', default: '#1d1410' },
    shirt: { type: 'color', default: '#2563eb' },
    pants: { type: 'color', default: '#1f2937' },
    prop: { default: 'none', oneOf: ['none', 'book', 'backpack'] }
  },

  init() {
    const d = this.data;
    const mat = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.82, metalness: 0.02 }, extra || {}));
    const skin = mat(d.skin);
    const shirt = mat(d.shirt);
    const pants = mat(d.pants);
    const shoe = mat('#141414');
    const hair = mat(d.hair);

    const root = new THREE.Group();
    const body = new THREE.Group(); // sube y baja al caminar
    root.add(body);

    // Piernas (pivote en la cadera)
    const legGeo = new THREE.CylinderGeometry(0.058, 0.05, 0.84, 8);
    legGeo.translate(0, -0.42, 0);
    const shoeGeo = new THREE.BoxGeometry(0.1, 0.07, 0.2);
    shoeGeo.translate(0, -0.86, 0.04);
    const makeLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.9, 0);
      pivot.add(new THREE.Mesh(legGeo, pants));
      pivot.add(new THREE.Mesh(shoeGeo, shoe));
      body.add(pivot);
      return pivot;
    };
    this.legL = makeLeg(0.095);
    this.legR = makeLeg(-0.095);

    // Torso, cuello y cabeza
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.21), shirt);
    torso.position.y = 1.18;
    body.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 8), skin);
    neck.position.y = 1.5;
    body.add(neck);
    this.head = new THREE.Group();
    this.head.position.y = 1.54;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin);
    headMesh.position.y = 0.11;
    headMesh.scale.set(0.92, 1.05, 1);
    this.head.add(headMesh);
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    hairMesh.position.set(0, 0.13, -0.01);
    this.head.add(hairMesh);
    body.add(this.head);

    // Brazos (pivote en el hombro)
    const armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.6, 8);
    armGeo.translate(0, -0.3, 0);
    const handGeo = new THREE.SphereGeometry(0.048, 8, 6);
    handGeo.translate(0, -0.63, 0);
    const makeArm = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.43, 0);
      pivot.add(new THREE.Mesh(armGeo, shirt));
      pivot.add(new THREE.Mesh(handGeo, skin));
      body.add(pivot);
      return pivot;
    };
    this.armL = makeArm(0.235);
    this.armR = makeArm(-0.235);

    if (d.prop === 'book') {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.04), mat('#7a2e1a'));
      book.position.set(0, -0.6, 0.06);
      this.armR.add(book);
    } else if (d.prop === 'backpack') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), mat('#334155'));
      pack.position.set(0, 1.2, -0.17);
      body.add(pack);
    }

    // Sombra suave en el suelo
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    root.add(shadow);

    root.scale.setScalar(d.scale);
    this.root = root;
    this.body = body;
    this.el.setObject3D('npc', root);

    this.angle = d.phase;
    this.walkPhase = Math.random() * 10;
    this.pos = new THREE.Vector3(d.center.x, d.center.y, d.center.z);
    this.target = new THREE.Vector3();
    this.yaw = d.facing;
    this.pauseUntil = 0;
    this.gesture = null;
    this.nextGesture = 1 + Math.random() * 3;
    this.t = Math.random() * 5;
    if (d.mode === 'circle') {
      this.pos.set(d.center.x + Math.cos(this.angle) * d.radius, d.center.y, d.center.z + Math.sin(this.angle) * d.radius);
    }
    this.pickTarget();
    this.applyTransform();
  },

  remove() {
    this.el.removeObject3D('npc');
    disposeObject(this.root);
  },

  pickTarget() {
    const d = this.data;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * d.radius;
    this.target.set(d.center.x + Math.cos(a) * r, d.center.y, d.center.z + Math.sin(a) * r);
  },

  applyTransform() {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  },

  pose(walkAmt, dt) {
    // Ciclo de caminata: piernas y brazos opuestos, rebote y balanceo
    this.walkPhase += dt * (5.2 + this.data.speed * 2.5) * walkAmt;
    const s = Math.sin(this.walkPhase);
    const lerp = 1 - Math.exp(-dt * 10);
    const legA = 0.55 * s * walkAmt;
    this.legL.rotation.x += (legA - this.legL.rotation.x) * lerp;
    this.legR.rotation.x += (-legA - this.legR.rotation.x) * lerp;
    let armLx = -0.45 * s * walkAmt;
    let armRx = 0.45 * s * walkAmt;
    let armRz = 0;
    let armLz = 0.06;
    let headX = 0;
    let headY = 0;
    armRz = -0.06;

    // Respiración en reposo
    const breathe = Math.sin(this.t * 1.6) * 0.012 * (1 - walkAmt);
    this.body.position.y = Math.abs(s) * 0.035 * walkAmt + breathe;
    this.body.rotation.z = 0.035 * Math.cos(this.walkPhase) * walkAmt;

    // Gestos de conversación cuando está quieto
    if (this.gesture) {
      const p = (this.t - this.gesture.start) / this.gesture.dur;
      if (p >= 1) this.gesture = null;
      else {
        const e = Math.sin(Math.PI * p);
        if (this.gesture.type === 'wave') {
          armRz = -2.5 * e;
          armRx = -0.2 * e + Math.sin(this.t * 12) * 0.25 * e;
        } else if (this.gesture.type === 'talk') {
          armRx = -0.7 * e + Math.sin(this.t * 6) * 0.18 * e;
          armLx = -0.45 * e + Math.sin(this.t * 5 + 1) * 0.15 * e;
          headX = Math.sin(this.t * 7) * 0.07 * e;
        } else if (this.gesture.type === 'point') {
          armLx = -1.45 * e;
          headY = 0.25 * e;
        } else if (this.gesture.type === 'lift') {
          armLx = -1.05 * e;
          armRx = -1.05 * e;
          headX = 0.12 * e;
        } else if (this.gesture.type === 'carry') {
          armLx = -0.68 * e;
          armRx = -0.68 * e;
          headX = 0.06 * e;
        } else if (this.gesture.type === 'nod') {
          headX = Math.abs(Math.sin(p * Math.PI * 4)) * 0.22 * e;
        } else if (this.gesture.type === 'read') {
          armRx = -1.1 * e;
          armLx = -0.9 * e;
          headX = 0.35 * e;
        }
      }
    }

    this.armL.rotation.x += (armLx - this.armL.rotation.x) * lerp;
    this.armR.rotation.x += (armRx - this.armR.rotation.x) * lerp;
    this.armL.rotation.z += (armLz - this.armL.rotation.z) * lerp;
    this.armR.rotation.z += (armRz - this.armR.rotation.z) * lerp;
    this.head.rotation.x += (headX - this.head.rotation.x) * lerp;
    this.head.rotation.y += (headY + Math.sin(this.t * 0.4) * 0.15 * (1 - walkAmt) - this.head.rotation.y) * lerp;
  },

  maybeGesture() {
    if (this.gesture || this.t < this.nextGesture) return;
    const opts = this.data.prop === 'book' ? ['read', 'talk', 'nod', 'point'] : ['talk', 'wave', 'nod', 'point', 'talk'];
    const type = opts[Math.floor(Math.random() * opts.length)];
    this.gesture = { type, start: this.t, dur: type === 'read' ? 3.5 : 2.2 };
    this.nextGesture = this.t + 3 + Math.random() * 4;
  },

  playGesture(type, duration = 2.2) {
    this.gesture = { type, start: this.t, dur: duration };
    this.nextGesture = this.t + duration;
  },

  tick(time, dtMs) {
    const dt = Math.min(dtMs || 16, 50) / 1000;
    this.t += dt;
    const d = this.data;
    let walkAmt = 0;

    if (d.mode === 'circle') {
      const dirSign = d.clockwise ? -1 : 1;
      this.angle += (d.speed / Math.max(0.5, d.radius)) * dt * dirSign;
      this.pos.set(d.center.x + Math.cos(this.angle) * d.radius, d.center.y, d.center.z + Math.sin(this.angle) * d.radius);
      // Dirección tangente al círculo
      const tx = -Math.sin(this.angle) * dirSign;
      const tz = Math.cos(this.angle) * dirSign;
      this.yaw = Math.atan2(tx, tz);
      walkAmt = 1;
    } else if (d.mode === 'roam') {
      if (this.t < this.pauseUntil) {
        this.maybeGesture();
      } else {
        const dx = this.target.x - this.pos.x;
        const dz = this.target.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.08) {
          this.pauseUntil = this.t + 2 + Math.random() * 3;
          this.pickTarget();
        } else {
          const desired = Math.atan2(dx, dz);
          this.yaw += wrapAngle(desired - this.yaw) * Math.min(1, dt * 4);
          const step = Math.min(dist, d.speed * dt);
          this.pos.x += (dx / dist) * step;
          this.pos.z += (dz / dist) * step;
          walkAmt = 1;
        }
      }
    } else {
      // idle: de pie conversando
      this.yaw = d.facing;
      this.maybeGesture();
    }

    this.walkBlend = (this.walkBlend || 0) + (walkAmt - (this.walkBlend || 0)) * (1 - Math.exp(-dt * 6));
    this.pose(this.walkBlend, dt);
    this.applyTransform();
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   vr-world · Entorno 360° vivo alrededor del usuario
   Plaza colonial con arcos, faroles parpadeantes, árboles que se mecen,
   pileta con chorros de agua, montañas andinas con el Illimani nevado,
   la ciudad de La Paz iluminada, cóndores volando, nubes, banderas
   ondeando y linternas que ascienden al cielo.
   ═══════════════════════════════════════════════════════════════════════ */
AFRAME.registerComponent('vr-world', {
  schema: {
    center: { type: 'vec3', default: { x: 0, y: 0, z: -1.2 } },
    color: { type: 'color', default: '#d5aa46' }
  },

  init() {
    const C = this.data.center;
    this.group = new THREE.Group();
    this.t = 0;
    this.theme = new THREE.Color(this.data.color);
    this.themeTarget = this.theme.clone();
    this.animated = { trees: [], lamps: [], condors: [], flags: [] };
    const std = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.05 }, extra || {}));

    /* ── Suelo y empedrado de la plaza ── */
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), std('#14161d'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.group.add(ground);

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileCanvas.height = 128;
    const tg = tileCanvas.getContext('2d');
    tg.fillStyle = '#2a2730';
    tg.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const v = 52 + Math.floor(Math.random() * 18);
        tg.fillStyle = `rgb(${v},${v - 4},${v + 6})`;
        tg.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(10, 10);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(9.5, 64), std('#ffffff', { map: tileTex }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(C.x, -0.01, C.z);
    this.group.add(plaza);

    /* ── Columnata colonial con arcos ── */
    const colMat = std('#cdb994', { roughness: 0.7 });
    const N_COL = 12;
    const R_COL = 11;
    const colGeo = new THREE.CylinderGeometry(0.22, 0.26, 3.2, 12);
    const baseGeo = new THREE.BoxGeometry(0.7, 0.3, 0.7);
    const capGeo = new THREE.BoxGeometry(0.62, 0.2, 0.62);
    const chord = 2 * R_COL * Math.sin(Math.PI / N_COL);
    const archGeo = new THREE.TorusGeometry(chord / 2, 0.14, 8, 20, Math.PI);
    for (let i = 0; i < N_COL; i++) {
      const a = (i / N_COL) * Math.PI * 2;
      const x = C.x + Math.cos(a) * R_COL;
      const z = C.z + Math.sin(a) * R_COL;
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(x, 1.75, z);
      const base = new THREE.Mesh(baseGeo, colMat);
      base.position.set(x, 0.15, z);
      const cap = new THREE.Mesh(capGeo, colMat);
      cap.position.set(x, 3.45, z);
      this.group.add(col, base, cap);
      const am = a + Math.PI / N_COL;
      const arch = new THREE.Mesh(archGeo, colMat);
      arch.position.set(C.x + Math.cos(am) * R_COL * Math.cos(Math.PI / N_COL), 3.5, C.z + Math.sin(am) * R_COL * Math.cos(Math.PI / N_COL));
      arch.rotation.y = -am + Math.PI / 2;
      this.group.add(arch);
    }

    /* ── Faroles con resplandor parpadeante ── */
    const poleMat = std('#1f1c18', { metalness: 0.6, roughness: 0.4 });
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.8, 8);
    const lanternGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const x = C.x + Math.cos(a) * 7.6;
      const z = C.z + Math.sin(a) * 7.6;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 1.4, z);
      const lantern = new THREE.Mesh(lanternGeo, new THREE.MeshBasicMaterial({ color: '#ffd89a' }));
      lantern.position.set(x, 2.95, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: '#ffcf7a', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.copy(lantern.position);
      glow.scale.set(1.4, 1.4, 1);
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 24),
        new THREE.MeshBasicMaterial({ map: softDot(), color: '#ffcf7a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 0.005, z);
      this.group.add(pole, lantern, glow, pool);
      this.animated.lamps.push({ glow, pool, seed: Math.random() * 10 });
    }

    /* ── Árboles que se mecen con el viento ── */
    const trunkMat = std('#3b2a1e');
    const leafMats = [std('#1f4d2b', { flatShading: true }), std('#2b5f35', { flatShading: true }), std('#3d6b2c', { flatShading: true })];
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 7);
    const leafGeo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const r = 14 + Math.random() * 5;
      const tree = new THREE.Group();
      tree.position.set(C.x + Math.cos(a) * r, 0, C.z + Math.sin(a) * r);
      const s = 0.9 + Math.random() * 0.7;
      tree.scale.setScalar(s);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.9;
      const crown = new THREE.Group();
      crown.position.y = 1.8;
      const l1 = new THREE.Mesh(leafGeo, leafMats[i % 3]);
      l1.position.y = 0.7;
      l1.scale.set(1.2, 1.0, 1.2);
      const l2 = new THREE.Mesh(leafGeo, leafMats[(i + 1) % 3]);
      l2.position.set(0.3, 1.5, 0.1);
      l2.scale.setScalar(0.8);
      crown.add(l1, l2);
      tree.add(trunk, crown);
      this.group.add(tree);
      this.animated.trees.push({ crown, seed: Math.random() * 10 });
    }

    /* ── Pileta con chorros de agua (detrás del usuario) ── */
    const fx = C.x;
    const fz = C.z + 8.7;
    const stone = std('#8d8273', { roughness: 0.6 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.5, 32, 1, true), stone);
    basin.position.set(fx, 0.25, fz);
    basin.material.side = THREE.DoubleSide;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 40), stone);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(fx, 0.5, fz);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 12), stone);
    pillar.position.set(fx, 0.65, fz);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.2, 0.25, 20), stone);
    bowl.position.set(fx, 1.3, fz);
    this.waterMat = new THREE.MeshBasicMaterial({ color: '#2b7fb8', transparent: true, opacity: 0.7 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.42, 32), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(fx, 0.42, fz);
    this.group.add(basin, rim, pillar, bowl, water);

    const DROPS = 140;
    this.drops = { n: DROPS, pos: new Float32Array(DROPS * 3), life: new Float32Array(DROPS), vx: new Float32Array(DROPS), vz: new Float32Array(DROPS), vy: new Float32Array(DROPS), origin: new THREE.Vector3(fx, 1.45, fz) };
    for (let i = 0; i < DROPS; i++) this.resetDrop(i, Math.random() * 1.2);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(this.drops.pos, 3));
    this.dropPoints = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.06, map: softDot(), color: '#a9dcff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.dropPoints.frustumCulled = false;
    this.group.add(this.dropPoints);

    /* ── Banderas ondeando ── */
    const makeFlag = (x, z, draw) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 8), poleMat);
      pole.position.set(x, 2.5, z);
      this.group.add(pole);
      const cv = document.createElement('canvas');
      cv.width = 192; cv.height = 128;
      draw(cv.getContext('2d'), cv.width, cv.height);
      const geo = new THREE.PlaneGeometry(1.8, 1.2, 18, 6);
      geo.translate(0.9, 0, 0);
      const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide, roughness: 0.9 }));
      flag.position.set(x + 0.04, 4.3, z);
      flag.rotation.y = Math.atan2(-x + C.x, -z + C.z) - Math.PI / 2;
      this.group.add(flag);
      this.animated.flags.push({ mesh: flag, base: geo.attributes.position.array.slice() });
    };
    makeFlag(C.x + 4.7, C.z - 8.2, (g, w, h) => {
      g.fillStyle = '#d52b1e'; g.fillRect(0, 0, w, h / 3);
      g.fillStyle = '#f9e300'; g.fillRect(0, h / 3, w, h / 3);
      g.fillStyle = '#007934'; g.fillRect(0, (2 * h) / 3, w, h / 3);
    });
    makeFlag(C.x - 4.7, C.z - 8.2, (g, w, h) => {
      g.fillStyle = '#1b1d26'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d5aa46'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#ffd166'; g.font = 'bold 30px Georgia'; g.textAlign = 'center';
      g.fillText('UNIFRANZ', w / 2, h / 2 + 4);
      g.font = '16px Georgia'; g.fillText('1990', w / 2, h / 2 + 30);
    });

    /* ── Ciudad de La Paz iluminada (horizonte) ── */
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 64; winCanvas.height = 128;
    const wg = winCanvas.getContext('2d');
    wg.fillStyle = '#0d0f16';
    wg.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 128; y += 10) {
      for (let x = 4; x < 64; x += 10) {
        if (Math.random() < 0.42) {
          wg.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#bfe3ff';
          wg.fillRect(x, y, 5, 6);
        }
      }
    }
    const winTex = new THREE.CanvasTexture(winCanvas);
    const buildingMat = new THREE.MeshBasicMaterial({ map: winTex });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
      const r = 36 + Math.random() * 10;
      const h = 3 + Math.random() * 9;
      const w = 1.6 + Math.random() * 2.2;
      const b = new THREE.Mesh(boxGeo, buildingMat);
      b.scale.set(w, h, w);
      b.position.set(C.x + Math.cos(a) * r, h / 2, C.z + Math.sin(a) * r);
      b.rotation.y = -a;
      this.group.add(b);
    }

    // Luces de la ciudad en las laderas (la "hoyada" paceña)
    const CITY = 700;
    const cp = new Float32Array(CITY * 3);
    const cc = new Float32Array(CITY * 3);
    const warm = new THREE.Color('#ffc36b');
    const cool = new THREE.Color('#cfe6ff');
    for (let i = 0; i < CITY; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 48 + Math.random() * 22;
      const y = Math.pow(Math.random(), 1.6) * (r - 44) * 0.75;
      cp[i * 3] = C.x + Math.cos(a) * r;
      cp[i * 3 + 1] = y;
      cp[i * 3 + 2] = C.z + Math.sin(a) * r;
      const col = Math.random() < 0.8 ? warm : cool;
      cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b;
    }
    const cityGeo = new THREE.BufferGeometry();
    cityGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    cityGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.cityMat = new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
    this.group.add(new THREE.Points(cityGeo, this.cityMat));

    /* ── Cordillera de los Andes con el Illimani nevado ── */
    const mPos = [];
    const mCol = [];
    const rock = new THREE.Color('#1c2130');
    const rockHi = new THREE.Color('#2d3446');
    const snow = new THREE.Color('#e6ecf5');
    const PEAKS = 34;
    const pushTri = (p1, p2, p3, c1, c2, c3) => {
      mPos.push(...p1, ...p2, ...p3);
      mCol.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c3.r, c3.g, c3.b);
    };
    for (let i = 0; i < PEAKS; i++) {
      const a0 = (i / PEAKS) * Math.PI * 2 - 0.06;
      const a1 = ((i + 1) / PEAKS) * Math.PI * 2 + 0.06;
      const am = (a0 + a1) / 2 + (Math.random() - 0.5) * 0.05;
      const R = 82 + Math.random() * 8;
      // El Illimani: un macizo enorme con tres cumbres hacia el sureste
      const isIllimani = i >= 5 && i <= 7;
      const H = isIllimani ? 34 + (i === 6 ? 6 : 0) : 12 + Math.random() * 16;
      const pl = [C.x + Math.cos(a0) * R, -2, C.z + Math.sin(a0) * R];
      const pr = [C.x + Math.cos(a1) * R, -2, C.z + Math.sin(a1) * R];
      const pt = [C.x + Math.cos(am) * (R - 2), H, C.z + Math.sin(am) * (R - 2)];
      pushTri(pl, pt, pr, rock, rockHi, rock);
      if (H > 20) {
        // Casquete de nieve
        const k = 0.32;
        const sl = [pl[0] + (pt[0] - pl[0]) * (1 - k), pl[1] + (pt[1] - pl[1]) * (1 - k), pl[2] + (pt[2] - pl[2]) * (1 - k)];
        const sr = [pr[0] + (pt[0] - pr[0]) * (1 - k), pr[1] + (pt[1] - pr[1]) * (1 - k), pr[2] + (pt[2] - pr[2]) * (1 - k)];
        const inward = (p) => [C.x + (p[0] - C.x) * 0.995, p[1], C.z + (p[2] - C.z) * 0.995];
        pushTri(inward(sl), inward(pt), inward(sr), snow, snow, snow);
      }
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
    mGeo.setAttribute('color', new THREE.Float32BufferAttribute(mCol, 3));
    const mountains = new THREE.Mesh(mGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
    this.group.add(mountains);

    /* ── Cóndores sobrevolando ── */
    const condorMat = new THREE.MeshBasicMaterial({ color: '#0b0b0e', side: THREE.DoubleSide, fog: false });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.35, 1.6, 0.05, -0.15], 3));
    for (let i = 0; i < 4; i++) {
      const bird = new THREE.Group();
      const bodyM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 6), condorMat);
      bodyM.rotation.x = Math.PI / 2;
      const wl = new THREE.Mesh(wingGeo, condorMat);
      const wr = new THREE.Mesh(wingGeo, condorMat);
      wr.scale.x = -1;
      bird.add(bodyM, wl, wr);
      bird.scale.setScalar(1.3 + Math.random() * 0.6);
      this.group.add(bird);
      this.animated.condors.push({ bird, wl, wr, r: 18 + i * 5, h: 14 + Math.random() * 8, a: Math.random() * Math.PI * 2, sp: 0.06 + Math.random() * 0.05, dir: i % 2 ? 1 : -1, flap: Math.random() * 6 });
    }

    /* ── Nubes ── */
    this.clouds = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: '#9aa3b8', transparent: true, opacity: 0.16 + Math.random() * 0.1, depthWrite: false, fog: false }));
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 30;
      cloud.position.set(Math.cos(a) * r, 26 + Math.random() * 14, Math.sin(a) * r);
      const s = 18 + Math.random() * 18;
      cloud.scale.set(s, s * 0.4, 1);
      this.clouds.add(cloud);
    }
    this.group.add(this.clouds);

    /* ── Linternas que ascienden al cielo ── */
    const LAN = 40;
    this.lanterns = { n: LAN, pos: new Float32Array(LAN * 3), sp: new Float32Array(LAN), ph: new Float32Array(LAN) };
    for (let i = 0; i < LAN; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 20;
      this.lanterns.pos[i * 3] = C.x + Math.cos(a) * r;
      this.lanterns.pos[i * 3 + 1] = 2 + Math.random() * 30;
      this.lanterns.pos[i * 3 + 2] = C.z + Math.sin(a) * r;
      this.lanterns.sp[i] = 0.25 + Math.random() * 0.4;
      this.lanterns.ph[i] = Math.random() * 6;
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.lanterns.pos, 3));
    this.lanternMat = new THREE.PointsMaterial({ size: 0.45, map: softDot(), color: '#ffb35c', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.lanternPoints = new THREE.Points(lg, this.lanternMat);
    this.lanternPoints.frustumCulled = false;
    this.group.add(this.lanternPoints);

    /* ── Bancas coloniales de madera y hierro forjado y Estelas Literarias en la plaza ── */
    const benchWood = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.78, metalness: 0.08 });
    const benchIron = new THREE.MeshStandardMaterial({ color: '#1b2028', roughness: 0.45, metalness: 0.75 });
    const benchAngles = [-2.35, -1.05, 1.05, 2.35];
    benchAngles.forEach((ba) => {
      const bGroup = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.44), benchWood);
      seat.position.set(0, 0.46, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.05), benchWood);
      back.position.set(0, 0.72, -0.20);
      back.rotation.x = -0.12;
      bGroup.add(seat, back);
      [-0.62, 0.62].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.42), benchIron);
        leg.position.set(lx, 0.23, 0);
        const arm = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 16, Math.PI), benchIron);
        arm.position.set(lx, 0.48, 0.02);
        arm.rotation.y = Math.PI / 2;
        bGroup.add(leg, arm);
      });
      const br = 8.4;
      bGroup.position.set(C.x + Math.sin(ba) * br, 0, C.z + Math.cos(ba) * br);
      bGroup.rotation.y = ba + Math.PI;
      this.group.add(bGroup);
    });

    this.el.setObject3D('world', this.group);
    this.onTheme = (e) => { if (e.detail && e.detail.color) this.themeTarget.set(e.detail.color); };
    this.el.sceneEl.addEventListener('time-theme', this.onTheme);
  },

  setTheme(color) {
    if (color) this.themeTarget.set(color);
  },

  resetDrop(i, age) {
    const D = this.drops;
    const a = Math.random() * Math.PI * 2;
    const s = 0.35 + Math.random() * 0.35;
    D.vx[i] = Math.cos(a) * s;
    D.vz[i] = Math.sin(a) * s;
    D.vy[i] = 1.6 + Math.random() * 0.6;
    D.life[i] = age || 0;
  },

  remove() {
    this.el.sceneEl.removeEventListener('time-theme', this.onTheme);
    this.el.removeObject3D('world');
    disposeObject(this.group);
  },

  tick(time, dtMs) {
    const dt = Math.min(dtMs || 16, 50) / 1000;
    this.t += dt;
    const T = this.t;
    const C = this.data.center;
    this.theme.lerp(this.themeTarget, 1 - Math.exp(-dt * 2));

    // Árboles meciéndose
    for (const tr of this.animated.trees) {
      tr.crown.rotation.z = Math.sin(T * 0.9 + tr.seed) * 0.05;
      tr.crown.rotation.x = Math.cos(T * 0.7 + tr.seed) * 0.03;
    }

    // Faroles parpadeantes teñidos con el color de la época
    for (const l of this.animated.lamps) {
      const f = 0.85 + 0.1 * Math.sin(T * 3 + l.seed) + 0.05 * Math.sin(T * 13.7 + l.seed * 3);
      l.glow.material.opacity = 0.7 * f;
      l.glow.material.color.set('#ffcf7a').lerp(this.theme, 0.35);
      const s = 1.3 + 0.12 * f;
      l.glow.scale.set(s, s, 1);
      l.pool.material.opacity = 0.2 * f;
    }

    // Agua de la pileta
    const D = this.drops;
    const o = D.origin;
    for (let i = 0; i < D.n; i++) {
      let life = D.life[i] + dt;
      const y = o.y + D.vy[i] * life - 4.9 * life * life * 0.5;
      if (y < 0.42 && life > 0.2) { this.resetDrop(i, 0); life = 0; }
      D.life[i] = life;
      D.pos[i * 3] = o.x + D.vx[i] * life;
      D.pos[i * 3 + 1] = Math.max(0.42, o.y + D.vy[i] * life - 4.9 * life * life * 0.5);
      D.pos[i * 3 + 2] = o.z + D.vz[i] * life;
    }
    this.dropPoints.geometry.attributes.position.needsUpdate = true;
    this.waterMat.opacity = 0.62 + 0.08 * Math.sin(T * 2.2);

    // Banderas ondeando
    for (const fl of this.animated.flags) {
      const arr = fl.mesh.geometry.attributes.position.array;
      const base = fl.base;
      for (let i = 0; i < arr.length; i += 3) {
        const x = base[i];
        const k = x / 1.8;
        arr[i + 2] = Math.sin(x * 3.2 - T * 4.2) * 0.14 * k + Math.sin(base[i + 1] * 2 + T * 2.3) * 0.04 * k;
        arr[i + 1] = base[i + 1] - k * k * 0.08;
      }
      fl.mesh.geometry.attributes.position.needsUpdate = true;
      fl.mesh.geometry.computeVertexNormals();
    }

    // Cóndores planeando en círculos y aleteando
    for (const c of this.animated.condors) {
      c.a += c.sp * dt * c.dir;
      const x = C.x + Math.cos(c.a) * c.r;
      const z = C.z + Math.sin(c.a) * c.r;
      const y = c.h + Math.sin(T * 0.3 + c.flap) * 1.5;
      c.bird.position.set(x, y, z);
      const tx = -Math.sin(c.a) * c.dir;
      const tz = Math.cos(c.a) * c.dir;
      c.bird.rotation.set(0, Math.atan2(tx, tz), -0.25 * c.dir);
      // Planea la mayor parte del tiempo y aletea de vez en cuando
      const flapGate = Math.max(0, Math.sin(T * 0.5 + c.flap));
      const ang = 0.12 + Math.sin(T * 6 + c.flap) * 0.55 * flapGate;
      c.wl.rotation.z = ang;
      c.wr.rotation.z = -ang;
    }

    // Nubes a la deriva
    this.clouds.rotation.y += dt * 0.006;

    // Linternas ascendiendo con vaivén
    const L = this.lanterns;
    for (let i = 0; i < L.n; i++) {
      let y = L.pos[i * 3 + 1] + L.sp[i] * dt;
      if (y > 34) y = 1.5;
      L.pos[i * 3 + 1] = y;
      L.pos[i * 3] += Math.sin(T * 0.6 + L.ph[i]) * 0.004;
    }
    this.lanternPoints.geometry.attributes.position.needsUpdate = true;
    this.lanternMat.color.set('#ffb35c').lerp(this.theme, 0.3);
    this.cityMat.opacity = 0.82 + 0.1 * Math.sin(T * 1.3);
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

/* ──────────────────────────────────────────────────────────────────────────
 * Generador de Fotografías Históricas de Archivo («UNIFRANZ: Antes y Ahora»)
 * Produce placas fotográficas estilo archivo histórico / sepia y comparativas
 * de cómo era antes la universidad (Casona Fundacional 1993, primeras aulas,
 * La Paz de 1879/1910 y los 4 campus modernos).
 * ────────────────────────────────────────────────────────────────────────── */
const photoTextureCache = {};
function createHistoricalPhotoTexture(sceneIdx) {
  if (photoTextureCache[sceneIdx]) return photoTextureCache[sceneIdx];
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 460;
  const g = c.getContext('2d');

  // Fondo pergamino / papel fotográfico de época
  const bg = g.createLinearGradient(0, 0, 0, 460);
  if (sceneIdx <= 2) {
    bg.addColorStop(0, '#f3e5c8');
    bg.addColorStop(1, '#d8be92');
  } else {
    bg.addColorStop(0, '#182438');
    bg.addColorStop(1, '#0d1522');
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, 640, 460);

  // Marco interior doble estilo placa de museo
  g.strokeStyle = sceneIdx <= 2 ? '#5a3d1e' : '#ffd166';
  g.lineWidth = 8;
  g.strokeRect(12, 12, 616, 436);
  g.strokeStyle = sceneIdx <= 2 ? '#8c6239' : 'rgba(255,209,102,0.45)';
  g.lineWidth = 2;
  g.strokeRect(22, 22, 596, 416);

  // Área de la fotografía (x: 34..606, y: 58..338)
  g.save();
  g.beginPath();
  g.rect(34, 58, 572, 280);
  g.clip();

  if (sceneIdx === 0) {
    // FOTO HISTÓRICA 1: La Paz y Hacienda del Lago Titicaca (1879 - 1900)
    const sky = g.createLinearGradient(0, 58, 0, 230);
    sky.addColorStop(0, '#c2a378');
    sky.addColorStop(1, '#ecd9b5');
    g.fillStyle = sky;
    g.fillRect(34, 58, 572, 280);

    // Nevado Illimani al fondo en tono sepia
    g.fillStyle = '#8b6b47';
    g.beginPath();
    g.moveTo(34, 240);
    g.lineTo(150, 120);
    g.lineTo(225, 155);
    g.lineTo(310, 92);
    g.lineTo(395, 148);
    g.lineTo(480, 118);
    g.lineTo(606, 240);
    g.closePath();
    g.fill();

    // Cumbres nevadas del Illimani
    g.fillStyle = '#f8efe0';
    g.beginPath();
    g.moveTo(265, 128);
    g.lineTo(310, 92);
    g.lineTo(355, 128);
    g.lineTo(330, 138);
    g.lineTo(290, 135);
    g.closePath();
    g.fill();

    // Casona solariega paceña de 1879
    g.fillStyle = '#dfd0b8';
    g.fillRect(70, 195, 250, 115);
    g.fillStyle = '#5c3b1e';
    g.beginPath();
    g.moveTo(58, 198);
    g.lineTo(195, 150);
    g.lineTo(332, 198);
    g.closePath();
    g.fill();
    // Balcones y arcos coloniales
    g.fillStyle = '#432a14';
    for (let i = 0; i < 4; i++) {
      g.fillRect(92 + i * 54, 212, 28, 36);
      g.beginPath();
      g.arc(106 + i * 54, 285, 16, Math.PI, 0);
      g.lineTo(122 + i * 54, 310);
      g.lineTo(90 + i * 54, 310);
      g.fill();
    }

    // Retrato en medallón de Franz Tamayo joven
    g.fillStyle = '#3b2512';
    g.beginPath();
    g.arc(485, 192, 74, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#d4a359';
    g.lineWidth = 4;
    g.stroke();
    // Silueta de busto clásico con sombrero y bigote
    g.fillStyle = '#ead7b7';
    g.beginPath();
    g.arc(485, 174, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#241509';
    g.fillRect(452, 152, 66, 7);
    g.fillRect(464, 134, 42, 20);
    g.fillRect(472, 182, 26, 5); // bigote
    g.beginPath();
    g.moveTo(440, 252);
    g.quadraticCurveTo(485, 202, 530, 252);
    g.fill();
  } else if (sceneIdx === 1) {
    // FOTO HISTÓRICA 2: 1910 · Imprenta de «El Diario» y Primera Escuela Normal
    const sky = g.createLinearGradient(0, 58, 0, 338);
    sky.addColorStop(0, '#d9c29c');
    sky.addColorStop(1, '#b59469');
    g.fillStyle = sky;
    g.fillRect(34, 58, 572, 280);

    // Facsímil histórico de "EL DIARIO - 1910" a la izquierda
    g.fillStyle = '#f7edd9';
    g.fillRect(56, 76, 235, 244);
    g.strokeStyle = '#4a3219';
    g.lineWidth = 2;
    g.strokeRect(56, 76, 235, 244);
    g.fillStyle = '#2d1c0b';
    g.font = 'bold 20px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('EL DIARIO · 1910', 173, 104);
    g.font = 'italic 12px Georgia, serif';
    g.fillText('55 Editoriales de Franz Tamayo', 173, 122);
    g.fillRect(72, 130, 202, 2);
    g.font = 'bold 13px Georgia, serif';
    g.fillText('CREACIÓN DE LA', 173, 152);
    g.fillText('PEDAGOGÍA NACIONAL', 173, 170);
    g.fillStyle = '#5c4024';
    for (let r = 0; r < 8; r++) {
      g.fillRect(74, 186 + r * 14, 198 - (r % 3) * 18, 5);
    }

    // Aula histórica de 1910 a la derecha
    g.fillStyle = '#4a3219';
    g.fillRect(318, 76, 266, 244);
    g.fillStyle = '#dec8a4';
    g.fillRect(326, 84, 250, 228);
    // Pizarrón antiguo de madera
    g.fillStyle = '#2b2620';
    g.fillRect(348, 102, 206, 98);
    g.strokeStyle = '#6e4720';
    g.lineWidth = 5;
    g.strokeRect(348, 102, 206, 98);
    g.fillStyle = '#f2e8d5';
    g.font = 'italic 14px Georgia, serif';
    g.fillText('«Despertar la energía', 451, 142);
    g.fillText('propia del estudiante»', 451, 164);
    // Pupitres antiguos de madera en perspectiva
    g.fillStyle = '#6e4720';
    for (let d = 0; d < 3; d++) {
      g.fillRect(346 + d * 74, 232, 58, 12);
      g.fillRect(354 + d * 74, 244, 8, 46);
      g.fillRect(390 + d * 74, 244, 8, 46);
    }
  } else if (sceneIdx === 2) {
    // FOTO HISTÓRICA 3: 1993 · Cómo era antes UNIFRANZ (Casona Fundacional y Primeras Aulas)
    const sky = g.createLinearGradient(0, 58, 0, 220);
    sky.addColorStop(0, '#cfb58c');
    sky.addColorStop(1, '#f0dfc0');
    g.fillStyle = sky;
    g.fillRect(34, 58, 572, 280);

    // Calle Héroes del Acre / Landaeta 1993 (adoquines de época)
    g.fillStyle = '#7c6549';
    g.fillRect(34, 282, 572, 56);

    // Edificio / Casona Fundacional de UNIFRANZ en 1993
    g.fillStyle = '#f3e7d0';
    g.fillRect(95, 128, 450, 156);
    // Tejado colonial de teja paceña
    g.fillStyle = '#7a3b24';
    g.beginPath();
    g.moveTo(76, 132);
    g.lineTo(135, 86);
    g.lineTo(505, 86);
    g.lineTo(564, 132);
    g.closePath();
    g.fill();

    // Frontón central histórico "UNIFRANZ 1993"
    g.fillStyle = '#5c3b1e';
    g.fillRect(215, 136, 210, 32);
    g.fillStyle = '#ffd166';
    g.font = 'bold 15px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('UNIFRANZ · FUNDADA EN 1993', 320, 157);

    // Ventanas del segundo piso (primeras aulas universitarias de 1993)
    for (let w = 0; w < 5; w++) {
      const wx = 122 + w * 86;
      g.fillStyle = '#3d2814';
      g.fillRect(wx, 176, 46, 42);
      g.fillStyle = '#d9b37c';
      g.fillRect(wx + 4, 180, 17, 15);
      g.fillRect(wx + 25, 180, 17, 15);
      g.fillRect(wx + 4, 199, 17, 15);
      g.fillRect(wx + 25, 199, 17, 15);
    }

    // Portal de ingreso principal con arco de piedra y patio colonial
    g.fillStyle = '#3b2410';
    g.beginPath();
    g.arc(320, 248, 30, Math.PI, 0);
    g.lineTo(350, 284);
    g.lineTo(290, 284);
    g.closePath();
    g.fill();

    // Sello de archivo histórico
    g.fillStyle = 'rgba(58, 34, 14, 0.86)';
    g.fillRect(46, 68, 224, 28);
    g.fillStyle = '#ffd166';
    g.font = 'bold 12px Segoe UI, sans-serif';
    g.textAlign = 'left';
    g.fillText('📷 ARCHIVO REAL: SEDE 1993', 56, 87);
  } else if (sceneIdx === 3) {
    // FOTO HISTÓRICA 4: Evolución de las 4 Sedes en Bolivia (La Paz, El Alto, Cochabamba, Santa Cruz)
    const cards = [
      { name: 'SEDE LA PAZ', sub: 'Cuna Fundacional · 1993', x: 46, y: 68, col: '#ff6b35' },
      { name: 'SEDE EL ALTO', sub: 'Ciudad Joven y Pujante', x: 326, y: 68, col: '#ffd166' },
      { name: 'SEDE COCHABAMBA', sub: 'Corazón Pedagógico', x: 46, y: 204, col: '#38bdf8' },
      { name: 'SEDE SANTA CRUZ', sub: 'Vanguardia e Innovación', x: 326, y: 204, col: '#34d399' }
    ];
    cards.forEach((cd) => {
      g.fillStyle = '#132036';
      g.fillRect(cd.x, cd.y, 268, 124);
      g.strokeStyle = cd.col;
      g.lineWidth = 2.5;
      g.strokeRect(cd.x, cd.y, 268, 124);

      // Ilustración arquitectónica de cada campus
      g.fillStyle = '#1e3252';
      g.fillRect(cd.x + 14, cd.y + 38, 92, 74);
      g.fillStyle = cd.col;
      for (let r = 0; r < 3; r++) {
        for (let c0 = 0; c0 < 3; c0++) {
          g.fillRect(cd.x + 24 + c0 * 26, cd.y + 48 + r * 20, 18, 12);
        }
      }
      g.fillStyle = '#ffffff';
      g.font = 'bold 15px Segoe UI, sans-serif';
      g.textAlign = 'left';
      g.fillText(cd.name, cd.x + 118, cd.y + 62);
      g.fillStyle = '#cbd5e1';
      g.font = '12px Segoe UI, sans-serif';
      g.fillText(cd.sub, cd.x + 118, cd.y + 84);
      g.fillStyle = cd.col;
      g.font = 'bold 11px Segoe UI, sans-serif';
      g.fillText('● CAMPUS ACTIVO', cd.x + 118, cd.y + 106);
    });
  } else {
    // FOTO HISTÓRICA 5: Comparativa «UNIFRANZ: ANTES (1993) vs. AHORA (HOY)»
    // Mitad izquierda: Casona 1993 en sepia
    g.fillStyle = '#d8be92';
    g.fillRect(34, 58, 284, 280);
    g.fillStyle = '#ede0c8';
    g.fillRect(58, 146, 232, 150);
    g.fillStyle = '#7a3b24';
    g.beginPath();
    g.moveTo(48, 150);
    g.lineTo(174, 102);
    g.lineTo(300, 150);
    g.closePath();
    g.fill();
    g.fillStyle = '#472c14';
    for (let i = 0; i < 3; i++) {
      g.fillRect(78 + i * 68, 175, 36, 44);
    }
    g.fillRect(152, 238, 44, 58);
    g.fillStyle = 'rgba(45, 26, 10, 0.88)';
    g.fillRect(48, 70, 195, 28);
    g.fillStyle = '#ffd166';
    g.font = 'bold 13px Segoe UI, sans-serif';
    g.textAlign = 'left';
    g.fillText('ANTES · CASONA 1993', 58, 89);

    // Mitad derecha: Edificio Inteligente y Laboratorios Modernos UNIFRANZ Hoy
    g.fillStyle = '#0f1c30';
    g.fillRect(322, 58, 284, 280);
    g.fillStyle = '#1e3a5f';
    g.fillRect(356, 104, 216, 196);
    // Muro cortina de cristal iluminado
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 4; col++) {
        g.fillStyle = (r + col) % 2 === 0 ? '#38bdf8' : '#0284c7';
        g.fillRect(370 + col * 48, 122 + r * 32, 38, 22);
      }
    }
    g.fillStyle = '#ff6b35';
    g.fillRect(356, 96, 216, 12);
    g.fillStyle = 'rgba(255, 107, 53, 0.92)';
    g.fillRect(338, 70, 215, 28);
    g.fillStyle = '#ffffff';
    g.font = 'bold 13px Segoe UI, sans-serif';
    g.fillText('AHORA · CAMPUS MODERNO', 348, 89);

    // Línea divisoria dorada central
    g.fillStyle = '#ffd166';
    g.fillRect(316, 58, 6, 280);
  }
  g.restore();

  // Encabezado superior de la placa
  const headers = [
    'ARCHIVO HISTÓRICO · LA PAZ 1879 – 1900',
    'ARCHIVO HISTÓRICO · «EL DIARIO» Y CÁTEDRA 1910',
    'FOTOGRAFÍA HISTÓRICA · ASÍ ERA UNIFRANZ EN 1993',
    'MEMORIA VISUAL · LAS 4 SEDES DE UNIFRANZ EN BOLIVIA',
    'COMPARATIVA HISTÓRICA · UNIFRANZ ANTES (1993) Y AHORA'
  ];
  const captions = [
    'Casona paceña e Illimani donde nació Franz Tamayo (1879)',
    'Facsímil de 1910 y primeras aulas de la Pedagogía Nacional',
    'Primera Casona Fundacional de UNIFRANZ (1993) · Primeras aulas',
    'Presencia nacional: La Paz, El Alto, Cochabamba y Santa Cruz',
    'De la casona tradicional de 1993 a los laboratorios de vanguardia'
  ];

  g.fillStyle = sceneIdx <= 2 ? '#3b230d' : '#ffd166';
  g.font = 'bold 16px Segoe UI, sans-serif';
  g.textAlign = 'center';
  g.fillText(headers[sceneIdx] || headers[0], 320, 44);

  // Pie de foto con invitación interactiva
  g.fillStyle = sceneIdx <= 2 ? '#2c1908' : '#f8fafc';
  g.font = 'bold 16px Georgia, serif';
  g.fillText(captions[sceneIdx] || captions[0], 320, 372);

  g.fillStyle = sceneIdx <= 2 ? '#7a3b1e' : '#38bdf8';
  g.font = 'bold 14px Segoe UI, sans-serif';
  g.fillText('👆 Toca esta fotografía o el pedestal para activar la Escena 0' + (sceneIdx + 1), 320, 412);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  photoTextureCache[sceneIdx] = tex;
  return tex;
}

function createStationBadgeTexture(sceneIdx, year, title, colorHex) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10, 14, 24, 0.92)';
  g.beginPath();
  g.roundRect ? g.roundRect(8, 8, 496, 176, 26) : g.rect(8, 8, 496, 176);
  g.fill();
  g.strokeStyle = colorHex || '#ffd166';
  g.lineWidth = 5;
  g.stroke();

  g.fillStyle = colorHex || '#ffd166';
  g.font = 'bold 24px Segoe UI, sans-serif';
  g.textAlign = 'center';
  g.fillText(`ESCENA 0${sceneIdx + 1} · ${year}`, 256, 56);

  g.fillStyle = '#ffffff';
  g.font = 'bold 28px Georgia, serif';
  g.fillText(title, 256, 104);

  g.fillStyle = '#94a3b8';
  g.font = 'bold 20px Segoe UI, sans-serif';
  g.fillText('👆 TOCA EL OBJETO PARA IR A ESTA ESCENA', 256, 152);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Componente scene-diorama:
 * Construye 5 Estaciones 3D Interactivas y Realistas + 5 Marcos de Fotografías
 * Históricas de la Universidad («Antes y Ahora») bien espaciadas en arco
 * alrededor de Franz Tamayo (tanto en modo VR como en modo AR).
 * Al tocar o hacer clic sobre cualquier estación o foto histórica, cambia directamente
 * a la escena correspondiente (0..4).
 */
AFRAME.registerComponent('scene-diorama', {
  schema: {
    mode: { default: 'vr' }, // 'vr' o 'ar'
    activeScene: { default: 0 }
  },

  init() {
    this.t = 0;
    this.group = new THREE.Group();
    this.stations = [];
    this.buildStations();
    this.el.setObject3D('diorama', this.group);

    this.onSceneEvent = (e) => {
      if (e.detail && typeof e.detail.index === 'number') {
        this.setActiveScene(e.detail.index);
      }
    };
    window.addEventListener('historia:scene-changed', this.onSceneEvent);
  },

  remove() {
    window.removeEventListener('historia:scene-changed', this.onSceneEvent);
    this.el.removeObject3D('diorama');
    disposeObject(this.group);
  },

  setActiveScene(idx) {
    this.data.activeScene = clamp(Number(idx) || 0, 0, 4);
    this.stations.forEach((st, i) => {
      const isActive = i === this.data.activeScene;
      st.ringMat.opacity = isActive ? 0.95 : 0.38;
      st.pedestalTrimMat.emissiveIntensity = isActive ? 0.9 : 0.25;
      st.photoFrameMat.emissiveIntensity = isActive ? 0.7 : 0.18;
    });
  },

  buildStations() {
    const isAR = this.data.mode === 'ar';
    // En VR radio amplio (3.95m) y en AR radio cómodo (2.25m) para que estén bien espaciados
    const radius = isAR ? 2.25 : 3.95;
    const centerZ = isAR ? -0.35 : -2.6;
    const scale = isAR ? 0.76 : 1.0;
    // Ángulos espaciados uniformemente en semicírculo abierto (-108° a +108°)
    const angles = [-1.88, -0.98, 0.0, 0.98, 1.88];
    // Para la estación central (índice 2), la desplazamos a un costado frontal derecho/izquierdo
    // para nunca tapar a Franz Tamayo que está en (0, 0, -2.6)
    const customPositions = isAR
      ? [
        { x: -2.15, z: -0.95 },
        { x: -1.35, z: -2.25 },
        { x: 1.35, z: -2.25 },
        { x: 2.15, z: -0.95 },
        { x: 0.0, z: -2.65 }
      ]
      : [
        { x: -3.75, z: -1.35 },
        { x: -2.55, z: -3.95 },
        { x: 2.55, z: -3.95 },
        { x: 3.75, z: -1.35 },
        { x: 0.0, z: -4.65 }
      ];

    const meta = [
      { year: '1879', title: 'El Despertar Poético', color: '#ffd166' },
      { year: '1910', title: 'Pedagogía Nacional', color: '#ff8c42' },
      { year: '1993', title: 'Fundación UNIFRANZ', color: '#ff5d8f' },
      { year: '4 SEDES', title: 'Expansión en Bolivia', color: '#38bdf8' },
      { year: 'HOY', title: 'Innovación y Futuro', color: '#a855f7' }
    ];

    const stoneDark = new THREE.MeshStandardMaterial({ color: '#1e2433', roughness: 0.72, metalness: 0.22 });
    const stoneLight = new THREE.MeshStandardMaterial({ color: '#323c52', roughness: 0.62, metalness: 0.25 });
    const woodColonial = new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.68, metalness: 0.12 });
    const parchmentMat = new THREE.MeshStandardMaterial({ color: '#f4e7cb', roughness: 0.55, metalness: 0.05 });
    const goldBrass = new THREE.MeshStandardMaterial({ color: '#d4a338', roughness: 0.28, metalness: 0.85, emissive: '#5a3e08', emissiveIntensity: 0.25 });

    for (let i = 0; i < 5; i++) {
      const info = meta[i];
      const pos = customPositions[i] || { x: Math.sin(angles[i]) * radius, z: centerZ - Math.cos(angles[i]) * radius };
      const stGroup = new THREE.Group();
      stGroup.position.set(pos.x, 0, pos.z);
      // Orientar cada estación mirando hacia el centro donde está el visitante / Tamayo
      stGroup.rotation.y = Math.atan2(-pos.x, (isAR ? 0.5 : -0.8) - pos.z);
      stGroup.scale.setScalar(scale);

      const col = new THREE.Color(info.color);

      // 1. Pedestal arquitectónico escalonado de piedra y bronce
      const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.64, 0.12, 24), stoneDark);
      baseStep.position.y = 0.06;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.46, 0.68, 24), stoneLight);
      pillar.position.y = 0.46;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.44, 0.10, 24), stoneDark);
      cap.position.y = 0.85;

      const pedestalTrimMat = new THREE.MeshStandardMaterial({
        color: info.color,
        roughness: 0.25,
        metalness: 0.8,
        emissive: info.color,
        emissiveIntensity: i === this.data.activeScene ? 0.9 : 0.25
      });
      const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.022, 12, 32), pedestalTrimMat);
      trimRing.rotation.x = Math.PI / 2;
      trimRing.position.y = 0.88;

      // Halo luminoso en el suelo alrededor de la estación
      const ringMat = new THREE.MeshBasicMaterial({
        color: info.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: i === this.data.activeScene ? 0.95 : 0.38
      });
      const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.76, 36), ringMat);
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.y = 0.015;

      stGroup.add(baseStep, pillar, cap, trimRing, floorRing);

      // 2. Artefacto 3D realista específico de cada época sobre el pedestal (y ≈ 1.15)
      const artifactGroup = new THREE.Group();
      artifactGroup.position.set(0, 1.12, 0);
      stGroup.add(artifactGroup);

      if (i === 0) {
        // ESCENA 1 (1879): Libro abierto «Odas y Scherzos», Tintero de bronce, Pluma y Cóndor Andino
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.36), woodColonial);
        bookCover.rotation.x = 0.22;
        const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.33), parchmentMat);
        pageL.position.set(-0.12, 0.03, 0);
        pageL.rotation.set(0.22, 0, 0.12);
        const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.33), parchmentMat);
        pageR.position.set(0.12, 0.03, 0);
        pageR.rotation.set(0.22, 0, -0.12);
        const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.09, 16), goldBrass);
        inkwell.position.set(0.24, 0.04, -0.14);
        const quill = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.36, 8), new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 }));
        quill.position.set(0.16, 0.22, -0.05);
        quill.rotation.set(0.3, 0, -0.45);
        artifactGroup.add(bookCover, pageL, pageR, inkwell, quill);
      } else if (i === 1) {
        // ESCENA 2 (1910): Pupitre / Atril de Cátedra 1910, Pila de «El Diario» y Brújula Pedagógica
        const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.34), woodColonial);
        lectern.position.y = -0.04;
        const topSlope = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.04, 0.38), woodColonial);
        topSlope.position.set(0, 0.12, 0);
        topSlope.rotation.x = 0.28;
        const newspaper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.26), parchmentMat);
        newspaper.position.set(0, 0.16, 0.02);
        newspaper.rotation.x = 0.28;
        const compassRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 12, 32), goldBrass);
        compassRing.position.set(0, 0.38, 0);
        const compassNeedle = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), pedestalTrimMat);
        compassNeedle.scale.set(0.35, 1.1, 0.35);
        compassNeedle.position.set(0, 0.38, 0);
        artifactGroup.add(lectern, topSlope, newspaper, compassRing, compassNeedle);
      } else if (i === 2) {
        // ESCENA 3 (1993): Maqueta Arquitectónica 3D de la Casona Fundacional UNIFRANZ 1993 + Birrete
        const houseBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.30, 0.42), parchmentMat);
        houseBase.position.y = 0.02;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.22, 4), new THREE.MeshStandardMaterial({ color: '#8c3b20', roughness: 0.65 }));
        roof.position.y = 0.28;
        roof.rotation.y = Math.PI / 4;
        // Portal colonial y ventanas iluminadas de la Casona 1993
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.44), woodColonial);
        door.position.y = -0.04;
        const winMat = new THREE.MeshBasicMaterial({ color: '#ffd166' });
        [-0.18, 0.0, 0.18].forEach((wx) => {
          const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.43), winMat);
          wMesh.position.set(wx, 0.08, 0);
          artifactGroup.add(wMesh);
        });
        // Birrete académico flotando sobre la Casona 1993
        const capBoard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.32), stoneDark);
        capBoard.position.y = 0.48;
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.14, 8), goldBrass);
        tassel.position.set(0.14, 0.42, 0.14);
        artifactGroup.add(houseBase, roof, door, capBoard, tassel);
      } else if (i === 3) {
        // ESCENA 4 (EXPANSIÓN): Mapa 3D de Bolivia con las 4 Torres Luminosas (La Paz, El Alto, Cochabamba, Santa Cruz)
        const mapDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.05, 8), stoneDark);
        mapDisc.position.y = -0.08;
        artifactGroup.add(mapDisc);
        const sedes = [
          { x: -0.16, z: -0.08, h: 0.38, col: '#ff6b35' }, // La Paz
          { x: -0.22, z: 0.04, h: 0.32, col: '#ffd166' },  // El Alto
          { x: -0.02, z: 0.06, h: 0.35, col: '#38bdf8' },  // Cochabamba
          { x: 0.18, z: 0.02, h: 0.42, col: '#34d399' }    // Santa Cruz
        ];
        sedes.forEach((s) => {
          const tMat = new THREE.MeshStandardMaterial({ color: s.col, emissive: s.col, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.7 });
          const tower = new THREE.Mesh(new THREE.BoxGeometry(0.09, s.h, 0.09), tMat);
          tower.position.set(s.x, -0.05 + s.h / 2, s.z);
          const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), goldBrass);
          beacon.position.set(s.x, -0.05 + s.h + 0.06, s.z);
          artifactGroup.add(tower, beacon);
        });
      } else {
        // ESCENA 5 (HOY): Átomo de Innovación Tecnológica + Llama Eterna del Conocimiento UNIFRANZ
        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.14, 18), goldBrass);
        brazier.position.y = -0.08;
        const flameOuter = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.42, 12),
          new THREE.MeshBasicMaterial({ color: '#ff6b35', transparent: true, opacity: 0.88 })
        );
        flameOuter.position.y = 0.20;
        const flameInner = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.28, 10),
          new THREE.MeshBasicMaterial({ color: '#ffd166' })
        );
        flameInner.position.y = 0.18;
        artifactGroup.add(brazier, flameOuter, flameInner);
        for (let r = 0; r < 3; r++) {
          const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 10, 36), pedestalTrimMat);
          orbit.position.y = 0.20;
          orbit.rotation.set((r * Math.PI) / 3, (r * Math.PI) / 4, 0);
          artifactGroup.add(orbit);
        }
      }

      // 3. Atril / Marco de Fotografía Histórica Real («UNIFRANZ: Antes y Ahora») junto al pedestal
      const photoGroup = new THREE.Group();
      // Colocado a un lado y ligeramente elevado para verse con total nitidez sin tapar el artefacto 3D
      photoGroup.position.set(0, 1.92, -0.18);
      const photoFrameMat = new THREE.MeshStandardMaterial({
        color: '#3b2816',
        roughness: 0.4,
        metalness: 0.6,
        emissive: info.color,
        emissiveIntensity: i === this.data.activeScene ? 0.7 : 0.18
      });
      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.86, 0.05), photoFrameMat);
      const photoPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.10, 0.78),
        new THREE.MeshBasicMaterial({ map: createHistoricalPhotoTexture(i) })
      );
      photoPlane.position.z = 0.028;
      const photoBack = new THREE.Mesh(
        new THREE.PlaneGeometry(1.10, 0.78),
        new THREE.MeshBasicMaterial({ map: createHistoricalPhotoTexture(i) })
      );
      photoBack.position.z = -0.028;
      photoBack.rotation.y = Math.PI;
      photoGroup.add(frameOuter, photoPlane, photoBack);
      stGroup.add(photoGroup);

      // 4. Rótulo Flotante con Número de Escena e indicación interactiva
      const badgeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.96, 0.36),
        new THREE.MeshBasicMaterial({ map: createStationBadgeTexture(i, info.year, info.title, info.color), transparent: true })
      );
      badgeMesh.position.set(0, 0.52, 0.48);
      badgeMesh.rotation.x = -0.18;
      stGroup.add(badgeMesh);

      // 5. Hitbox interactivo para clic/toque en VR y AR
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 2.45, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitMesh.position.y = 1.22;
      hitMesh.userData.sceneIndex = i;
      hitMesh.userData.isSceneStation = true;
      stGroup.add(hitMesh);

      // También creamos una entidad hija A-Frame `.vr-clickable` para el raycaster del cursor VR/AR
      const clickEl = document.createElement('a-entity');
      clickEl.classList.add('vr-clickable');
      clickEl.setAttribute('geometry', 'primitive: cylinder; radius: 0.75; height: 2.45');
      clickEl.setAttribute('material', 'opacity: 0; transparent: true; depthWrite: false');
      clickEl.setAttribute('position', `${pos.x * scale} ${1.22 * scale} ${pos.z * scale}`);
      clickEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (FX.beep) FX.beep('ok');
        window.dispatchEvent(new CustomEvent('historia:select-scene', { detail: { index: i } }));
      });
      this.el.appendChild(clickEl);

      this.group.add(stGroup);
      this.stations.push({
        index: i,
        group: stGroup,
        artifactGroup,
        photoGroup,
        ringMat,
        pedestalTrimMat,
        photoFrameMat,
        hitMesh,
        color: col
      });
    }
  },

  tick(time, dtMs) {
    const dt = Math.min(dtMs || 16, 50) / 1000;
    this.t += dt;
    const T = this.t;
    for (let i = 0; i < this.stations.length; i++) {
      const st = this.stations[i];
      const isActive = i === this.data.activeScene;
      // Rotación suave y levitación del artefacto 3D sobre su pedestal
      st.artifactGroup.rotation.y = T * (isActive ? 0.85 : 0.42) + i * 1.2;
      st.artifactGroup.position.y = 1.12 + Math.sin(T * 2.1 + i) * 0.045;
      // Oscilación sutil del marco de fotografía histórica
      st.photoGroup.position.y = 1.92 + Math.sin(T * 1.5 + i * 0.8) * 0.025;
      if (isActive) {
        const pulse = 0.65 + 0.35 * Math.sin(T * 4.2);
        st.ringMat.opacity = 0.65 + 0.3 * pulse;
      }
    }
  }
});
}) ();
