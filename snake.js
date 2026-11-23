const lado = 10;
const meta = 80;
const paso = 205;
const tamano = 60;
const direcciones = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
const teclas = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
const tablero = document.getElementById('tablero');
const lienzo = tablero.getContext('2d');
const fondoTablero = document.createElement('canvas');
fondoTablero.width = fondoTablero.height = lado * tamano;
const ficha = document.getElementById('ficha');
const jugar = document.getElementById('jugar');
const mensaje = document.getElementById('mensaje');
const detalle = document.getElementById('detalle');
const contador = document.getElementById('puntos');
const avance = document.getElementById('avance');
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)');

let cuerpo = [55, 54, 53, 52];
let anterior = cuerpo;
let direccion = 'right';
let siguiente = direccion;
let comida = 37;
let bomba, proximaBomba, toque, ultimoPaso, vista, pausaDesde;
let puntos = 0;
let jugando = false;

function coordenadas(i) {
  return [(i % lado + .5) * tamano, (Math.floor(i / lado) + .5) * tamano];
}

function celdaLibre(evitar) {
  const ocupadas = new Set(cuerpo);
  const libres = [];
  for (let i = 0; i < lado * lado; i++) {
    if (!ocupadas.has(i) && i !== evitar) libres.push(i);
  }
  return libres[Math.floor(Math.random() * libres.length)];
}

function elipse(x, y, radioX, radioY, color, rotacion = 0) {
  lienzo.fillStyle = color;
  lienzo.beginPath();
  lienzo.ellipse(x, y, radioX, radioY, rotacion, 0, Math.PI * 2);
  lienzo.fill();
}

function linea(puntosLinea, color, grosor) {
  lienzo.strokeStyle = color;
  lienzo.lineWidth = grosor;
  lienzo.lineCap = 'round';
  lienzo.lineJoin = 'round';
  lienzo.beginPath();
  puntosLinea.forEach(([x, y], i) => i === 0 ? lienzo.moveTo(x, y) : lienzo.lineTo(x, y));
  lienzo.stroke();
}

function dibujarFondo() {
  const superficie = fondoTablero.getContext('2d');
  for (let i = 0; i < lado * lado; i++) {
    const [x, y] = coordenadas(i);
    superficie.fillStyle = ((i % lado) + Math.floor(i / lado)) % 2 ? '#36262b' : '#3d2b30';
    superficie.fillRect(x - tamano / 2, y - tamano / 2, tamano, tamano);
    if (i % 7 === 0) {
      superficie.fillStyle = '#765046';
      superficie.fillRect(x + 14, y - 15, 3, 3);
      superficie.fillRect(x + 20, y - 9, 2, 2);
    }
  }
}

function dibujarGalleta(ahora) {
  if (comida === undefined) return;
  const [x, y] = coordenadas(comida);
  const salto = movimientoReducido.matches ? 0 : Math.sin(ahora / 200) * 2.3;
  elipse(x, y + 20, 19, 4, '#180e1680');
  elipse(x, y + salto, 21, 20, '#ae633e', -.2);
  elipse(x - 1, y + salto - 2, 18, 16.5, '#f7bf6d', -.2);
  [[-8, -7, 3.8], [7, -8, 2.7], [1, 0, 4], [-9, 7, 2.8], [9, 7, 3.5]].forEach(([dx, dy, r]) => {
    elipse(x + dx, y + salto + dy, r, r * .8, '#5e3329', .4);
  });
}

function dibujarBomba(ahora) {
  if (!bomba) return;
  const [x, y] = coordenadas(bomba.posicion);
  const edad = ahora - bomba.nace;
  lienzo.save();
  lienzo.translate(x, y);
  if (edad >= 3400) {
    const etapa = (edad - 3400) / 450;
    lienzo.globalAlpha = Math.max(0, 1 - etapa);
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      const distancia = 8 + etapa * 24;
      elipse(Math.cos(t) * distancia, Math.sin(t) * distancia, 5, 5, i % 2 ? '#ff9765' : '#ffd887');
    }
    elipse(0, 0, 11, 11, '#ffeaa4');
  } else {
    if (edad >= 3000 && !movimientoReducido.matches && Math.floor(edad / 65) % 2) lienzo.globalAlpha = .25;
    elipse(0, 2, 18, 17, '#1b151d');
    elipse(-6, -4, 6, 4, '#746074', -.25);
    linea([[3, -12], [9, -20], [15, -19]], '#c89264', 4);
    elipse(17, -18, 4, 4, '#ffbc69');
  }
  lienzo.restore();
}

function patas(posicion, angulo, fase) {
  lienzo.save();
  lienzo.translate(...posicion);
  lienzo.rotate(angulo);
  for (const ladoPata of [-1, 1]) {
    const avancePata = Math.sin(fase + (ladoPata === 1 ? Math.PI : 0)) * 8;
    linea([[-5, ladoPata * 14], [avancePata - 7, ladoPata * 25]], '#9d4b34', 10);
    elipse(avancePata - 7, ladoPata * 24, 7, 5.5, '#ffe0a7', ladoPata * .24);
  }
  lienzo.restore();
}

function cabeza(posicion, angulo) {
  lienzo.save();
  lienzo.translate(...posicion);
  lienzo.rotate(angulo);
  for (const ladoOreja of [-1, 1]) {
    const y = ladoOreja * 17;
    linea([[-6, y], [-15, y + ladoOreja * 6], [-18, y - ladoOreja * 2]], '#da854a', 8);
    elipse(-13, y, 4, 2.8, '#e9878b', ladoOreja * .65);
  }
  elipse(2, 0, 22, 19, '#f3a85e');
  for (const ladoCara of [-1, 1]) {
    elipse(15, ladoCara * 5, 9, 7, '#ffda9c');
    elipse(7, ladoCara * 9, 3.4, 2.6, '#352028');
    elipse(8, ladoCara * 9 - .8, .95, .95, '#fff5db');
    linea([[-3, ladoCara * 13], [-6, ladoCara * 16]], '#c67140', 2.8);
    linea([[15, ladoCara * 11], [19, ladoCara * 17]], '#854633', 1.5);
  }
  elipse(19, 0, 3, 3.7, '#7b3e44');
  lienzo.restore();
}

function dibujar(ahora, fraccion = 1) {
  lienzo.drawImage(fondoTablero, 0, 0);
  dibujarGalleta(ahora);
  dibujarBomba(ahora);
  const tramos = cuerpo.map((celda, i) => {
    const [x, y] = coordenadas(celda);
    const [ax, ay] = coordenadas(anterior[i] ?? celda);
    return [ax + (x - ax) * fraccion, ay + (y - ay) * fraccion];
  });
  const [dx, dy] = direcciones[direccion];
  const angulo = Math.atan2(dy, dx);
  const cola = tramos.at(-1);
  const antesCola = tramos.at(-2);
  const anguloCola = Math.atan2(antesCola[1] - cola[1], antesCola[0] - cola[0]);
  const fase = jugando && !movimientoReducido.matches ? ahora / 46 : 0;
  lienzo.save();
  lienzo.translate(...cola);
  lienzo.rotate(anguloCola);
  linea([[0, 0], [-17, -3], [-28, -8 + 4 * Math.sin(fase / 2)]], '#9d4b34', 10);
  linea([[0, 0], [-17, -3], [-28, -8 + 4 * Math.sin(fase / 2)]], '#efab6b', 6);
  lienzo.restore();
  patas(cola, anguloCola, fase + Math.PI);
  patas(tramos[0], angulo, fase);
  linea(tramos, '#9d4b34', 33);
  linea(tramos, '#f2a65f', 28);
  lienzo.save();
  lienzo.translate(0, -2);
  linea(tramos, '#fbc282', 9);
  lienzo.restore();
  cabeza(tramos[0], angulo);
}

function terminar(gano, motivo = '') {
  jugando = false;
  const tarjeta = ficha.querySelector('.ficha');
  tarjeta.classList.add('panel-resultado');
  tarjeta.dataset.resultado = gano ? 'victoria' : 'derrota';
  const simbolo = document.getElementById('simbolo-resultado');
  simbolo.hidden = false;
  simbolo.textContent = gano ? '🏆' : '💔';
  mensaje.textContent = gano ? '¡Campeón de las galletitas!' : '¡Fin de la partida!';
  detalle.textContent = gano ? 'Juntaste las 80 galletitas.' : motivo + ' Juntaste ' + puntos + (puntos === 1 ? ' galletita.' : ' galletitas.');
  jugar.textContent = 'Volver a jugar';
  ficha.hidden = false;
  jugar.focus();
}

function mover(ahora) {
  if (bomba && ahora - bomba.nace >= 3850) {
    bomba = undefined;
    proximaBomba = ahora + 2200;
  }
  if (!bomba && puntos >= 12 && ahora >= proximaBomba) {
    const posicion = celdaLibre(comida);
    if (posicion !== undefined) bomba = { posicion, nace: ahora };
  }

  direccion = siguiente;
  const [dx, dy] = direcciones[direccion];
  const x = cuerpo[0] % lado + dx;
  const y = Math.floor(cuerpo[0] / lado) + dy;
  const destino = y * lado + x;
  const come = destino === comida;
  const ocupadas = come ? cuerpo : cuerpo.slice(0, -1);
  const tocaBomba = bomba && ahora - bomba.nace < 3000 && destino === bomba.posicion;
  if (x < 0 || x >= lado || y < 0 || y >= lado || ocupadas.includes(destino) || tocaBomba) {
    terminar(false, tocaBomba ? '¡Tocaste una bomba!' : 'El gato se chocó.');
    return;
  }

  anterior = cuerpo;
  cuerpo = [destino, ...ocupadas];
  if (come) {
    puntos += 1;
    contador.value = avance.value = puntos;
    comida = puntos === meta ? undefined : celdaLibre(bomba?.posicion);
    if (puntos === meta) terminar(true);
  }
}

function cuadro(ahora) {
  if (!jugando) {
    dibujar(ahora);
    return;
  }
  if (document.hidden || document.getElementById('panel-ajustes').open) {
    pausaDesde ??= ahora;
    vista = requestAnimationFrame(cuadro);
    return;
  }
  if (pausaDesde !== undefined) {
    const demora = ahora - pausaDesde;
    ultimoPaso += demora;
    proximaBomba += demora;
    if (bomba) bomba.nace += demora;
    pausaDesde = undefined;
  }
  if (ahora - ultimoPaso >= paso) {
    mover(ahora);
    ultimoPaso = ahora;
  }
  const fraccion = jugando && !movimientoReducido.matches ? Math.min(1, (ahora - ultimoPaso) / paso) : 1;
  dibujar(ahora, fraccion);
  if (jugando) vista = requestAnimationFrame(cuadro);
}

function orientar(nueva) {
  if (!jugando || siguiente !== direccion) return;
  const [dx, dy] = direcciones[direccion];
  const [nx, ny] = direcciones[nueva];
  if (dx + nx !== 0 || dy + ny !== 0) siguiente = nueva;
}

jugar.addEventListener('click', () => {
  audioDelPuesto.iniciar();
  cuerpo = anterior = [53, 52, 51];
  direccion = siguiente = 'right';
  puntos = 0;
  bomba = undefined;
  proximaBomba = 0;
  comida = celdaLibre();
  contador.value = avance.value = 0;
  ficha.hidden = true;
  jugando = true;
  pausaDesde = undefined;
  ultimoPaso = performance.now();
  cancelAnimationFrame(vista);
  vista = requestAnimationFrame(cuadro);
});
document.querySelector('.mandos').addEventListener('click', evento => {
  const boton = evento.target.closest('[data-dir]');
  if (boton) orientar(boton.dataset.dir);
});
document.addEventListener('keydown', evento => {
  const nueva = teclas[evento.key] || teclas[evento.key.toLowerCase()];
  if (!nueva || !jugando || document.getElementById('panel-ajustes').open) return;
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
document.addEventListener('visibilitychange', () => {
  if (jugando && document.hidden) pausaDesde ??= performance.now();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(tipo => tablero.addEventListener(tipo, () => { toque = undefined; }));
dibujarFondo();
dibujar(performance.now());
