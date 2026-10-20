# Historia Viva · Franz Tamayo & UNIFRANZ (AR & VR)

Landing educativa con dos experiencias inmersivas sobre el pensamiento de Franz Tamayo, su obra *Creación de la pedagogía nacional* (1910), la fundación de UNIFRANZ (1990) y su proyección nacional:

1. **Realidad Aumentada (AR):** Visualización del modelo 3D de Franz Tamayo sobre el marcador HIRO en el entorno real mediante la cámara del smartphone.
2. **Realidad Virtual Inmersiva (VR 360°):** Entorno espacial 360° con iluminación, niebla, panel interactivo y **Modo Gafas VR** estereoscópico para visores de smartphone (Google Cardboard / VR Box) con retícula de mirada (control manos libres).

---

## 🚀 Cómo ejecutar localmente

Sirve la carpeta desde un servidor local (o bajo HTTPS para permitir el acceso a la cámara y al giroscopio del móvil):

```powershell
# En PowerShell / Terminal:
python -m http.server 8080
# O con Node.js / npx:
npx serve .
```

Abre en tu navegador `http://localhost:8080` (o la IP local desde tu teléfono conectado a la misma red Wi-Fi).

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
- `assets/audio/escena_franz_tamayo.mp3`: Archivo de locución opcional (con respaldo automático por `speechSynthesis` en español `es-BO`).
- `js/ar-experience.js`: Controlador de la experiencia de Realidad Aumentada con AR.js.
- `js/vr-experience.js`: Controlador de la experiencia de Realidad Virtual 360° y modo Cardboard.
- `js/main.js`: Lógica principal, cronología interactiva y orquestación de ambas modalidades.
