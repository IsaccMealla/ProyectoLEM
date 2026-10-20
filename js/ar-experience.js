(function () {
  'use strict';

  var arView = document.getElementById('ar-view');
  var sceneTemplate = document.getElementById('ar-scene-template');
  var loading = document.getElementById('ar-loading');
  var hint = document.getElementById('ar-hint');
  var audio = document.getElementById('narration-audio');

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
  var dialogMinimized = false; // user explicitly minimized

  // ─── Detección de dispositivo ───
  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function configureCameraForDevice(sceneEl) {
    if (isMobileDevice()) {
      sceneEl.setAttribute('arjs', 'sourceType: webcam; facingMode: environment; debugUIEnabled: false;');
    } else {
      sceneEl.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
    }
  }

  // ─── Video de cámara (AR.js) ───
  function attachArVideo() {
    var video = document.getElementById('arjs-video') ||
                document.querySelector('body > video') ||
                (arView ? arView.querySelector('video:not(#narration-audio)') : null);

    if (video && arView) {
      if (video.parentNode !== arView) {
        arView.insertBefore(video, arScene || arView.firstChild);
      }
      video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;display:block;opacity:1;';
      if (video.paused && video.srcObject) {
        video.play().catch(function () {});
      }
      if (loading) loading.classList.add('is-hidden');
    }
  }

  window.addEventListener('arjs-video-loaded', attachArVideo);

  // ─── Visibilidad del diálogo / barra compacta ───
  // Estado: 'visible' | 'hidden' | 'mini'
  function setDialogState(state) {
    if (state === 'visible') {
      if (dialog) { dialog.removeAttribute('hidden'); dialog.style.display = ''; }
      if (bottomBar) bottomBar.hidden = true;
      dialogMinimized = false;
    } else if (state === 'mini') {
      if (dialog) dialog.setAttribute('hidden', '');
      if (bottomBar) bottomBar.hidden = false;
      dialogMinimized = true;
    } else {
      // hidden - todo oculto
      if (dialog) { dialog.setAttribute('hidden', ''); dialog.style.display = 'none'; }
      if (bottomBar) bottomBar.hidden = true;
      dialogMinimized = false;
    }
  }

  // ─── Actualizar UI de audio ───
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

    // Pulso del anillo en AR
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

  // ─── Audio ───
  function playAudio() {
    if (!audio.src || audio.src === window.location.href) {
      audio.src = scenes[selectedScene].audio;
    }
    audio.play().then(function () {
      updateAudioUI(true);
      hint.textContent = '🔊 Reproduciendo · ' + scenes[selectedScene].title;
    }).catch(function () {
      updateAudioUI(false);
      hint.textContent = 'Toca "Escuchar narración" para iniciar';
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
      : '¡Recorrido completo! Puedes volver a escuchar';
  });
  audio.addEventListener('timeupdate', function () {
    if (audio.duration && audioProgressBar) {
      audioProgressBar.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    }
  });
  audio.addEventListener('error', function () {
    updateAudioUI(false);
    hint.textContent = 'Error al cargar audio. Verifica los archivos MP3.';
  });

  // ─── Botones ───
  if (dialogCloseBtn) dialogCloseBtn.addEventListener('click', function () { setDialogState('mini'); });
  if (detailsToggle) detailsToggle.addEventListener('click', function () { setDialogState('visible'); });
  if (previousSceneButton) previousSceneButton.addEventListener('click', function () { setScene(selectedScene - 1, isAudioPlaying); });
  if (nextSceneButton) nextSceneButton.addEventListener('click', function () { setScene(selectedScene + 1, isAudioPlaying); });
  if (miniPrevScene) miniPrevScene.addEventListener('click', function () { setScene(selectedScene - 1, isAudioPlaying); });
  if (miniNextScene) miniNextScene.addEventListener('click', function () { setScene(selectedScene + 1, isAudioPlaying); });
  if (audioToggle) audioToggle.addEventListener('click', toggleAudio);
  if (miniAudioToggle) miniAudioToggle.addEventListener('click', toggleAudio);

  document.addEventListener('historia:select-scene', function (e) { setScene(e.detail.index, false); });

  // ─── Marker found / lost ───
  function onMarkerDetected() {
    markerFound = true;
    hint.textContent = '✅ ¡Marcador detectado! Cargando a Franz Tamayo…';

    // Mostrar diálogo (si no fue minimizado manualmente)
    setTimeout(function () {
      if (!markerFound) return; // marker lost before timeout
      if (!dialogMinimized) {
        setDialogState('visible');
      } else {
        setDialogState('mini');
      }
      hint.textContent = '📍 Franz Tamayo detectado · Escucha la narración';
      // Auto-play first scene audio on detection
      if (!isAudioPlaying && audio.paused) {
        playAudio();
      }
    }, 600);
  }

  function onMarkerLost() {
    markerFound = false;
    audio.pause();
    updateAudioUI(false);
    setDialogState('hidden');
    hint.textContent = '🔍 Apunta la cámara al marcador HIRO para activar la experiencia';
  }

  // ─── Abrir / Cerrar AR ───
  function openAR() {
    audio.pause();
    updateAudioUI(false);
    markerFound = false;

    // Ocultar diálogo hasta que se detecte el marcador
    setDialogState('hidden');

    arView.classList.remove('is-error');
    arView.setAttribute('aria-hidden', 'false');
    arView.inert = false;
    document.body.style.overflow = 'hidden';

    loading.classList.remove('is-hidden');
    hint.textContent = '🔍 Buscando marcador HIRO… apunta la cámara al marcador';

    if (!arScene) {
      arScene = sceneTemplate.content.firstElementChild.cloneNode(true);
      configureCameraForDevice(arScene);
      arView.insertBefore(arScene, arView.querySelector('.ar-hud'));
      arView.dispatchEvent(new CustomEvent('ar-scene-ready', { detail: { scene: arScene } }));
    }

    // Monitorear video de AR.js
    var checks = 0;
    if (videoWatcher) clearInterval(videoWatcher);
    videoWatcher = setInterval(function () {
      checks++;
      attachArVideo();
      if (checks > 40) clearInterval(videoWatcher);
    }, 150);

    arTimeout = setTimeout(function () {
      if (!arView.classList.contains('is-error')) loading.classList.add('is-hidden');
      attachArVideo();
    }, 7000);

    var closeBtn = arView.querySelector('[data-close-ar]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    setScene(selectedScene, false);
  }

  function closeAR() {
    audio.pause();
    updateAudioUI(false);
    clearTimeout(arTimeout);
    if (videoWatcher) clearInterval(videoWatcher);

    arView.setAttribute('aria-hidden', 'true');
    arView.inert = true;
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

    scene.addEventListener('loaded', function () {
      var marker = scene.querySelector('a-marker');
      var model = scene.querySelector('#franz-tamayo-figure');

      if (marker) {
        marker.addEventListener('markerFound', onMarkerDetected);
        marker.addEventListener('markerLost', onMarkerLost);
      }

      if (model) {
        model.addEventListener('model-loaded', function () {
          console.log('[Historia Viva] Modelo franz_tamayo.glb cargado correctamente');
          hint.textContent = '🔍 Modelo listo · Apunta la cámara al marcador HIRO';
        });
        model.addEventListener('model-error', function (err) {
          console.error('[Historia Viva] Error cargando modelo:', err);
          hint.textContent = '⚠️ Error al cargar el modelo 3D. Recarga la página (Ctrl+Shift+R)';
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

  // Inicializar
  setScene(0, false);
})();
