(function () {
  const arView = document.getElementById('ar-view');
  const sceneTemplate = document.getElementById('ar-scene-template');
  const loading = document.getElementById('ar-loading');
  const hint = document.getElementById('ar-hint');
  const audio = document.getElementById('narration-audio');
  const audioToggle = document.getElementById('audio-toggle');
  const audioLabel = document.getElementById('audio-label');
  const audioIcon = document.getElementById('audio-icon');
  const details = document.getElementById('ar-details');
  const detailsToggle = document.getElementById('details-toggle');
  const previousSceneButton = document.getElementById('previous-scene');
  const nextSceneButton = document.getElementById('next-scene');
  const sceneNavigationStatus = document.getElementById('scene-navigation-status');
  const sceneTitle = document.getElementById('scene-title');
  const sceneKicker = document.getElementById('scene-kicker');
  const subtitle = document.getElementById('scene-subtitle');
  const scenes = window.HistoriaVivaScenes;
  let arScene = null;
  let selectedScene = 0;
  let speechActive = false;
  let audioFailed = false;
  let pendingAudioScene = null;
  let speechSession = 0;
  let arTimeout;

  function setDetails(open) {
    details.hidden = !open;
    detailsToggle.setAttribute('aria-expanded', String(open));
  }

  function setAudioState(playing) {
    audioToggle.setAttribute('aria-pressed', String(playing));
    audioLabel.textContent = playing ? 'Pausar narración' : 'Escuchar narración';
    audioIcon.textContent = playing ? 'Ⅱ' : '▶';
  }

  function setScene(index) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    selectedScene = index;
    const scene = scenes[index];
    previousSceneButton.disabled = index === 0;
    nextSceneButton.disabled = index === scenes.length - 1;
    sceneNavigationStatus.textContent = 'Escena ' + (index + 1) + ' de ' + scenes.length;
    sceneTitle.textContent = scene.title;
    sceneKicker.textContent = 'ESCENA ' + (index + 1) + ' DE ' + scenes.length + ' · ' + scene.period;
    subtitle.textContent = scene.narration;
  }

  setScene(selectedScene);

  function cancelSpeech() {
    speechSession += 1;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speechActive = false;
  }

  function closeNarration() {
    audio.pause();
    pendingAudioScene = null;
    cancelSpeech();
    setAudioState(false);
  }

  function sceneWeights() {
    return scenes.map(function (scene) { return scene.narration.trim().split(/\s+/).length; });
  }

  function sceneStartTime(index) {
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    const weights = sceneWeights();
    const total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    const before = weights.slice(0, index).reduce(function (sum, weight) { return sum + weight; }, 0);
    return duration * before / total;
  }

  function seekAudioToScene(index) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      pendingAudioScene = index;
      return;
    }
    pendingAudioScene = null;
    audio.currentTime = sceneStartTime(index);
  }

  function updateAudioSubtitle() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const weights = sceneWeights();
    const total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    const elapsedShare = audio.currentTime / audio.duration * total;
    let accumulated = 0;
    for (let index = 0; index < weights.length; index += 1) {
      accumulated += weights[index];
      if (elapsedShare < accumulated || index === weights.length - 1) {
        setScene(index);
        return;
      }
    }
  }

  function speakFromScene(index) {
    if (!('speechSynthesis' in window)) {
      hint.textContent = 'La narración requiere el audio incluido o síntesis de voz compatible con el navegador.';
      setAudioState(false);
      return;
    }
    audio.pause();
    cancelSpeech();
    speechActive = true;
    setAudioState(true);
    hint.textContent = 'Narración hablada · ' + scenes[index].title;
    const session = speechSession;

    function speakNext(sceneIndex) {
      if (session !== speechSession || sceneIndex >= scenes.length) {
        if (session === speechSession) {
          speechActive = false;
          setAudioState(false);
          hint.textContent = 'Narración finalizada · Elige una escena para volver a escucharla';
        }
        return;
      }
      setScene(sceneIndex);
      const utterance = new SpeechSynthesisUtterance(scenes[sceneIndex].narration);
      utterance.lang = 'es-BO';
      utterance.rate = 0.92;
      utterance.onend = function () { speakNext(sceneIndex + 1); };
      utterance.onerror = function () {
        if (session === speechSession) {
          speechActive = false;
          setAudioState(false);
          hint.textContent = 'No se pudo reproducir la voz del navegador. Comprueba la configuración de audio.';
        }
      };
      window.speechSynthesis.speak(utterance);
    }

    speakNext(index);
  }

  function selectScene(index) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    setScene(index);
    if (audioToggle.getAttribute('aria-pressed') !== 'true') return;
    if (speechActive) {
      speakFromScene(index);
      return;
    }
    if (!audioFailed) {
      seekAudioToScene(index);
      hint.textContent = 'Reproduciendo locución · ' + scenes[index].title;
    }
  }

  function openAR() {
    closeNarration();
    setDetails(true);
    arView.classList.remove('is-error');
    arView.setAttribute('aria-hidden', 'false');
    arView.inert = false;
    document.body.style.overflow = 'hidden';
    loading.classList.remove('is-hidden');
    hint.textContent = 'Busca el marcador HIRO para activar la escena';
    if (!arScene) {
      arScene = sceneTemplate.content.firstElementChild.cloneNode(true);
      arView.insertBefore(arScene, arView.querySelector('.ar-hud'));
      arView.dispatchEvent(new CustomEvent('ar-scene-ready', { detail: { scene: arScene } }));
    }
    arTimeout = window.setTimeout(function () {
      if (!arView.classList.contains('is-error')) loading.classList.add('is-hidden');
    }, 10000);
    const closeButton = arView.querySelector('[data-close-ar]');
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  function closeAR() {
    closeNarration();
    setDetails(false);
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
  }

  document.querySelectorAll('[data-open-ar]').forEach(function (button) {
    button.addEventListener('click', openAR);
  });
  document.querySelectorAll('[data-close-ar]').forEach(function (button) {
    button.addEventListener('click', closeAR);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && arView.getAttribute('aria-hidden') === 'false') closeAR();
  });

  detailsToggle.addEventListener('click', function () {
    setDetails(detailsToggle.getAttribute('aria-expanded') !== 'true');
  });
  previousSceneButton.addEventListener('click', function () {
    selectScene(selectedScene - 1);
  });
  nextSceneButton.addEventListener('click', function () {
    selectScene(selectedScene + 1);
  });
  document.addEventListener('historia:select-scene', function (event) {
    selectScene(event.detail.index);
  });

  audioToggle.addEventListener('click', async function () {
    if (audioToggle.getAttribute('aria-pressed') === 'true') {
      closeNarration();
      hint.textContent = 'Narración pausada';
      return;
    }
    if (audioFailed) {
      speakFromScene(selectedScene);
      return;
    }
    try {
      seekAudioToScene(selectedScene);
      await audio.play();
      setAudioState(true);
      hint.textContent = 'Reproduciendo locución · ' + scenes[selectedScene].title;
    } catch (error) {
      audioFailed = true;
      speakFromScene(selectedScene);
      if (!speechActive) hint.textContent = 'No se pudo reproducir el archivo de audio y la voz alternativa no está disponible.';
    }
  });
  audio.addEventListener('loadedmetadata', function () {
    if (pendingAudioScene !== null) seekAudioToScene(pendingAudioScene);
  });
  audio.addEventListener('durationchange', function () {
    if (pendingAudioScene !== null) seekAudioToScene(pendingAudioScene);
  });
  audio.addEventListener('timeupdate', updateAudioSubtitle);
  audio.addEventListener('ended', function () {
    setAudioState(false);
    hint.textContent = 'Narración finalizada · Elige una escena para volver a escucharla';
  });
  audio.addEventListener('error', function () {
    audioFailed = true;
    if (audioToggle.getAttribute('aria-pressed') === 'true' && !speechActive) speakFromScene(selectedScene);
  });

  arView.addEventListener('ar-scene-ready', function (event) {
    const scene = event.detail.scene;
    let markerFound = false;
    let cameraTimer;

    function onMarkerFound() {
      markerFound = true;
      hint.textContent = 'Marcador detectado · Acércate para observar los detalles';
    }

    function onMarkerLost() {
      markerFound = false;
      hint.textContent = 'Busca el marcador HIRO para activar la escena';
    }

    scene.addEventListener('loaded', function () {
      const marker = scene.querySelector('a-marker');
      const model = scene.querySelector('#franz-tamayo-figure');
      if (marker) {
        marker.addEventListener('markerFound', onMarkerFound);
        marker.addEventListener('markerLost', onMarkerLost);
      }
      if (model) {
        model.addEventListener('model-loaded', function (event) {
          const animations = event.detail.model && event.detail.model.animations;
          if (!animations || animations.length === 0) {
            hint.textContent = 'El modelo cargó, pero el GLB no contiene clips de animación. Reexporta el modelo incluyendo sus animaciones.';
          }
        });
        model.addEventListener('model-error', function () {
          hint.textContent = 'No se encontró assets/models/franz_tamayo.glb. Añade el modelo 3D para mostrar a Franz Tamayo.';
        });
      }
      scene.addEventListener('camera-init', function () {
        window.clearTimeout(cameraTimer);
        loading.classList.add('is-hidden');
      });
      scene.addEventListener('camera-error', function () {
        window.clearTimeout(cameraTimer);
        if (arView.getAttribute('aria-hidden') === 'false') arView.classList.add('is-error');
      });
      cameraTimer = window.setTimeout(function () {
        if (!markerFound) loading.classList.add('is-hidden');
      }, 8000);
    });
  });
})();
