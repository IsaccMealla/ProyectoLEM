# Historia Viva · Franz Tamayo & UNIFRANZ (AR & VR)

Landing educativa con dos experiencias inmersivas sobre el pensamiento de Franz Tamayo, su obra *Creación de la pedagogía nacional* (1910), la fundación de UNIFRANZ (1990) y su proyección nacional:

1. **Modo Pokémon GO (Cámara Real sin Marcador QR):** Proyección de Franz Tamayo en el entorno real mediante la cámara del smartphone y sensores de orientación/giroscopio 360°, sin necesidad de marcadores impresos ni códigos QR. Franz Tamayo camina por el lugar, patrulla autónomamente o se dirige hacia donde toques la pantalla.
2. **Geolocalización Estricta (Geocerca en Tiempo Real):** Franz Tamayo y sus animaciones **SOLO se materializan cuando te encuentras dentro del sitio histórico en el mapa**. Fuera del sitio no se ve nada salvo el radar escaneando el entorno. Incluye soporte para GPS real y botón rápido de simulación.
3. **Realidad Virtual Inmersiva (VR 360°):** Entorno espacial 360° con iluminación, niebla, panel interactivo y **Modo Gafas VR** estereoscópico para visores de smartphone (Google Cardboard / VR Box) con retícula de mirada (control manos libres).

---

## 🚀 Cómo ejecutar localmente

Sirve la carpeta desde un servidor local (o bajo HTTPS para permitir el acceso a la cámara y al giroscopio del móvil):

```powershell
# En PowerShell / Terminal:
node server.js
# O con Python:
python -m http.server 3000
```

Abre en tu navegador `http://localhost:3000` (o la IP local desde tu teléfono conectado a la misma red Wi-Fi).

---

## 🎭 Las 5 Escenas Históricas

1. **Escena 01:** *El Despertar de Franz Tamayo (1879 — 1956)*
2. **Escena 02:** *El Pensamiento y la Educación (1910 - Creación de la pedagogía nacional)*
3. **Escena 03:** *El Nacimiento de UNIFRANZ (1990 — 1993)*
4. **Escena 04:** *Una Universidad en Crecimiento (La Paz, El Alto, Cochabamba y Santa Cruz)*
5. **Escena 05:** *El Legado Continúa (Hoy y Mañana)*

---

## 📦 Assets y Recursos

- `assets/models/franz_tamayo.glb`: Modelo 3D oficial con animaciones de Franz Tamayo utilizado tanto en AR como en VR.
- `assets/images/hiro-marker.png`: Marcador HIRO para enfocar con la cámara en el modo AR.
- `assets/audio/escena1.mp3` a `assets/audio/escena5.mp3`: archivos de locución de las cinco escenas narradas.
- `js/geo-manager.js`: Gestor del mapa interactivo con Leaflet, geocercas dinámicas, cálculo de distancia por Haversine y control de bloqueo/desbloqueo de animación.
- `js/ar-experience.js`: Controlador del Modo Pokémon GO con cámara real del smartphone, giroscopio 360°, geocerca estricta y caminata interactiva.
- `js/vr-experience.js`: Controlador de la experiencia de Realidad Virtual 360° y modo Cardboard.
- `js/tamayo-fx.js`: Animador procedural de Franz Tamayo, deformación de vertex shader, modo estatua/despertar por rango y efectos temporales.
- `js/main.js`: Lógica principal, cronología interactiva, comandos de voz y orquestación general.

El HUD permite avanzar y retroceder entre las cinco escenas; cada una actualiza el guion histórico, el reproductor de audio y la animación en realidad aumentada. La cámara se solicita al abrir la experiencia y las pistas se detienen al cerrarla. La experiencia requiere un navegador compatible con WebRTC y seguimiento de marcadores.
