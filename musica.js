const audioDelPuesto = (() => {
  const pista = document.getElementById('musica');
  const boton = document.getElementById('sonido');
  const clave = 'mystery-sweet-musica';
  let estado = { activo: true, tiempo: 0 };

  let estabaSonando = false;

  function leerEstado() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(clave));
      if (guardado && typeof guardado.activo === 'boolean') estado = guardado;
    } catch (_) {}
  }

  function guardar() {
    try {
      sessionStorage.setItem(clave, JSON.stringify(estado));
    } catch (_) {}
  }

  function actualizarBoton() {
    const sonando = !pista.paused;
    const etiqueta = sonando ? 'Silenciar música' : 'Activar música';
    boton.textContent = sonando ? '🔊' : '🔇';
    boton.setAttribute('aria-pressed', String(sonando));
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
  }

  function iniciar() {
    if (!estado.activo || !pista.paused) return;
    const reproduccion = pista.play();
    if (reproduccion) reproduccion.catch(actualizarBoton);
  }

  function recuperarPosicion() {
    if (Number.isFinite(estado.tiempo) && estado.tiempo > 0 && estado.tiempo < pista.duration) {
      pista.currentTime = estado.tiempo;
    }
  }

  pista.addEventListener('loadedmetadata', recuperarPosicion, { once: true });

  pista.addEventListener('play', actualizarBoton);
  pista.addEventListener('pause', actualizarBoton);
  boton.addEventListener('click', () => {
    estado.activo = pista.paused;
    guardar();
    if (estado.activo) iniciar();
    else pista.pause();
  });
  window.addEventListener('pagehide', () => {
    estabaSonando = !pista.paused;
    if (pista.readyState > 0) estado.tiempo = pista.currentTime;
    guardar();
    pista.pause();
  });
  window.addEventListener('pageshow', () => {
    leerEstado();
    if (pista.readyState > 0) recuperarPosicion();
    if (estabaSonando) iniciar();
  });

  leerEstado();
  actualizarBoton();
  return { iniciar };
})();
