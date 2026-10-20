(function () {
  'use strict';

  const arView = document.getElementById('ar-view');
  const sceneTemplate = document.getElementById('ar-scene-template');
  const loading = document.getElementById('ar-loading');
  const hint = document.getElementById('ar-hint');
  const audio = document.getElementById('narration-audio');

  // Elementos del cuadro de diálogo
  const dialog = document.getElementById('ar-details');
  const dialogCloseBtn = document.getElementById('dialog-close');
  const sceneKicker = document.getElementById('scene-kicker');
  const scenePeriod = document.getElementById('scene-period');
  const sceneTitle = document.getElementById('scene-title');
  const sceneSubtitle = document.getElementById('scene-subtitle');
  const audioProgressBar = document.getElementById('audio-progress-bar');
  const previousSceneButton = document.getElementById('previous-scene');
  const nextSceneButton = document.getElementById('next-scene');
  const audioToggle = document.getElementById('audio-toggle');
  const audioIcon = document.getElementById('audio-icon');
  const audioLabel = document.getElementById('audio-label');

  // Elementos de la barra flotante compacta (cuando el guion está minimizado)
  const bottomBar = document.getElementById('ar-bottom-bar');
  const detailsToggle = document.getElementById('details-toggle');
  const miniSceneStatus = document.getElementById('mini-scene-status');
  const miniPrevScene = document.getElementById('mini-prev-scene');
  const miniNextScene = document.getElementById('mini-next-scene');
  const miniAudioToggle = document.getElementById('mini-audio-toggle');
  const miniAudioIcon = document.getElementById('mini-audio-icon');
  const miniAudioText = document.getElementById('mini-audio-text');

  const scenes = window.HistoriaVivaScenes || [];
  let arScene = null;
  let selectedScene = 0;
  let isAudioPlaying = false;
  let markerFound = false;
  let arTimeout;

  // Actualiza la interfaz del diálogo y botones para la escena actual
  function setScene(index, autoPlayAudio) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    const previousIndex = selectedScene;
    selectedScene = index;
    const scene = scenes[index];

    // Textos del diálogo
    if (sceneKicker) sceneKicker.textContent = 'ESCENA ' + (index + 1) + ' DE ' + scenes.length;
    if (scenePeriod) scenePeriod.textContent = scene.period || '';
    if (sceneTitle) sceneTitle.textContent = scene.title || '';
    if (sceneSubtitle) sceneSubtitle.textContent = scene.narration || '';

    // Barra compacta
    if (miniSceneStatus) {
      miniSceneStatus.textContent = 'Escena ' + (index + 1) + ' de ' + scenes.length + ' · Guion';
    }

    // Botones anterior / siguiente
    const isFirst = index === 0;
    const isLast = index === scenes.length - 1;

    if (previousSceneButton) previousSceneButton.disabled = isFirst;
    if (nextSceneButton) nextSceneButton.disabled = isLast;
    if (miniPrevScene) miniPrevScene.disabled = isFirst;
    if (miniNextScene) miniNextScene.disabled = isLast;

    // Reset de progreso visual
    if (audioProgressBar) audioProgressBar.style.width = '0%';

    // Cargar nuevo audio
    const wasPlaying = isAudioPlaying;
    audio.pause();
    audio.src = scene.audio;
    audio.currentTime = 0;

    if (autoPlayAudio || wasPlaying) {
      playAudio();
    } else {
      updateAudioUI(false);
      if (markerFound) {
        hint.textContent = 'Escena ' + (index + 1) + ' lista · Presiona "Escuchar narración"';
      }
    }
  }

  // Control de visibilidad del cuadro de diálogo
  function setDialogVisibility(visible) {
    if (visible) {
      if (dialog) dialog.removeAttribute('hidden');
      if (bottomBar) bottomBar.hidden = true;
      if (detailsToggle) detailsToggle.setAttribute('aria-expanded', 'true');
    } else {
      if (dialog) dialog.setAttribute('hidden', '');
      if (bottomBar) bottomBar.hidden = false;
      if (detailsToggle) detailsToggle.setAttribute('aria-expanded', 'false');
    }
  }

  // Actualiza el aspecto de los botones de audio
  function updateAudioUI(playing) {
    isAudioPlaying = playing;
    const playLabel = playing ? 'Pausar narración' : 'Escuchar narración';
    const playIcon = playing ? '⏸' : '▶';

    if (audioToggle) {
      audioToggle.setAttribute('aria-pressed', String(playing));
      if (playing) {
        audioToggle.classList.add('is-playing');
      } else {
        audioToggle.classList.remove('is-playing');
      }
    }
    if (audioLabel) audioLabel.textContent = playLabel;
    if (audioIcon) audioIcon.textContent = playIcon;

    if (miniAudioToggle) {
      if (playing) {
        miniAudioToggle.classList.add('is-playing');
      } else {
        miniAudioToggle.classList.remove('is-playing');
      }
    }
    if (miniAudioIcon) miniAudioIcon.textContent = playIcon;
    if (miniAudioText) miniAudioText.textContent = playing ? 'Pausar' : 'Audio';

    // Pulso del anillo ceremonial en AR
    if (arScene) {
      const glowRing = arScene.querySelector('#tamayo-glow-ring');
      if (glowRing) {
        if (playing) {
          glowRing.setAttribute('color', '#ffe07a');
          glowRing.setAttribute('opacity', '0.85');
        } else {
          glowRing.setAttribute('color', '#ffc453');
          glowRing.setAttribute('opacity', '0.5');
        }
      }
    }
  }

  // Reproduce el MP3 de la escena actual
  async function playAudio() {
    if (!audio.src || audio.src === window.location.href) {
      audio.src = scenes[selectedScene].audio;
    }
    try {
      await audio.play();
      updateAudioUI(true);
      hint.textContent = 'Reproduciendo audio · ' + scenes[selectedScene].title;
    } catch (err) {
      updateAudioUI(false);
      hint.textContent = 'Toca "Escuchar narración" para iniciar el audio';
    }
  }

  // Pausa el audio
  function pauseAudio() {
    audio.pause();
    updateAudioUI(false);
    hint.textContent = 'Audio en pausa';
  }

  // Alterna entre reproducir y pausar
  function toggleAudio() {
    if (audio.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  }

  // Eventos nativos del elemento de audio
  audio.addEventListener('play', function () {
    updateAudioUI(true);
  });

  audio.addEventListener('pause', function () {
    updateAudioUI(false);
  });

  audio.addEventListener('ended', function () {
    updateAudioUI(false);
    if (audioProgressBar) audioProgressBar.style.width = '100%';
    if (selectedScene < scenes.length - 1) {
      hint.textContent = 'Escena finalizada · Pulsa "Siguiente →" para continuar';
    } else {
      hint.textContent = '¡Recorrido completo! Puedes volver a escuchar o elegir otra escena';
    }
  });

  audio.addEventListener('timeupdate', function () {
    if (audio.duration && audioProgressBar) {
      const pct = (audio.currentTime / audio.duration) * 100;
      audioProgressBar.style.width = pct + '%';
    }
  });

  audio.addEventListener('error', function () {
    updateAudioUI(false);
    hint.textContent = 'No se pudo cargar ' + scenes[selectedScene].audio + '. Verifica que el archivo exista.';
  });

  // Eventos de botones
  if (dialogCloseBtn) {
    dialogCloseBtn.addEventListener('click', function () {
      setDialogVisibility(false);
    });
  }

  if (detailsToggle) {
    detailsToggle.addEventListener('click', function () {
      setDialogVisibility(true);
    });
  }

  if (previousSceneButton) {
    previousSceneButton.addEventListener('click', function () {
      setScene(selectedScene - 1, isAudioPlaying);
    });
  }

  if (nextSceneButton) {
    nextSceneButton.addEventListener('click', function () {
      setScene(selectedScene + 1, isAudioPlaying);
    });
  }

  if (miniPrevScene) {
    miniPrevScene.addEventListener('click', function () {
      setScene(selectedScene - 1, isAudioPlaying);
    });
  }

  if (miniNextScene) {
    miniNextScene.addEventListener('click', function () {
      setScene(selectedScene + 1, isAudioPlaying);
    });
  }

  if (audioToggle) {
    audioToggle.addEventListener('click', toggleAudio);
  }

  if (miniAudioToggle) {
    miniAudioToggle.addEventListener('click', toggleAudio);
  }

  // Evento externo para seleccionar escena desde la página web principal
  document.addEventListener('historia:select-scene', function (event) {
    setScene(event.detail.index, false);
  });

  // Apertura y cierre de la experiencia de Realidad Aumentada
  function openAR() {
    audio.pause();
    updateAudioUI(false);
    setDialogVisibility(true);

    arView.classList.remove('is-error');
    arView.setAttribute('aria-hidden', 'false');
    arView.inert = false;
    document.body.style.overflow = 'hidden';

    loading.classList.remove('is-hidden');
    hint.textContent = 'Apunta con la cámara al marcador HIRO';

    if (!arScene) {
      arScene = sceneTemplate.content.firstElementChild.cloneNode(true);
      arView.insertBefore(arScene, arView.querySelector('.ar-hud'));
      arView.dispatchEvent(new CustomEvent('ar-scene-ready', { detail: { scene: arScene } }));
    }

    arTimeout = window.setTimeout(function () {
      if (!arView.classList.contains('is-error')) {
        loading.classList.add('is-hidden');
      }
    }, 9000);

    const closeButton = arView.querySelector('[data-close-ar]');
    if (closeButton) closeButton.focus({ preventScroll: true });

    // Preparar primera escena
    setScene(selectedScene, false);
  }

  function closeAR() {
    audio.pause();
    updateAudioUI(false);
    window.clearTimeout(arTimeout);

    arView.setAttribute('aria-hidden', 'true');
    arView.inert = true;
    document.body.style.overflow = '';

    const activeElement = document.activeElement;
    if (activeElement && activeElement.blur) activeElement.blur();
    const opener = document.querySelector('[data-open-ar]');
    if (opener) opener.focus({ preventScroll: true });

    arView.querySelectorAll('video').forEach(function (video) {
      if (video.srcObject && video.srcObject.getTracks) {
        video.srcObject.getTracks().forEach(function (track) { track.stop(); });
        video.srcObject = null;
      }
    });

    if (arScene) arScene.remove();
    arScene = null;
    markerFound = false;
  }

  document.querySelectorAll('[data-open-ar]').forEach(function (button) {
    button.addEventListener('click', openAR);
  });

  document.querySelectorAll('[data-close-ar]').forEach(function (button) {
    button.addEventListener('click', closeAR);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && arView.getAttribute('aria-hidden') === 'false') {
      closeAR();
    }
  });

  // Configuración de la escena A-Frame y eventos de tracking
  arView.addEventListener('ar-scene-ready', function (event) {
    const scene = event.detail.scene;
    let cameraTimer;

    function onMarkerFound() {
      markerFound = true;
      hint.textContent = 'Franz Tamayo detectado · Pulsa "Escuchar narración"';
      const glowRing = scene.querySelector('#tamayo-glow-ring');
      if (glowRing) {
        glowRing.setAttribute('animation', 'property: scale; to: 1.18 1.18 1.18; dir: alternate; dur: 1600; easing: easeInOutSine; loop: true');
      }
    }

    function onMarkerLost() {
      markerFound = false;
      hint.textContent = 'Apunta con la cámara al marcador HIRO para activar la escena';
    }

    scene.addEventListener('loaded', function () {
      const marker = scene.querySelector('a-marker');
      const model = scene.querySelector('#franz-tamayo-figure');

      if (marker) {
        marker.addEventListener('markerFound', onMarkerFound);
        marker.addEventListener('markerLost', onMarkerLost);
      }

      if (model) {
        model.addEventListener('model-error', function () {
          hint.textContent = 'No se encontró assets/models/franz_tamayo.glb. Verifica la ruta del modelo 3D.';
        });
      }

      scene.addEventListener('camera-init', function () {
        window.clearTimeout(cameraTimer);
        loading.classList.add('is-hidden');
      });

      scene.addEventListener('camera-error', function () {
        window.clearTimeout(cameraTimer);
        if (arView.getAttribute('aria-hidden') === 'false') {
          arView.classList.add('is-error');
        }
      });

      cameraTimer = window.setTimeout(function () {
        if (!markerFound) loading.classList.add('is-hidden');
      }, 7000);
    });
  });

  // Inicialización de la primera escena
  setScene(0, false);
})();
