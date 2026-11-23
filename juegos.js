const $ = id => document.getElementById(id);
const mesa = $('mesa');
const estadoJuego = $('estado');
const dulces = ['🍪','🍰','🧁','🍩','🍫','🥧','🍮','🍦'];
const nombres = ['Galletita','Tarta','Magdalena','Dona','Chocolate','Pastel','Flan','Helado'];
const rondasPares = [
  { pares: 4, ancho: 100, fallos: 6 },
  { pares: 6, ancho: 93, fallos: 9 },
  { pares: 8, ancho: 86, fallos: 12 }
];
const maxNotas = 18;
let nivel, fallos, contexto;
let modo, sesion=0, bloqueado, primera, pares, intentos, receta, posicion;
function esperar(ms) { return new Promise(resolve=>setTimeout(resolve,ms)); }
function reaccion(boton, tipo) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colores = { toque:'#ffcf87', acierto:'#a4e3a8', error:'#ff967c' };
  boton.animate([
    { scale: '1', filter: 'brightness(1)' },
    { scale: tipo === 'error' ? '.94' : '1.06', filter: 'brightness(1.24)', boxShadow: '0 0 22px '+colores[tipo] },
    { scale: '1', filter: 'brightness(1)' }
  ], { duration: tipo === 'toque' ? 240 : 430 });
}

function prepararAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  contexto ??= new Audio();
  contexto.resume().catch(() => {});
}
function tocarNota(indice) {
  const pista = $('musica');
  if (contexto?.state !== 'running' || pista.muted || !pista.volume) return;
  const nota = contexto.createOscillator();
  const volumen = contexto.createGain();
  const ahora = contexto.currentTime;
  nota.type = 'sine';
  nota.frequency.value = [392, 494, 587, 698][indice];
  volumen.gain.setValueAtTime(.001, ahora);
  volumen.gain.exponentialRampToValueAtTime(.15 * pista.volume + .001, ahora + .035);
  volumen.gain.exponentialRampToValueAtTime(.001, ahora + .25);
  nota.connect(volumen).connect(contexto.destination);
  nota.start(ahora);
  nota.stop(ahora + .27);
}
function marcadorPares() {
  const ronda = rondasPares[nivel];
  estadoJuego.textContent = 'Ronda ' + (nivel + 1) + ' de 3 · ' + pares + '/' + ronda.pares +
    ' pares · ' + (ronda.fallos - fallos) + ' intentos fallidos disponibles.';
}
function resultado(tipo, titulo, detalle) {
  bloqueado = true;
  mesa.hidden = true;
  estadoJuego.hidden = $('reiniciar').hidden = true;
  const pantalla = $('resultado-juego');
  pantalla.dataset.resultado = tipo;
  $('simbolo-resultado').textContent = { victoria: '🏆', derrota: '💔', ronda: '✨' }[tipo];
  $('titulo-resultado').textContent = titulo;
  $('detalle-resultado').textContent = detalle;
  $('accion-resultado').textContent = tipo === 'ronda' ? 'Siguiente ronda' : 'Volver a jugar';
  pantalla.hidden = false;
  $('accion-resultado').focus();
}

function mostrarCarta(b,i) {
  b.setAttribute('aria-label',nombres[i]); b.classList.add('abierta');
}
function tapar(b,i) {
  b.setAttribute('aria-label','Dar vuelta la carta '+(i+1)); b.classList.remove('abierta');
}
async function elegir(b,i,valor) {
  if(bloqueado || b.classList.contains('abierta')) return;
  mostrarCarta(b,valor);
  reaccion(b,'toque');
  if(!primera){primera={b,i,valor};return;}
  intentos++;
  const previa=primera;
  primera=null;
  if(previa.valor===valor){
    pares++;
    for (const pareja of [b, previa.b]) {
      pareja.classList.add('pareja');
      pareja.setAttribute('aria-disabled','true');
      reaccion(pareja,'acierto');
    }
    marcadorPares();
    if (pares === rondasPares[nivel].pares) {
      bloqueado = true;
      const actual = sesion;
      await esperar(460);
      if (actual !== sesion) return;
      if (nivel === rondasPares.length - 1) {
        resultado('victoria', '¡Tres bandejas completas!', 'Encontraste los 18 pares en ' + intentos + ' jugadas.');
      } else {
        resultado('ronda', '¡Bandeja completa!', 'Encontraste ' + pares + ' pares. La próxima ronda trae más fichas.');
      }
    }
  } else {
    bloqueado=true;
    fallos++;
    marcadorPares();
    const actual=sesion;
    await esperar(340);
    if(actual!==sesion)return;
    reaccion(b,'error');
    reaccion(previa.b,'error');
    await esperar(520);
    if(actual!==sesion)return;
    tapar(b,i); tapar(previa.b,previa.i);
    if (fallos === rondasPares[nivel].fallos) {
      resultado('derrota', '¡Se acabaron los intentos!', 'Encontraste ' + pares + ' pares en la ronda ' + (nivel + 1) + '.');
      return;
    }
    bloqueado=false;
  }
}
async function ronda() {
  const actual=sesion;
  receta.push(Math.floor(Math.random()*4)); posicion=0; bloqueado=true;
  estadoJuego.textContent='Mirá y escuchá · '+receta.length+' de '+maxNotas+' notas';
  await esperar(700);
  for(const i of receta){
    if(actual!==sesion)return;
    const b=mesa.children[i]; b.classList.add('luz'); tocarNota(i); estadoJuego.textContent=nombres[i];
    await esperar(receta.length > 8 ? 420 : 600); if(actual!==sesion)return;
    b.classList.remove('luz'); estadoJuego.textContent='…'; await esperar(180);
  }
  if(actual!==sesion)return;
  bloqueado=false; estadoJuego.textContent='Tu turno · Repetí la secuencia.';
}
async function ingrediente(i) {
  if(bloqueado)return;
  tocarNota(i);
  if (receta[posicion] !== i) {
    bloqueado = true;
    reaccion(mesa.children[i], 'error');
    const actual = sesion;
    await esperar(400);
    if (actual !== sesion) return;
    resultado('derrota', '¡Se cortó la receta!', 'La próxima nota era ' + nombres[receta[posicion]] + '. Llegaste a una secuencia de ' + receta.length + ' notas.');
    return;
  }
  reaccion(mesa.children[i],'acierto');
  posicion++;estadoJuego.textContent='¡Bien! '+posicion+' de '+receta.length;
  if(posicion===receta.length){
    bloqueado=true;
    if (receta.length === maxNotas) resultado('victoria', '¡Oído de chef!', 'Repetiste las 18 notas en el orden correcto.');
    else ronda();
  }
}
function iniciarJuego(tipo) {
  nivel = intentos = 0;
  receta = [];
  if (tipo === 'receta') prepararAudio();
  abrirRonda(tipo);
}
function abrirRonda(tipo) {
  sesion++;
  modo=tipo;
  primera=null;
  pares=fallos=0;
  bloqueado=false;
  mesa.hidden = estadoJuego.hidden = $('reiniciar').hidden = false;
  $('resultado-juego').hidden = true;
  $('seleccion').hidden=true;$('partida').hidden=false;mesa.replaceChildren();mesa.className=tipo;
  $('titulo').textContent=tipo==='memoria'?'Memoria del chef':'La receta del michi';
  let cartas=[0,1,2,3];
  if(tipo==='memoria'){
    const ronda = rondasPares[nivel];
    cartas = Array.from({ length: ronda.pares * 2 }, (_, i) => i % ronda.pares);
    mesa.style.setProperty('--ancho-mesa', ronda.ancho + '%');
    for(let i=cartas.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cartas[i],cartas[j]]=[cartas[j],cartas[i]];}
    marcadorPares();
  }
  cartas.forEach((valor,i)=>{
    const b=document.createElement('button');
    if(tipo==='memoria'){
      b.className='carta-juego';
      const interior=document.createElement('span');
      interior.className='giro-carta';
      interior.setAttribute('aria-hidden','true');
      for (const [cara, texto] of [['dorso','✦'], ['frente',dulces[valor]]]) {
        const elemento=document.createElement('span');
        elemento.className=cara;
        elemento.textContent=texto;
        interior.append(elemento);
      }
      b.append(interior);
      tapar(b,i);
      b.onclick=()=>elegir(b,i,valor);
    }
    else {b.textContent=dulces[i];b.setAttribute('aria-label',nombres[i]);b.onclick=()=>ingrediente(i);}
    mesa.append(b);
  });
  if(tipo==='receta')ronda();
}
document.querySelectorAll('[data-juego]').forEach(b=>b.onclick=()=>iniciarJuego(b.dataset.juego));
$('volver').onclick=()=>{sesion++;$('seleccion').hidden=false;$('partida').hidden=true;};
$('reiniciar').onclick=()=>iniciarJuego(modo);
$('accion-resultado').onclick = () => {
  if ($('resultado-juego').dataset.resultado === 'ronda') {
    nivel++;
    abrirRonda(modo);
    mesa.firstElementChild.focus();
  } else {
    iniciarJuego(modo);
    mesa.firstElementChild.focus();
  }
};
