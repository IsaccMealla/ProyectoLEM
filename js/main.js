(function () {
  /**
   * 5 Etapas oficiales de "Bienvenida Histórica Unifranz La Paz"
   * Modelo único: assets/models/FranzTamayoReal.glb
   * Audio único: assets/audio/DIscursoPrincipal.mp3
   */
  const scenes = [
    {
      title: 'La Fachada e Historia',
      period: '1879 — 1993',
      visual: 'Fachada en esquina achaflanada de UNIFRANZ La Paz con 10 banderas y retrato histórico «1879 — 1993».',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      audioTrack: 'EP1_FranzTamayo_Bienvenida.mp3',
      nominalStart: 0,
      nominalEnd: 30,
      narration: 'Bienvenidos a mi casa del saber... Soy Franz Tamayo. En 1993 mi nombre dio vida a Unifranz aquí en La Paz para transformar la educación superior de Bolivia.'
    },
    {
      title: 'Modelo Aprender Haciendo',
      period: 'DESDE EL 1ER SEMESTRE',
      visual: 'Tres nodos holográficos giratorios y paneles de cristal alrededor del pórtico.',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      audioTrack: 'EP2_FranzTamayo_ModeloEducativo.mp3',
      nominalStart: 30,
      nominalEnd: 60,
      narration: 'En Unifranz rompimos las aulas tradicionales para instaurar un modelo centrado en el estudiante: aprender haciendo desde el primer semestre.'
    },
    {
      title: 'Ingeniería de Sistemas, IA y Robótica',
      period: 'TECNOLOGÍA E IA',
      visual: 'Holograma wireframe azul y naranja de un dron submarino (ROV) y una red neuronal 3D con enlaces pulsantes.',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      audioTrack: 'EP3_FranzTamayo_Tecnologia.mp3',
      nominalStart: 60,
      nominalEnd: 95,
      narration: 'En Ingeniería de Sistemas e Inteligencia Artificial, nuestros estudiantes crean visión artificial, robótica subacuática autónoma y entornos de realidad virtual.'
    },
    {
      title: 'Ciencias de la Salud y Simulación',
      period: 'SALUD Y CLÍNICA',
      visual: 'Estructura médica y odontológica interactiva en 3D con partículas verdes y blancas de precisión clínica.',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      audioTrack: 'EP4_FranzTamayo_Salud.mp3',
      nominalStart: 95,
      nominalEnd: 125,
      narration: 'En Ciencias de la Salud y nuestra Clínica Odontológica, combinamos simulación de alta fidelidad con gestión digital avanzada al servicio de La Paz.'
    },
    {
      title: 'Cierre y Apertura de Puertas',
      period: 'EL FUTURO SE CONSTRUYE',
      visual: 'Franz Tamayo ejecuta la invitación lateral, las puertas de vidrio de UNIFRANZ se abren y la cámara avanza al vestíbulo luminoso.',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      audioTrack: 'EP5_FranzTamayo_Cierre.mp3',
      nominalStart: 125,
      nominalEnd: 155,
      narration: 'El futuro no se espera: se construye. Bienvenidos a la innovación, bienvenidos a Unifranz.'
    }
  ];
  window.HistoriaVivaScenes = scenes;
  window.HistoriaVivaStories = {
    franz: {
      title: 'Bienvenida Histórica Unifranz La Paz',
      model: 'assets/models/FranzTamayoReal.glb',
      audio: 'assets/audio/DIscursoPrincipal.mp3',
      scenes
    }
  };

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
  const vrVoiceButtons = document.querySelectorAll('#vr-voice-toggle, #vr-btn-voice');

  let aSceneInstance = null;
  let loadingTimeout = null;
  let currentVRSceneIndex = 0;

  function mountVRScene() {
    if (aSceneInstance || !vrSceneTemplate || !vrView) return;
    aSceneInstance = vrSceneTemplate.content.firstElementChild.cloneNode(true);
    const sceneForLoad = aSceneInstance;

    const onAvatarReady = function () {
      if (vrLoading) vrLoading.classList.add('is-hidden');
      if (loadingTimeout) window.clearTimeout(loadingTimeout);
    };
    window.addEventListener('unifranz:avatar-loaded', onAvatarReady, { once: true });

    vrView.insertBefore(aSceneInstance, vrView.querySelector('.vr-hud'));

    aSceneInstance.addEventListener('loaded', function () {
      if (vrLoading) vrLoading.classList.add('is-hidden');
      if (loadingTimeout) window.clearTimeout(loadingTimeout);

      if (window.tamayoVR) {
        window.tamayoVR.configureDraco(sceneForLoad);
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

      const btn3DExit = aSceneInstance.querySelector('#vr-3d-exit-btn');
      if (btn3DExit) {
        btn3DExit.addEventListener('click', closeVR);
      }

      const btn3DVoice = aSceneInstance.querySelector('#vr-3d-voice-btn');
      if (btn3DVoice) {
        btn3DVoice.addEventListener('click', function () {
          if (window.historiaVoz && window.historiaVoz.listenOnce) {
            window.historiaVoz.listenOnce();
          }
        });
      }

      // Conectar clic / toque directo sobre el botón flotante 3D "Siguiente Etapa" de Unifranz
      const vrCanvas = aSceneInstance.querySelector('.a-canvas');
      if (vrCanvas) {
        let downX = 0;
        let downY = 0;
        vrCanvas.addEventListener('pointerdown', function (ev) {
          downX = ev.clientX;
          downY = ev.clientY;
        });
        vrCanvas.addEventListener('click', function (ev) {
          if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 14) return;
          const manager = window.UnifranzActiveManager;
          if (!manager) return;
          const rect = vrCanvas.getBoundingClientRect();
          const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          const my = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          if (manager.handlePointerClick(mx, my)) {
            if (window.HistoriaFX && window.HistoriaFX.beep) window.HistoriaFX.beep('ok');
          }
        });
      }

      aSceneInstance.addEventListener('enter-vr', function () {
        vrView.classList.remove('is-gyro-view');
        if (vrCardboardBtn) vrCardboardBtn.textContent = '🥽 Vista VR activa';
      });
      aSceneInstance.addEventListener('exit-vr', function () {
        window.tamayoVR?.disableCardboardStereo(aSceneInstance);
        vrView.classList.remove('is-gyro-view');
        window.tamayoVR?.unbindGyroscope();
        if (vrCardboardBtn) vrCardboardBtn.textContent = '🥽 Modo Gafas VR';
      });
    });
  }

  function restoreMainPageScroll() {
    [document.documentElement, document.body].forEach(function (el) {
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

  function openVR() {
    if (!vrView) return;
    const arView = document.getElementById('ar-view');
    if (arView && arView.getAttribute('aria-hidden') === 'false') {
      if (typeof window.closeAR === 'function') window.closeAR();
    }
    if (window.tamayoVR) window.tamayoVR.stopNarration();
    if (window.tamayoVR) window.tamayoVR.unbindGyroscope();

    if (window.screen && window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
      window.screen.orientation.lock('landscape').catch(function () {});
    }

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
    if (window.tamayoVR && aSceneInstance) window.tamayoVR.disableCardboardStereo(aSceneInstance);
    if (loadingTimeout) window.clearTimeout(loadingTimeout);

    if (aSceneInstance && aSceneInstance.is && aSceneInstance.is('vr-mode')) {
      try { aSceneInstance.exitVR(); } catch (e) {}
    }

    if (aSceneInstance) {
      aSceneInstance.remove();
      aSceneInstance = null;
    }

    vrView.setAttribute('aria-hidden', 'true');
    vrView.inert = true;
    vrView.classList.remove('is-gyro-view');
    if (vrCardboardBtn) vrCardboardBtn.textContent = '🥽 Modo Gafas VR';

    restoreMainPageScroll();

    // Regresar al inicio de la página web
    requestAnimationFrame(function () {
      restoreMainPageScroll();
      const inicioEl = document.getElementById('inicio');
      if (inicioEl) {
        inicioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Hacer funciones accesibles globalmente
  window.closeVR = closeVR;
  window.openVR = openVR;

  // Event Listeners para abrir y cerrar el modal VR
  document.querySelectorAll('[data-open-vr]').forEach(function (button) {
    button.addEventListener('click', openVR);
  });

  document.querySelectorAll('[data-close-vr]').forEach(function (button) {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeVR();
    });
  });

  // Delegación global en document para asegurar que cualquier botón de cierre VR funcione siempre
  document.addEventListener('click', function (e) {
    const closeTarget = e.target.closest('[data-close-vr]');
    if (closeTarget) {
      e.preventDefault();
      closeVR();
    }
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

  function updateVoiceStatus(isListening, message) {
    const chip = document.getElementById('voice-assistant-chip');
    const text = document.getElementById('voice-assistant-text');
    const icon = document.getElementById('voice-assistant-icon');
    const buttons = document.querySelectorAll('#voice-assistant-toggle, #vr-voice-toggle, #vr-btn-voice, [data-voice-trigger]');

    // Sonido sintetizado de confirmación auditiva (vital en VR con gafas)
    if (window.HistoriaFX && window.HistoriaFX.beep) {
      window.HistoriaFX.beep(isListening ? 'listen' : 'success');
    }

    if (icon) {
      icon.textContent = isListening ? '🎧' : '🎙️';
    }
    if (text) {
      text.textContent = message || 'Comandos por voz';
    }
    if (chip) {
      chip.classList.toggle('is-listening', isListening);
    }
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(isListening));
      button.dataset.listening = isListening ? 'true' : 'false';
    });

    // Feedback holográfico 3D flotante dentro del visor VR
    const vrVoiceStatus = document.getElementById('vr-3d-voice-status');
    const vrVoiceStatusText = document.getElementById('vr-3d-voice-status-text');
    const vrVoiceBtnText = document.getElementById('vr-3d-voice-btn-text');
    if (vrVoiceStatus && vrVoiceStatusText) {
      if (isListening) {
        vrVoiceStatus.setAttribute('visible', 'true');
        vrVoiceStatusText.setAttribute('value', message ? message.toUpperCase() : '🎧 ESCUCHANDO TU VOZ...');
        vrVoiceStatusText.setAttribute('color', '#55efc4');
      } else if (message && message !== 'Comandos por voz') {
        vrVoiceStatus.setAttribute('visible', 'true');
        vrVoiceStatusText.setAttribute('value', message.toUpperCase());
        vrVoiceStatusText.setAttribute('color', '#ffd166');
        window.setTimeout(() => {
          if (vrVoiceStatus) vrVoiceStatus.setAttribute('visible', 'false');
        }, 3200);
      } else {
        vrVoiceStatus.setAttribute('visible', 'false');
      }
    }
    if (vrVoiceBtnText) {
      vrVoiceBtnText.setAttribute('value', isListening ? '🎧 ESCUCHANDO...' : '🎙️ COMANDO DE VOZ (MÍRAME)');
    }
  }

  function handleVoiceCommand(command) {
    const normalized = command.toLowerCase();
    const spanishNumbers = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
    const sceneNumberMatch = normalized.match(/(?:escena|número|numero)\s*(?:número\s*)?(1|2|3|4|5|uno|una|dos|tres|cuatro|cinco)/);
    const sceneByName = [
      /despertar|poeta/,
      /pedagogía|pedagogia|educación|educacion|mil diez|1910/,
      /fundación|fundacion|nacimiento|1990|1993/,
      /crecimiento|ciudades|expansión|expansion/,
      /legado|futuro|estudiantes/
    ];
    let sceneIndex = null;

    if (sceneNumberMatch) {
      const spokenNumber = sceneNumberMatch[1];
      sceneIndex = Number.isNaN(Number(spokenNumber)) ? spanishNumbers[spokenNumber] - 1 : Number(spokenNumber) - 1;
    } else {
      sceneIndex = sceneByName.findIndex(function (pattern) { return pattern.test(normalized); });
      if (sceneIndex < 0) sceneIndex = null;
    }

    if (sceneIndex !== null) {
      if (window.tamayoVR) window.tamayoVR.setSceneIndex(sceneIndex);
      document.dispatchEvent(new CustomEvent('historia:voice-command', {
        detail: { action: 'scene', index: sceneIndex, command: normalized }
      }));
      return;
    }

    // Comandos de Máquina del Tiempo
    if (/viajar en el tiempo|viaje en el tiempo|máquina del tiempo|maquina del tiempo|salto temporal|salto en el tiempo/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.nextScene();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'next', command: normalized } }));
      return;
    }

    if (/futuro|adelante en el tiempo|avanzar en el tiempo/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.nextScene();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'next', command: normalized } }));
      return;
    }

    if (/pasado|atrás en el tiempo|retroceder en el tiempo/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.prevScene();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'previous', command: normalized } }));
      return;
    }

    if (/siguiente|next|adelante|continua|continúa|sigue/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.nextScene();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'next', command: normalized } }));
      return;
    }

    if (/anterior|atrás|volver|regresar/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.prevScene();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'previous', command: normalized } }));
      return;
    }

    if (/repetir|repite/.test(normalized)) {
      const vrIsOpen = vrView && vrView.getAttribute('aria-hidden') === 'false';
      if (vrIsOpen && window.tamayoVR) window.tamayoVR.playNarration();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'repeat', command: normalized } }));
      return;
    }

    if (/narración|narracion|habla|escucha|audio|reproducir/.test(normalized)) {
      const vrIsOpen = vrView && vrView.getAttribute('aria-hidden') === 'false';
      if (vrIsOpen && window.tamayoVR) window.tamayoVR.toggleNarration();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'audio', command: normalized } }));
      return;
    }

    // Gestos expresivos de Franz Tamayo por voz
    if (/saluda|saludo|hola franz|hola tamayo|hola/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('wave');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'wave', command: normalized } }));
      return;
    }

    if (/piensa|pensar|reflexiona|filosofa|medita/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('think');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'think', command: normalized } }));
      return;
    }

    if (/asiente|asentir|acepta|correcto|bien/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('nod');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'nod', command: normalized } }));
      return;
    }

    if (/celebra|festeja|victoria|felicidades|éxito|exito/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('celebrate');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'celebrate', command: normalized } }));
      return;
    }

    if (/camina|caminar|muévete|muevete|avanza|acércate|acercate/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('walk');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'walk', command: normalized } }));
      return;
    }

    if (/señala|senalá|señalar|indica|mostrar pista/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.animateCharacterGesture('indicate');
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'indicate', command: normalized } }));
      return;
    }

    if (/pausa|silencio|detener|alto/.test(normalized)) {
      if (window.tamayoVR) window.tamayoVR.stopNarration();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'pause', command: normalized } }));
      return;
    }

    if (/guion|información|informacion|descripción|descripcion/.test(normalized)) {
      vrDetailsToggle?.click();
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'details', command: normalized } }));
      return;
    }

    if (/mesa/.test(normalized)) {
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'table', command: normalized } }));
      return;
    }
    if (/pantalla/.test(normalized)) {
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'screen', command: normalized } }));
      return;
    }
    if (/centrar|recentrar|reiniciar posición|reiniciar posicion/.test(normalized)) {
      document.dispatchEvent(new CustomEvent('historia:voice-command', { detail: { action: 'center', command: normalized } }));
      return;
    }

    // Comandos de voz para el Mapa y Geolocalización
    if (/dónde estamos|donde estamos|dónde estoy|donde estoy|ubicación|ubicacion|distancia|mapa/.test(normalized)) {
      const mapEl = document.getElementById('mapa');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
      if (window.HistoriaGeo) {
        const dist = window.HistoriaGeo.getDistance();
        const inR = window.HistoriaGeo.isInRange();
        const msg = inR
          ? `Estás a ${dist}m, dentro del rango histórico. ¡La animación está activa!`
          : `Estás a ${dist}m del punto histórico. Acércate o di "simular rango".`;
        updateVoiceStatus(false, msg);
      }
      return;
    }

    if (/simular rango|desbloquear animación|desbloquear animacion|simular gps/.test(normalized)) {
      if (window.HistoriaGeo && window.HistoriaGeo.simulateInRange) {
        window.HistoriaGeo.simulateInRange();
        updateVoiceStatus(false, 'Rango simulado: Animación desbloqueada');
      }
      return;
    }

    if (/gps|activar gps|mi gps/.test(normalized)) {
      if (window.HistoriaGeo && window.HistoriaGeo.toggleGPSTracking) {
        window.HistoriaGeo.toggleGPSTracking();
        updateVoiceStatus(false, 'GPS alternado');
      }
      return;
    }

    if (/realidad aumentada|\bar\b|modo ar|cámara|marcador/.test(normalized)) {
      document.querySelector('[data-open-ar]')?.click();
      return;
    }

    if (/realidad virtual|vr|gafas|visor|inmersivo/.test(normalized)) {
      const vrIsOpen = vrView && vrView.getAttribute('aria-hidden') === 'false';
      if (!vrIsOpen) document.querySelector('[data-open-vr]')?.click();
      if (/gafas|visor|inmersivo/.test(normalized)) {
        window.setTimeout(function () { window.tamayoVR?.enterCardboardVR(); }, vrIsOpen ? 0 : 700);
      }
      return;
    }

    if (/cerrar|salir|close/.test(normalized)) {
      const vrIsOpen = document.getElementById('vr-view') && document.getElementById('vr-view').getAttribute('aria-hidden') === 'false';
      const arIsOpen = document.getElementById('ar-view') && document.getElementById('ar-view').getAttribute('aria-hidden') === 'false';
      if (vrIsOpen) {
        document.querySelector('[data-close-vr]')?.click();
      } else if (arIsOpen) {
        document.querySelector('[data-close-ar]')?.click();
      }
    }
  }

  function setupVoiceAssistant() {
    const voiceButton = document.getElementById('voice-assistant-toggle');
    const allVoiceButtons = document.querySelectorAll('#voice-assistant-toggle, [data-voice-trigger], #vr-voice-toggle, #vr-btn-voice');
    const VoiceRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!voiceButton || !VoiceRecognition) {
      allVoiceButtons.forEach(function (button) {
        button.disabled = true;
        button.title = 'Tu navegador no soporta comandos por voz';
      });
      return;
    }

    const recognition = new VoiceRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function () {
      updateVoiceStatus(true, 'Escuchando…');
    };

    recognition.onresult = function (event) {
      const transcript = Array.from(event.results)
        .map(function (result) {
          return result[0].transcript;
        })
        .join(' ')
        .trim();

      if (!transcript) return;
      updateVoiceStatus(true, 'Comando: ' + transcript);
      handleVoiceCommand(transcript);
      if (/narración|narracion|escucha|reproducir|repetir|habla/.test(transcript.toLowerCase())) {
        window.tamayoVR?.animateCharacterGesture('speak');
      }
    };

    recognition.onerror = function () {
      updateVoiceStatus(false, 'Comandos por voz');
    };

    recognition.onend = function () {
      updateVoiceStatus(false, 'Comandos por voz');
      allVoiceButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', 'false');
        button.dataset.listening = 'false';
      });
    };

    const toggleRecognition = function () {
      if (voiceButton.dataset.listening === 'true') {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        updateVoiceStatus(false, 'Comandos por voz');
      }
    };

    allVoiceButtons.forEach(function (button) {
      button.addEventListener('click', toggleRecognition);
    });
    window.historiaVoz = { listenOnce: toggleRecognition };
  }

  setupVoiceAssistant();

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
