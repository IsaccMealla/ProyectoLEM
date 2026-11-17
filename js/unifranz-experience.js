/**
 * Experiencia AR/VR: "Bienvenida Histórica Unifranz La Paz"
 * Arquitectura modular con Three.js, GLTFLoader, AnimationMixer, PositionalAudio y WebXRButton
 * -------------------------------------------------------------------------------------------
 * - Reconstrucción 3D procedural de la esquina achaflanada de UNIFRANZ La Paz (6 pisos, pórtico,
 *   marquesina curva "Universidad Franz Tamayo", logotipos "UNIFRANZ", puertas de vidrio corredizas
 *   con transmisión física y 10 banderas internacionales animadas con ShaderMaterial).
 * - Avatar Franz Tamayo (assets/models/FranzTamayoReal.glb) con AnimationMixer (saludar_01, acuerdo,
 *   hablar, invitar) y THREE.PositionalAudio sincronizado con assets/audio/DIscursoPrincipal.mp3.
 * - ExperienceManager secuencial de 5 etapas con subtítulos 3D, botón flotante 3D "Siguiente Etapa"
 *   y hologramas/efectos 3D dedicados para cada etapa.
 * - Iluminación realista de cielo paceño (HemisphereLight + DirectionalLight con sombras activadas).
 */
(function () {
  'use strict';

  const MAIN_AUDIO_SRC = 'assets/audio/DIscursoPrincipal.mp3';
  const MAIN_MODEL_SRC = 'assets/models/FranzTamayoReal.glb';
  const DEFAULT_REF_DURATION = 155; // Tramos nominales: 0-30, 30-60, 60-95, 95-125, 125-155

  const UNIFRANZ_STAGES = [
    {
      id: 1,
      number: '01',
      title: 'La Fachada e Historia',
      period: '1879 — 1993',
      phase: 'LA FACHADA E HISTORIA',
      audioTrack: 'EP1_FranzTamayo_Bienvenida.mp3',
      audioSrc: MAIN_AUDIO_SRC,
      nominalStart: 0,
      nominalEnd: 30,
      initialAnim: 'saludar_01',
      initialAnimDuration: 4.0,
      loopAnim: 'hablar',
      arInitialAnim: 'saludar_01',
      arCues: [
        { at: 0.8, clip: 'caminar' },
        { at: 5.5, clip: 'presentarse' },
        { at: 10, clip: 'mano_al_pecho' },
        { at: 14.2, clip: 'dialogo_ambas_manos' },
        { at: 18, clip: 'enfatizar' },
        { at: 22, clip: 'senalar', lookYaw: 0.12 },
        { at: 27, clip: 'brazos_abiertos' }
      ],
      themeColor: '#d5aa46',
      skyColor: '#8ecae6',
      fogColor: '#cfe8f3',
      subtitle: 'Bienvenidos a mi casa del saber... Soy Franz Tamayo. En 1993 mi nombre dio vida a Unifranz aquí en La Paz para transformar la educación superior de Bolivia.'
    },
    {
      id: 2,
      number: '02',
      title: 'Modelo Aprender Haciendo',
      period: 'DESDE EL 1ER SEMESTRE',
      phase: 'APRENDER HACIENDO',
      audioTrack: 'EP2_FranzTamayo_ModeloEducativo.mp3',
      audioSrc: MAIN_AUDIO_SRC,
      nominalStart: 30,
      nominalEnd: 60,
      initialAnim: 'acuerdo',
      initialAnimDuration: 3.0,
      loopAnim: 'hablar',
      arInitialAnim: 'explicar',
      arCues: [
        { at: 1, clip: 'paso_confiado' },
        { at: 4, clip: 'brazos_abiertos' },
        { at: 9, clip: 'senalar', lookYaw: 0.12 },
        { at: 14, clip: 'explicar' },
        { at: 20, clip: 'mano_al_pecho' },
        { at: 25, clip: 'acuerdo' },
        { at: 29.5, clip: 'cambio_peso' }
      ],
      themeColor: '#f59e0b',
      skyColor: '#7ebce0',
      fogColor: '#c7e2f0',
      subtitle: 'En Unifranz rompimos las aulas tradicionales para instaurar un modelo centrado en el estudiante: aprender haciendo desde el primer semestre.'
    },
    {
      id: 3,
      number: '03',
      title: 'Ingeniería de Sistemas, IA y Robótica',
      period: 'INNOVACIÓN TECNOLÓGICA',
      phase: 'IA Y ROBÓTICA SUBACUÁTICA',
      audioTrack: 'EP3_FranzTamayo_Tecnologia.mp3',
      audioSrc: MAIN_AUDIO_SRC,
      nominalStart: 60,
      nominalEnd: 95,
      initialAnim: 'hablar',
      initialAnimDuration: 2.5,
      loopAnim: 'hablar',
      arInitialAnim: 'presentarTecnologia',
      arCues: [
        { at: 1, clip: 'paso_firme' },
        { at: 4, clip: 'vision' },
        { at: 10, clip: 'senalar' },
        { at: 13, clip: 'robotica', lookYaw: 0.09 },
        { at: 18, clip: 'paso_lateral' },
        { at: 22, clip: 'explicar' },
        { at: 27, clip: 'acuerdo' },
        { at: 30.5, clip: 'paso_firme' }
      ],
      themeColor: '#00d2ff',
      skyColor: '#1d4e78',
      fogColor: '#255c8a',
      subtitle: 'En Ingeniería de Sistemas e Inteligencia Artificial, nuestros estudiantes crean visión artificial, robótica subacuática autónoma y entornos de realidad virtual.'
    },
    {
      id: 4,
      number: '04',
      title: 'Ciencias de la Salud y Simulación',
      period: 'ALTA FIDELIDAD CLÍNICA',
      phase: 'SALUD Y CLÍNICA ODONTOLÓGICA',
      audioTrack: 'EP4_FranzTamayo_Salud.mp3',
      audioSrc: MAIN_AUDIO_SRC,
      nominalStart: 95,
      nominalEnd: 125,
      initialAnim: 'acuerdo',
      initialAnimDuration: 2.8,
      loopAnim: 'hablar',
      arInitialAnim: 'ofrecer',
      arCues: [
        { at: 1, clip: 'caminar' },
        { at: 4, clip: 'salud', lookYaw: 0.08 },
        { at: 7.5, clip: 'asentir' },
        { at: 10, clip: 'brazos_abiertos' },
        { at: 14, clip: 'explicar' },
        { at: 18, clip: 'paso_lateral' },
        { at: 21.5, clip: 'acuerdo' },
        { at: 25.5, clip: 'ofrecer' }
      ],
      themeColor: '#10b981',
      skyColor: '#4da6b8',
      fogColor: '#8ad0d8',
      subtitle: 'En Ciencias de la Salud y nuestra Clínica Odontológica, combinamos simulación de alta fidelidad con gestión digital avanzada al servicio de La Paz.'
    },
    {
      id: 5,
      number: '05',
      title: 'Cierre y Apertura de Puertas',
      period: 'BIENVENIDOS A UNIFRANZ',
      phase: 'EL FUTURO SE CONSTRUYE',
      audioTrack: 'EP5_FranzTamayo_Cierre.mp3',
      audioSrc: MAIN_AUDIO_SRC,
      nominalStart: 125,
      nominalEnd: 155,
      initialAnim: 'invitar',
      initialAnimDuration: 8.0,
      loopAnim: 'invitar',
      arInitialAnim: 'paso_lateral',
      arCues: [
        { at: 0.4, clip: 'paso_lateral' },
        { at: 4, clip: 'mano_al_pecho' },
        { at: 9, clip: 'senalar', lookYaw: 0.12 },
        { at: 15, clip: 'reflexionar' },
        { at: 18.5, clip: 'asentir' },
        { at: 21.5, clip: 'enfatizar' },
        { at: 25, clip: 'invitar', hold: true, lookYaw: -0.1 }
      ],
      themeColor: '#fbbf24',
      skyColor: '#8ecae6',
      fogColor: '#dcecf5',
      subtitle: 'El futuro no se espera: se construye. Bienvenidos a la innovación, bienvenidos a Unifranz.'
    }
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // Utilidades de CanvasTexture para letreros, logotipos, banderas y UI 3D
  // ───────────────────────────────────────────────────────────────────────────

  function makeCanvasTexture(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function createMarqueeSignTexture() {
    return makeCanvasTexture(1024, 192, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0f131f');
      grad.addColorStop(0.5, '#171d2e');
      grad.addColorStop(1, '#0f131f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#c8a951';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 58px "DM Sans", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Universidad Franz Tamayo', w / 2, h / 2 - 4);

      ctx.fillStyle = '#d93829';
      ctx.fillRect(w * 0.22, h - 24, w * 0.56, 6);
    });
  }

  function createUnifranzLogoTexture() {
    return makeCanvasTexture(512, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f4f4f6';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#141824';
      ctx.font = '800 72px "DM Sans", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('UNIFRANZ', w / 2, h * 0.44);

      // Trazo rojo característico debajo del logotipo
      ctx.beginPath();
      ctx.moveTo(w * 0.14, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.64, w * 0.86, h * 0.72);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#d93829';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '600 20px "DM Sans", Arial, sans-serif';
      ctx.fillText('LA PAZ · BOLIVIA', w / 2, h * 0.88);
    });
  }

  function createHistoricalPortraitTexture() {
    return makeCanvasTexture(512, 640, (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#2c2218');
      bg.addColorStop(1, '#15100c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 16;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, w - 64, h - 64);

      // Silueta estilizada clásica de Franz Tamayo en sepia dorado
      ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.38, 128, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e6c887';
      // Cabeza y sombrero/bigote evocando su retrato de época
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.34, 48, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 - 86, h * 0.58);
      ctx.quadraticCurveTo(w / 2, h * 0.43, w / 2 + 86, h * 0.58);
      ctx.lineTo(w / 2 + 95, h * 0.68);
      ctx.lineTo(w / 2 - 95, h * 0.68);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffd166';
      ctx.font = '700 42px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRANZ TAMAYO', w / 2, h * 0.78);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 50px "DM Sans", sans-serif';
      ctx.fillText('1879 — 1993', w / 2, h * 0.87);
    });
  }

  function createFlagTexture(country) {
    return makeCanvasTexture(256, 160, (ctx, w, h) => {
      const band = (y0, y1, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, y0 * h, w, (y1 - y0) * h);
      };
      const vband = (x0, x1, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x0 * w, 0, (x1 - x0) * w, h);
      };

      switch (country) {
        case 'Bolivia':
          band(0, 0.34, '#d52b1e');
          band(0.34, 0.67, '#f9e300');
          band(0.67, 1, '#007934');
          break;
        case 'Brasil':
          band(0, 1, '#009c3b');
          ctx.fillStyle = '#ffdf00';
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.14);
          ctx.lineTo(w * 0.86, h * 0.5);
          ctx.lineTo(w * 0.5, h * 0.86);
          ctx.lineTo(w * 0.14, h * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#002776';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, h * 0.22, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'Venezuela':
          band(0, 0.34, '#ffcc00');
          band(0.34, 0.67, '#00247d');
          band(0.67, 1, '#cf142b');
          ctx.fillStyle = '#ffffff';
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(w * 0.5 + i * 16, h * 0.5 + Math.abs(i) * 3, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'Colombia':
          band(0, 0.5, '#fcd116');
          band(0.5, 0.75, '#003893');
          band(0.75, 1, '#ce1126');
          break;
        case 'Peru':
          vband(0, 0.33, '#d91023');
          vband(0.33, 0.67, '#ffffff');
          vband(0.67, 1, '#d91023');
          break;
        case 'Argentina':
          band(0, 0.33, '#74acdf');
          band(0.33, 0.67, '#ffffff');
          band(0.67, 1, '#74acdf');
          ctx.fillStyle = '#f6b40e';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, 18, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'Chile':
          band(0, 0.5, '#ffffff');
          band(0.5, 1, '#d52b1e');
          ctx.fillStyle = '#0039a6';
          ctx.fillRect(0, 0, w * 0.35, h * 0.5);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(w * 0.175, h * 0.25, 13, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'Mexico':
          vband(0, 0.33, '#006847');
          vband(0.33, 0.67, '#ffffff');
          vband(0.67, 1, '#ce1126');
          ctx.fillStyle = '#785028';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, 15, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'Espana':
          band(0, 0.25, '#aa151b');
          band(0.25, 0.75, '#f1bf00');
          band(0.75, 1, '#aa151b');
          ctx.fillStyle = '#aa151b';
          ctx.fillRect(w * 0.22, h * 0.36, 22, 42);
          break;
        default: // EE.UU.
          for (let s = 0; s < 13; s++) {
            band(s / 13, (s + 1) / 13, s % 2 === 0 ? '#b22234' : '#ffffff');
          }
          ctx.fillStyle = '#3c3b6e';
          ctx.fillRect(0, 0, w * 0.42, h * 0.54);
          break;
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Iluminación realista de cielo paceño (AR & VR)
  // ───────────────────────────────────────────────────────────────────────────

  function setupLaPazLighting(scene, renderer) {
    if (!scene || !window.THREE) return null;
    if (renderer && renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const existing = scene.getObjectByName('unifranz-lapaz-lights');
    if (existing) return existing;

    const lightRig = new THREE.Group();
    lightRig.name = 'unifranz-lapaz-lights';

    const hemiLight = new THREE.HemisphereLight(0x8ecae6, 0xd4a373, 1.25);
    hemiLight.position.set(0, 20, 0);
    lightRig.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e5, 2.25);
    sunLight.position.set(5, 14, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 42;
    sunLight.shadow.camera.left = -9;
    sunLight.shadow.camera.right = 9;
    sunLight.shadow.camera.top = 14;
    sunLight.shadow.camera.bottom = -4;
    sunLight.shadow.bias = -0.0004;
    lightRig.add(sunLight);

    // Suelo receptor de sombras invisible para AR (solo proyecta sombra real)
    const shadowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.ShadowMaterial({ opacity: 0.34 })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.set(0, 0.002, -4);
    shadowFloor.receiveShadow = true;
    lightRig.add(shadowFloor);

    scene.add(lightRig);
    return lightRig;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Reconstrucción 3D Procedural de la Puerta de Unifranz La Paz
  // ───────────────────────────────────────────────────────────────────────────

  function buildUnifranzFacade(scene, isAR = false) {
    const facade = new THREE.Group();
    facade.name = 'unifranz-facade-la-paz';
    scene.add(facade);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f6,
      roughness: 0.84,
      metalness: 0.05
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd9dce3,
      roughness: 0.6,
      metalness: 0.15
    });
    const darkMarqueeMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      roughness: 0.42,
      metalness: 0.5
    });
    const aluminumGoldMat = new THREE.MeshStandardMaterial({
      color: 0xc8a951,
      roughness: 0.32,
      metalness: 0.85
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd0d7e2,
      roughness: 0.25,
      metalness: 0.9
    });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x07101f,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.88
    });
    const doorGlassMat = new THREE.MeshPhysicalMaterial({
      color: isAR ? 0xffffff : 0x0f1c2e,
      metalness: isAR ? 0 : 0.12,
      roughness: isAR ? 0.18 : 0.08,
      transmission: isAR ? 0.12 : 0.7,
      transparent: true,
      opacity: isAR ? 0 : 0.84,
      depthWrite: !isAR,
      visible: !isAR,
      ior: 1.45,
      thickness: 0.08
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.92,
      metalness: 0.04
    });

    // Acera y zócalo del pórtico
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 6.2), sidewalkMat);
    sidewalk.position.set(0, 0.03, -4.9);
    sidewalk.receiveShadow = true;
    facade.add(sidewalk);

    // ─── Edificio Principal: Chaflán Central (6m ancho x 6 pisos) + 2 alas a 45° ───
    const floorHeight = 2.45;
    const totalHeight = floorHeight * 6; // 14.7 m (6 pisos)
    const chamferWidth = 6.0;
    const chamferZ = -4.65;

    // Función auxiliar para agregar filas de ventanas reflectantes con marcos
    function addWindowGrid(parentGroup, faceWidth, zOffset, floors, cols) {
      const winW = (faceWidth - 1.1) / cols - 0.18;
      const winH = 1.42;
      for (let f = 1; f < floors; f++) {
        const floorY = f * floorHeight + 1.35;
        // Cornisa horizontal por piso
        const ledge = new THREE.Mesh(
          new THREE.BoxGeometry(faceWidth + 0.16, 0.12, 0.24),
          trimMat
        );
        ledge.position.set(0, f * floorHeight + 0.06, zOffset + 0.05);
        ledge.castShadow = true;
        ledge.receiveShadow = true;
        parentGroup.add(ledge);

        for (let c = 0; c < cols; c++) {
          const x = -((cols - 1) * (winW + 0.22)) / 2 + c * (winW + 0.22);
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(winW + 0.09, winH + 0.09, 0.08),
            aluminumGoldMat
          );
          frame.position.set(x, floorY, zOffset + 0.02);
          parentGroup.add(frame);

          const pane = new THREE.Mesh(
            new THREE.BoxGeometry(winW, winH, 0.09),
            windowGlassMat
          );
          pane.position.set(x, floorY, zOffset + 0.035);
          parentGroup.add(pane);
        }
      }
    }

    // Bloques superiores del chaflán central (dejan abierto el vano de acceso en planta baja)
    const upperChamfer = new THREE.Mesh(
      new THREE.BoxGeometry(chamferWidth, totalHeight - 3.0, 2.2),
      wallMat
    );
    upperChamfer.position.set(0, 3.0 + (totalHeight - 3.0) / 2, chamferZ - 1.1);
    upperChamfer.castShadow = true;
    upperChamfer.receiveShadow = true;
    facade.add(upperChamfer);

    // Muros laterales del pórtico en planta baja (encuadran la entrada y permiten ver el vestíbulo)
    [-2.4, 2.4].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.1, 2.2), wallMat);
      pier.position.set(px, 1.55, chamferZ - 1.1);
      pier.castShadow = true;
      pier.receiveShadow = true;
      facade.add(pier);
    });

    // Ventanas del chaflán central (pisos 2 a 6)
    const chamferWindowHolder = new THREE.Group();
    chamferWindowHolder.position.set(0, 0, chamferZ);
    addWindowGrid(chamferWindowHolder, chamferWidth, 0, 6, 4);
    facade.add(chamferWindowHolder);

    // Logotipo UNIFRANZ con trazo rojo inferior: pared blanca izquierda y piso superior central
    const unifranzLogoTex = createUnifranzLogoTexture();
    const logoMat = new THREE.MeshStandardMaterial({
      map: unifranzLogoTex,
      roughness: 0.45,
      metalness: 0.05
    });
    // Pared izquierda junto a la entrada
    const leftEntryLogo = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.42), logoMat);
    leftEntryLogo.position.set(-2.38, 2.05, chamferZ + 0.03);
    facade.add(leftEntryLogo);

    // Piso superior central del chaflán (6to piso / ático)
    const topLogoBacking = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.95, 0.08), wallMat);
    topLogoBacking.position.set(0, totalHeight - 0.55, chamferZ + 0.06);
    facade.add(topLogoBacking);
    const topCentralLogo = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 0.88), logoMat);
    topCentralLogo.position.set(0, totalHeight - 0.55, chamferZ + 0.11);
    facade.add(topCentralLogo);

    // Dos alas laterales en ángulo de 45 grados (izq y der)
    [-1, 1].forEach((side) => {
      const wingWidth = 6.2;
      const wingGroup = new THREE.Group();
      const angle = side * (-Math.PI / 4); // -45 deg izquierda, +45 deg derecha hacia atrás-costados
      const jointX = side * (chamferWidth / 2);
      const jointZ = chamferZ;
      wingGroup.position.set(
        jointX + Math.cos(angle) * (wingWidth / 2) * side,
        0,
        jointZ - Math.abs(Math.sin(angle)) * (wingWidth / 2)
      );
      wingGroup.rotation.y = side * (Math.PI / 4);

      const wingBlock = new THREE.Mesh(
        new THREE.BoxGeometry(wingWidth, totalHeight, 2.0),
        wallMat
      );
      wingBlock.position.set(0, totalHeight / 2, -1.0);
      wingBlock.castShadow = true;
      wingBlock.receiveShadow = true;
      wingGroup.add(wingBlock);

      addWindowGrid(wingGroup, wingWidth, 0, 6, 4);
      // Ventana de planta baja en cada ala
      [-1.5, 1.5].forEach((wx) => {
        const gfWin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.65, 0.08), windowGlassMat);
        gfWin.position.set(wx, 1.5, 0.02);
        wingGroup.add(gfWin);
        const gfFrame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.76, 0.05), aluminumGoldMat);
        gfFrame.position.set(wx, 1.5, 0.005);
        wingGroup.add(gfFrame);
      });

      facade.add(wingGroup);
    });

    // ─── Pórtico de Entrada: 2 Columnas Blancas + Marquesina Curva Negra/Azul Oscuro ───
    [-1.48, 1.48].forEach((colX) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.56), trimMat);
      plinth.position.set(colX, 0.17, -3.55);
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      facade.add(plinth);

      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 2.86, 24), wallMat);
      column.position.set(colX, 1.77, -3.55);
      column.castShadow = true;
      column.receiveShadow = true;
      facade.add(column);

      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.52), trimMat);
      capital.position.set(colX, 3.24, -3.55);
      capital.castShadow = true;
      facade.add(capital);
    });

    // Marquesina curva de color negro/azul muy oscuro (#141824)
    const marqueeCurveRadius = 3.25;
    const marqueeHeight = 0.68;
    const marqueeArc = Math.PI * 0.44;
    const marqueeGeo = new THREE.CylinderGeometry(
      marqueeCurveRadius,
      marqueeCurveRadius,
      marqueeHeight,
      36,
      1,
      true,
      -marqueeArc / 2,
      marqueeArc
    );
    const marqueeFront = new THREE.Mesh(marqueeGeo, darkMarqueeMat);
    marqueeFront.position.set(0, 3.62, -6.15);
    marqueeFront.castShadow = true;
    facade.add(marqueeFront);

    // Techo plano / losa de la marquesina curva sobre el pórtico (alineado exactamente al arco frontal)
    const marqueeRoofShape = new THREE.Shape();
    marqueeRoofShape.moveTo(-2.86, 0);
    marqueeRoofShape.lineTo(2.86, 0);
    const arcHalf = Math.acos(1.5 / 3.23);
    marqueeRoofShape.absarc(0, -1.5, 3.23, Math.PI / 2 - arcHalf, Math.PI / 2 + arcHalf, false);
    const marqueeRoof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(marqueeRoofShape, { depth: 0.68, bevelEnabled: false }),
      darkMarqueeMat
    );
    marqueeRoof.rotation.x = Math.PI / 2;
    marqueeRoof.position.set(0, 3.96, -4.65);
    marqueeRoof.castShadow = true;
    marqueeRoof.receiveShadow = true;
    facade.add(marqueeRoof);

    // Frente de la marquesina curva con CanvasTexture: "Universidad Franz Tamayo"
    const signTex = createMarqueeSignTexture();
    const signGeo = new THREE.CylinderGeometry(
      marqueeCurveRadius + 0.03,
      marqueeCurveRadius + 0.03,
      0.54,
      36,
      1,
      true,
      -marqueeArc * 0.46,
      marqueeArc * 0.92
    );
    const signMesh = new THREE.Mesh(
      signGeo,
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0x111827,
        emissiveMap: signTex,
        emissiveIntensity: 0.45,
        roughness: 0.35
      })
    );
    signMesh.position.set(0, 3.62, -6.15);
    facade.add(signMesh);

    // Barandillas metálicas en la acera junto al pórtico
    [-2.15, 2.15].forEach((rx) => {
      const railGroup = new THREE.Group();
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.92, 10), chromeMat);
      post1.position.set(rx - 0.38, 0.5, -2.95);
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.92, 10), chromeMat);
      post2.position.set(rx + 0.38, 0.5, -2.95);
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.86, 10), chromeMat);
      topBar.rotation.z = Math.PI / 2;
      topBar.position.set(rx, 0.95, -2.95);
      const midBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.82, 10), chromeMat);
      midBar.rotation.z = Math.PI / 2;
      midBar.position.set(rx, 0.55, -2.95);
      railGroup.add(post1, post2, topBar, midBar);
      facade.add(railGroup);
    });

    // ─── Puertas de Vidrio Oscuro Semitransparente (Corredizas) + Vestíbulo Interior ───
    const doorWidth = 1.18;
    const doorHeight = 2.65;
    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(-doorWidth / 2 - 0.02, 1.38, -4.45);
    const leftDoorPane = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.05), doorGlassMat);
    const leftDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.04, 0.08, 0.07), aluminumGoldMat);
    leftDoorFrame.position.y = doorHeight / 2;
    const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), chromeMat);
    leftHandle.position.set(doorWidth * 0.38, 0, 0.05);
    leftDoorGroup.add(leftDoorPane, leftDoorFrame, leftHandle);
    facade.add(leftDoorGroup);

    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(doorWidth / 2 + 0.02, 1.38, -4.45);
    const rightDoorPane = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.05), doorGlassMat);
    const rightDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.04, 0.08, 0.07), aluminumGoldMat);
    rightDoorFrame.position.y = doorHeight / 2;
    const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), chromeMat);
    rightHandle.position.set(-doorWidth * 0.38, 0, 0.05);
    rightDoorGroup.add(rightDoorPane, rightDoorFrame, rightHandle);
    facade.add(rightDoorGroup);

    // Interior del vestíbulo y portal luminoso para la Etapa 5
    const lobbyGroup = new THREE.Group();
    lobbyGroup.name = 'unifranz-lobby-interior';
    lobbyGroup.position.set(0, 0, -5.6);
    const lobbyFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.15 })
    );
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.y = 0.05;
    lobbyGroup.add(lobbyFloor);

    const lobbyBackWall = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 3.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    lobbyBackWall.position.set(0, 1.6, -1.5);
    lobbyGroup.add(lobbyBackWall);

    const portalMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const lobbyPortal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.75), portalMat);
    lobbyPortal.position.set(0, 1.45, -1.35);
    lobbyGroup.add(lobbyPortal);

    const lobbyPortalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 })
    );
    lobbyPortalRing.position.set(0, 1.45, -1.32);
    lobbyGroup.add(lobbyPortalRing);

    const lobbyLight = new THREE.PointLight(0xffe082, 0, 8, 1.5);
    lobbyLight.position.set(0, 2.4, -0.4);
    lobbyGroup.add(lobbyLight);
    lobbyGroup.visible = !isAR;
    facade.add(lobbyGroup);

    // ─── Fila de 10 Banderas Internacionales con ShaderMaterial sobre la Marquesina ───
    const countries = [
      'Bolivia', 'Brasil', 'Venezuela', 'Colombia', 'Peru',
      'Argentina', 'Chile', 'Mexico', 'Espana', 'EEUU'
    ];
    const flagUniformsList = [];
    const flagTopY = 4.02;

    // Baranda metálica curva que conecta los 10 mástiles sobre la marquesina
    const railPoints = [];
    for (let i = 0; i < 10; i++) {
      const t = i / (countries.length - 1);
      const theta = -marqueeArc * 0.44 + t * (marqueeArc * 0.88);
      const fx = Math.sin(theta) * (marqueeCurveRadius - 0.05);
      const fz = -6.15 + Math.cos(theta) * (marqueeCurveRadius - 0.05);
      railPoints.push(new THREE.Vector3(fx, flagTopY + 0.28, fz));

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.15, 8), chromeMat);
      mast.position.set(fx, flagTopY + 0.52, fz);
      facade.add(mast);

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), aluminumGoldMat);
      finial.position.set(fx, flagTopY + 1.1, fz);
      facade.add(finial);

      const flagTex = createFlagTexture(countries[i]);
      const uniforms = {
        uTime: { value: 0 },
        uPhase: { value: i * 0.65 },
        uTexture: { value: flagTex }
      };
      flagUniformsList.push(uniforms);

      const flagMat = new THREE.ShaderMaterial({
        uniforms,
        side: THREE.DoubleSide,
        vertexShader: `
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float wave = sin(pos.x * 9.0 - uTime * 4.8 + uPhase) * 0.035
                       + cos(pos.y * 6.0 - uTime * 3.1 + uPhase) * 0.012;
            pos.z += wave * uv.x;
            pos.y += sin(pos.x * 6.0 - uTime * 3.6 + uPhase) * 0.01 * uv.x;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          varying vec2 vUv;
          void main() {
            vec4 tex = texture2D(uTexture, vUv);
            gl_FragColor = tex;
          }
        `
      });

      const flagPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.25, 16, 8), flagMat);
      flagPlane.position.set(fx + 0.21, flagTopY + 0.94, fz);
      facade.add(flagPlane);
    }

    const railCurve = new THREE.CatmullRomCurve3(railPoints);
    const curvedRailMesh = new THREE.Mesh(
      new THREE.TubeGeometry(railCurve, 32, 0.022, 8, false),
      chromeMat
    );
    facade.add(curvedRailMesh);

    let doorsOpenProgress = 0;
    let portalTargetOpacity = 0;

    return {
      group: facade,
      leftDoor: leftDoorGroup,
      rightDoor: rightDoorGroup,
      lobbyPortal,
      setDoorsOpen(open) {
        portalTargetOpacity = open ? 1 : 0;
      },
      update(dt, elapsed) {
        flagUniformsList.forEach((u) => {
          u.uTime.value = elapsed;
        });

        // Animación suave de apertura/cierre de puertas corredizas y portal luminoso
        doorsOpenProgress += ((portalTargetOpacity ? 1 : 0) - doorsOpenProgress) * Math.min(1, dt * 2.4);
        const slideOffset = doorsOpenProgress * 0.92;
        leftDoorGroup.position.x = -(doorWidth / 2 + 0.02) - slideOffset;
        rightDoorGroup.position.x = (doorWidth / 2 + 0.02) + slideOffset;

        portalMat.opacity = doorsOpenProgress * (0.45 + Math.sin(elapsed * 3.2) * 0.12);
        lobbyPortalRing.material.opacity = doorsOpenProgress * 0.9;
        lobbyPortalRing.rotation.z = elapsed * 0.7;
        lobbyPortalRing.scale.setScalar(1 + Math.sin(elapsed * 2.5) * 0.05);
        lobbyLight.intensity = doorsOpenProgress * 3.2;
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Generador de AnimationClips para AnimationMixer sobre FranzTamayoReal.glb
  // ───────────────────────────────────────────────────────────────────────────

  function createAvatarAnimationClips(root) {
    const bones = {};
    const restQuats = {};
    root.traverse((obj) => {
      if (obj.isBone || obj.name?.startsWith('mixamorig')) {
        bones[obj.name] = obj;
        restQuats[obj.name] = obj.quaternion.clone();
      }
    });

    function buildDeltaTrack(boneName, keyframes) {
      const actualName = boneName.replace(':', '');
      const bone = bones[boneName] || bones[actualName];
      const base = bone && restQuats[bone.name];
      if (!bone || !base) return null;
      const times = [];
      const values = [];
      const euler = new THREE.Euler();
      const deltaQ = new THREE.Quaternion();
      const finalQ = new THREE.Quaternion();

      keyframes.forEach(([t, rx, ry, rz]) => {
        times.push(t);
        euler.set(rx, ry, rz, 'XYZ');
        deltaQ.setFromEuler(euler);
        finalQ.copy(base).multiply(deltaQ);
        values.push(finalQ.x, finalQ.y, finalQ.z, finalQ.w);
      });
      return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values);
    }

    function compileClip(name, duration, defs) {
      const tracks = [];
      Object.entries(defs).forEach(([boneName, kfs]) => {
        const track = buildDeltaTrack(boneName, kfs);
        if (track) tracks.push(track);
      });
      return new THREE.AnimationClip(name, duration, tracks);
    }

    // Clip 1: saludar_01 (brazo derecho levantado en saludo amistoso + inclinación)
    const saludar = compileClip('saludar_01', 4.0, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.6, -0.5, 0.25, -0.75],
        [3.3, -0.45, 0.2, -0.7],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.6, 0.2, 0.3, 0.65],
        [1.3, 0.25, 0.45, 0.35],
        [2.0, 0.2, 0.25, 0.72],
        [2.7, 0.25, 0.45, 0.35],
        [3.4, 0.2, 0.3, 0.65],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.8, 0.06, 0.08, 0.03],
        [2.2, 0.04, -0.06, -0.02],
        [4.0, 0, 0, 0]
      ]
    });

    // Clip 2: acuerdo (asentimiento de cabeza firme y gesto afirmativo con las manos)
    const acuerdo = compileClip('acuerdo', 3.0, {
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.5, 0.18, 0, 0],
        [1.0, -0.04, 0, 0],
        [1.6, 0.16, 0.04, 0],
        [2.2, -0.03, -0.03, 0],
        [3.0, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.8, -0.25, 0.1, -0.2],
        [2.2, -0.28, 0.14, -0.24],
        [3.0, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.8, -0.2, -0.1, 0.18],
        [2.2, -0.22, -0.1, 0.2],
        [3.0, 0, 0, 0]
      ]
    });

    // Clip 3: hablar (oratoria elocuente continua con brazos, torso y cabeza)
    const hablar = compileClip('hablar', 4.0, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [1.0, 0.03, 0.05, 0],
        [2.0, 0.02, -0.04, 0],
        [3.0, 0.04, 0.04, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, -0.08, 0, -0.05],
        [1.0, -0.32, 0.12, -0.26],
        [2.0, -0.18, -0.05, -0.12],
        [3.0, -0.36, 0.16, -0.28],
        [4.0, -0.08, 0, -0.05]
      ],
      'mixamorig:RightForeArm': [
        [0, 0.15, 0, 0.15],
        [1.0, 0.45, 0.1, 0.35],
        [2.0, 0.22, 0, 0.18],
        [3.0, 0.48, 0.12, 0.32],
        [4.0, 0.15, 0, 0.15]
      ],
      'mixamorig:RightHand': [
        [0, 0, 0, 0],
        [1.0, 0.08, 0, 0.08],
        [2.0, -0.06, 0, -0.05],
        [3.0, 0.08, 0, 0.08],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:RightHandIndex1': [
        [0, 0, 0, 0],
        [1.0, -0.12, 0, 0],
        [2.0, -0.22, 0, 0],
        [3.0, -0.12, 0, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:RightHandMiddle1': [
        [0, 0, 0, 0],
        [1.0, -0.1, 0, 0],
        [2.0, -0.18, 0, 0],
        [3.0, -0.1, 0, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [1.0, 0.015, 0.025, 0],
        [2.0, 0, -0.025, 0],
        [3.0, -0.015, 0.025, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:Spine2': [
        [0, 0, 0, 0],
        [1.0, 0.025, 0.035, 0],
        [2.0, 0.015, -0.03, 0],
        [3.0, 0.03, 0.025, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:Neck': [
        [0, 0, 0, 0],
        [0.9, 0.025, 0.04, 0],
        [1.9, -0.02, -0.04, 0],
        [2.9, 0.025, 0.03, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, -0.06, 0, 0.05],
        [1.3, -0.28, -0.12, 0.22],
        [2.6, -0.14, 0, 0.1],
        [4.0, -0.06, 0, 0.05]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0.12, 0, -0.12],
        [1.3, 0.38, -0.1, -0.28],
        [2.6, 0.18, 0, -0.16],
        [4.0, 0.12, 0, -0.12]
      ],
      'mixamorig:LeftHand': [
        [0, 0, 0, 0],
        [1.3, -0.05, 0, 0.06],
        [2.6, 0.06, 0, -0.04],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:LeftHandIndex1': [
        [0, 0, 0, 0],
        [1.3, -0.1, 0, 0],
        [2.6, -0.16, 0, 0],
        [4.0, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.9, 0.07, 0.09, 0.02],
        [1.9, -0.03, -0.08, -0.02],
        [2.9, 0.06, 0.05, 0],
        [4.0, 0, 0, 0]
      ]
    });

    // Clip 4: invitar (brazo derecho e izquierdo se abren señalando hacia la entrada de Unifranz)
    const invitar = compileClip('invitar', 3.5, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.9, -0.45, -0.35, -0.55],
        [2.6, -0.45, -0.35, -0.55],
        [3.5, -0.45, -0.35, -0.55]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.9, 0.18, -0.2, 0.25],
        [2.6, 0.18, -0.2, 0.25],
        [3.5, 0.18, -0.2, 0.25]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.9, 0.05, -0.22, 0],
        [2.6, 0.05, -0.22, 0],
        [3.5, 0.05, -0.22, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.9, 0.04, 0.22, 0],
        [2.6, 0.04, 0.22, 0],
        [3.5, 0.04, 0.22, 0]
      ]
    });

    const presentarse = compileClip('presentarse', 2.8, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, 0.2, 0.05, -0.32],
        [2.1, 0.2, 0.05, -0.32],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.12, -0.18, 0.78],
        [2.1, 0.12, -0.18, 0.78],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, 0.06, 0, 0.04],
        [1.4, 0, 0, 0],
        [2.8, 0, 0, 0]
      ]
    });

    const explicar = compileClip('explicar', 3.8, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.9, 0.04, 0.04, 0],
        [2.1, 0, -0.04, 0],
        [3.1, 0.03, 0.03, 0],
        [3.8, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, -0.08, 0, -0.05],
        [0.8, -0.38, 0.12, -0.32],
        [1.8, -0.2, -0.12, -0.12],
        [2.8, -0.4, 0.14, -0.34],
        [3.8, -0.08, 0, -0.05]
      ],
      'mixamorig:RightForeArm': [
        [0, 0.12, 0, 0.1],
        [0.8, 0.42, 0.1, 0.36],
        [1.8, 0.24, 0, 0.18],
        [2.8, 0.48, 0.12, 0.36],
        [3.8, 0.12, 0, 0.1]
      ],
      'mixamorig:LeftArm': [
        [0, -0.06, 0, 0.05],
        [1.1, -0.3, -0.1, 0.25],
        [2.3, -0.16, 0.06, 0.12],
        [3.8, -0.06, 0, 0.05]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0.1, 0, -0.1],
        [1.1, 0.36, -0.08, -0.3],
        [2.3, 0.2, 0, -0.16],
        [3.8, 0.1, 0, -0.1]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [1.1, 0.05, 0.08, 0],
        [2.1, -0.04, -0.07, 0],
        [3.1, 0.05, 0.06, 0],
        [3.8, 0, 0, 0]
      ]
    });

    const enfatizar = compileClip('enfatizar', 2.8, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.55, -0.06, 0, 0],
        [1.3, -0.03, 0, 0],
        [2.1, 0, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.55, -0.42, 0.18, -0.38],
        [1.15, -0.5, 0.2, -0.42],
        [1.65, -0.42, 0.18, -0.38],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.55, 0.34, 0.08, 0.22],
        [1.15, 0.28, 0.08, 0.18],
        [1.65, 0.34, 0.08, 0.22],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, 0.14, 0, 0],
        [1.25, -0.03, 0, 0],
        [1.8, 0.12, 0, 0],
        [2.8, 0, 0, 0]
      ]
    });

    const presentarTecnologia = compileClip('presentarTecnologia', 3.6, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.8, 0.02, -0.08, 0],
        [2.4, 0.02, -0.08, 0],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.8, -0.48, -0.2, 0.45],
        [2.4, -0.48, -0.2, 0.45],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.12, -0.08, -0.3],
        [2.4, 0.12, -0.08, -0.3],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.8, 0.02, -0.16, 0],
        [2.4, 0.02, -0.16, 0],
        [3.6, 0, 0, 0]
      ]
    });

    const vision = compileClip('vision', 2.8, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.65, -0.3, 0.5, -0.58],
        [1.9, -0.3, 0.5, -0.58],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.7, -0.12, -0.04, 0.1],
        [1.5, -0.06, 0.03, 0.05],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, -0.04, 0, 0],
        [1.5, 0.02, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.65, 0.16, 0.12, 0.12],
        [1.9, 0.16, 0.12, 0.12],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightHandIndex1': [
        [0, 0, 0, 0],
        [0.65, -0.2, 0, 0],
        [1.9, -0.2, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.65, 0.02, 0.12, 0],
        [1.9, 0.02, 0.12, 0],
        [2.8, 0, 0, 0]
      ]
    });

    const robotica = compileClip('robotica', 3.4, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, 0, 0.1, 0],
        [1.8, 0.02, -0.1, 0],
        [2.7, 0, 0.08, 0],
        [3.4, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, -0.42, 0.32, -0.45],
        [1.8, -0.28, 0.48, -0.3],
        [2.7, -0.44, 0.25, -0.42],
        [3.4, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.26, 0.1, 0.25],
        [1.8, 0.44, -0.08, 0.32],
        [2.7, 0.22, 0.1, 0.2],
        [3.4, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [1, -0.24, -0.25, 0.28],
        [2.1, -0.42, -0.12, 0.4],
        [3.4, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [1, 0.04, 0.12, 0],
        [2.1, -0.03, -0.12, 0],
        [3.4, 0, 0, 0]
      ]
    });

    const salud = compileClip('salud', 3.0, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, 0.04, 0, 0],
        [2.1, 0.04, 0, 0],
        [3, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.7, -0.36, -0.24, 0.32],
        [2.1, -0.36, -0.24, 0.32],
        [3, 0, 0, 0]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.24, -0.1, -0.25],
        [2.1, 0.24, -0.1, -0.25],
        [3, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [1.1, -0.22, 0.1, -0.18],
        [2.1, -0.3, 0.12, -0.26],
        [3, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, 0.04, -0.08, 0],
        [2.1, 0.04, -0.08, 0],
        [3, 0, 0, 0]
      ]
    });

    const ofrecer = compileClip('ofrecer', 3.5, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.8, 0.05, 0, 0],
        [2.5, 0.05, 0, 0],
        [3.5, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.8, -0.42, 0.2, -0.4],
        [2.5, -0.42, 0.2, -0.4],
        [3.5, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.35, 0.05, 0.28],
        [2.5, 0.35, 0.05, 0.28],
        [3.5, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.8, -0.42, -0.2, 0.4],
        [2.5, -0.42, -0.2, 0.4],
        [3.5, 0, 0, 0]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.35, -0.05, -0.28],
        [2.5, 0.35, -0.05, -0.28],
        [3.5, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.8, 0.05, 0, 0],
        [1.7, 0.12, 0, 0],
        [2.5, 0.04, 0, 0],
        [3.5, 0, 0, 0]
      ]
    });

    const reflexionar = compileClip('reflexionar', 3.0, {
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, 0.04, -0.12, -0.08],
        [2.2, 0.04, -0.12, -0.08],
        [3, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, 0.18, 0.05, -0.24],
        [2.2, 0.18, 0.05, -0.24],
        [3, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.18, -0.08, 0.72],
        [2.2, 0.18, -0.08, 0.72],
        [3, 0, 0, 0]
      ]
    });

    const pasoLateral = compileClip('paso_lateral', 2.8, {
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.45, 0.02, 0.04, 0],
        [1.15, -0.02, -0.04, 0],
        [1.9, 0.02, 0.03, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:LeftUpLeg': [
        [0, 0, 0, 0],
        [0.55, -0.22, 0, 0.08],
        [1.25, 0.08, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:LeftLeg': [
        [0, 0, 0, 0],
        [0.7, 0.28, 0, 0],
        [1.4, 0.04, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightUpLeg': [
        [0, 0, 0, 0],
        [1.05, 0.12, 0, -0.06],
        [1.75, -0.08, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightLeg': [
        [0, 0, 0, 0],
        [1.15, -0.12, 0, 0],
        [1.85, 0.02, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.65, -0.03, 0, 0],
        [1.45, 0.02, 0, 0],
        [2.8, 0, 0, 0]
      ]
    });

    const caminar = compileClip('caminar', 1.8, {
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.45, 0.02, 0.04, 0],
        [0.9, 0, 0, 0],
        [1.35, -0.02, -0.04, 0],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:LeftUpLeg': [
        [0, 0, 0, 0],
        [0.45, -0.32, 0, 0],
        [0.9, 0, 0, 0],
        [1.35, 0.32, 0, 0],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:LeftLeg': [
        [0, 0, 0, 0],
        [0.45, 0.18, 0, 0],
        [0.9, 0, 0, 0],
        [1.35, 0, 0, 0],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:RightUpLeg': [
        [0, 0, 0, 0],
        [0.45, 0.32, 0, 0],
        [0.9, 0, 0, 0],
        [1.35, -0.32, 0, 0],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:RightLeg': [
        [0, 0, 0, 0],
        [0.45, 0, 0, 0],
        [0.9, 0.18, 0, 0],
        [1.35, 0, 0, 0],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.45, 0.08, 0, 0.12],
        [0.9, 0, 0, 0],
        [1.35, -0.08, 0, -0.12],
        [1.8, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.45, -0.08, 0, -0.12],
        [0.9, 0, 0, 0],
        [1.35, 0.08, 0, 0.12],
        [1.8, 0, 0, 0]
      ]
    });

    const manoAlPecho = compileClip('mano_al_pecho', 2.8, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, 0.18, 0.08, -0.3],
        [1.9, 0.18, 0.08, -0.3],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.08, -0.12, 0.62],
        [1.9, 0.08, -0.12, 0.62],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightHand': [
        [0, 0, 0, 0],
        [0.7, 0.02, 0, 0.08],
        [1.9, 0.02, 0, 0.08],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.7, -0.12, -0.04, 0.14],
        [1.9, -0.12, -0.04, 0.14],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, 0.025, 0.015, 0],
        [1.9, 0.025, 0.015, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, 0.04, 0, 0.025],
        [1.9, 0.04, 0, 0.025],
        [2.8, 0, 0, 0]
      ]
    });

    const brazosAbiertos = compileClip('brazos_abiertos', 3.2, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.8, -0.035, 0, 0],
        [2.4, -0.035, 0, 0],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.8, -0.34, -0.12, 0.5],
        [2.4, -0.34, -0.12, 0.5],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.22, -0.08, -0.18],
        [2.4, 0.22, -0.08, -0.18],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:LeftHand': [
        [0, 0, 0, 0],
        [0.8, -0.06, 0, 0.08],
        [2.4, -0.06, 0, 0.08],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.8, -0.34, 0.12, -0.5],
        [2.4, -0.34, 0.12, -0.5],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.22, 0.08, 0.18],
        [2.4, 0.22, 0.08, 0.18],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:RightHand': [
        [0, 0, 0, 0],
        [0.8, 0.06, 0, -0.08],
        [2.4, 0.06, 0, -0.08],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.8, 0, 0.04, 0],
        [2.4, 0, 0.04, 0],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.8, 0.035, 0, 0],
        [2.4, 0.035, 0, 0],
        [3.2, 0, 0, 0]
      ]
    });

    const senalar = compileClip('senalar', 2.8, {
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, -0.58, 0.12, -0.48],
        [2.0, -0.58, 0.12, -0.48],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.7, 0.06, 0.02, 0.16],
        [2.0, 0.06, 0.02, 0.16],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightHand': [
        [0, 0, 0, 0],
        [0.7, 0, 0, -0.08],
        [2.0, 0, 0, -0.08],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:RightHandIndex1': [
        [0, 0, 0, 0],
        [0.7, -0.2, 0, 0],
        [2.0, -0.2, 0, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.7, -0.1, -0.04, 0.12],
        [2.0, -0.1, -0.04, 0.12],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, 0.02, 0.04, 0],
        [2.0, 0.02, 0.04, 0],
        [2.8, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.7, -0.02, 0.1, 0],
        [2.0, -0.02, 0.1, 0],
        [2.8, 0, 0, 0]
      ]
    });

    const pasoConfiado = compileClip('paso_confiado', 2.4, {
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.6, 0.02, 0.035, 0],
        [1.2, 0, 0, 0],
        [1.8, -0.02, -0.035, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftUpLeg': [
        [0, 0, 0, 0],
        [0.6, -0.28, 0, 0.02],
        [1.2, 0, 0, 0],
        [1.8, 0.08, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftLeg': [
        [0, 0, 0, 0],
        [0.6, 0.14, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightUpLeg': [
        [0, 0, 0, 0],
        [0.6, 0.08, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0.28, 0, -0.02],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightLeg': [
        [0, 0, 0, 0],
        [0.6, 0, 0, 0],
        [1.2, 0.14, 0, 0],
        [1.8, 0.14, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.6, -0.12, 0, -0.12],
        [1.2, 0, 0, 0],
        [1.8, 0.12, 0, 0.12],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.6, 0.12, 0, 0.12],
        [1.2, 0, 0, 0],
        [1.8, -0.12, 0, -0.12],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.6, 0.015, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0.015, 0, 0],
        [2.4, 0, 0, 0]
      ]
    });

    const dialogoAmbasManos = compileClip('dialogo_ambas_manos', 3.6, {
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.8, 0.035, 0.025, 0],
        [1.8, 0.015, -0.035, 0],
        [2.8, 0.035, 0.025, 0],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:Spine2': [
        [0, 0, 0, 0],
        [0.8, 0.025, 0.025, 0],
        [1.8, 0.015, -0.025, 0],
        [2.8, 0.025, 0.025, 0],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.8, -0.36, 0.1, -0.38],
        [1.8, -0.22, 0.08, -0.22],
        [2.8, -0.38, 0.12, -0.4],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:RightForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.28, 0.04, 0.25],
        [1.8, 0.18, 0, 0.15],
        [2.8, 0.3, 0.05, 0.27],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:RightHand': [
        [0, 0, 0, 0],
        [0.8, 0.04, 0, 0.06],
        [1.8, -0.03, 0, -0.04],
        [2.8, 0.04, 0, 0.06],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:RightHandIndex1': [
        [0, 0, 0, 0],
        [0.8, -0.1, 0, 0],
        [1.8, -0.05, 0, 0],
        [2.8, -0.1, 0, 0],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.8, -0.38, -0.1, 0.4],
        [1.8, -0.22, -0.08, 0.22],
        [2.8, -0.36, -0.12, 0.38],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftForeArm': [
        [0, 0, 0, 0],
        [0.8, 0.3, -0.05, -0.27],
        [1.8, 0.18, 0, -0.15],
        [2.8, 0.28, -0.04, -0.24],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftHand': [
        [0, 0, 0, 0],
        [0.8, -0.04, 0, -0.06],
        [1.8, 0.03, 0, 0.04],
        [2.8, -0.04, 0, -0.06],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:LeftHandIndex1': [
        [0, 0, 0, 0],
        [0.8, -0.1, 0, 0],
        [1.8, -0.05, 0, 0],
        [2.8, -0.1, 0, 0],
        [3.6, 0, 0, 0]
      ],
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.8, 0.045, 0.035, 0],
        [1.8, 0, -0.04, 0],
        [2.8, 0.04, 0.025, 0],
        [3.6, 0, 0, 0]
      ]
    });

    const cambioPeso = compileClip('cambio_peso', 3.2, {
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.7, 0.015, 0.055, 0],
        [1.6, -0.02, -0.05, 0],
        [2.5, 0.012, 0.035, 0],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:LeftUpLeg': [
        [0, 0, 0, 0],
        [0.7, -0.08, 0, 0.035],
        [1.6, 0.07, 0, -0.025],
        [2.5, -0.035, 0, 0.015],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:RightUpLeg': [
        [0, 0, 0, 0],
        [0.7, 0.07, 0, -0.025],
        [1.6, -0.08, 0, 0.035],
        [2.5, 0.04, 0, -0.015],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.7, 0.025, -0.035, 0],
        [1.6, -0.02, 0.04, 0],
        [2.5, 0.018, -0.025, 0],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.7, -0.12, 0.035, 0.1],
        [1.6, 0.08, -0.025, -0.08],
        [2.5, -0.06, 0.02, 0.05],
        [3.2, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.7, 0.08, -0.025, -0.08],
        [1.6, -0.12, 0.035, 0.1],
        [2.5, 0.06, -0.02, -0.05],
        [3.2, 0, 0, 0]
      ]
    });

    const asentir = compileClip('asentir', 2.4, {
      'mixamorig:Head': [
        [0, 0, 0, 0],
        [0.45, 0.12, 0.015, 0],
        [0.9, -0.045, 0, 0],
        [1.35, 0.1, -0.01, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:Neck': [
        [0, 0, 0, 0],
        [0.45, 0.035, 0, 0],
        [0.9, -0.015, 0, 0],
        [1.35, 0.03, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.45, 0.015, 0, 0],
        [0.9, -0.01, 0, 0],
        [1.35, 0.012, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.45, -0.08, 0.025, -0.08],
        [1.35, -0.08, 0.025, -0.08],
        [2.4, 0, 0, 0]
      ]
    });

    const pasoFirme = compileClip('paso_firme', 2.4, {
      'mixamorig:Hips': [
        [0, 0, 0, 0],
        [0.55, 0.025, 0.035, 0],
        [1.2, 0, 0, 0],
        [1.8, -0.02, -0.035, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftUpLeg': [
        [0, 0, 0, 0],
        [0.55, -0.36, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0.1, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftLeg': [
        [0, 0, 0, 0],
        [0.55, 0.18, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightUpLeg': [
        [0, 0, 0, 0],
        [0.55, 0.1, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, -0.36, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightLeg': [
        [0, 0, 0, 0],
        [0.55, 0, 0, 0],
        [1.2, 0.18, 0, 0],
        [1.8, 0.18, 0, 0],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:LeftArm': [
        [0, 0, 0, 0],
        [0.55, 0.16, 0, 0.12],
        [1.2, 0, 0, 0],
        [1.8, -0.16, 0, -0.12],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:RightArm': [
        [0, 0, 0, 0],
        [0.55, -0.16, 0, -0.12],
        [1.2, 0, 0, 0],
        [1.8, 0.16, 0, 0.12],
        [2.4, 0, 0, 0]
      ],
      'mixamorig:Spine1': [
        [0, 0, 0, 0],
        [0.55, 0.02, 0, 0],
        [1.2, 0, 0, 0],
        [1.8, 0.02, 0, 0],
        [2.4, 0, 0, 0]
      ]
    });

    return {
      saludar_01: saludar,
      acuerdo,
      hablar,
      invitar,
      presentarse,
      explicar,
      enfatizar,
      presentarTecnologia,
      vision,
      robotica,
      salud,
      ofrecer,
      reflexionar,
      paso_lateral: pasoLateral,
      caminar,
      mano_al_pecho: manoAlPecho,
      brazos_abiertos: brazosAbiertos,
      senalar,
      paso_confiado: pasoConfiado,
      dialogo_ambas_manos: dialogoAmbasManos,
      cambio_peso: cambioPeso,
      asentir,
      paso_firme: pasoFirme,
      headBone: bones['mixamorig:Head'] || bones['mixamorigHead'] || null
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. WebXRButton (Soporte WebXR inmersivo AR / VR)
  // ───────────────────────────────────────────────────────────────────────────

  function createWebXRButton(sceneEl, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pokear-chip-btn webxr-launch-btn';
    button.disabled = true;
    button.textContent = '📍 AR 6DoF';
    button.title = 'Fijar la escena al espacio real mediante AR 6DoF';

    const mode = options.mode || 'immersive-ar';
    if (!navigator.xr || !sceneEl || typeof sceneEl.enterAR !== 'function') {
      button.disabled = true;
      button.style.opacity = '0.55';
      button.textContent = 'AR 6DoF no disponible';
      button.title = 'Este navegador o dispositivo no admite WebXR AR; se usará la vista de cámara con sensores';
      return button;
    }

    navigator.xr.isSessionSupported(mode).then((supported) => {
      if (!supported) {
        button.disabled = true;
        button.style.opacity = '0.55';
        button.textContent = 'AR 6DoF no disponible';
        button.title = 'Se requiere un navegador y dispositivo compatibles con WebXR AR';
        return;
      }
      button.disabled = false;
      button.title = 'Iniciar AR 6DoF y fijar los modelos sobre una superficie real';
    }).catch((error) => {
      console.error('[Unifranz WebXR] No se pudo comprobar el soporte AR:', error);
      button.disabled = true;
      button.style.opacity = '0.55';
      button.textContent = 'AR 6DoF no disponible';
      button.title = 'No se pudo comprobar el soporte WebXR AR';
    });

    sceneEl.addEventListener('enter-vr', () => {
      if (!sceneEl.is('ar-mode')) return;
      button.textContent = '⏹ Salir de AR 6DoF';
    });
    sceneEl.addEventListener('exit-vr', () => {
      button.textContent = '📍 AR 6DoF';
    });

    button.addEventListener('click', async () => {
      if (sceneEl.is('ar-mode')) {
        await sceneEl.exitVR();
        return;
      }
      try {
        if (typeof options.beforeEnter === 'function') options.beforeEnter();
        await sceneEl.enterAR();
      } catch (error) {
        console.error('[Unifranz WebXR] No se pudo iniciar AR 6DoF:', error);
        if (typeof options.onError === 'function') options.onError(error);
      }
    });

    return button;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Efectos 3D dedicados para cada una de las 5 etapas
  // ───────────────────────────────────────────────────────────────────────────

  function createStageEffects(parentGroup) {
    const container = new THREE.Group();
    container.name = 'unifranz-stage-effects';
    parentGroup.add(container);

    // ─── ETAPA 1: Retrato histórico enmarcado "1879 - 1993" a la izquierda ───
    const stage1Group = new THREE.Group();
    const portraitMat = new THREE.MeshStandardMaterial({
      map: createHistoricalPortraitTexture(),
      roughness: 0.35,
      metalness: 0.25
    });
    const portraitFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 1.2, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 })
    );
    const portraitArt = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.1), portraitMat);
    portraitArt.position.z = 0.036;
    const portraitBack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.1), portraitMat);
    portraitBack.position.z = -0.036;
    portraitBack.rotation.y = Math.PI;
    portraitFrame.add(portraitArt, portraitBack);
    portraitFrame.position.set(-1.18, 1.52, -2.65);
    portraitFrame.rotation.y = 0.28;
    stage1Group.add(portraitFrame);
    container.add(stage1Group);

    // ─── ETAPA 2: 3 Nodos holográficos (TorusKnotGeometry + paneles de cristal) ───
    const stage2Group = new THREE.Group();
    const stage2Nodes = [];
    const nodeConfigs = [
      { pos: [-1.15, 1.55, -2.55], color: 0xf59e0b, label: 'APRENDER HACIENDO' },
      { pos: [0, 2.55, -2.85], color: 0x38bdf8, label: 'PROYECTOS REALES' },
      { pos: [1.15, 1.55, -2.55], color: 0xfb7185, label: '1ER SEMESTRE' }
    ];
    nodeConfigs.forEach((cfg, idx) => {
      const nodeWrap = new THREE.Group();
      nodeWrap.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

      const knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.18, 0.055, 64, 12),
        new THREE.MeshStandardMaterial({
          color: cfg.color,
          emissive: cfg.color,
          emissiveIntensity: 0.65,
          wireframe: idx === 1,
          roughness: 0.2,
          metalness: 0.7
        })
      );
      nodeWrap.add(knot);

      const glassTex = makeCanvasTexture(384, 112, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 28px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.label, w / 2, h / 2);
      });
      const glassPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 0.24),
        new THREE.MeshPhysicalMaterial({
          map: glassTex,
          transparent: true,
          opacity: 0.9,
          roughness: 0.1,
          transmission: 0.35,
          side: THREE.DoubleSide
        })
      );
      glassPanel.position.y = -0.34;
      nodeWrap.add(glassPanel);

      stage2Group.add(nodeWrap);
      stage2Nodes.push({ wrap: nodeWrap, knot, baseY: cfg.pos[1], phase: idx * 2.1 });
    });
    container.add(stage2Group);

    // ─── ETAPA 3: Dron Submarino (ROV) + Red Neuronal Wireframe Azul/Naranja ───
    const stage3Group = new THREE.Group();
    const rovAnchor = new THREE.Group();
    rovAnchor.position.set(1.12, 1.38, -2.25);

    const blueWireMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
    const orangeWireMat = new THREE.MeshBasicMaterial({ color: 0xff7b00, wireframe: true });

    const rovHull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.72), blueWireMat);
    const rovDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), orangeWireMat);
    rovDome.position.set(0, 0.04, 0.38);
    const rovArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), orangeWireMat);
    rovArmL.rotation.x = Math.PI / 2;
    rovArmL.position.set(-0.22, -0.14, 0.42);
    const rovArmR = rovArmL.clone();
    rovArmR.position.x = 0.22;

    const thrusters = [];
    [[-0.32, 0.12, -0.32], [0.32, 0.12, -0.32]].forEach((p) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 18), orangeWireMat);
      ring.position.set(p[0], p[1], p[2]);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.01), blueWireMat);
      ring.add(blade);
      rovAnchor.add(ring);
      thrusters.push(blade);
    });
    rovAnchor.add(rovHull, rovDome, rovArmL, rovArmR);
    stage3Group.add(rovAnchor);

    // Red Neuronal 3D con nodos interconectados y líneas pulsantes
    const neuralGroup = new THREE.Group();
    neuralGroup.position.set(1.12, 2.02, -2.35);
    const layers = [-0.42, 0, 0.42];
    const nodePositions = [];
    const neuralLineMats = [];
    layers.forEach((lx, lIdx) => {
      const count = lIdx === 1 ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const ly = (i - (count - 1) / 2) * 0.22;
        const lz = ((i + lIdx) % 2 ? 0.12 : -0.12);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 10, 10),
          new THREE.MeshBasicMaterial({ color: lIdx % 2 ? 0xff7b00 : 0x00e5ff })
        );
        sphere.position.set(lx, ly, lz);
        neuralGroup.add(sphere);
        nodePositions.push({ layer: lIdx, pos: sphere.position });
      }
    });
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = 0; j < nodePositions.length; j++) {
        if (nodePositions[j].layer === nodePositions[i].layer + 1) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            nodePositions[i].pos,
            nodePositions[j].pos
          ]);
          const lMat = new THREE.LineBasicMaterial({
            color: (i + j) % 2 ? 0x00e5ff : 0xff7b00,
            transparent: true,
            opacity: 0.75
          });
          neuralLineMats.push({ mat: lMat, offset: i * 0.7 + j * 0.4 });
          neuralGroup.add(new THREE.Line(lineGeo, lMat));
        }
      }
    }
    stage3Group.add(neuralGroup);
    container.add(stage3Group);

    // ─── ETAPA 4: Estructura Médica / Odontológica 3D + Partículas Verdes/Blancas ───
    const stage4Group = new THREE.Group();
    const medHub = new THREE.Group();
    medHub.position.set(1.08, 1.48, -2.25);

    const toothMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92
    });
    const scanRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });

    // Corona molar anatómica estilizada + raíces
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.28, 16), toothMat);
    crown.position.y = 0.14;
    const cusp1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), toothMat);
    cusp1.position.set(-0.09, 0.28, -0.07);
    const cusp2 = cusp1.clone();
    cusp2.position.set(0.09, 0.28, -0.07);
    const cusp3 = cusp1.clone();
    cusp3.position.set(-0.09, 0.28, 0.07);
    const cusp4 = cusp1.clone();
    cusp4.position.set(0.09, 0.28, 0.07);
    const root1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 10), toothMat);
    root1.rotation.x = Math.PI;
    root1.position.set(-0.09, -0.1, 0);
    const root2 = root1.clone();
    root2.position.set(0.09, -0.1, 0);
    const scanRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.014, 10, 36), scanRingMat);
    scanRing.rotation.x = Math.PI / 2;

    // Doble hélice de ADN clínica alrededor
    const dnaGroup = new THREE.Group();
    for (let k = 0; k < 10; k++) {
      const ang = k * 0.65;
      const y = -0.35 + k * 0.085;
      const r = 0.44;
      const b1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      b1.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      const b2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      b2.position.set(-Math.cos(ang) * r, y, -Math.sin(ang) * r);
      dnaGroup.add(b1, b2);
    }
    medHub.add(crown, cusp1, cusp2, cusp3, cusp4, root1, root2, scanRing, dnaGroup);
    stage4Group.add(medHub);

    // Sistema de partículas verdes y blancas de precisión clínica
    const pCount = 140;
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    const pSeeds = [];
    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.35 + Math.random() * 0.55;
      pPositions[i * 3] = Math.cos(ang) * rad;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.1;
      pPositions[i * 3 + 2] = Math.sin(ang) * rad;
      pSeeds.push({ ang, rad, speed: 0.4 + Math.random() * 0.8, yBase: pPositions[i * 3 + 1] });
      const isGreen = i % 2 === 0;
      pColors[i * 3] = isGreen ? 0.06 : 1.0;
      pColors[i * 3 + 1] = isGreen ? 0.82 : 1.0;
      pColors[i * 3 + 2] = isGreen ? 0.52 : 1.0;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const medParticles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ size: 0.032, vertexColors: true, transparent: true, opacity: 0.88 })
    );
    medParticles.position.copy(medHub.position);
    stage4Group.add(medParticles);
    container.add(stage4Group);

    // ─── ETAPA 5: Destellos festivos dorados de bienvenida ───
    const stage5Group = new THREE.Group();
    const welcomeArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.025, 12, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 })
    );
    welcomeArc.position.set(0, 1.5, -4.1);
    stage5Group.add(welcomeArc);
    container.add(stage5Group);

    const groups = [stage1Group, stage2Group, stage3Group, stage4Group, stage5Group];
    let activeStageIdx = 0;

    return {
      container,
      setStage(idx) {
        activeStageIdx = idx;
        groups.forEach((g, i) => {
          g.visible = i === idx;
        });
      },
      update(dt, elapsed) {
        if (activeStageIdx === 0) {
          portraitFrame.position.y = 1.52 + Math.sin(elapsed * 1.8) * 0.06;
          portraitFrame.rotation.y = 0.28 + Math.sin(elapsed * 0.9) * 0.08;
        } else if (activeStageIdx === 1) {
          stage2Nodes.forEach((n) => {
            n.knot.rotation.x = elapsed * 0.9 + n.phase;
            n.knot.rotation.y = elapsed * 1.25 + n.phase;
            n.wrap.position.y = n.baseY + Math.sin(elapsed * 1.9 + n.phase) * 0.08;
          });
        } else if (activeStageIdx === 2) {
          rovAnchor.position.y = 1.38 + Math.sin(elapsed * 1.6) * 0.08;
          rovAnchor.rotation.y = -0.35 + Math.sin(elapsed * 0.7) * 0.25;
          thrusters.forEach((t) => {
            t.rotation.z = elapsed * 14.0;
          });
          neuralGroup.rotation.y = elapsed * 0.45;
          neuralLineMats.forEach((nl) => {
            nl.mat.opacity = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * 4.5 + nl.offset));
          });
        } else if (activeStageIdx === 3) {
          medHub.rotation.y = elapsed * 0.75;
          scanRing.position.y = Math.sin(elapsed * 2.2) * 0.26;
          dnaGroup.rotation.y = -elapsed * 1.1;
          const posArr = pGeo.attributes.position.array;
          for (let i = 0; i < pCount; i++) {
            const seed = pSeeds[i];
            const a = seed.ang + elapsed * seed.speed;
            posArr[i * 3] = Math.cos(a) * seed.rad;
            posArr[i * 3 + 1] = seed.yBase + Math.sin(elapsed * 2.0 + i) * 0.14;
            posArr[i * 3 + 2] = Math.sin(a) * seed.rad;
          }
          pGeo.attributes.position.needsUpdate = true;
        } else if (activeStageIdx === 4) {
          welcomeArc.scale.setScalar(1 + Math.sin(elapsed * 2.8) * 0.03);
        }
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Panel UI 3D Flotante (Subtítulos + Botón "Siguiente Etapa")
  // ───────────────────────────────────────────────────────────────────────────

  function create3DExperiencePanel(parentGroup) {
    const panelGroup = new THREE.Group();
    panelGroup.name = 'unifranz-3d-ui-panel';
    panelGroup.position.set(0, 0.58, -1.78);
    panelGroup.rotation.x = -0.22;
    parentGroup.add(panelGroup);

    const subTex = makeCanvasTexture(1024, 340, (ctx, w, h) => {
      ctx.fillStyle = '#0d1321';
      ctx.fillRect(0, 0, w, h);
    });
    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.42, 0.48),
      new THREE.MeshBasicMaterial({ map: subTex, transparent: true, opacity: 0.94, side: THREE.DoubleSide })
    );
    panelGroup.add(panelMesh);

    const btnTex = makeCanvasTexture(420, 110, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#ffd166');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#0d1321';
      ctx.font = '800 34px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Siguiente Etapa ➔', w / 2, h / 2);
    });

    const nextButton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.16),
      new THREE.MeshBasicMaterial({ map: btnTex, side: THREE.DoubleSide })
    );
    nextButton.position.set(0, -0.34, 0.02);
    nextButton.name = 'unifranz-next-stage-btn';
    nextButton.userData.isNextStageButton = true;
    panelGroup.add(nextButton);

    function renderStageText(stage) {
      const canvas = subTex.image;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(13, 19, 33, 0.92)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = stage.themeColor || '#ffd166';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      // Barra superior de etapa
      ctx.fillStyle = stage.themeColor || '#ffd166';
      ctx.font = '700 28px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`ETAPA ${stage.number} / 05 · ${stage.title.toUpperCase()}`, 34, 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 21px "DM Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stage.audioTrack, w - 34, 48);

      // Línea divisoria
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(34, 68, w - 68, 2);

      // Envoltura de líneas para subtítulo 3D
      ctx.fillStyle = '#f8fafc';
      ctx.font = '500 32px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      const words = stage.subtitle.split(' ');
      let line = '';
      let y = 116;
      const maxWidth = w - 68;
      for (let i = 0; i < words.length; i++) {
        const test = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, 34, y);
          line = words[i];
          y += 44;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 34, y);

      subTex.needsUpdate = true;
    }

    return {
      panelGroup,
      nextButton,
      renderStageText
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ExperienceManager: Orquestador de las 5 Etapas, Avatar, Audio y Cámara
  // ───────────────────────────────────────────────────────────────────────────

  class ExperienceManager {
    constructor(options) {
      this.scene = options.scene;
      this.camera = options.camera;
      this.cameraRig = options.cameraRig || null;
      this.isAR = Boolean(options.isAR);
      this.renderer = options.renderer || null;
      this.audioEl = options.audioEl || document.getElementById('narration-audio');
      this.rootGroup = options.rootGroup || options.scene;

      this.currentStageIndex = 0;
      this.avatarRoot = null;
      this.mixer = null;
      this.actions = {};
      this.activeAction = null;
      this.headBone = null;
      this.headBaseQuat = null;
      this.positionalAudio = null;
      this.audioListener = null;
      this.elapsed = 0;
      this.stageElapsed = 0;
      this.nextGestureIndex = 0;
      this.activeGestureEnd = 0;
      this.holdGesture = false;
      this.mouthOpen = 0;
      this.mouthUniforms = [];
      this.blinkUniforms = [];
      this.blinkStartedAt = -1;
      this.nextBlinkAt = 3.2;
      this.arBreathBones = [];
      this.arNeckBone = null;
      this.arAppliedMicroOffsets = [];
      this.arLookTargetYaw = 0;
      this.arLookYaw = 0;
      this.arMicroEuler = new THREE.Euler();
      this.arMicroQuaternion = new THREE.Quaternion();
      this.arBasePosition = new THREE.Vector3(0, 0, -2.5);
      this.arBaseRotationY = 0;
      this.avatarLoaded = false;
      this.isDisposed = false;
      this.targetAvatarX = 0;
      this.cameraEnterLobby = false;
      this.initialRigPos = this.cameraRig ? this.cameraRig.position.clone() : new THREE.Vector3(0, 0, 0);

      // 1. Iluminación realista de cielo paceño
      setupLaPazLighting(this.rootGroup, this.renderer);

      // 2. Reconstrucción procedural de la fachada de UNIFRANZ La Paz
      this.facade = buildUnifranzFacade(this.rootGroup, this.isAR);

      // 3. Efectos 3D por etapa + UI 3D flotante
      this.effects = createStageEffects(this.rootGroup);
      this.ui3D = create3DExperiencePanel(this.rootGroup);

      // 4. Audio Posicional de Three.js originado en Franz Tamayo
      this.setupPositionalAudio();

      // 5. Cargar modelo oficial assets/models/FranzTamayoReal.glb
      this.loadAvatar();

      // 6. Iniciar en Etapa 1
      this.goToStage(0, false);
    }

    setupPositionalAudio() {
      if (!window.THREE || !this.audioEl) return;
      if (this.audioEl.getAttribute('src') !== MAIN_AUDIO_SRC) {
        this.audioEl.src = MAIN_AUDIO_SRC;
      }
      try {
        if (!THREE.AudioListener || !THREE.PositionalAudio) return;
        this.audioListener = new THREE.AudioListener();
        if (this.camera) this.camera.add(this.audioListener);
        this.positionalAudio = new THREE.PositionalAudio(this.audioListener);
        this.positionalAudio.setRefDistance(2.2);
        this.positionalAudio.setRolloffFactor(0.75);
        this.positionalAudio.position.set(0, 1.55, -2.5);

        if (!this.audioEl.__unifranzSourceNode) {
          this.positionalAudio.setMediaElementSource(this.audioEl);
          this.audioEl.__unifranzSourceNode = this.positionalAudio.source;
        } else {
          this.positionalAudio.setNodeSource(this.audioEl.__unifranzSourceNode);
        }
        this.rootGroup.add(this.positionalAudio);
      } catch (err) {
        console.warn('[Unifranz] Fallback a audio estándar sin WebAudio espacial:', err);
      }
    }

    setupARMouthAnimation(model) {
      if (!this.isAR) return;
      this.mouthUniforms = [];
      this.blinkUniforms = [];
      model.traverse((child) => {
        if (!child.isSkinnedMesh) return;
        const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
        const animatedMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone();
          material.onBeforeCompile = (shader) => {
            const commonChunk = '#include <common>';
            const skinningChunk = '#include <skinning_vertex>';
            const fragmentDitherChunk = '#include <dithering_fragment>';
            if (
              !shader.vertexShader.includes(commonChunk) ||
              !shader.vertexShader.includes(skinningChunk) ||
              !shader.fragmentShader.includes(commonChunk) ||
              !shader.fragmentShader.includes(fragmentDitherChunk)
            ) {
              console.warn('[Unifranz AR] El material de Franz no expone los puntos de inserción para animar la boca.');
              return;
            }

            const jawUniform = { value: this.mouthOpen };
            const blinkUniform = { value: 0 };
            this.mouthUniforms.push(jawUniform);
            this.blinkUniforms.push(blinkUniform);
            shader.uniforms.uARJawOpen = jawUniform;
            shader.uniforms.uAREyeBlink = blinkUniform;
            shader.vertexShader = shader.vertexShader.replace(
              commonChunk,
              `${commonChunk}\nuniform float uARJawOpen;\nuniform float uAREyeBlink;\nvarying float vARJawMask;`
            );
            shader.vertexShader = shader.vertexShader.replace(
              skinningChunk,
              `${skinningChunk}
float arMouthWidth = 1.0 - smoothstep(0.008, 0.026, abs(position.x));
float arMouthFront = 1.0 - smoothstep(-0.058, -0.032, position.z);
float arLowerJaw = smoothstep(0.842, 0.858, position.y) * (1.0 - smoothstep(0.874, 0.89, position.y));
float arUpperLip = smoothstep(0.874, 0.884, position.y) * (1.0 - smoothstep(0.896, 0.91, position.y));
float arMouthMask = arMouthWidth * arMouthFront;
transformed.y -= uARJawOpen * 0.026 * arLowerJaw * arMouthMask;
transformed.y += uARJawOpen * 0.006 * arUpperLip * arMouthMask;
transformed.z += uARJawOpen * 0.006 * arLowerJaw * arMouthMask;
float arLeftEye = 1.0 - smoothstep(0.009, 0.019, abs(position.x + 0.027));
float arRightEye = 1.0 - smoothstep(0.009, 0.019, abs(position.x - 0.027));
float arEyeHeight = 1.0 - smoothstep(0.009, 0.019, abs(position.y - 0.935));
float arEyeFront = smoothstep(0.025, 0.055, position.z);
float arBlinkMask = max(arLeftEye, arRightEye) * arEyeHeight * arEyeFront;
float arUpperEyelid = smoothstep(0.931, 0.943, position.y);
transformed.y -= uAREyeBlink * 0.012 * arBlinkMask * arUpperEyelid;
vARJawMask = uARJawOpen * arMouthMask * smoothstep(0.858, 0.872, position.y) * (1.0 - smoothstep(0.88, 0.891, position.y));`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              commonChunk,
              `${commonChunk}\nvarying float vARJawMask;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              fragmentDitherChunk,
              `gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.055, 0.018, 0.018), clamp(vARJawMask * 0.72, 0.0, 0.72));
${fragmentDitherChunk}`
            );
          };
          material.customProgramCacheKey = () => 'unifranz-ar-talking-mouth-blink-v2';
          material.needsUpdate = true;
          return material;
        });
        child.material = Array.isArray(child.material) ? animatedMaterials : animatedMaterials[0];
      });
    }

    updateARMouthAnimation(dt) {
      if (!this.isAR) return;
      const speaking = this.audioEl && !this.audioEl.paused;
      const syllable = Math.max(
        0,
        Math.sin(this.elapsed * 10.8) * 0.72 + Math.sin(this.elapsed * 6.4 + 1.1) * 0.28
      );
      const targetOpen = speaking ? 0.12 + syllable * 0.72 : 0;
      this.mouthOpen += (targetOpen - this.mouthOpen) * Math.min(1, dt * 13);
      this.mouthUniforms.forEach((uniform) => {
        uniform.value = this.mouthOpen;
      });
    }

    clearARMicroAnimationOffsets() {
      this.arAppliedMicroOffsets.forEach(({ bone, inverse }) => {
        bone.quaternion.multiply(inverse).normalize();
      });
      this.arAppliedMicroOffsets.length = 0;
    }

    applyARMicroOffset(bone, pitch, yaw, roll) {
      if (!bone) return;
      this.arMicroEuler.set(pitch, yaw, roll, 'XYZ');
      this.arMicroQuaternion.setFromEuler(this.arMicroEuler);
      bone.quaternion.multiply(this.arMicroQuaternion).normalize();
      this.arAppliedMicroOffsets.push({
        bone,
        inverse: this.arMicroQuaternion.clone().invert()
      });
    }

    updateARMicroAnimations(dt) {
      if (!this.isAR || !this.avatarRoot) return;

      if (this.blinkStartedAt < 0 && this.elapsed >= this.nextBlinkAt) {
        this.blinkStartedAt = this.elapsed;
        this.nextBlinkAt = this.elapsed + 2.8 + Math.random() * 2.2;
      }

      let blink = 0;
      if (this.blinkStartedAt >= 0) {
        const progress = (this.elapsed - this.blinkStartedAt) / 0.18;
        if (progress >= 1) {
          this.blinkStartedAt = -1;
        } else {
          const pulse = Math.sin(Math.PI * Math.max(0, progress));
          blink = pulse * pulse;
        }
      }
      this.blinkUniforms.forEach((uniform) => {
        uniform.value = blink;
      });

      const breathing = Math.sin(this.elapsed * 1.65) * 0.006;
      this.arBreathBones.forEach(({ bone, influence }) => {
        this.applyARMicroOffset(bone, breathing * influence, 0, 0);
      });

      const speaking = this.audioEl && !this.audioEl.paused;
      this.arLookYaw += (this.arLookTargetYaw - this.arLookYaw) * Math.min(1, dt * 2.2);
      const headPitch = Math.sin(this.elapsed * 0.42) * 0.018
        + (speaking ? Math.sin(this.elapsed * 2.7) * 0.012 : 0);
      const headYaw = Math.sin(this.elapsed * 0.31 + 0.7) * 0.025 + this.arLookYaw;
      this.applyARMicroOffset(this.arNeckBone, headPitch * 0.35, headYaw * 0.3, 0);
      this.applyARMicroOffset(this.headBone, headPitch * 0.65, headYaw * 0.7, 0);
    }

    loadAvatar() {
      const LoaderCtor = THREE.GLTFLoader || (window.AFRAME && AFRAME.THREE && AFRAME.THREE.GLTFLoader);
      if (!LoaderCtor) {
        console.warn('[Unifranz] THREE.GLTFLoader no está disponible aún.');
        return;
      }
      const loader = new LoaderCtor();
      if (THREE.DRACOLoader) {
        const draco = new THREE.DRACOLoader();
        draco.setDecoderPath(new URL('assets/draco/', window.location.href).href);
        loader.setDRACOLoader(draco);
      }

      loader.load(
        MAIN_MODEL_SRC,
        (gltf) => {
          if (this.isDisposed) return;
          const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!model) return;

          // Escalar a estatura real (~1.72 m) delante de las columnas en (0, 0, -2.5)
          const box = new THREE.Box3().setFromObject(model);
          const height = box.max.y - box.min.y;
          const targetHeight = 1.72;
          const scaleFactor = height > 0.05 ? targetHeight / height : 1.75;

          model.scale.setScalar(scaleFactor);
          model.position.set(0, 0, -2.5);
          // Mirando hacia la cámara del usuario en (0, 1.6, 0)
          model.lookAt(0, 0, 0);

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                if (!m) return;
                m.needsUpdate = true;
              });
            }
          });

          this.avatarRoot = model;
          this.arBasePosition.copy(model.position);
          this.arBaseRotationY = model.rotation.y;
          this.setupARMouthAnimation(model);
          this.rootGroup.add(model);

          // Configurar THREE.AnimationMixer con clips embebidos y/o procedurales
          this.mixer = new THREE.AnimationMixer(model);
          const clipPack = createAvatarAnimationClips(model);
          this.headBone = clipPack.headBone;
          if (this.headBone) this.headBaseQuat = this.headBone.quaternion.clone();
          const bonesByName = {};
          model.traverse((child) => {
            if (child.isBone) bonesByName[child.name] = child;
          });
          this.arNeckBone = bonesByName.mixamorigNeck || null;
          this.arBreathBones = [
            { bone: bonesByName.mixamorigSpine1, influence: 0.35 },
            { bone: bonesByName.mixamorigSpine2, influence: 0.65 }
          ].filter(({ bone }) => bone);

          const embeddedByName = {};
          (gltf.animations || []).forEach((clip) => {
            embeddedByName[clip.name] = clip;
          });

          [
            'saludar_01', 'acuerdo', 'hablar', 'invitar', 'presentarse', 'explicar',
            'enfatizar', 'presentarTecnologia', 'vision', 'robotica', 'salud',
            'ofrecer', 'reflexionar', 'paso_lateral', 'caminar',
            'mano_al_pecho', 'brazos_abiertos', 'senalar', 'paso_confiado',
            'dialogo_ambas_manos', 'cambio_peso', 'asentir', 'paso_firme'
          ].forEach((name) => {
            const clip = embeddedByName[name] || clipPack[name];
            if (clip) {
              this.actions[name] = this.mixer.clipAction(clip);
            }
          });

          this.avatarLoaded = true;
          this.playStageChoreography(this.currentStageIndex);
          window.dispatchEvent(new CustomEvent('unifranz:avatar-loaded', { detail: { model } }));
        },
        undefined,
        (err) => {
          console.error('[Unifranz] Error cargando FranzTamayoReal.glb:', err);
        }
      );
    }

    playClip(name, loop = true) {
      if (!this.mixer || !this.actions[name]) return;
      const next = this.actions[name];
      if (this.activeAction === next) return;
      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
      next.fadeIn(0.35).play();
      if (this.activeAction) {
        this.activeAction.fadeOut(0.35);
      }
      this.activeAction = next;
    }

    playStageChoreography(index) {
      const stage = UNIFRANZ_STAGES[index];
      if (!stage) return;
      this.stageElapsed = 0;
      this.nextGestureIndex = 0;
      this.activeGestureEnd = 0;
      this.holdGesture = false;

      // Posición lateral en Etapa 5 al ejecutar "invitar" y apertura de puertas
      this.targetAvatarX = !this.isAR && index === 4 ? -0.78 : 0;
      this.arLookTargetYaw = 0;
      this.arLookYaw = 0;
      if (this.isAR && this.avatarRoot) {
        this.avatarRoot.position.copy(this.arBasePosition);
        this.avatarRoot.rotation.y = this.arBaseRotationY;
      }
      this.facade.setDoorsOpen(index === 4);
      if (!this.isAR) {
        if (index === 4 && !this.cameraEnterLobby && this.cameraRig) {
          this.enterLobbyStartPos = this.cameraRig.position.clone();
        } else if (index !== 4 && this.cameraEnterLobby && this.cameraRig && this.enterLobbyStartPos) {
          this.cameraRig.position.copy(this.enterLobbyStartPos);
          this.enterLobbyStartPos = null;
        }
      }
      this.cameraEnterLobby = !this.isAR && index === 4;

      if (this.avatarLoaded) {
        const initialAnim = this.isAR ? stage.arInitialAnim : stage.initialAnim;
        const shouldLoopInitial = initialAnim === stage.loopAnim;
        this.playClip(initialAnim, shouldLoopInitial);
      }
    }

    getAudioWindowForStage(index) {
      const stage = UNIFRANZ_STAGES[index] || UNIFRANZ_STAGES[0];
      const realDur = (this.audioEl && Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0)
        ? this.audioEl.duration
        : DEFAULT_REF_DURATION;
      const start = (stage.nominalStart / DEFAULT_REF_DURATION) * realDur;
      const end = (stage.nominalEnd / DEFAULT_REF_DURATION) * realDur;
      return { start, end, realDur };
    }

    goToStage(index, seekAudio = false) {
      const clamped = Math.max(0, Math.min(UNIFRANZ_STAGES.length - 1, Number(index) || 0));
      this.currentStageIndex = clamped;
      const stage = UNIFRANZ_STAGES[clamped];

      this.effects.setStage(clamped);
      this.ui3D.renderStageText(stage);
      this.playStageChoreography(clamped);

      if (seekAudio && this.audioEl) {
        const { start } = this.getAudioWindowForStage(clamped);
        try {
          if (Math.abs(this.audioEl.currentTime - start) > 0.6) {
            this.audioEl.currentTime = start;
          }
        } catch (e) { /* media not yet seekable */ }
      }

      window.dispatchEvent(new CustomEvent('unifranz:stage-changed', {
        detail: { index: clamped, stage }
      }));
    }

    nextStage() {
      const next = (this.currentStageIndex + 1) % UNIFRANZ_STAGES.length;
      this.goToStage(next, true);
      if (this.audioEl && this.audioEl.paused) {
        this.playAudioFromCurrentStage();
      }
    }

    playAudioFromCurrentStage() {
      if (!this.audioEl) return;
      if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
        this.audioListener.context.resume().catch(() => {});
      }
      if (this.audioEl.getAttribute('src') !== MAIN_AUDIO_SRC) {
        this.audioEl.src = MAIN_AUDIO_SRC;
      }
      const { start } = this.getAudioWindowForStage(this.currentStageIndex);
      if (this.audioEl.readyState >= 1) {
        const { end } = this.getAudioWindowForStage(this.currentStageIndex);
        if (this.audioEl.currentTime < start || this.audioEl.currentTime >= end - 0.3) {
          this.audioEl.currentTime = start;
        }
      }
      return this.audioEl.play().catch((err) => {
        console.warn('[Unifranz] Reproducción bloqueada hasta interacción del usuario:', err);
      });
    }

    syncStageWithAudioTime() {
      if (!this.audioEl || this.audioEl.paused || !Number.isFinite(this.audioEl.duration) || this.audioEl.duration <= 0) {
        return;
      }
      const ratio = this.audioEl.currentTime / this.audioEl.duration;
      const nominalSec = ratio * DEFAULT_REF_DURATION;
      const detected = UNIFRANZ_STAGES.findIndex((s) => nominalSec >= s.nominalStart && nominalSec < s.nominalEnd);
      if (detected !== -1 && detected !== this.currentStageIndex) {
        this.goToStage(detected, false);
      }
    }

    getStageElapsed(stage) {
      if (this.audioEl && !this.audioEl.paused && Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
        const nominalTime = (this.audioEl.currentTime / this.audioEl.duration) * DEFAULT_REF_DURATION;
        return Math.max(0, nominalTime - stage.nominalStart);
      }
      return this.stageElapsed;
    }

    updateStageChoreography(stage, elapsed) {
      if (!this.avatarLoaded) return;
      const narrationPlaying = this.audioEl && !this.audioEl.paused;
      if (!this.isAR) {
        if (
          !this.activeGestureEnd &&
          stage.initialAnim !== stage.loopAnim &&
          this.stageElapsed >= stage.initialAnimDuration
        ) {
          this.playClip(stage.loopAnim, true);
        }
        return;
      }
      if (!narrationPlaying) {
        if (
          !this.activeGestureEnd &&
          !this.holdGesture &&
          stage.initialAnim !== stage.loopAnim &&
          this.stageElapsed >= stage.initialAnimDuration
        ) {
          this.playClip(stage.loopAnim, true);
        }
        return;
      }

      const cues = stage.arCues || [];
      while (this.nextGestureIndex < cues.length && elapsed >= cues[this.nextGestureIndex].at) {
        const cue = cues[this.nextGestureIndex++];
        const action = this.actions[cue.clip];
        const duration = action ? action.getClip().duration : 0;
        if (elapsed >= cue.at + duration && !cue.hold) continue;

        this.arLookTargetYaw = cue.lookYaw || 0;
        this.holdGesture = Boolean(cue.hold);
        this.activeGestureEnd = cue.hold ? Infinity : cue.at + duration;
        this.playClip(cue.clip, false);
      }

      if (this.holdGesture) return;
      if (this.activeGestureEnd && elapsed >= this.activeGestureEnd) {
        this.activeGestureEnd = 0;
        this.arLookTargetYaw = 0;
        this.playClip(stage.loopAnim, true);
      } else if (
        !this.activeGestureEnd &&
        stage.initialAnim !== stage.loopAnim &&
        elapsed >= stage.initialAnimDuration
      ) {
        this.playClip(stage.loopAnim, true);
      }
    }

    handlePointerClick(ndcX, ndcY) {
      if (!this.camera || !window.THREE) return false;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hits = raycaster.intersectObject(this.ui3D.nextButton, true);
      if (hits.length > 0) {
        this.nextStage();
        return true;
      }
      return false;
    }

    update(dt) {
      if (this.isDisposed) return;
      const safeDt = Math.min(dt || 0.016, 0.05);
      this.elapsed += safeDt;
      this.stageElapsed += safeDt;

      // Sincronizar cambio automático de etapa con el progreso de DIscursoPrincipal.mp3
      this.syncStageWithAudioTime();

      const stage = UNIFRANZ_STAGES[this.currentStageIndex];
      if (stage) this.updateStageChoreography(stage, this.getStageElapsed(stage));
      this.clearARMicroAnimationOffsets();
      if (this.mixer) {
        this.mixer.update(safeDt);
      }
      if (this.isAR && this.avatarRoot) {
        this.avatarRoot.position.copy(this.arBasePosition);
        this.avatarRoot.rotation.y = this.arBaseRotationY;
      }
      this.updateARMouthAnimation(safeDt);
      this.updateARMicroAnimations(safeDt);

      // Paso lateral suave en Etapa 5 (invitar) + ligera modulación facial/cabeza al hablar
      if (this.avatarRoot && !this.isAR) {
        this.avatarRoot.position.x += (this.targetAvatarX - this.avatarRoot.position.x) * Math.min(1, safeDt * 2.5);
        if (this.audioEl && !this.audioEl.paused && this.headBone && this.headBaseQuat) {
          this.headBone.rotation.x += Math.sin(this.elapsed * 11.5) * 0.014;
        }
      }

      // Avance suave de la cámara hacia el interior del vestíbulo en la Etapa 5
      if (this.cameraRig && this.cameraEnterLobby && this.enterLobbyStartPos) {
        const anchorQuat = new THREE.Quaternion();
        this.rootGroup.getWorldQuaternion(anchorQuat);
        const intoLobby = new THREE.Vector3(0, 0, -1).applyQuaternion(anchorQuat);
        intoLobby.y = 0;
        if (intoLobby.lengthSq() > 0.0001) intoLobby.normalize();
        const targetPos = this.enterLobbyStartPos.clone().addScaledVector(intoLobby, 1.85);
        this.cameraRig.position.lerp(targetPos, Math.min(1, safeDt * 0.72));
      }

      this.facade.update(safeDt, this.elapsed);
      this.effects.update(safeDt, this.elapsed);
    }

    dispose() {
      this.isDisposed = true;
      if (this.mixer) this.mixer.stopAllAction();
      if (this.positionalAudio && this.positionalAudio.parent) {
        this.positionalAudio.parent.remove(this.positionalAudio);
      }
      if (this.audioListener && this.audioListener.parent) {
        this.audioListener.parent.remove(this.audioListener);
      }
      if (this.facade?.group?.parent) this.facade.group.parent.remove(this.facade.group);
      if (this.effects?.container?.parent) this.effects.container.parent.remove(this.effects.container);
      if (this.ui3D?.panelGroup?.parent) this.ui3D.panelGroup.parent.remove(this.ui3D.panelGroup);
      if (this.avatarRoot?.parent) this.avatarRoot.parent.remove(this.avatarRoot);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Componente A-Frame puente para integrar Three.js en #pokear-scene y #vr-scene
  // ───────────────────────────────────────────────────────────────────────────

  if (window.AFRAME && !AFRAME.components['unifranz-welcome-experience']) {
    AFRAME.registerComponent('unifranz-welcome-experience', {
      schema: {
        stage: { type: 'int', default: 0 },
        active: { type: 'boolean', default: true },
        rigSelector: { type: 'string', default: '#pokear-camera-rig' },
        cameraSelector: { type: 'string', default: '#pokear-camera' }
      },

      init() {
        const sceneEl = this.el.sceneEl;
        const camEl = sceneEl && sceneEl.querySelector(this.data.cameraSelector);
        const rigEl = sceneEl && sceneEl.querySelector(this.data.rigSelector);
        const camera = (camEl && camEl.getObject3D('camera')) || sceneEl?.camera || null;
        const rigObj = rigEl ? rigEl.object3D : null;

        this.manager = new ExperienceManager({
          scene: sceneEl.object3D,
          renderer: sceneEl.renderer,
          camera,
          cameraRig: rigObj,
          rootGroup: this.el.object3D,
          isAR: this.data.rigSelector === '#pokear-camera-rig',
          audioEl: document.getElementById('narration-audio') || document.getElementById('vr-scene-audio')
        });

        window.UnifranzActiveManager = this.manager;

        this.onSceneLoaded = () => {
          const loadedCam = (camEl && camEl.getObject3D('camera')) || sceneEl.camera;
          if (loadedCam) this.manager.camera = loadedCam;
          if (sceneEl.renderer) setupLaPazLighting(this.el.object3D, sceneEl.renderer);
        };
        if (sceneEl) {
          sceneEl.addEventListener('loaded', this.onSceneLoaded);
        }
      },

      update(oldData) {
        if (!this.manager) return;
        if (oldData.stage !== this.data.stage) {
          this.manager.goToStage(this.data.stage, false);
        }
      },

      tick(time, delta) {
        if (!this.data.active || !this.manager) return;
        this.manager.update((delta || 16) / 1000);
      },

      remove() {
        if (this.el.sceneEl && this.onSceneLoaded) {
          this.el.sceneEl.removeEventListener('loaded', this.onSceneLoaded);
        }
        if (this.manager) {
          this.manager.dispose();
          if (window.UnifranzActiveManager === this.manager) {
            window.UnifranzActiveManager = null;
          }
          this.manager = null;
        }
      }
    });
  }

  window.UnifranzSystem = {
    MAIN_AUDIO_SRC,
    MAIN_MODEL_SRC,
    DEFAULT_REF_DURATION,
    UNIFRANZ_STAGES,
    buildUnifranzFacade,
    setupLaPazLighting,
    createWebXRButton,
    ExperienceManager
  };
})();
