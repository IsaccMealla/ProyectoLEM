(function () {
  const scenes = [
    {
      title: 'El Despertar de Franz Tamayo',
      period: '1879 — 1956',
      audio: 'assets/audio/escena1.mp3',
      narration: '¡Saludos! Soy Franz Tamayo, poeta, escritor y pensador boliviano. Quizás se pregunten por qué mi nombre forma parte de una universidad. Hoy quiero invitarlos a viajar en el tiempo para descubrir una historia que une el pensamiento, la educación y el futuro de Bolivia. ¿Me acompañan?'
    },
    {
      title: 'El Pensamiento y la Educación',
      period: '1910',
      audio: 'assets/audio/escena2.mp3',
      narration: 'A lo largo de mi vida, reflexioné sobre la importancia de la educación para el desarrollo de nuestro país. En 1910 publiqué Creación de la pedagogía nacional, una obra en la que planteé reflexiones sobre cómo debía pensarse la educación boliviana. Décadas después, mi nombre sería elegido para representar una institución comprometida con la formación de nuevas generaciones.'
    },
    {
      title: 'El Nacimiento de UNIFRANZ',
      period: '1990 — 1993',
      audio: 'assets/audio/escena3.mp3',
      narration: 'Viajemos ahora al año 1990. El 4 de noviembre de ese año se fundó la Universidad Privada Franz Tamayo, conocida como UNIFRANZ, gracias a la iniciativa de Abel Ágreda y Celsa Nogales de Ágreda. En 1993, después de obtener las autorizaciones legales correspondientes, la universidad comenzó a hacer realidad su proyecto educativo en la ciudad de La Paz. Sus primeros espacios eran modestos, pero detrás de ellos existía una gran visión: abrir nuevas oportunidades de formación profesional.'
    },
    {
      title: 'Una Universidad en Crecimiento',
      period: 'Presencia Nacional',
      audio: 'assets/audio/escena4.mp3',
      narration: 'Con el paso de los años, UNIFRANZ fue creciendo y extendiendo su presencia a otras ciudades de Bolivia. La universidad evolucionó junto con las nuevas necesidades de la sociedad, incorporando propuestas de innovación, investigación y aprendizaje práctico. Así, lo que comenzó como un proyecto educativo en La Paz se convirtió en una institución con presencia en distintas regiones del país.'
    },
    {
      title: 'El Legado Continúa',
      period: 'Hoy y Mañana',
      audio: 'assets/audio/escena5.mp3',
      narration: 'Y hoy, jóvenes universitarios, ustedes son parte de esta historia. Cada idea que desarrollan, cada conocimiento que adquieren y cada desafío que superan contribuye a construir el futuro de nuestra sociedad. Mi nombre representa un legado intelectual, pero son ustedes quienes pueden darle un nuevo significado a través de sus acciones. La historia de UNIFRANZ continúa escribiéndose con cada generación de estudiantes. Bienvenidos a UNIFRANZ, Universidad Privada Franz Tamayo. ¡El futuro es hoy!'
    }
  ];
  window.HistoriaVivaScenes = scenes;

  document.querySelectorAll('.timeline-trigger').forEach(function (button) {
    button.addEventListener('click', function () {
      const wasOpen = button.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.timeline-trigger').forEach(function (trigger) {
        trigger.classList.remove('is-active');
        trigger.setAttribute('aria-expanded', 'false');
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (panel) panel.hidden = true;
      });
      if (!wasOpen) {
        button.classList.add('is-active');
        button.setAttribute('aria-expanded', 'true');
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
        document.dispatchEvent(new CustomEvent('historia:select-scene', {
          detail: { index: Number(button.dataset.scene) }
        }));
      }
    });
  });
})();
