# Historia Viva AR · Plaza Murillo

Landing educativa y experiencia WebAR con A-Frame 1.3.0 y AR.js 3.4.5. Las bibliotecas se cargan desde CDN; se necesita conexión a internet.

## Ejecutar

Sirve la carpeta desde `localhost` para probarla en el navegador, o publícala bajo HTTPS. El acceso a la cámara no funciona desde una página abierta como `file://`. En móvil, abre la URL pública y concede permiso de cámara.

```powershell
python -m http.server 8080
```

## Assets

- `assets/images/hiro-marker.png`: marcador HIRO de AR.js para imprimir.
- `assets/models/murillo_placeholder.glb`: busto low-poly de prueba. Sustitúyelo por el modelo 3D definitivo conservando la ruta, o actualiza la referencia en `index.html`.
- `assets/audio/proclama_1809.mp3`: coloca aquí una narración autorizada. Si no existe, el botón utiliza la voz en español disponible en el navegador. La voz sintetizada es una narración educativa, no una grabación histórica.

La vista AR solicita cámara al abrirse y detiene las pistas al cerrarla. La experiencia requiere un navegador con WebRTC y seguimiento de marcadores compatible.