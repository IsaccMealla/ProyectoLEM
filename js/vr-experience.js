/**
 * UNIFRANZ · Realidad Virtual Inmersiva: El Legado de Franz Tamayo
 * Controlador de las 5 escenas históricas en 3D y modo Gafas VR (Stereo Cardboard)
 */

window.TAMAYO_VR_SCENES = [
  {
    id: 1,
    number: "01",
    title: "El despertar de Franz Tamayo",
    year: "1879 — 1956",
    phase: "EL DESPERTAR",
    visual: "Franz Tamayo se presenta con vestimenta de época. Invita al espectador a viajar en el tiempo para descubrir una historia que une pensamiento, educación y futuro.",
    dialog: "¡Saludos! Soy Franz Tamayo, poeta, escritor y pensador boliviano. Quizás se pregunten por qué mi nombre forma parte de una universidad. Hoy quiero invitarlos a viajar en el tiempo para descubrir una historia que une el pensamiento, la educación y el futuro de Bolivia. ¿Me acompañan?",
    audio: "assets/audio/escena1.mp3",
    themeColor: "#d5aa46",
    skyColor: "#0f1118",
    fogColor: "#141722"
  },
  {
    id: 2,
    number: "02",
    title: "El pensamiento y la educación",
    year: "1910",
    phase: "LA PEDAGOGÍA",
    visual: "Aparecen libros antiguos, manuscritos y una representación artística de La Paz de principios del siglo XX.",
    dialog: "A lo largo de mi vida, reflexioné sobre la importancia de la educación para el desarrollo de nuestro país. En 1910 publiqué Creación de la pedagogía nacional, una obra en la que planteé reflexiones sobre cómo debía pensarse la educación boliviana. Décadas después, mi nombre sería elegido para representar una institución comprometida con la formación de nuevas generaciones.",
    audio: "assets/audio/escena2.mp3",
    themeColor: "#e67e22",
    skyColor: "#17120f",
    fogColor: "#211a14"
  },
  {
    id: 3,
    number: "03",
    title: "El nacimiento de UNIFRANZ",
    year: "1990 — 1993",
    phase: "LA FUNDACIÓN",
    visual: "Las páginas del libro se transforman en una línea de tiempo. Aparece el año 1990 y luego imágenes históricas de La Paz y los primeros espacios universitarios.",
    dialog: "Viajemos ahora al año 1990. El 4 de noviembre de ese año se fundó la Universidad Privada Franz Tamayo, conocida como UNIFRANZ, gracias a la iniciativa de Abel Ágreda y Celsa Nogales de Ágreda. En 1993, después de obtener las autorizaciones legales correspondientes, la universidad comenzó a hacer realidad su proyecto educativo en la ciudad de La Paz. Sus primeros espacios eran modestos, pero detrás de ellos existía una gran visión: abrir nuevas oportunidades de formación profesional.",
    audio: "assets/audio/escena3.mp3",
    themeColor: "#c0392b",
    skyColor: "#1a1012",
    fogColor: "#241417"
  },
  {
    id: 4,
    number: "04",
    title: "Una universidad en crecimiento",
    year: "EXPANSIÓN NACIONAL",
    phase: "CRECIMIENTO",
    visual: "Las primeras aulas se transforman en espacios universitarios modernos. Aparecen estudiantes, libros, computadoras y un mapa de Bolivia donde se iluminan La Paz, El Alto, Cochabamba y Santa Cruz.",
    dialog: "Con el paso de los años, UNIFRANZ fue creciendo y extendiendo su presencia a otras ciudades de Bolivia. La universidad evolucionó junto con las nuevas necesidades de la sociedad, incorporando propuestas de innovación, investigación y aprendizaje práctico. Así, lo que comenzó como un proyecto educativo en La Paz se convirtió en una institución con presencia en distintas regiones del país.",
    audio: "assets/audio/escena4.mp3",
    themeColor: "#2980b9",
    skyColor: "#0d1620",
    fogColor: "#131f2d"
  },
  {
    id: 5,
    number: "05",
    title: "El legado continúa",
    year: "EL FUTURO ES HOY",
    phase: "EL LEGADO",
    visual: "Franz Tamayo aparece en un campus actual rodeado de estudiantes de diferentes carreras. Mira directamente al espectador y el logotipo de UNIFRANZ aparece al fondo.",
    dialog: "Y hoy, jóvenes universitarios, ustedes son parte de esta historia. Cada idea que desarrollan, cada conocimiento que adquieren y cada desafío que superan contribuye a construir el futuro de nuestra sociedad. Mi nombre representa un legado intelectual, pero son ustedes quienes pueden darle un nuevo significado a través de sus acciones. La historia de UNIFRANZ continúa escribiéndose con cada generación de estudiantes. Bienvenidos a UNIFRANZ, Universidad Privada Franz Tamayo. ¡El futuro está en sus manos!",
    audio: "assets/audio/escena5.mp3",
    themeColor: "#27ae60",
    skyColor: "#0d1b14",
    fogColor: "#12251b"
  }
];

window.ABAROA_VR_SCENES = [
  {
    id: 1,
    number: "01",
    title: "Introducción y mesa táctica holográfica",
    year: "1879",
    phase: "EL LITORAL · ANTOFAGASTA · CALAMA",
    visual: "En un espacio oscuro, una mesa rústica muestra el litoral y el desierto de Atacama. A los 15 segundos se ilumina la ruta desde Antofagasta hacia Calama; luego aparece Eduardo Abaroa junto a la mesa.",
    dialog: "Narración de la introducción histórica de Eduardo Abaroa.",
    subtitles: [
      "En 1879, el conflicto llega al litoral boliviano.",
      "La defensa se organiza en Calama.",
      "Eduardo Abaroa se prepara para defender el paso del Topáter."
    ],
    audio: "assets/audio/2.1Escena.mp3",
    model: "assets/models/EduardoAbaroa.glb",
    themeColor: "#45e6d0",
    skyColor: "#070a10",
    fogColor: "#080b12",
    routeRevealAt: 15,
    characterRevealAt: 24
  },
  {
    id: 2,
    number: "02",
    title: "El consejo y preparativos en el vado",
    year: "MARZO DE 1879",
    phase: "EL VADO · CALAMA",
    visual: "Campamento defensivo junto al río Loa, con una representación de la reunión de los defensores, sacos de tierra y tablones. Los gestos se sincronizan de forma aproximada con la narración.",
    dialog: "La narración de la escena acompaña el consejo de los defensores y los preparativos para proteger el paso del río.",
    subtitles: [
      "En Calama, los defensores se reúnen para organizar la resistencia.",
      "Ladislao Cabrera dirige los preparativos junto al río Loa.",
      "Abaroa y los voluntarios protegen el paso de Topáter."
    ],
    audio: "assets/audio/2.2escena.mp3",
    model: "assets/models/EduardoAbaroa.glb",
    themeColor: "#e6a84a",
    skyColor: "#c89d66",
    fogColor: "#c89d66",
    cabreraAt: 0.3,
    abaroaReplyAt: 0.58
  },
  {
    id: 3,
    number: "03",
    title: "El combate del Topáter",
    year: "23 DE MARZO DE 1879",
    phase: "DEFENSA DEL PUENTE",
    visual: "Una trinchera y un puente de madera en un paisaje desértico. Humo y fogonazos estilizados acompañan el relato; al final se representa el repliegue de los defensores.",
    dialog: "La narración presenta el combate en el paso de Topáter y la resistencia de Eduardo Abaroa.",
    subtitles: [
      "El combate comienza junto al puente de Topáter.",
      "Los defensores bolivianos resisten el avance enemigo.",
      "En medio del fuego, Abaroa permanece en su puesto.",
      "Los defensores se repliegan; Abaroa no abandona el puente."
    ],
    audio: "assets/audio/2.3escena.mp3",
    model: "assets/models/EduardoAbaroa.glb",
    enemyModel: "assets/models/Soldado Chileno.glb",
    themeColor: "#b86f40",
    skyColor: "#8f735d",
    fogColor: "#8f735d",
    retreatAt: 0.78
  },
  {
    id: 4,
    number: "04",
    title: "La última resistencia en el puente",
    year: "23 DE MARZO DE 1879",
    phase: "LA RESPUESTA DE ABAROA",
    visual: "El puente queda en silencio bajo la luz del desierto. Abaroa encara a dos soldados; al final, una caída escenificada y un fundido blanco cierran el episodio.",
    dialog: "La narración acompaña el episodio final de la defensa del puente de Topáter.",
    subtitles: [
      "Herido y rodeado, Abaroa permanece en el puente.",
      "El oficial enemigo exige su rendición.",
      "Abaroa se niega a abandonar la defensa.",
      "Su resistencia queda en la memoria de Bolivia."
    ],
    audio: "assets/audio/2.4escena.mp3",
    model: "assets/models/EduardoAbaroa.glb",
    themeColor: "#d9b982",
    skyColor: "#b9a58b",
    fogColor: "#b9a58b",
    challengeAt: 0.52,
    volleyAt: 0.78
  },
  {
    id: 5,
    number: "05",
    title: "Galería histórica y memorial",
    year: "1879 · 1952 · ACTUALIDAD",
    phase: "MEMORIA Y LEGADO",
    visual: "Un memorial al atardecer reúne una línea de tiempo y tres objetos históricos seleccionables. Los hitos muestran información al apuntarlos o tocarlos.",
    dialog: "La narración final invita a recorrer la memoria histórica y el legado de Eduardo Abaroa.",
    subtitles: [
      "La memoria de Topáter atraviesa generaciones.",
      "En 1952, los restos de Abaroa regresan a Bolivia.",
      "Su legado sigue vivo en la historia del país."
    ],
    audio: "assets/audio/2.5Escena.mp3",
    model: "assets/models/EduardoAbaroa.glb",
    themeColor: "#e4b85c",
    skyColor: "#df9a61",
    fogColor: "#df9a61"
  }
];

class TamayoVRExperience {
  constructor() {
    this.storyId = 'franz';
    this.currentIndex = 0;
    this.speechActive = false;
    this.currentUtterance = null;
    this.sceneReady = false;
    this.audioEl = null;
    this.subtitleFrameId = null;
    this.activeSubtitleIndex = -1;
    this.gyroEnabled = false;
    this.lastGyroYaw = 0;
    this.lastGyroPitch = 0;
    this.gyroHandler = this.handleGyroscope.bind(this);
    this.abaroaSceneTimer = null;
    this.transitionTimer = null;
    this.ensureAudioElement();
    const storySelect = document.getElementById('vr-story-select');
    if (storySelect) {
      storySelect.addEventListener('change', () => this.setStory(storySelect.value));
    }
    window.addEventListener('historia:select-scene', (e) => {
      const vrView = document.getElementById('vr-view');
      if (vrView && vrView.getAttribute('aria-hidden') === 'false' && e.detail && typeof e.detail.index === 'number') {
        this.setSceneIndex(e.detail.index, true);
      }
    });
  }

  configureDraco(sceneEl) {
    if (!window.THREE || !THREE.DRACOLoader || !sceneEl || !sceneEl.systems) return false;
    const gltfSystem = sceneEl.systems['gltf-model'];
    if (!gltfSystem) return false;

    try {
      if (!gltfSystem.dracoLoader) {
        gltfSystem.dracoLoader = new THREE.DRACOLoader();
      }
      gltfSystem.dracoLoader.setDecoderPath(new URL('assets/draco/', window.location.href).href);
      return true;
    } catch (error) {
      console.error('[Historia Viva] No se pudo configurar Draco para VR:', error);
      return false;
    }
  }

  ensureAudioElement() {
    if (this.audioEl) return this.audioEl;
    const audio = document.createElement('audio');
    audio.id = 'vr-scene-audio';
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.setAttribute('playsinline', 'true');
    document.body.appendChild(audio);
    this.audioEl = audio;
    return audio;
  }

  handleGyroscope(event) {
    if (!this.gyroEnabled) return;
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;
    const camera = aScene.querySelector('#vr-camera');
    if (!camera || !camera.object3D || event.alpha === null || event.beta === null || event.gamma === null) return;

    const degToRad = Math.PI / 180;
    const orientationAngle = (window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
    const deviceEuler = new THREE.Euler(event.beta * degToRad, event.alpha * degToRad, -event.gamma * degToRad, 'YXZ');
    const deviceQuaternion = new THREE.Quaternion().setFromEuler(deviceEuler);
    const screenQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orientationAngle * degToRad);
    const cameraCorrection = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'XYZ'));
    deviceQuaternion.multiply(screenQuaternion).multiply(cameraCorrection);
    camera.object3D.quaternion.slerp(deviceQuaternion, 0.22);
    camera.object3D.updateMatrixWorld(true);
  }

  bindGyroscope() {
    if (!window.DeviceOrientationEvent) return;
    this.gyroEnabled = true;
    window.addEventListener('deviceorientation', this.gyroHandler, true);
    const camera = document.querySelector('#vr-camera');
    if (camera) camera.setAttribute('look-controls', 'enabled', false);
  }

  unbindGyroscope() {
    this.gyroEnabled = false;
    window.removeEventListener('deviceorientation', this.gyroHandler, true);
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (aScene) {
      const camera = aScene.querySelector('#vr-camera');
      if (camera) camera.setAttribute('look-controls', 'enabled', true);
      const cameraRig = aScene.querySelector('#vr-camera-rig');
      if (cameraRig && cameraRig.object3D) {
        cameraRig.object3D.rotation.set(0, 0, 0);
        cameraRig.object3D.position.set(0, 0, 0);
      }
    }
  }

  enableCardboardStereo(sceneEl) {
    const renderer = sceneEl && sceneEl.renderer;
    if (!renderer || !window.THREE || !THREE.StereoCamera || !renderer.domElement) return false;

    if (!renderer.__tamayoMonoRender) {
      renderer.__tamayoMonoRender = renderer.render.bind(renderer);
      renderer.__tamayoStereoCamera = new THREE.StereoCamera();
      renderer.__tamayoStereoCamera.eyeSep = 0.064;
      renderer.__tamayoOriginalPixelRatio = renderer.getPixelRatio();
      renderer.render = function (scene, camera) {
        const monoRender = renderer.__tamayoMonoRender;
        if (!renderer.__tamayoStereoEnabled || renderer.xr?.isPresenting || !camera || !camera.isPerspectiveCamera) {
          return monoRender(scene, camera);
        }

        const size = renderer.getSize(new THREE.Vector2());
        const split = Math.floor(size.x / 2);
        const stereo = renderer.__tamayoStereoCamera;
        stereo.update(camera);
        renderer.setScissorTest(true);
        renderer.setViewport(0, 0, split, size.y);
        renderer.setScissor(0, 0, split, size.y);
        monoRender(scene, stereo.cameraL);
        renderer.setViewport(split, 0, size.x - split, size.y);
        renderer.setScissor(split, 0, size.x - split, size.y);
        monoRender(scene, stereo.cameraR);
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, size.x, size.y);
      };
    }

    renderer.__tamayoStereoEnabled = true;
    renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.2));
    document.getElementById('vr-view')?.classList.add('is-cardboard-stereo');
    return true;
  }

  disableCardboardStereo(sceneEl) {
    const renderer = sceneEl && sceneEl.renderer;
    if (renderer) {
      renderer.__tamayoStereoEnabled = false;
      if (renderer.__tamayoOriginalPixelRatio) renderer.setPixelRatio(renderer.__tamayoOriginalPixelRatio);
      renderer.setScissorTest(false);
    }
    document.getElementById('vr-view')?.classList.remove('is-cardboard-stereo');
  }

  getCurrentScene() {
    return this.getScenes()[this.currentIndex];
  }

  getScenes() {
    return this.storyId === 'abaroa' ? window.ABAROA_VR_SCENES : window.TAMAYO_VR_SCENES;
  }

  setStory(storyId) {
    if (storyId !== 'franz' && storyId !== 'abaroa') return;
    this.stopNarration();
    this.storyId = storyId;
    this.currentIndex = 0;
    const scene = this.getCurrentScene();
    this.updateHUD(scene);
    this.update3DScene(scene);
    const storySelect = document.getElementById('vr-story-select');
    if (storySelect) storySelect.value = storyId;
    if (storyId === 'abaroa') this.playNarration();
  }

  setSceneIndex(index, updateAudio = true) {
    if (!Number.isInteger(index) || index < 0 || index >= this.getScenes().length) return;
    this.clearAbaroaTimeline();
    const prevIndex = this.currentIndex;
    const isSceneChange = (index !== prevIndex);
    const travelDir = (index >= prevIndex) ? 'forward' : 'backward';

    this.currentIndex = index;
    const scene = this.getCurrentScene();

    this.updateHUD(scene);
    this.update3DScene(scene);

    // ⚡ Efectos de Salto en la Máquina del Tiempo y Movimientos Grabados por Escena
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (isSceneChange) {
      if (window.HistoriaFX && window.HistoriaFX.whoosh) {
        window.HistoriaFX.whoosh(travelDir, 2.0);
      }
      if (aScene) {
        // Túnel de hipervelocidad espacio-temporal en la cámara
        const camera = aScene.querySelector('#vr-camera');
        if (camera && camera.components && camera.components['time-tunnel']) {
          camera.components['time-tunnel'].warp(scene.themeColor, 1800);
        }
        // Giro acelerado del dial temporal del pedestal
        const dial = aScene.querySelector('#vr-pedestal-dial') || aScene.querySelector('[time-dial]');
        if (dial && dial.components && dial.components['time-dial']) {
          dial.components['time-dial'].spin(travelDir, 1800);
        }
        // Atmósfera cósmica reactiva
        const ambience = aScene.querySelector('#vr-ambience-layer') || aScene.querySelector('[time-ambience]');
        if (ambience && ambience.components && ambience.components['time-ambience']) {
          ambience.components['time-ambience'].setTheme(scene.themeColor, scene.skyColor);
        }
        // Entorno 360 reactivo (faroles, linternas celestes y cielo)
        const world = aScene.querySelector('#vr-surrounding-world') || aScene.querySelector('[vr-world]');
        if (world && world.components && world.components['vr-world']) {
          world.components['vr-world'].setTheme(scene.themeColor);
        }
      }
    }

    const aSceneModel = this.storyId === 'franz' && aScene && aScene.querySelector('#vr-character-model');
    const animator = aSceneModel && aSceneModel.components && aSceneModel.components['tamayo-animator'];
    if (animator && typeof animator.playSceneChoreography === 'function') {
      animator.playSceneChoreography(index);
    } else if (this.storyId === 'franz' && isSceneChange) {
      const gestures = ['scene1_despertar', 'scene2_pedagogia', 'scene3_fundacion', 'scene4_crecimiento', 'scene5_legado'];
      this.animateCharacterGesture(gestures[index] || 'wave');
    }

    const diorama = aScene && aScene.querySelector('#vr-interactive-diorama');
    if (this.storyId === 'franz' && diorama && diorama.components && diorama.components['scene-diorama']) {
      diorama.components['scene-diorama'].setActiveScene(index);
    }
    window.dispatchEvent(new CustomEvent('historia:scene-changed', {
      detail: { index, storyId: this.storyId }
    }));

    this.ensureAudioElement();
    if (this.audioEl) {
      const source = scene.audio ? new URL(scene.audio, window.location.href).href : '';
      if (this.audioEl.src !== source) {
        this.audioEl.src = source;
        this.audioEl.load();
      }
    }

    if (updateAudio && (this.speechActive || this.storyId === 'abaroa')) {
      this.playNarration();
    }

    document.dispatchEvent(new CustomEvent('tamayo-scene-changed', {
      detail: { scene, index: this.currentIndex, storyId: this.storyId }
    }));
  }

  nextScene() {
    const nextIndex = (this.currentIndex + 1) % this.getScenes().length;
    this.setSceneIndex(nextIndex);
  }

  prevScene() {
    const prevIndex = (this.currentIndex - 1 + this.getScenes().length) % this.getScenes().length;
    this.setSceneIndex(prevIndex);
  }

  updateHUD(scene) {
    const badge = document.getElementById('vr-scene-badge');
    const title = document.getElementById('vr-scene-title');
    const phase = document.getElementById('vr-scene-phase');
    const dialogPreview = document.getElementById('vr-dialog-text');
    const visualText = document.getElementById('vr-visual-desc');
    const pills = document.querySelectorAll('.scene-pill');
    const scenes = this.getScenes();

    if (badge) badge.textContent = `ESCENA ${scene.number} / ${String(scenes.length).padStart(2, '0')} · ${scene.year}`;
    if (title) title.textContent = scene.title;
    if (phase) phase.textContent = scene.phase;
    if (dialogPreview) dialogPreview.textContent = `"${scene.dialog}"`;
    if (visualText) visualText.textContent = scene.visual;
    const audioLabel = document.getElementById('vr-audio-label');
    if (audioLabel) audioLabel.textContent = this.storyId === 'abaroa' ? 'Escuchar narración de Abaroa' : 'Escuchar a Franz Tamayo';
    const sceneSelect = document.getElementById('vr-story-select');
    if (sceneSelect) sceneSelect.value = this.storyId;
    const previousButton = document.getElementById('vr-btn-prev');
    const nextButton = document.getElementById('vr-btn-next');
    if (previousButton) previousButton.disabled = scenes.length < 2;
    if (nextButton) nextButton.disabled = scenes.length < 2;

    pills.forEach((pill, idx) => {
      pill.hidden = idx >= scenes.length;
      const isActive = idx === this.currentIndex;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-selected', String(isActive));
    });
  }

  getSubtitleSegments(scene) {
    if (Array.isArray(scene.subtitles) && scene.subtitles.length) return scene.subtitles;
    const sentences = (scene.dialog.match(/[^.!?]+[.!?]?/g) || [scene.dialog])
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const segments = [];
    sentences.forEach((sentence) => {
      let line = '';
      sentence.split(/\s+/).forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (nextLine.length > 68 && line) {
          segments.push(line);
          line = word;
        } else {
          line = nextLine;
        }
      });
      if (line) segments.push(line);
    });
    return segments;
  }

  startCinematicSubtitles() {
    this.stopCinematicSubtitles();
    const update = () => {
      if (!this.speechActive || !this.audioEl) return;
      this.updateCinematicSubtitle();
      this.subtitleFrameId = window.requestAnimationFrame(update);
    };
    update();
  }

  stopCinematicSubtitles() {
    if (this.subtitleFrameId !== null) {
      window.cancelAnimationFrame(this.subtitleFrameId);
      this.subtitleFrameId = null;
    }
    this.activeSubtitleIndex = -1;
    const caption = document.getElementById('vr-cinematic-subtitle');
    if (caption) {
      caption.classList.remove('is-visible');
      caption.textContent = '';
      caption.hidden = true;
    }
    const caption3D = document.querySelector('#vr-3d-scene-dialog');
    if (caption3D) caption3D.setAttribute('value', '');
  }

  updateCinematicSubtitle() {
    const duration = this.audioEl && this.audioEl.duration;
    const segments = this.getSubtitleSegments(this.getCurrentScene());
    const caption = document.getElementById('vr-cinematic-subtitle');
    if (!caption || !Number.isFinite(duration) || duration <= 0 || !segments.length) return;

    const weights = segments.map((text) => Math.max(1, text.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let remainingWeight = Math.min(1, this.audioEl.currentTime / duration) * totalWeight;
    let index = 0;
    while (index < weights.length - 1 && remainingWeight >= weights[index]) {
      remainingWeight -= weights[index];
      index++;
    }
    const segmentDuration = duration * weights[index] / totalWeight;
    const revealDuration = Math.min(segmentDuration * 0.7, Math.max(0.35, segments[index].length / 28));
    const revealProgress = revealDuration > 0
      ? Math.min(1, remainingWeight / weights[index] * segmentDuration / revealDuration)
      : 1;
    const visibleText = segments[index].slice(0, Math.ceil(segments[index].length * revealProgress));

    if (this.activeSubtitleIndex !== index) {
      this.activeSubtitleIndex = index;
      caption.hidden = false;
      caption.classList.remove('is-visible');
      caption.textContent = '';
      window.requestAnimationFrame(() => caption.classList.add('is-visible'));
    }
    if (caption.textContent !== visibleText) caption.textContent = visibleText;

    const caption3D = document.querySelector('#vr-3d-scene-dialog');
    const previousCaption3D = caption3D && caption3D.getAttribute('value');
    if (caption3D && previousCaption3D !== visibleText
      && (Math.abs(String(previousCaption3D || '').length - visibleText.length) >= 2
        || visibleText.length === segments[index].length)) {
      caption3D.setAttribute('value', visibleText);
    }
  }

  update3DScene(scene) {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;
    if (this.storyId === 'abaroa') {
      this.updateAbaroaScene(scene, aScene);
      return;
    }

    const abaroaScene = aScene.querySelector('#vr-abaroa-scene-1');
    if (abaroaScene) abaroaScene.setAttribute('visible', 'false');
    const abaroaFigure = aScene.querySelector('#vr-abaroa-figure');
    if (abaroaFigure) abaroaFigure.setAttribute('visible', 'false');
    ['#vr-ambience-layer', '#vr-surrounding-world', '#vr-interactive-diorama', '#vr-npc-group',
      '#vr-tamayo-figure', '#vr-scene-cue', '#vr-pedestal', '#vr-pedestal-dial', '#vr-pedestal-glow',
    ].forEach((selector) => {
      const entity = aScene.querySelector(selector);
      if (entity) entity.setAttribute('visible', 'true');
    });
    const abaroaTransition = aScene.querySelector('#vr-abaroa-transition');
    if (abaroaTransition) {
      abaroaTransition.setAttribute('visible', 'false');
      abaroaTransition.setAttribute('scale', '0.001 0.001 0.001');
    }
    const franzGroup = aScene.querySelector('#vr-character-model');
    if (franzGroup && franzGroup.parentElement) franzGroup.parentElement.setAttribute('visible', 'true');

    // Actualizar cielo y niebla ambiental
    const sky = aScene.querySelector('a-sky');
    if (sky) sky.setAttribute('color', scene.skyColor);

    if (aScene.hasAttribute('fog')) {
      aScene.setAttribute('fog', `type: exponential; color: ${scene.fogColor}; density: 0.002`);
    }

    // Actualizar panel 3D flotante visible en VR (con gafas)
    const vrTitle3D = aScene.querySelector('#vr-3d-scene-title');
    const vrDialog3D = aScene.querySelector('#vr-3d-scene-dialog');
    const vrPhase3D = aScene.querySelector('#vr-3d-scene-phase');
    const vrPedestalRing = aScene.querySelector('#vr-pedestal-glow');
    const pedestal = aScene.querySelector('a-cylinder');

    if (vrTitle3D) {
      vrTitle3D.setAttribute('value', `ESCENA ${scene.number}: ${scene.title.toUpperCase()}`);
    }
    if (vrPhase3D) {
      vrPhase3D.setAttribute('value', `[ ${scene.phase} · ${scene.year} ]`);
      vrPhase3D.setAttribute('color', scene.themeColor);
    }
    if (vrDialog3D) {
      // Ajustar texto para que no sea excesivamente denso en el plano 3D
      vrDialog3D.setAttribute('value', `"${scene.dialog}"`);
    }
    if (vrPedestalRing) {
      vrPedestalRing.setAttribute('material', `color: ${scene.themeColor}; emissive: ${scene.themeColor}; emissiveIntensity: 0.7`);
    }
    if (pedestal) pedestal.setAttribute('position', '0 0.08 -2.3');
    if (vrPedestalRing) vrPedestalRing.setAttribute('position', '0 0.17 -2.3');

    const cueText = aScene.querySelector('#vr-scene-cue-text');
    if (cueText) {
      const cues = [
        'MÍRAME · COMENCEMOS',
        'EL CONOCIMIENTO ABRE CAMINOS',
        'UNA VISIÓN SE HACE REALIDAD',
        'CUATRO CIUDADES · UN FUTURO',
        'EL FUTURO ESTÁ EN TUS MANOS'
      ];
      cueText.setAttribute('value', cues[scene.id - 1]);
      cueText.setAttribute('color', scene.themeColor);
    }

    // Alternar los elementos visuales específicos de cada escena 3D en el entorno
    for (let i = 1; i <= 5; i++) {
      const visualEntity = aScene.querySelector(`#vr-visuals-scene-${i}`);
      if (visualEntity) {
        visualEntity.setAttribute('visible', String(i === scene.id));
      }
    }

    // Actualizar tonalidad ambiental del mundo 360
    const world = aScene.querySelector('#vr-surrounding-world') || aScene.querySelector('[vr-world]');
    if (world && world.components && world.components['vr-world']) {
      world.components['vr-world'].setTheme(scene.themeColor);
    }
  }

  updateAbaroaScene(scene, aScene) {
    const sky = aScene.querySelector('a-sky');
    if (sky) sky.setAttribute('color', scene.skyColor);
    if (aScene.hasAttribute('fog')) {
      aScene.setAttribute('fog', `type: exponential; color: ${scene.fogColor}; density: 0.006`);
    }

    ['#vr-ambience-layer', '#vr-surrounding-world', '#vr-interactive-diorama', '#vr-npc-group',
      '#vr-tamayo-figure', '#vr-scene-cue', '#vr-pedestal', '#vr-pedestal-dial', '#vr-pedestal-glow']
      .forEach((selector) => {
        const entity = aScene.querySelector(selector);
        if (entity) entity.setAttribute('visible', 'false');
      });
    for (let index = 1; index <= 5; index++) {
      const entity = aScene.querySelector(`#vr-visuals-scene-${index}`);
      if (entity) entity.setAttribute('visible', 'false');
    }

    for (let index = 1; index <= 5; index++) {
      const storyScene = aScene.querySelector(`#vr-abaroa-scene-${index}`);
      if (storyScene) storyScene.setAttribute('visible', String(index === scene.id));
    }

    const abaroaScene = aScene.querySelector('#vr-abaroa-scene-1');
    if (abaroaScene) {
      const route = abaroaScene.querySelector('#vr-abaroa-route');
      if (route) route.setAttribute('visible', 'false');
      const details = abaroaScene.querySelector('#vr-abaroa-map-info');
      if (details) details.setAttribute('visible', 'false');
      const prompt = abaroaScene.querySelector('#vr-abaroa-timeline-prompt');
      if (prompt) prompt.setAttribute('visible', String(scene.id === 1));
    }
    for (let index = 2; index <= 5; index++) {
      const storyScene = aScene.querySelector(`#vr-abaroa-scene-${index}`);
      if (storyScene) {
        delete storyScene.dataset.cabreraBeat;
        delete storyScene.dataset.abaroaReplyBeat;
        delete storyScene.dataset.retreatBeat;
        delete storyScene.dataset.challengeBeat;
        delete storyScene.dataset.volleyBeat;
        delete storyScene.dataset.advanceBeat;
        delete storyScene.dataset.shotBeat;
      }
      const scenePrompt = aScene.querySelector(`#vr-abaroa-scene-${index}-prompt a-text`);
      if (scenePrompt) {
        const promptLabels = {
          2: 'EL CONSEJO DE LOS DEFENSORES',
          3: 'EL COMBATE DEL TOPÁTER',
          4: 'LA ÚLTIMA RESISTENCIA',
          5: 'MEMORIAL DE EDUARDO ABAROA · SELECCIONA UN HITO'
        };
        scenePrompt.setAttribute('value', promptLabels[index]);
      }
    }
    aScene.querySelector('#vr-abaroa-topater-portal')?.setAttribute('visible', 'false');
    aScene.querySelector('#vr-abaroa-cabrera-arm')?.removeAttribute('animation__point');
    aScene.querySelector('#vr-abaroa-cabrera-arm')?.removeAttribute('animation__lower');
    aScene.querySelector('#vr-abaroa-cabrera-arm')?.setAttribute('rotation', '0 0 0');
    aScene.querySelector('#vr-abaroa-allied-retreat')?.removeAttribute('animation__retreat');
    aScene.querySelector('#vr-abaroa-allied-retreat')?.setAttribute('position', '-3 0 -3');
    aScene.querySelector('#vr-abaroa-enemy-line')?.removeAttribute('animation__advance');
    aScene.querySelector('#vr-abaroa-enemy-line')?.setAttribute('position', '0 0 -16');
    aScene.querySelector('#vr-abaroa-enemies-scene-4')?.setAttribute('visible', 'false');
    aScene.querySelector('#vr-abaroa-enemies-scene-4')?.removeAttribute('animation__approach');
    aScene.querySelector('#vr-abaroa-enemies-scene-4')?.setAttribute('position', '0 0 -13');
    aScene.querySelector('#vr-abaroa-volley-flash')?.setAttribute('visible', 'false');
    const combatFlash = aScene.querySelector('#vr-abaroa-muzzle-flash a-sphere');
    if (combatFlash) combatFlash.setAttribute('scale', '0.001 0.001 0.001');
    const finalVolleyFlash = aScene.querySelector('#vr-abaroa-volley-flash a-sphere');
    if (finalVolleyFlash) finalVolleyFlash.setAttribute('scale', '0.001 0.001 0.001');

    const figure = aScene.querySelector('#vr-abaroa-figure');
    if (figure) {
      figure.setAttribute('visible', String(scene.id !== 1));
      figure.setAttribute('position', this.getAbaroaFigurePosition(scene.id));
      figure.setAttribute('rotation', scene.id === 3 ? '0 0 0' : '0 180 0');
      figure.removeAttribute('animation__determination');
      figure.removeAttribute('animation__fall');
      figure.removeAttribute('animation__combat');
      figure.removeAttribute('animation__stand');
      if (scene.id === 3) {
        figure.setAttribute('animation__combat', 'property: rotation; from: 0 0 0; to: -3 0 2; dir: alternate; dur: 700; loop: true; easing: easeInOutSine');
      }
      const model = figure.querySelector('#vr-abaroa-model');
      if (model && model.getAttribute('gltf-model') !== scene.model) {
        model.setAttribute('gltf-model', scene.model);
      }
      this.applyAbaroaModelAppearance();
    }

    const infoCard = aScene.querySelector('#vr-abaroa-scene-info');
    if (infoCard) infoCard.setAttribute('visible', 'false');
    const prompt = aScene.querySelector(`#vr-abaroa-scene-${scene.id}-prompt`);
    if (prompt) prompt.setAttribute('visible', 'true');

    const enemy = aScene.querySelector('#vr-abaroa-enemy-model');
    if (enemy) {
      if (scene.id === 3 && scene.enemyModel && enemy.getAttribute('gltf-model') !== scene.enemyModel) {
        enemy.setAttribute('gltf-model', scene.enemyModel);
      } else if (scene.id !== 3) {
        enemy.removeAttribute('gltf-model');
      }
    }

    const resetButton = aScene.querySelector('#vr-abaroa-restart');
    if (resetButton) resetButton.setAttribute('visible', String(scene.id === 5));

    if (scene.id === 4) {
      const overlay = aScene.querySelector('#vr-abaroa-transition');
      if (overlay) overlay.setAttribute('material', 'shader: flat; color: #ffffff; transparent: true; opacity: 0.96; side: double');
    }

    const overlay = aScene.querySelector('#vr-abaroa-transition');
    if (overlay) {
      overlay.setAttribute('visible', 'false');
      overlay.setAttribute('scale', '0.001 0.001 0.001');
      if (scene.id !== 4) {
        overlay.setAttribute('material', 'shader: flat; color: #000000; transparent: true; side: double');
      }
    }
    const title = aScene.querySelector('#vr-3d-scene-title');
    const phase = aScene.querySelector('#vr-3d-scene-phase');
    const dialog = aScene.querySelector('#vr-3d-scene-dialog');
    if (title) title.setAttribute('value', `ESCENA ${scene.number}: ${scene.title.toUpperCase()}`);
    if (phase) phase.setAttribute('value', `[ ${scene.phase} · ${scene.year} ]`);
    if (dialog) dialog.setAttribute('value', scene.dialog);
  }

  getAbaroaFigurePosition(sceneId) {
    const positions = {
      1: '1.43 0.02 -2.15',
      2: '0.82 0.02 -4.5',
      3: '0 0.02 -1.6',
      4: '0 0.02 -3.1',
      5: '0 0.04 -2.8'
    };
    return positions[sceneId] || positions[1];
  }

  applyAbaroaModelAppearance() {
    const model = document.querySelector('#vr-abaroa-model');
    const mesh = model && model.getObject3D('mesh');
    if (!mesh) return;
    const tint = this.storyId === 'abaroa' && this.currentIndex === 4 ? '#8b633d' : '#ffffff';
    mesh.traverse((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (material && material.color) {
          material.color.set(tint);
          material.needsUpdate = true;
        }
      });
    });
  }

  showAbaroaLandmark(marker) {
    if (this.storyId !== 'abaroa' || !marker) return;
    const aScene = document.querySelector('#vr-scene');
    if (this.currentIndex > 0) {
      const details = aScene && aScene.querySelector('#vr-abaroa-scene-info');
      const text = aScene && aScene.querySelector('#vr-abaroa-scene-info-text');
      if (!details || !text) return;
      text.setAttribute('value', marker.getAttribute('data-vr-landmark'));
      details.setAttribute('visible', 'true');
      return;
    }
    const details = aScene && aScene.querySelector('#vr-abaroa-map-info');
    const text = aScene && aScene.querySelector('#vr-abaroa-map-info-text');
    if (!details || !text) return;
    text.setAttribute('value', marker.getAttribute('data-vr-landmark'));
    details.setAttribute('visible', 'true');
  }

  updateAbaroaTimeline() {
    if (this.storyId !== 'abaroa' || !this.audioEl) return;
    const scene = this.getCurrentScene();
    const aScene = document.querySelector('#vr-scene');
    if (!aScene || !Number.isFinite(this.audioEl.duration) || this.audioEl.duration <= 0) return;
    const progress = this.audioEl.currentTime / this.audioEl.duration;
    const route = aScene && aScene.querySelector('#vr-abaroa-route');
    const figure = aScene && aScene.querySelector('#vr-abaroa-figure');
    const prompt = aScene && aScene.querySelector('#vr-abaroa-timeline-prompt');

    if (route && this.audioEl.currentTime >= scene.routeRevealAt) {
      route.setAttribute('visible', 'true');
      if (prompt) prompt.setAttribute('visible', 'false');
    }
    if (figure && this.audioEl.currentTime >= scene.characterRevealAt) {
      figure.setAttribute('visible', 'true');
    }

    const setPrompt = (text) => {
      const currentPrompt = aScene.querySelector(`#vr-abaroa-scene-${scene.id}-prompt a-text`);
      if (currentPrompt) currentPrompt.setAttribute('value', text);
    };
    const playOnce = (key, action) => {
      const activeScene = aScene.querySelector(`#vr-abaroa-scene-${scene.id}`);
      if (!activeScene || activeScene.dataset[key] === 'true') return;
      activeScene.dataset[key] = 'true';
      action();
    };

    if (scene.id === 2 && progress >= scene.cabreraAt) {
      playOnce('cabreraBeat', () => {
        const arm = aScene.querySelector('#vr-abaroa-cabrera-arm');
        if (arm) arm.setAttribute('animation__point', 'property: rotation; to: 0 0 -62; dur: 700; easing: easeOutCubic');
        aScene.querySelectorAll('#vr-abaroa-defenders [npc-person]').forEach((defender) => {
          defender.components['npc-person']?.playGesture('lift', 2.8);
        });
        setPrompt('CABRERA SEÑALA EL VADO · LOS DEFENSORES PREPARAN LA POSICIÓN');
      });
    }
    if (scene.id === 2 && progress >= scene.abaroaReplyAt) {
      playOnce('abaroaReplyBeat', () => {
        const arm = aScene.querySelector('#vr-abaroa-cabrera-arm');
        if (arm) {
          arm.removeAttribute('animation__point');
          arm.setAttribute('animation__lower', 'property: rotation; to: 0 0 0; dur: 500; easing: easeInOutSine');
        }
        if (figure) figure.setAttribute('animation__determination', 'property: rotation; from: 0 180 0; to: -8 180 0; dir: alternate; loop: 2; dur: 350; easing: easeInOutSine');
        aScene.querySelectorAll('#vr-abaroa-defenders [npc-person]').forEach((defender) => {
          defender.components['npc-person']?.playGesture('carry', 2.4);
        });
        setPrompt('ABAROA ACEPTA DEFENDER EL PASO · PREPARATIVOS EN MARCHA');
      });
    }
    if (scene.id === 3 && progress >= 0.06) {
      playOnce('advanceBeat', () => {
        const attackers = aScene.querySelector('#vr-abaroa-enemy-line');
        if (attackers) {
          attackers.setAttribute('animation__advance', 'property: position; from: 0 0 -16; to: 0 0 -12; dur: 18000; easing: linear');
        }
      });
    }
    if (scene.id === 3 && progress > 0.04 && progress < scene.retreatAt) {
      const activeScene = aScene.querySelector(`#vr-abaroa-scene-${scene.id}`);
      const shotIndex = Math.floor(this.audioEl.currentTime / 2.2);
      if (activeScene && shotIndex > 0 && activeScene.dataset.shotBeat !== String(shotIndex)) {
        activeScene.dataset.shotBeat = String(shotIndex);
        aScene.querySelector('#vr-abaroa-muzzle-flash a-sphere')?.emit('abaroa-shot');
      }
    }
    if (scene.id === 3 && progress >= scene.retreatAt) {
      playOnce('retreatBeat', () => {
        const allies = aScene.querySelector('#vr-abaroa-allied-retreat');
        if (allies) allies.setAttribute('animation__retreat', 'property: position; to: -5 0 -5; dur: 2400; easing: easeInOutSine');
        if (figure) figure.setAttribute('position', '0 0.02 -4.4');
        setPrompt('LOS DEFENSORES SE REPLIEGAN · ABAROA PERMANECE EN EL PUENTE');
      });
    }
    if (scene.id === 4 && progress >= scene.challengeAt) {
      playOnce('challengeBeat', () => {
        const enemies = aScene.querySelector('#vr-abaroa-enemies-scene-4');
        if (enemies) {
          enemies.setAttribute('visible', 'true');
          enemies.setAttribute('animation__approach', 'property: position; from: 0 0 -13; to: 0 0 -9; dur: 2800; easing: easeOutCubic');
        }
        if (figure) {
          figure.setAttribute('animation__stand', 'property: position; from: 0 0.02 -3.1; to: 0 0.12 -3.1; dur: 650; easing: easeOutCubic');
        }
        aScene.querySelectorAll('#vr-abaroa-enemies-scene-4 [npc-person]').forEach((enemy) => {
          enemy.components['npc-person']?.playGesture('point', 2.5);
        });
        setPrompt('EL OFICIAL EXIGE LA RENDICIÓN · ABAROA SE MANTIENE FIRME');
      });
    }
    if (scene.id === 4 && progress >= scene.volleyAt) {
      playOnce('volleyBeat', () => {
        const flash = aScene.querySelector('#vr-abaroa-volley-flash');
        if (flash) {
          flash.setAttribute('visible', 'true');
          flash.querySelector('a-sphere')?.emit('volley');
        }
        if (figure) figure.setAttribute('animation__fall', 'property: rotation; to: 88 180 0; dur: 2000; easing: easeInOutSine');
        setPrompt('LA ÚLTIMA DESCARGA · EL MEMORIAL RECUERDA SU RESISTENCIA');
      });
    }
  }

  clearAbaroaTimeline() {
    if (this.abaroaSceneTimer) window.clearTimeout(this.abaroaSceneTimer);
    if (this.transitionTimer) window.clearTimeout(this.transitionTimer);
    this.abaroaSceneTimer = null;
    this.transitionTimer = null;
    if (this.audioEl) this.audioEl.ontimeupdate = null;
  }

  finishAbaroaScene() {
    if (this.storyId !== 'abaroa') return;
    const aScene = document.querySelector('#vr-scene');
    const overlay = aScene && aScene.querySelector('#vr-abaroa-transition');
    const scene = this.getCurrentScene();
    const prompt = aScene && aScene.querySelector(`#vr-abaroa-scene-${scene.id}-prompt`);
    if (scene.id === 1) {
      const introPrompt = aScene && aScene.querySelector('#vr-abaroa-timeline-prompt');
      if (introPrompt) {
        introPrompt.querySelector('a-text')?.setAttribute('value', 'ESCENA 1 COMPLETADA · SELECCIONA LA SIGUIENTE ESCENA');
        introPrompt.setAttribute('visible', 'true');
      }
    } else if (prompt) {
      const messages = {
        2: 'PREPARATIVOS COMPLETADOS · EL VADO DE TOPÁTER AGUARDA',
        3: 'ESCENA COMPLETADA · AVANZA A LA ÚLTIMA RESISTENCIA',
        4: 'EPISODIO COMPLETADO · MEMORIAL HISTÓRICO',
        5: 'RECORRIDO COMPLETADO · PUEDES EXPLORAR LOS HITOS O REINICIAR'
      };
      prompt.querySelector('a-text')?.setAttribute('value', messages[scene.id]);
      prompt.setAttribute('visible', 'true');
    }
    if (scene.id === 2) {
      aScene?.querySelector('#vr-abaroa-topater-portal')?.setAttribute('visible', 'true');
      return;
    }
    if (scene.id === 5) return;
    if (!overlay) return;
    overlay.setAttribute('material', scene.id === 4
      ? 'shader: flat; color: #ffffff; transparent: true; opacity: 0.96; side: double'
      : 'shader: flat; color: #000000; transparent: true; side: double');
    overlay.setAttribute('visible', 'true');
    overlay.setAttribute('animation__iris', 'property: scale; from: 0.001 0.001 0.001; to: 4 4 4; dur: 850; easing: easeInQuad');
    this.transitionTimer = window.setTimeout(() => {
      overlay.removeAttribute('animation__iris');
      overlay.setAttribute('scale', '0.001 0.001 0.001');
      overlay.setAttribute('visible', 'false');
      this.transitionTimer = null;
      if (scene.id === 1 || scene.id === 4) {
        this.setSceneIndex(scene.id, true);
      }
    }, 1000);
  }

  playNarration() {
    const scene = this.getCurrentScene();
    this.ensureAudioElement();

    if (this.audioEl && scene.audio) {
      this.stopNarration(false);
      if (this.storyId === 'franz') this.animateCharacterGesture('speak');
      if (this.storyId === 'abaroa') this.update3DScene(scene);
      const source = new URL(scene.audio, window.location.href).href;
      if (this.audioEl.src !== source) this.audioEl.src = source;
      this.audioEl.currentTime = 0;
      if (this.storyId === 'abaroa') {
        this.audioEl.ontimeupdate = () => this.updateAbaroaTimeline();
        this.audioEl.onended = () => {
          this.speechActive = false;
          this.stopCinematicSubtitles();
          this.notifyAudioState(false);
          this.finishAbaroaScene();
        };
      } else {
        this.audioEl.onended = () => {
          this.speechActive = false;
          this.stopCinematicSubtitles();
          this.notifyAudioState(false);
        };
      }
      this.audioEl.play().then(() => {
        this.speechActive = true;
        this.startCinematicSubtitles();
        this.notifyAudioState(true);
      }).catch((error) => {
        this.speechActive = false;
        this.stopCinematicSubtitles();
        this.notifyAudioState(false);
        if (this.storyId === 'abaroa') {
          console.warn('[Historia Viva] No se pudo iniciar el audio de Eduardo Abaroa; pulsa el control de narración para intentarlo de nuevo:', error);
          return;
        }
        this.playSpeechFallback(scene);
      });
      return;
    }

    this.playSpeechFallback(scene);
  }

  playSpeechFallback(scene) {
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta síntesis de voz.');
      return;
    }

    this.stopNarration(false);
    if (!scene.dialog || this.storyId === 'abaroa') {
      console.warn('[Historia Viva] La narración de esta escena no tiene una pista de audio válida.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(scene.dialog);
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('ES') || v.lang.includes('BO') || v.lang.includes('MX'));
    if (esVoice) utterance.voice = esVoice;
    utterance.lang = 'es-BO';
    utterance.rate = 0.92;
    utterance.pitch = 0.95;

    utterance.onstart = () => {
      this.speechActive = true;
      this.notifyAudioState(true);
    };

    utterance.onend = () => {
      this.speechActive = false;
      this.notifyAudioState(false);
    };

    utterance.onerror = () => {
      this.speechActive = false;
      this.notifyAudioState(false);
    };

    this.currentUtterance = utterance;
    this.animateCharacterGesture('speak');
    window.speechSynthesis.speak(utterance);
  }

  stopNarration(resetUi = true) {
    this.clearAbaroaTimeline();
    this.stopCinematicSubtitles();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl.onended = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speechActive = false;
    if (resetUi) this.notifyAudioState(false);
  }

  toggleNarration() {
    if (this.speechActive) {
      this.stopNarration();
    } else {
      this.playNarration();
    }
  }

  notifyAudioState(isPlaying) {
    const btn = document.getElementById('vr-audio-toggle');
    const label = document.getElementById('vr-audio-label');
    const icon = document.getElementById('vr-audio-icon');
    if (btn) btn.setAttribute('aria-pressed', String(isPlaying));
    if (label) {
      if (this.storyId === 'abaroa') {
        label.textContent = isPlaying ? 'Pausar narración de Abaroa' : 'Escuchar narración de Abaroa';
      } else {
        label.textContent = isPlaying ? 'Pausar a Franz Tamayo' : 'Escuchar a Franz Tamayo';
      }
    }
    if (icon) icon.textContent = isPlaying ? '⏸' : '▶';

    // Botón 3D dentro del visor VR
    const btn3D = document.querySelector('#vr-3d-audio-btn-text');
    if (btn3D) {
      btn3D.setAttribute('value', isPlaying ? 'PAUSAR VOZ' : 'NARRAR ESCENA');
    }

    // Sincronizar modulación oral con tamayo-animator
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    const model = aScene && aScene.querySelector('#vr-character-model');
    const animator = model && model.components && model.components['tamayo-animator'];
    if (animator) {
      animator.setTalking(isPlaying);
    }
  }

  async enterCardboardVR() {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;

    const button = document.getElementById('vr-btn-enter-cardboard');
    const enterViewer = async () => {
      if (typeof aScene.enterVR === 'function') {
        await aScene.enterVR();
      }
      if (aScene.is('vr-mode')) {
        this.disableCardboardStereo(aScene);
        document.getElementById('vr-view')?.classList.remove('is-gyro-view');
        this.unbindGyroscope();
        if (button) button.textContent = '🥽 Vista VR activa';
      } else {
        this.bindGyroscope();
        const stereoEnabled = this.enableCardboardStereo(aScene);
        document.getElementById('vr-view')?.classList.toggle('is-gyro-view', !stereoEnabled);
        if (button) button.textContent = stereoEnabled ? '📱 Estéreo Cardboard activo' : '📱 Vista 360° activa';
      }
    };

    const requestMotionPermission = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('Permiso de orientación denegado');
      }
      await enterViewer();
    };

    requestMotionPermission().catch((error) => {
      if (error && error.message === 'Permiso de orientación denegado') {
        if (button) button.textContent = 'Activa el giroscopio en permisos';
        return;
      }
      this.bindGyroscope();
      const stereoEnabled = this.enableCardboardStereo(aScene);
      document.getElementById('vr-view')?.classList.toggle('is-gyro-view', !stereoEnabled);
      if (button) button.textContent = stereoEnabled ? '📱 Estéreo Cardboard activo' : '📱 Vista 360° activa';
    });
  }

  animateCharacterGesture(kind = 'speak') {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    const model = aScene && aScene.querySelector('#vr-character-model');
    const animator = model && model.components && model.components['tamayo-animator'];
    if (animator) {
      const gestureMap = {
        speak: 'nod',
        walk: 'walk',
        indicate: 'think',
        wave: 'wave',
        think: 'think',
        nod: 'nod',
        celebrate: 'celebrate'
      };
      const gestureToPlay = gestureMap[kind] || kind;
      animator.play(gestureToPlay);
    }

    const character = aScene && aScene.querySelector('#vr-character-pose');
    const cue = aScene && aScene.querySelector('#vr-scene-cue');
    if (!character) return;

    character.removeAttribute('animation__gesture');
    if (kind === 'walk') {
      character.setAttribute('animation__gesture', 'property: rotation; from: -5 -7 0; to: 5 7 0; dir: alternate; dur: 320; loop: 6; easing: easeInOutSine');
    } else if (kind === 'indicate' || kind === 'think') {
      character.setAttribute('animation__gesture', 'property: rotation; from: -3 -10 0; to: 3 10 0; dir: alternate; dur: 460; loop: 3; easing: easeInOutSine');
    } else {
      character.setAttribute('animation__gesture', 'property: rotation; from: -2 -3 0; to: 2 3 0; dir: alternate; dur: 480; loop: 4; easing: easeInOutSine');
    }

    if (cue) {
      cue.setAttribute('animation__attention', 'property: scale; from: 1 1 1; to: 1.22 1.22 1.22; dir: alternate; dur: 300; loop: 3; easing: easeInOutSine');
    }
  }
}

window.tamayoVR = new TamayoVRExperience();
