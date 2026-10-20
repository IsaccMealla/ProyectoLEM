/**
 * UNIFRANZ · Realidad Virtual Inmersiva: El Legado de Franz Tamayo
 * Controlador de las 5 escenas históricas en 3D y modo Gafas VR (Stereo Cardboard)
 */

window.TAMAYO_VR_SCENES = [
  {
    id: 1,
    number: "01",
    title: "El despertar de Franz Tamayo",
    year: "1879 — 1956",
    phase: "EL DESPERTAR",
    visual: "Franz Tamayo se presenta con vestimenta de época. Invita al espectador a viajar en el tiempo para descubrir una historia que une pensamiento, educación y futuro.",
    dialog: "¡Saludos! Soy Franz Tamayo, poeta, escritor y pensador boliviano. Quizás se pregunten por qué mi nombre forma parte de una universidad. Hoy quiero invitarlos a viajar en el tiempo para descubrir una historia que une el pensamiento, la educación y el futuro de Bolivia. ¿Me acompañan?",
    themeColor: "#d5aa46",
    skyColor: "#0f1118",
    fogColor: "#141722"
  },
  {
    id: 2,
    number: "02",
    title: "El pensamiento y la educación",
    year: "1910",
    phase: "LA PEDAGOGÍA",
    visual: "Aparecen libros antiguos, manuscritos y una representación artística de La Paz de principios del siglo XX.",
    dialog: "A lo largo de mi vida, reflexioné sobre la importancia de la educación para el desarrollo de nuestro país. En 1910 publiqué Creación de la pedagogía nacional, una obra en la que planteé reflexiones sobre cómo debía pensarse la educación boliviana. Décadas después, mi nombre sería elegido para representar una institución comprometida con la formación de nuevas generaciones.",
    themeColor: "#e67e22",
    skyColor: "#17120f",
    fogColor: "#211a14"
  },
  {
    id: 3,
    number: "03",
    title: "El nacimiento de UNIFRANZ",
    year: "1990 — 1993",
    phase: "LA FUNDACIÓN",
    visual: "Las páginas del libro se transforman en una línea de tiempo. Aparece el año 1990 y luego imágenes históricas de La Paz y los primeros espacios universitarios.",
    dialog: "Viajemos ahora al año 1990. El 4 de noviembre de ese año se fundó la Universidad Privada Franz Tamayo, conocida como UNIFRANZ, gracias a la iniciativa de Abel Ágreda y Celsa Nogales de Ágreda. En 1993, después de obtener las autorizaciones legales correspondientes, la universidad comenzó a hacer realidad su proyecto educativo en la ciudad de La Paz. Sus primeros espacios eran modestos, pero detrás de ellos existía una gran visión: abrir nuevas oportunidades de formación profesional.",
    themeColor: "#c0392b",
    skyColor: "#1a1012",
    fogColor: "#241417"
  },
  {
    id: 4,
    number: "04",
    title: "Una universidad en crecimiento",
    year: "EXPANSIÓN NACIONAL",
    phase: "CRECIMIENTO",
    visual: "Las primeras aulas se transforman en espacios universitarios modernos. Aparecen estudiantes, libros, computadoras y un mapa de Bolivia donde se iluminan La Paz, El Alto, Cochabamba y Santa Cruz.",
    dialog: "Con el paso de los años, UNIFRANZ fue creciendo y extendiendo su presencia a otras ciudades de Bolivia. La universidad evolucionó junto con las nuevas necesidades de la sociedad, incorporando propuestas de innovación, investigación y aprendizaje práctico. Así, lo que comenzó como un proyecto educativo en La Paz se convirtió en una institución con presencia en distintas regiones del país.",
    themeColor: "#2980b9",
    skyColor: "#0d1620",
    fogColor: "#131f2d"
  },
  {
    id: 5,
    number: "05",
    title: "El legado continúa",
    year: "EL FUTURO ES HOY",
    phase: "EL LEGADO",
    visual: "Franz Tamayo aparece en un campus actual rodeado de estudiantes de diferentes carreras. Mira directamente al espectador y el logotipo de UNIFRANZ aparece al fondo.",
    dialog: "Y hoy, jóvenes universitarios, ustedes son parte de esta historia. Cada idea que desarrollan, cada conocimiento que adquieren y cada desafío que superan contribuye a construir el futuro de nuestra sociedad. Mi nombre representa un legado intelectual, pero son ustedes quienes pueden darle un nuevo significado a través de sus acciones. La historia de UNIFRANZ continúa escribiéndose con cada generación de estudiantes. Bienvenidos a UNIFRANZ, Universidad Privada Franz Tamayo. ¡El futuro está en sus manos!",
    themeColor: "#27ae60",
    skyColor: "#0d1b14",
    fogColor: "#12251b"
  }
];

class TamayoVRExperience {
  constructor() {
    this.currentIndex = 0;
    this.speechActive = false;
    this.currentUtterance = null;
    this.sceneReady = false;
  }

  getCurrentScene() {
    return window.TAMAYO_VR_SCENES[this.currentIndex];
  }

  setSceneIndex(index, updateAudio = true) {
    if (index < 0 || index >= window.TAMAYO_VR_SCENES.length) return;
    this.currentIndex = index;
    const scene = this.getCurrentScene();

    // Actualizar elementos en el HUD 2D
    this.updateHUD(scene);

    // Actualizar elementos dentro del entorno 3D de A-Frame
    this.update3DScene(scene);

    // Si se solicitó actualización de audio y estaba narrando, reiniciar con la nueva escena
    if (updateAudio && this.speechActive) {
      this.playNarration();
    }

    // Disparar evento personalizado
    document.dispatchEvent(new CustomEvent('tamayo-scene-changed', {
      detail: { scene, index: this.currentIndex }
    }));
  }

  nextScene() {
    const nextIndex = (this.currentIndex + 1) % window.TAMAYO_VR_SCENES.length;
    this.setSceneIndex(nextIndex);
  }

  prevScene() {
    const prevIndex = (this.currentIndex - 1 + window.TAMAYO_VR_SCENES.length) % window.TAMAYO_VR_SCENES.length;
    this.setSceneIndex(prevIndex);
  }

  updateHUD(scene) {
    const badge = document.getElementById('vr-scene-badge');
    const title = document.getElementById('vr-scene-title');
    const phase = document.getElementById('vr-scene-phase');
    const dialogPreview = document.getElementById('vr-dialog-text');
    const visualText = document.getElementById('vr-visual-desc');
    const pills = document.querySelectorAll('.scene-pill');

    if (badge) badge.textContent = `ESCENA ${scene.number} / 05 · ${scene.year}`;
    if (title) title.innerHTML = `${scene.title}`;
    if (phase) phase.textContent = scene.phase;
    if (dialogPreview) dialogPreview.textContent = `"${scene.dialog}"`;
    if (visualText) visualText.textContent = scene.visual;

    pills.forEach((pill, idx) => {
      const isActive = idx === this.currentIndex;
      pill.classList.toggle('is-active', isActive);
      pill.setAttribute('aria-selected', String(isActive));
    });
  }

  update3DScene(scene) {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;

    // Actualizar cielo y niebla ambiental
    const sky = aScene.querySelector('a-sky');
    if (sky) sky.setAttribute('color', scene.skyColor);

    if (aScene.hasAttribute('fog')) {
      aScene.setAttribute('fog', `type: exponential; color: ${scene.fogColor}; density: 0.04`);
    }

    // Actualizar panel 3D flotante visible en VR (con gafas)
    const vrTitle3D = aScene.querySelector('#vr-3d-scene-title');
    const vrDialog3D = aScene.querySelector('#vr-3d-scene-dialog');
    const vrPhase3D = aScene.querySelector('#vr-3d-scene-phase');
    const vrPedestalRing = aScene.querySelector('#vr-pedestal-glow');

    if (vrTitle3D) {
      vrTitle3D.setAttribute('value', `ESCENA ${scene.number}: ${scene.title.toUpperCase()}`);
    }
    if (vrPhase3D) {
      vrPhase3D.setAttribute('value', `[ ${scene.phase} · ${scene.year} ]`);
      vrPhase3D.setAttribute('color', scene.themeColor);
    }
    if (vrDialog3D) {
      // Ajustar texto para que no sea excesivamente denso en el plano 3D
      vrDialog3D.setAttribute('value', `"${scene.dialog}"`);
    }
    if (vrPedestalRing) {
      vrPedestalRing.setAttribute('material', `color: ${scene.themeColor}; emissive: ${scene.themeColor}; emissiveIntensity: 0.7`);
    }

    // Alternar los elementos visuales específicos de cada escena 3D en el entorno
    for (let i = 1; i <= 5; i++) {
      const visualEntity = aScene.querySelector(`#vr-visuals-scene-${i}`);
      if (visualEntity) {
        visualEntity.setAttribute('visible', String(i === scene.id));
      }
    }
  }

  playNarration() {
    this.stopNarration();
    const scene = this.getCurrentScene();
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta síntesis de voz.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(scene.dialog);
    // Intentar buscar voz en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('ES') || v.lang.includes('BO') || v.lang.includes('MX'));
    if (esVoice) utterance.voice = esVoice;
    utterance.lang = 'es-BO';
    utterance.rate = 0.92;
    utterance.pitch = 0.95; // Tono solemne y reflexivo para Franz Tamayo

    utterance.onstart = () => {
      this.speechActive = true;
      this.notifyAudioState(true);
    };

    utterance.onend = () => {
      this.speechActive = false;
      this.notifyAudioState(false);
    };

    utterance.onerror = () => {
      this.speechActive = false;
      this.notifyAudioState(false);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stopNarration() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speechActive = false;
    this.notifyAudioState(false);
  }

  toggleNarration() {
    if (this.speechActive) {
      this.stopNarration();
    } else {
      this.playNarration();
    }
  }

  notifyAudioState(isPlaying) {
    const btn = document.getElementById('vr-audio-toggle');
    const label = document.getElementById('vr-audio-label');
    const icon = document.getElementById('vr-audio-icon');
    if (btn) btn.setAttribute('aria-pressed', String(isPlaying));
    if (label) label.textContent = isPlaying ? 'Pausar a Franz Tamayo' : 'Escuchar a Franz Tamayo';
    if (icon) icon.textContent = isPlaying ? '⏸' : '▶';

    // Botón 3D dentro del visor VR
    const btn3D = document.querySelector('#vr-3d-audio-btn-text');
    if (btn3D) {
      btn3D.setAttribute('value', isPlaying ? 'PAUSAR VOZ' : 'NARRAR ESCENA');
    }
  }

  enterCardboardVR() {
    const aScene = document.querySelector('#vr-scene') || document.querySelector('.vr-view a-scene') || document.querySelector('a-scene');
    if (!aScene) return;

    // En iOS 13+ se debe solicitar permiso para DeviceOrientationEvent
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            aScene.enterVR();
          } else {
            aScene.enterVR();
          }
        })
        .catch(() => {
          aScene.enterVR();
        });
    } else {
      aScene.enterVR();
    }
  }
}

window.tamayoVR = new TamayoVRExperience();
