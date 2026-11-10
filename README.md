# Historia Viva · Franz Tamayo & UNIFRANZ (AR & VR)

Landing educativa con dos experiencias inmersivas sobre el pensamiento de Franz Tamayo, su obra *Creación de la pedagogía nacional* (1910), la fundación de UNIFRANZ (1990) y su proyección nacional:

1. **Modo Cámara AR (estilo Pokémon GO):** Muestra la cámara del smartphone con personajes y movimientos procedurales por escena, sin marcadores impresos ni códigos QR. El selector permite elegir entre Franz Tamayo y Eduardo Abaroa; cada recorrido dispone de cinco escenas y un panel de video flotante.
2. **Geolocalización por escena (Geocerca en Tiempo Real):** Cada escena de Franz Tamayo y Eduardo Abaroa tiene un punto de activación editable en el mapa. El personaje y la narración se habilitan cuando el usuario está dentro del radio configurado; los puntos editados se guardan en el navegador.
3. **Realidad Virtual Inmersiva (VR 360°):** Entorno espacial 360° con iluminación, niebla, panel interactivo y **Modo Gafas VR** estereoscópico para visores de smartphone (Google Cardboard / VR Box) con retícula de mirada (control manos libres).

> El modo cámara solicita permiso para la cámara, la ubicación GPS y la orientación del dispositivo. Las escenas se sitúan en coordenadas geográficas editables y el punto de vista sigue la ubicación GPS para que no queden pegadas a la cámara. Es una aproximación basada en GPS/brújula, no un anclaje persistente de ARCore/ARKit; la precisión depende del dispositivo, la señal y la calibración del rumbo. Los puntos iniciales de Abaroa son aproximados y deben confirmarse en el lugar.

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
- `assets/audio/2.1Escena.mp3` a `assets/audio/2.5Escena.mp3` (la escena 2 y 3 usan los nombres actuales `2.2escena.mp3` y `2.3escena.mp3`): narraciones VR de las cinco escenas de Eduardo Abaroa.
- `assets/models/Soldado Chileno.glb` y `assets/models/colorado.glb`: modelos 3D usados como atacante y defensor en las escenas AR de preparativos, combate y resistencia de Abaroa.
- `assets/videos/franz-tamayo/`: videos opcionales `escena-1.mp4` a `escena-5.mp4`.
- `assets/videos/eduardo-abaroa/`: `Escena2.1.mp4` a `Escena2.5.mp4`.
- `assets/models/EduardoAbaroa.glb`: modelo 3D cargado al seleccionar el recorrido de Eduardo Abaroa.
- `js/geo-manager.js`: Gestor del mapa interactivo con Leaflet, geocercas dinámicas, cálculo de distancia por Haversine y control de bloqueo/desbloqueo de animación.
- `js/ar-experience.js`: Controlador del Modo Pokémon GO con cámara real del smartphone, giroscopio 360°, geocerca estricta y caminata interactiva.
- `js/vr-experience.js`: Controlador de la experiencia de Realidad Virtual 360° y modo Cardboard.
- `js/tamayo-fx.js`: Animador procedural de Franz Tamayo, deformación de vertex shader, modo estatua/despertar por rango y efectos temporales.
- `js/main.js`: Lógica principal, cronología interactiva, comandos de voz y orquestación general.

En el modo cámara, el selector de recorrido cambia entre Franz Tamayo y Eduardo Abaroa. El HUD permite elegir entre cinco escenas por recorrido; cada escena puede mostrar un video flotante. Para activar los videos, coloca los archivos con los nombres indicados en `assets/videos/`; deben ser MP4 con códec H.264 y se reproducen sin sonido para no mezclarse con la narración. El modelo de Abaroa no incluye esqueleto ni clips de animación y es pesado (aprox. 64 MB), por lo que puede tardar en cargar en teléfonos; durante la carga se muestra un aviso y, al terminar, aparece a escala aproximada de una persona.

En la sección **Mapa GPS**, selecciona recorrido y escena y pulsa **Editar ubicación en el mapa**; puedes hacer clic para colocar el punto o arrastrar su marcador. Las ubicaciones se guardan en `localStorage` del navegador actual (no se comparten entre dispositivos ni usuarios). Al abrir AR en el móvil, el mapa aparece desplegado como panel inferior para elegir la escena y consultar la ruta; **Minimizar mapa** lo pliega para ver la cámara y **Mostrar mapa** vuelve a abrirlo. Al desplegar el mapa, el panel inferior de escenas se pliega para dejar espacio, pero su tirador sigue disponible para abrirlo. La fila superior de controles se puede desplazar horizontalmente con el dedo para acceder a **Simular sitio**, el mapa y el estado GPS. **Simular sitio** coloca la vista a unos 3–4 metros de la escena para comprobar su escala y permite explorar sin estar en la ubicación histórica. Si el GPS ya está activo —o se activa después—, el movimiento del teléfono desplaza la vista respecto a la escena simulada; sin GPS, el modo es una vista previa fija. La simulación no modifica ni guarda las coordenadas históricas configuradas. La narración se habilita cuando la ubicación real o simulada está dentro del radio de la escena.

La cámara se solicita al abrir la experiencia y se detiene al cerrarla. Se requiere un navegador compatible con WebRTC y servir el sitio desde `localhost` o HTTPS. El acceso a geocercas en un teléfono requiere conceder también permiso de ubicación. El servidor local incluido admite solicitudes parciales de video para que los MP4 puedan reproducirse y buscarse sin descargar el archivo completo.

### VR · Eduardo Abaroa — Escenas 1–5

El recorrido VR de Abaroa ofrece cinco escenas seleccionables: el mapa de la introducción, los preparativos del vado, una representación estilizada del combate, la última resistencia y un memorial interactivo. Usa las pistas `2.1Escena.mp3`–`2.5Escena.mp3`; la escena 1 revela la ruta a los 15 segundos y presenta a Abaroa a los 24 segundos. Los hitos del mapa y la línea de tiempo del memorial se seleccionan por mirada o toque, igual que los objetos informativos.

La interfaz VR se adapta a pantallas de celular y respeta las áreas seguras del dispositivo; en pantallas pequeñas reduce controles y paneles para dejar visible la escena. Durante la narración aparecen captions cinematográficos progresivos tanto en pantalla como en el panel 3D del visor. Las escenas de Abaroa muestran captions narrativos sincronizados aproximadamente con cada audio; no son transcripciones literales.

En AR, las cinco narraciones de Abaroa están disponibles y cada escena se activa desde su punto editable. La escena de preparativos muestra el modelo 3D de Colorado junto con defensores procedurales que cargan sacos; en el combate aparece el Colorado como defensor y el modelo 3D de Soldado Chileno como atacante, y en la última resistencia aparecen los soldados chilenos junto con actores de apoyo. Las formaciones 3D se cargan bajo demanda y se mueven con marcha/carrera procedural, balanceo y retirada sincronizados aproximadamente con el audio. El archivo `murillo_placeholder.glb` es un busto conmemorativo no asignado a estas escenas para evitar representar a otro personaje como Abaroa. Los GLB de Abaroa, Colorado y el soldado chileno no incluyen rig ni clips de animación: las mallas 3D se desplazan como conjunto y no articulan piernas o brazos individualmente. Para una caminata esquelética, gestos con fusil y manipulación fiel de objetos hace falta proporcionar modelos riggeados con clips. La utilería también tiene movimiento ambiental: pulsos sobre el mapa, ondas y sacos en los preparativos, humo y tablones en el combate, polvo y puente en la resistencia, y una línea de tiempo, banderas y partículas en el memorial. En el teléfono, la posición de cada escena se calcula desde sus coordenadas GPS editables; al caminar, el punto de vista se desplaza para mantener la escena en su lugar. Esto requiere permisos de ubicación/orientación y funciona como aproximación GPS/brújula, sin persistencia espacial de ARCore/ARKit.

En VR, las animaciones de combate y diálogo se representan con movimientos procedurales, gestos y efectos sincronizados aproximadamente con cada narración. No hay assets independientes de fusil, carta, mapa original ni efectos/diálogos espaciales. Los tres objetos del memorial son representaciones visuales informativas, no objetos que se puedan agarrar físicamente. Los momentos de los gestos en las escenas 2–4 se estiman como fracciones de cada audio y deben ajustarse cuando se confirmen los tiempos exactos de las frases.
