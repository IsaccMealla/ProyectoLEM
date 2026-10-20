(function () {
  const scenes = [
    {
      title: 'El Despertar de Franz Tamayo',
      period: '1879 — 1956',
      narration: 'Franz Tamayo nació en La Paz en 1879 y murió en 1956. Fue poeta, pensador, jurista y una de las voces intelectuales más influyentes de Bolivia. Su obra recorrió la literatura, la política y la reflexión sobre la identidad nacional. En esta primera escena comenzamos un viaje por sus ideas y por la huella que dejaron en la historia del país.'
    },
    {
      title: 'El Pensamiento y la Educación',
      period: '1910',
      narration: 'En 1910, Franz Tamayo publicó Creación de la pedagogía nacional. En esta obra reflexionó sobre la educación boliviana y sostuvo que debía pensarse desde la realidad, la historia y las características propias del país. Su propuesta abrió un debate sobre cómo formar a las nuevas generaciones y sobre el papel de la educación en la construcción de Bolivia. Más de un siglo después, esa pregunta sigue vigente: ¿cómo educar para comprender y transformar nuestra sociedad?'
    },
    {
      title: 'El Nacimiento de UNIFRANZ',
      period: '1990 — 1993',
      narration: 'El 4 de noviembre de 1990, Abel Ágreda y Celsa Nogales de Ágreda fundaron la Universidad Privada Franz Tamayo, UNIFRANZ. Su nombre rinde homenaje al pensador boliviano y establece un diálogo entre su legado y el compromiso con la educación superior. Entre 1990 y 1993, la institución comenzó a consolidar su proyecto universitario, abriendo nuevas posibilidades de formación para el país.'
    },
    {
      title: 'Una Universidad en Crecimiento',
      period: 'PRESENCIA NACIONAL',
      narration: 'Con el paso del tiempo, UNIFRANZ amplió su presencia en Bolivia. Hoy cuenta con sedes en La Paz, El Alto, Cochabamba y Santa Cruz. En cada ciudad, estudiantes y docentes forman parte de una comunidad universitaria que conecta distintas realidades y contribuye al desarrollo de sus regiones. Esta expansión expresa una apuesta por acercar la educación superior a más personas y territorios.'
    },
    {
      title: 'El Legado Continúa',
      period: 'HOY Y MAÑANA',
      narration: 'El legado de Franz Tamayo continúa cada vez que una nueva generación cuestiona, aprende y propone caminos para Bolivia. La innovación y la investigación permiten convertir ideas en respuestas para los desafíos de la sociedad. Estudiantes: el futuro no está escrito; se construye con curiosidad, conocimiento y compromiso. La historia sigue viva en ustedes.'
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
