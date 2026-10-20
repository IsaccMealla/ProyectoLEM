# Historia Viva AR · Franz Tamayo & UNIFRANZ

Landing educativa y experiencia WebAR sobre el pensamiento de Franz Tamayo, su obra *Creación de la pedagogía nacional* (1910), la fundación de UNIFRANZ (1990) y su presencia en Bolivia. La escena AR usa A-Frame 1.3.0, aframe-extras 6.1.1 y AR.js 3.4.5 desde CDN; se necesita conexión a internet.

## Ejecutar

Sirve la carpeta desde `localhost` para probarla en el navegador, o publícala bajo HTTPS. El acceso a la cámara no funciona desde una página abierta como `file://`.

```powershell
python -m http.server 8080
```

En móvil, abre la URL pública, escanea el QR de acceso si está disponible, permite el uso de la cámara y apunta al marcador HIRO.

## Assets de la experiencia AR

- `assets/images/hiro-marker.png`: marcador HIRO de AR.js para imprimir.
- `assets/models/franz_tamayo.glb`: modelo 3D de Franz Tamayo cargado por la escena AR con animación ceremonial y pedestal interactivo.
- `assets/audio/escena1.mp3` a `assets/audio/escena5.mp3`: audios oficiales individuales de las cinco escenas narradas.

El HUD permite avanzar y retroceder entre las cinco escenas; cada una actualiza el guion histórico, el reproductor de audio con barra de progreso y la animación en realidad aumentada. La cámara se solicita al abrir la experiencia y sus pistas se detienen al cerrarla. La experiencia requiere un navegador compatible con WebRTC y seguimiento de marcadores.
