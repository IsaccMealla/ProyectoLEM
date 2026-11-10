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
  const vrVoiceButtons = document.querySelectorAll('#vr-voice-toggle, #vr-btn-voice');

  let aSceneInstance = null;
  let loadingTimeout = null;
  let currentVRSceneIndex = 0;

  function mountVRScene() {
    if (aSceneInstance || !vrSceneTemplate || !vrView) return;
    aSceneInstance = vrSceneTemplate.content.firstElementChild.cloneNode(true);
    const sceneForLoad = aSceneInstance;
    const vrModel = sceneForLoad.querySelector('#vr-character-model');
    const modelHint = sceneForLoad.querySelector('#vr-model-error-label');
    let dracoRetryCount = 0;

    const configureAndRetryModel = function () {
      if (!vrModel) return;
      if (dracoRetryCount > 0) {
        if (modelHint) {
          modelHint.setAttribute('visible', 'true');
          modelHint.querySelector('a-text')?.setAttribute('value', 'NO SE PUDO CARGAR EL MODELO 3D');
        }
        console.error('[Historia Viva] No se pudo cargar el GLB incluso con Draco.');
        return;
      }
      if (!window.tamayoVR || !window.tamayoVR.configureDraco(sceneForLoad)) return;
      dracoRetryCount += 1;
      const modelSource = vrModel.getAttribute('gltf-model');
      if (modelHint) modelHint.setAttribute('visible', 'true');
      vrModel.removeAttribute('gltf-model');
      window.setTimeout(function () {
        vrModel.setAttribute('gltf-model', modelSource);
      }, 100);
    };

    if (vrModel) {
      vrModel.addEventListener('model-loaded', function () {
        if (modelHint) modelHint.setAttribute('visible', 'false');
        sceneForLoad.querySelector('#vr-tamayo-figure')?.setAttribute('visible', 'true');
        const loadedModel = vrModel.getObject3D('mesh');
        if (loadedModel) {
          loadedModel.traverse(function (node) {
            if (!node.isMesh) return;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(function (material) {
              if (!material) return;
              if (!material.emissive) material.emissive = new THREE.Color('#262626');
              else material.emissive.set('#262626');
              material.emissiveIntensity = 0.32;
              material.needsUpdate = true;
            });
          });
        }
        console.info('[Historia Viva] Modelo 3D VR cargado');
      });
      vrModel.addEventListener('model-error', configureAndRetryModel);
    }

    vrView.insertBefore(aSceneInstance, vrView.querySelector('.vr-hud'));

    aSceneInstance.addEventListener('loaded', function () {
      if (vrLoading) vrLoading.classList.add('is-hidden');
      if (loadingTimeout) window.clearTimeout(loadingTimeout);

      if (vrModel && !vrModel.getObject3D('mesh')) {
        configureAndRetryModel();
      }

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

      const btn3DExit = aSceneInstance.querySelector('#vr-3d-exit-btn');
      if (btn3DExit) {
        btn3DExit.addEventListener('click', closeVR);
      }

      // Conectar botón 3D de comando de voz con cursor de mirada (gaze hands-free para Cardboard/gafas)
      const btn3DVoice = aSceneInstance.querySelector('#vr-3d-voice-btn');
      if (btn3DVoice) {
        btn3DVoice.addEventListener('click', function () {
          if (window.historiaVoz && window.historiaVoz.listenOnce) {
            window.historiaVoz.listenOnce();
          }
        });
      }

      // Permitir también clic / toque directo con mouse o pantalla táctil sobre las 5 estaciones 3D y fotos históricas en VR
      const vrCanvas = aSceneInstance.querySelector('.a-canvas');
      if (vrCanvas) {
        let downX = 0;
        let downY = 0;
        vrCanvas.addEventListener('pointerdown', function (ev) {
          downX = ev.clientX;
          downY = ev.clientY;
        });
        vrCanvas.addEventListener('click', function (ev) {
          if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 14) return; // Fue arrastre de cámara
          const dioramaEl = aSceneInstance && aSceneInstance.querySelector('#vr-interactive-diorama');
          const dioramaComp = dioramaEl && dioramaEl.components && dioramaEl.components['scene-diorama'];
          const camEl = aSceneInstance && aSceneInstance.querySelector('#vr-camera');
          const cam = camEl && camEl.getObject3D('camera');
          if (!dioramaComp || !dioramaComp.group || !cam || !window.THREE) return;

          const rect = vrCanvas.getBoundingClientRect();
          const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          const my = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2(mx, my), cam);
          const hits = ray.intersectObjects(dioramaComp.group.children, true);
          for (let i = 0; i < hits.length; i++) {
            let obj = hits[i].object;
            while (obj) {
              if (typeof obj.userData?.sceneIndex === 'number') {
                const idx = obj.userData.sceneIndex;
                if (window.HistoriaFX && window.HistoriaFX.beep) window.HistoriaFX.beep('ok');
                if (window.tamayoVR) window.tamayoVR.setSceneIndex(idx, true);
                return;
              }
              obj = obj.parent;
            }
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
