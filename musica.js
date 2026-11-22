const audioDelPuesto = (() => {
  const pista = document.getElementById('musica');
  const boton = document.getElementById('ajustes');
  const clave = 'mystery-sweet-musica';
  const estado = { volumen: 1, tiempo: 0, suerte: 50 };
  const panel = document.createElement('dialog');
  panel.id = 'panel-ajustes';
  panel.setAttribute('aria-labelledby', 'titulo-ajustes');
  panel.innerHTML = `
    <header><h2 id="titulo-ajustes">Ajustes</h2><form method="dialog"><button type="submit" aria-label="Cerrar ajustes">✕</button></form></header>
    <label for="volumen">Volumen <output id="nivel-volumen" for="volumen"></output></label>
    <input id="volumen" type="range" min="0" max="100">
    <label for="suerte">Suerte <span>Fundamental!</span></label>
    <input id="suerte" type="range" min="0" max="100">
    ${boton.dataset.juego ? '' : '<a href="snake.html">🐱 Jugar al Gato Viborita</a>'}`;
  document.body.append(panel);
  const volumen = panel.querySelector('#volumen');
  const nivel = panel.querySelector('#nivel-volumen');
  const suerte = panel.querySelector('#suerte');

  function leerEstado() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(clave));
      if (!guardado) return;
      if (Number.isFinite(guardado.volumen) && guardado.volumen >= 0 && guardado.volumen <= 1) estado.volumen = guardado.volumen;
      if (Number.isFinite(guardado.tiempo)) estado.tiempo = guardado.tiempo;
      if (Number.isFinite(guardado.suerte)) estado.suerte = guardado.suerte;
    } catch (_) {}
  }

  function guardar() {
    if (pista.readyState > 0) estado.tiempo = pista.currentTime;
    try { sessionStorage.setItem(clave, JSON.stringify(estado)); } catch (_) {}
  }

  function aplicarVolumen() {
    pista.volume = estado.volumen;
    pista.muted = estado.volumen === 0;
    volumen.value = String(Math.round(estado.volumen * 100));
    nivel.value = volumen.value + '%';
  }

  function iniciar() {
    if (!pista.paused) return;
    const reproduccion = pista.play();
    if (reproduccion) reproduccion.catch(() => {});
  }

  function recuperarPosicion() {
    if (estado.tiempo > 0 && estado.tiempo < pista.duration) pista.currentTime = estado.tiempo;
  }

  boton.addEventListener('click', () => panel.showModal());
  volumen.addEventListener('input', () => {
    estado.volumen = Number(volumen.value) / 100;
    aplicarVolumen();
    iniciar();
    guardar();
  });
  suerte.addEventListener('input', () => {
    estado.suerte = Number(suerte.value);
    guardar();
  });

  pista.addEventListener('loadedmetadata', recuperarPosicion, { once: true });
  window.addEventListener('pagehide', () => {
    guardar();
    pista.pause();
  });
  window.addEventListener('pageshow', () => {
    leerEstado();
    aplicarVolumen();
    suerte.value = estado.suerte;
    if (pista.readyState > 0) recuperarPosicion();
    iniciar();
  });
  document.addEventListener('click', iniciar, true);
  document.addEventListener('keydown', iniciar, true);
  leerEstado();
  aplicarVolumen();
  suerte.value = estado.suerte;
  return { iniciar };
})();
