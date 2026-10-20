(function () {
  /**
   * Escenas históricas oficiales de Franz Tamayo y UNIFRANZ
   * Compartidas tanto por la experiencia de Realidad Aumentada (AR)
   * como por la experiencia de Realidad Virtual 360° (VR).
   */
  const scenes = [
    {
      title: 'El Despertar de Franz Tamayo',
      period: '1879 — 1956',
      narration: 'Franz Tamayo nació en La Paz en 1879 y murió en 1956. Fue poeta, pensador, jurista y una de las voces intelectuales más influyentes de Bolivia. Su obra recorrió la literatura, la política y la reflexión sobre la identidad nacional. En esta primera escena comenzamos un viaje por sus ideas y por la huella que dejaron en la historia del país.'
    },
    {
      title: 'El Pensamiento y la Educación',
      period: '1910',
      narration: 'En 1910, Franz Tamayo publicó Creación de la pedagogía nacional. En esta obra reflexionó sobre la educación boliviana y sostuvo que debía pensarse desde la realidad, la historia y las características propias del país. Su propuesta abrió un debate sobre cómo formar a las nuevas generaciones y sobre el papel de la educación en la construcción de Bolivia. Más de un siglo después, esa pregunta sigue vigente: ¿cómo educar para comprender y transformar nuestra sociedad?'
    },
    {
      title: 'El Nacimiento de UNIFRANZ',
      period: '1990 — 1993',
      narration: 'El 4 de noviembre de 1990, Abel Ágreda y Celsa Nogales de Ágreda fundaron la Universidad Privada Franz Tamayo, UNIFRANZ. Su nombre rinde homenaje al pensador boliviano y establece un diálogo entre su legado y el compromiso con la educación superior. Entre 1990 y 1993, la institución comenzó a consolidar su proyecto universitario, abriendo nuevas posibilidades de formación para el país.'
    },
    {
      title: 'Una Universidad en Crecimiento',
      period: 'PRESENCIA NACIONAL',
      narration: 'Con el paso del tiempo, UNIFRANZ amplió su presencia en Bolivia. Hoy cuenta con sedes en La Paz, El Alto, Cochabamba y Santa Cruz. En cada ciudad, estudiantes y docentes forman parte de una comunidad universitaria que conecta distintas realidades y contribuye al desarrollo de sus regiones. Esta expansión expresa una apuesta por acercar la educación superior a más personas y territorios.'
    },
    {
      title: 'El Legado Continúa',
      period: 'HOY Y MAÑANA',
      narration: 'El legado de Franz Tamayo continúa cada vez que una nueva generación cuestiona, aprende y propone caminos para Bolivia. La innovación y la investigación permiten convertir ideas en respuestas para los desafíos de la sociedad. Estudiantes: el futuro no está escrito; se construye con curiosidad, conocimiento y compromiso. La historia sigue viva en ustedes.'
    }
  ];
  window.HistoriaVivaScenes = scenes;

  /* -------------------------------------------------------------------------
     Interacción de la Cronología en la página principal
     ------------------------------------------------------------------------- */
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
        document.dispatchEvent(new CustomEvent('historia:select-scene', {
          detail: { index: Number(button.dataset.scene) }
        }));
      }
    });
  });

  /* -------------------------------------------------------------------------
     Controlador de la Experiencia VR (Realidad Virtual 360° / Cardboard)
     ------------------------------------------------------------------------- */
  const vrView = document.getElementById('vr-view');
  const vrSceneTemplate = document.getElementById('vr-scene-template');
  const vrLoading = document.getElementById('vr-loading');
  const vrCardboardBtn = document.getElementById('vr-btn-enter-cardboard');
  const vrAudioToggle = document.getElementById('vr-audio-toggle');
  const vrBtnPrev = document.getElementById('vr-btn-prev');
  const vrBtnNext = document.getElementById('vr-btn-next');
  const vrPills = document.querySelectorAll('.scene-pill');
  const vrDetailsToggle = document.getElementById('vr-details-toggle');
  const vrDetailsPanel = document.getElementById('vr-details-panel');
  const vrDetailsClose = document.getElementById('vr-details-close');

  let aSceneInstance = null;
  let loadingTimeout = null;
  let currentVRSceneIndex = 0;

  function mountVRScene() {
    if (aSceneInstance || !vrSceneTemplate || !vrView) return;
    aSceneInstance = vrSceneTemplate.content.firstElementChild.cloneNode(true);
    vrView.insertBefore(aSceneInstance, vrView.querySelector('.vr-hud'));

    aSceneInstance.addEventListener('loaded', function () {
      if (vrLoading) vrLoading.classList.add('is-hidden');
      if (loadingTimeout) window.clearTimeout(loadingTimeout);

      if (window.tamayoVR) {
        window.tamayoVR.setSceneIndex(currentVRSceneIndex, false);
      }

      // Conectar interactividad de los botones 3D con cursor de mirada (gaze manos libres)
      const btn3DAudio = aSceneInstance.querySelector('#vr-3d-audio-btn');
      if (btn3DAudio) {
        btn3DAudio.addEventListener('click', function () {
          if (window.tamayoVR) window.tamayoVR.toggleNarration();
        });
      }

      const btn3DPrev = aSceneInstance.querySelector('#vr-3d-prev-btn');
      if (btn3DPrev) {
        btn3DPrev.addEventListener('click', function () {
          if (window.tamayoVR) window.tamayoVR.prevScene();
        });
      }

      const btn3DNext = aSceneInstance.querySelector('#vr-3d-next-btn');
      if (btn3DNext) {
        btn3DNext.addEventListener('click', function () {
          if (window.tamayoVR) window.tamayoVR.nextScene();
        });
      }
    });
  }

  function openVR() {
    if (!vrView) return;
    if (window.tamayoVR) window.tamayoVR.stopNarration();

    vrView.classList.remove('is-error');
    vrView.setAttribute('aria-hidden', 'false');
    vrView.inert = false;
    document.body.style.overflow = 'hidden';

    if (vrLoading) vrLoading.classList.remove('is-hidden');
    mountVRScene();

    loadingTimeout = window.setTimeout(function () {
      if (vrLoading) vrLoading.classList.add('is-hidden');
    }, 6000);

    const closeBtn = vrView.querySelector('[data-close-vr]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    if (window.tamayoVR) {
      window.tamayoVR.setSceneIndex(currentVRSceneIndex, false);
    }
  }

  function closeVR() {
    if (!vrView) return;
    if (window.tamayoVR) window.tamayoVR.stopNarration();
    if (loadingTimeout) window.clearTimeout(loadingTimeout);

    vrView.setAttribute('aria-hidden', 'true');
    vrView.inert = true;
    document.body.style.overflow = '';

    if (aSceneInstance && aSceneInstance.is && aSceneInstance.is('vr-mode')) {
      aSceneInstance.exitVR();
    }

    if (aSceneInstance) {
      aSceneInstance.remove();
      aSceneInstance = null;
    }

    const openBtn = document.querySelector('[data-open-vr]');
    if (openBtn) openBtn.focus({ preventScroll: true });
  }

  // Event Listeners para abrir y cerrar el modal VR
  document.querySelectorAll('[data-open-vr]').forEach(function (button) {
    button.addEventListener('click', openVR);
  });

  document.querySelectorAll('[data-close-vr]').forEach(function (button) {
    button.addEventListener('click', closeVR);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && vrView && vrView.getAttribute('aria-hidden') === 'false') {
      closeVR();
    }
  });

  // Controles dentro del HUD VR
  if (vrCardboardBtn) {
    vrCardboardBtn.addEventListener('click', function () {
      if (window.tamayoVR) window.tamayoVR.enterCardboardVR();
    });
  }

  if (vrAudioToggle) {
    vrAudioToggle.addEventListener('click', function () {
      if (window.tamayoVR) window.tamayoVR.toggleNarration();
    });
  }

  if (vrBtnPrev) {
    vrBtnPrev.addEventListener('click', function () {
      if (window.tamayoVR) window.tamayoVR.prevScene();
    });
  }

  if (vrBtnNext) {
    vrBtnNext.addEventListener('click', function () {
      if (window.tamayoVR) window.tamayoVR.nextScene();
    });
  }

  vrPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      const idx = parseInt(pill.getAttribute('data-pill-index'), 10);
      if (window.tamayoVR) window.tamayoVR.setSceneIndex(idx);
    });
  });

  if (vrDetailsToggle && vrDetailsPanel) {
    vrDetailsToggle.addEventListener('click', function () {
      const isOpen = vrDetailsPanel.hidden;
      vrDetailsPanel.hidden = !isOpen;
      vrDetailsToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if (vrDetailsClose && vrDetailsPanel) {
    vrDetailsClose.addEventListener('click', function () {
      vrDetailsPanel.hidden = true;
      if (vrDetailsToggle) vrDetailsToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Sincronizar índice activo al cambiar de escena en VR
  document.addEventListener('tamayo-scene-changed', function (event) {
    if (event.detail && typeof event.detail.index === 'number') {
      currentVRSceneIndex = event.detail.index;
    }
  });

  // Auto-lanzar VR si la URL contiene ?vr=true o el hash #vr
  const urlParams = new URLSearchParams(window.location.search);
  const shouldAutoLaunchVR = urlParams.get('vr') === 'true' || 
                             window.location.hash === '#vr' || 
                             window.location.hash === '#experiencia-vr';

  if (shouldAutoLaunchVR) {
    window.setTimeout(function () {
      openVR();
    }, 450);
  }
})();
