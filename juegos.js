const $ = id => document.getElementById(id);
const mesa = $('mesa');
const estadoJuego = $('estado');
const dulces = ['🍪','🍰','🧁','🍩','🍫','🥧'];
const nombres = ['Galletita','Tarta','Magdalena','Dona','Chocolate','Pastel'];
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
    estadoJuego.textContent=pares===6 ? '¡Completaste la bandeja en '+intentos+' intentos!' : pares+' de 6 pares encontrados.';
  } else {
    bloqueado=true;
    estadoJuego.textContent='No coinciden. Probá con otro par.';
    const actual=sesion;
    await esperar(340);
    if(actual!==sesion)return;
    reaccion(b,'error');
    reaccion(previa.b,'error');
    await esperar(520);
    if(actual!==sesion)return;
    tapar(b,i); tapar(previa.b,previa.i); bloqueado=false;
  }
}
async function ronda() {
  const actual=sesion;
  receta.push(Math.floor(Math.random()*4)); posicion=0; bloqueado=true;
  estadoJuego.textContent='Mirá la receta · Ronda '+receta.length+' de 8';
  await esperar(700);
  for(const i of receta){
    if(actual!==sesion)return;
    const b=mesa.children[i]; b.classList.add('luz'); estadoJuego.textContent=nombres[i];
    await esperar(600); if(actual!==sesion)return;
    b.classList.remove('luz'); estadoJuego.textContent='…'; await esperar(230);
  }
  if(actual!==sesion)return;
  bloqueado=false; estadoJuego.textContent='Tu turno · Repetí la secuencia.';
}
function ingrediente(i) {
  if(bloqueado)return;
  if(receta[posicion]!==i){reaccion(mesa.children[i],'error'); bloqueado=true;estadoJuego.textContent='¡Uy! El chef esperaba '+nombres[receta[posicion]]+'. Llegaste a la ronda '+receta.length+'.';return;}
  reaccion(mesa.children[i],'acierto');
  posicion++;estadoJuego.textContent='¡Bien! '+posicion+' de '+receta.length;
  if(posicion===receta.length){
    bloqueado=true;
    if(receta.length===8)estadoJuego.textContent='¡Ocho recetas completas! El chef te aplaude.';
    else ronda();
  }
}
function iniciarJuego(tipo) {
  sesion++;modo=tipo; primera=null;pares=intentos=0;receta=[];bloqueado=false;
  $('seleccion').hidden=true;$('partida').hidden=false;mesa.replaceChildren();mesa.className=tipo;
  $('titulo').textContent=tipo==='memoria'?'Memoria del chef':'La receta del michi';
  let cartas=[0,1,2,3];
  if(tipo==='memoria'){
    cartas=[0,1,2,3,4,5,0,1,2,3,4,5];
    for(let i=cartas.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cartas[i],cartas[j]]=[cartas[j],cartas[i]];}
    estadoJuego.textContent='Encontrá los seis pares de postres.';
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
