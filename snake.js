const ancho = 10;
const meta = 80;
const inicioBombas = 12;
const direcciones = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
const teclas = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
const tablero = document.getElementById('tablero');
const ficha = document.getElementById('ficha');
const jugar = document.getElementById('jugar');
const mensaje = document.getElementById('mensaje');
const contador = document.getElementById('puntos');
const casillas = Array.from({ length: ancho * ancho }, () => {
  const casilla = document.createElement('div');
  casilla.className = 'casilla';
  tablero.append(casilla);
  return casilla;
});

let cuerpo, direccion, siguiente, comida, bomba, proximaBomba, puntos, reloj, toque;

function celdaLibre(evitar) {
  const libres = casillas.flatMap((_, i) => cuerpo.includes(i) || i === evitar ? [] : [i]);
  return libres[Math.floor(Math.random() * libres.length)];
}

function dibujar(ahora) {
  casillas.forEach(casilla => {
    casilla.className = 'casilla';
    casilla.textContent = '';
  });
  cuerpo.forEach((i, tramo) => {
    casillas[i].classList.add(tramo === 0 ? 'cabeza' : 'cuerpo');
  });
  casillas[cuerpo[0]].textContent = '🐱';
  if (comida !== undefined) casillas[comida].textContent = '🍪';
  if (bomba) {
    const casilla = casillas[bomba.posicion];
    const edad = ahora - bomba.nace;
    if (!cuerpo.includes(bomba.posicion)) casilla.textContent = edad < 3400 ? '💣' : '💥';
    if (edad >= 3000 && edad < 3400) casilla.classList.add('aviso');
  }
}

function terminar(gano) {
  clearInterval(reloj);
  reloj = undefined;
  mensaje.textContent = gano ? '¡Ganaste! Juntaste 80 galletitas 🎉' : '¡Uy! Hasta acá llegó el gato';
  jugar.textContent = 'Volver a jugar';
  ficha.hidden = false;
  jugar.focus();
}

function mover() {
  const ahora = performance.now();
  if (bomba && ahora - bomba.nace >= 3850) {
    bomba = undefined;
    proximaBomba = ahora + 2200;
  }
  if (!bomba && puntos >= inicioBombas && ahora >= proximaBomba) {
    const posicion = celdaLibre(comida);
    if (posicion !== undefined) bomba = { posicion, nace: ahora };
  }

  direccion = siguiente;
  const [dx, dy] = direcciones[direccion];
  const x = cuerpo[0] % ancho + dx;
  const y = Math.floor(cuerpo[0] / ancho) + dy;
  const cabeza = y * ancho + x;
  const come = cabeza === comida;
  const ocupadas = come ? cuerpo : cuerpo.slice(0, -1);
  const tocaBomba = bomba && ahora - bomba.nace < 3000 && cabeza === bomba.posicion;
  if (x < 0 || x >= ancho || y < 0 || y >= ancho || ocupadas.includes(cabeza) || tocaBomba) {
    terminar(false);
    return;
  }

  cuerpo.unshift(cabeza);
  if (come) {
    puntos += 1;
    contador.value = puntos;
    comida = puntos === meta ? undefined : celdaLibre(bomba?.posicion);
  } else {
    cuerpo.pop();
  }
  dibujar(ahora);
  if (puntos === meta) terminar(true);
}

function orientar(nueva) {
  if (reloj === undefined || siguiente !== direccion) return;
  const [dx, dy] = direcciones[direccion];
  const [nx, ny] = direcciones[nueva];
  if (dx + nx !== 0 || dy + ny !== 0) siguiente = nueva;
}

jugar.addEventListener('click', () => {
  cuerpo = [53, 52, 51];
  direccion = siguiente = 'right';
  puntos = 0;
  bomba = undefined;
  proximaBomba = 0;
  comida = celdaLibre();
  contador.value = puntos;
  ficha.hidden = true;
  dibujar(performance.now());
  reloj = setInterval(mover, 205);
});
document.querySelector('.mandos').addEventListener('click', evento => {
  const boton = evento.target.closest('[data-dir]');
  if (boton) orientar(boton.dataset.dir);
});
document.addEventListener('keydown', evento => {
  const nueva = teclas[evento.key] || teclas[evento.key.toLowerCase()];
  if (!nueva || reloj === undefined) return;
  evento.preventDefault();
  orientar(nueva);
});
tablero.addEventListener('pointerdown', evento => {
  toque = { x: evento.clientX, y: evento.clientY };
  tablero.setPointerCapture(evento.pointerId);
});
tablero.addEventListener('pointermove', evento => {
  if (!toque) return;
  const dx = evento.clientX - toque.x;
  const dy = evento.clientY - toque.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
  orientar(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
  toque = { x: evento.clientX, y: evento.clientY };
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(tipo => tablero.addEventListener(tipo, () => { toque = undefined; }));
