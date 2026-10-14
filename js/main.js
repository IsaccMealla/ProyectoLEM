(function () {
  const arView = document.getElementById('ar-view');
  const sceneTemplate = document.getElementById('ar-scene-template');
  let arScene = null;
  const loading = document.getElementById('ar-loading');
  const audio = document.getElementById('proclamation-audio');
  const audioToggle = document.getElementById('audio-toggle');
  const audioLabel = document.getElementById('audio-label');
  const audioIcon = document.getElementById('audio-icon');
  const details = document.getElementById('ar-details');
  const detailsToggle = document.getElementById('details-toggle');
  let speechActive = false;
  let arTimeout;

  function mountARScene() {
    if (arScene) return;
    arScene = sceneTemplate.content.firstElementChild.cloneNode(true);
    arView.insertBefore(arScene, arView.querySelector('.ar-hud'));
    arView.dispatchEvent(new CustomEvent('ar-scene-ready', { detail: { scene: arScene } }));
  }

  function setDetails(open) {
    details.hidden = !open;
    detailsToggle.setAttribute('aria-expanded', String(open));
  }

  function setAudioState(playing) {
    audioToggle.setAttribute('aria-pressed', String(playing));
    audioLabel.textContent = playing ? 'Pausar proclama' : 'Escuchar proclama';
    audioIcon.textContent = playing ? 'Ⅱ' : '▶';
  }

  function closeNarration() {
    audio.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speechActive = false;
    setAudioState(false);
  }

  function openAR() {
    closeNarration();
    setDetails(false);
    arView.classList.remove('is-error');
    arView.setAttribute('aria-hidden', 'false');
    arView.inert = false;
    document.body.style.overflow = 'hidden';
    loading.classList.remove('is-hidden');
    mountARScene();
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

  document.querySelectorAll('.timeline-trigger').forEach(function (button) {
    button.addEventListener('click', function () {
      const wasOpen = button.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.timeline-trigger').forEach(function (trigger) {
        trigger.classList.remove('is-active');
        trigger.setAttribute('aria-expanded', 'false');
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (panel) panel.hidden = true;
      });
      if (!wasOpen) {
        button.classList.add('is-active');
        button.setAttribute('aria-expanded', 'true');
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
      }
    });
  });

  detailsToggle.addEventListener('click', function () {
    setDetails(detailsToggle.getAttribute('aria-expanded') !== 'true');
  });
  arView.querySelector('.details-close').addEventListener('click', function () { setDetails(false); });

  audioToggle.addEventListener('click', async function () {
    if (audioToggle.getAttribute('aria-pressed') === 'true') {
      closeNarration();
      return;
    }
    if (audio.getAttribute('src')) {
      try {
        await audio.play();
        setAudioState(true);
        return;
      } catch (error) {
      }
    }
    if ('speechSynthesis' in window) {
      const narration = new SpeechSynthesisUtterance('El 16 de julio de 1809, en la ciudad de La Paz, comenzó una revolución en busca de un gobierno propio. La Junta Tuitiva expresó aspiraciones de autonomía y protección de los derechos del pueblo. Pedro Domingo Murillo es recordado como uno de los protagonistas de este proceso.');
      narration.lang = 'es-BO';
      narration.rate = 0.88;
      narration.onend = function () { speechActive = false; setAudioState(false); };
      narration.onerror = function () { speechActive = false; setAudioState(false); };
      speechActive = true;
      window.speechSynthesis.speak(narration);
      setAudioState(true);
    } else {
      audioLabel.textContent = 'Narración no disponible';
      window.setTimeout(function () { setAudioState(false); }, 2200);
    }
  });
  audio.addEventListener('ended', function () { setAudioState(false); });
  audio.addEventListener('pause', function () {
    if (!speechActive) setAudioState(false);
  });
})();