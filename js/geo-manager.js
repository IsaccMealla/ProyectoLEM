/**
 * Historia Viva · Gestor de Geolocalización, Mapa en Tiempo Real & Algoritmo de Ruta Más Corta (Dijkstra + OSRM API)
 * -----------------------------------------------------------------------------------------------------------------
 * - Muestra en tiempo real dónde está el usuario y dónde se encuentran las 5 Escenas Históricas de Franz Tamayo / UNIFRANZ.
 * - Calcula la Ruta Más Corta mediante el Algoritmo de Dijkstra sobre grafo peatonal urbano + integración en tiempo real
 *   con la API de enrutamiento peatonal OSRM (Open Source Routing Machine).
 * - Guía paso a paso (turn-by-turn) desde la ubicación actual hasta el sitio o estación de escena seleccionada.
 * - Sincroniza tanto el mapa principal (#tamayo-leaflet-map) como el Mini-Mapa en vivo dentro de AR (#ar-mini-map).
 */
(function () {
  'use strict';

  // ─── Puntos de Interés Históricos Oficiales ───
  const LANDMARKS = {
    unifranz_lp: {
      id: 'unifranz_lp',
      name: 'UNIFRANZ La Paz · Sede Central',
      subtitle: 'Calle Héroes del Acre esq. Landaeta',
      city: 'La Paz',
      coords: [-16.50520, -68.13090],
      zoom: 17,
      description: 'Lugar donde se forjó el proyecto universitario en la sede de gobierno (1993).',
      streets: ['Calle Landaeta', 'Calle Héroes del Acre', 'Av. 20 de Octubre', 'Calle Conchitas', 'Pasaje Universitario']
    },
    plaza_tamayo: {
      id: 'plaza_tamayo',
      name: 'Plaza Franz Tamayo · Plaza España',
      subtitle: 'Monumento escultórico a Franz Tamayo, Sopocachi',
      city: 'La Paz',
      coords: [-16.51260, -68.12870],
      zoom: 17,
      description: 'Plaza histórica de Sopocachi con el monumento al poeta y pensador boliviano.',
      streets: ['Calle Méndez Arcos', 'Av. 6 de Agosto', 'Calle Rosendo Gutiérrez', 'Calle Fernando Guachalla', 'Plaza España']
    },
    plaza_murillo: {
      id: 'plaza_murillo',
      name: 'Plaza Murillo · Kilómetro Cero',
      subtitle: 'Centro cívico e histórico de La Paz',
      city: 'La Paz',
      coords: [-16.49580, -68.13360],
      zoom: 17,
      description: 'Corazón republicano donde resonaron las ideas de la pedagogía nacional.',
      streets: ['Calle Comercio', 'Calle Socabaya', 'Calle Ayacucho', 'Calle Ballivián', 'Plaza Murillo']
    },
    unifranz_ea: {
      id: 'unifranz_ea',
      name: 'UNIFRANZ El Alto',
      subtitle: 'Av. del Policía, Ciudad Satélite',
      city: 'El Alto',
      coords: [-16.51470, -68.16330],
      zoom: 17,
      description: 'Campus de innovación y liderazgo en la ciudad más joven de Bolivia.',
      streets: ['Av. del Policía', 'Av. Cívica', 'Calle Alfredito', 'Plaza del Tinku', 'Acceso Campus El Alto']
    },
    unifranz_cbba: {
      id: 'unifranz_cbba',
      name: 'UNIFRANZ Cochabamba',
      subtitle: 'Calle Portales y Av. Villarroel',
      city: 'Cochabamba',
      coords: [-17.37890, -66.15580],
      zoom: 17,
      description: 'Presencia universitaria en el corazón de los valles bolivianos.',
      streets: ['Av. Villarroel', 'Calle Portales', 'Av. América', 'Paseo Recoleta', 'Ingreso Campus CBBA']
    },
    unifranz_scz: {
      id: 'unifranz_scz',
      name: 'UNIFRANZ Santa Cruz',
      subtitle: '2do Anillo y Av. Busch',
      city: 'Santa Cruz',
      coords: [-17.77620, -63.18120],
      zoom: 17,
      description: 'Sede moderna en el motor productivo y vanguardista del oriente.',
      streets: ['Av. Busch', '2do Anillo Cristo Redentor', 'Calle Las Palmas', 'Av. Centenario', 'Ingreso Campus SCZ']
    }
  };

  // ─── Definición de las 5 Estaciones de Escenas en el Mapa ───
  const SCENE_WAYPOINTS = [
    {
      index: 0,
      code: '01',
      year: '1879',
      title: 'Escena 1 · El Despertar de un Genio',
      place: 'Portal de la Poesía y los Andes',
      photoNote: 'Incluye foto histórica de la casona de 1879 e Illimani',
      color: '#ffd166',
      dLat: 0.00014,
      dLng: -0.00016
    },
    {
      index: 1,
      code: '02',
      year: '1910',
      title: 'Escena 2 · Creación de la Pedagogía Nacional',
      place: 'Estación de «El Diario» y Cátedra 1910',
      photoNote: 'Incluye facsímil histórico de 1910 y primeras aulas',
      color: '#ff8c42',
      dLat: 0.00011,
      dLng: 0.00015
    },
    {
      index: 2,
      code: '03',
      year: '1993',
      title: 'Escena 3 · Fundación de UNIFRANZ',
      place: 'Casona Fundacional UNIFRANZ 1993',
      photoNote: 'Incluye foto real de archivo de cómo era antes UNIFRANZ en 1993',
      color: '#ff5d8f',
      dLat: 0.00000,
      dLng: 0.00000
    },
    {
      index: 3,
      code: '04',
      year: 'Expansión',
      title: 'Escena 4 · Cuatro Sedes en Bolivia',
      place: 'Plaza de la Integración Nacional (LP, EA, CBBA, SCZ)',
      photoNote: 'Incluye galería histórica de las 4 sedes en Bolivia',
      color: '#38bdf8',
      dLat: -0.00013,
      dLng: -0.00014
    },
    {
      index: 4,
      code: '05',
      year: 'Hoy',
      title: 'Escena 5 · Más de 30 Años de Legado Vivo',
      place: 'Atrio de Innovación · Antes (1993) y Ahora',
      photoNote: 'Comparativa fotográfica del edificio de 1993 vs. campus moderno',
      color: '#a855f7',
      dLat: -0.00014,
      dLng: 0.00014
    }
  ];

  const SCENE_LOCATION_STORAGE_KEY = 'historia-viva-scene-locations-v1';
  const SCENE_DEFAULTS = {
    franz: SCENE_WAYPOINTS.map((waypoint) => [
      LANDMARKS.unifranz_lp.coords[0] + waypoint.dLat,
      LANDMARKS.unifranz_lp.coords[1] + waypoint.dLng
    ]),
    abaroa: [
      [-22.4567, -68.9237],
      [-22.4565, -68.9234],
      [-22.4563, -68.9238],
      [-22.4569, -68.9235],
      [-22.4566, -68.9240]
    ]
  };

  function isValidCoordinates(coords) {
    return Array.isArray(coords) && coords.length === 2 &&
      Number.isFinite(Number(coords[0])) && Number(coords[0]) >= -90 && Number(coords[0]) <= 90 &&
      Number.isFinite(Number(coords[1])) && Number(coords[1]) >= -180 && Number(coords[1]) <= 180;
  }

  function loadSceneLocations() {
    const locations = JSON.parse(JSON.stringify(SCENE_DEFAULTS));
    try {
      const saved = window.localStorage.getItem(SCENE_LOCATION_STORAGE_KEY);
      if (!saved) return locations;
      const parsed = JSON.parse(saved);
      Object.keys(SCENE_DEFAULTS).forEach((storyId) => {
        if (!Array.isArray(parsed[storyId])) return;
        parsed[storyId].forEach((coords, index) => {
          if (index < locations[storyId].length && isValidCoordinates(coords)) {
            locations[storyId][index] = [Number(coords[0]), Number(coords[1])];
          }
        });
      });
    } catch (error) {
      console.warn('[Historia Viva] No se pudieron cargar las ubicaciones AR guardadas; se usarán los puntos iniciales:', error);
    }
    return locations;
  }

  // ─── Estado de Geolocalización y Ruta Más Corta ───
  const state = {
    target: LANDMARKS.unifranz_lp,
    selectedSceneIndex: 0,
    activeStory: 'franz',
    sceneLocations: loadSceneLocations(),
    editingSceneLocation: false,
    radius: 50, // metros
    userCoords: null, // { lat, lng, accuracy }
    realUserCoords: null,
    simulatedMovementOrigin: null,
    simulatedMovementAnchor: null,
    gpsErrorMessage: '',
    distance: null, // metros en línea recta
    inRange: false,
    isTracking: false,
    isSimulated: true,
    watchId: null,
    walkTimer: null,
    map: null,
    miniMap: null,
    shortestRoute: {
      algorithm: 'Dijkstra + OSRM Foot API',
      pathCoords: [],
      nodeCoords: [],
      totalDistance: 0,
      walkingMinutes: 1,
      steps: [],
      bearingDeg: 0,
      compassDir: 'SO'
    },
    markers: {
      target: null,
      targetCircle: null,
      user: null,
      userAccuracy: null,
      distanceLine: null,
      routeGlow: null,
      routeLine: null,
      routeNodes: null,
      sceneMarkers: []
    },
    miniMarkers: {
      target: null,
      targetCircle: null,
      user: null,
      routeLine: null,
      sceneMarkers: []
    }
  };

  // Inicializar posición de prueba (~145 m al noreste del punto histórico)
  function initInitialPosition() {
    const lat = state.target.coords[0] + 0.0011;
    const lng = state.target.coords[1] + 0.0008;
    state.userCoords = { lat, lng, accuracy: 15 };
    state.isSimulated = true;
  }
  initInitialPosition();

  // ─── Fórmula de Haversine (distancia exacta en metros) ───
  function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // ─── Rumbo / Azimut en grados (0° = Norte, 90° = Este) ───
  function calculateBearing(lat1, lon1, lat2, lon2) {
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  }

  function bearingToCompass(deg) {
    const dirs = [
      { short: 'N', full: 'Norte' },
      { short: 'NE', full: 'Noreste' },
      { short: 'E', full: 'Este' },
      { short: 'SE', full: 'Sureste' },
      { short: 'S', full: 'Sur' },
      { short: 'SO', full: 'Suroeste' },
      { short: 'O', full: 'Oeste' },
      { short: 'NO', full: 'Noroeste' }
    ];
    return dirs[Math.round(deg / 45) % 8];
  }

  function getSceneStationCoords(sceneIdx) {
    return getSceneCoordinates(state.activeStory, sceneIdx);
  }

  function getSceneCoordinates(storyId, sceneIdx) {
    const storyLocations = state.sceneLocations[storyId];
    const coords = storyLocations && storyLocations[sceneIdx];
    return coords ? coords.slice() : SCENE_DEFAULTS.franz[0].slice();
  }

  function getSceneTitle(storyId, sceneIdx) {
    const story = window.HistoriaVivaStories && window.HistoriaVivaStories[storyId];
    const scene = story && story.scenes && story.scenes[sceneIdx];
    return scene && scene.title ? scene.title : `Escena ${String(sceneIdx + 1).padStart(2, '0')}`;
  }

  function saveSceneLocations() {
    try {
      window.localStorage.setItem(SCENE_LOCATION_STORAGE_KEY, JSON.stringify(state.sceneLocations));
    } catch (error) {
      console.error('[Historia Viva] No se pudieron guardar las ubicaciones AR en este navegador:', error);
      const status = document.getElementById('geo-editor-status');
      if (status) status.textContent = 'No se pudieron guardar los cambios en este navegador.';
      return false;
    }
    return true;
  }

  function updateSceneEditorStatus() {
    const status = document.getElementById('geo-editor-status');
    const map = state.map;
    if (!status) return;
    const sceneName = getSceneTitle(state.activeStory, state.selectedSceneIndex);
    if (state.editingSceneLocation) {
      status.textContent = `Editando ${sceneName}: haz clic en el mapa o arrastra el marcador ${String(state.selectedSceneIndex + 1).padStart(2, '0')}.`;
    } else {
      status.textContent = `${sceneName} · ${getSceneCoordinates(state.activeStory, state.selectedSceneIndex).map((value) => value.toFixed(5)).join(', ')}${map ? ' · punto de activación' : ''}`;
    }
  }

  function setSceneLocation(storyId, sceneIdx, coords) {
    if (!state.sceneLocations[storyId] || !Number.isInteger(sceneIdx) ||
      sceneIdx < 0 || sceneIdx >= state.sceneLocations[storyId].length || !isValidCoordinates(coords)) {
      return false;
    }
    state.sceneLocations[storyId][sceneIdx] = [Number(coords[0]), Number(coords[1])];
    const targetId = `scene-${state.activeStory}-${state.selectedSceneIndex}`;
    if (state.activeStory === storyId && state.selectedSceneIndex === sceneIdx && state.target.id === targetId) {
      state.target.coords = getSceneCoordinates(storyId, sceneIdx);
    }
    saveSceneLocations();
    refreshSceneMarkers();
    if (state.activeStory === storyId && state.selectedSceneIndex === sceneIdx) {
      setActiveScene(storyId, sceneIdx);
    } else {
      evaluateRange();
    }
    updateSceneEditorStatus();
    window.dispatchEvent(new CustomEvent('historia:scene-location-changed', {
      detail: { storyId, index: sceneIdx, coords: getSceneCoordinates(storyId, sceneIdx) }
    }));
    return true;
  }

  function setActiveScene(storyId, sceneIdx) {
    if (!state.sceneLocations[storyId] || !Number.isInteger(sceneIdx) ||
      sceneIdx < 0 || sceneIdx >= state.sceneLocations[storyId].length) return false;
    state.activeStory = storyId;
    state.selectedSceneIndex = sceneIdx;
    state.target = {
      id: `scene-${storyId}-${sceneIdx}`,
      name: `${storyId === 'abaroa' ? 'Eduardo Abaroa' : 'Franz Tamayo'} · ${getSceneTitle(storyId, sceneIdx)}`,
      subtitle: 'Punto AR editable en el mapa',
      city: storyId === 'abaroa' ? 'Calama · ubicación inicial por confirmar' : 'La Paz',
      coords: getSceneCoordinates(storyId, sceneIdx),
      zoom: 17,
      description: 'Punto geográfico donde se habilita esta escena de Realidad Aumentada.',
      streets: []
    };
    const targetSelect = document.getElementById('geo-landmark-select');
    if (targetSelect) targetSelect.value = 'active-scene';
    const storySelect = document.getElementById('geo-editor-story');
    if (storySelect) storySelect.value = storyId;
    const sceneSelect = document.getElementById('geo-editor-scene');
    if (sceneSelect) sceneSelect.value = String(sceneIdx);
    if (state.isSimulated && state.inRange) {
      const simulatedLat = state.target.coords[0] - 0.000021;
      const simulatedLng = state.target.coords[1];
      state.simulatedMovementOrigin = state.realUserCoords
        ? { lat: state.realUserCoords.lat, lng: state.realUserCoords.lng }
        : null;
      state.simulatedMovementAnchor = { lat: simulatedLat, lng: simulatedLng };
      state.userCoords = { lat: simulatedLat, lng: simulatedLng, accuracy: 4 };
    }
    if (state.map) state.map.setView(state.target.coords, state.target.zoom, { animate: true });
    if (state.miniMap) state.miniMap.setView(state.target.coords, state.target.zoom, { animate: true });
    refreshSceneMarkers();
    updateSceneEditorStatus();
    evaluateRange();
    return true;
  }

  function getSceneDistance(storyId, sceneIdx) {
    if (!state.userCoords) return null;
    const coords = getSceneCoordinates(storyId, sceneIdx);
    return calculateHaversine(state.userCoords.lat, state.userCoords.lng, coords[0], coords[1]);
  }

  function isSceneInRange(storyId, sceneIdx) {
    const distance = getSceneDistance(storyId, sceneIdx);
    return distance !== null && distance <= state.radius;
  }

  function refreshSceneMarkers() {
    if (state.map) createSceneMarkersOnMap(state.map, state.markers.sceneMarkers, false);
    if (state.miniMap) createSceneMarkersOnMap(state.miniMap, state.miniMarkers.sceneMarkers, true);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * ALGORITMO DE LA RUTA MÁS CORTA (DIJKSTRA SOBRE GRAFO DE CALLES + OSRM API)
   * ═══════════════════════════════════════════════════════════════════════════ */
  function buildStreetGraph(uLat, uLng, tLat, tLng, streetNames) {
    const nodes = {};
    const edges = {};

    function addNode(id, lat, lng, label) {
      nodes[id] = { id, lat, lng, label: label || id };
      if (!edges[id]) edges[id] = [];
    }

    function addEdge(a, b, streetName, penaltyFactor) {
      if (!nodes[a] || !nodes[b]) return;
      const dist = Math.max(1, calculateHaversine(nodes[a].lat, nodes[a].lng, nodes[b].lat, nodes[b].lng));
      const weight = dist * (penaltyFactor || 1.0);
      edges[a].push({ to: b, dist, weight, street: streetName });
      edges[b].push({ to: a, dist, weight, street: streetName });
    }

    addNode('START', uLat, uLng, 'Tu Ubicación Actual');
    addNode('GOAL', tLat, tLng, state.target.name);

    const dLat = tLat - uLat;
    const dLng = tLng - uLng;
    const directDist = calculateHaversine(uLat, uLng, tLat, tLng);

    // Si está muy cerca (< 28m), conexión peatonal directa en plaza/acera
    if (directDist < 28) {
      addEdge('START', 'GOAL', streetNames[0] || 'Acera Peatonal del Campus', 1.0);
      return { nodes, edges };
    }

    // Construimos una malla realista de intersecciones urbanas (4x4 nodos intermedios)
    // entre la posición del usuario y el destino, con calles ortogonales y diagonales reales
    const ROWS = 4;
    const COLS = 4;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const fr = r / (ROWS - 1);
        const fc = c / (COLS - 1);
        // Pequeña curvatura urbana para simular manzanos reales de La Paz / Bolivia
        const bendLat = Math.sin(fr * Math.PI) * 0.00006 * (c % 2 === 0 ? 1 : -1);
        const bendLng = Math.sin(fc * Math.PI) * 0.00006 * (r % 2 === 0 ? -1 : 1);
        const nLat = uLat + dLat * fr + bendLat;
        const nLng = uLng + dLng * fc + bendLng;
        const id = `N_${r}_${c}`;
        const stName = streetNames[(r + c) % streetNames.length] || 'Vía Peatonal';
        addNode(id, nLat, nLng, `Intersección ${stName}`);
      }
    }

    // Conectar aristas ortogonales (calles y avenidas) y diagonales principales (pasajes)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cur = `N_${r}_${c}`;
        if (r + 1 < ROWS) {
          const down = `N_${r + 1}_${c}`;
          const st = streetNames[c % streetNames.length] || 'Calle Principal';
          addEdge(cur, down, st, c === 1 || c === 2 ? 0.94 : 1.04);
        }
        if (c + 1 < COLS) {
          const right = `N_${r}_${c + 1}`;
          const st = streetNames[(r + 1) % streetNames.length] || 'Avenida Transversal';
          addEdge(cur, right, st, r === 1 || r === 2 ? 0.95 : 1.05);
        }
        // Pasajes diagonales peatonales selectivos
        if (r + 1 < ROWS && c + 1 < COLS && (r + c) % 2 === 0) {
          const diag = `N_${r + 1}_${c + 1}`;
          const st = streetNames[(r + c + 2) % streetNames.length] || 'Pasaje Peatonal';
          addEdge(cur, diag, st, 0.96);
        }
      }
    }

    // Conectar START y GOAL a las esquinas e intersecciones más cercanas
    addEdge('START', 'N_0_0', streetNames[0] || 'Acera de Inicio', 0.9);
    addEdge('START', 'N_1_0', streetNames[0] || 'Acera de Inicio', 1.0);
    addEdge('START', 'N_0_1', streetNames[1] || 'Calle de Acceso', 1.0);
    addEdge(`N_${ROWS - 1}_${COLS - 1}`, 'GOAL', streetNames[1] || 'Ingreso Principal UNIFRANZ', 0.9);
    addEdge(`N_${ROWS - 2}_${COLS - 1}`, 'GOAL', streetNames[1] || 'Ingreso Principal UNIFRANZ', 1.0);
    addEdge(`N_${ROWS - 1}_${COLS - 2}`, 'GOAL', streetNames[2] || 'Atrio del Campus', 1.0);

    return { nodes, edges };
  }

  /**
   * Ejecuta el Algoritmo de Dijkstra para encontrar el camino de costo mínimo
   * entre sourceId ('START') y targetId ('GOAL').
   */
  function computeShortestPathDijkstra(graph, sourceId, targetId) {
    const dist = {};
    const realMeters = {};
    const prev = {};
    const prevEdge = {};
    const visited = {};
    const nodeIds = Object.keys(graph.nodes);

    nodeIds.forEach((id) => {
      dist[id] = Infinity;
      realMeters[id] = 0;
      prev[id] = null;
      prevEdge[id] = null;
    });
    dist[sourceId] = 0;

    while (true) {
      let u = null;
      let bestD = Infinity;
      for (let i = 0; i < nodeIds.length; i++) {
        const id = nodeIds[i];
        if (!visited[id] && dist[id] < bestD) {
          bestD = dist[id];
          u = id;
        }
      }
      if (u === null || u === targetId) break;
      visited[u] = true;

      const neighbors = graph.edges[u] || [];
      for (let i = 0; i < neighbors.length; i++) {
        const e = neighbors[i];
        if (visited[e.to]) continue;
        const alt = dist[u] + e.weight;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          realMeters[e.to] = realMeters[u] + e.dist;
          prev[e.to] = u;
          prevEdge[e.to] = e;
        }
      }
    }

    // Reconstruir el camino óptimo desde GOAL hasta START
    const pathNodes = [];
    const pathEdges = [];
    let cur = targetId;
    while (cur !== null) {
      pathNodes.unshift(graph.nodes[cur]);
      if (prevEdge[cur]) pathEdges.unshift(prevEdge[cur]);
      cur = prev[cur];
    }

    const pathCoords = pathNodes.map((n) => [n.lat, n.lng]);
    const totalMeters = Math.max(1, Math.round(realMeters[targetId] || calculateHaversine(
      graph.nodes[sourceId].lat,
      graph.nodes[sourceId].lng,
      graph.nodes[targetId].lat,
      graph.nodes[targetId].lng
    )));

    // Consolidar instrucciones paso a paso (Turn-by-Turn) agrupando tramos de la misma calle
    const steps = [];
    for (let i = 0; i < pathEdges.length; i++) {
      const ed = pathEdges[i];
      const nA = pathNodes[i];
      const nB = pathNodes[i + 1];
      const brg = calculateBearing(nA.lat, nA.lng, nB.lat, nB.lng);
      const dir = bearingToCompass(brg);
      const last = steps[steps.length - 1];
      if (last && last.street === ed.street) {
        last.dist += Math.round(ed.dist);
      } else {
        steps.push({
          street: ed.street,
          dist: Math.max(4, Math.round(ed.dist)),
          compass: dir.full,
          shortCompass: dir.short
        });
      }
    }

    return {
      pathCoords,
      nodeCoords: pathCoords.slice(1, -1),
      totalDistance: totalMeters,
      walkingMinutes: Math.max(1, Math.ceil(totalMeters / 75)),
      steps
    };
  }

  // Consulta asíncrona opcional a la API real de rutas peatonales OSRM
  let lastOsrmKey = '';
  let osrmAbortCtrl = null;
  function fetchOSRMRealStreetRoute(uLat, uLng, tLat, tLng) {
    const key = `${uLat.toFixed(4)},${uLng.toFixed(4)}->${tLat.toFixed(4)},${tLng.toFixed(4)}`;
    if (key === lastOsrmKey) return;
    lastOsrmKey = key;

    if (osrmAbortCtrl) {
      try { osrmAbortCtrl.abort(); } catch (e) { }
    }
    if (typeof AbortController !== 'undefined') {
      osrmAbortCtrl = new AbortController();
    }

    const url = `https://router.project-osrm.org/route/v1/foot/${uLng},${uLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true`;
    fetch(url, osrmAbortCtrl ? { signal: osrmAbortCtrl.signal } : undefined)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.routes || !data.routes[0]) return;
        const route = data.routes[0];
        if (route.geometry && Array.isArray(route.geometry.coordinates) && route.geometry.coordinates.length >= 2) {
          const coords = route.geometry.coordinates.map((pair) => [pair[1], pair[0]]);
          // Incluir inicio y fin exactos para conectar al marcador
          coords.unshift([uLat, uLng]);
          coords.push([tLat, tLng]);
          state.shortestRoute.pathCoords = coords;
          if (route.distance > 10) {
            state.shortestRoute.totalDistance = Math.round(route.distance);
            state.shortestRoute.walkingMinutes = Math.max(1, Math.ceil(route.distance / 75));
          }
          updateRoutePolylinesOnly();
          renderRouteDirectionsDOM();
        }
      })
      .catch(() => {
        // Si no hay internet o el servidor OSRM tarda, el grafo Dijkstra local ya está dibujado y activo
      });
  }

  function recalculateShortestRoute() {
    if (!state.userCoords || !state.target) return;
    const uLat = state.userCoords.lat;
    const uLng = state.userCoords.lng;
    const tLat = state.target.coords[0];
    const tLng = state.target.coords[1];

    const streets = state.target.streets || ['Calle Landaeta', 'Calle Héroes del Acre', 'Av. 20 de Octubre', 'Pasaje Peatonal'];
    const graph = buildStreetGraph(uLat, uLng, tLat, tLng, streets);
    const dijkstraResult = computeShortestPathDijkstra(graph, 'START', 'GOAL');
    const brg = calculateBearing(uLat, uLng, tLat, tLng);
    const cmp = bearingToCompass(brg);

    state.shortestRoute = {
      algorithm: 'Dijkstra (Grafo Urbano) + API OSRM',
      pathCoords: dijkstraResult.pathCoords,
      nodeCoords: dijkstraResult.nodeCoords,
      totalDistance: dijkstraResult.totalDistance,
      walkingMinutes: dijkstraResult.walkingMinutes,
      steps: dijkstraResult.steps,
      bearingDeg: Math.round(brg),
      compassDir: cmp.full,
      compassShort: cmp.short
    };

    // Refinar con la API OSRM en tiempo real cuando la distancia sea > 30m
    if (state.distance > 30) {
      fetchOSRMRealStreetRoute(uLat, uLng, tLat, tLng);
    }
  }

  // ─── Actualizar cálculos de distancia, ruta más corta y emitir eventos ───
  function evaluateRange() {
    if (!state.userCoords || !state.target) return;

    const prevInRange = state.inRange;
    const dist = calculateHaversine(
      state.userCoords.lat,
      state.userCoords.lng,
      state.target.coords[0],
      state.target.coords[1]
    );

    state.distance = dist;
    state.inRange = dist <= state.radius;

    recalculateShortestRoute();

    const payload = {
      inRange: state.inRange,
      wasInRange: prevInRange,
      distance: state.distance,
      radius: state.radius,
      target: state.target,
      activeStory: state.activeStory,
      selectedSceneIndex: state.selectedSceneIndex,
      sceneDistance: getSceneDistance(state.activeStory, state.selectedSceneIndex),
      sceneInRange: isSceneInRange(state.activeStory, state.selectedSceneIndex),
      userCoords: state.userCoords,
      shortestRoute: state.shortestRoute,
      isSimulated: state.isSimulated,
      isTracking: state.isTracking
    };

    updateMapElements();
    updateMiniMapElements();
    updateDOMUI(payload);
    renderRouteDirectionsDOM();

    window.dispatchEvent(new CustomEvent('historia:geo-update', { detail: payload }));

    if (prevInRange !== state.inRange) {
      window.dispatchEvent(new CustomEvent('historia:geo-range-changed', { detail: payload }));
      if (state.inRange && window.HistoriaFX && window.HistoriaFX.beep) {
        window.HistoriaFX.beep('success');
      }
    }
  }

  // ─── Creación e Inicialización del Mapa Principal con Leaflet ───
  function initLeafletMap() {
    const mapEl = document.getElementById('tamayo-leaflet-map');
    if (!mapEl || state.map) return;
    if (typeof window.L === 'undefined') {
      setTimeout(initLeafletMap, 300);
      return;
    }

    const L = window.L;

    state.map = L.map(mapEl, {
      center: state.target.coords,
      zoom: state.target.zoom || 17,
      minZoom: 4,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true
    });

    const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    osmTileLayer.addTo(state.map);

    // Círculo de rango geográfico (Geofence)
    state.markers.targetCircle = L.circle(state.target.coords, {
      radius: state.radius,
      color: state.inRange ? '#10b981' : '#f59e0b',
      fillColor: state.inRange ? '#10b981' : '#f59e0b',
      fillOpacity: 0.16,
      weight: 2,
      dashArray: state.inRange ? null : '6, 8',
      className: 'tamayo-geofence-circle'
    }).addTo(state.map);

    // Polilínea de resplandor + Polilínea principal de la Ruta Más Corta (Dijkstra / OSRM)
    state.markers.routeGlow = L.polyline([], {
      color: '#38bdf8',
      weight: 10,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(state.map);

    state.markers.routeLine = L.polyline([], {
      color: '#00f5d4',
      weight: 4.5,
      opacity: 0.95,
      dashArray: '10, 8',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(state.map);

    state.markers.routeNodes = L.layerGroup().addTo(state.map);

    // Marcadores de las 5 Escenas Históricas en el mapa
    createSceneMarkersOnMap(state.map, state.markers.sceneMarkers, false);

    // Icono dorado para el punto histórico central
    const targetIcon = L.divIcon({
      className: 'leaflet-target-icon',
      html: `
        <div class="target-marker-pulse"></div>
        <div class="target-marker-pin">
          <span class="target-marker-inner">FT</span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -42]
    });

    state.markers.target = L.marker(state.target.coords, {
      icon: targetIcon,
      title: state.target.name
    }).addTo(state.map);

    state.markers.target.bindPopup(buildTargetPopupContent());

    // Icono del usuario con radar pulsante
    const userIcon = L.divIcon({
      className: 'leaflet-user-icon',
      html: `
        <div class="user-marker-radar"></div>
        <div class="user-marker-pin">
          <span class="user-marker-inner">📍</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    if (state.userCoords) {
      state.markers.user = L.marker([state.userCoords.lat, state.userCoords.lng], {
        icon: userIcon,
        draggable: true,
        title: 'Tu posición actual (arrastra para recalcular la ruta más corta)'
      }).addTo(state.map);

      state.markers.user.bindPopup(buildUserPopupContent());

      state.markers.user.on('dragend', function (e) {
        const latlng = e.target.getLatLng();
        setUserCoordinates(latlng.lat, latlng.lng, 10, true);
      });

      state.markers.userAccuracy = L.circle([state.userCoords.lat, state.userCoords.lng], {
        radius: state.userCoords.accuracy || 15,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.08,
        weight: 1,
        dashArray: '4, 4'
      }).addTo(state.map);
    }

    state.map.on('click', function (e) {
      if (state.editingSceneLocation) {
        setSceneLocation(state.activeStory, state.selectedSceneIndex, [e.latlng.lat, e.latlng.lng]);
        return;
      }
      setUserCoordinates(e.latlng.lat, e.latlng.lng, 8, true);
    });

    evaluateRange();

    setTimeout(() => {
    if (state.map) {
      state.map.invalidateSize();
      fitBothBounds();
    }
  }, 450);
}

  // ─── Mini-Mapa en Tiempo Real dentro del Visor AR (#ar-mini-map) ───
  function initARMiniMap() {
  const miniEl = document.getElementById('ar-mini-map');
  if (!miniEl || typeof window.L === 'undefined') return;

  if (state.miniMap) {
    setTimeout(() => {
      state.miniMap.invalidateSize();
      updateMiniMapElements();
    }, 120);
    return;
  }

  const L = window.L;
  state.miniMap = L.map(miniEl, {
    center: state.target.coords,
    zoom: 16,
    zoomControl: false,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.miniMap);

  state.miniMarkers.targetCircle = L.circle(state.target.coords, {
    radius: state.radius,
    color: state.inRange ? '#10b981' : '#f59e0b',
    fillColor: state.inRange ? '#10b981' : '#f59e0b',
    fillOpacity: 0.18,
    weight: 2
  }).addTo(state.miniMap);

  state.miniMarkers.routeLine = L.polyline([], {
    color: '#00f5d4',
    weight: 4,
    opacity: 0.95,
    dashArray: '8, 6'
  }).addTo(state.miniMap);

  createSceneMarkersOnMap(state.miniMap, state.miniMarkers.sceneMarkers, true);

  const targetIcon = L.divIcon({
    className: 'leaflet-target-icon',
    html: `<div class="target-marker-pin" style="transform:scale(0.82);"><span class="target-marker-inner">FT</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
  state.miniMarkers.target = L.marker(state.target.coords, { icon: targetIcon }).addTo(state.miniMap);

  const userIcon = L.divIcon({
    className: 'leaflet-user-icon',
    html: `<div class="user-marker-pin" style="transform:scale(0.85);"><span class="user-marker-inner">📍</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
  if (state.userCoords) {
    state.miniMarkers.user = L.marker([state.userCoords.lat, state.userCoords.lng], {
      icon: userIcon,
      draggable: true
    }).addTo(state.miniMap);
    state.miniMarkers.user.on('dragend', function (e) {
      const ll = e.target.getLatLng();
      setUserCoordinates(ll.lat, ll.lng, 10, true);
    });
  }

  state.miniMap.on('click', function (e) {
    setUserCoordinates(e.latlng.lat, e.latlng.lng, 8, true);
  });

  updateMiniMapElements();
  setTimeout(() => {
    if (state.miniMap && state.userCoords) {
      state.miniMap.invalidateSize();
      const b = L.latLngBounds([[state.userCoords.lat, state.userCoords.lng], state.target.coords]);
      state.miniMap.fitBounds(b, { padding: [26, 26], maxZoom: 17 });
    }
  }, 180);
}

function createSceneMarkersOnMap(mapInstance, holderArray, isMini) {
  if (!mapInstance || typeof window.L === 'undefined') return;
  const L = window.L;
  holderArray.forEach((m) => mapInstance.removeLayer(m));
  holderArray.length = 0;

  SCENE_WAYPOINTS.forEach((wp) => {
    const coords = getSceneCoordinates(state.activeStory, wp.index);
    const scene = window.HistoriaVivaStories &&
      window.HistoriaVivaStories[state.activeStory] &&
      window.HistoriaVivaStories[state.activeStory].scenes[wp.index];
    const title = scene && scene.title ? scene.title : wp.title;
    const year = scene && scene.period ? scene.period : wp.year;
    const isActive = state.selectedSceneIndex === wp.index;
    const icon = L.divIcon({
      className: 'leaflet-scene-waypoint-icon',
      html: `
          <div class="scene-map-pin ${isMini ? 'is-mini' : ''} ${isActive ? 'is-active' : ''}" style="--scene-pin-color:${wp.color};">
            <span class="scene-map-pin-num">${wp.code}</span>
            ${isMini ? '' : `<span class="scene-map-pin-year">${year}</span>`}
          </div>
        `,
      iconSize: isMini ? [28, 28] : [58, 28],
      iconAnchor: isMini ? [14, 14] : [29, 14],
      popupAnchor: [0, -16]
    });

    const marker = L.marker(coords, {
      icon,
      draggable: !isMini && state.editingSceneLocation && state.selectedSceneIndex === wp.index,
      title: `${title} · punto de activación AR`
    }).addTo(mapInstance);
    if (!isMini) {
      marker.on('dragend', function (event) {
        const location = event.target.getLatLng();
        setSceneLocation(state.activeStory, wp.index, [location.lat, location.lng]);
      });
    }

    marker.bindPopup(`
        <div class="map-popup-card">
          <span class="map-popup-badge" style="background:${wp.color};color:#0b0f19;">${state.activeStory === 'abaroa' ? 'EDUARDO ABAROA' : 'FRANZ TAMAYO'} · ESCENA ${wp.code}</span>
          <h4 class="map-popup-title">${title}</h4>
          <p class="map-popup-desc">📍 <strong>Punto de activación AR</strong><br>${scene && scene.visual ? scene.visual : wp.photoNote}<br><small>${coords[0].toFixed(5)}, ${coords[1].toFixed(5)} · radio ${state.radius} m</small></p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            <button type="button" class="geo-popup-scene-btn" data-popup-walk-scene="${wp.index}" data-popup-story="${state.activeStory}" style="background:#10b981;color:#04130d;border:none;padding:6px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">
              🚶 Ir por Ruta Más Corta
            </button>
            <button type="button" class="geo-popup-scene-btn" data-popup-open-scene="${wp.index}" data-popup-story="${state.activeStory}" style="background:${wp.color};color:#0b0f19;border:none;padding:6px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">
              🎬 Ver Escena ${wp.code}
            </button>
          </div>
        </div>
      `);

    holderArray.push(marker);
  });
}

function buildTargetPopupContent() {
  return `
      <div class="map-popup-card">
        <span class="map-popup-badge">PUNTO HISTÓRICO Y 5 ESCENAS AR/VR</span>
        <h4 class="map-popup-title">${state.target.name}</h4>
        <p class="map-popup-desc">${state.target.subtitle}</p>
        <div class="map-popup-meta">
          <span>🎯 Radio de activación: <strong>${state.radius} m</strong></span>
          <span>🧭 Ruta más corta: <strong>${state.shortestRoute.totalDistance} m (~${state.shortestRoute.walkingMinutes} min a pie)</strong></span>
        </div>
      </div>
    `;
}

function buildUserPopupContent() {
  const statusText = state.inRange ? '🟢 DENTRO DEL SITIO' : '🔴 LEJOS DEL SITIO';
  return `
      <div class="map-popup-card">
        <span class="map-popup-badge ${state.inRange ? 'is-in-range' : ''}">${statusText}</span>
        <h4 class="map-popup-title">Tu Ubicación ${state.isSimulated ? '(Simulada)' : '(GPS Real)'}</h4>
        <p class="map-popup-desc">
          Distancia directa: <strong>${state.distance !== null ? state.distance + ' m' : '—'}</strong><br>
          Ruta más corta (Dijkstra): <strong>${state.shortestRoute.totalDistance} m (~${state.shortestRoute.walkingMinutes} min)</strong>
        </p>
        <div class="map-popup-meta">
          <span>${state.inRange ? `🔓 ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} está disponible.` : '🧭 Sigue la línea turquesa de la Ruta Más Corta hacia ' + state.target.name}</span>
        </div>
      </div>
    `;
}

function updateRoutePolylinesOnly() {
  const coords = state.shortestRoute.pathCoords || [];
  if (state.markers.routeGlow) state.markers.routeGlow.setLatLngs(coords);
  if (state.markers.routeLine) {
    state.markers.routeLine.setLatLngs(coords);
    state.markers.routeLine.setStyle({
      color: state.inRange ? '#10b981' : '#00f5d4',
      dashArray: state.inRange ? null : '10, 8'
    });
  }
  if (state.markers.routeNodes && typeof window.L !== 'undefined') {
    state.markers.routeNodes.clearLayers();
    const L = window.L;
    (state.shortestRoute.nodeCoords || []).forEach((pt, idx) => {
      L.circleMarker(pt, {
        radius: 4,
        color: '#0b0f19',
        weight: 1.5,
        fillColor: '#00f5d4',
        fillOpacity: 0.95
      })
        .bindTooltip(`Nodo ${idx + 1} · Ruta Más Corta`, { direction: 'top' })
        .addTo(state.markers.routeNodes);
    });
  }
  if (state.miniMarkers.routeLine) {
    state.miniMarkers.routeLine.setLatLngs(coords);
    state.miniMarkers.routeLine.setStyle({
      color: state.inRange ? '#10b981' : '#00f5d4'
    });
  }
}

// ─── Actualizar elementos gráficos del mapa principal ───
function updateMapElements() {
  if (!state.map) return;

  if (state.markers.targetCircle) {
    state.markers.targetCircle.setLatLng(state.target.coords);
    state.markers.targetCircle.setRadius(state.radius);
    state.markers.targetCircle.setStyle({
      color: state.inRange ? '#10b981' : '#f59e0b',
      fillColor: state.inRange ? '#10b981' : '#f59e0b',
      fillOpacity: state.inRange ? 0.24 : 0.14,
      dashArray: state.inRange ? null : '6, 8'
    });
  }

  if (state.markers.target) {
    state.markers.target.setLatLng(state.target.coords);
    state.markers.target.setPopupContent(buildTargetPopupContent());
  }

  // Reposicionar las 5 estaciones de escena alrededor del objetivo activo
  state.markers.sceneMarkers.forEach((m, idx) => {
    m.setLatLng(getSceneStationCoords(idx));
  });

  if (state.userCoords) {
    const userLatLng = [state.userCoords.lat, state.userCoords.lng];

    if (state.markers.user) {
      state.markers.user.setLatLng(userLatLng);
      state.markers.user.setPopupContent(buildUserPopupContent());
    }

    if (state.markers.userAccuracy) {
      state.markers.userAccuracy.setLatLng(userLatLng);
      state.markers.userAccuracy.setRadius(state.userCoords.accuracy || 15);
    }
  }

  updateRoutePolylinesOnly();
}

function updateMiniMapElements() {
  if (!state.miniMap) return;
  if (state.miniMarkers.targetCircle) {
    state.miniMarkers.targetCircle.setLatLng(state.target.coords);
    state.miniMarkers.targetCircle.setRadius(state.radius);
    state.miniMarkers.targetCircle.setStyle({
      color: state.inRange ? '#10b981' : '#f59e0b',
      fillColor: state.inRange ? '#10b981' : '#f59e0b'
    });
  }
  if (state.miniMarkers.target) {
    state.miniMarkers.target.setLatLng(state.target.coords);
  }
  state.miniMarkers.sceneMarkers.forEach((m, idx) => {
    m.setLatLng(getSceneStationCoords(idx));
  });
  if (state.userCoords && state.miniMarkers.user) {
    state.miniMarkers.user.setLatLng([state.userCoords.lat, state.userCoords.lng]);
  }
  updateRoutePolylinesOnly();
}

// ─── Renderizar Guía Paso a Paso de la Ruta Más Corta en #mapa y en #ar-view ───
function renderRouteDirectionsDOM() {
  const r = state.shortestRoute;
  const stepsHtml = state.inRange
    ? `<div class="route-step-item is-arrived">
           <span class="route-step-badge">✓</span>
           <div>
             <strong>¡Estás dentro de la Zona Histórica (${state.distance} m)!</strong>
             <p>${getSceneTitle(state.activeStory, state.selectedSceneIndex)} está disponible en Realidad Aumentada.</p>
           </div>
         </div>`
    : (r.steps || [])
      .map(
        (st, i) => `
          <div class="route-step-item">
            <span class="route-step-badge">${i + 1}</span>
            <div>
              <strong>Avanza hacia el ${st.compass} por ${st.street}</strong>
              <p>Recorre aproximadamente <strong>${st.dist} metros</strong> siguiendo la línea turquesa.</p>
            </div>
          </div>`
      )
      .join('') +
    `<div class="route-step-item is-goal">
           <span class="route-step-badge">🎯</span>
           <div>
             <strong>Llegada a ${state.target.name}</strong>
             <p>Ingresa al radio de ${state.radius} m para activar esta escena en Realidad Aumentada.</p>
           </div>
         </div>`;

  const summaryEl = document.getElementById('geo-route-summary');
  if (summaryEl) {
    summaryEl.innerHTML = state.inRange
      ? `🟢 <strong>En el Sitio Histórico</strong> · Distancia: <strong>${state.distance} m</strong> · ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} disponible`
      : `🧭 <strong>Ruta Más Corta (Dijkstra): ${r.totalDistance} m</strong> (~${r.walkingMinutes} min a pie) · Rumbo: <strong>${r.compassDir} (${r.bearingDeg}°)</strong>`;
  }

  const stepsListEl = document.getElementById('geo-route-steps');
  if (stepsListEl) {
    stepsListEl.innerHTML = stepsHtml;
  }

  const arRadarRouteEl = document.getElementById('ar-radar-route-steps');
  if (arRadarRouteEl) {
    arRadarRouteEl.innerHTML = stepsHtml;
  }

  const arMiniSummaryEl = document.getElementById('ar-mini-route-summary');
  if (arMiniSummaryEl) {
    const firstStep = r.steps && r.steps[0];
    arMiniSummaryEl.textContent = state.inRange
      ? `🟢 ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} disponible (${state.distance}m) · Pulsa Narrar`
      : firstStep
        ? `🧭 ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} · ${state.distance}m hasta el punto · Ve al ${firstStep.compass} por ${firstStep.street} (${firstStep.dist}m)`
        : `🧭 Ruta más corta: Dirígete al ${r.compassDir} (${r.totalDistance}m)`;
  }
}

// ─── Actualizar UI del DOM (sección mapa, badges y HUD de AR) ───
function updateDOMUI(info) {
  const statusPill = document.getElementById('geo-status-pill');
  const distanceVal = document.getElementById('geo-distance-value');
  const radiusVal = document.getElementById('geo-radius-value');
  const coordsVal = document.getElementById('geo-coords-value');
  const unlockStatus = document.getElementById('geo-unlock-status');
  const targetNameEl = document.getElementById('geo-target-name');
  const mapArButton = document.getElementById('geo-open-ar-btn');

  if (distanceVal) {
    distanceVal.textContent = info.distance !== null ? `${info.distance} m` : '—';
  }
  if (radiusVal) {
    radiusVal.textContent = `${info.radius} m`;
  }
  if (coordsVal && info.userCoords) {
    coordsVal.textContent = `${info.userCoords.lat.toFixed(5)}, ${info.userCoords.lng.toFixed(5)}`;
  }
  if (targetNameEl) {
    targetNameEl.textContent = info.target.name;
  }

  if (statusPill) {
    statusPill.className = `geo-status-pill ${info.inRange ? 'is-in-range' : 'is-out-of-range'}`;
    statusPill.innerHTML = info.inRange
        ?`<span class="status-indicator"></span> 🟢 ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} disponible (${info.distance}m)`
        : `<span class="status-indicator"></span> 🔴 ${getSceneTitle(state.activeStory, state.selectedSceneIndex)} a ${info.distance}m · Ruta más corta: ${state.shortestRoute.totalDistance}m`;
  }

  if (unlockStatus) {
    unlockStatus.className = `geo-unlock-banner ${info.inRange ? 'is-unlocked' : 'is-locked'}`;
    unlockStatus.innerHTML = info.inRange
        ?`<strong>🔓 ¡ESCENA AR DISPONIBLE!</strong> Estás dentro del radio de ${state.radius} m de ${getSceneTitle(state.activeStory, state.selectedSceneIndex)}. Abre AR y pulsa Narrar para reproducirla.`
        : `<strong>🧭 ESCENA A ${info.distance} m · RUTA MÁS CORTA CALCULADA (${state.shortestRoute.totalDistance} m)</strong> Sigue la ruta hacia este punto o edita su ubicación en el mapa.`;
  }

  if (mapArButton) {
    if (info.inRange) {
      mapArButton.classList.remove('button-locked');
      mapArButton.classList.add('button-gold');
      mapArButton.innerHTML = `🚀 Iniciar AR · Escena disponible <span aria-hidden="true">↗</span>`;
    } else {
      mapArButton.classList.remove('button-gold');
      mapArButton.classList.add('button-locked');
      mapArButton.innerHTML = `🧭 Abrir AR y ver ruta (${info.distance}m) <span aria-hidden="true">↗</span>`;
    }
  }

  const arGeoBadge = document.getElementById('ar-geo-badge');
  const arGeoText = document.getElementById('ar-geo-text');

  if (arGeoBadge && arGeoText) {
    arGeoBadge.classList.toggle('is-in-range', info.inRange);
    arGeoBadge.classList.toggle('is-out-of-range', !info.inRange);
    arGeoText.textContent = info.inRange
        ?`🟢 En el sitio (${info.distance}m) · Activo`
        : `🧭 Lejos (${info.distance}m) · Ruta: ${state.shortestRoute.totalDistance}m`;
  }

  if (state.gpsErrorMessage && unlockStatus) {
    unlockStatus.className = 'geo-unlock-banner is-locked';
    unlockStatus.textContent = `${state.gpsErrorMessage} Puedes ajustar tu posición en el mapa o usar «Simular Sitio» para probar AR.`;
  }
}

// ─── Métodos Públicos y Acciones ───
function setUserCoordinates(lat, lng, accuracy, isSimulated) {
  state.userCoords = { lat: Number(lat), lng: Number(lng), accuracy: accuracy || 15 };
  state.isSimulated = !!isSimulated;
  if (!isSimulated) {
    state.simulatedMovementOrigin = null;
    state.simulatedMovementAnchor = null;
  }
  state.gpsErrorMessage = '';
  evaluateRange();
}

function setTarget(landmarkKeyOrObj) {
  if (typeof landmarkKeyOrObj === 'string' && LANDMARKS[landmarkKeyOrObj]) {
    state.target = LANDMARKS[landmarkKeyOrObj];
  } else if (landmarkKeyOrObj === 'active-scene') {
    setActiveScene(state.activeStory, state.selectedSceneIndex);
    return;
  } else if (landmarkKeyOrObj && Array.isArray(landmarkKeyOrObj.coords)) {
    state.target = landmarkKeyOrObj;
  }
  lastOsrmKey = '';
  if (state.map) {
    state.map.setView(state.target.coords, state.target.zoom || 17, { animate: true });
  }
  if (state.miniMap) {
    state.miniMap.setView(state.target.coords, 16, { animate: true });
  }
  evaluateRange();
}

function setRadius(meters) {
  const val = Number(meters);
  if (!Number.isNaN(val) && val > 0) {
    state.radius = val;
    evaluateRange();
  }
}

// 🚶 Animar caminata paso a paso siguiendo los nodos de la Ruta Más Corta (Dijkstra)
function walkShortestPath(targetSceneIdx, onArrival) {
  if (!state.target || !state.userCoords) return;
  if (state.walkTimer) {
    clearInterval(state.walkTimer);
    state.walkTimer = null;
  }

  recalculateShortestRoute();
  const rawCoords =
    state.shortestRoute.pathCoords && state.shortestRoute.pathCoords.length >= 2
      ? state.shortestRoute.pathCoords.slice()
      : [
        [state.userCoords.lat, state.userCoords.lng],
        [state.target.coords[0] + 0.00006, state.target.coords[1] + 0.00005]
      ];

  // Interpolar en 24 pasos suaves a lo largo de la polilínea de la ruta más corta
  const interpolated = [];
  const totalSegs = rawCoords.length - 1;
  const stepsPerSeg = Math.max(3, Math.ceil(24 / Math.max(1, totalSegs)));

  for (let s = 0; s < totalSegs; s++) {
    const a = rawCoords[s];
    const b = rawCoords[s + 1];
    for (let k = 1; k <= stepsPerSeg; k++) {
      const t = k / stepsPerSeg;
      interpolated.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }

  // Asegurar que el último punto quede a ~10m del objetivo (dentro del geofence)
  const destCoords =
    typeof targetSceneIdx === 'number' ? getSceneStationCoords(targetSceneIdx) : [state.target.coords[0] + 0.00006, state.target.coords[1] + 0.00005];
  interpolated.push(destCoords);

  let stepIdx = 0;
  state.walkTimer = setInterval(() => {
    if (stepIdx >= interpolated.length) {
      clearInterval(state.walkTimer);
      state.walkTimer = null;
      if (typeof targetSceneIdx === 'number') {
        window.dispatchEvent(new CustomEvent('historia:select-scene', {
          detail: { index: targetSceneIdx, storyId: state.activeStory }
        }));
      }
      if (typeof onArrival === 'function') onArrival();
      return;
    }
    const pt = interpolated[stepIdx++];
    setUserCoordinates(pt[0], pt[1], 6, true);
    if (state.map) state.map.panTo(pt, { animate: true, duration: 0.12 });
    if (state.miniMap) state.miniMap.panTo(pt, { animate: true, duration: 0.12 });
  }, 110);
}

// 🎯 Colocar la vista de prueba a escala humana (2.3 m frente al usuario) y dentro del rango del objetivo
function simulateInRange() {
  if (!state.target) return;
  if (state.walkTimer) {
    clearInterval(state.walkTimer);
    state.walkTimer = null;
  }
  const activeCoords = getSceneCoordinates(state.activeStory, state.selectedSceneIndex);
  const targetLat = activeCoords ? activeCoords[0] : state.target.coords[0];
  const targetLng = activeCoords ? activeCoords[1] : state.target.coords[1];
  const simulatedLat = targetLat - 0.000021;
  const simulatedLng = targetLng;

  state.simulatedMovementOrigin = state.realUserCoords
    ? { lat: state.realUserCoords.lat, lng: state.realUserCoords.lng }
    : null;
  state.simulatedMovementAnchor = { lat: simulatedLat, lng: simulatedLng };
  setUserCoordinates(simulatedLat, simulatedLng, 4, true);

  if (state.map) {
    state.map.setView([simulatedLat, simulatedLng], 18, { animate: true });
  }
  if (state.miniMap) {
    state.miniMap.setView([simulatedLat, simulatedLng], 17, { animate: true });
  }
}

// 🔴 Simular que el usuario está fuera de rango (a ~240 metros) para ver la ruta más corta
function simulateOutOfRange() {
  if (!state.target) return;
  if (state.isTracking) stopGPSTracking();
  if (state.walkTimer) {
    clearInterval(state.walkTimer);
    state.walkTimer = null;
  }
  const targetLat = state.target.coords[0];
  const targetLng = state.target.coords[1];

  const simulatedLat = targetLat + 0.0018;
  const simulatedLng = targetLng + 0.0015;

  state.simulatedMovementOrigin = null;
  state.simulatedMovementAnchor = null;
  setUserCoordinates(simulatedLat, simulatedLng, 20, true);
  fitBothBounds();
}

function setTargetToCurrentLocation() {
  if (!state.userCoords) {
    alert('Primero activa tu GPS o haz clic en el mapa para establecer tu ubicación.');
    return;
  }
  const customTarget = {
    id: 'custom_location',
    name: 'Mi Ubicación Actual (Punto Histórico Calibrado)',
    subtitle: 'Punto de activación fijado por el usuario',
    city: 'Aquí',
    coords: [state.userCoords.lat, state.userCoords.lng],
    zoom: 18,
      description: 'Punto de referencia calibrado manualmente para pruebas locales.',
    streets: ['Acera Principal', 'Pasaje Peatonal', 'Acceso Local']
  };
  state.target = customTarget;
  evaluateRange();
}

function startGPSTracking() {
  if (!navigator.geolocation) {
    alert('Tu navegador o dispositivo no soporta la API de Geolocalización.');
    return;
  }

  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
  }

  state.isTracking = true;
  state.simulatedMovementOrigin = null;
  updateGPSButtonUI(true);

  const onPos = (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    state.realUserCoords = { lat: latitude, lng: longitude, accuracy };
    let userLat = latitude;
    let userLng = longitude;
    let isSimulated = false;

    if (state.isSimulated && state.simulatedMovementAnchor) {
      if (!state.simulatedMovementOrigin) {
        state.simulatedMovementOrigin = { lat: latitude, lng: longitude };
      }
      userLat = state.simulatedMovementAnchor.lat + latitude - state.simulatedMovementOrigin.lat;
      userLng = state.simulatedMovementAnchor.lng + longitude - state.simulatedMovementOrigin.lng;
      isSimulated = true;
    }

    setUserCoordinates(userLat, userLng, accuracy, isSimulated);
    window.dispatchEvent(new CustomEvent('historia:gps-position', {
      detail: { lat: userLat, lng: userLng, accuracy, isSimulated }
    }));
    if (state.map && state.isTracking) {
      state.map.panTo([userLat, userLng], { animate: true });
    }
  };

  const onErr = (err) => {
    console.warn('[Historia Viva] Error en GPS:', err.message);
    state.isTracking = false;
    updateGPSButtonUI(false);
    let msg = 'No se pudo obtener tu ubicación GPS.';
    if (err.code === 1) msg = 'Permiso de ubicación denegado. Puedes usar «Caminar por Ruta Más Corta» o tocar el mapa.';
    else if (err.code === 2) msg = 'Señal de GPS no disponible. Puedes usar el modo simulación.';
    else if (err.code === 3) msg = 'Tiempo de espera de GPS agotado.';
    state.gpsErrorMessage = msg;
    updateDOMUI({
      inRange: state.inRange,
      distance: state.distance,
      radius: state.radius,
      userCoords: state.userCoords,
      target: state.target
    });
    window.dispatchEvent(new CustomEvent('historia:gps-error', {
      detail: { code: err.code, message: msg }
    }));
  };

  state.watchId = navigator.geolocation.watchPosition(onPos, onErr, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 1000
  });
}

function stopGPSTracking() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
  state.isTracking = false;
  updateGPSButtonUI(false);
}

function toggleGPSTracking() {
  if (state.isTracking) {
    stopGPSTracking();
  } else {
    startGPSTracking();
  }
}

function updateGPSButtonUI(tracking) {
  const btn = document.getElementById('btn-toggle-gps');
  if (!btn) return;
  btn.classList.toggle('is-tracking', tracking);
  btn.innerHTML = tracking
    ? `<span>📡</span> GPS En Vivo Activo (Clic para detener)`
    : `<span>📡</span> Activar Mi GPS Real`;
}

function centerOnUser() {
  if (!state.map || !state.userCoords) return;
  state.map.setView([state.userCoords.lat, state.userCoords.lng], 18, { animate: true });
}

function fitBothBounds() {
  if (typeof window.L === 'undefined' || !state.userCoords || !state.target) return;
  const bounds = window.L.latLngBounds([
    [state.userCoords.lat, state.userCoords.lng],
    state.target.coords
  ]);
  if (state.map) state.map.fitBounds(bounds, { padding: [55, 55], maxZoom: 18 });
  if (state.miniMap) state.miniMap.fitBounds(bounds, { padding: [26, 26], maxZoom: 17 });
}

function setupDOMListeners() {
  const targetSelect = document.getElementById('geo-landmark-select');
  if (targetSelect) {
    targetSelect.addEventListener('change', function (e) {
      setTarget(e.target.value);
    });
  }

  const editorStory = document.getElementById('geo-editor-story');
  const editorScene = document.getElementById('geo-editor-scene');
  const editorToggle = document.getElementById('geo-editor-toggle');
  const editorReset = document.getElementById('geo-editor-reset');
  if (editorStory) {
    editorStory.addEventListener('change', function () {
      state.editingSceneLocation = false;
      if (editorToggle) editorToggle.textContent = 'Editar ubicación en el mapa';
      if (state.map) state.map.getContainer().classList.remove('is-editing-scene-location');
      setActiveScene(editorStory.value, Number(editorScene ? editorScene.value : 0));
    });
  }
  if (editorScene) {
    editorScene.addEventListener('change', function () {
      state.editingSceneLocation = false;
      if (editorToggle) editorToggle.textContent = 'Editar ubicación en el mapa';
      if (state.map) state.map.getContainer().classList.remove('is-editing-scene-location');
      setActiveScene(state.activeStory, Number(editorScene.value));
    });
  }
  if (editorToggle) {
    editorToggle.addEventListener('click', function () {
      state.editingSceneLocation = !state.editingSceneLocation;
      editorToggle.textContent = state.editingSceneLocation ? 'Terminar edición' : 'Editar ubicación en el mapa';
      if (state.map) {
        state.markers.sceneMarkers.forEach((marker, index) => {
          if (!marker.dragging) return;
          if (state.editingSceneLocation && index === state.selectedSceneIndex) marker.dragging.enable();
          else marker.dragging.disable();
        });
        state.map.getContainer().classList.toggle('is-editing-scene-location', state.editingSceneLocation);
      }
      refreshSceneMarkers();
      updateSceneEditorStatus();
    });
  }
  if (editorReset) {
    editorReset.addEventListener('click', function () {
      const defaults = SCENE_DEFAULTS[state.activeStory][state.selectedSceneIndex];
      setSceneLocation(state.activeStory, state.selectedSceneIndex, defaults);
    });
  }

  const radiusSelect = document.getElementById('geo-radius-select');
  if (radiusSelect) {
    radiusSelect.addEventListener('change', function (e) {
      setRadius(Number(e.target.value));
    });
  }

  const btnSimulateIn = document.getElementById('btn-geo-simulate-in');
  const btnSimulateOut = document.getElementById('btn-geo-simulate-out');
  const btnWalkRoute = document.getElementById('btn-geo-walk-route');
  const btnSetHere = document.getElementById('btn-geo-set-here');
  const btnGps = document.getElementById('btn-toggle-gps');
  const btnCenter = document.getElementById('btn-geo-center');

  if (btnSimulateIn) btnSimulateIn.addEventListener('click', simulateInRange);
  if (btnSimulateOut) btnSimulateOut.addEventListener('click', simulateOutOfRange);
  if (btnWalkRoute) btnWalkRoute.addEventListener('click', () => walkShortestPath());
  if (btnSetHere) btnSetHere.addEventListener('click', setTargetToCurrentLocation);
  if (btnGps) btnGps.addEventListener('click', toggleGPSTracking);
  if (btnCenter) btnCenter.addEventListener('click', fitBothBounds);

  const arSimulateBtn = document.getElementById('ar-geo-simulate-btn');
  if (arSimulateBtn) {
    arSimulateBtn.addEventListener('click', simulateInRange);
  }

  const arWalkRouteBtn = document.getElementById('ar-radar-walk-route-btn');
  if (arWalkRouteBtn) {
    arWalkRouteBtn.addEventListener('click', () => walkShortestPath());
  }

  const arGoToMapBtn = document.getElementById('ar-geo-map-btn');
  if (arGoToMapBtn) {
    arGoToMapBtn.addEventListener('click', function () {
      if (window.TamayoAR && typeof window.TamayoAR.close === 'function') {
        window.TamayoAR.close();
      }
      setTimeout(() => {
        const mapSection = document.getElementById('mapa');
        if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    });
  }

  // Delegación para botones dentro de popups de escenas en el mapa
  document.addEventListener('click', function (ev) {
    const walkBtn = ev.target.closest('[data-popup-walk-scene]');
    if (walkBtn) {
      const sIdx = Number(walkBtn.getAttribute('data-popup-walk-scene')) || 0;
      const storyId = walkBtn.getAttribute('data-popup-story') || state.activeStory;
      setActiveScene(storyId, sIdx);
      walkShortestPath(sIdx);
      return;
    }
    const openBtn = ev.target.closest('[data-popup-open-scene]');
    if (openBtn) {
      const sIdx = Number(openBtn.getAttribute('data-popup-open-scene')) || 0;
      const storyId = openBtn.getAttribute('data-popup-story') || state.activeStory;
      setActiveScene(storyId, sIdx);
      window.dispatchEvent(new CustomEvent('historia:select-scene', { detail: { index: sIdx, storyId } }));
      const arView = document.getElementById('ar-view');
      if (!arView || arView.getAttribute('aria-hidden') !== 'false') {
        const openArTrigger = document.querySelector('[data-open-ar]');
        if (openArTrigger) openArTrigger.click();
      }
    }
  });

  window.addEventListener('resize', function () {
    if (state.map) state.map.invalidateSize();
    if (state.miniMap) state.miniMap.invalidateSize();
  });
}

// ─── API Global ───
window.HistoriaGeo = {
  LANDMARKS,
  SCENE_WAYPOINTS,
  getState: () => ({ ...state, sceneLocations: JSON.parse(JSON.stringify(state.sceneLocations)) }),
  isInRange: () => state.inRange,
  getDistance: () => state.distance,
  getRadius: () => state.radius,
  getTarget: () => state.target,
  getUserCoords: () => state.userCoords,
  getShortestRoute: () => state.shortestRoute,
  getSceneCoordinates,
  getSceneDistance,
  isSceneInRange,
  setSceneLocation,
  setActiveScene,
  getActiveScene: () => ({ storyId: state.activeStory, index: state.selectedSceneIndex }),
  setTarget,
  setRadius,
  setUserCoordinates,
  walkShortestPath,
  simulateInRange,
  simulateOutOfRange,
  setTargetToCurrentLocation,
  startGPSTracking,
  stopGPSTracking,
  toggleGPSTracking,
  centerOnUser,
  fitBothBounds,
    initLeafletMap,
  initARMiniMap
};

document.addEventListener('DOMContentLoaded', function () {
  setupDOMListeners();
  setTimeout(initLeafletMap, 150);
});
}) ();
