/**
 * UNIFRANZ La Paz · Realidad Virtual Inmersiva: Bienvenida Histórica Unifranz La Paz
 * Controlador de las 5 etapas en 3D y modo Gafas VR (Stereo Cardboard / WebXR)
 */

window.TAMAYO_VR_SCENES = [
  {
    id: 1,
    number: '01',
    title: 'La Fachada e Historia',
    year: '1879 — 1993',
    phase: 'LA FACHADA E HISTORIA',
    visual: 'Edificio achaflanado de 6 pisos en La Paz, pórtico con columnas y 10 banderas ondeantes. Retrato histórico «1879 — 1993» flotando a la izquierda.',
    dialog: 'Bienvenidos a mi casa del saber... Soy Franz Tamayo. En 1993 mi nombre dio vida a Unifranz aquí en La Paz para transformar la educación superior de Bolivia.',
    audio: 'assets/audio/DIscursoPrincipal.mp3',
    nominalStart: 0,
    nominalEnd: 30,
    themeColor: '#d5aa46',
    skyColor: '#8ecae6',
    fogColor: '#cfe8f3'
  },
  {
    id: 2,
    number: '02',
    title: 'Modelo Aprender Haciendo',
    year: 'DESDE EL 1ER SEMESTRE',
    phase: 'APRENDER HACIENDO',
    visual: 'Tres nodos holográficos giratorios (TorusKnotGeometry) y paneles de cristal translúcidos alrededor del pórtico.',
    dialog: 'En Unifranz rompimos las aulas tradicionales para instaurar un modelo centrado en el estudiante: aprender haciendo desde el primer semestre.',
    audio: 'assets/audio/DIscursoPrincipal.mp3',
    nominalStart: 30,
    nominalEnd: 60,
    themeColor: '#f59e0b',
    skyColor: '#7ebce0',
    fogColor: '#c7e2f0'
  },
  {
    id: 3,
    number: '03',
    title: 'Ingeniería de Sistemas, IA y Robótica',
    year: 'INNOVACIÓN TECNOLÓGICA',
    phase: 'IA Y ROBÓTICA SUBACUÁTICA',
    visual: 'Holograma wireframe azul y naranja de un dron submarino autónomo (ROV) y una red neuronal 3D con conexiones pulsantes.',
    dialog: 'En Ingeniería de Sistemas e Inteligencia Artificial, nuestros estudiantes crean visión artificial, robótica subacuática autónoma y entornos de realidad virtual.',
    audio: 'assets/audio/DIscursoPrincipal.mp3',
    nominalStart: 60,
    nominalEnd: 95,
    themeColor: '#00d2ff',
    skyColor: '#1d4e78',
    fogColor: '#255c8a'
  },
  {
    id: 4,
    number: '04',
    title: 'Ciencias de la Salud y Simulación',
    year: 'ALTA FIDELIDAD CLÍNICA',
    phase: 'SALUD Y CLÍNICA ODONTOLÓGICA',
    visual: 'Estructura médica y odontológica interactiva en 3D acompañada de doble hélice clínica y partículas verdes y blancas.',
    dialog: 'En Ciencias de la Salud y nuestra Clínica Odontológica, combinamos simulación de alta fidelidad con gestión digital avanzada al servicio de La Paz.',
    audio: 'assets/audio/DIscursoPrincipal.mp3',
    nominalStart: 95,
    nominalEnd: 125,
    themeColor: '#10b981',
    skyColor: '#4da6b8',
    fogColor: '#8ad0d8'
  },
  {
    id: 5,
    number: '05',
    title: 'Cierre y Apertura de Puertas',
    year: 'BIENVENIDOS A UNIFRANZ',
    phase: 'EL FUTURO SE CONSTRUYE',
    visual: 'Franz Tamayo invita dando un paso lateral; las puertas de vidrio bajo «Universidad Franz Tamayo» se deslizan y la cámara entra al portal luminoso.',
    dialog: 'El futuro no se espera: se construye. Bienvenidos a la innovación, bienvenidos a Unifranz.',
    audio: 'assets/audio/DIscursoPrincipal.mp3',
    nominalStart: 125,
    nominalEnd: 155,
    themeColor: '#fbbf24',
    skyColor: '#8ecae6',
    fogColor: '#dcecf5'
  }
];

class TamayoVRExperience {
  constructor() {
    this.storyId = 'franz';
    this.currentIndex = 0;
    this.speechActive = false;
    this.audioEl = null;
    this.subtitleFrameId = null;
    this.activeSubtitleIndex = -1;
    this.gyroEnabled = false;
    this.gyroHandler = this.handleGyroscope.bind(this);
    this.ensureAudioElement();

    window.addEventListener('historia:select-scene', (e) => {
      const vrView = document.getElementById('vr-view');
      if (vrView && vrView.getAttribute('aria-hidden') === 'false' && e.detail && typeof e.detail.index === 'number') {
        this.setSceneIndex(e.detail.index, true);
      }
    });

    window.addEventListener('unifranz:stage-changed', (e) => {
      const vrView = document.getElementById('vr-view');
      if (!vrView || vrView.getAttribute('aria-hidden') !== 'false' || !e.detail) return;
      if (Number.isInteger(e.detail.index) && e.detail.index !== this.currentIndex) {
        this.setSceneIndex(e.detail.index, false, true);
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
    const sharedAudio = document.getElementById('narration-audio');
    if (sharedAudio) {
      this.audioEl = sharedAudio;
      return sharedAudio;
    }
    const audio = document.createElement('audio');
    audio.id = 'vr-scene-audio';
    audio.src = 'assets/audio/DIscursoPrincipal.mp3';
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    document.body.appendChild(audio);
    this.audioEl = audio;
    return audio;
  }

  getUnifranzManager() {
    const root = document.querySelector('#vr-scene #unifranz-vr-root');
    const comp = root && root.components && root.components['unifranz-welcome-experience'];
    return (comp && comp.manager) || window.UnifranzActiveManager || null;
  }

  handleGyroscope(event) {
    if (!this.gyroEnabled) return;
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene');
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
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene');
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

  getScenes() {
    return window.TAMAYO_VR_SCENES;
  }

  getCurrentScene() {
    return this.getScenes()[this.currentIndex];
  }

  setSceneIndex(index, updateAudio = true, fromManager = false) {
    if (!Number.isInteger(index) || index < 0 || index >= this.getScenes().length) return;
    const prevIndex = this.currentIndex;
    const travelDir = index >= prevIndex ? 'forward' : 'backward';
    this.currentIndex = index;
    const scene = this.getCurrentScene();

    this.updateHUD(scene);
    this.update3DScene(scene, fromManager);

    if (index !== prevIndex && window.HistoriaFX && window.HistoriaFX.whoosh) {
      window.HistoriaFX.whoosh(travelDir, 1.5);
    }

    window.dispatchEvent(new CustomEvent('historia:scene-changed', {
      detail: { index, storyId: 'franz' }
    }));

    if (updateAudio && this.speechActive) {
      this.playNarration();
    }

    document.dispatchEvent(new CustomEvent('tamayo-scene-changed', {
      detail: { scene, index: this.currentIndex, storyId: 'franz' }
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

    if (badge) badge.textContent = `ETAPA ${scene.number} / 05 · ${scene.year}`;
    if (title) title.textContent = scene.title;
    if (phase) phase.textContent = scene.phase;
    if (dialogPreview) dialogPreview.textContent = `«${scene.dialog}»`;
    if (visualText) visualText.textContent = scene.visual;

    pills.forEach((pill, idx) => {
      pill.hidden = false;
      const isActive = idx === this.currentIndex;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-selected', String(isActive));
    });
  }

  startCinematicSubtitles() {
    this.stopCinematicSubtitles();
    const update = () => {
      if (!this.speechActive || !this.audioEl) return;
      const scene = this.getCurrentScene();
      const caption = document.getElementById('vr-cinematic-subtitle');
      if (caption && scene) {
        caption.hidden = false;
        caption.classList.add('is-visible');
        caption.textContent = scene.dialog;
      }
      this.subtitleFrameId = window.requestAnimationFrame(update);
    };
    update();
  }

  stopCinematicSubtitles() {
    if (this.subtitleFrameId !== null) {
      window.cancelAnimationFrame(this.subtitleFrameId);
      this.subtitleFrameId = null;
    }
    const caption = document.getElementById('vr-cinematic-subtitle');
    if (caption) {
      caption.classList.remove('is-visible');
      caption.textContent = '';
      caption.hidden = true;
    }
  }

  update3DScene(scene, fromManager = false) {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene');
    if (!aScene) return;

    const sky = aScene.querySelector('#vr-lapaz-sky') || aScene.querySelector('a-sky');
    if (sky) sky.setAttribute('color', scene.skyColor);
    if (aScene.hasAttribute('fog')) {
      aScene.setAttribute('fog', `type: exponential; color: ${scene.fogColor}; density: 0.008`);
    }

    const vrTitle3D = aScene.querySelector('#vr-3d-scene-title');
    const vrDialog3D = aScene.querySelector('#vr-3d-scene-dialog');
    const vrPhase3D = aScene.querySelector('#vr-3d-scene-phase');
    if (vrTitle3D) vrTitle3D.setAttribute('value', `ETAPA ${scene.number}: ${scene.title.toUpperCase()}`);
    if (vrPhase3D) {
      vrPhase3D.setAttribute('value', `[ ${scene.phase} · ${scene.year} ]`);
      vrPhase3D.setAttribute('color', scene.themeColor);
    }
    if (vrDialog3D) vrDialog3D.setAttribute('value', `«${scene.dialog}»`);

    const vrRoot = aScene.querySelector('#unifranz-vr-root');
    if (vrRoot) {
      vrRoot.setAttribute('unifranz-welcome-experience', 'stage', scene.id - 1);
    }
    const manager = this.getUnifranzManager();
    if (manager && !fromManager && manager.currentStageIndex !== scene.id - 1) {
      manager.goToStage(scene.id - 1, true);
    }
  }

  playNarration() {
    const scene = this.getCurrentScene();
    this.ensureAudioElement();
    const manager = this.getUnifranzManager();

    if (manager && typeof manager.playAudioFromCurrentStage === 'function') {
      manager.playAudioFromCurrentStage()
        .then(() => {
          this.speechActive = true;
          this.startCinematicSubtitles();
          this.notifyAudioState(true);
        })
        .catch(() => {
          this.speechActive = false;
          this.stopCinematicSubtitles();
          this.notifyAudioState(false);
        });
    } else if (this.audioEl) {
      const mainSrc = 'assets/audio/DIscursoPrincipal.mp3';
      if (this.audioEl.getAttribute('src') !== mainSrc) this.audioEl.src = mainSrc;
      this.audioEl.play()
        .then(() => {
          this.speechActive = true;
          this.startCinematicSubtitles();
          this.notifyAudioState(true);
        })
        .catch(() => {
          this.speechActive = false;
          this.stopCinematicSubtitles();
          this.notifyAudioState(false);
        });
    }

    if (this.audioEl) {
      this.audioEl.onended = () => {
        this.speechActive = false;
        this.stopCinematicSubtitles();
        this.notifyAudioState(false);
      };
    }
  }

  stopNarration(resetUi = true) {
    this.stopCinematicSubtitles();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.onended = null;
    }
    this.speechActive = false;
    if (resetUi) this.notifyAudioState(false);
  }

  toggleNarration() {
    if (this.speechActive || (this.audioEl && !this.audioEl.paused)) {
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
    if (label) label.textContent = isPlaying ? 'Pausar Discurso' : 'Escuchar Discurso';
    if (icon) icon.textContent = isPlaying ? '⏸' : '▶';

    const btn3D = document.querySelector('#vr-3d-audio-btn-text');
    if (btn3D) btn3D.setAttribute('value', isPlaying ? 'PAUSAR VOZ' : 'NARRAR ETAPA');
  }

  async enterCardboardVR() {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene');
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
}

document.addEventListener('DOMContentLoaded', () => {
  window.tamayoVR = new TamayoVRExperience();
});
