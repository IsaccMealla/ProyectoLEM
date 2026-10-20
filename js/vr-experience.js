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

class TamayoVRExperience {
  constructor() {
    this.currentIndex = 0;
    this.speechActive = false;
    this.currentUtterance = null;
    this.sceneReady = false;
    this.audioEl = null;
    this.gyroEnabled = false;
    this.lastGyroYaw = 0;
    this.lastGyroPitch = 0;
    this.gyroHandler = this.handleGyroscope.bind(this);
    this.ensureAudioElement();
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
    return window.TAMAYO_VR_SCENES[this.currentIndex];
  }

  setSceneIndex(index, updateAudio = true) {
    if (index < 0 || index >= window.TAMAYO_VR_SCENES.length) return;
    const prevIndex = this.currentIndex;
    const isSceneChange = (index !== prevIndex);
    const travelDir = (index >= prevIndex) ? 'forward' : 'backward';

    this.currentIndex = index;
    const scene = this.getCurrentScene();

    this.updateHUD(scene);
    this.update3DScene(scene);

    // ⚡ Efectos de Salto en la Máquina del Tiempo
    if (isSceneChange) {
      if (window.HistoriaFX && window.HistoriaFX.whoosh) {
        window.HistoriaFX.whoosh(travelDir, 2.0);
      }
      const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
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
      }

      const gestures = ['wave', 'think', 'nod', 'walk', 'celebrate'];
      this.animateCharacterGesture(gestures[index % gestures.length]);
    }

    this.ensureAudioElement();
    if (this.audioEl) {
      this.audioEl.src = scene.audio || '';
      this.audioEl.load();
    }

    if (updateAudio && this.speechActive) {
      this.playNarration();
    }

    document.dispatchEvent(new CustomEvent('tamayo-scene-changed', {
      detail: { scene, index: this.currentIndex }
    }));
  }

  nextScene() {
    const nextIndex = (this.currentIndex + 1) % window.TAMAYO_VR_SCENES.length;
    this.setSceneIndex(nextIndex);
  }

  prevScene() {
    const prevIndex = (this.currentIndex - 1 + window.TAMAYO_VR_SCENES.length) % window.TAMAYO_VR_SCENES.length;
    this.setSceneIndex(prevIndex);
  }

  updateHUD(scene) {
    const badge = document.getElementById('vr-scene-badge');
    const title = document.getElementById('vr-scene-title');
    const phase = document.getElementById('vr-scene-phase');
    const dialogPreview = document.getElementById('vr-dialog-text');
    const visualText = document.getElementById('vr-visual-desc');
    const pills = document.querySelectorAll('.scene-pill');

    if (badge) badge.textContent = `ESCENA ${scene.number} / 05 · ${scene.year}`;
    if (title) title.innerHTML = `${scene.title}`;
    if (phase) phase.textContent = scene.phase;
    if (dialogPreview) dialogPreview.textContent = `"${scene.dialog}"`;
    if (visualText) visualText.textContent = scene.visual;

    pills.forEach((pill, idx) => {
      const isActive = idx === this.currentIndex;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-selected', String(isActive));
    });
  }

  update3DScene(scene) {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;

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
  }

  playNarration() {
    const scene = this.getCurrentScene();
    this.ensureAudioElement();

    if (this.audioEl && scene.audio) {
      this.stopNarration(false);
      this.animateCharacterGesture('speak');
      this.audioEl.src = scene.audio;
      this.audioEl.currentTime = 0;
      this.audioEl.play().then(() => {
        this.speechActive = true;
        this.notifyAudioState(true);
      }).catch(() => {
        this.playSpeechFallback(scene);
      });
      this.audioEl.onended = () => {
        this.speechActive = false;
        this.notifyAudioState(false);
      };
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
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
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
    if (label) label.textContent = isPlaying ? 'Pausar a Franz Tamayo' : 'Escuchar a Franz Tamayo';
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
      animator.play(gestureMap[kind] || kind);
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
