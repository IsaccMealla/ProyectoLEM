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
      visual: 'Franz Tamayo se presenta con vestimenta de época e invita al espectador a viajar en el tiempo para descubrir una historia que une pensamiento, educación y futuro.',
      audio: 'assets/audio/escena1.mp3',
      narration: '¡Saludos! Soy Franz Tamayo, poeta, escritor y pensador boliviano. Quizás se pregunten por qué mi nombre forma parte de una universidad. Hoy quiero invitarlos a viajar en el tiempo para descubrir una historia que une el pensamiento, la educación y el futuro de Bolivia. ¿Me acompañan?'
    },
    {
      title: 'El Pensamiento y la Educación',
      period: '1910',
      visual: 'Aparecen libros antiguos, manuscritos y una representación de La Paz de principios del siglo XX.',
      audio: 'assets/audio/escena2.mp3',
      narration: 'A lo largo de mi vida, reflexioné sobre la importancia de la educación para el desarrollo de nuestro país. En 1910 publiqué Creación de la pedagogía nacional, una obra en la que planteé reflexiones sobre cómo debía pensarse la educación boliviana. Décadas después, mi nombre sería elegido para representar una institución comprometida con la formación de nuevas generaciones.'
    },
    {
      title: 'El Nacimiento de UNIFRANZ',
      period: '1990 — 1993',
      visual: 'Las páginas del libro se transforman en una línea de tiempo. Aparece el año 1990 y luego imágenes históricas de La Paz y los primeros espacios universitarios.',
      audio: 'assets/audio/escena3.mp3',
      narration: 'Viajemos ahora al año 1990. El 4 de noviembre de ese año se fundó la Universidad Privada Franz Tamayo, conocida como UNIFRANZ, gracias a la iniciativa de Abel Ágreda y Celsa Nogales de Ágreda. En 1993, después de obtener las autorizaciones legales correspondientes, la universidad comenzó a hacer realidad su proyecto educativo en la ciudad de La Paz. Sus primeros espacios eran modestos, pero detrás de ellos existía una gran visión: abrir nuevas oportunidades de formación profesional.'
    },
    {
      title: 'Una Universidad en Crecimiento',
      period: 'EXPANSIÓN NACIONAL',
      visual: 'Las primeras aulas se transforman en espacios universitarios modernos. Aparecen estudiantes, libros, computadoras y un mapa de Bolivia donde se iluminan La Paz, El Alto, Cochabamba y Santa Cruz.',
      audio: 'assets/audio/escena4.mp3',
      narration: 'Con el paso de los años, UNIFRANZ fue creciendo y extendiendo su presencia a otras ciudades de Bolivia. La universidad evolucionó junto con las nuevas necesidades de la sociedad, incorporando propuestas de innovación, investigación y aprendizaje práctico. Así, lo que comenzó como un proyecto educativo en La Paz se convirtió en una institución con presencia en distintas regiones del país.'
    },
    {
      title: 'El Legado Continúa',
      period: 'EL FUTURO ES HOY',
      visual: 'Franz Tamayo aparece en un campus actual rodeado de estudiantes de diferentes carreras. Mira directamente al espectador y el logotipo de UNIFRANZ aparece al fondo.',
      audio: 'assets/audio/escena5.mp3',
      narration: 'Y hoy, jóvenes universitarios, ustedes son parte de esta historia. Cada idea que desarrollan, cada conocimiento que adquieren y cada desafío que superan contribuye a construir el futuro de nuestra sociedad. Mi nombre representa un legado intelectual, pero son ustedes quienes pueden darle un nuevo significado a través de sus acciones. La historia de UNIFRANZ continúa escribiéndose con cada generación de estudiantes. Bienvenidos a UNIFRANZ, Universidad Privada Franz Tamayo. ¡El futuro está en sus manos!'
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
