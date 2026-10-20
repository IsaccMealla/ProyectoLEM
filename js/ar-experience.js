(function () {
  'use strict';

  var arView = document.getElementById('ar-view');
  var sceneTemplate = document.getElementById('ar-scene-template');
  var loading = document.getElementById('ar-loading');
  var hint = document.getElementById('ar-hint');
  var audio = document.getElementById('narration-audio');

  // Badge de confirmación visual al detectar marcador
  var detectionBadge = document.getElementById('ar-detection-badge');
  var badgeSubtitle = document.getElementById('badge-subtitle');
  var badgeTimeout = null;

  // Elementos del cuadro de diálogo
  var dialog = document.getElementById('ar-details');
  var dialogCloseBtn = document.getElementById('dialog-close');
  var sceneKicker = document.getElementById('scene-kicker');
  var scenePeriod = document.getElementById('scene-period');
  var sceneTitle = document.getElementById('scene-title');
  var sceneSubtitle = document.getElementById('scene-subtitle');
  var audioProgressBar = document.getElementById('audio-progress-bar');
  var previousSceneButton = document.getElementById('previous-scene');
  var nextSceneButton = document.getElementById('next-scene');
  var audioToggle = document.getElementById('audio-toggle');
  var audioIcon = document.getElementById('audio-icon');
  var audioLabel = document.getElementById('audio-label');

  // Barra flotante compacta
  var bottomBar = document.getElementById('ar-bottom-bar');
  var detailsToggle = document.getElementById('details-toggle');
  var miniSceneStatus = document.getElementById('mini-scene-status');
  var miniPrevScene = document.getElementById('mini-prev-scene');
  var miniNextScene = document.getElementById('mini-next-scene');
  var miniAudioToggle = document.getElementById('mini-audio-toggle');
  var miniAudioIcon = document.getElementById('mini-audio-icon');
  var miniAudioText = document.getElementById('mini-audio-text');

  var scenes = window.HistoriaVivaScenes || [];
  var arScene = null;
  var selectedScene = 0;
  var isAudioPlaying = false;
  var markerFound = false;
  var arTimeout;
  var videoWatcher = null;
  var dialogMinimized = false; // usuario minimizó manualmente

  // ─── Soporte de decodificador Draco (local + CDN) ───
  function configureDracoSupport(sceneEl) {
    if (window.AFRAME) {
      var gltfSystem = AFRAME.systems && AFRAME.systems['gltf-model'];
      if (gltfSystem && gltfSystem.schema && gltfSystem.schema.dracoDecoderPath) {
        gltfSystem.schema.dracoDecoderPath.default = 'assets/draco/';
      }
    }
    if (sceneEl && sceneEl.systems && sceneEl.systems['gltf-model']) {
      var sys = sceneEl.systems['gltf-model'];
      if (!sys.dracoLoader && window.THREE && THREE.DRACOLoader) {
        try {
          var draco = new THREE.DRACOLoader();
          draco.setDecoderPath('assets/draco/');
          sys.dracoLoader = draco;
        } catch (e) {
          console.warn('[Historia Viva] No se pudo inicializar DRACOLoader:', e);
        }
      }
    }
  }

  // Ejecutar configuración inicial de Draco si AFRAME ya está listo
  if (window.AFRAME) configureDracoSupport();
  window.addEventListener('DOMContentLoaded', function () {
    configureDracoSupport();
  });

  // ─── Badge de detección visual ───
  function showDetectionBadge(title, subtitle, autoFadeMs) {
    if (!detectionBadge) return;
    clearTimeout(badgeTimeout);
    detectionBadge.classList.remove('is-leaving');
    detectionBadge.hidden = false;
    detectionBadge.style.display = 'flex';
    var strong = detectionBadge.querySelector('strong');
    if (strong && title) strong.textContent = title;
    if (badgeSubtitle && subtitle) badgeSubtitle.textContent = subtitle;

    if (autoFadeMs) {
      badgeTimeout = setTimeout(function () {
        hideDetectionBadge();
      }, autoFadeMs);
    }
  }

  function hideDetectionBadge() {
    if (!detectionBadge) return;
    clearTimeout(badgeTimeout);
    detectionBadge.classList.add('is-leaving');
    badgeTimeout = setTimeout(function () {
      detectionBadge.hidden = true;
      detectionBadge.style.display = 'none';
      detectionBadge.classList.remove('is-leaving');
    }, 300);
  }

  // ─── Detección y calibración responsiva según pantalla y dispositivo ───
  function getDeviceProfile() {
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 800);
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var isPortrait = h > w;
    return {
      isMobile: isMobile,
      width: w,
      height: h,
      isPortrait: isPortrait
    };
  }

  // Ajusta la escala del modelo 3D y su pedestal en tiempo real según el dispositivo
  function adjustSceneForDevice() {
    var rig = arScene ? arScene.querySelector('#tamayo-rig') : null;
    if (!rig) return;

    var dev = getDeviceProfile();

    // Escala calibrada dinámicamente:
    // En celular vertical, el visor es angosto: una escala de 0.38 asegura que Franz Tamayo,
    // su pedestal ceremonial y los rótulos entren completos en la pantalla sin que el usuario tenga
    // que alejarse excesivamente del marcador HIRO.
    // En celular horizontal: 0.48.
    // En laptop/PC: 0.65.
    var scaleValue;
    if (dev.isMobile) {
      scaleValue = dev.isPortrait ? 0.38 : 0.48;
    } else {
      scaleValue = 0.65;
    }

    rig.setAttribute('scale', scaleValue + ' ' + scaleValue + ' ' + scaleValue);
    console.log('[Historia Viva] Escala adaptada (' + (dev.isMobile ? 'Móvil' : 'PC') + ', ' + dev.width + 'x' + dev.height + '): ' + scaleValue);
  }

  window.addEventListener('resize', function () {
    attachArVideo();
    adjustSceneForDevice();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      attachArVideo();
      adjustSceneForDevice();
    }, 250);
  });

  // ─── Configurar cámara según laptop o móvil ───
  function configureCameraForDevice(scene) {
    var dev = getDeviceProfile();

    // En móvil usamos cámara trasera (facingMode: environment)
    // NO usamos 'performanceProfile: desktop-fast' porque fuerza parámetros de monitor de PC
    // provocando que en celulares la imagen se agrande y recorte dramáticamente
    var arjsAttr = dev.isMobile
      ? 'sourceType: webcam; facingMode: environment; debugUIEnabled: false; trackingMethod: best;'
      : 'sourceType: webcam; debugUIEnabled: false; trackingMethod: best;';

    scene.setAttribute('arjs', arjsAttr);
  }

  // ─── Asegurar que el video de la cámara se visualice y no distorsione el viewport ───
  function attachArVideo() {
    var video = document.getElementById('arjs-video') ||
                document.querySelector('body > video') ||
                (arView ? arView.querySelector('video:not(#narration-audio)') : null);
    if (!video || !arView) return;

    if (video.parentElement !== arView) {
      arView.insertBefore(video, arView.firstChild);
    }

    // Neutralizar márgenes negativos y anchos gigantescos inyectados por AR.js en móviles
    video.style.setProperty('position', 'fixed', 'important');
    video.style.setProperty('top', '0px', 'important');
    video.style.setProperty('left', '0px', 'important');
    video.style.setProperty('width', '100vw', 'important');
    video.style.setProperty('height', '100vh', 'important');
    video.style.setProperty('max-width', '100vw', 'important');
    video.style.setProperty('max-height', '100vh', 'important');
    video.style.setProperty('margin', '0px', 'important');
    video.style.setProperty('margin-left', '0px', 'important');
    video.style.setProperty('margin-top', '0px', 'important');
    video.style.setProperty('object-fit', 'cover', 'important');
    video.style.setProperty('object-position', 'center center', 'important');
    video.style.setProperty('z-index', '1', 'important');
    video.style.setProperty('display', 'block', 'important');
    video.style.setProperty('opacity', '1', 'important');
    video.style.setProperty('transform', 'none', 'important');

    var canvas = arView.querySelector('.a-canvas');
    if (canvas) {
      canvas.style.setProperty('position', 'fixed', 'important');
      canvas.style.setProperty('top', '0px', 'important');
      canvas.style.setProperty('left', '0px', 'important');
      canvas.style.setProperty('width', '100vw', 'important');
      canvas.style.setProperty('height', '100vh', 'important');
      canvas.style.setProperty('max-width', '100vw', 'important');
      canvas.style.setProperty('max-height', '100vh', 'important');
      canvas.style.setProperty('margin', '0px', 'important');
      canvas.style.setProperty('margin-left', '0px', 'important');
      canvas.style.setProperty('margin-top', '0px', 'important');
    }

    if (video.paused && video.srcObject) {
      video.play().catch(function () {});
    }

    if (video.videoWidth > 0 && loading) {
      loading.classList.add('is-hidden');
    }

    adjustSceneForDevice();
  }

  window.addEventListener('arjs-video-loaded', function () {
    attachArVideo();
  });

  // ─── Control de visualización del diálogo (visible / mini / hidden) ───
  function setDialogState(state) {
    if (state === 'visible') {
      if (dialog) {
        dialog.hidden = false;
        dialog.style.display = '';
      }
      if (bottomBar) {
        bottomBar.hidden = true;
        bottomBar.style.display = 'none';
      }
      dialogMinimized = false;
    } else if (state === 'mini') {
      if (dialog) {
        dialog.hidden = true;
        dialog.style.display = 'none';
      }
      if (bottomBar) {
        bottomBar.hidden = false;
        bottomBar.style.display = 'flex';
      }
      dialogMinimized = true;
    } else { // 'hidden' (marcador no detectado o experiencia recién iniciada)
      if (dialog) {
        dialog.hidden = true;
        dialog.style.display = 'none';
      }
      if (bottomBar) {
        bottomBar.hidden = true;
        bottomBar.style.display = 'none';
      }
    }
  }

  // ─── UI de audio ───
  function updateAudioUI(playing) {
    isAudioPlaying = playing;
    var lbl = playing ? 'Pausar narración' : 'Escuchar narración';
    var ico = playing ? '⏸' : '▶';

    if (audioToggle) {
      audioToggle.setAttribute('aria-pressed', String(playing));
      audioToggle.classList.toggle('is-playing', playing);
    }
    if (audioLabel) audioLabel.textContent = lbl;
    if (audioIcon) audioIcon.textContent = ico;
    if (miniAudioToggle) miniAudioToggle.classList.toggle('is-playing', playing);
    if (miniAudioIcon) miniAudioIcon.textContent = ico;
    if (miniAudioText) miniAudioText.textContent = playing ? 'Pausar' : 'Audio';

    // Pulso del pedestal ceremonial en AR
    if (arScene) {
      var ring = arScene.querySelector('#tamayo-glow-ring');
      if (ring) {
        ring.setAttribute('color', playing ? '#ffe07a' : '#ffc453');
        ring.setAttribute('opacity', playing ? '0.85' : '0.5');
      }
    }
  }

  // ─── Escena seleccionada ───
  function setScene(index, autoPlay) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    selectedScene = index;
    var s = scenes[index];

    if (sceneKicker) sceneKicker.textContent = 'ESCENA ' + (index + 1) + ' DE ' + scenes.length;
    if (scenePeriod) scenePeriod.textContent = s.period || '';
    if (sceneTitle) sceneTitle.textContent = s.title || '';
    if (sceneSubtitle) sceneSubtitle.textContent = s.narration || '';
    if (miniSceneStatus) miniSceneStatus.textContent = 'Escena ' + (index + 1) + ' de ' + scenes.length + ' · Guion';

    if (previousSceneButton) previousSceneButton.disabled = index === 0;
    if (nextSceneButton) nextSceneButton.disabled = index === scenes.length - 1;
    if (miniPrevScene) miniPrevScene.disabled = index === 0;
    if (miniNextScene) miniNextScene.disabled = index === scenes.length - 1;

    if (audioProgressBar) audioProgressBar.style.width = '0%';

    var wasPlaying = isAudioPlaying;
    audio.pause();
    audio.src = s.audio;
    audio.currentTime = 0;

    if (autoPlay || wasPlaying) {
      playAudio();
    } else {
      updateAudioUI(false);
    }
  }

  // ─── Reproducción de audio ───
  function playAudio() {
    if (!audio.src || audio.src === window.location.href) {
      audio.src = scenes[selectedScene].audio;
    }
    audio.play().then(function () {
      updateAudioUI(true);
      hint.textContent = '🔊 Reproduciendo · ' + scenes[selectedScene].title;
    }).catch(function (e) {
      updateAudioUI(false);
      hint.textContent = 'Toca "Escuchar narración" para iniciar el audio';
    });
  }

  function pauseAudio() {
    audio.pause();
    updateAudioUI(false);
    hint.textContent = 'Audio en pausa';
  }

  function toggleAudio() {
    if (audio.paused) playAudio();
    else pauseAudio();
  }

  audio.addEventListener('play', function () { updateAudioUI(true); });
  audio.addEventListener('pause', function () { updateAudioUI(false); });
  audio.addEventListener('ended', function () {
    updateAudioUI(false);
    if (audioProgressBar) audioProgressBar.style.width = '100%';
    hint.textContent = selectedScene < scenes.length - 1
      ? 'Escena finalizada · Pulsa "Siguiente →"'
      : '¡Recorrido completo! Puedes volver a escuchar las escenas';
  });
  audio.addEventListener('timeupdate', function () {
    if (audio.duration && audioProgressBar) {
      audioProgressBar.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    }
  });
  audio.addEventListener('error', function () {
    updateAudioUI(false);
    hint.textContent = 'Error al cargar audio. Verifica los archivos MP3 en assets/audio/';
  });

  // ─── Listeners de botones ───
  if (dialogCloseBtn) dialogCloseBtn.addEventListener('click', function () { setDialogState('mini'); });
  if (detailsToggle) detailsToggle.addEventListener('click', function () { setDialogState('visible'); });
  if (previousSceneButton) previousSceneButton.addEventListener('click', function () { setScene(selectedScene - 1, isAudioPlaying); });
  if (nextSceneButton) nextSceneButton.addEventListener('click', function () { setScene(selectedScene + 1, isAudioPlaying); });
  if (miniPrevScene) miniPrevScene.addEventListener('click', function () { setScene(selectedScene - 1, isAudioPlaying); });
  if (miniNextScene) miniNextScene.addEventListener('click', function () { setScene(selectedScene + 1, isAudioPlaying); });
  if (audioToggle) audioToggle.addEventListener('click', toggleAudio);
  if (miniAudioToggle) miniAudioToggle.addEventListener('click', toggleAudio);

  document.addEventListener('historia:select-scene', function (e) { setScene(e.detail.index, false); });

  // ─── Eventos del Marcador HIRO ───
  function onMarkerDetected() {
    markerFound = true;

    // 1. Mostrar confirmación visual inmediata
    showDetectionBadge('¡Marcador HIRO Detectado!', 'Franz Tamayo presente · Iniciando experiencia', 3500);

    // Feedback háptico en móviles
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40]); } catch (e) {}
    }

    hint.textContent = '✅ Marcador activo · Franz Tamayo en 3D';
    adjustSceneForDevice();

    // 2. Mostrar cuadro de diálogo con el guion correspondiente
    setTimeout(function () {
      if (!markerFound) return;
      if (!dialogMinimized) {
        setDialogState('visible');
      } else {
        setDialogState('mini');
      }
      // 3. Iniciar audio de la escena
      if (!isAudioPlaying && audio.paused) {
        playAudio();
      }
    }, 450);
  }

  function onMarkerLost() {
    markerFound = false;
    hideDetectionBadge();
    audio.pause();
    updateAudioUI(false);
    setDialogState('hidden');
    hint.textContent = '🔍 Apunta la cámara al marcador HIRO para activar la experiencia';
  }

  // ─── Abrir / Cerrar AR ───
  function openAR() {
    if (window.location.protocol === 'file:') {
      alert('⚠️ Para usar la Realidad Aumentada (cámara y modelos 3D), debes abrir la página desde el servidor local:\n\nhttp://localhost:8080\n\nLos navegadores bloquean la cámara y los archivos 3D bajo "file://" por seguridad.');
      window.location.href = 'http://localhost:8080';
      return;
    }

    audio.pause();
    updateAudioUI(false);
    markerFound = false;

    // Ocultar diálogo y badge hasta que se detecte el marcador
    hideDetectionBadge();
    setDialogState('hidden');

    arView.classList.remove('is-error');
    arView.setAttribute('aria-hidden', 'false');
    arView.inert = false;
    // Bloquear viewport móvil contra expansiones o zooms automáticos
    document.documentElement.classList.add('ar-active');
    document.body.classList.add('ar-active');
    document.body.style.overflow = 'hidden';

    loading.classList.remove('is-hidden');
    hint.textContent = '🔍 Buscando marcador HIRO… apunta la cámara al marcador';

    if (!arScene) {
      arScene = sceneTemplate.content.firstElementChild.cloneNode(true);
      configureCameraForDevice(arScene);
      configureDracoSupport(arScene);
      arView.insertBefore(arScene, arView.querySelector('.ar-hud'));
      arView.dispatchEvent(new CustomEvent('ar-scene-ready', { detail: { scene: arScene } }));
    }

    // Monitorear video de AR.js y estabilizar tamaño
    var checks = 0;
    if (videoWatcher) clearInterval(videoWatcher);
    videoWatcher = setInterval(function () {
      checks++;
      attachArVideo();
      if (checks > 50) clearInterval(videoWatcher);
    }, 150);

    arTimeout = setTimeout(function () {
      if (!arView.classList.contains('is-error')) loading.classList.add('is-hidden');
      attachArVideo();
    }, 7000);

    var closeBtn = arView.querySelector('[data-close-ar]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    setScene(selectedScene, false);
    adjustSceneForDevice();
  }

  function closeAR() {
    audio.pause();
    updateAudioUI(false);
    clearTimeout(arTimeout);
    if (videoWatcher) clearInterval(videoWatcher);

    hideDetectionBadge();
    setDialogState('hidden');

    arView.setAttribute('aria-hidden', 'true');
    arView.inert = true;
    document.documentElement.classList.remove('ar-active');
    document.body.classList.remove('ar-active');
    document.body.style.overflow = '';
    markerFound = false;

    var el = document.activeElement;
    if (el && el.blur) el.blur();
    var opener = document.querySelector('[data-open-ar]');
    if (opener) opener.focus({ preventScroll: true });

    document.querySelectorAll('video').forEach(function (v) {
      if (v.id === 'narration-audio') return;
      if (v.srcObject && v.srcObject.getTracks) {
        v.srcObject.getTracks().forEach(function (t) { t.stop(); });
        v.srcObject = null;
      }
      if (v.id === 'arjs-video' || v.parentNode === arView || v.parentNode === document.body) {
        v.remove();
      }
    });

    if (arScene) arScene.remove();
    arScene = null;
  }

  document.querySelectorAll('[data-open-ar]').forEach(function (b) { b.addEventListener('click', openAR); });
  document.querySelectorAll('[data-close-ar]').forEach(function (b) { b.addEventListener('click', closeAR); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && arView.getAttribute('aria-hidden') === 'false') closeAR();
  });

  // ─── A-Frame scene ready ───
  arView.addEventListener('ar-scene-ready', function (event) {
    var scene = event.detail.scene;
    var cameraTimer;

    configureDracoSupport(scene);

    scene.addEventListener('loaded', function () {
      configureDracoSupport(scene);
      adjustSceneForDevice();

      var marker = scene.querySelector('a-marker');
      var model = scene.querySelector('#franz-tamayo-figure');

      if (marker) {
        marker.addEventListener('markerFound', onMarkerDetected);
        marker.addEventListener('markerLost', onMarkerLost);
      }

      if (model) {
        model.addEventListener('model-loaded', function () {
          console.log('[Historia Viva] Modelo franz_tamayo.glb cargado y decodificado correctamente');
          hint.textContent = '🔍 Modelo listo · Apunta la cámara al marcador HIRO';
        });
        model.addEventListener('model-error', function (err) {
          console.error('[Historia Viva] Error inicial cargando modelo:', err);
          // Si por alguna razón el decoder local falló, reintentar con el CDN oficial de Draco
          var gltfSys = scene.systems && scene.systems['gltf-model'];
          if (gltfSys && gltfSys.dracoLoader) {
            console.warn('[Historia Viva] Intentando decodificación con CDN de respaldo...');
            gltfSys.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
            var currentModelSrc = model.getAttribute('gltf-model');
            model.removeAttribute('gltf-model');
            setTimeout(function () {
              model.setAttribute('gltf-model', currentModelSrc);
            }, 150);
          }
          hint.textContent = '⚠️ Cargando decodificador 3D… un momento';
        });
      }

      scene.addEventListener('camera-init', function () {
        clearTimeout(cameraTimer);
        loading.classList.add('is-hidden');
        attachArVideo();
      });

      scene.addEventListener('camera-error', function () {
        clearTimeout(cameraTimer);
        if (arView.getAttribute('aria-hidden') === 'false') arView.classList.add('is-error');
      });

      cameraTimer = setTimeout(function () {
        loading.classList.add('is-hidden');
        attachArVideo();
      }, 6000);
    });
  });

  // Inicializar primera escena
  setScene(0, false);
})();
