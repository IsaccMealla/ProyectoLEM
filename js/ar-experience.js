/**
 * Historia Viva · Bienvenida Histórica Unifranz La Paz (Modo AR / WebXR / Pokémon GO)
 * -----------------------------------------------------------------------------------
 * - WebXR AR usa seguimiento espacial y hit-test; los sensores son una alternativa aproximada.
 * - Escenario fijado en el espacio rastreado frente al usuario, con Franz Tamayo y el pórtico de UNIFRANZ.
 * - Bloqueo geográfico con Radar y Algoritmo de Ruta Más Corta (Dijkstra + OSRM API).
 * - Sincronizado con ExperienceManager y audio único assets/audio/DIscursoPrincipal.mp3.
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
  const webxrBtnSlot = document.getElementById('ar-webxr-btn-slot');
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

  // Controles de etapa
  const btnPrev = document.getElementById('ar-btn-prev');
  const btnAudio = document.getElementById('ar-btn-audio');
  const btnAudioIcon = document.getElementById('ar-btn-audio-icon');
  const btnAudioLabel = document.getElementById('ar-btn-audio-label');
  const btnNext = document.getElementById('ar-btn-next');

  const stories = window.HistoriaVivaStories || {};
  const scenes = stories.franz ? stories.franz.scenes : (window.HistoriaVivaScenes || []);
  let aSceneInstance = null;
  let videoStream = null;
  let currentSceneIndex = 0;
  let isAudioPlaying = false;
  let startedGPSForAR = false;
  let arFilteredCoordinates = null;
  let arInitialHeading = null;
  let arAnchorLocked = false;
  let isWorldTracked = false;
  let xrPlacementLocked = false;
  let xrSession = null;
  let xrHitTestSource = null;
  let xrReferenceSpace = null;
  let lastStepTimestamp = 0;
  let accelMagnitudeAvg = 9.81;

  function getARUserCoordinates() {
    const geoState = window.HistoriaGeo && window.HistoriaGeo.getState
      ? window.HistoriaGeo.getState()
      : null;
    return geoState && geoState.userCoords ? geoState.userCoords : null;
  }

  function getWorldAnchor() {
    return aSceneInstance ? aSceneInstance.querySelector('#tamayo-world-anchor') : null;
  }

  function getUnifranzManager() {
    if (!aSceneInstance) return null;
    const root = aSceneInstance.querySelector('#unifranz-ar-root');
    const comp = root && root.components && root.components['unifranz-welcome-experience'];
    return (comp && comp.manager) || window.UnifranzActiveManager || null;
  }

  function getCameraForwardHorizontal() {
    if (!aSceneInstance || !window.THREE) return { x: 0, z: -1, camPos: new THREE.Vector3(0, 1.6, 0) };
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

  function getAvatarWorldPosition() {
    const anchor = getWorldAnchor();
    if (!anchor || !anchor.object3D || !window.THREE) return null;
    anchor.object3D.updateMatrixWorld(true);
    const manager = getUnifranzManager();
    const localX = (manager && manager.avatarRoot) ? manager.avatarRoot.position.x : 0;
    const localPos = new THREE.Vector3(localX, 0, -2.5);
    return anchor.object3D.localToWorld(localPos);
  }

  // Ancla el escenario de UNIFRANZ La Paz con el visitante en el origen relativo,
  // colocando a Franz Tamayo en (0, 0, -2.5) mirando directamente hacia la cámara.
  function placeSceneInFrontOfCamera() {
    if (!aSceneInstance || !window.THREE || isWorldTracked) return;
    const anchor = getWorldAnchor();
    if (!anchor || !anchor.object3D) return;

    const { x: fx, z: fz, camPos } = getCameraForwardHorizontal();
    anchor.object3D.position.set(camPos.x, 0, camPos.z);
    const yawToTarget = Math.atan2(-fx, -fz);
    anchor.object3D.rotation.set(0, yawToTarget, 0);
    anchor.object3D.updateMatrixWorld(true);
    arAnchorLocked = true;

    const coords = getARUserCoordinates();
    if (coords) {
      arFilteredCoordinates = { lat: coords.lat, lng: coords.lng };
    }
  }

  function moveCameraRigAlongView(stepMeters) {
    if (!aSceneInstance || !arAnchorLocked || isWorldTracked || !window.THREE) return;
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    const avatarWorld = getAvatarWorldPosition();
    if (!cameraRig || !cameraRig.object3D || !avatarWorld) return;

    const { x: fx, z: fz } = getCameraForwardHorizontal();
    const nextX = cameraRig.object3D.position.x + fx * stepMeters;
    const nextZ = cameraRig.object3D.position.z + fz * stepMeters;
    const distToAvatar = Math.hypot(nextX - avatarWorld.x, nextZ - avatarWorld.z);
    if (distToAvatar >= 0.75 && distToAvatar <= 8.5) {
      cameraRig.object3D.position.x = nextX;
      cameraRig.object3D.position.z = nextZ;
      cameraRig.object3D.updateMatrixWorld(true);
    }
  }

  function getAnchorDistanceMeters() {
    if (!aSceneInstance || !window.THREE) return 2.5;
    const avatarWorld = getAvatarWorldPosition();
    const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
    if (!avatarWorld || !cameraRig || !cameraRig.object3D) return 2.5;
    const dx = avatarWorld.x - cameraRig.object3D.position.x;
    const dz = avatarWorld.z - cameraRig.object3D.position.z;
    return Math.round(Math.hypot(dx, dz) * 10) / 10;
  }

  function updateGeographicAnchor(coords = getARUserCoordinates()) {
    if (!aSceneInstance) return;
    if (isWorldTracked) return;
    if (!arAnchorLocked && isARLocationAvailable()) {
      placeSceneInFrontOfCamera();
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

    if (accuracy <= 12 && displacement > 0.8 && displacement < 4.5) {
      const stepFactor = 0.25;
      arFilteredCoordinates.lat += (coords.lat - arFilteredCoordinates.lat) * stepFactor;
      arFilteredCoordinates.lng += (coords.lng - arFilteredCoordinates.lng) * stepFactor;
      const headingRad = (arInitialHeading || 0) * (Math.PI / 180);
      const moveX = (deltaEast * Math.cos(headingRad) - deltaNorth * Math.sin(headingRad)) * stepFactor;
      const moveZ = -(deltaEast * Math.sin(headingRad) + deltaNorth * Math.cos(headingRad)) * stepFactor;
      const cameraRig = aSceneInstance.querySelector('#pokear-camera-rig');
      const avatarWorld = getAvatarWorldPosition();
      if (cameraRig && avatarWorld) {
        const nextX = cameraRig.object3D.position.x + moveX;
        const nextZ = cameraRig.object3D.position.z + moveZ;
        const dist = Math.hypot(nextX - avatarWorld.x, nextZ - avatarWorld.z);
        if (dist >= 0.75 && dist <= 8.5) {
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

  function handleARDeviceMotion(event) {
    if (!aSceneInstance || !arAnchorLocked || isWorldTracked || !isARLocationAvailable()) return;
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

  // ─── Verificación de Rango Geográfico (Geofence) ───
  function isInSite() {
    if (window.HistoriaGeo && typeof window.HistoriaGeo.isSceneInRange === 'function') {
      return window.HistoriaGeo.isSceneInRange('franz', currentSceneIndex);
    }
    return false;
  }

  function isARLocationAvailable() {
    return Boolean(getARUserCoordinates()) && isInSite();
  }

  // ─── Sincronización del Mundo Pokémon GO con la Ubicación Real ───
  function syncSitePresence() {
    const userCoordinates = getARUserCoordinates();
    const inRange = Boolean(userCoordinates) && isInSite();
    updateGeographicAnchor(userCoordinates);

    const anchor = getWorldAnchor();
    const unifranzRoot = aSceneInstance && aSceneInstance.querySelector('#unifranz-ar-root');
    const gpsDist = userCoordinates && window.HistoriaGeo && typeof window.HistoriaGeo.getSceneDistance === 'function'
      ? window.HistoriaGeo.getSceneDistance('franz', currentSceneIndex)
      : null;
    const stageDist = inRange ? getAnchorDistanceMeters() : gpsDist;
    const targetName = `UNIFRANZ La Paz · Etapa ${currentSceneIndex + 1}`;

    if (statusPill) {
      statusPill.classList.toggle('is-in-range', inRange);
      statusPill.classList.toggle('is-out-of-range', !inRange);
      if (!userCoordinates) {
        statusPill.textContent = '📍 Permite ubicación para anclar la experiencia AR';
      } else {
        const geoState = window.HistoriaGeo && window.HistoriaGeo.getState ? window.HistoriaGeo.getState() : null;
        statusPill.innerHTML = inRange
          ? `<span class="ar-status-dot"></span> 🟢 ${geoState && geoState.isSimulated ? 'Simulación activa' : isWorldTracked ? (xrPlacementLocked ? 'Anclaje espacial 6DoF' : 'Escaneando superficie para anclar') : 'Vista por sensores, sin anclaje 6DoF'} · ${stageDist} m`
          : `<span class="ar-status-dot"></span> 🧭 Etapa a ${gpsDist !== null ? gpsDist + ' m' : 'esperando GPS'}`;
      }
    }

    if (inRange) {
      if (radarOverlay) {
        radarOverlay.classList.remove('is-active');
        radarOverlay.hidden = true;
      }

      if (anchor) {
        const wasHidden = anchor.object3D.visible === false;
        const shouldShowAnchor = !isWorldTracked || xrPlacementLocked;
        anchor.setAttribute('visible', shouldShowAnchor);
        if (unifranzRoot) {
          unifranzRoot.setAttribute('unifranz-welcome-experience', 'active', true);
        }

        if (shouldShowAnchor && wasHidden) {
          if (!arAnchorLocked) placeSceneInFrontOfCamera();
          const manager = getUnifranzManager();
          if (manager) manager.playStageChoreography(currentSceneIndex);
          if (window.HistoriaFX && window.HistoriaFX.beep) window.HistoriaFX.beep('success');
        }
      }

      if (btnAudio) btnAudio.disabled = false;
    } else {
      if (anchor) anchor.setAttribute('visible', 'false');
      if (unifranzRoot) unifranzRoot.setAttribute('unifranz-welcome-experience', 'active', false);

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
    if (pokearVideo) pokearVideo.srcObject = null;
  }

  function stopXRHitTesting() {
    if (xrHitTestSource) xrHitTestSource.cancel();
    xrHitTestSource = null;
    xrReferenceSpace = null;
    xrSession = null;
  }

  function resumeCameraFallback() {
    if (!arView || arView.getAttribute('aria-hidden') !== 'false' || !aSceneInstance) return;
    startCamera().then((cameraReady) => {
      if (!cameraReady || !aSceneInstance || isWorldTracked) return;
      arAnchorLocked = false;
      if (isARLocationAvailable()) placeSceneInFrontOfCamera();
      syncSitePresence();
    });
  }

  function placeWorldAnchorFromHit(hitPose, viewerPose) {
    if (!window.THREE || !aSceneInstance) return;
    const anchor = getWorldAnchor();
    if (!anchor || !anchor.object3D) return;

    const position = hitPose.transform.position;
    const orientation = viewerPose.transform.orientation;
    const cameraRotation = new THREE.Quaternion(
      orientation.x,
      orientation.y,
      orientation.z,
      orientation.w
    );
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraRotation);
    cameraForward.y = 0;
    if (cameraForward.lengthSq() < 0.0001) cameraForward.set(0, 0, -1);
    else cameraForward.normalize();

    anchor.object3D.position.set(position.x, position.y, position.z);
    anchor.object3D.rotation.set(0, Math.atan2(-cameraForward.x, -cameraForward.z), 0);
    anchor.object3D.updateMatrixWorld(true);
    xrPlacementLocked = true;
    arAnchorLocked = true;

    const coords = getARUserCoordinates();
    if (coords) arFilteredCoordinates = { lat: coords.lat, lng: coords.lng };
    syncSitePresence();
  }

  async function beginXRHitTesting(sceneEl) {
    const session = sceneEl.xrSession || (sceneEl.renderer && sceneEl.renderer.xr.getSession());
    if (!session) throw new Error('La sesión WebXR no está disponible después de entrar en AR.');

    const referenceSpace = await session.requestReferenceSpace('local-floor');
    const viewerSpace = await session.requestReferenceSpace('viewer');
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    if (xrSession !== session || !sceneEl.is('ar-mode')) {
      hitTestSource.cancel();
      return;
    }

    xrReferenceSpace = referenceSpace;
    xrHitTestSource = hitTestSource;

    const onXRFrame = (_time, frame) => {
      if (xrSession !== session || !xrHitTestSource) return;
      const viewerPose = frame.getViewerPose(xrReferenceSpace);
      if (!xrPlacementLocked && viewerPose) {
        const hit = frame.getHitTestResults(xrHitTestSource)[0];
        const hitPose = hit && hit.getPose(xrReferenceSpace);
        if (hitPose) placeWorldAnchorFromHit(hitPose, viewerPose);
      }
      session.requestAnimationFrame(onXRFrame);
    };

    session.requestAnimationFrame(onXRFrame);
  }

  function handleARWebXREnter() {
    if (!aSceneInstance || !aSceneInstance.is('ar-mode')) return;
    isWorldTracked = true;
    xrPlacementLocked = false;
    arAnchorLocked = false;
    arView.classList.add('is-world-tracked');
    stopCamera();

    const anchor = getWorldAnchor();
    if (anchor) anchor.setAttribute('visible', false);
    if (statusPill) statusPill.textContent = '📍 Apunta a una superficie y mueve el teléfono para fijar la escena';

    xrSession = aSceneInstance.xrSession || null;
    beginXRHitTesting(aSceneInstance).catch((error) => {
      console.error('[Historia Viva] No se pudo iniciar el seguimiento de superficies WebXR:', error);
      if (statusPill) statusPill.textContent = '⚠️ No se pudo detectar superficies; sal de AR e inténtalo de nuevo';
    });
  }

  function handleARWebXRExit() {
    stopXRHitTesting();
    if (!isWorldTracked) return;
    isWorldTracked = false;
    xrPlacementLocked = false;
    arAnchorLocked = false;
    if (arView) arView.classList.remove('is-world-tracked');

    if (aSceneInstance && !aSceneInstance.dataset.unmounting) resumeCameraFallback();
  }

  // ─── Montar la Escena 3D sobre la Cámara ───
  function mountPokeArScene() {
    if (aSceneInstance || !arSceneTemplate || !arView) return;

    aSceneInstance = arSceneTemplate.content.firstElementChild.cloneNode(true);
    configureDracoSupport(aSceneInstance);
    aSceneInstance.addEventListener('enter-vr', handleARWebXREnter);
    aSceneInstance.addEventListener('exit-vr', handleARWebXRExit);

    const onAvatarReady = () => {
      if (arLoading) arLoading.classList.add('is-hidden');
      syncSitePresence();
    };
    window.addEventListener('unifranz:avatar-loaded', onAvatarReady, { once: true });

    const hud = arView.querySelector('.pokear-hud');
    arView.insertBefore(aSceneInstance, hud);

    aSceneInstance.addEventListener('loaded', () => {
      if (arLoading) arLoading.classList.add('is-hidden');
      if (webxrBtnSlot && window.UnifranzSystem && window.UnifranzSystem.createWebXRButton) {
        webxrBtnSlot.innerHTML = '';
        webxrBtnSlot.appendChild(
          window.UnifranzSystem.createWebXRButton(aSceneInstance, {
            mode: 'immersive-ar',
            beforeEnter: stopCamera,
            onError: resumeCameraFallback
          })
        );
      }
      updateGeographicAnchor();
      syncSitePresence();
      setupInteractiveSceneSelection();
    });
  }

  function unmountPokeArScene() {
    if (aSceneInstance) {
      aSceneInstance.dataset.unmounting = 'true';
      stopXRHitTesting();
      try {
        if (aSceneInstance.is && (aSceneInstance.is('vr-mode') || aSceneInstance.is('ar-mode'))) {
          aSceneInstance.exitVR();
        }
      } catch (e) { /* noop */ }
      aSceneInstance.remove();
      aSceneInstance = null;
    }
    if (webxrBtnSlot) webxrBtnSlot.innerHTML = '';
    restorePageScrollAndUnlockDOM();
  }

  // ─── Tocar el botón flotante 3D "Siguiente Etapa" o pellizcar para acercarse/alejarse ───
  function setupInteractiveSceneSelection() {
    if (!aSceneInstance) return;
    const canvas = aSceneInstance.querySelector('.a-canvas');
    if (!canvas) return;

    let pinchStartDist = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
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

    canvas.addEventListener('touchend', () => {
      pinchStartDist = null;
    }, { passive: true });

    canvas.addEventListener('click', (e) => {
      if (!isARLocationAvailable()) return;
      if (e.target.closest('.pokear-hud') || e.target.closest('button')) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const manager = getUnifranzManager();
      if (manager && manager.handlePointerClick(mouseX, mouseY)) {
        if (window.HistoriaFX && window.HistoriaFX.beep) window.HistoriaFX.beep('ok');
      }
    });
  }

  // ─── Navegación de las 5 Etapas de Bienvenida Histórica Unifranz La Paz ───
  function updateHudForStage(index) {
    const s = scenes[index];
    if (!s) return;
    if (hudSceneNumber) hudSceneNumber.textContent = `ETAPA ${index + 1} DE ${scenes.length}`;
    if (hudSceneTitle) hudSceneTitle.textContent = s.title || '';
    if (hudScenePeriod) hudScenePeriod.textContent = s.period || '';
    if (hudSceneText) hudSceneText.textContent = `«${s.narration || ''}»`;
    if (btnPrev) btnPrev.disabled = index === 0;
    if (btnNext) btnNext.disabled = index === scenes.length - 1;
  }

  function setScene(index, autoPlay, fromManager = false) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    currentSceneIndex = index;

    if (window.HistoriaGeo && typeof window.HistoriaGeo.setActiveScene === 'function') {
      window.HistoriaGeo.setActiveScene('franz', index);
    }

    updateHudForStage(index);

    if (!arAnchorLocked && !isWorldTracked && isARLocationAvailable()) {
      placeSceneInFrontOfCamera();
    }
    if (btnAudio) btnAudio.disabled = !isARLocationAvailable();

    const manager = getUnifranzManager();
    if (manager && !fromManager && manager.currentStageIndex !== index) {
      manager.goToStage(index, true);
    }

    window.dispatchEvent(new CustomEvent('historia:scene-changed', {
      detail: { index, storyId: 'franz' }
    }));

    if (autoPlay && isARLocationAvailable()) {
      playAudio();
    }
  }

  // ─── Reproducción del Discurso Principal Único (assets/audio/DIscursoPrincipal.mp3) ───
  function playAudio() {
    if (!isARLocationAvailable()) {
      pauseAudio();
      return;
    }
    const manager = getUnifranzManager();
    if (manager && typeof manager.playAudioFromCurrentStage === 'function') {
      manager.playAudioFromCurrentStage()
        .then(() => updateAudioUI(true))
        .catch(() => updateAudioUI(false));
      return;
    }
    const mainAudioSrc = window.UnifranzSystem?.MAIN_AUDIO_SRC || 'assets/audio/DIscursoPrincipal.mp3';
    if (audio.getAttribute('src') !== mainAudioSrc) {
      audio.src = mainAudioSrc;
    }
    audio.play()
      .then(() => updateAudioUI(true))
      .catch(() => updateAudioUI(false));
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
    btnToggleBottomCard.setAttribute('aria-label', isExpanded ? 'Minimizar etapas' : 'Mostrar etapas');
    const label = btnToggleBottomCard.querySelector('[data-card-toggle-label]');
    const icon = btnToggleBottomCard.querySelector('.card-toggle-icon');
    if (label) label.textContent = isExpanded ? 'Minimizar etapas' : 'Mostrar etapas';
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
      statusPill.textContent = '🧭 Activa orientación y ubicación para fijar la fachada de UNIFRANZ';
    }
    setScene(currentSceneIndex, false);
    syncSitePresence();

    const closeBtn = arView.querySelector('[data-close-ar]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeAR() {
    pauseAudio();
    stopCamera();
    window.removeEventListener('deviceorientation', handleARDeviceOrientation, true);
    window.removeEventListener('deviceorientationabsolute', handleARDeviceOrientation, true);
    window.removeEventListener('devicemotion', handleARDeviceMotion, true);
    arFilteredCoordinates = null;
    arInitialHeading = null;
    arAnchorLocked = false;
    isWorldTracked = false;
    xrPlacementLocked = false;
    if (arView) arView.classList.remove('is-world-tracked');
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

    requestAnimationFrame(() => {
      restorePageScrollAndUnlockDOM();
      const inicioEl = document.getElementById('inicio');
      if (inicioEl) inicioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.closeAR = closeAR;
  window.openAR = openAR;
  window.TamayoAR = { open: openAR, close: closeAR, setScene, reanchor: placeSceneInFrontOfCamera };

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
        if (isWorldTracked) {
          xrPlacementLocked = false;
          arAnchorLocked = false;
          const anchor = getWorldAnchor();
          if (anchor) anchor.setAttribute('visible', false);
          if (statusPill) statusPill.textContent = '📍 Apunta a una superficie para volver a fijar la escena';
        } else {
          placeSceneInFrontOfCamera();
        }
        syncSitePresence();
        if (window.HistoriaFX && window.HistoriaFX.beep) window.HistoriaFX.beep('ok');
      });
    }

    const triggerSimulate = () => {
      if (!window.HistoriaGeo || typeof window.HistoriaGeo.simulateInRange !== 'function') {
        console.error('[Historia Viva] No está disponible la simulación de ubicación para AR.');
        return;
      }
      if (typeof window.HistoriaGeo.setActiveScene === 'function') {
        window.HistoriaGeo.setActiveScene('franz', currentSceneIndex);
      }
      arFilteredCoordinates = null;
      arAnchorLocked = false;
      window.HistoriaGeo.simulateInRange();
      placeSceneInFrontOfCamera();
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

    window.addEventListener('unifranz:stage-changed', (e) => {
      if (!arView || arView.getAttribute('aria-hidden') !== 'false' || !e.detail) return;
      if (Number.isInteger(e.detail.index) && e.detail.index !== currentSceneIndex) {
        setScene(e.detail.index, false, true);
      } else {
        updateHudForStage(currentSceneIndex);
      }
    });

    window.addEventListener('historia:geo-update', syncSitePresence);
    window.addEventListener('historia:geo-range-changed', syncSitePresence);
    window.addEventListener('historia:scene-location-changed', syncSitePresence);

    window.addEventListener('historia:select-scene', (e) => {
      if (e.detail && Number.isInteger(e.detail.index)) {
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
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupListeners);
  } else {
    setupListeners();
  }
})();
