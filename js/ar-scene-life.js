/**
 * Historia Viva · Vida animada de las escenas AR de Franz Tamayo
 * ---------------------------------------------------------------------------
 * Componente `ar-scene-life`: construye, cerca de Franz Tamayo (radio ≈ 1.2–2 m),
 * objetos animados propios de cada escena. Todo vive dentro del ancla del mundo,
 * de modo que permanece fijo en su sitio mientras el visitante camina alrededor.
 *
 *  Escena 1 · El Despertar (1879): espiral de partículas doradas, pergamino con
 *             pluma que escribe, reloj de bolsillo con manecillas, páginas que
 *             revolotean y un cóndor andino sobrevolando.
 *  Escena 2 · Pedagogía Nacional (1910): pizarra que se escribe sola, globo
 *             terráqueo girando, libros que orbitan abriéndose y estudiante leyendo.
 *  Escena 3 · Fundación UNIFRANZ (1990–1993): la casona se construye ladrillo a
 *             ladrillo, corte de cinta inaugural, confeti y estudiantes caminando.
 *  Escena 4 · Crecimiento (4 sedes): holomapa en el suelo con 4 faros, haces de luz
 *             viajando entre sedes y aviones de papel volando.
 *  Escena 5 · El Legado: birretes lanzados al aire, fuegos artificiales,
 *             holograma del conocimiento, dron y graduados celebrando.
 *
 * Coordenadas locales del ancla: Franz Tamayo en el origen mirando hacia +Z
 * (donde está el visitante). Nada se coloca delante de él para no taparlo.
 */
(function () {
  'use strict';

  if (!window.AFRAME || !window.THREE || AFRAME.components['ar-scene-life']) return;

  const TAU = Math.PI * 2;

  function canvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    texture.userData = { canvas, ctx };
    return texture;
  }

  function std(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.1 }, extra || {}));
  }

  function glow(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opacity == null ? 0.85 : opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  function faceUser(object, x, z) {
    // Orienta el objeto hacia el visitante (ubicado delante de Franz, en +Z)
    object.rotation.y = Math.atan2(-x, 2.4 - z);
  }

  function makeParticles(count, size, color) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const material = new THREE.PointsMaterial({
      size,
      color: color || '#ffffff',
      vertexColors: !color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    if (!color) geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  function disposeTree(object) {
    object.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material) return;
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
  }

  AFRAME.registerComponent('ar-scene-life', {
    schema: {
      scene: { type: 'int', default: 0 },
      active: { default: true }
    },

    init() {
      this.t = 0;
      this.root = new THREE.Group();
      this.groups = [];
      this.updaters = [];
      this.npcs = [];
      this.buildGroundShadow();
      [this.buildScene1, this.buildScene2, this.buildScene3, this.buildScene4, this.buildScene5].forEach((builder, index) => {
        const group = new THREE.Group();
        group.visible = false;
        this.groups.push(group);
        this.updaters.push([]);
        this.root.add(group);
        builder.call(this, group, this.updaters[index], index);
      });
      this.el.setObject3D('scene-life', this.root);
      this.applyVisibility();
    },

    update() {
      this.applyVisibility();
    },

    remove() {
      this.el.removeObject3D('scene-life');
      disposeTree(this.root);
      this.npcs.forEach((npc) => npc.el.remove());
    },

    setScene(index) {
      this.el.setAttribute('ar-scene-life', 'scene', Math.max(0, Math.min(4, Number(index) || 0)));
    },

    applyVisibility() {
      const active = this.data.active;
      this.root.visible = active;
      this.groups.forEach((group, index) => {
        group.visible = active && index === this.data.scene;
      });
      this.npcs.forEach((npc) => {
        npc.el.setAttribute('visible', String(active && npc.scene === this.data.scene));
      });
      this.sceneStart = this.t;
    },

    addNPC(sceneIndex, attrs) {
      const el = document.createElement('a-entity');
      el.setAttribute('npc-person', attrs);
      el.setAttribute('visible', 'false');
      this.el.appendChild(el);
      this.npcs.push({ el, scene: sceneIndex });
      return el;
    },

    /* ── Sombra de contacto bajo Franz para que se vea apoyado en el suelo real ── */
    buildGroundShadow() {
      const texture = canvasTexture(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(0,0,0,0.55)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.25)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.004;
      this.root.add(shadow);
    },

    /* ═════════════ ESCENA 1 · EL DESPERTAR (1879) ═════════════ */
    buildScene1(group, updaters) {
      // Espiral de partículas doradas que asciende alrededor de Franz
      const spiralCount = 140;
      const spiral = makeParticles(spiralCount, 0.035, '#ffd166');
      const seeds = Array.from({ length: spiralCount }, (_, i) => ({ a: (i / spiralCount) * TAU * 3, s: Math.random() }));
      group.add(spiral);
      updaters.push((T) => {
        const pos = spiral.geometry.attributes.position.array;
        for (let i = 0; i < spiralCount; i++) {
          const k = (seeds[i].s + T * 0.12) % 1;
          const a = seeds[i].a + T * 0.9;
          const r = 0.55 + 0.12 * Math.sin(k * TAU * 2);
          pos[i * 3] = Math.cos(a) * r;
          pos[i * 3 + 1] = k * 2.3;
          pos[i * 3 + 2] = Math.sin(a) * r;
        }
        spiral.geometry.attributes.position.needsUpdate = true;
      });

      // Pergamino flotante con pluma que escribe sola (izquierda)
      const scrollGroup = new THREE.Group();
      scrollGroup.position.set(-1.05, 1.15, 0.25);
      faceUser(scrollGroup, -1.05, 0.25);
      const parchment = canvasTexture(256, 320, (ctx, w, h) => {
        ctx.fillStyle = '#f3e3bf';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,80,30,0.35)';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#4a2c12';
        ctx.font = 'bold 26px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('Odas', w / 2, 52);
        ctx.font = 'italic 18px Georgia';
        ctx.fillText('Franz Tamayo · 1898', w / 2, 80);
      });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: parchment, roughness: 0.9, side: THREE.DoubleSide }));
      const rollTop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 12), std('#d9c08a'));
      rollTop.rotation.z = Math.PI / 2;
      rollTop.position.y = 0.27;
      const rollBottom = rollTop.clone();
      rollBottom.position.y = -0.27;
      // Líneas de tinta que aparecen progresivamente
      const inkLines = [];
      for (let i = 0; i < 6; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.012), new THREE.MeshBasicMaterial({ color: '#2b1a0c' }));
        line.position.set(0, 0.08 - i * 0.055, 0.002);
        line.scale.x = 0.001;
        inkLines.push(line);
        scrollGroup.add(line);
      }
      const quill = new THREE.Group();
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.32, 8), std('#fdf8ec', { roughness: 0.5 }));
      feather.position.y = 0.16;
      const nib = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.05, 6), std('#1f2937', { metalness: 0.6 }));
      nib.rotation.x = Math.PI;
      quill.add(feather, nib);
      quill.rotation.z = -0.5;
      scrollGroup.add(sheet, rollTop, rollBottom, quill);
      group.add(scrollGroup);
      updaters.push((T) => {
        const cycle = (T % 9) / 9;
        const lineIndex = Math.min(5, Math.floor(cycle * 6.6));
        inkLines.forEach((line, i) => {
          const local = i < lineIndex ? 1 : i === lineIndex ? (cycle * 6.6) % 1 : 0;
          line.scale.x = Math.max(0.001, cycle > 0.94 ? 1 - (cycle - 0.94) * 16 : local);
          line.position.x = -0.15 + 0.15 * line.scale.x;
        });
        const lineProgress = (cycle * 6.6) % 1;
        quill.position.set(-0.15 + lineProgress * 0.3, 0.1 - lineIndex * 0.055 + Math.abs(Math.sin(T * 18)) * 0.01, 0.04);
        scrollGroup.position.y = 1.15 + Math.sin(T * 1.4) * 0.04;
      });

      // Reloj de bolsillo dorado con manecillas en movimiento (derecha)
      const watch = new THREE.Group();
      watch.position.set(1.05, 1.3, 0.2);
      faceUser(watch, 1.05, 0.2);
      const gold = std('#d4a338', { metalness: 0.9, roughness: 0.25, emissive: '#3d2a05', emissiveIntensity: 0.3 });
      const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 32), gold);
      caseMesh.rotation.x = Math.PI / 2;
      const face = canvasTexture(256, 256, (ctx, w) => {
        ctx.fillStyle = '#fbf6e9';
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, w / 2 - 4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2b1a0c';
        ctx.font = 'bold 28px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ['XII', 'III', 'VI', 'IX'].forEach((n, i) => {
          const a = (i / 4) * TAU - Math.PI / 2;
          ctx.fillText(n, w / 2 + Math.cos(a) * 92, w / 2 + Math.sin(a) * 92);
        });
      });
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshBasicMaterial({ map: face }));
      dial.position.z = 0.021;
      const handMat = new THREE.MeshBasicMaterial({ color: '#1f1308' });
      const hourHand = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.07), handMat);
      hourHand.geometry.translate(0, 0.035, 0);
      hourHand.position.z = 0.023;
      const minuteHand = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.11), handMat);
      minuteHand.geometry.translate(0, 0.055, 0);
      minuteHand.position.z = 0.024;
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), gold);
      crown.position.y = 0.19;
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.004, 6, 48, Math.PI), gold);
      chain.position.y = 0.2;
      chain.rotation.z = Math.PI;
      watch.add(caseMesh, dial, hourHand, minuteHand, crown, chain);
      group.add(watch);
      updaters.push((T) => {
        minuteHand.rotation.z = -T * 1.2;
        hourHand.rotation.z = -T * 0.1;
        watch.position.y = 1.3 + Math.sin(T * 1.7 + 1) * 0.05;
        watch.rotation.z = Math.sin(T * 1.1) * 0.12;
      });

      // Páginas de poesía revoloteando alrededor
      const pageMat = new THREE.MeshStandardMaterial({ color: '#fbf3dc', roughness: 0.9, side: THREE.DoubleSide });
      const pages = [];
      for (let i = 0; i < 7; i++) {
        const page = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.21), pageMat);
        page.userData = { a: (i / 7) * TAU, h: 1.4 + (i % 3) * 0.28, r: 1.3 + (i % 2) * 0.2 };
        pages.push(page);
        group.add(page);
      }
      updaters.push((T) => {
        pages.forEach((page, i) => {
          const d = page.userData;
          const a = d.a + T * 0.35;
          page.position.set(Math.cos(a) * d.r, d.h + Math.sin(T * 2 + i) * 0.12, Math.sin(a) * d.r - 0.3);
          page.rotation.set(Math.sin(T * 3 + i) * 0.8, -a, Math.cos(T * 2.4 + i) * 0.5);
        });
      });

      // Cóndor andino sobrevolando
      group.add(this.makeCondor(updaters, 1.9, 2.6, 0.45));
    },

    makeCondor(updaters, radius, height, speed) {
      const condor = new THREE.Group();
      const black = std('#15151a', { roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), black);
      body.scale.set(0.8, 0.7, 1.8);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.018, 6, 12), std('#f5f5f4'));
      collar.position.z = 0.12;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std('#b4534b'));
      head.position.z = 0.17;
      const wingGeometry = new THREE.PlaneGeometry(0.55, 0.16);
      wingGeometry.translate(0.275, 0, 0);
      const wingMat = new THREE.MeshStandardMaterial({ color: '#1c1917', side: THREE.DoubleSide, roughness: 0.85 });
      const wingL = new THREE.Mesh(wingGeometry, wingMat);
      wingL.rotation.x = -Math.PI / 2;
      const wingR = new THREE.Mesh(wingGeometry, wingMat);
      wingR.rotation.set(-Math.PI / 2, Math.PI, 0);
      condor.add(body, collar, head, wingL, wingR);
      updaters.push((T) => {
        const a = T * speed;
        condor.position.set(Math.cos(a) * radius, height + Math.sin(T * 0.8) * 0.15, Math.sin(a) * radius - 0.4);
        condor.rotation.y = -a;
        condor.rotation.z = 0.25;
        const flap = Math.sin(T * 3.2) * 0.35;
        wingL.rotation.y = flap;
        wingR.rotation.y = Math.PI - flap;
      });
      return condor;
    },

    /* ═════════════ ESCENA 2 · PEDAGOGÍA NACIONAL (1910) ═════════════ */
    buildScene2(group, updaters) {
      const wood = std('#5b3a1f', { roughness: 0.75 });

      // Pizarra en caballete que se escribe sola (izquierda)
      const board = new THREE.Group();
      board.position.set(-1.15, 0, 0.15);
      faceUser(board, -1.15, 0.15);
      const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
      [[-0.32, 0.12], [0.32, 0.12], [0, -0.3]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, wood);
        leg.position.set(x, 0.72, z);
        leg.rotation.x = z < 0 ? -0.22 : 0.06;
        board.add(leg);
      });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.62, 0.04), wood);
      frame.position.set(0, 1.12, 0.16);
      frame.rotation.x = -0.08;
      const lines = ['Pedagogía', 'Nacional · 1910', '', '«Educar es formar', 'el carácter»'];
      const fullText = lines.join('\n');
      const chalk = canvasTexture(512, 360, () => {});
      const drawChalk = (count) => {
        const { ctx } = chalk.userData;
        ctx.fillStyle = '#1f3b2d';
        ctx.fillRect(0, 0, 512, 360);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 512, Math.random() * 360, 30, 2);
        ctx.fillStyle = '#f1f5f0';
        ctx.font = '44px "Comic Sans MS", "Segoe Print", cursive';
        let shown = 0;
        fullText.slice(0, count).split('\n').forEach((line, i) => {
          ctx.fillText(line, 28, 64 + i * 62);
          shown += line.length;
        });
        chalk.needsUpdate = true;
        return shown;
      };
      drawChalk(0);
      const slate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.56), new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.95 }));
      slate.position.set(0, 1.12, 0.185);
      slate.rotation.x = -0.08;
      const chalkStick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), std('#ffffff'));
      chalkStick.rotation.z = Math.PI / 2.5;
      board.add(frame, slate, chalkStick);
      group.add(board);
      let lastCount = -1;
      updaters.push((T) => {
        const cycle = (T % 12) / 12;
        const count = Math.floor(Math.min(1, cycle / 0.8) * fullText.length);
        if (count !== lastCount) {
          lastCount = count;
          drawChalk(count);
        }
        const lineIdx = fullText.slice(0, count).split('\n').length - 1;
        const lastLine = fullText.slice(0, count).split('\n').pop() || '';
        chalkStick.position.set(-0.36 + Math.min(0.7, lastLine.length * 0.036), 1.35 - lineIdx * 0.097 + Math.sin(T * 20) * 0.004, 0.21);
      });

      // Globo terráqueo antiguo girando sobre su soporte (derecha)
      const globeStand = new THREE.Group();
      globeStand.position.set(1.15, 0, 0.1);
      const brass = std('#b98a2c', { metalness: 0.85, roughness: 0.3 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 20), wood);
      base.position.y = 0.03;
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.85, 10), wood);
      column.position.y = 0.48;
      const earthTexture = canvasTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#d9c79a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8a6a3a';
        const blobs = [[90, 90, 60, 45], [130, 170, 35, 55], [260, 80, 70, 40], [280, 150, 40, 60], [390, 90, 80, 45], [420, 190, 35, 22]];
        blobs.forEach(([x, y, rx, ry]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, 0.3, 0, TAU);
          ctx.fill();
        });
        ctx.strokeStyle = 'rgba(60,40,20,0.35)';
        for (let i = 1; i < 8; i++) {
          ctx.beginPath(); ctx.moveTo(0, (h / 8) * i); ctx.lineTo(w, (h / 8) * i); ctx.stroke();
          ctx.beginPath(); ctx.moveTo((w / 8) * i, 0); ctx.lineTo((w / 8) * i, h); ctx.stroke();
        }
      });
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.6 }));
      globe.position.y = 1.08;
      globe.rotation.z = 0.41;
      const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.008, 8, 48), brass);
      meridian.position.y = 1.08;
      meridian.rotation.z = 0.41;
      globeStand.add(base, column, globe, meridian);
      group.add(globeStand);
      updaters.push((T, dt) => {
        globe.rotateOnAxis(new THREE.Vector3(0, 1, 0), dt * 0.6);
      });

      // Libros que orbitan alrededor de Franz abriéndose y cerrándose
      const colors = ['#7f1d1d', '#1e3a8a', '#14532d', '#78350f'];
      const books = colors.map((color, i) => {
        const book = new THREE.Group();
        const coverMat = std(color, { roughness: 0.6 });
        const pagesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.22), std('#f8f1dc'));
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.23), coverMat);
        back.position.y = -0.018;
        const coverPivot = new THREE.Group();
        coverPivot.position.set(-0.085, 0.018, 0);
        const cover = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.23), coverMat);
        cover.position.x = 0.085;
        coverPivot.add(cover);
        book.add(pagesMesh, back, coverPivot);
        book.userData = { a: (i / colors.length) * TAU, coverPivot };
        group.add(book);
        return book;
      });
      updaters.push((T) => {
        books.forEach((book, i) => {
          const a = book.userData.a + T * 0.4;
          book.position.set(Math.cos(a) * 0.95, 1.55 + Math.sin(T * 1.3 + i) * 0.1, Math.sin(a) * 0.95 - 0.35);
          book.rotation.set(0.5, -a, 0.2);
          book.userData.coverPivot.rotation.z = -(0.2 + 1.2 * (0.5 + 0.5 * Math.sin(T * 1.6 + i)));
        });
      });

      // Pupitre escolar de 1910 y estudiante leyendo (detrás a la izquierda)
      const desk = new THREE.Group();
      desk.position.set(-0.75, 0, -0.95);
      desk.rotation.y = 0.5;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.4), wood);
      top.position.y = 0.72;
      top.rotation.x = 0.12;
      [[-0.26, -0.16], [0.26, -0.16], [-0.26, 0.16], [0.26, 0.16]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.7, 0.035), std('#2b2b2b', { metalness: 0.5 }));
        leg.position.set(x, 0.35, z);
        desk.add(leg);
      });
      const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 12), std('#0f172a', { metalness: 0.5, roughness: 0.2 }));
      inkwell.position.set(0.2, 0.77, -0.1);
      desk.add(top, inkwell);
      group.add(desk);
      this.addNPC(1, 'mode: idle; facing: 0.5; prop: book; shirt: #7c2d12; pants: #1f2937; skin: #c68a4c; scale: 0.9');
      const reader = this.npcs[this.npcs.length - 1].el;
      reader.setAttribute('position', '-0.75 0 -0.55');
      this.addNPC(1, 'mode: circle; center: 0 0 -0.3; radius: 2.15; speed: 0.35; phase: 1.2; prop: backpack; shirt: #1d4ed8; pants: #111827; skin: #a77c58; scale: 0.92');
    },

    /* ═════════════ ESCENA 3 · FUNDACIÓN UNIFRANZ (1990–1993) ═════════════ */
    buildScene3(group, updaters) {
      // Casona fundacional que se construye ladrillo a ladrillo (derecha)
      const house = new THREE.Group();
      house.position.set(1.2, 0, 0.05);
      faceUser(house, 1.2, 0.05);
      const brickMat = std('#efe6d2', { roughness: 0.9 });
      const brickGeometry = new THREE.BoxGeometry(0.11, 0.07, 0.11);
      const bricks = [];
      const cols = 5;
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isDoor = r < 3 && c === 2;
          if (isDoor) continue;
          const brick = new THREE.Mesh(brickGeometry, (r === 3 && c % 2 === 1) ? std('#fde68a', { emissive: '#f59e0b', emissiveIntensity: 0.6 }) : brickMat);
          brick.position.set((c - 2) * 0.115 + (r % 2 ? 0.02 : 0), 0.035 + r * 0.075, 0);
          brick.scale.setScalar(0.001);
          bricks.push(brick);
          house.add(brick);
        }
      }
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.02), std('#5b3a1f'));
      door.position.set(0, 0.11, 0.05);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.24, 4), std('#9a3412', { roughness: 0.7 }));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.6;
      roof.scale.setScalar(0.001);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.1),
        new THREE.MeshBasicMaterial({
          map: canvasTexture(256, 56, (ctx, w, h) => {
            ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#fde68a'; ctx.font = 'bold 30px Georgia'; ctx.textAlign = 'center';
            ctx.fillText('UNIFRANZ 1993', w / 2, 38);
          })
        })
      );
      sign.position.set(0, 0.82, 0.02);
      sign.scale.setScalar(0.001);
      house.add(door, roof, sign);
      group.add(house);
      updaters.push((T) => {
        const cycle = (T % 11) / 11;
        const build = Math.min(1, cycle / 0.65);
        const fade = cycle > 0.92 ? 1 - (cycle - 0.92) / 0.08 : 1;
        bricks.forEach((brick, i) => {
          const start = i / bricks.length;
          const k = Math.max(0, Math.min(1, (build - start) * bricks.length * 0.6));
          const pop = k < 1 ? k * (1 + 0.3 * Math.sin(k * Math.PI)) : 1;
          brick.scale.setScalar(Math.max(0.001, pop * fade));
          brick.position.z = (1 - k) * 0.25;
        });
        const roofK = Math.max(0.001, Math.min(1, (cycle - 0.66) / 0.08)) * fade;
        roof.scale.setScalar(Math.max(0.001, roofK));
        sign.scale.setScalar(Math.max(0.001, Math.min(1, (cycle - 0.74) / 0.06) * fade));
      });

      // Corte de cinta inaugural con postes dorados (izquierda)
      const ribbon = new THREE.Group();
      ribbon.position.set(-1.15, 0, 0.15);
      faceUser(ribbon, -1.15, 0.15);
      const postMat = std('#c9a227', { metalness: 0.85, roughness: 0.3 });
      [-0.4, 0.4].forEach((x) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.95, 12), postMat);
        post.position.set(x, 0.475, 0);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), postMat);
        knob.position.set(x, 0.97, 0);
        ribbon.add(post, knob);
      });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5, side: THREE.DoubleSide });
      const halfGeometry = new THREE.PlaneGeometry(0.4, 0.07);
      halfGeometry.translate(0.2, 0, 0);
      const leftHalf = new THREE.Mesh(halfGeometry, ribbonMat);
      leftHalf.position.set(-0.4, 0.88, 0);
      const rightHalf = new THREE.Mesh(halfGeometry, ribbonMat);
      rightHalf.position.set(0.4, 0.88, 0);
      rightHalf.rotation.y = Math.PI;
      const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.035, 0.012, 32, 6), ribbonMat);
      bow.position.set(0, 0.88, 0.01);
      const scissors = new THREE.Group();
      const bladeMat = std('#d1d5db', { metalness: 0.95, roughness: 0.15 });
      const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.005), bladeMat);
      bladeA.geometry.translate(0.07, 0, 0);
      const bladeB = bladeA.clone();
      scissors.add(bladeA, bladeB);
      scissors.position.set(-0.08, 0.88, 0.05);
      ribbon.add(leftHalf, rightHalf, bow, scissors);
      group.add(ribbon);

      // Confeti que estalla tras el corte de cinta
      const confettiCount = 160;
      const confetti = makeParticles(confettiCount, 0.035);
      const palette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#fde047'].map((c) => new THREE.Color(c));
      const confettiColors = confetti.geometry.attributes.color.array;
      const velocities = [];
      for (let i = 0; i < confettiCount; i++) {
        const color = palette[i % palette.length];
        confettiColors[i * 3] = color.r; confettiColors[i * 3 + 1] = color.g; confettiColors[i * 3 + 2] = color.b;
        const a = Math.random() * TAU;
        const s = 0.6 + Math.random() * 1.2;
        velocities.push(new THREE.Vector3(Math.cos(a) * s * 0.6, 1.8 + Math.random() * 1.6, Math.sin(a) * s * 0.6));
      }
      confetti.geometry.attributes.color.needsUpdate = true;
      group.add(confetti);
      updaters.push((T) => {
        const cycle = (T % 7) / 7;
        // Tijeras se cierran y la cinta se corta a mitad del ciclo
        const snip = cycle > 0.35 && cycle < 0.45 ? Math.sin((cycle - 0.35) / 0.1 * Math.PI * 3) : 0;
        bladeA.rotation.z = 0.35 + snip * 0.3;
        bladeB.rotation.z = -0.35 - snip * 0.3;
        const cut = Math.max(0, Math.min(1, (cycle - 0.45) / 0.15));
        leftHalf.rotation.z = -cut * 1.25;
        rightHalf.rotation.z = cut * 1.25;
        bow.visible = cut < 0.1;
        scissors.visible = cycle < 0.5;
        // Confeti
        const pos = confetti.geometry.attributes.position.array;
        const t = (cycle - 0.45) * 7;
        confetti.visible = t > 0 && t < 3.6;
        if (confetti.visible) {
          for (let i = 0; i < confettiCount; i++) {
            const v = velocities[i];
            pos[i * 3] = -1.15 + v.x * t + Math.sin(t * 4 + i) * 0.05;
            pos[i * 3 + 1] = Math.max(0.02, 0.9 + v.y * t - 2.6 * t * t * 0.5);
            pos[i * 3 + 2] = 0.15 + v.z * t;
          }
          confetti.geometry.attributes.position.needsUpdate = true;
          confetti.material.opacity = Math.min(1, (3.6 - t) / 0.8);
        }
      });

      // Placa holográfica de los fundadores, sobre la cabeza de Franz
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.24),
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          map: canvasTexture(512, 136, (ctx, w, h) => {
            ctx.fillStyle = 'rgba(20,12,4,0.78)'; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.fillStyle = '#fde68a'; ctx.textAlign = 'center';
            ctx.font = 'bold 30px Georgia'; ctx.fillText('4 de noviembre de 1990', w / 2, 52);
            ctx.font = '24px Georgia'; ctx.fillText('Abel Ágreda · Celsa Nogales de Ágreda', w / 2, 98);
          })
        })
      );
      plaque.position.set(0, 2.25, -0.1);
      group.add(plaque);
      updaters.push((T) => {
        plaque.position.y = 2.25 + Math.sin(T * 1.2) * 0.04;
      });

      // Estudiantes caminando alrededor de la escena
      this.addNPC(2, 'mode: circle; center: 0 0 -0.3; radius: 2.2; speed: 0.4; phase: 0; prop: backpack; shirt: #b91c1c; pants: #1e293b; skin: #c68a4c; scale: 0.92');
      this.addNPC(2, 'mode: circle; center: 0 0 -0.3; radius: 2.35; speed: 0.32; phase: 3.1; clockwise: false; prop: book; shirt: #0f766e; pants: #374151; skin: #a77c58; scale: 0.9');
    },

    /* ═════════════ ESCENA 4 · CRECIMIENTO (4 SEDES) ═════════════ */
    buildScene4(group, updaters) {
      // Holomapa circular en el suelo, delante y alrededor de Franz
      const mapGroup = new THREE.Group();
      mapGroup.position.set(0, 0.012, 0.35);
      const mapTexture = canvasTexture(512, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(56,189,248,0.35)');
        g.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(125,211,252,0.55)'; ctx.lineWidth = 2;
        for (let r = 60; r < 250; r += 60) { ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, TAU); ctx.stroke(); }
        // Silueta estilizada de Bolivia
        ctx.fillStyle = 'rgba(34,197,94,0.28)'; ctx.strokeStyle = 'rgba(134,239,172,0.9)'; ctx.lineWidth = 3;
        ctx.beginPath();
        [[170, 120], [260, 95], [330, 150], [390, 210], [380, 300], [330, 380], [250, 410], [200, 360], [160, 290], [140, 200]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshBasicMaterial({ map: mapTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      disc.rotation.x = -Math.PI / 2;
      mapGroup.add(disc);
      group.add(mapGroup);

      // 4 sedes: posiciones aproximadas sobre la silueta del mapa (coordenadas del disco)
      const cities = [
        { name: 'LA PAZ', x: -0.36, z: -0.05, color: '#f97316' },
        { name: 'EL ALTO', x: -0.5, z: -0.22, color: '#facc15' },
        { name: 'COCHABAMBA', x: -0.05, z: 0.12, color: '#38bdf8' },
        { name: 'SANTA CRUZ', x: 0.42, z: 0.28, color: '#34d399' }
      ];
      const beacons = cities.map((city, i) => {
        const beacon = new THREE.Group();
        beacon.position.set(city.x, 0, city.z + 0.35);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.9, 12, 1, true), glow(city.color, 0.55));
        beam.position.y = 0.45;
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), std(city.color, { emissive: city.color, emissiveIntensity: 0.9, metalness: 0.5 }));
        core.position.y = 0.95;
        const pulse = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 32), glow(city.color, 0.8));
        pulse.rotation.x = -Math.PI / 2;
        pulse.position.y = 0.02;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(0.42, 0.09),
          new THREE.MeshBasicMaterial({
            transparent: true, depthWrite: false,
            map: canvasTexture(256, 56, (ctx, w, h) => {
              ctx.fillStyle = 'rgba(2,6,23,0.75)'; ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = city.color; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
              ctx.fillText(city.name, w / 2, 38);
            })
          })
        );
        label.position.y = 1.12;
        faceUser(label, city.x, city.z + 0.35);
        beacon.add(beam, core, pulse, label);
        beacon.userData = { core, pulse, offset: i * 0.6 };
        group.add(beacon);
        return beacon;
      });

      // Haces de luz viajando entre sedes (arcos)
      const arcs = [];
      for (let i = 0; i < cities.length; i++) {
        const a = beacons[i].position;
        const b = beacons[(i + 1) % cities.length].position;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y = 0.95 + a.distanceTo(b) * 0.6;
        const curve = new THREE.QuadraticBezierCurve3(a.clone().setY(0.95), mid, b.clone().setY(0.95));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.006, 6, false), glow('#67e8f9', 0.45));
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow('#e0f2fe', 1));
        group.add(tube, spark);
        arcs.push({ curve, spark, offset: i * 0.25 });
      }
      updaters.push((T) => {
        beacons.forEach((beacon) => {
          const d = beacon.userData;
          d.core.rotation.y = T * 2;
          d.core.position.y = 0.95 + Math.sin(T * 2 + d.offset) * 0.03;
          const k = ((T * 0.7 + d.offset) % 1);
          d.pulse.scale.setScalar(1 + k * 4);
          d.pulse.material.opacity = 0.8 * (1 - k);
        });
        arcs.forEach((arc) => {
          arc.spark.position.copy(arc.curve.getPoint((T * 0.45 + arc.offset) % 1));
        });
      });

      // Aviones de papel volando en ocho alrededor de la escena
      const planeGeometry = new THREE.BufferGeometry();
      planeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, 0.14, -0.08, 0, -0.08, 0, 0.012, -0.05,
        0, 0, 0.14, 0, 0.012, -0.05, 0.08, 0, -0.08,
        0, 0, 0.14, 0, -0.03, -0.06, 0, 0.012, -0.05
      ]), 3));
      planeGeometry.computeVertexNormals();
      const planeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', side: THREE.DoubleSide, roughness: 0.6 });
      const planes = [0, 1, 2].map((i) => {
        const plane = new THREE.Mesh(planeGeometry, planeMat);
        plane.userData.offset = (i / 3) * TAU;
        group.add(plane);
        return plane;
      });
      const prev = new THREE.Vector3();
      updaters.push((T) => {
        planes.forEach((plane) => {
          const a = T * 0.55 + plane.userData.offset;
          prev.copy(plane.position);
          plane.position.set(Math.sin(a) * 1.6, 1.9 + Math.sin(a * 2) * 0.25, Math.sin(a) * Math.cos(a) * 1.4 - 0.4);
          const next = new THREE.Vector3(Math.sin(a + 0.05) * 1.6, 1.9 + Math.sin((a + 0.05) * 2) * 0.25, Math.sin(a + 0.05) * Math.cos(a + 0.05) * 1.4 - 0.4);
          plane.lookAt(next);
        });
      });

      this.addNPC(3, 'mode: circle; center: 0 0 -0.3; radius: 2.25; speed: 0.38; phase: 0.6; prop: backpack; shirt: #f97316; pants: #1f2937; skin: #c68a4c; scale: 0.9');
      this.addNPC(3, 'mode: circle; center: 0 0 -0.3; radius: 2.25; speed: 0.38; phase: 3.7; prop: backpack; shirt: #0ea5e9; pants: #111827; skin: #8d5a3b; scale: 0.92');
    },

    /* ═════════════ ESCENA 5 · EL LEGADO CONTINÚA ═════════════ */
    buildScene5(group, updaters) {
      // Birretes lanzados al aire que giran y caen
      const capMat = std('#0f172a', { roughness: 0.55 });
      const tasselMat = std('#eab308', { metalness: 0.6, roughness: 0.3 });
      const caps = [];
      for (let i = 0; i < 7; i++) {
        const cap = new THREE.Group();
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.2), capMat);
        const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.07, 14), capMat);
        skull.position.y = -0.04;
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.09, 6), tasselMat);
        tassel.position.set(0.08, -0.04, 0.08);
        cap.add(board, skull, tassel);
        const side = i % 2 ? 1 : -1;
        cap.userData = {
          x: side * (0.75 + (i % 3) * 0.3),
          z: -0.6 + (i % 4) * 0.25,
          vx: -side * (0.1 + Math.random() * 0.15),
          vy: 3.2 + Math.random() * 0.8,
          delay: i * 0.45,
          spin: 4 + Math.random() * 4
        };
        caps.push(cap);
        group.add(cap);
      }
      updaters.push((T) => {
        caps.forEach((cap) => {
          const d = cap.userData;
          const period = 3.4;
          const t = ((T + d.delay) % period);
          const y = Math.max(0.03, 1.4 + d.vy * t - 4.9 * t * t * 0.5);
          cap.position.set(d.x + d.vx * t, y, d.z);
          cap.rotation.set(t * d.spin, t * d.spin * 0.6, 0);
          if (y <= 0.031) cap.rotation.set(0, d.spin, 0);
        });
      });

      // Fuegos artificiales sobre la escena
      const bursts = [0, 1, 2].map((i) => {
        const count = 90;
        const points = makeParticles(count, 0.05, ['#f472b6', '#facc15', '#34d399'][i]);
        const dirs = [];
        for (let k = 0; k < count; k++) {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * TAU;
          const s = Math.sqrt(1 - u * u);
          dirs.push(new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)));
        }
        points.userData = { dirs, center: new THREE.Vector3((i - 1) * 1.3, 3.0 + (i % 2) * 0.35, -1.4), offset: i * 0.9 };
        group.add(points);
        return points;
      });
      updaters.push((T) => {
        bursts.forEach((burst) => {
          const d = burst.userData;
          const t = (T + d.offset) % 2.8;
          const pos = burst.geometry.attributes.position.array;
          const radius = Math.min(1, t / 0.9) * 0.75;
          for (let k = 0; k < d.dirs.length; k++) {
            pos[k * 3] = d.center.x + d.dirs[k].x * radius;
            pos[k * 3 + 1] = d.center.y + d.dirs[k].y * radius - t * t * 0.12;
            pos[k * 3 + 2] = d.center.z + d.dirs[k].z * radius;
          }
          burst.geometry.attributes.position.needsUpdate = true;
          burst.material.opacity = t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8));
        });
      });

      // Holograma del conocimiento: icosaedro alámbrico con anillos (derecha)
      const holo = new THREE.Group();
      holo.position.set(1.15, 1.25, 0.05);
      const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: '#34d399', wireframe: true, transparent: true, opacity: 0.85 }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glow('#a7f3d0', 0.9));
      const rings = [0, 1, 2].map((i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32 + i * 0.05, 0.006, 8, 64), glow('#10b981', 0.7));
        ring.rotation.set(i * 0.9, i * 0.5, 0);
        holo.add(ring);
        return ring;
      });
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 20), std('#1f2937', { metalness: 0.6, roughness: 0.35 }));
      pedestal.position.set(1.15, 0.45, 0.05);
      const pedestalGlow = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 8, 32), glow('#34d399', 0.9));
      pedestalGlow.rotation.x = Math.PI / 2;
      pedestalGlow.position.set(1.15, 0.9, 0.05);
      holo.add(ico, core);
      group.add(holo, pedestal, pedestalGlow);
      updaters.push((T) => {
        ico.rotation.set(T * 0.4, T * 0.7, 0);
        rings.forEach((ring, i) => { ring.rotation.z = T * (0.6 + i * 0.3); ring.rotation.x += 0.004; });
        holo.position.y = 1.25 + Math.sin(T * 1.6) * 0.05;
        core.scale.setScalar(1 + Math.sin(T * 4) * 0.12);
      });

      // Dron moderno sobrevolando (izquierda)
      const drone = new THREE.Group();
      const droneBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), std('#e5e7eb', { metalness: 0.4, roughness: 0.4 }));
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow('#22d3ee', 1));
      led.position.set(0, -0.02, 0.08);
      drone.add(droneBody, led);
      const rotors = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.015), std('#374151'));
        arm.position.set(x * 0.08, 0, z * 0.08);
        arm.rotation.y = x * z > 0 ? -Math.PI / 4 : Math.PI / 4;
        const rotor = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#9ca3af', transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
        rotor.rotation.x = -Math.PI / 2;
        rotor.position.set(x * 0.12, 0.02, z * 0.12);
        drone.add(arm, rotor);
        return rotor;
      });
      group.add(drone);
      updaters.push((T) => {
        const a = T * 0.5;
        drone.position.set(-1.1 + Math.sin(a) * 0.45, 1.75 + Math.sin(T * 2.2) * 0.08, 0.1 + Math.cos(a) * 0.35);
        drone.rotation.set(Math.sin(T * 1.3) * 0.08, a, Math.cos(T * 1.1) * 0.08);
        rotors.forEach((rotor) => { rotor.rotation.z = T * 40; });
      });

      // Graduados celebrando alrededor
      this.addNPC(4, 'mode: circle; center: 0 0 -0.3; radius: 2.2; speed: 0.36; phase: 0.3; prop: book; shirt: #111827; pants: #111827; skin: #c68a4c; scale: 0.92');
      this.addNPC(4, 'mode: circle; center: 0 0 -0.3; radius: 2.35; speed: 0.3; phase: 2.4; clockwise: false; prop: none; shirt: #111827; pants: #1f2937; skin: #a77c58; scale: 0.9');
      this.addNPC(4, 'mode: idle; facing: -0.6; prop: none; shirt: #047857; pants: #1f2937; skin: #8d5a3b; scale: 0.9');
      this.npcs[this.npcs.length - 1].el.setAttribute('position', '0.85 0 -0.75');
    },

    tick(time, dtMs) {
      if (!this.data.active) return;
      const dt = Math.min(dtMs || 16, 50) / 1000;
      this.t += dt;
      const updaters = this.updaters[this.data.scene] || [];
      const T = this.t - (this.sceneStart || 0);
      for (let i = 0; i < updaters.length; i++) updaters[i](T, dt);
    }
  });
})();

