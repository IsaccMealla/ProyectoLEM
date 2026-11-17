# Historia Viva · Franz Tamayo & UNIFRANZ (AR & VR)

Landing educativa con dos experiencias inmersivas sobre el pensamiento de Franz Tamayo, su obra *Creación de la pedagogía nacional* (1910), la fundación de UNIFRANZ (1990) y su proyección nacional:

1. **Modo Cámara AR (estilo Pokémon GO):** Muestra la cámara del smartphone con Franz Tamayo y movimientos procedurales por escena, sin marcadores impresos ni códigos QR. Las cinco escenas disponen de panel de video flotante opcional.
2. **Geolocalización por escena (Geocerca en Tiempo Real):** Cada escena de Franz Tamayo tiene un punto de activación editable en el mapa. El personaje y la narración se habilitan cuando el usuario está dentro del radio configurado; los puntos editados se guardan en el navegador.
3. **Realidad Virtual Inmersiva (VR 360°):** Entorno espacial 360° con iluminación, niebla, panel interactivo y **Modo Gafas VR** estereoscópico para visores de smartphone (Google Cardboard / VR Box) con retícula de mirada (control manos libres).

> El modo cámara solicita permiso para la cámara, la ubicación GPS y la orientación del dispositivo. Las escenas se sitúan en coordenadas geográficas editables y el punto de vista sigue la ubicación GPS para que no queden pegadas a la cámara. Es una aproximación basada en GPS/brújula, no un anclaje persistente de ARCore/ARKit; la precisión depende del dispositivo, la señal y la calibración del rumbo.

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

- `assets/models/FranzTamayoReal.glb`: El mismo modelo riggeado de Franz Tamayo se utiliza en AR y VR. En AR, sus gestos de brazos y manos, cambios de postura, pasos y movimiento procedural de boca se sincronizan con las cinco etapas; el GLB no incluye clips ni morphs faciales. La fachada AR deja transparentes los paneles de la entrada para mostrar el vestíbulo 3D.
- `assets/images/hiro-marker.png`: Marcador HIRO para enfocar con la cámara en el modo AR.
- `assets/audio/escena1.mp3` a `assets/audio/escena5.mp3`: archivos de locución de las cinco escenas narradas.
- `assets/videos/franz-tamayo/`: videos opcionales `escena-1.mp4` a `escena-5.mp4`.
- `js/geo-manager.js`: Gestor del mapa interactivo con Leaflet, geocercas dinámicas, cálculo de distancia por Haversine y control de bloqueo/desbloqueo de animación.
- `js/ar-experience.js`: Controlador del Modo Pokémon GO con cámara real del smartphone, giroscopio 360°, geocerca estricta y caminata interactiva.
- `js/vr-experience.js`: Controlador de la experiencia de Realidad Virtual 360° y modo Cardboard.
- `js/unifranz-experience.js`: Animaciones esqueléticas y faciales de Franz en AR sincronizadas con la narración de cada etapa.
- `js/tamayo-fx.js`: Efectos de la Máquina del Tiempo y animación procedural por shader de Franz.
- `js/main.js`: Lógica principal, cronología interactiva, comandos de voz y orquestación general.

En el modo cámara, el HUD permite elegir entre las cinco escenas de Franz Tamayo; cada escena puede mostrar un video flotante. Para activar los videos, coloca archivos MP4 con códec H.264 en `assets/videos/franz-tamayo/`; se reproducen sin sonido para no mezclarse con la narración.

En la sección **Mapa GPS**, selecciona una escena y pulsa **Editar ubicación en el mapa**; puedes hacer clic para colocar el punto o arrastrar su marcador. Las ubicaciones se guardan en `localStorage` del navegador actual (no se comparten entre dispositivos ni usuarios). Al abrir AR en el móvil, el mapa aparece desplegado como panel inferior para elegir la escena y consultar la ruta; **Minimizar mapa** lo pliega para ver la cámara y **Mostrar mapa** vuelve a abrirlo. Al desplegar el mapa, el panel inferior de escenas se pliega para dejar espacio, pero su tirador sigue disponible para abrirlo. La fila superior de controles se puede desplazar horizontalmente con el dedo para acceder a **Simular sitio**, el mapa y el estado GPS. **Simular sitio** coloca la vista a unos 3–4 metros de la escena para comprobar su escala y permite explorar sin estar en la ubicación histórica. Si el GPS ya está activo —o se activa después—, el movimiento del teléfono desplaza la vista respecto a la escena simulada; sin GPS, el modo es una vista previa fija. La simulación no modifica ni guarda las coordenadas históricas configuradas. La narración se habilita cuando la ubicación real o simulada está dentro del radio de la escena.

La cámara se solicita al abrir la experiencia y se detiene al cerrarla. Se requiere un navegador compatible con WebRTC y servir el sitio desde `localhost` o HTTPS. El acceso a geocercas en un teléfono requiere conceder también permiso de ubicación. El servidor local incluido admite solicitudes parciales de video para que los MP4 puedan reproducirse y buscarse sin descargar el archivo completo.

### Experiencia VR

La interfaz VR se adapta a pantallas de celular y respeta las áreas seguras del dispositivo; en pantallas pequeñas reduce controles y paneles para dejar visible la escena. Durante la narración aparecen captions cinematográficos progresivos tanto en pantalla como en el panel 3D del visor.
