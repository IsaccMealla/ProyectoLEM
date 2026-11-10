/**
 * Historia Viva · Realidad Aumentada Estilo Pokémon GO (Sin QR / Sin Marcador)
 * ---------------------------------------------------------------------------
 * - Visualización inmersiva en el mundo real mediante la cámara del móvil y giroscopio.
 * - Sin necesidad de marcadores impresos ni códigos QR.
 * - Bloqueo geográfico con Radar y Algoritmo de Ruta Más Corta (Dijkstra + OSRM API):
 *   Si el usuario está lejos, le muestra por dónde ir paso a paso y en el Mini-Mapa en vivo.
 * - Al estar en el sitio, Franz Tamayo camina, ejecuta movimientos grabados en cada escena,
 *   articula su boca al hablar y está rodeado de 5 estaciones 3D interactivas y fotos históricas reales.
 * - Al tocar cualquier objeto 3D o fotografía histórica, se cambia automáticamente a esa escena.
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

  // Los 4 botones esenciales
  const btnPrev = document.getElementById('ar-btn-prev');
  const btnAudio = document.getElementById('ar-btn-audio');
  const btnAudioIcon = document.getElementById('ar-btn-audio-icon');
  const btnAudioLabel = document.getElementById('ar-btn-audio-label');
  const btnNext = document.getElementById('ar-btn-next');
  const btnWalk = document.getElementById('ar-btn-walk');
  const btnWalkIcon = document.getElementById('ar-btn-walk-icon');
  const btnWalkLabel = document.getElementById('ar-btn-walk-label');

  const scenes = window.HistoriaVivaScenes || [];
  let aSceneInstance = null;
  let videoStream = null;
  let currentSceneIndex = 0;
  let isAudioPlaying = false;
  let isWalkingMode = true;

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
    if (!aSceneInstance) return null;
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

  // ─── Verificación de Rango Geográfico (Geofence) ───
  function isInSite() {
    if (window.HistoriaGeo && typeof window.HistoriaGeo.isInRange === 'function') {
      return window.HistoriaGeo.isInRange();
    }
    return true;
  }

  // ─── Sincronización del Mundo Pokémon GO con la Ubicación Real ───
  function syncSitePresence() {
    const inRange = isInSite();
    const anchor = getWorldAnchor();
    const animator = getAnimator();
    const walker = getWalker();

    const dist =
      window.HistoriaGeo && typeof window.HistoriaGeo.getDistance === 'function'
        ? window.HistoriaGeo.getDistance()
        : null;
    const target =
      window.HistoriaGeo && typeof window.HistoriaGeo.getTarget === 'function'
        ? window.HistoriaGeo.getTarget()
        : null;
    const targetName = target ? target.name : 'UNIFRANZ La Paz';

    if (statusPill) {
      statusPill.classList.toggle('is-in-range', inRange);
      statusPill.classList.toggle('is-out-of-range', !inRange);
      statusPill.innerHTML = inRange
        ? `<span class="ar-status-dot"></span> 🟢 En Sitio (${dist !== null ? dist + 'm' : 'Activo'})`
        : `<span class="ar-status-dot"></span> 🧭 Lejos (${dist !== null ? dist + 'm' : 'Buscando...'})`;
    }

    if (inRange) {
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
      if (walker && isWalkingMode) {
        walker.setRoaming(true);
      }

      if (btnAudio) btnAudio.disabled = false;
      if (btnWalk) btnWalk.disabled = false;
    } else {
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
        radarDistEl.textContent = dist !== null ? `${dist} metros` : 'Buscando señal...';
      }
      if (radarTargetEl) {
        radarTargetEl.textContent = targetName;
      }

      if (btnAudio) btnAudio.disabled = true;
      if (btnWalk) btnWalk.disabled = true;
    }
  }

  // ─── Gestión de la Cámara Real del Teléfono (Passthrough WebRTC) ───
  async function startCamera() {
    if (!pokearVideo) return;
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
    } catch (err) {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        pokearVideo.srcObject = videoStream;
        await pokearVideo.play();
      } catch (fallbackErr) {
        console.warn('[Historia Viva] Cámara no disponible, continuando con entorno 3D:', fallbackErr);
      }
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

    const modelEl = aSceneInstance.querySelector('#franz-tamayo-figure');
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

    const hud = arView.querySelector('.pokear-hud');
      arView.insertBefore(aSceneInstance, hud);

      aSceneInstance.addEventListener('loaded', function () {
        if (arLoading) arLoading.classList.add('is-hidden');
        syncSitePresence();
        setupInteractiveTapAndWalk();
      });

        if (
          typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
          DeviceOrientationEvent.requestPermission().catch(() => { });
        }
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

        // ─── Tocar un objeto 3D / foto histórica para cambiar de escena, o tocar el suelo para que Franz Tamayo camine ───
        function setupInteractiveTapAndWalk() {
          if (!aSceneInstance) return;

          const canvas = aSceneInstance.querySelector('.a-canvas');
          if (!canvas) return;

          canvas.addEventListener('click', function (e) {
            if (!isInSite()) return;
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
                    // Hacer que Franz Tamayo camine hacia la estación seleccionada
                    const walker = getWalker();
                    const st = dioramaComp.stations[targetScene];
                    if (walker && st && st.group) {
                      walker.walkTo(st.group.position.x * 0.55, st.group.position.z * 0.55);
                    }
                    return;
                  }
                  obj = obj.parent;
                }
              }
            }

            // 2. Si tocó el suelo, hacer que Franz Tamayo camine hacia ese punto
            const walker = getWalker();
            if (!walker) return;

            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const hitPoint = new THREE.Vector3();
            const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);

            if (hit) {
              const dist = Math.hypot(hitPoint.x, hitPoint.z);
                if (dist > 0.3 && dist < 5.5) {
                  showTapRipple(hitPoint.x, hitPoint.z);
                  walker.walkTo(hitPoint.x, hitPoint.z);
                }
              }
            });
        }

        function showTapRipple(x, z) {
          if (!aSceneInstance) return;
          const ripple = document.createElement('a-ring');
          ripple.setAttribute('position', `${x} 0.03 ${z}`);
          ripple.setAttribute('rotation', '-90 0 0');
          ripple.setAttribute('radius-inner', '0.05');
          ripple.setAttribute('radius-outer', '0.12');
          ripple.setAttribute('color', '#ffd166');
          ripple.setAttribute('material', 'emissive: #ffd166; emissiveIntensity: 0.8; opacity: 0.9; transparent: true');
          ripple.setAttribute('animation__expand', 'property: scale; from: 1 1 1; to: 3.5 3.5 3.5; dur: 650; easing: easeOutQuad');
          ripple.setAttribute('animation__fade', 'property: material.opacity; from: 0.9; to: 0; dur: 650; easing: easeOutQuad');

          aSceneInstance.appendChild(ripple);
          setTimeout(() => {
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
          }, 700);

          if (window.HistoriaFX && window.HistoriaFX.beep) {
            window.HistoriaFX.beep('listen');
          }
        }

        // ─── Navegación de Escenas Históricas ───
        function setScene(index, autoPlay) {
          if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
          currentSceneIndex = index;
          const s = scenes[index];

          if (hudSceneNumber) hudSceneNumber.textContent = `ESCENA ${index + 1} DE ${scenes.length}`;
          if (hudSceneTitle) hudSceneTitle.textContent = s.title || '';
          if (hudScenePeriod) hudScenePeriod.textContent = s.period || '';
          if (hudSceneText) hudSceneText.textContent = s.narration || '';
          if (hudProgressBar) hudProgressBar.style.width = '0%';

          if (btnPrev) btnPrev.disabled = index === 0;
          if (btnNext) btnNext.disabled = index === scenes.length - 1;

          audio.pause();
          audio.src = s.audio;
          audio.currentTime = 0;

          const animator = getAnimator();
              if (animator) {
                animator.setSceneIndex(index);
                if (isInSite()) {
                  animator.playSceneChoreography(index);
                }
              }

              const diorama = getDiorama();
              if (diorama) {
                diorama.setActiveScene(index);
              }

              if (aSceneInstance) {
                for (let i = 1; i <= scenes.length; i++) {
                  const visualEntity = aSceneInstance.querySelector(`#ar-visuals-scene-${i}`);
                  if (visualEntity) {
                    visualEntity.setAttribute('visible', String(i === index + 1));
                  }
                }
              }

              window.dispatchEvent(new CustomEvent('historia:scene-changed', { detail: { index } }));

              if (autoPlay && isInSite()) {
                playAudio();
              } else {
                updateAudioUI(false);
              }
            }

            // ─── Reproducción de Audio y Movimiento de Boca ───
            function playAudio() {
              if (!isInSite()) {
                pauseAudio();
                return;
              }

              if (!audio.src || audio.src === window.location.href) {
                audio.src = scenes[currentSceneIndex].audio;
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

            // ─── Alternar Modo Pasear / Caminar ───
            function toggleWalkMode() {
              const walker = getWalker();
              if (!walker) return;

              isWalkingMode = walker.toggleRoaming();
              updateWalkUI(isWalkingMode);
            }

            function updateWalkUI(walking) {
              if (btnWalk) {
                btnWalk.classList.toggle('is-active', walking);
              }
              if (btnWalkIcon) btnWalkIcon.textContent = walking ? '🧍' : '🚶';
              if (btnWalkLabel) btnWalkLabel.textContent = walking ? 'Detener' : 'Pasear';
            }

            function toggleMiniMapDrawer(forceState) {
              if (!minimapDrawer) return;
              const willOpen = typeof forceState === 'boolean' ? forceState : minimapDrawer.hidden;
              minimapDrawer.hidden = !willOpen;
              if (willOpen && window.HistoriaGeo && typeof window.HistoriaGeo.initARMiniMap === 'function') {
                window.HistoriaGeo.initARMiniMap();
              }
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

              await startCamera();
              mountPokeArScene();
              setScene(currentSceneIndex, false);
              updateWalkUI(true);
              syncSitePresence();

              const closeBtn = arView.querySelector('[data-close-ar]');
              if (closeBtn) closeBtn.focus({ preventScroll: true });
            }

            function closeAR() {
              pauseAudio();
              stopCamera();
              unmountPokeArScene();

              if (minimapDrawer) minimapDrawer.hidden = true;
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
            window.TamayoAR = { open: openAR, close: closeAR, setScene };

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
              if (btnWalk) btnWalk.addEventListener('click', toggleWalkMode);

              if (btnToggleMinimap) {
                btnToggleMinimap.addEventListener('click', () => toggleMiniMapDrawer());
              }
              if (minimapClose) {
                minimapClose.addEventListener('click', () => toggleMiniMapDrawer(false));
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

              // Selección interactiva de escena al tocar objetos 3D o estaciones del mapa
              window.addEventListener('historia:select-scene', (e) => {
                if (e.detail && Number.isInteger(e.detail.index)) {
                  const arOpen = arView && arView.getAttribute('aria-hidden') === 'false';
                  setScene(e.detail.index, arOpen);
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
