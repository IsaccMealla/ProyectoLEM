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
  const btnReanchor = document.getElementById('ar-btn-reanchor');
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
  let arAnchorLocked = false;
  let lastStepTimestamp = 0;
  let accelMagnitudeAvg = 9.81;

  const DEFAULT_SPAWN_DISTANCE = 2.35;

  function getARUserCoordinates() {
    const geoState = window.HistoriaGeo && window.HistoriaGeo.getState
      ? window.HistoriaGeo.getState()
      : null;
    return geoState && geoState.userCoords ? geoState.userCoords : null;
  }

  function getCameraForwardHorizontal() {
    if (!aSceneInstance || !window.THREE) return { x: 0, z: -1, camPos: { x: 0, y: 1.6, z: 0 } };
    const cameraEl = aSceneInstance.querySelector('#pokear-camera') || aSceneInstance.querySelector('[camera]');
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    const camPos = new THREE.Vector3(0, 1.6, 0);
    const forward = new THREE.Vector3(0, 0, -1);

    if (cameraEl && cameraEl.object3D) {
      cameraEl.object3D.updateMatrixWorld(true);
      cameraEl.object3D.getWorldPosition(camPos);
      const quat = new THREE.Quaternion();
      cameraEl.object3D.getWorldQuaternion(quat);
      forward.applyQuaternion(quat);
    } else if (cameraRig && cameraRig.object3D) {
      camPos.copy(cameraRig.object3D.position);
    }

    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }
    return { x: forward.x, z: forward.z, camPos };
  }

  // Ancla el escenario 3D a distancia natural (2.35m) frente a la vista actual del usuario
  // y lo deja 100% fijo en el mundo real (estilo Pokémon GO).
  function placeSceneInFrontOfCamera(distance = DEFAULT_SPAWN_DISTANCE) {
    if (!aSceneInstance || !window.THREE) return;
    const anchor = getWorldAnchor();
    if (!anchor || !anchor.object3D) return;

    const { x: fx, z: fz, camPos } = getCameraForwardHorizontal();
    const targetX = camPos.x + fx * distance;
    const targetZ = camPos.z + fz * distance;

    anchor.object3D.position.set(targetX, 0, targetZ);
    // Orientar el frente (+Z) del escenario directamente hacia la cámara del usuario
    const yawToCamera = Math.atan2(-fx, -fz);
    anchor.object3D.rotation.set(0, yawToCamera, 0);
    anchor.object3D.updateMatrixWorld(true);
    arAnchorLocked = true;

    const coords = getARUserCoordinates();
    if (coords) {
      arGeoOrigin = { lat: coords.lat, lng: coords.lng };
      arFilteredCoordinates = { lat: coords.lat, lng: coords.lng };
    }
  }

  function moveCameraRigAlongView(stepMeters) {
    if (!aSceneInstance || !arAnchorLocked) return;
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    const anchor = getWorldAnchor();
    if (!cameraRig || !cameraRig.object3D || !anchor || !anchor.object3D) return;

    const { x: fx, z: fz } = getCameraForwardHorizontal();
    const nextX = cameraRig.object3D.position.x + fx * stepMeters;
    const nextZ = cameraRig.object3D.position.z + fz * stepMeters;

    const dx = nextX - anchor.object3D.position.x;
    const dz = nextZ - anchor.object3D.position.z;
    const distToAnchor = Math.hypot(dx, dz);
    if (distToAnchor >= 0.85 && distToAnchor <= 6.5) {
      cameraRig.object3D.position.x = nextX;
      cameraRig.object3D.position.z = nextZ;
      cameraRig.object3D.updateMatrixWorld(true);
    }
  }

  function getAnchorDistanceMeters() {
    if (!aSceneInstance) return DEFAULT_SPAWN_DISTANCE;
    const anchor = getWorldAnchor();
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    if (!anchor || !anchor.object3D || !cameraRig || !cameraRig.object3D) return DEFAULT_SPAWN_DISTANCE;
    const dx = anchor.object3D.position.x - cameraRig.object3D.position.x;
    const dz = anchor.object3D.position.z - cameraRig.object3D.position.z;
    return Math.round(Math.hypot(dx, dz) * 10) / 10;
  }

  function updateGeographicAnchor(coords = getARUserCoordinates()) {
    if (!aSceneInstance) return;
    if (!arAnchorLocked && isARLocationAvailable()) {
      placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE);
      return;
    }
    if (!coords || !arAnchorLocked) return;
    const geoState = window.HistoriaGeo && window.HistoriaGeo.getState ? window.HistoriaGeo.getState() : null;
    if (geoState && geoState.isSimulated) return;

    if (!arFilteredCoordinates) {
      arFilteredCoordinates = { lat: coords.lat, lng: coords.lng };
      return;
    }

    const latScale = 111320;
    const lngScale = latScale * Math.cos(arFilteredCoordinates.lat * Math.PI / 180);
    const deltaEast = (coords.lng - arFilteredCoordinates.lng) * lngScale;
    const deltaNorth = (coords.lat - arFilteredCoordinates.lat) * latScale;
    const displacement = Math.hypot(deltaEast, deltaNorth);
    const accuracy = coords.accuracy || 15;

    // Solo desplazar suavemente la cámara si hay caminata real con buena precisión GPS,
    // manteniendo el escenario 3D completamente estático en su lugar.
    if (accuracy <= 12 && displacement > 0.8 && displacement < 4.5) {
      const stepFactor = 0.25;
      arFilteredCoordinates.lat += (coords.lat - arFilteredCoordinates.lat) * stepFactor;
      arFilteredCoordinates.lng += (coords.lng - arFilteredCoordinates.lng) * stepFactor;
      const headingRad = (arInitialHeading || 0) * (Math.PI / 180);
      const moveX = (deltaEast * Math.cos(headingRad) - deltaNorth * Math.sin(headingRad)) * stepFactor;
      const moveZ = -(deltaEast * Math.sin(headingRad) + deltaNorth * Math.cos(headingRad)) * stepFactor;
      const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
      const anchor = getWorldAnchor();
      if (cameraRig && anchor) {
        const nextX = cameraRig.object3D.position.x + moveX;
        const nextZ = cameraRig.object3D.position.z + moveZ;
        const dist = Math.hypot(nextX - anchor.object3D.position.x, nextZ - anchor.object3D.position.z);
        if (dist >= 0.85 && dist <= 6.5) {
          cameraRig.object3D.position.x = nextX;
          cameraRig.object3D.position.z = nextZ;
          cameraRig.object3D.updateMatrixWorld(true);
        }
      }
    }
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
  }

  // Podómetro por acelerómetro (devicemotion): al dar pasos físicos con el celular,
  // acerca o mueve suavemente la cámara hacia el modelo estático en el mundo real.
  function handleARDeviceMotion(event) {
    if (!aSceneInstance || !arAnchorLocked || !isARLocationAvailable()) return;
    const acc = event.accelerationIncludingGravity;
    if (!acc || !Number.isFinite(acc.x) || !Number.isFinite(acc.y) || !Number.isFinite(acc.z)) return;
    const mag = Math.hypot(acc.x, acc.y, acc.z);
    accelMagnitudeAvg = accelMagnitudeAvg * 0.9 + mag * 0.1;
    const delta = mag - accelMagnitudeAvg;
    const now = performance.now();
    if (delta > 2.15 && now - lastStepTimestamp > 430) {
      lastStepTimestamp = now;
      moveCameraRigAlongView(0.36);
    }
  }

  function requestAROrientationPermission() {
    const OrientationEvent = window.DeviceOrientationEvent;
    const MotionEvent = window.DeviceMotionEvent;
    if (!OrientationEvent) return Promise.resolve(false);
    let requested;
    try {
      requested = typeof OrientationEvent.requestPermission === 'function'
        ? OrientationEvent.requestPermission()
        : Promise.resolve('granted');
      if (MotionEvent && typeof MotionEvent.requestPermission === 'function') {
        MotionEvent.requestPermission().catch(() => {});
      }
    } catch (error) {
      console.warn('[Historia Viva] No se pudo solicitar acceso a la orientación del dispositivo:', error);
      return Promise.resolve(false);
    }
    return Promise.resolve(requested).then((permission) => {
      if (permission !== 'granted') return false;
      window.addEventListener('deviceorientation', handleARDeviceOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleARDeviceOrientation, true);
      window.addEventListener('devicemotion', handleARDeviceMotion, true);
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
        this.localTime = 0;
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
          this.localTime = 0;
          const portal = this.el.querySelector('#abaroa-topater-portal');
          if (portal) portal.setAttribute('visible', String(this.data.scene === 1));
          const strategy = this.el.querySelector('[data-abaroa-scene="1"]');
          if (strategy) {
            delete strategy.dataset.cabreraPointed;
            delete strategy.dataset.abaroaReply;
          }
          const resistance = this.el.querySelector('[data-abaroa-scene="3"]');
          if (resistance) delete resistance.dataset.challengePlayed;
          if (this.data.scene === 0) {
            ['#abaroa-route-ring', '#abaroa-map-scan', '[data-abaroa-route-marker]'].forEach((selector) => {
              this.el.querySelectorAll(selector).forEach((entity) => entity.setAttribute('visible', 'true'));
            });
          }
        }
      },

      remove() {
        audio.removeEventListener('ended', this.onAudioEnded);
      },

      tick(time, delta) {
        if (!isARLocationAvailable()) return;
        this.localTime += Math.min(delta || 16, 50) / 1000;
        const syntheticProgress = (this.localTime % 32) / 32;
        const progress = (!audio.paused && audio.duration > 0)
          ? audio.currentTime / audio.duration
          : syntheticProgress;

        const figure = this.el.parentElement && this.el.parentElement.querySelector('#eduardo-abaroa-figure');
        if (figure && !figure.object3D.visible && currentStoryId === 'abaroa') {
          figure.setAttribute('visible', 'true');
        }
        if (this.data.scene === 0) {
          this.el.querySelectorAll('#abaroa-route-ring, #abaroa-map-scan, [data-abaroa-route-marker]').forEach((entity) => {
            if (!entity.object3D.visible) entity.setAttribute('visible', 'true');
          });
          return;
        }
        if (this.data.scene === 1) {
          const strategy = this.el.querySelector('[data-abaroa-scene="1"]');
          if (strategy) {
            const cabrera = this.el.querySelector('#abaroa-cabrera');
            const gesture = cabrera && cabrera.components && cabrera.components['npc-person'];
            if (progress >= 0.25 && strategy.dataset.cabreraPointed !== 'true') {
              strategy.dataset.cabreraPointed = 'true';
              if (gesture) gesture.playGesture('point', 2.8);
            }
            if (progress >= 0.55 && strategy.dataset.abaroaReply !== 'true') {
              strategy.dataset.abaroaReply = 'true';
              if (gesture) gesture.playGesture('nod', 2.2);
            }
            if (progress < 0.1) {
              delete strategy.dataset.cabreraPointed;
              delete strategy.dataset.abaroaReply;
            }
          }
          return;
        }
        if (this.data.scene === 2) {
          const defenders = this.el.querySelectorAll('[data-abaroa-retreat]');
          defenders.forEach((defender, index) => {
            const startX = Number(defender.dataset.abaroaRetreatStartX);
            const retreat = Math.max(0, Math.min(1, (progress - 0.65) / 0.25));
            const target = startX - retreat * (0.9 + index * 0.18);
            defender.object3D.position.x += (target - defender.object3D.position.x) * 0.03;
          });
          const activeTime = !audio.paused ? audio.currentTime : this.localTime;
          const shot = Math.floor(activeTime / 2.1);
          const muzzleFlash = this.el.querySelector('#abaroa-muzzle-flash');
          const cannonFlash = this.el.querySelector('#abaroa-cannon-flash');
          if (shot !== this.lastShot) {
            this.lastShot = shot;
            if (muzzleFlash) muzzleFlash.emit('abaroa-shot');
            if (cannonFlash && shot % 2 === 0) cannonFlash.emit('abaroa-shot');
          }
        } else if (this.data.scene === 3) {
          if (progress >= 0.35) {
            const resistance = this.el.querySelector('[data-abaroa-scene="3"]');
            const officer = resistance && resistance.querySelector('#abaroa-final-officer');
            const gesture = officer && officer.components && officer.components['npc-person'];
            if (resistance && resistance.dataset.challengePlayed !== 'true') {
              resistance.dataset.challengePlayed = 'true';
              if (gesture) gesture.playGesture('point', 2.5);
            }
          } else {
            const resistance = this.el.querySelector('[data-abaroa-scene="3"]');
            if (resistance) delete resistance.dataset.challengePlayed;
          }
          const volleyWindow = progress >= 0.55 && progress < 0.92;
          const flashOn = volleyWindow && time % 850 < 200;
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
        this.source.setAttribute('scale', '1.65 1.65 1.65');
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

        const count = 3;
        this.actors = [this.source.object3D];
        for (let index = 1; index < count; index++) {
          const actor = model.clone(true);
          actor.visible = true;
          actor.scale.setScalar(1.65);
          this.el.object3D.add(actor);
          this.actors.push(actor);
        }
        this.loaded = true;
        this.loading = false;
      },

      getActorTarget(index, progress) {
        if (this.data.role === 'colorado' && this.data.scene === 1) {
          const starts = [[-0.95, -1.25], [0.05, -1.55], [0.95, -1.25]];
          const phase = this.time * 0.9 + index * 1.4;
          return {
            x: starts[index][0] + Math.sin(phase) * 0.22,
            y: 0,
            z: starts[index][1] + Math.cos(phase) * 0.14,
            walking: Math.abs(Math.sin(phase)) > 0.3 ? 0.45 : 0.08
          };
        }

        if (this.data.role === 'colorado') {
          const starts = [[-1.15, -1.2], [-1.65, -1.65], [-0.75, -1.8]];
          const retreat = Math.max(0, Math.min(1, (progress - 0.68) / 0.24));
          const patrol = Math.sin(this.time * 1.1 + index) * 0.15;
          return {
            x: starts[index][0] - retreat * (0.85 + index * 0.1) + patrol,
            y: 0,
            z: starts[index][1] + retreat * 0.3,
            walking: retreat > 0 ? 0.95 : 0.25
          };
        }

        if (this.data.scene === 2) {
          const starts = [[-1.35, -3.4], [0, -3.7], [1.35, -3.4]];
          const advance = Math.max(0, Math.min(1, (progress - 0.08) / 0.68));
          return {
            x: starts[index][0] * (1 - advance * 0.16),
            y: 0,
            z: starts[index][1] + advance * 1.45,
            walking: advance > 0.72 ? 0.95 : advance > 0.08 ? 0.68 : 0.22
          };
        }

        const starts = [[-0.95, -2.9], [0.95, -2.9], [0, -3.3]];
        const advance = Math.max(0, Math.min(1, (progress - 0.32) / 0.35));
        return {
          x: starts[index][0],
          y: 0,
          z: starts[index][1] + advance * 0.95,
          walking: advance > 0.08 ? 0.45 : 0.15,
          visible: true
        };
      },

      tick(time, delta) {
        if (!this.data.active || !this.loaded) return;
        this.time += Math.min(delta || 16, 50) / 1000;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const progress = (!audio.paused && duration)
          ? Math.min(1, audio.currentTime / duration)
          : (this.time % 28) / 28;

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
          const dx = target.x - actor.position.x;
          const dz = target.z - actor.position.z;
          if (Math.hypot(dx, dz) > 0.02) {
            actor.rotation.y = Math.atan2(dx, dz);
          } else {
            actor.rotation.y = 0;
          }
          actor.rotation.x = -0.1 * target.walking;
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
      position: '0.88 0.78 -0.25',
      width: '1.45',
      height: '0.12',
      depth: '0.88',
      color: '#563a27',
      material: 'roughness: 0.82'
    });
    createStageEntity(prologue, 'a-box', {
      position: '0.88 0.38 -0.25',
      width: '0.12',
      height: '0.76',
      depth: '0.12',
      color: '#4a3021'
    });
    createStageEntity(prologue, 'a-plane', {
      position: '0.88 0.85 -0.25',
      rotation: '-90 0 0',
      width: '1.3',
      height: '0.72',
      color: '#b28b58',
      material: 'roughness: 0.95'
    });
    createStageEntity(prologue, 'a-text', {
      value: 'LITORAL · ANTOFAGASTA → CALAMA',
      position: '0.88 0.89 -0.25',
      rotation: '-90 0 0',
      align: 'center',
      width: '1.25',
      color: '#2e281f'
    });
    const routeRing = createStageEntity(prologue, 'a-torus', {
      id: 'abaroa-route-ring',
      position: '0.88 0.94 -0.25',
      rotation: '90 0 0',
      radius: '0.44',
      'radius-tubular': '0.012',
      color: '#39e8d0',
      material: 'emissive: #39e8d0; emissiveIntensity: 0.85'
    });
    routeRing.setAttribute('visible', 'true');
    routeRing.setAttribute('animation__pulse', 'property: scale; from: 0.88 0.88 0.88; to: 1.12 1.12 1.12; dir: alternate; dur: 1700; loop: true; easing: easeInOutSine');
    routeRing.setAttribute('animation__turn', 'property: rotation; from: 90 0 0; to: 90 360 0; dur: 18000; loop: true; easing: linear');
    [[0.46, 0.96, -0.22], [1.26, 0.96, -0.28], [0.88, 0.98, -0.24]].forEach((point, index) => {
      const marker = createStageEntity(prologue, 'a-sphere', {
        'data-abaroa-route-marker': '',
        position: `${point[0]} ${point[1]} ${point[2]}`,
        radius: '0.045',
        material: 'color: #6affed; emissive: #28dcca; emissiveIntensity: 1.1'
      });
      marker.setAttribute('animation__pulse', `property: scale; from: 0.75 0.75 0.75; to: 1.45 1.45 1.45; dir: alternate; dur: ${850 + index * 180}; delay: ${index * 220}; loop: true; easing: easeInOutSine`);
      marker.setAttribute('visible', 'true');
    });
    const mapScan = createStageEntity(prologue, 'a-torus', {
      id: 'abaroa-map-scan',
      position: '0.88 1.015 -0.25',
      rotation: '90 0 0',
      radius: '0.25',
      'radius-tubular': '0.009',
      material: 'color: #65fff0; emissive: #28dcca; emissiveIntensity: 0.6; transparent: true; opacity: 0.75'
    });
    mapScan.setAttribute('visible', 'true');
    mapScan.setAttribute('animation__scan', 'property: scale; from: 0.2 0.2 0.2; to: 2.3 2.3 2.3; dur: 2200; loop: true; easing: easeOutQuad');
    mapScan.setAttribute('animation__fade', 'property: material.opacity; from: 0.78; to: 0.08; dur: 2200; loop: true; easing: easeOutQuad');
    // Barco holográfico animado en el puerto de Antofagasta sobre la mesa táctica
    const holoShip = createStageEntity(prologue, 'a-cone', {
      position: '0.46 1.04 -0.22',
      rotation: '90 90 0',
      'radius-bottom': '0.045',
      'radius-top': '0.005',
      height: '0.16',
      material: 'color: #38bdf8; emissive: #0284c7; emissiveIntensity: 0.85; opacity: 0.88; transparent: true'
    });
    holoShip.setAttribute('animation__sail', 'property: position; from: 0.42 1.04 -0.22; to: 0.78 1.04 -0.25; dir: alternate; dur: 3600; loop: true; easing: easeInOutSine');
    // Brújula táctica dorada giratoria y estandarte tricolor en Escena 1
    const compassRose = createStageEntity(prologue, 'a-cylinder', {
      position: '1.38 0.89 0.02',
      radius: '0.09',
      height: '0.02',
      material: 'color: #d4af37; metalness: 0.85; roughness: 0.25'
    });
    createStageEntity(compassRose, 'a-box', {
      position: '0 0.02 0',
      width: '0.14',
      height: '0.01',
      depth: '0.022',
      material: 'color: #ef4444; emissive: #dc2626; emissiveIntensity: 0.5'
    }).setAttribute('animation__needle', 'property: rotation; from: 0 -35 0; to: 0 35 0; dir: alternate; dur: 1900; loop: true; easing: easeInOutSine');
    const prologueFlagPole = createStageEntity(prologue, 'a-cylinder', {
      position: '-0.95 1.15 -0.35',
      radius: '0.022',
      height: '2.3',
      color: '#5c4028'
    });
    const prologueFlag = createStageEntity(prologue, 'a-plane', {
      position: '-0.62 2.02 -0.35',
      width: '0.64',
      height: '0.38',
      material: 'color: #d72e32; side: double'
    });
    createStageEntity(prologueFlag, 'a-plane', {
      position: '0 0 0.005',
      width: '0.64',
      height: '0.125',
      material: 'color: #facc15; side: double'
    });
    createStageEntity(prologueFlag, 'a-plane', {
      position: '0 -0.125 0.01',
      width: '0.64',
      height: '0.125',
      material: 'color: #15803d; side: double'
    });
    prologueFlag.setAttribute('animation__wave', 'property: rotation; from: 0 -8 -3; to: 0 8 4; dir: alternate; dur: 950; loop: true; easing: easeInOutSine');
    prologueFlagPole.setAttribute('animation__sway', 'property: rotation; from: 0 0 -0.6; to: 0 0 0.6; dir: alternate; dur: 1800; loop: true; easing: easeInOutSine');

    const strategy = addScene(1);
    createStageEntity(strategy, 'a-plane', {
      position: '0 0.015 -1.35',
      rotation: '-90 0 0',
      width: '4.6',
      height: '3.6',
      color: '#a98c65',
      material: 'roughness: 1'
    });
    createStageEntity(strategy, 'a-plane', {
      position: '-1.25 0.025 -1.4',
      rotation: '-90 0 0',
      width: '0.95',
      height: '3.4',
      color: '#526b69',
      material: 'opacity: 0.78; transparent: true'
    });
    [-1, 1].forEach((side, index) => {
      const building = createStageEntity(strategy, 'a-entity', {
        position: `${side * 1.95} 0 -3.1`
      });
      createStageEntity(building, 'a-box', {
        position: '0 1.05 0',
        width: index ? '1.8' : '2.1',
        height: '2.1',
        depth: '1.2',
        color: index ? '#b88959' : '#9d734b',
        material: 'roughness: 1'
      });
      createStageEntity(building, 'a-box', {
        position: '0 2.15 0',
        width: index ? '1.95' : '2.25',
        height: '0.15',
        depth: '1.35',
        color: '#68472f'
      });
      [-0.45, 0.45].forEach((windowX) => createStageEntity(building, 'a-box', {
        position: `${windowX} 1.15 0.61`,
        width: '0.3',
        height: '0.5',
        depth: '0.035',
        color: '#382a20'
      }));
    });
    createStageEntity(strategy, 'a-entity', {
      id: 'abaroa-cabrera',
      position: '-1.1 0 -0.55',
      'npc-person': 'mode: idle; facing: 0.35; shirt: #5e5543; pants: #39352e; skin: #a77c58; hair: #2a2119; prop: none'
    });
    createStageEntity(strategy, 'a-text', {
      value: 'LADISLAO CABRERA',
      position: '-1.1 1.95 -0.55',
      align: 'center',
      width: '1.5',
      color: '#fff0d4'
    });
    [[-0.85, -1.1], [-0.2, -1.35], [0.45, -1.1], [1.05, -1.35], [1.55, -1.1]].forEach((point, index) => {
      const sandbag = createStageEntity(strategy, 'a-box', {
        position: `${point[0]} 0.2 ${point[1]}`,
        width: '0.46',
        height: '0.34',
        depth: '0.38',
        color: '#8e7858'
      });
      sandbag.setAttribute('animation__lift', `property: position; from: ${point[0]} 0.2 ${point[1]}; to: ${point[0]} 0.4 ${point[1]}; dir: alternate; dur: ${2200 + index * 240}; delay: ${index * 320}; loop: true; easing: easeInOutSine`);
      sandbag.setAttribute('animation__settle', `property: rotation; from: -2 0 -3; to: 2 0 3; dir: alternate; dur: ${1900 + index * 200}; loop: true; easing: easeInOutSine`);
    });
    [[-0.55, -1.85], [0.55, -2.0], [1.35, -1.8]].forEach((point, index) => {
      addStageActor(strategy, `abaroa-strategy-defender-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.22, speed: 0.18, phase: index * 1.4,
          shirt: index % 2 ? '#625b43' : '#59634b', pants: '#38382f'
        });
    });
    [-1.1, 0, 1.1].forEach((x, index) => createStageEntity(strategy, 'a-box', {
      position: `${x} 0.08 -1.9`,
      width: '1.1',
      height: '0.1',
      depth: '0.22',
      rotation: `0 ${index % 2 ? 3 : -3} 0`,
      color: '#624832'
    }));
    [[-1.7, -0.9], [1.75, -1.4], [-1.6, -2.1], [1.65, -2.2]].forEach((point, index) => {
      const rock = createStageEntity(strategy, 'a-dodecahedron', {
        position: `${point[0]} ${0.12 + (index % 2) * 0.05} ${point[1]}`,
        radius: String(0.22 + (index % 3) * 0.06),
        color: index % 2 ? '#76644d' : '#8b785e',
        material: 'roughness: 1'
      });
      rock.setAttribute('animation__settle', `property: rotation; from: -1 0 -1; to: 1 0 1; dir: alternate; dur: ${2800 + index * 250}; loop: true; easing: easeInOutSine`);
    });
    [-1.05, -1.25, -1.45].forEach((x, index) => {
      const ripple = createStageEntity(strategy, 'a-torus', {
        position: `${x} 0.045 -1.35`,
        rotation: '90 0 0',
        radius: '0.16',
        'radius-tubular': '0.012',
        material: 'color: #8bd1c4; emissive: #326d67; opacity: 0.56; transparent: true'
      });
      ripple.setAttribute('animation__ripple', `property: scale; from: 0.55 0.55 0.55; to: 1.8 1.8 1.8; dur: ${1700 + index * 350}; delay: ${index * 380}; loop: true; easing: easeOutSine`);
    });
    const campfire = createStageEntity(strategy, 'a-cone', {
      position: '1.25 0.22 -0.65',
      'radius-bottom': '0.14',
      'radius-top': '0.015',
      height: '0.4',
      material: 'color: #ff9a42; emissive: #ff6a22; emissiveIntensity: 1.2; transparent: true; opacity: 0.86'
    });
    campfire.setAttribute('animation__flame', 'property: scale; from: 0.82 0.85 0.82; to: 1.15 1.25 1.15; dir: alternate; dur: 360; loop: true; easing: easeInOutSine');
    campfire.setAttribute('animation__flicker', 'property: rotation; from: -4 0 -3; to: 5 0 4; dir: alternate; dur: 520; loop: true; easing: easeInOutSine');
    // Chispas ascendentes de la fogata de campaña
    [0, 1, 2].forEach((sparkIdx) => {
      const spark = createStageEntity(strategy, 'a-sphere', {
        position: `${1.22 + sparkIdx * 0.03} 0.35 -0.65`,
        radius: '0.022',
        material: 'color: #fde047; emissive: #f97316; emissiveIntensity: 1.2'
      });
      spark.setAttribute('animation__rise', `property: position; from: ${1.2 + sparkIdx * 0.03} 0.32 -0.65; to: ${1.18 + sparkIdx * 0.05} 1.15 -0.62; dur: ${1300 + sparkIdx * 280}; delay: ${sparkIdx * 350}; loop: true; easing: easeOutQuad`);
    });
    const portal = createStageEntity(strategy, 'a-entity', {
      id: 'abaroa-topater-portal',
      position: '0 0.04 -2.45',
      visible: 'true'
    });
    const portalRing = createStageEntity(portal, 'a-ring', {
      rotation: '-90 0 0',
      'radius-inner': '0.48',
      'radius-outer': '0.65',
      material: 'color: #42f2d5; emissive: #25c9bd; emissiveIntensity: 0.9; opacity: 0.88; transparent: true'
    });
    portalRing.setAttribute('animation__pulse', 'property: scale; from: 0.85 0.85 0.85; to: 1.18 1.18 1.18; dir: alternate; dur: 900; loop: true; easing: easeInOutSine');
    createStageEntity(portal, 'a-cone', {
      position: '0 0.45 0',
      rotation: '90 0 0',
      'radius-bottom': '0.22',
      'radius-top': '0',
      height: '0.48',
      material: 'color: #42f2d5; emissive: #25c9bd; emissiveIntensity: 0.8'
    });
    createStageEntity(portal, 'a-text', {
      value: 'HACIA EL PUENTE DE TOPÁTER',
      position: '0 1.05 0',
      align: 'center',
      width: '2.3',
      color: '#b9fff4'
    });

    const battle = addScene(2);
    createStageEntity(battle, 'a-plane', {
      position: '0 -0.005 -1.8',
      rotation: '-90 0 0',
      width: '5.2',
      height: '4.6',
      color: '#8e7658',
      material: 'roughness: 1'
    });
    // Río Loa animado bajo el puente de Topáter
    createStageEntity(battle, 'a-plane', {
      position: '0 0.01 -2.1',
      rotation: '-90 0 0',
      width: '4.8',
      height: '1.35',
      color: '#3b6e75',
      material: 'opacity: 0.82; transparent: true'
    });
    createStageEntity(battle, 'a-entity', {
      position: '0 0.08 -2.1',
      id: 'abaroa-topater-bridge'
    });
    [-0.85, 0, 0.85].forEach((x) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.16 -2.1`,
      width: '0.78',
      height: '0.14',
      depth: '2.2',
      color: '#624832'
    }));
    [-1.25, 1.25].forEach((x) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.65 -2.1`,
      width: '0.09',
      height: '0.11',
      depth: '2.2',
      color: '#493422'
    }));
    [-1.4, -0.85, 0.85, 1.4].forEach((x, index) => createStageEntity(battle, 'a-box', {
      position: `${x} 0.3 -0.75`,
      width: '0.68',
      height: '0.5',
      depth: '0.42',
      color: index % 2 ? '#9a805c' : '#806747'
    }));
    // Cañón histórico de campaña con animación de retroceso y fogonazo
    const cannon = createStageEntity(battle, 'a-entity', {
      id: 'abaroa-cannon',
      position: '1.25 0.28 -1.35',
      rotation: '0 18 0'
    });
    createStageEntity(cannon, 'a-cylinder', {
      position: '0 0.18 -0.15',
      rotation: '78 0 0',
      radius: '0.085',
      height: '0.75',
      material: 'color: #27272a; metalness: 0.8; roughness: 0.3'
    }).setAttribute('animation__recoil', 'property: position; from: 0 0.18 -0.15; to: 0 0.16 -0.04; dir: alternate; dur: 650; loop: true; easing: easeInOutQuad');
    [-0.22, 0.22].forEach((wheelX) => {
      createStageEntity(cannon, 'a-torus', {
        position: `${wheelX} 0.08 0`,
        rotation: '0 90 0',
        radius: '0.22',
        'radius-tubular': '0.025',
        color: '#451a03'
      });
    });
    const cannonFlash = createStageEntity(cannon, 'a-sphere', {
      id: 'abaroa-cannon-flash',
      position: '0 0.26 -0.58',
      radius: '0.18',
      scale: '0.1 0.1 0.1',
      material: 'shader: flat; color: #fde047; emissive: #ea580c; emissiveIntensity: 1.6'
    });
    cannonFlash.setAttribute('animation__flash', 'property: scale; from: 0.2 0.2 0.2; to: 1.6 1.6 1.6; dir: alternate; dur: 220; easing: easeOutQuad; startEvents: abaroa-shot');
    [[-0.75, -1.55], [-1.25, -1.95]].forEach((point, index) => {
      const ally = addStageActor(battle, `abaroa-retreating-ally-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.24, speed: 0.22, phase: index * 1.3,
          shirt: '#59634b', pants: '#38382f'
        });
      ally.dataset.abaroaRetreat = 'true';
      ally.dataset.abaroaRetreatStartX = String(point[0]);
    });
    [[-1.65, -2.85], [1.65, -2.95]].forEach((point, index) => {
      const skirmisher = addStageActor(battle, `abaroa-battle-skirmisher-${index + 1}`,
        `${point[0]} 0 ${point[1]}`, {
          mode: 'roam', radius: 0.42, speed: 0.32, phase: index * 2.2,
          shirt: '#4b4d43', pants: '#343630', skin: '#9a765c'
        });
      skirmisher.setAttribute('scale', '0.92 0.92 0.92');
    });
    const muzzleFlash = createStageEntity(battle, 'a-sphere', {
      id: 'abaroa-muzzle-flash',
      position: '0.3 1.35 -0.1',
      radius: '0.16',
      scale: '0.001 0.001 0.001',
      material: 'shader: flat; color: #ffd879; emissive: #ff9a32; emissiveIntensity: 1.5'
    });
    muzzleFlash.setAttribute('animation__flash', 'property: scale; from: 0.2 0.2 0.2; to: 1.7 1.7 1.7; dir: alternate; dur: 170; easing: easeOutQuad; startEvents: abaroa-shot');
    [[-1.1, 0.72, -1.75], [0.1, 0.82, -2.15], [1.1, 0.66, -2.35], [-0.6, 0.58, -2.6]].forEach((point, index) => {
      const smoke = addAnimatedSphere(battle, `abaroa-battle-smoke-${index + 1}`,
        `${point[0]} ${point[1]} ${point[2]}`, 0.36 + (index % 2) * 0.12, '#837c70',
        `property: position; from: ${point[0]} ${point[1]} ${point[2]}; to: ${point[0] + (index % 2 ? 0.18 : -0.16)} ${point[1] + 0.55} ${point[2]}; dur: ${2200 + index * 320}; delay: ${index * 220}; loop: true; easing: easeInOutSine`);
      smoke.setAttribute('animation__expand', `property: scale; from: 0.65 0.7 0.65; to: 1.35 1.2 1.35; dur: ${2600 + index * 240}; delay: ${index * 180}; loop: true; easing: easeInOutSine`);
    });
    [-0.95, 0, 0.95].forEach((x, index) => {
      const plank = createStageEntity(battle, 'a-box', {
        position: `${x} 0.255 -2.1`,
        width: '0.72',
        height: '0.035',
        depth: '2.05',
        color: '#876341'
      });
      plank.setAttribute('animation__creak', `property: rotation; from: -0.8 0 0; to: 0.8 0 0; dir: alternate; dur: ${1700 + index * 230}; delay: ${index * 140}; loop: true; easing: easeInOutSine`);
    });

    const resistance = addScene(3);
    const remainingOfficer = addStageActor(resistance, 'abaroa-final-officer', '0.95 0 -2.45', {
      mode: 'idle', facing: -0.1, shirt: '#4c4a40', pants: '#343630', skin: '#a17c5c'
    });
    remainingOfficer.setAttribute('scale', '0.95 0.95 0.95');
    createStageEntity(remainingOfficer, 'a-cylinder', {
      position: '-0.38 1.05 -0.25',
      rotation: '0 0 90',
      radius: '0.035',
      height: '1',
      color: '#362f26'
    });
    [-0.95, 0.95].forEach((x) => {
      createStageEntity(resistance, 'a-sphere', {
        'data-abaroa-volley-flash': '',
        position: `${x} 1.3 -2.15`,
        radius: '0.13',
        scale: '0.001 0.001 0.001',
        visible: 'false',
        material: 'shader: flat; color: #ffd879; emissive: #ff9a32; emissiveIntensity: 1.5'
      }).setAttribute('animation__flash', 'property: scale; from: 0.001 0.001 0.001; to: 1.4 1.4 1.4; dir: alternate; dur: 180; easing: easeOutQuad; startEvents: abaroa-shot');
    });
    createStageEntity(resistance, 'a-entity', {
      position: '0 0.08 -1.85',
      id: 'abaroa-final-bridge'
    });
    [-0.55, 0, 0.55].forEach((x) => createStageEntity(resistance, 'a-box', {
      position: `${x} 0.08 -1.85`,
      width: '0.52',
      height: '0.12',
      depth: '2.1',
      color: '#60462f'
    }));
    [-0.65, 0, 0.65].forEach((x, index) => {
      const plank = createStageEntity(resistance, 'a-box', {
        position: `${x} 0.16 -1.85`,
        width: '0.48',
        height: '0.035',
        depth: '1.95',
        color: '#856142'
      });
      plank.setAttribute('animation__creak', `property: rotation; from: -0.45 0 0; to: 0.45 0 0; dir: alternate; dur: ${1300 + index * 180}; loop: true; easing: easeInOutSine`);
    });
    // Frase inmortal de Eduardo Abaroa iluminada sobre el puente de Topáter
    const heroicBanner = createStageEntity(resistance, 'a-entity', {
      position: '0 2.25 -1.45'
    });
    createStageEntity(heroicBanner, 'a-plane', {
      width: '2.35',
      height: '0.38',
      material: 'color: #1c1917; opacity: 0.88; transparent: true; emissive: #78350f; emissiveIntensity: 0.35'
    });
    createStageEntity(heroicBanner, 'a-text', {
      value: '«¿RENDICIÓN? ¡QUE SE RINDA SU ABUELA, CARAJO!»',
      align: 'center',
      position: '0 0 0.02',
      width: '2.25',
      color: '#fde047'
    });
    heroicBanner.setAttribute('animation__float', 'property: position; from: 0 2.22 -1.45; to: 0 2.32 -1.45; dir: alternate; dur: 1900; loop: true; easing: easeInOutSine');
    [[-0.85, 0.35, -1.55], [0.75, 0.42, -2.1], [0.1, 0.32, -2.4]].forEach((point, index) => {
      const dust = addAnimatedSphere(resistance, `abaroa-stand-dust-${index + 1}`,
        `${point[0]} ${point[1]} ${point[2]}`, 0.26, '#b6a18a',
        `property: position; from: ${point[0]} ${point[1]} ${point[2]}; to: ${point[0] + (index - 1) * 0.22} ${point[1] + 0.4} ${point[2]}; dur: ${2200 + index * 400}; delay: ${index * 300}; loop: true; easing: easeInOutSine`);
      dust.setAttribute('animation__fade', `property: scale; from: 0.3 0.25 0.3; to: 1.1 0.9 1.1; dur: ${2100 + index * 340}; delay: ${index * 270}; loop: true; easing: easeInOutSine`);
    });

    const memorial = addScene(4);
    [-1.8, -0.9, 0, 0.9, 1.8].forEach((x, index) => {
      createStageEntity(memorial, 'a-cone', {
        position: `${x} ${0.95 + (index % 2) * 0.3} -3.6`,
        'radius-bottom': '0.85',
        'radius-top': '0',
        height: `${1.8 + (index % 2) * 0.6}`,
        color: index % 2 ? '#665b4c' : '#75634f',
        material: 'roughness: 1'
      });
    });
    createStageEntity(memorial, 'a-cylinder', {
      position: '0.85 0.42 -0.85',
      radius: '0.46',
      height: '0.82',
      color: '#78674e',
      material: 'roughness: 0.76'
    });
    createStageEntity(memorial, 'a-cylinder', {
      position: '0.85 0.85 -0.85',
      radius: '0.55',
      height: '0.08',
      color: '#a88854',
      material: 'metalness: 0.45; roughness: 0.38'
    });
    createStageEntity(memorial, 'a-text', {
      value: 'EDUARDO ABAROA\nHÉROE DEL TOPÁTER',
      position: '0.85 1.25 -0.85',
      align: 'center',
      width: '1.7',
      color: '#fff0d4'
    });
    // Pebetero con Llama Votiva Eterna en el Memorial
    const eternalFlame = createStageEntity(memorial, 'a-cone', {
      id: 'abaroa-eternal-flame',
      position: '0.85 1.04 -0.85',
      'radius-bottom': '0.14',
      'radius-top': '0.01',
      height: '0.38',
      material: 'color: #fbbf24; emissive: #ea580c; emissiveIntensity: 1.3; opacity: 0.9; transparent: true'
    });
    eternalFlame.setAttribute('animation__flame', 'property: scale; from: 0.85 0.88 0.85; to: 1.18 1.28 1.18; dir: alternate; dur: 420; loop: true; easing: easeInOutSine');
    const memorialRing = createStageEntity(memorial, 'a-torus', {
      position: '0.85 1.62 -0.85',
      rotation: '0 90 0',
      radius: '0.95',
      'radius-tubular': '0.018',
      color: '#e0bd72',
      material: 'emissive: #a87933; emissiveIntensity: 0.6'
    });
    memorialRing.setAttribute('animation__orbit', 'property: rotation; from: 0 90 0; to: 0 450 0; dur: 24000; loop: true; easing: linear');
    memorialRing.setAttribute('animation__breathe', 'property: scale; from: 0.94 0.94 0.94; to: 1.04 1.04 1.04; dir: alternate; dur: 2800; loop: true; easing: easeInOutSine');
    for (let index = 0; index < 5; index++) {
      const orbit = createStageEntity(memorial, 'a-entity', {
        position: '0.85 1.65 -0.85',
        rotation: `0 ${index * 72} 0`
      });
      createStageEntity(orbit, 'a-sphere', {
        position: '0.85 0 0',
        radius: '0.07',
        material: 'color: #ffe4a0; emissive: #d7a64b; emissiveIntensity: 0.8'
      }).setAttribute('animation__pulse', `property: scale; from: 0.75 0.75 0.75; to: 1.35 1.35 1.35; dir: alternate; dur: ${1000 + index * 190}; delay: ${index * 150}; loop: true; easing: easeInOutSine`);
      orbit.setAttribute('animation__turn', `property: rotation; from: 0 ${index * 72} 0; to: 0 ${index * 72 + 360} 0; dur: ${18000 + index * 1700}; loop: true; easing: linear`);
    }
    [[0.35, 1.7, -1.1], [1.45, 1.25, -1.2], [0.5, 2.2, -0.6], [1.32, 2.15, -0.5]].forEach((point, index) => {
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
      position: '0.85 2.65 -0.85',
      align: 'center',
      width: '2.1',
      color: '#ffe1a0'
    });
    [-1.45, 1.45].forEach((x, index) => {
      const pole = createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 1.45 -1.55`,
        radius: '0.025',
        height: '2.8',
        color: '#6d5537'
      });
      const flag = createStageEntity(memorial, 'a-plane', {
        position: `${x + (index ? -0.36 : 0.36)} 2.35 -1.55`,
        width: '0.72',
        height: '0.4',
        material: 'color: #d72e32; side: double; roughness: 0.8'
      });
      createStageEntity(flag, 'a-plane', {
        position: '0 0 0.006',
        width: '0.72',
        height: '0.13',
        material: 'color: #f3e8c1; side: double'
      });
      createStageEntity(flag, 'a-plane', {
        position: '0 -0.13 0.012',
        width: '0.72',
        height: '0.13',
        material: 'color: #1d7b4b; side: double'
      });
      flag.setAttribute('animation__wave', `property: rotation; from: 0 0 -5; to: 0 0 5; dir: alternate; dur: ${900 + index * 240}; loop: true; easing: easeInOutSine`);
      pole.setAttribute('animation__sway', `property: rotation; from: 0 0 -0.7; to: 0 0 0.7; dir: alternate; dur: ${1800 + index * 350}; loop: true; easing: easeInOutSine`);
    });
    [-1.15, 0, 1.15].forEach((x, index) => {
      createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 0.32 -1.95`,
        radius: '0.28',
        height: '0.64',
        color: '#78674e',
        material: 'roughness: 0.78'
      });
      createStageEntity(memorial, 'a-cylinder', {
        position: `${x} 0.66 -1.95`,
        radius: '0.34',
        height: '0.08',
        color: '#bd9a5c',
        material: 'metalness: 0.38; roughness: 0.42'
      });
      if (index === 0) {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.83 -1.95`,
          width: '0.48',
          height: '0.055',
          depth: '0.055',
          rotation: '0 0 -6',
          color: '#58422e'
        });
        createStageEntity(memorial, 'a-cylinder', {
          position: `${x + 0.22} 0.83 -1.95`,
          rotation: '0 0 90',
          radius: '0.018',
          height: '0.5',
          color: '#32271e'
        });
      } else if (index === 1) {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.86 -1.95`,
          width: '0.34',
          height: '0.025',
          depth: '0.24',
          rotation: '0 0 -12',
          color: '#e8d4a9'
        });
        createStageEntity(memorial, 'a-torus', {
          position: `${x + 0.16} 0.87 -1.95`,
          rotation: '0 0 90',
          radius: '0.11',
          'radius-tubular': '0.012',
          color: '#b28b58'
        });
      } else {
        createStageEntity(memorial, 'a-box', {
          position: `${x} 0.84 -1.95`,
          width: '0.36',
          height: '0.025',
          depth: '0.26',
          rotation: '-12 0 0',
          color: '#b69261'
        });
        createStageEntity(memorial, 'a-plane', {
          position: `${x} 0.86 -1.95`,
          rotation: '-12 0 0',
          width: '0.32',
          height: '0.22',
          material: 'color: #c9ab7a; side: double'
        });
      }
      createStageEntity(memorial, 'a-text', {
        value: ['WINCHESTER', 'CARTA', 'MAPA DEL LITORAL'][index],
        position: `${x} 1.08 -1.95`,
        align: 'center',
        width: '0.85',
        color: '#fff0d4'
      });
    });
    createStageEntity(memorial, 'a-torus', {
      position: '0.85 2.3 -0.85',
      rotation: '0 90 0',
      radius: '1.25',
      'radius-tubular': '0.012',
      material: 'color: #e8c67d; emissive: #a87933; emissiveIntensity: 0.45; opacity: 0.68; transparent: true'
    });
    [[-0.2, '1879'], [0.85, '1952'], [1.9, 'HOY']].forEach((point) => {
      createStageEntity(memorial, 'a-sphere', {
        position: `${point[0]} 2.3 -0.85`,
        radius: '0.075',
        material: 'color: #ffe4a0; emissive: #c99c5a; emissiveIntensity: 0.7'
      }).setAttribute('animation__pulse', 'property: scale; from: 0.8 0.8 0.8; to: 1.3 1.3 1.3; dir: alternate; dur: 1250; loop: true; easing: easeInOutSine');
      createStageEntity(memorial, 'a-text', {
        value: point[1],
        position: `${point[0]} 2.52 -0.85`,
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
    const isAbaroa = currentStoryId === 'abaroa';
    stage.setAttribute('visible', String(isAbaroa));
    stage.setAttribute('abaroa-stage-motion', 'scene', sceneIndex);
    model.setAttribute('visible', String(isAbaroa));
    stage.querySelectorAll('[data-abaroa-scene]').forEach((group) => {
      group.setAttribute('visible', String(isAbaroa && Number(group.dataset.abaroaScene) === sceneIndex));
    });
    model.setAttribute('abaroa-scene-motion', {
      scene: sceneIndex,
      active: isAbaroa && isARLocationAvailable()
    });
    const formationData = {
      scene: sceneIndex,
      active: isAbaroa && isARLocationAvailable()
    };
    ['#abaroa-colorado-formation', '#abaroa-chilean-formation'].forEach((selector) => {
      const formation = stage.querySelector(selector);
      if (formation) formation.setAttribute('abaroa-model-formation', formationData);
    });
  }

  function updateFranzSceneLife(sceneIndex) {
    if (!aSceneInstance) return;
    const franzLife = aSceneInstance.querySelector('#ar-franz-scene-life');
    if (!franzLife) return;
    const isFranzActive = currentStoryId === 'franz' && isARLocationAvailable();
    franzLife.setAttribute('visible', String(isFranzActive));
    franzLife.setAttribute('ar-scene-life', `scene: ${sceneIndex}; active: ${isFranzActive}`);
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
    return Boolean(getARUserCoordinates()) && isInSite();
  }

  // ─── Sincronización del Mundo Pokémon GO con la Ubicación Real ───
  function syncSitePresence() {
    const userCoordinates = getARUserCoordinates();
    const inRange = Boolean(userCoordinates) && isInSite();
    if (!inRange) {
      arAnchorLocked = false;
    }
    updateGeographicAnchor(userCoordinates);
    updateAbaroaStage(currentSceneIndex);
    updateFranzSceneLife(currentSceneIndex);
    const anchor = getWorldAnchor();
    const animator = getAnimator();
    const walker = getWalker();
    const sceneVideo = aSceneInstance && aSceneInstance.querySelector('#ar-scene-video');
    const videoPanel = aSceneInstance && aSceneInstance.querySelector('#ar-video-panel');
    const gpsDist = userCoordinates && window.HistoriaGeo && typeof window.HistoriaGeo.getSceneDistance === 'function'
      ? window.HistoriaGeo.getSceneDistance(currentStoryId, currentSceneIndex)
      : null;
    const stageDist = inRange ? getAnchorDistanceMeters() : gpsDist;
    const targetName = `${currentStoryId === 'abaroa' ? 'Eduardo Abaroa' : 'Franz Tamayo'} · Escena ${currentSceneIndex + 1}`;

    if (statusPill) {
      statusPill.classList.toggle('is-in-range', inRange);
      statusPill.classList.toggle('is-out-of-range', !inRange);
      if (!userCoordinates) {
        statusPill.textContent = '📍 Permite ubicación para anclar la escena AR';
      } else {
        const geoState = window.HistoriaGeo && window.HistoriaGeo.getState
          ? window.HistoriaGeo.getState()
          : null;
        statusPill.innerHTML = inRange
          ? `<span class="ar-status-dot"></span> 🟢 ${geoState && geoState.isSimulated ? 'Simulación activa' : 'Escena fija en sitio'} · ${stageDist} m`
          : `<span class="ar-status-dot"></span> 🧭 Escena a ${gpsDist !== null ? gpsDist + ' m' : 'esperando GPS'}`;
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
          placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE);
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
        radarDistEl.textContent = gpsDist !== null ? `${gpsDist} metros` : 'Buscando señal GPS...';
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

        // ─── Tocar una estación histórica para cambiar de escena o pellizcar para acercarse/alejarse ───
        function setupInteractiveSceneSelection() {
          if (!aSceneInstance) return;

          const canvas = aSceneInstance.querySelector('.a-canvas');
          if (!canvas) return;

          // Pellizcar con 2 dedos para caminar hacia adelante/atrás respecto a la escena fija
          let pinchStartDist = null;
          canvas.addEventListener('touchstart', function (e) {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchStartDist = Math.hypot(dx, dy);
            }
          }, { passive: true });

          canvas.addEventListener('touchmove', function (e) {
            if (e.touches.length === 2 && pinchStartDist !== null) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              const delta = (dist - pinchStartDist) * 0.008;
              pinchStartDist = dist;
              if (Math.abs(delta) > 0.005) {
                moveCameraRigAlongView(delta);
                syncSitePresence();
              }
            }
          }, { passive: true });

          canvas.addEventListener('touchend', function () {
            pinchStartDist = null;
          }, { passive: true });

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
          if (!arAnchorLocked && isARLocationAvailable()) {
            placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE);
          }
          if (btnAudio) btnAudio.disabled = !s.audio || !isARLocationAvailable();

          audio.pause();
          audio.removeAttribute('src');
          if (s.audio) audio.src = s.audio;
          audio.currentTime = 0;
          audio.load();

          setSceneVideo(s.video);
          updateAbaroaStage(index);
          updateFranzSceneLife(index);

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
              if (willOpen) toggleBottomCard(false);
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
              toggleBottomCard(true);
              toggleMiniMapDrawer(true);

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
              window.removeEventListener('devicemotion', handleARDeviceMotion, true);
              arGeoOrigin = null;
              arFilteredCoordinates = null;
              arInitialHeading = null;
              arAnchorLocked = false;
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
            window.TamayoAR = { open: openAR, close: closeAR, setScene, setStory, reanchor: () => placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE) };

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

              if (btnReanchor) {
                btnReanchor.addEventListener('click', () => {
                  placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE);
                  syncSitePresence();
                  if (window.HistoriaFX && window.HistoriaFX.beep) {
                    window.HistoriaFX.beep('ok');
                  }
                });
              }

              const triggerSimulate = () => {
                if (!window.HistoriaGeo || typeof window.HistoriaGeo.simulateInRange !== 'function') {
                  console.error('[Historia Viva] No está disponible la simulación de ubicación para AR.');
                  return;
                }
                if (typeof window.HistoriaGeo.setActiveScene === 'function') {
                  window.HistoriaGeo.setActiveScene(currentStoryId, currentSceneIndex);
                }
                arGeoOrigin = null;
                arFilteredCoordinates = null;
                arAnchorLocked = false;
                window.HistoriaGeo.simulateInRange();
                placeSceneInFrontOfCamera(DEFAULT_SPAWN_DISTANCE);
                toggleMiniMapDrawer(false);
                syncSitePresence();
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
