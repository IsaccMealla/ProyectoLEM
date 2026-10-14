(function () {
  const arView = document.getElementById('ar-view');
  const loading = document.getElementById('ar-loading');
  const hint = document.getElementById('ar-hint');
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
      if (marker) {
        marker.addEventListener('markerFound', onMarkerFound);
        marker.addEventListener('markerLost', onMarkerLost);
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