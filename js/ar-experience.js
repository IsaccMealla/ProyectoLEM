/**
 * Historia Viva · Recorridos AR con cámara real (estilo Pokémon GO, sin marcador)
 * ---------------------------------------------------------------------------
 * - Visualización inmersiva en el mundo real mediante la cámara del móvil y giroscopio.
 * - Sin necesidad de marcadores impresos ni códigos QR.
 * - Bloqueo geográfico con Radar y Algoritmo de Ruta Más Corta (Dijkstra + OSRM API):
 *   Si el usuario está lejos, le muestra por dónde ir paso a paso y en el Mini-Mapa en vivo.
 * - Incluye recorridos de Franz Tamayo y Eduardo Abaroa, con cinco escenas cada uno.
 * - Escenarios de Abaroa con utilería, partículas y animación ambiental por escena.
 * - Franz conserva sus animaciones y estaciones históricas.
 * - Cada escena puede reproducir un video flotante local.
 */
(function () {
  'use strict';

  const arView = document.getElementById('ar-view');
  const arSceneTemplate = document.getElementById('ar-scene-template');
  const arLoading = document.getElementById('ar-loading');
  const pokearVideo = document.getElementById('pokear-video');
  const audio = document.getElementById('narration-audio');

  // Elementos de la interfaz minimalista Pokémon GO
  const statusPill = document.getElementById('ar-status-pill');
  const btnSimulate = document.getElementById('ar-btn-simulate');
  const btnToggleMinimap = document.getElementById('ar-btn-toggle-minimap');
  const minimapDrawer = document.getElementById('ar-minimap-drawer');
  const minimapClose = document.getElementById('ar-minimap-close');
  const bottomCard = document.getElementById('ar-bottom-card');
  const btnToggleBottomCard = document.getElementById('ar-btn-toggle-bottom-card');
  const bottomCardContent = document.getElementById('ar-bottom-card-content');

  const radarOverlay = document.getElementById('ar-radar-overlay');
  const radarDistEl = document.getElementById('ar-radar-distance');
  const radarTargetEl = document.getElementById('ar-radar-target');
  const radarSimulateBtn = document.getElementById('ar-radar-simulate-btn');
  const radarWalkRouteBtn = document.getElementById('ar-radar-walk-route-btn');

  // Tarjeta inferior minimalista
  const hudSceneNumber = document.getElementById('ar-hud-scene-number');
  const hudSceneTitle = document.getElementById('ar-hud-scene-title');
  const hudScenePeriod = document.getElementById('ar-hud-scene-period');
  const hudSceneText = document.getElementById('ar-hud-scene-text');
  const hudProgressBar = document.getElementById('ar-hud-progress-bar');
  const storySelect = document.getElementById('ar-story-select');

  // Controles de escena
  const btnPrev = document.getElementById('ar-btn-prev');
  const btnAudio = document.getElementById('ar-btn-audio');
  const btnAudioIcon = document.getElementById('ar-btn-audio-icon');
  const btnAudioLabel = document.getElementById('ar-btn-audio-label');
  const btnNext = document.getElementById('ar-btn-next');

  const stories = window.HistoriaVivaStories || {};
  let currentStoryId = 'franz';
  let scenes = stories.franz ? stories.franz.scenes : (window.HistoriaVivaScenes || []);
  let aSceneInstance = null;
  let videoStream = null;
  let currentSceneIndex = 0;
  let isAudioPlaying = false;
  let startedGPSForAR = false;
  let arGeoOrigin = null;
  let arFilteredCoordinates = null;
  let arInitialHeading = null;

  function getRealUserCoordinates() {
    const geoState = window.HistoriaGeo && window.HistoriaGeo.getState
      ? window.HistoriaGeo.getState()
      : null;
    return geoState && geoState.userCoords && !geoState.isSimulated ? geoState.userCoords : null;
  }

  function projectGeoCoordinates(coords) {
    if (!arGeoOrigin) return null;
    const radians = Math.PI / 180;
    const earthRadius = 6378137;
    const north = (coords.lat - arGeoOrigin.lat) * radians * earthRadius;
    const east = (coords.lng - arGeoOrigin.lng) * radians * earthRadius
      * Math.cos(arGeoOrigin.lat * radians);
    const heading = (arInitialHeading || 0) * radians;
    return {
      x: east * Math.cos(heading) - north * Math.sin(heading),
      z: -(east * Math.sin(heading) + north * Math.cos(heading))
    };
  }

  function updateGeographicAnchor(coords = getRealUserCoordinates()) {
    if (!coords || !aSceneInstance) return;
    if (!arGeoOrigin) arGeoOrigin = { lat: coords.lat, lng: coords.lng };
    if (!arFilteredCoordinates) {
      arFilteredCoordinates = { lat: coords.lat, lng: coords.lng };
    } else {
      const latScale = 111320;
      const lngScale = latScale * Math.cos(arFilteredCoordinates.lat * Math.PI / 180);
      const deltaX = (coords.lng - arFilteredCoordinates.lng) * lngScale;
      const deltaZ = (coords.lat - arFilteredCoordinates.lat) * latScale;
      const displacement = Math.hypot(deltaX, deltaZ);
      const noiseThreshold = Math.max(1.5, (coords.accuracy || 15) * 0.25);
      if (displacement > noiseThreshold) {
        const smoothing = 0.35;
        arFilteredCoordinates.lat += (coords.lat - arFilteredCoordinates.lat) * smoothing;
        arFilteredCoordinates.lng += (coords.lng - arFilteredCoordinates.lng) * smoothing;
      }
    }
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    const userPosition = projectGeoCoordinates(arFilteredCoordinates);
    if (cameraRig && userPosition) {
      cameraRig.object3D.position.x = userPosition.x;
      cameraRig.object3D.position.z = userPosition.z;
      cameraRig.object3D.updateMatrixWorld(true);
    }

    const anchor = getWorldAnchor();
    const sceneCoordinates = window.HistoriaGeo?.getSceneCoordinates
      && window.HistoriaGeo.getSceneCoordinates(currentStoryId, currentSceneIndex);
    if (!anchor || !sceneCoordinates) return;
    const scenePosition = projectGeoCoordinates({ lat: sceneCoordinates[0], lng: sceneCoordinates[1] });
    if (!scenePosition) return;
    anchor.object3D.position.set(scenePosition.x, 0, scenePosition.z - 2.6);
    anchor.object3D.updateMatrixWorld(true);
  }

  function getCompassHeading(event) {
    if (Number.isFinite(event.webkitCompassHeading)) return event.webkitCompassHeading;
    if (!Number.isFinite(event.alpha)) return null;
    const screenAngle = window.screen.orientation?.angle || window.orientation || 0;
    return (360 - event.alpha + screenAngle + 360) % 360;
  }

  function handleARDeviceOrientation(event) {
    if (arInitialHeading !== null) return;
    const heading = getCompassHeading(event);
    if (heading === null) return;
    arInitialHeading = heading;
    updateGeographicAnchor();
  }

  function requestAROrientationPermission() {
    const OrientationEvent = window.DeviceOrientationEvent;
    if (!OrientationEvent) return Promise.resolve(false);
    let requested;
    try {
      requested = typeof OrientationEvent.requestPermission === 'function'
        ? OrientationEvent.requestPermission()
        : Promise.resolve('granted');
    } catch (error) {
      console.warn('[Historia Viva] No se pudo solicitar acceso a la orientación del dispositivo:', error);
      return Promise.resolve(false);
    }
    return Promise.resolve(requested).then((permission) => {
      if (permission !== 'granted') return false;
      window.addEventListener('deviceorientation', handleARDeviceOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleARDeviceOrientation, true);
      return true;
    }).catch((error) => {
      console.warn('[Historia Viva] No se concedió acceso a la orientación del dispositivo:', error);
      return false;
    });
  }

  window.addEventListener('historia:gps-position', (event) => {
    if (!event.detail || !Number.isFinite(event.detail.lat) || !Number.isFinite(event.detail.lng)) return;
    updateGeographicAnchor(event.detail);
    syncSitePresence();
  });

  window.addEventListener('historia:gps-error', (event) => {
    if (statusPill) {
      statusPill.classList.remove('is-in-range');
      statusPill.classList.add('is-out-of-range');
      statusPill.textContent = event.detail && event.detail.message
        ? `📍 ${event.detail.message}`
        : '📍 Permite la ubicación para anclar las escenas AR';
    }
  });

  if (window.AFRAME && !AFRAME.components['abaroa-scene-motion']) {
    AFRAME.registerComponent('abaroa-scene-motion', {
      schema: {
        scene: { type: 'int', default: 0 },
        active: { type: 'boolean', default: false }
      },

      init() {
        this.phase = 0;
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.armUniforms = [];
        this.armPose = { left: 0.62, right: -0.62 };
        this.onModelLoaded = () => this.installArmAnimation();
        this.el.addEventListener('model-loaded', this.onModelLoaded);
        this.installArmAnimation();
      },

      remove() {
        this.el.removeEventListener('model-loaded', this.onModelLoaded);
      },

      installArmAnimation() {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;
        this.armUniforms = [];
        mesh.traverse((node) => {
          if (!node.isMesh) return;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          const animatedMaterials = materials.map((source) => {
            if (!source || source.userData.abaroaArmAnimation) return source;
            const material = source.clone();
            material.userData.abaroaArmAnimation = true;
            const previousCompile = material.onBeforeCompile;
            const armPose = this.armPose;
            const armUniforms = this.armUniforms;
            material.onBeforeCompile = (shader, renderer) => {
              if (previousCompile) previousCompile(shader, renderer);
              shader.uniforms.uAbaroaArmLeft = { value: armPose.left };
              shader.uniforms.uAbaroaArmRight = { value: armPose.right };
              armUniforms.push(shader.uniforms);
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uAbaroaArmLeft;
                uniform float uAbaroaArmRight;`
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                  float abaroaSide = sign(position.x);
                  float abaroaArmMask = smoothstep(0.13, 0.22, abs(position.x))
                    * (1.0 - smoothstep(0.67, 0.76, position.y))
                    * smoothstep(0.31, 0.4, position.y);
                  float abaroaArmAngle = mix(uAbaroaArmLeft, uAbaroaArmRight, step(0.0, position.x));
                  float abaroaCos = cos(abaroaArmAngle);
                  float abaroaSin = sin(abaroaArmAngle);
                  vec2 abaroaPivot = vec2(abaroaSide * 0.14, 0.66);
                  vec2 abaroaArmPosition = transformed.xy - abaroaPivot;
                  vec2 abaroaRotatedArm = mat2(abaroaCos, abaroaSin, -abaroaSin, abaroaCos)
                    * abaroaArmPosition + abaroaPivot;
                  transformed.xy = mix(transformed.xy, abaroaRotatedArm, abaroaArmMask);
                `
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <beginnormal_vertex>',
                `#include <beginnormal_vertex>
                  float abaroaNormalSide = sign(position.x);
                  float abaroaNormalMask = smoothstep(0.13, 0.22, abs(position.x))
                    * (1.0 - smoothstep(0.67, 0.76, position.y))
                    * smoothstep(0.31, 0.4, position.y);
                  float abaroaNormalAngle = mix(uAbaroaArmLeft, uAbaroaArmRight, step(0.0, position.x));
                  float abaroaNormalCos = cos(abaroaNormalAngle);
                  float abaroaNormalSin = sin(abaroaNormalAngle);
                  vec2 abaroaArmNormal = mat2(abaroaNormalCos, abaroaNormalSin,
                    -abaroaNormalSin, abaroaNormalCos) * objectNormal.xy;
                  objectNormal.xy = mix(objectNormal.xy, abaroaArmNormal, abaroaNormalMask);
                `
              );
            };
            material.customProgramCacheKey = () => 'abaroa-arm-motion-v1';
            material.needsUpdate = true;
            return material;
          });
          node.material = Array.isArray(node.material) ? animatedMaterials : animatedMaterials[0];
        });
      },

      update(oldData) {
        if (oldData.scene !== this.data.scene) this.phase = 0;
      },

      tick(time, delta) {
        if (!this.data.active) return;
        this.phase += Math.min(delta || 16, 50) / 1000;

        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 60;
        const progress = audio.duration > 0 ? audio.currentTime / duration : (this.phase % 60) / 60;
        const idle = Math.sin(this.phase * 1.7);
        const poses = [
          [[0, 0, 0, 0, 0, 0, 0], [0.24, 0, 0.02, 0, -0.04, -0.14, 0], [0.48, 0, 0, 0, 0, 0.12, 0], [0.72, 0, 0.015, 0, -0.03, -0.08, 0], [1, 0, 0, 0, 0, 0, 0]],
          [[0, 0, 0, 0, 0, 0, 0], [0.2, 0, 0, 0.05, -0.08, -0.22, 0.02], [0.42, 0, 0, 0, 0, 0.04, 0], [0.63, 0, -0.035, 0.02, -0.12, -0.08, 0.03], [0.78, 0, 0.025, 0, 0.08, 0.08, -0.02], [1, 0, 0, 0, 0, 0, 0]],
          [[0, 0, 0, 0, 0, 0, 0], [0.12, 0, -0.24, 0, -0.18, 0.08, 0], [0.3, 0, -0.27, -0.04, -0.2, -0.16, -0.03], [0.72, 0, -0.27, -0.04, -0.18, 0.12, 0.03], [0.86, 0, 0, -0.45, -0.08, 0, 0], [1, 0, 0, -0.45, 0, 0, 0]],
          [[0, 0, -0.22, 0, 0.04, 0, -0.16], [0.3, 0, -0.2, 0, 0.04, -0.06, -0.13], [0.52, 0, 0.015, 0, -0.08, 0, 0], [0.72, 0, 0.015, 0, -0.08, 0, 0], [0.88, 0, -0.76, -0.18, 1.22, 0, 0.48], [1, 0, -0.76, -0.18, 1.22, 0, 0.48]],
          [[0, 0, 0, 0, 0, 0, 0], [0.25, 0, 0.015, 0, -0.035, -0.08, 0], [0.5, 0, 0, 0, 0.02, 0.08, 0], [0.75, 0, 0.015, 0, -0.035, -0.05, 0], [1, 0, 0, 0, 0, 0, 0]]
        ];
        const frames = poses[this.data.scene] || poses[0];
        let next = frames.findIndex((frame) => frame[0] >= progress);
        if (next < 0) next = frames.length - 1;
        const before = frames[Math.max(0, next - 1)];
        const after = frames[next];
        const span = Math.max(0.001, after[0] - before[0]);
        const amount = Math.max(0, Math.min(1, (progress - before[0]) / span));

        for (let index = 1; index < 7; index++) {
          const value = before[index] + (after[index] - before[index]) * amount;
          if (index <= 3) this.position.setComponent(index - 1, value);
          else this.rotation[['x', 'y', 'z'][index - 4]] = value;
        }

        if (this.data.scene === 2 && progress > 0.32 && progress < 0.8) {
          const recoil = Math.max(0, Math.sin(audio.currentTime * 5.2)) * 0.035;
          this.position.y -= recoil;
          this.rotation.x -= recoil * 1.8;
        }
        if (this.data.scene !== 3 || progress < 0.86) {
          this.position.y += idle * 0.008;
          this.rotation.y += Math.sin(this.phase * 0.55) * 0.012;
        }
        const armFrames = [
          [[0, 0.62, -0.62], [0.25, 0.12, -0.35], [0.46, 0.62, -0.62], [0.7, 0.5, -0.52], [1, 0.62, -0.62]],
          [[0, 0.62, -0.62], [0.2, -0.12, -0.5], [0.42, 0.1, -0.22], [0.63, 0.85, -0.62], [0.8, 0.22, -0.32], [1, 0.62, -0.62]],
          [[0, 0.62, -0.62], [0.12, 0.2, -0.28], [0.3, 0.04, -0.12], [0.72, 0.04, -0.12], [0.86, 0.82, -0.92], [1, 0.82, -0.92]],
          [[0, 1.05, -0.18], [0.3, 1.05, -0.18], [0.52, 0.48, -0.52], [0.72, 0.48, -0.52], [0.88, -0.45, -1.35], [1, -0.45, -1.35]],
          [[0, 0.62, -0.62], [0.25, 0.3, -0.5], [0.5, 0.62, -0.62], [0.75, 0.3, -0.5], [1, 0.62, -0.62]]
        ][this.data.scene] || [[0, 0.62, -0.62], [1, 0.62, -0.62]];
        let armNext = armFrames.findIndex((frame) => frame[0] >= progress);
        if (armNext < 0) armNext = armFrames.length - 1;
        const armBefore = armFrames[Math.max(0, armNext - 1)];
        const armAfter = armFrames[armNext];
        const armSpan = Math.max(0.001, armAfter[0] - armBefore[0]);
        const armAmount = Math.max(0, Math.min(1, (progress - armBefore[0]) / armSpan));
        this.armPose.left = armBefore[1] + (armAfter[1] - armBefore[1]) * armAmount;
        this.armPose.right = armBefore[2] + (armAfter[2] - armBefore[2]) * armAmount;
        this.armUniforms.forEach((uniforms) => {
          uniforms.uAbaroaArmLeft.value = this.armPose.left;
          uniforms.uAbaroaArmRight.value = this.armPose.right;
        });
        this.el.object3D.position.copy(this.position);
        this.el.object3D.rotation.copy(this.rotation);
      }
    });

    AFRAME.registerComponent('abaroa-stage-motion', {
      schema: { scene: { type: 'int', default: 0 } },

      init() {
        this.lastShot = -1;
        this.onAudioEnded = () => {
          if (this.data.scene !== 1) return;
          const portal = this.el.querySelector('#abaroa-topater-portal');
          if (portal) portal.setAttribute('visible', 'true');
        };
        audio.addEventListener('ended', this.onAudioEnded);
      },

      update(oldData) {
        if (oldData.scene !== this.data.scene) {
          this.lastShot = -1;
          const portal = this.el.querySelector('#abaroa-topater-portal');
          if (portal) portal.setAttribute('visible', 'false');
          const strategy = this.el.querySelector('[data-abaroa-scene="1"]');
          if (strategy) {
            delete strategy.dataset.cabreraPointed;
            delete strategy.dataset.abaroaReply;
          }
          const resistance = this.el.querySelector('[data-abaroa-scene="3"]');
          if (resistance) delete resistance.dataset.challengePlayed;
          if (this.data.scene === 0) {
            ['#abaroa-route-ring', '#abaroa-map-scan', '[data-abaroa-route-marker]'].forEach((selector) => {
              this.el.querySelectorAll(selector).forEach((entity) => entity.setAttribute('visible', 'false'));
            });
          }
        }
      },

      remove() {
        audio.removeEventListener('ended', this.onAudioEnded);
      },

      tick(time) {
        if (!isARLocationAvailable()) return;
        const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
        const figure = this.el.parentElement && this.el.parentElement.querySelector('#eduardo-abaroa-figure');
        if (figure) {
          const revealFigure = this.data.scene !== 0 || audio.currentTime >= 24;
          if (figure.object3D.visible !== revealFigure) figure.setAttribute('visible', String(revealFigure));
        }
        if (this.data.scene === 0) {
          const routeVisible = audio.currentTime >= 15;
          this.el.querySelectorAll('#abaroa-route-ring, #abaroa-map-scan, [data-abaroa-route-marker]').forEach((entity) => {
            if (entity.object3D.visible !== routeVisible) entity.setAttribute('visible', String(routeVisible));
          });
          return;
        }
        if (audio.paused) return;
        if (this.data.scene === 1) {
          const strategy = this.el.querySelector('[data-abaroa-scene="1"]');
          if (strategy && audio.duration > 0) {
            const strategyProgress = audio.currentTime / audio.duration;
            const cabrera = this.el.querySelector('#abaroa-cabrera');
            const gesture = cabrera && cabrera.components && cabrera.components['npc-person'];
            if (strategyProgress >= 0.3 && strategy.dataset.cabreraPointed !== 'true') {
              strategy.dataset.cabreraPointed = 'true';
              if (gesture) gesture.playGesture('point', 2.8);
            }
            if (strategyProgress >= 0.58 && strategy.dataset.abaroaReply !== 'true') {
              strategy.dataset.abaroaReply = 'true';
              if (gesture) gesture.playGesture('nod', 2.2);
            }
          }
          return;
        }
        if (this.data.scene === 2) {
          const defenders = this.el.querySelectorAll('[data-abaroa-retreat]');
          defenders.forEach((defender, index) => {
            const startX = Number(defender.dataset.abaroaRetreatStartX);
            const retreat = Math.max(0, Math.min(1, (progress - 0.76) / 0.2));
            const target = startX - retreat * (1.1 + index * 0.18);
            defender.object3D.position.x += (target - defender.object3D.position.x) * 0.025;
          });
          const shot = progress > 0.08 && progress < 0.78 ? Math.floor(audio.currentTime / 2.3) : -1;
          const muzzleFlash = this.el.querySelector('#abaroa-muzzle-flash');
          if (shot !== -1 && shot !== this.lastShot && muzzleFlash) {
            this.lastShot = shot;
            muzzleFlash.emit('abaroa-shot');
          }
        } else if (this.data.scene === 3) {
          if (progress >= 0.52) {
            const resistance = this.el.querySelector('[data-abaroa-scene="3"]');
            const officer = resistance && resistance.querySelector('#abaroa-final-officer');
            const gesture = officer && officer.components && officer.components['npc-person'];
            if (resistance && resistance.dataset.challengePlayed !== 'true') {
              resistance.dataset.challengePlayed = 'true';
              if (gesture) gesture.playGesture('point', 2.5);
            }
          }
          const volleyWindow = progress >= 0.74 && progress < 0.9;
          const flashOn = volleyWindow && time % 950 < 180;
          const officers = this.el.querySelectorAll('[data-abaroa-volley-flash]');
          officers.forEach((flash) => {
            if (flash.object3D.visible === flashOn) return;
            flash.setAttribute('visible', String(flashOn));
            if (flashOn) flash.emit('abaroa-shot');
          });
        }
      }
    });

    AFRAME.registerComponent('abaroa-model-formation', {
      schema: {
        role: { default: 'colorado', oneOf: ['colorado', 'chilean'] },
        scene: { type: 'int', default: 0 },
        active: { type: 'boolean', default: false }
      },

      init() {
        this.source = document.createElement('a-entity');
        this.source.setAttribute('visible', 'true');
        this.source.setAttribute('scale', '1.7 1.7 1.7');
        this.el.appendChild(this.source);
        this.actors = [];
        this.loaded = false;
        this.loading = false;
        this.time = 0;
        this.onModelLoaded = () => this.buildFormation();
        this.onModelError = (event) => {
          this.loading = false;
          console.error(`[Historia Viva] No se pudo cargar el modelo de la formación ${this.data.role}:`, event.detail);
        };
        this.source.addEventListener('model-loaded', this.onModelLoaded);
        this.source.addEventListener('model-error', this.onModelError);
        this.updateFormationVisibility();
      },

      update() {
        this.updateFormationVisibility();
      },

      remove() {
        this.source.removeEventListener('model-loaded', this.onModelLoaded);
        this.source.removeEventListener('model-error', this.onModelError);
        this.source.remove();
        this.actors.slice(1).forEach((actor) => {
          this.el.object3D.remove(actor);
        });
      },

      updateFormationVisibility() {
        const sceneMatches = this.data.role === 'colorado'
          ? this.data.scene === 1 || this.data.scene === 2
          : this.data.scene === 2 || this.data.scene === 3;
        const visible = this.data.active && sceneMatches;
        this.el.setAttribute('visible', String(visible));
        if (visible && !this.loaded && !this.loading) {
          this.loading = true;
          const modelPath = this.data.role === 'colorado'
            ? 'assets/models/colorado.glb'
            : 'assets/models/Soldado Chileno.glb';
          this.source.setAttribute('gltf-model', modelPath);
        }
      },

      buildFormation() {
        if (this.loaded) return;
        const model = this.source.getObject3D('mesh');
        if (!model) {
          this.loading = false;
          console.error(`[Historia Viva] El modelo ${this.data.role} cargó sin una malla utilizable.`);
          return;
        }

        const count = 1;
        this.actors = [this.source.object3D];
        for (let index = 1; index < count; index++) {
          const actor = model.clone(true);
          actor.visible = true;
          actor.scale.setScalar(1.7);
          this.el.object3D.add(actor);
          this.actors.push(actor);
        }
        this.loaded = true;
        this.loading = false;
      },

      getActorTarget(index, progress) {
        if (this.data.role === 'colorado' && this.data.scene === 1) {
          const starts = [[-0.8, -2.2], [-0.15, -2.55], [0.5, -2.1], [1.15, -2.55], [1.75, -2.15]];
          const phase = this.time * 0.7 + index * 1.4;
          return {
            x: starts[index][0] + Math.sin(phase) * 0.18,
            y: 0,
            z: starts[index][1] + Math.cos(phase) * 0.12,
            walking: Math.abs(Math.sin(phase)) > 0.35 ? 0.38 : 0
          };
        }

        if (this.data.role === 'colorado') {
          const starts = [[-1.6, -2], [-2.1, -2.6], [-2.5, -3.1], [-1.4, -3.3], [-2.8, -2.4]];
          const retreat = Math.max(0, Math.min(1, (progress - 0.76) / 0.2));
          return {
            x: starts[index][0] - retreat * (1.2 + index * 0.08),
            y: 0,
            z: starts[index][1] + retreat * 0.45,
            walking: retreat > 0 ? 1 : 0.06
          };
        }

        if (this.data.scene === 2) {
          const starts = [[-2.2, -7], [-0.75, -7.5], [0.75, -7.2], [2.2, -7.7]];
          const advance = Math.max(0, Math.min(1, (progress - 0.08) / 0.68));
          return {
            x: starts[index][0] * (1 - advance * 0.18),
            y: 0,
            z: starts[index][1] + advance * 2.8,
            walking: advance > 0.72 ? 1 : advance > 0.08 ? 0.72 : 0.06
          };
        }

        const starts = [[-1.25, -5.7], [1.25, -5.9], [-1.8, -6.4], [1.8, -6.5]];
        const advance = Math.max(0, Math.min(1, (progress - 0.52) / 0.2));
        return {
          x: starts[index][0],
          y: 0,
          z: starts[index][1] + advance * 1.7,
          walking: advance > 0.1 ? 0.35 : 0.04,
          visible: index < 2
        };
      },

      tick(time, delta) {
        if (!this.data.active || !this.loaded) return;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const progress = duration ? Math.min(1, audio.currentTime / duration) : 0;
        this.time += Math.min(delta || 16, 50) / 1000;

        this.actors.forEach((actor, index) => {
          const target = this.getActorTarget(index, progress);
          actor.visible = target.visible !== false;
          if (!actor.visible) return;
          const stride = this.time * (target.walking > 0.8 ? 12 : 7) + index * 1.6;
          const smoothing = Math.min(1, (delta || 16) / 220);
          const baseY = target.y + Math.abs(Math.sin(stride)) * 0.035 * target.walking;
          actor.position.x += (target.x - actor.position.x) * smoothing;
          actor.position.y += (baseY - actor.position.y) * smoothing;
          actor.position.z += (target.z - actor.position.z) * smoothing;
          actor.rotation.y = Math.atan2(target.x - actor.position.x, target.z - actor.position.z);
          actor.rotation.x = -0.12 * target.walking;
          actor.rotation.z = Math.sin(stride) * 0.035 * target.walking;
        });
      }
    });
  }

  // ─── Limpieza total de bloqueo de pantalla de A-Frame ───
  function restorePageScrollAndUnlockDOM() {
    [document.documentElement, document.body].forEach((el) => {
      if (!el) return;
      el.classList.remove('a-fullscreen', 'ar-active', 'vr-active');
      el.style.overflow = '';
      el.style.position = '';
      el.style.height = '';
      el.style.width = '';
      el.style.top = '';
      el.style.left = '';
      el.style.touchAction = '';
    });
  }

  // ─── Soporte de Draco para modelos 3D ───
  function configureDracoSupport(sceneEl) {
    if (window.AFRAME) {
      const gltfSystem = AFRAME.systems && AFRAME.systems['gltf-model'];
      if (gltfSystem && gltfSystem.schema && gltfSystem.schema.dracoDecoderPath) {
        gltfSystem.schema.dracoDecoderPath.default = new URL('assets/draco/', window.location.href).href;
      }
    }
    if (sceneEl && sceneEl.systems && sceneEl.systems['gltf-model']) {
      const sys = sceneEl.systems['gltf-model'];
      if (!sys.dracoLoader && window.THREE && THREE.DRACOLoader) {
        try {
          const draco = new THREE.DRACOLoader();
          draco.setDecoderPath(new URL('assets/draco/', window.location.href).href);
          sys.dracoLoader = draco;
        } catch (e) {
          console.warn('[Historia Viva] Error inicializando Draco:', e);
        }
      }
    }
  }

  // ─── Obtener referencias a componentes 3D ───
  function getWorldAnchor() {
    return aSceneInstance ? aSceneInstance.querySelector('#tamayo-world-anchor') : null;
  }

  function getAnimator() {
    if (!aSceneInstance || currentStoryId !== 'franz') return null;
    const figure = aSceneInstance.querySelector('#franz-tamayo-figure');
    return figure && figure.components ? figure.components['tamayo-animator'] : null;
  }

  function getWalker() {
    if (!aSceneInstance) return null;
    const walker = aSceneInstance.querySelector('#tamayo-walker-root');
    return walker && walker.components ? walker.components['tamayo-walker'] : null;
  }

  function getDiorama() {
    if (!aSceneInstance) return null;
    const d = aSceneInstance.querySelector('#ar-interactive-diorama');
    return d && d.components ? d.components['scene-diorama'] : null;
  }

  function ensureAbaroaModelLoaded() {
    if (currentStoryId !== 'abaroa' || !aSceneInstance || !isARLocationAvailable()) return;
    const model = aSceneInstance.querySelector('#eduardo-abaroa-figure');
    const story = stories.abaroa;
    if (!model || !story || !story.model || model.getAttribute('gltf-model') === story.model) return;

    const modelHint = aSceneInstance.querySelector('#ar-model-error-label');
    model.setAttribute('visible', 'true');
    model.setAttribute('scale', '1.7 1.7 1.7');
    model.setAttribute('gltf-model', story.model);
    if (modelHint) {
      modelHint.setAttribute('value', 'CARGANDO MODELO DE EDUARDO ABAROA...');
      modelHint.setAttribute('visible', 'true');
    }
  }

  function createStageEntity(parent, tag, attributes) {
    const entity = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => entity.setAttribute(name, value));
    parent.appendChild(entity);
    return entity;
  }

  function addStageActor(parent, id, position, options) {
    return createStageEntity(parent, 'a-entity', {
      id,
      position,
      'npc-person': `mode: ${options.mode || 'idle'}; center: 0 0 0; radius: ${options.radius || 0.3}; speed: ${options.speed || 0.2}; phase: ${options.phase || 0}; facing: ${options.facing || 0}; skin: ${options.skin || '#a77c58'}; hair: #241b14; shirt: ${options.shirt || '#59604b'}; pants: ${options.pants || '#39382e'}; prop: none`
    });
  }

  function ensureAbaroaStage() {
    const anchor = getWorldAnchor();
    if (!anchor || anchor.querySelector('#abaroa-ar-stage')) return;

    const addAnimatedSphere = (parent, id, position, radius, color, animation) => {
      const sphere = createStageEntity(parent, 'a-sphere', {
        id,
        position,
        radius: String(radius),
        material: `color: ${color}; transparent: true; opacity: 0.72; emissive: ${color}; emissiveIntensity: 0.45`
      });
      sphere.setAttribute('animation__motion', animation);
      return sphere;
    };

    const stage = createStageEntity(anchor, 'a-entity', {
      id: 'abaroa-ar-stage',
      'abaroa-stage-motion': 'scene: 0',
      visible: 'false'
    });
    const addScene = (index) => createStageEntity(stage, 'a-entity', {
      'data-abaroa-scene': String(index),
      visible: 'false'
    });

    const prologue = addScene(0);
    createStageEntity(prologue, 'a-box', {
      position: '1.05 0.78 -0.45',
      width: '1.65',
      height: '0.12',
      depth: '1',
      color: '#563a27',
      material: 'roughness: 0.82'
    });
    createStageEntity(prologue, 'a-box', {
      position: '1.05 0.38 -0.45',
      width: '0.12',
      height: '0.76',
      depth: '0.12',
      color: '#4a3021'
    });
    createStageEntity(prologue, 'a-plane', {
      position: '1.05 0.85 -0.45',
      rotation: '-90 0 0',
      width: '1.42',
      height: '0.78',
      color: '#b28b58',
      material: 'roughness: 0.95'
    });
    createStageEntity(prologue, 'a-text', {
      value: 'LITORAL · ANTOFAGASTA → CALAMA',
      position: '1.05 0.89 -0.45',
      rotation: '-90 0 0',
      align: 'center',
      width: '1.35',
      color: '#2e281f'
    });
    const routeRing = createStageEntity(prologue, 'a-torus', {
      id: 'abaroa-route-ring',
      position: '1.05 0.94 -0.45',
      rotation: '90 0 0',
      radius: '0.48',
      'radius-tubular': '0.012',
      color: '#39e8d0',
      material: 'emissive: #39e8d0; emissiveIntensity: 0.7'
    });
    routeRing.setAttribute('visible', 'false');
    routeRing.setAttribute('animation__pulse', 'property: scale; from: 0.88 0.88 0.88; to: 1.12 1.12 1.12; dir: alternate; dur: 1700; loop: true; easing: easeInOutSine');
    routeRing.setAttribute('animation__turn', 'property: rotation; from: 90 0 0; to: 90 360 0; dur: 18000; loop: true; easing: linear');
    [[0.56, 0.96, -0.42], [1.48, 0.96, -0.48], [1.11, 0.98, -0.44]].forEach((point, index) => {
      const marker = createStageEntity(prologue, 'a-sphere', {
        'data-abaroa-route-marker': '',
        position: `${point[0]} ${point[1]} ${point[2]}`,
        radius: '0.045',
        material: 'color: #6affed; emissive: #28dcca; emissiveIntensity: 1.1'
      });
      marker.setAttribute('animation__pulse', `property: scale; from: 0.75 0.75 0.75; to: 1.45 1.45 1.45; dir: alternate; dur: ${850 + index * 180}; delay: ${index * 220}; loop: true; easing: easeInOutSine`);
      marker.setAttribute('visible', 'false');
    });
    const mapScan = createStageEntity(prologue, 'a-torus', {
      id: 'abaroa-map-scan',
      position: '1.05 1.015 -0.45',
      rotation: '90 0 0',
      radius: '0.25',
      'radius-tubular': '0.009',
      material: 'color: #65fff0; emissive: #28dcca; emissiveIntensity: 0.6; transparent: true; opacity: 0.75'
    });
    mapScan.setAttribute('visible', 'false');
    mapScan.setAttribute('animation__scan', 'property: scale; from: 0.2 0.2 0.2; to: 2.5 2.5 2.5; dur: 2200; loop: true; easing: easeOutQuad');
    mapScan.setAttribute('animation__fade', 'property: material.opacity; from: 0.78; to: 0.08; dur: 2200; loop: true; easing: easeOutQuad');

    const strategy = addScene(1);
    createStageEntity(strategy, 'a-plane', {
      position: '0 0.015 -2.2',
      rotation: '-90 0 0',
      width: '5.5',
      height: '4.4',
      color: '#a98c65',
      material: 'roughness: 1'
    });
    createStageEntity(strategy, 'a-plane', {
      position: '-1.5 0.025 -2.4',
      rotation: '-90 0 0',
      width: '1.05',
      height: '4.2',
      color: '#526b69',
      material: 'opacity: 0.78; transparent: true'
    });
    [-1, 1].forEach((side, index) => {
      const building = createStageEntity(strategy, 'a-entity', {
        position: `${side * 2.45} 0 -6.8`
      });
      createStageEntity(building, 'a-box', {
        position: '0 1.15 0',
        width: index ? '2.2' : '2.7',
        height: '2.3',
        depth: '1.6',
        color: index ? '#b88959' : '#9d734b',
        material: 'roughness: 1'
      });
      createStageEntity(building, 'a-box', {
        position: '0 2.35 0',
        width: index ? '2.4' : '2.9',
        height: '0.16',
        depth: '1.8',
        color: '#68472f'
      });
      [-0.55, 0.55].forEach((windowX) => createStageEntity(building, 'a-box', {
        position: `${windowX} 1.25 0.81`,
        width: '0.34',
        height: '0.58',
        depth: '0.035',
        color: '#382a20'
      }));
    });
    createStageEntity(strategy, 'a-entity', {
      id: 'abaroa-cabrera',
      position: '-1.25 0 -0.95',
      'npc-person': 'mode: idle; facing: -0.5; shirt: #5e5543; pants: #39352e; skin: #a77c58; hair: #2a2119; prop: none'
    });
    createStageEntity(strategy, 'a-text', {
      value: 'LADISLAO CABRERA',
      position: '-1.25 1.95 -0.95',
      align: 'center',
      width: '1.5',
      color: '#fff0d4'
    });
    [[-0.8, -2.2], [-0.15, -2.55], [0.5, -2.1], [1.15, -2.55], [1.75, -2.15]].forEach((point, index) => {
      const sandbag = createStageEntity(strategy, 'a-box', {
        position: `${point[0]} 0.2 ${point[1] - 0.35}`,
        width: '0.5',
        height: '0.38',
        depth: '0.42',
        color: '#8e7858'
      });
      sandbag.setAttribute('animation__lift', `property: position; from: ${point[0]} 0.2 ${point[1] - 0.35}; to: ${point[0]} 0.42 ${point[1] - 0.35}; dir: alternate; dur: ${2600 + index * 280}; delay: ${index * 420}; loop: true; easing: easeInOutSine`);
      sandbag.setAttribute('animation__settle', `property: rotation; from: -2 0 -3; to: 2 0 3; dir: alternate; dur: ${2100 + index * 240}; loop: true; easing: easeInOutSine`);
    });
    [[-0.55, -3.2], [0.55, -3.45], [1.65, -3.2], [-1.7, -4.1]].forEach((point, index) => {
      addStageActor(strategy, `abaroa-strategy-defender-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.22, speed: 0.15, phase: index * 1.4,
          shirt: index % 2 ? '#625b43' : '#59634b', pants: '#38382f'
        });
    });
    [-1.5, 0, 1.5].forEach((x, index) => createStageEntity(strategy, 'a-box', {
      position: `${x} 0.08 -3.1`,
      width: '1.4',
      height: '0.1',
      depth: '0.22',
      rotation: `0 ${index % 2 ? 3 : -3} 0`,
      color: '#624832'
    }));
    [[-2.3, -1.4], [2.4, -2.5], [-2.2, -3.2], [2.1, -3.7], [-2.45, -5]].forEach((point, index) => {
      const rock = createStageEntity(strategy, 'a-dodecahedron', {
        position: `${point[0]} ${0.12 + (index % 2) * 0.05} ${point[1]}`,
        radius: String(0.24 + (index % 3) * 0.07),
        color: index % 2 ? '#76644d' : '#8b785e',
        material: 'roughness: 1'
      });
      rock.setAttribute('animation__settle', `property: rotation; from: -1 0 -1; to: 1 0 1; dir: alternate; dur: ${2800 + index * 250}; loop: true; easing: easeInOutSine`);
    });
    [-1.15, -1.5, -1.85].forEach((x, index) => {
      const ripple = createStageEntity(strategy, 'a-torus', {
        position: `${x} 0.045 -2.35`,
        rotation: '90 0 0',
        radius: '0.16',
        'radius-tubular': '0.012',
        material: 'color: #8bd1c4; emissive: #326d67; opacity: 0.56; transparent: true'
      });
      ripple.setAttribute('animation__ripple', `property: scale; from: 0.55 0.55 0.55; to: 1.8 1.8 1.8; dur: ${1700 + index * 350}; delay: ${index * 380}; loop: true; easing: easeOutSine`);
    });
    const campfire = createStageEntity(strategy, 'a-cone', {
      position: '1.85 0.22 -1.1',
      'radius-bottom': '0.13',
      'radius-top': '0.015',
      height: '0.38',
      material: 'color: #ff9a42; emissive: #ff6a22; emissiveIntensity: 1.1; transparent: true; opacity: 0.82'
    });
    campfire.setAttribute('animation__flame', 'property: scale; from: 0.82 0.85 0.82; to: 1.12 1.2 1.12; dir: alternate; dur: 380; loop: true; easing: easeInOutSine');
    campfire.setAttribute('animation__flicker', 'property: rotation; from: -4 0 -3; to: 5 0 4; dir: alternate; dur: 520; loop: true; easing: easeInOutSine');
    const portal = createStageEntity(strategy, 'a-entity', {
      id: 'abaroa-topater-portal',
      position: '0 0.04 -4.4',
      visible: 'false'
    });
    const portalRing = createStageEntity(portal, 'a-ring', {
      rotation: '-90 0 0',
      'radius-inner': '0.55',
      'radius-outer': '0.72',
      material: 'color: #42f2d5; emissive: #25c9bd; emissiveIntensity: 0.9; opacity: 0.88; transparent: true'
    });
    portalRing.setAttribute('animation__pulse', 'property: scale; from: 0.85 0.85 0.85; to: 1.18 1.18 1.18; dir: alternate; dur: 900; loop: true; easing: easeInOutSine');
    createStageEntity(portal, 'a-cone', {
      position: '0 0.45 0',
      rotation: '90 0 0',
      'radius-bottom': '0.23',
      'radius-top': '0',
      height: '0.5',
      material: 'color: #42f2d5; emissive: #25c9bd; emissiveIntensity: 0.8'
    });
    createStageEntity(portal, 'a-text', {
      value: 'HACIA EL PUENTE DE TOPÁTER',
      position: '0 1.1 0',
      align: 'center',
      width: '2.6',
      color: '#b9fff4'
    });

    const battle = addScene(2);
    createStageEntity(battle, 'a-plane', {
      position: '0 -0.005 -3.6',
      rotation: '-90 0 0',
      width: '7',
      height: '8',
      color: '#8e7658',
      material: 'roughness: 1'
    });
    createStageEntity(battle, 'a-entity', {
      position: '0 0.08 -4.4',
      id: 'abaroa-topater-bridge'
    });
    [-1, 0, 1].forEach((x) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.16 -4.4`,
      width: '0.92',
      height: '0.16',
      depth: '2.8',
      color: '#624832'
    }));
    [-1.45, 1.45].forEach((x) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.7 -4.4`,
      width: '0.1',
      height: '0.12',
      depth: '2.8',
      color: '#493422'
    }));
    [-1.8, -1.1, 1.1, 1.8].forEach((x, index) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.32 -1.05`,
      width: '0.82',
      height: '0.55',
      depth: '0.48',
      color: index % 2 ? '#9a805c' : '#806747'
    }));
    [[-0.85, -2.6], [-1.45, -3.3]].forEach((point, index) => {
      const ally = addStageActor(battle, `abaroa-retreating-ally-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.28, speed: 0.2, phase: index * 1.3,
          shirt: '#59634b', pants: '#38382f'
        });
      ally.dataset.abaroaRetreat = 'true';
      ally.dataset.abaroaRetreatStartX = String(point[0]);
    });
    [[-2.65, -8], [2.65, -8.4]].forEach((point, index) => {
      const skirmisher = addStageActor(battle, `abaroa-battle-skirmisher-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.55, speed: 0.32, phase: index * 2.2,
          shirt: '#4b4d43', pants: '#343630', skin: '#9a765c'
        });
      skirmisher.setAttribute('scale', '0.9 0.9 0.9');
    });
    const muzzleFlash = createStageEntity(battle, 'a-sphere', {
      id: 'abaroa-muzzle-flash',
      position: '0.3 1.35 -0.1',
      radius: '0.16',
      scale: '0.001 0.001 0.001',
      material: 'shader: flat; color: #ffd879; emissive: #ff9a32; emissiveIntensity: 1.5'
    });
    muzzleFlash.setAttribute('animation__flash', 'property: scale; from: 0.2 0.2 0.2; to: 1.7 1.7 1.7; dir: alternate; dur: 170; easing: easeOutQuad; startEvents: abaroa-shot');
    [[-1.6, 0.72, -3.4], [0.1, 0.82, -4.7], [1.5, 0.66, -5.2], [-0.8, 0.58, -6.1]].forEach((point, index) => {
      const smoke = addAnimatedSphere(battle, `abaroa-battle-smoke-${index + 1}`,
        `${point[0]} ${point[1]} ${point[2]}`, 0.42 + (index % 2) * 0.16, '#837c70',
        `property: position; from: ${point[0]} ${point[1]} ${point[2]}; to: ${point[0] + (index % 2 ? 0.18 : -0.16)} ${point[1] + 0.55} ${point[2]}; dur: ${2600 + index * 360}; delay: ${index * 260}; loop: true; easing: easeInOutSine`);
      smoke.setAttribute('animation__expand', `property: scale; from: 0.65 0.7 0.65; to: 1.4 1.25 1.4; dur: ${3100 + index * 280}; delay: ${index * 200}; loop: true; easing: easeInOutSine`);
    });
    [-1.3, 0, 1.3].forEach((x, index) => {
      const plank = createStageEntity(battle, 'a-box', {
        position: `${x} 0.255 -4.4`,
        width: '0.88',
        height: '0.035',
        depth: '2.65',
        color: '#876341'
      });
      plank.setAttribute('animation__creak', `property: rotation; from: -0.8 0 0; to: 0.8 0 0; dir: alternate; dur: ${1700 + index * 230}; delay: ${index * 140}; loop: true; easing: easeInOutSine`);
    });

    const resistance = addScene(3);
    const remainingOfficer = addStageActor(resistance, 'abaroa-final-officer', '1.2 0 -5.8', {
      mode: 'idle', facing: -0.1, shirt: '#4c4a40', pants: '#343630', skin: '#a17c5c'
    });
    remainingOfficer.setAttribute('scale', '0.94 0.94 0.94');
    createStageEntity(remainingOfficer, 'a-cylinder', {
      position: '-0.38 1.05 -0.25',
      rotation: '0 0 90',
      radius: '0.035',
      height: '1',
      color: '#362f26'
    });
    [-1.25, 1.25].forEach((x) => {
      createStageEntity(resistance, 'a-sphere', {
        'data-abaroa-volley-flash': '',
        position: `${x} 1.3 -4.25`,
        radius: '0.13',
        scale: '0.001 0.001 0.001',
        visible: 'false',
        material: 'shader: flat; color: #ffd879; emissive: #ff9a32; emissiveIntensity: 1.5'
      }).setAttribute('animation__flash', 'property: scale; from: 0.001 0.001 0.001; to: 1.4 1.4 1.4; dir: alternate; dur: 180; easing: easeOutQuad; startEvents: abaroa-shot');
    });
    createStageEntity(resistance, 'a-entity', {
      position: '0 0.08 -3.8',
      id: 'abaroa-final-bridge'
    });
    [-0.6, 0, 0.6].forEach((x) => createStageEntity(resistance, 'a-box', {
      position: `${x} 0.08 -3.8`,
      width: '0.56',
      height: '0.12',
      depth: '2.8',
      color: '#60462f'
    }));
    [-0.75, 0, 0.75].forEach((x, index) => {
      const plank = createStageEntity(resistance, 'a-box', {
        position: `${x} 0.16 -3.8`,
        width: '0.52',
        height: '0.035',
        depth: '2.55',
        color: '#856142'
      });
      plank.setAttribute('animation__creak', `property: rotation; from: -0.45 0 0; to: 0.45 0 0; dir: alternate; dur: ${1300 + index * 180}; loop: true; easing: easeInOutSine`);
    });
    [[-0.95, 0.35, -2.9], [0.8, 0.42, -4.8], [0.1, 0.32, -5.4]].forEach((point, index) => {
      const dust = addAnimatedSphere(resistance, `abaroa-stand-dust-${index + 1}`,
        `${point[0]} ${point[1]} ${point[2]}`, 0.28, '#b6a18a',
        `property: position; from: ${point[0]} ${point[1]} ${point[2]}; to: ${point[0] + (index - 1) * 0.22} ${point[1] + 0.4} ${point[2]}; dur: ${2200 + index * 400}; delay: ${index * 300}; loop: true; easing: easeInOutSine`);
      dust.setAttribute('animation__fade', `property: scale; from: 0.3 0.25 0.3; to: 1.1 0.9 1.1; dur: ${2100 + index * 340}; delay: ${index * 270}; loop: true; easing: easeInOutSine`);
    });

    const memorial = addScene(4);
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((x, index) => {
      createStageEntity(memorial, 'a-cone', {
        position: `${x} ${1.1 + (index % 2) * 0.4} -7.2`,
        'radius-bottom': '1.1',
        'radius-top': '0',
        height: `${2.2 + (index % 2) * 0.8}`,
        color: index % 2 ? '#665b4c' : '#75634f',
        material: 'roughness: 1'
      });
    });
    createStageEntity(memorial, 'a-cylinder', {
      position: '0.95 0.42 -1.2',
      radius: '0.52',
      height: '0.82',
      color: '#78674e',
      material: 'roughness: 0.76'
    });
    createStageEntity(memorial, 'a-cylinder', {
      position: '0.95 0.85 -1.2',
      radius: '0.62',
      height: '0.08',
      color: '#a88854',
      material: 'metalness: 0.45; roughness: 0.38'
    });
    createStageEntity(memorial, 'a-text', {
      value: 'EDUARDO ABAROA\\nHÉROE DEL TOPÁTER',
      position: '0.95 1.25 -1.2',
      align: 'center',
      width: '1.7',
      color: '#fff0d4'
    });
    const memorialRing = createStageEntity(memorial, 'a-torus', {
      position: '0.95 1.62 -1.2',
      rotation: '0 90 0',
      radius: '1.05',
      'radius-tubular': '0.018',
      color: '#e0bd72',
      material: 'emissive: #a87933; emissiveIntensity: 0.6'
    });
    memorialRing.setAttribute('animation__orbit', 'property: rotation; from: 0 90 0; to: 0 450 0; dur: 24000; loop: true; easing: linear');
    memorialRing.setAttribute('animation__breathe', 'property: scale; from: 0.94 0.94 0.94; to: 1.04 1.04 1.04; dir: alternate; dur: 2800; loop: true; easing: easeInOutSine');
    for (let index = 0; index < 5; index++) {
      const orbit = createStageEntity(memorial, 'a-entity', {
        position: '0.95 1.65 -1.2',
        rotation: `0 ${index * 72} 0`
      });
      createStageEntity(orbit, 'a-sphere', {
        position: '0.92 0 0',
        radius: '0.075',
        material: 'color: #ffe4a0; emissive: #d7a64b; emissiveIntensity: 0.8'
      }).setAttribute('animation__pulse', `property: scale; from: 0.75 0.75 0.75; to: 1.35 1.35 1.35; dir: alternate; dur: ${1000 + index * 190}; delay: ${index * 150}; loop: true; easing: easeInOutSine`);
      orbit.setAttribute('animation__turn', `property: rotation; from: 0 ${index * 72} 0; to: 0 ${index * 72 + 360} 0; dur: ${18000 + index * 1700}; loop: true; easing: linear`);
    }
    [[0.35, 1.7, -1.5], [1.55, 1.25, -1.8], [0.5, 2.2, -0.8], [1.42, 2.15, -0.7]].forEach((point, index) => {
      const petal = createStageEntity(memorial, 'a-sphere', {
        position: `${point[0]} ${point[1]} ${point[2]}`,
        radius: '0.035',
        material: `color: ${index % 2 ? '#f3d9aa' : '#f5e8d0'}; emissive: #c99c5a; emissiveIntensity: 0.25; transparent: true; opacity: 0.8`
      });
      petal.setAttribute('animation__drift', `property: position; from: ${point[0]} ${point[1]} ${point[2]}; to: ${point[0] + (index % 2 ? -0.35 : 0.4)} ${point[1] + 0.65} ${point[2] + 0.3}; dur: ${4200 + index * 500}; delay: ${index * 600}; loop: true; easing: easeInOutSine`);
      petal.setAttribute('animation__spin', `property: rotation; from: 0 0 0; to: 0 0 ${index % 2 ? -180 : 180}; dur: ${2600 + index * 250}; loop: true; easing: linear`);
    });
    createStageEntity(memorial, 'a-text', {
      value: '1879  ·  1952  ·  MEMORIA VIVA',
      position: '0.95 2.82 -1.2',
      align: 'center',
      width: '2.2',
      color: '#ffe1a0'
    });
    [-1.8, 1.8].forEach((x, index) => {
      const pole = createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 1.65 -2.2`,
        radius: '0.025',
        height: '3.2',
        color: '#6d5537'
      });
      const flag = createStageEntity(memorial, 'a-plane', {
        position: `${x + (index ? -0.38 : 0.38)} 2.65 -2.2`,
        width: '0.76',
        height: '0.42',
        material: 'color: #d72e32; side: double; roughness: 0.8'
      });
      createStageEntity(flag, 'a-plane', {
        position: '0 0 0.006',
        width: '0.76',
        height: '0.14',
        material: 'color: #f3e8c1; side: double'
      });
      createStageEntity(flag, 'a-plane', {
        position: '0 -0.14 0.012',
        width: '0.76',
        height: '0.14',
        material: 'color: #1d7b4b; side: double'
      });
      flag.setAttribute('animation__wave', `property: rotation; from: 0 0 -5; to: 0 0 5; dir: alternate; dur: ${900 + index * 240}; loop: true; easing: easeInOutSine`);
      pole.setAttribute('animation__sway', `property: rotation; from: 0 0 -0.7; to: 0 0 0.7; dir: alternate; dur: ${1800 + index * 350}; loop: true; easing: easeInOutSine`);
    });
    [-1.35, 0, 1.35].forEach((x, index) => {
      createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 0.32 -3.25`,
        radius: '0.32',
        height: '0.64',
        color: '#78674e',
        material: 'roughness: 0.78'
      });
      createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 0.66 -3.25`,
        radius: '0.39',
        height: '0.08',
        color: '#bd9a5c',
        material: 'metalness: 0.38; roughness: 0.42'
      });
      if (index === 0) {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.83 -3.25`,
          width: '0.52',
          height: '0.055',
          depth: '0.055',
          rotation: '0 0 -6',
          color: '#58422e'
        });
        createStageEntity(memorial, 'a-cylinder', {
          position: `${x + 0.24} 0.83 -3.25`,
          rotation: '0 0 90',
          radius: '0.018',
          height: '0.55',
          color: '#32271e'
        });
      } else if (index === 1) {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.86 -3.25`,
          width: '0.36',
          height: '0.025',
          depth: '0.26',
          rotation: '0 0 -12',
          color: '#e8d4a9'
        });
        createStageEntity(memorial, 'a-torus', {
          position: `${x + 0.18} 0.87 -3.25`,
          rotation: '0 0 90',
          radius: '0.12',
          'radius-tubular': '0.012',
          color: '#b28b58'
        });
      } else {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.84 -3.25`,
          width: '0.38',
          height: '0.025',
          depth: '0.28',
          rotation: '-12 0 0',
          color: '#b69261'
        });
        createStageEntity(memorial, 'a-plane', {
          position: `${x} 0.86 -3.25`,
          rotation: '-12 0 0',
          width: '0.34',
          height: '0.24',
          material: 'color: #c9ab7a; side: double'
        });
      }
      createStageEntity(memorial, 'a-text', {
        value: ['WINCHESTER', 'CARTA', 'MAPA DEL LITORAL'][index],
        position: `${x} 1.08 -3.25`,
        align: 'center',
        width: '0.85',
        color: '#fff0d4'
      });
    });
    createStageEntity(memorial, 'a-torus', {
      position: '0.95 2.45 -1.2',
      rotation: '0 90 0',
      radius: '1.48',
      'radius-tubular': '0.012',
      material: 'color: #e8c67d; emissive: #a87933; emissiveIntensity: 0.45; opacity: 0.68; transparent: true'
    });
    [[-0.3, '1879'], [0.95, '1952'], [2.2, 'HOY']].forEach((point) => {
      createStageEntity(memorial, 'a-sphere', {
        position: `${point[0]} 2.45 -1.2`,
        radius: '0.075',
        material: 'color: #ffe4a0; emissive: #c99c5a; emissiveIntensity: 0.7'
      }).setAttribute('animation__pulse', 'property: scale; from: 0.8 0.8 0.8; to: 1.3 1.3 1.3; dir: alternate; dur: 1250; loop: true; easing: easeInOutSine');
      createStageEntity(memorial, 'a-text', {
        value: point[1],
        position: `${point[0]} 2.67 -1.2`,
        align: 'center',
        width: '0.55',
        color: '#fff0d4'
      });
    });

    createStageEntity(stage, 'a-entity', {
      id: 'abaroa-colorado-formation',
      'abaroa-model-formation': 'role: colorado; scene: 0; active: false'
    });
    createStageEntity(stage, 'a-entity', {
      id: 'abaroa-chilean-formation',
      'abaroa-model-formation': 'role: chilean; scene: 0; active: false'
    });

    const abaroaFigure = anchor.querySelector('#eduardo-abaroa-figure');
    if (abaroaFigure && !abaroaFigure.querySelector('#abaroa-winchester')) {
      const rifle = createStageEntity(abaroaFigure, 'a-entity', {
        id: 'abaroa-winchester',
        position: '0.2 0.58 0.14',
        rotation: '0 0 -8'
      });
      createStageEntity(rifle, 'a-box', {
        position: '-0.12 0 0',
        width: '0.34',
        height: '0.06',
        depth: '0.07',
        color: '#62452e'
      });
      createStageEntity(rifle, 'a-box', {
        position: '0.07 0.025 0',
        width: '0.18',
        height: '0.085',
        depth: '0.075',
        color: '#35332f',
        material: 'metalness: 0.45; roughness: 0.45'
      });
      createStageEntity(rifle, 'a-cylinder', {
        position: '0.33 0.035 0',
        rotation: '0 0 90',
        radius: '0.014',
        height: '0.48',
        color: '#373531',
        material: 'metalness: 0.5; roughness: 0.4'
      });
      createStageEntity(rifle, 'a-torus', {
        position: '0.09 -0.035 0',
        rotation: '90 0 0',
        radius: '0.045',
        'radius-tubular': '0.008',
        color: '#403a32'
      });
      rifle.setAttribute('animation__aim', 'property: rotation; from: 0 0 -8; to: 0 0 -14; dir: alternate; dur: 850; loop: true; easing: easeInOutSine');
    }
  }

  function updateAbaroaStage(sceneIndex) {
    const stage = aSceneInstance && aSceneInstance.querySelector('#abaroa-ar-stage');
    const model = aSceneInstance && aSceneInstance.querySelector('#eduardo-abaroa-figure');
    if (!stage || !model) return;
    stage.setAttribute('visible', String(currentStoryId === 'abaroa'));
    stage.setAttribute('abaroa-stage-motion', 'scene', sceneIndex);
    model.setAttribute('visible', String(sceneIndex !== 0 || audio.currentTime >= 24));
    stage.querySelectorAll('[data-abaroa-scene]').forEach((group) => {
      group.setAttribute('visible', String(currentStoryId === 'abaroa' && Number(group.dataset.abaroaScene) === sceneIndex));
    });
    model.setAttribute('abaroa-scene-motion', {
      scene: sceneIndex,
      active: currentStoryId === 'abaroa' && isARLocationAvailable()
    });
    const formationData = {
      scene: sceneIndex,
      active: currentStoryId === 'abaroa' && isARLocationAvailable()
    };
    ['#abaroa-colorado-formation', '#abaroa-chilean-formation'].forEach((selector) => {
      const formation = stage.querySelector(selector);
      if (formation) formation.setAttribute('abaroa-model-formation', formationData);
    });
  }

  // ─── Verificación de Rango Geográfico (Geofence) ───
  function isInSite() {
    if (window.HistoriaGeo && typeof window.HistoriaGeo.isSceneInRange === 'function') {
      return window.HistoriaGeo.isSceneInRange(currentStoryId, currentSceneIndex);
    }
    console.error('[Historia Viva] No está disponible el gestor de geocercas para habilitar escenas AR.');
    return false;
  }

  function isARLocationAvailable() {
    return Boolean(getRealUserCoordinates()) && isInSite();
  }

  // ─── Sincronización del Mundo Pokémon GO con la Ubicación Real ───
  function syncSitePresence() {
    const userCoordinates = getRealUserCoordinates();
    updateGeographicAnchor(userCoordinates);
    const inRange = Boolean(userCoordinates) && isInSite();
    updateAbaroaStage(currentSceneIndex);
    const anchor = getWorldAnchor();
    const animator = getAnimator();
    const walker = getWalker();
    const sceneVideo = aSceneInstance && aSceneInstance.querySelector('#ar-scene-video');
    const videoPanel = aSceneInstance && aSceneInstance.querySelector('#ar-video-panel');
    const dist = userCoordinates && window.HistoriaGeo && typeof window.HistoriaGeo.getSceneDistance === 'function'
      ? window.HistoriaGeo.getSceneDistance(currentStoryId, currentSceneIndex)
      : null;
    const targetName = `${currentStoryId === 'abaroa' ? 'Eduardo Abaroa' : 'Franz Tamayo'} · Escena ${currentSceneIndex + 1}`;

    if (statusPill) {
      statusPill.classList.toggle('is-in-range', inRange);
      statusPill.classList.toggle('is-out-of-range', !inRange);
      if (!userCoordinates) {
        statusPill.textContent = '📍 Permite ubicación para anclar la escena AR';
      } else {
        statusPill.innerHTML = inRange
          ? `<span class="ar-status-dot"></span> 🟢 Escena disponible · ${dist} m`
          : `<span class="ar-status-dot"></span> 🧭 Escena a ${dist !== null ? dist + ' m' : 'esperando GPS'}`;
      }
    }

    if (inRange) {
      ensureAbaroaModelLoaded();
      if (scenes[currentSceneIndex]?.video) {
        setSceneVideo(scenes[currentSceneIndex].video);
      }

      if (radarOverlay) {
        radarOverlay.classList.remove('is-active');
        radarOverlay.hidden = true;
      }

      if (anchor) {
        const wasHidden = anchor.getAttribute('visible') === 'false';
        anchor.setAttribute('visible', 'true');

        if (wasHidden) {
          if (animator) {
            animator.setLocked(false);
            animator.setReveal(1);
            animator.playSceneChoreography(currentSceneIndex);
          }
          if (window.HistoriaFX && window.HistoriaFX.beep) {
            window.HistoriaFX.beep('success');
          }
          if (window.HistoriaFX && window.HistoriaFX.whoosh) {
            window.HistoriaFX.whoosh('forward', 1.2);
          }
        }
      }

      if (animator) {
        animator.setLocked(false);
      }
      if (walker) walker.setRoaming(false);

      if (btnAudio) btnAudio.disabled = !scenes[currentSceneIndex]?.audio;
    } else {
      if (sceneVideo) sceneVideo.pause();
      if (videoPanel) videoPanel.setAttribute('visible', 'false');
      if (anchor) {
        anchor.setAttribute('visible', 'false');
      }
      if (animator) {
        animator.setLocked(true);
      }
      if (walker) {
        walker.setRoaming(false);
      }

      pauseAudio();

      if (radarOverlay) {
        radarOverlay.hidden = false;
        radarOverlay.classList.add('is-active');
      }
      if (radarDistEl) {
        radarDistEl.textContent = dist !== null ? `${dist} metros` : 'Buscando señal GPS...';
      }
      if (radarTargetEl) {
        radarTargetEl.textContent = targetName;
      }

      if (btnAudio) btnAudio.disabled = true;
    }
  }

  // ─── Gestión de la Cámara Real del Teléfono (Passthrough WebRTC) ───
  async function startCamera() {
    if (!pokearVideo || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusPill) statusPill.textContent = '📷 Este navegador no permite acceso a la cámara';
      return false;
    }
    const localHosts = ['localhost', '127.0.0.1', '::1'];
    if (!window.isSecureContext && !localHosts.includes(window.location.hostname)) {
      if (statusPill) statusPill.textContent = '🔒 Abre el sitio con HTTPS para permitir cámara y ubicación';
      if (arLoading) arLoading.classList.add('is-hidden');
      return false;
    }
    stopCamera();

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      pokearVideo.srcObject = videoStream;
      await pokearVideo.play();
      return true;
    } catch (error) {
      console.error('[Historia Viva] No se pudo iniciar la cámara AR:', error);
      if (statusPill) {
        statusPill.textContent = error.name === 'NotAllowedError'
          ? '📷 Permite la cámara en los ajustes del navegador'
          : '📷 No se pudo iniciar la cámara; revisa permisos y HTTPS';
      }
      stopCamera();
      if (arLoading) arLoading.classList.add('is-hidden');
      return false;
    }
  }

  function stopCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }
    if (pokearVideo) {
      pokearVideo.srcObject = null;
    }
  }

  // ─── Montar la Escena 3D Transparente sobre la Cámara ───
  function mountPokeArScene() {
    if (aSceneInstance || !arSceneTemplate || !arView) return;

    aSceneInstance = arSceneTemplate.content.firstElementChild.cloneNode(true);
    configureDracoSupport(aSceneInstance);
    ensureAbaroaStage();

    const modelEl = aSceneInstance.querySelector('#franz-tamayo-figure');
    const abaroaModelEl = aSceneInstance.querySelector('#eduardo-abaroa-figure');
    const sceneVideo = aSceneInstance.querySelector('#ar-scene-video');
    const videoPanel = aSceneInstance.querySelector('#ar-video-panel');
    if (modelEl) {
      modelEl.addEventListener('model-loaded', function () {
        if (arLoading) arLoading.classList.add('is-hidden');
        syncSitePresence();
        const animator = getAnimator();
        if (animator) animator.playSceneChoreography(currentSceneIndex);
      });
        modelEl.addEventListener('model-error', function () {
          if (arLoading) arLoading.classList.add('is-hidden');
        });
      }
    if (abaroaModelEl) {
      abaroaModelEl.addEventListener('model-loaded', function () {
        if (arLoading) arLoading.classList.add('is-hidden');
        const modelHint = aSceneInstance && aSceneInstance.querySelector('#ar-model-error-label');
        if (modelHint) modelHint.setAttribute('visible', 'false');
        syncSitePresence();
      });
      abaroaModelEl.addEventListener('model-error', function (event) {
        console.error('[Historia Viva] No se pudo cargar el modelo de Eduardo Abaroa:', event.detail);
        const modelHint = aSceneInstance && aSceneInstance.querySelector('#ar-model-error-label');
        if (modelHint) {
          modelHint.setAttribute('value', 'NO SE PUDO CARGAR EL MODELO DE EDUARDO ABAROA');
          modelHint.setAttribute('visible', 'true');
        }
        if (arLoading) arLoading.classList.add('is-hidden');
      });
    }
    if (sceneVideo) {
      const showSceneVideoPanel = function () {
        const expectedSource = scenes[currentSceneIndex]?.video;
        if (videoPanel && expectedSource && sceneVideo.currentSrc === new URL(expectedSource, window.location.href).href) {
          videoPanel.setAttribute('visible', String(isARLocationAvailable()));
        }
      };
      sceneVideo.addEventListener('loadeddata', showSceneVideoPanel);
      sceneVideo.addEventListener('playing', showSceneVideoPanel);
      sceneVideo.addEventListener('error', function () {
        const expectedSource = scenes[currentSceneIndex]?.video;
        if (!expectedSource || sceneVideo.currentSrc !== new URL(expectedSource, window.location.href).href) return;
        sceneVideo.dataset.failedSource = sceneVideo.currentSrc;
        if (videoPanel) videoPanel.setAttribute('visible', 'false');
        console.warn(`[Historia Viva] No se pudo cargar el video de la escena: ${sceneVideo.currentSrc || sceneVideo.src}`);
      });
    }

    const hud = arView.querySelector('.pokear-hud');
      arView.insertBefore(aSceneInstance, hud);

      aSceneInstance.addEventListener('loaded', function () {
        if (arLoading) arLoading.classList.add('is-hidden');
        updateGeographicAnchor();
        syncSitePresence();
        setupInteractiveSceneSelection();
      });
      }

      function unmountPokeArScene() {
        if (aSceneInstance) {
          try {
            if (aSceneInstance.is && aSceneInstance.is('vr-mode')) {
              aSceneInstance.exitVR();
            }
          } catch (e) { }
          aSceneInstance.remove();
          aSceneInstance = null;
        }
        restorePageScrollAndUnlockDOM();
      }

        // ─── Tocar una estación histórica para cambiar de escena ───
        function setupInteractiveSceneSelection() {
          if (!aSceneInstance) return;

          const canvas = aSceneInstance.querySelector('.a-canvas');
          if (!canvas) return;

          canvas.addEventListener('click', function (e) {
            if (currentStoryId !== 'franz') return;
            if (!isARLocationAvailable()) return;
            if (e.target.closest('.pokear-hud') || e.target.closest('button')) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const cameraEl = aSceneInstance.querySelector('[camera]');
            if (!cameraEl) return;
            const camera = cameraEl.getObject3D('camera');
            if (!camera) return;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

            // 1. Verificar primero si el usuario tocó alguna de las 5 estaciones 3D o fotos históricas
            const dioramaComp = getDiorama();
            if (dioramaComp && dioramaComp.group) {
              const hits = raycaster.intersectObjects(dioramaComp.group.children, true);
              for (let i = 0; i < hits.length; i++) {
                let obj = hits[i].object;
                while (obj) {
                  if (typeof obj.userData?.sceneIndex === 'number') {
                    const targetScene = obj.userData.sceneIndex;
                    if (window.HistoriaFX && window.HistoriaFX.beep) {
                      window.HistoriaFX.beep('ok');
                    }
                    setScene(targetScene, true);
                    return;
                  }
                  obj = obj.parent;
                }
              }
            }

          });
        }

        // ─── Navegación de Escenas Históricas ───
        function setScene(index, autoPlay) {
          if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
          currentSceneIndex = index;
          const s = scenes[index];
          if (window.HistoriaGeo && typeof window.HistoriaGeo.setActiveScene === 'function') {
            window.HistoriaGeo.setActiveScene(currentStoryId, index);
          }

          if (hudSceneNumber) hudSceneNumber.textContent = `ESCENA ${index + 1} DE ${scenes.length}`;
          if (hudSceneTitle) hudSceneTitle.textContent = s.title || '';
          if (hudScenePeriod) hudScenePeriod.textContent = s.period || '';
          if (hudSceneText) hudSceneText.textContent = s.narration || '';
          if (hudProgressBar) hudProgressBar.style.width = '0%';

          if (btnPrev) btnPrev.disabled = index === 0;
          if (btnNext) btnNext.disabled = index === scenes.length - 1;
          updateGeographicAnchor();
          if (btnAudio) btnAudio.disabled = !s.audio || !isARLocationAvailable();

          audio.pause();
          audio.removeAttribute('src');
          if (s.audio) audio.src = s.audio;
          audio.currentTime = 0;
          audio.load();

          setSceneVideo(s.video);
          updateAbaroaStage(index);

          const animator = getAnimator();
          if (animator) {
            animator.setSceneIndex(index);
            if (isARLocationAvailable()) animator.playSceneChoreography(index);
          }

          const dioramaEntity = aSceneInstance && aSceneInstance.querySelector('#ar-interactive-diorama');
          const diorama = getDiorama();
          if (dioramaEntity) dioramaEntity.setAttribute('visible', String(currentStoryId === 'franz'));
          if (diorama && currentStoryId === 'franz') diorama.setActiveScene(index);

          if (aSceneInstance) {
            for (let i = 1; i <= 5; i++) {
              const visualEntity = aSceneInstance.querySelector(`#ar-visuals-scene-${i}`);
              if (visualEntity) {
                visualEntity.setAttribute('visible', String(currentStoryId === 'franz' && i === index + 1));
              }
            }
          }

          window.dispatchEvent(new CustomEvent('historia:scene-changed', {
            detail: { index, storyId: currentStoryId }
          }));

          if (autoPlay && isARLocationAvailable() && s.audio) {
            playAudio();
          } else {
            updateAudioUI(false);
          }
        }

        function setSceneVideo(source) {
          if (!aSceneInstance) return;
          const video = aSceneInstance.querySelector('#ar-scene-video');
          const panel = aSceneInstance.querySelector('#ar-video-panel');
          if (!video || !panel) return;

          if (!source) {
            video.pause();
            video.removeAttribute('src');
            delete video.dataset.sceneSource;
            video.load();
            panel.setAttribute('visible', 'false');
            return;
          }

          if (!isARLocationAvailable()) {
            video.pause();
            panel.setAttribute('visible', 'false');
            return;
          }

          const sourceUrl = new URL(source, window.location.href).href;
          if (video.dataset.sceneSource === sourceUrl) {
            if (video.dataset.failedSource === sourceUrl) return;
            panel.setAttribute('visible', 'true');
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.paused) {
              video.play().catch(function (error) {
                if (video.dataset.sceneSource !== sourceUrl) return;
                if (error.name === 'AbortError') return;
                video.dataset.failedSource = sourceUrl;
                panel.setAttribute('visible', 'false');
                console.warn('[Historia Viva] El navegador no permitió reproducir el video:', error);
              });
            }
            return;
          }

          video.pause();
          panel.setAttribute('visible', 'true');
          video.dataset.sceneSource = sourceUrl;
          delete video.dataset.failedSource;
          video.src = source;
          video.load();
          video.play().catch(function (error) {
            if (video.dataset.sceneSource !== sourceUrl) return;
            if (error.name === 'AbortError') return;
            video.dataset.failedSource = sourceUrl;
            panel.setAttribute('visible', 'false');
            console.warn('[Historia Viva] El navegador no permitió reproducir el video:', error);
          });
        }

        function setStory(storyId) {
          const story = stories[storyId];
          if (!story || !Array.isArray(story.scenes) || story.scenes.length === 0) return;

          pauseAudio();
          currentStoryId = storyId;
          scenes = story.scenes;
          currentSceneIndex = 0;
          if (storySelect) storySelect.value = storyId;
          if (btnToggleMinimap) btnToggleMinimap.hidden = false;
          if (btnSimulate) btnSimulate.hidden = false;
          if (window.HistoriaGeo && typeof window.HistoriaGeo.setActiveScene === 'function') {
            window.HistoriaGeo.setActiveScene(storyId, 0);
          }

          if (aSceneInstance) {
            const franzModel = aSceneInstance.querySelector('#franz-tamayo-figure');
            const abaroaModel = aSceneInstance.querySelector('#eduardo-abaroa-figure');
            const characterName = aSceneInstance.querySelector('#ar-character-name');
            const companion = aSceneInstance.querySelector('#ar-companion-student');
            const modelHint = aSceneInstance.querySelector('#ar-model-error-label');

            if (franzModel) franzModel.setAttribute('visible', String(storyId === 'franz'));
            if (abaroaModel) {
              abaroaModel.setAttribute('visible', String(storyId === 'abaroa'));
              if (storyId === 'abaroa' && isARLocationAvailable()) {
                ensureAbaroaModelLoaded();
              } else if (modelHint) {
                modelHint.setAttribute('visible', 'false');
              }
            }
            updateAbaroaStage(currentSceneIndex);
            if (characterName) {
              characterName.setAttribute('text', 'value', storyId === 'franz' ? 'FRANZ TAMAYO' : 'EDUARDO ABAROA');
            }
            if (companion) companion.setAttribute('visible', String(storyId === 'franz'));
          }

          setScene(0, false);
          syncSitePresence();
        }

            // ─── Reproducción de Audio y Movimiento de Boca ───
            function playAudio() {
              const scene = scenes[currentSceneIndex];
              if (!scene || !scene.audio) {
                updateAudioUI(false);
                return;
              }
              if (!isARLocationAvailable()) {
                pauseAudio();
                return;
              }

              if (!audio.src || audio.src === window.location.href) {
                audio.src = scene.audio;
              }

              audio
                .play()
                .then(() => {
                  updateAudioUI(true);
                })
                .catch(() => {
                  updateAudioUI(false);
                });
            }

            function pauseAudio() {
              audio.pause();
              updateAudioUI(false);
            }

            function toggleAudio() {
              if (audio.paused) playAudio();
              else pauseAudio();
            }

            function updateAudioUI(playing) {
              isAudioPlaying = playing;
              if (btnAudio) {
                btnAudio.classList.toggle('is-playing', playing);
                btnAudio.setAttribute('aria-pressed', String(playing));
              }
              if (btnAudioIcon) btnAudioIcon.textContent = playing ? '⏸' : '▶';
              if (btnAudioLabel) btnAudioLabel.textContent = playing ? 'Pausar' : 'Narrar';

              const animator = getAnimator();
              if (animator) {
                animator.setTalking(playing);
              }
            }

            audio.addEventListener('play', () => updateAudioUI(true));
            audio.addEventListener('pause', () => updateAudioUI(false));
            audio.addEventListener('ended', () => {
              updateAudioUI(false);
              if (hudProgressBar) hudProgressBar.style.width = '100%';
            });
            audio.addEventListener('timeupdate', () => {
              if (audio.duration && hudProgressBar) {
                hudProgressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
              }
            });

            // Conserva el comando anterior sin permitir que el personaje se desplace.
            function toggleWalkMode() {
              const walker = getWalker();
              if (walker) walker.setRoaming(false);
            }

            function toggleMiniMapDrawer(forceState) {
              if (!minimapDrawer) return;
              const willOpen = typeof forceState === 'boolean' ? forceState : minimapDrawer.hidden;
              minimapDrawer.hidden = !willOpen;
              arView.classList.toggle('has-map-open', willOpen);
              if (btnToggleMinimap) {
                btnToggleMinimap.setAttribute('aria-expanded', String(willOpen));
                btnToggleMinimap.setAttribute('aria-label', willOpen ? 'Minimizar mapa' : 'Mostrar mapa');
                btnToggleMinimap.title = willOpen ? 'Minimizar mapa y ver la escena AR' : 'Mostrar el mapa y la ruta de la escena';
                const label = btnToggleMinimap.querySelector('[data-map-toggle-label]');
                const icon = btnToggleMinimap.querySelector('.map-toggle-icon');
                if (label) label.textContent = willOpen ? 'Minimizar mapa' : 'Mostrar mapa';
                if (icon) icon.textContent = willOpen ? '⌄' : '🗺️';
              }
              if (willOpen && window.HistoriaGeo && typeof window.HistoriaGeo.initARMiniMap === 'function') {
                window.HistoriaGeo.initARMiniMap();
              }
            }

            function toggleBottomCard(forceState) {
              if (!bottomCard || !btnToggleBottomCard || !bottomCardContent) return;
              const isExpanded = typeof forceState === 'boolean'
                ? forceState
                : btnToggleBottomCard.getAttribute('aria-expanded') !== 'true';
              bottomCard.classList.toggle('is-collapsed', !isExpanded);
              btnToggleBottomCard.setAttribute('aria-expanded', String(isExpanded));
              btnToggleBottomCard.setAttribute('aria-label', isExpanded ? 'Minimizar escenas' : 'Mostrar escenas');
              const label = btnToggleBottomCard.querySelector('[data-card-toggle-label]');
              const icon = btnToggleBottomCard.querySelector('.card-toggle-icon');
              if (label) label.textContent = isExpanded ? 'Minimizar escenas' : 'Mostrar escenas';
              if (icon) icon.textContent = isExpanded ? '⌄' : '⌃';
              bottomCardContent.hidden = !isExpanded;
            }

            // ─── Abrir y Cerrar la Experiencia Pokémon GO AR ───
            async function openAR() {
              if (window.location.protocol === 'file:') {
                alert('⚠️ Abre la aplicación desde el servidor local (http://localhost:3000) para permitir el uso de la cámara.');
                window.location.href = 'http://localhost:3000';
                return;
              }

              const vrView = document.getElementById('vr-view');
              if (vrView && vrView.getAttribute('aria-hidden') === 'false') {
                if (typeof window.closeVR === 'function') window.closeVR();
              }

              arView.setAttribute('aria-hidden', 'false');
              arView.inert = false;
              document.documentElement.classList.add('ar-active');
              document.body.classList.add('ar-active');
              document.body.style.overflow = 'hidden';

              if (arLoading) arLoading.classList.remove('is-hidden');
              if (statusPill) statusPill.textContent = '🔐 Solicitando permisos de cámara, ubicación y orientación…';
              toggleMiniMapDrawer(true);
              toggleBottomCard(true);

              if (!navigator.geolocation && statusPill) {
                statusPill.textContent = '📍 Este navegador no permite acceso a la ubicación';
              }
              const geoState = window.HistoriaGeo && window.HistoriaGeo.getState && window.HistoriaGeo.getState();
              if (window.HistoriaGeo && typeof window.HistoriaGeo.startGPSTracking === 'function' &&
                (!geoState || !geoState.isTracking)) {
                window.HistoriaGeo.startGPSTracking();
                startedGPSForAR = true;
              }
              const orientationPermission = requestAROrientationPermission();
              const cameraReady = await startCamera();
              const orientationReady = await orientationPermission;
              if (!cameraReady) return;
              mountPokeArScene();
              if (!orientationReady && statusPill) {
                statusPill.textContent = '🧭 Activa orientación y ubicación para fijar las escenas';
              }
              if (currentStoryId === 'abaroa') {
                const sceneIndex = currentSceneIndex;
                setStory(currentStoryId);
                setScene(sceneIndex, false);
              } else {
                setScene(currentSceneIndex, false);
              }
              syncSitePresence();

              const closeBtn = arView.querySelector('[data-close-ar]');
              if (closeBtn) closeBtn.focus({ preventScroll: true });
            }

            function closeAR() {
              pauseAudio();
              const sceneVideo = aSceneInstance && aSceneInstance.querySelector('#ar-scene-video');
              if (sceneVideo) {
                sceneVideo.pause();
                sceneVideo.removeAttribute('src');
                sceneVideo.load();
              }
              stopCamera();
              window.removeEventListener('deviceorientation', handleARDeviceOrientation, true);
              window.removeEventListener('deviceorientationabsolute', handleARDeviceOrientation, true);
              arGeoOrigin = null;
              arFilteredCoordinates = null;
              arInitialHeading = null;
              if (startedGPSForAR && window.HistoriaGeo && typeof window.HistoriaGeo.stopGPSTracking === 'function') {
                window.HistoriaGeo.stopGPSTracking();
                startedGPSForAR = false;
              }
              unmountPokeArScene();

              if (minimapDrawer) minimapDrawer.hidden = true;
              arView.classList.remove('has-map-open');
              if (btnToggleMinimap) btnToggleMinimap.setAttribute('aria-expanded', 'false');
              toggleBottomCard(true);
              if (radarOverlay) {
                radarOverlay.classList.remove('is-active');
                radarOverlay.hidden = true;
              }

              arView.setAttribute('aria-hidden', 'true');
              arView.inert = true;

              restorePageScrollAndUnlockDOM();

              // Regresar suavemente al inicio de la página principal
              requestAnimationFrame(() => {
                restorePageScrollAndUnlockDOM();
                const inicioEl = document.getElementById('inicio');
                if (inicioEl) {
                  inicioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              });
            }

            window.closeAR = closeAR;
            window.openAR = openAR;
            window.TamayoAR = { open: openAR, close: closeAR, setScene, setStory };

            // ─── Listeners de Botones y Eventos ───
            function setupListeners() {
              document.querySelectorAll('[data-open-ar]').forEach((b) => b.addEventListener('click', openAR));
              document.querySelectorAll('[data-close-ar]').forEach((b) =>
                b.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeAR();
                })
              );

              document.addEventListener('click', (e) => {
                const closeTarget = e.target.closest('[data-close-ar]');
                if (closeTarget) {
                  e.preventDefault();
                  closeAR();
                }
              });

              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && arView && arView.getAttribute('aria-hidden') === 'false') {
                  closeAR();
                }
              });

              if (btnPrev) btnPrev.addEventListener('click', () => setScene(currentSceneIndex - 1, isAudioPlaying));
              if (btnNext) btnNext.addEventListener('click', () => setScene(currentSceneIndex + 1, isAudioPlaying));
              if (btnAudio) btnAudio.addEventListener('click', toggleAudio);
              if (storySelect) storySelect.addEventListener('change', () => setStory(storySelect.value));

              if (btnToggleMinimap) {
                btnToggleMinimap.addEventListener('click', () => toggleMiniMapDrawer());
              }
              if (minimapClose) {
                minimapClose.addEventListener('click', () => toggleMiniMapDrawer(false));
              }
              if (btnToggleBottomCard) {
                btnToggleBottomCard.addEventListener('click', () => toggleBottomCard());
              }

              const triggerSimulate = () => {
                if (window.HistoriaGeo && window.HistoriaGeo.simulateInRange) {
                  window.HistoriaGeo.simulateInRange();
                }
              };
              if (btnSimulate) btnSimulate.addEventListener('click', triggerSimulate);
              if (radarSimulateBtn) radarSimulateBtn.addEventListener('click', triggerSimulate);
              if (radarWalkRouteBtn) {
                radarWalkRouteBtn.addEventListener('click', () => {
                  if (window.HistoriaGeo && window.HistoriaGeo.walkShortestPath) {
                    window.HistoriaGeo.walkShortestPath();
                  }
                });
              }

              window.addEventListener('historia:geo-update', syncSitePresence);
              window.addEventListener('historia:geo-range-changed', syncSitePresence);
              window.addEventListener('historia:scene-location-changed', syncSitePresence);

              // Selección interactiva de escena al tocar objetos 3D o estaciones del mapa
              window.addEventListener('historia:select-scene', (e) => {
                if (e.detail && Number.isInteger(e.detail.index)) {
                  if (e.detail.storyId && e.detail.storyId !== currentStoryId) {
                    setStory(e.detail.storyId);
                  }
                  setScene(e.detail.index, false);
                }
              });

              document.addEventListener('historia:voice-command', (event) => {
                if (!arView || arView.getAttribute('aria-hidden') !== 'false' || !event.detail) return;
                const action = event.detail.action;

                if (action === 'scene' && Number.isInteger(event.detail.index)) {
                  setScene(event.detail.index, isAudioPlaying);
                } else if (action === 'next') {
                  setScene(Math.min(currentSceneIndex + 1, scenes.length - 1), isAudioPlaying);
                } else if (action === 'previous') {
                  setScene(Math.max(currentSceneIndex - 1, 0), isAudioPlaying);
                } else if (action === 'audio') {
                  toggleAudio();
                } else if (action === 'walk') {
                  toggleWalkMode();
                }
              });
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setupListeners);
            } else {
              setupListeners();
            }
          }) ();
