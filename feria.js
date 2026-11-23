const baseFeria = 'https://eyvzpzwagdccphsktogu.supabase.co/rest/v1/rpc/';
async function consultarFeria(funcion, datos) {
  const respuesta = await fetch(baseFeria + funcion,{method:'POST',headers:{apikey:'sb_publishable_TuwjOiBnavNXWkxzGye_Jw_20vuNP8E','Content-Type':'application/json'},body:JSON.stringify(datos)});
  if (!respuesta.ok) throw new Error('Servicio no disponible');
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}
const productosFeria = ['Negra maluca','Tarta de gelatina de frutilla','Paquete de 2 galletitas medianas','Paquete de 2 galletitas grandes'];
const preciosFeria = [5000,5000,4000,5000];
const insignia = document.querySelector('.boton-logo');
if (insignia) {
  const equipo = document.createElement('dialog');
  equipo.className = 'equipo';
  equipo.setAttribute('aria-label','Nuestro equipo');
  equipo.innerHTML = '<img src="logo-msc-v2.webp" alt="Mystery Sweet Casino"><h2>Nuestro equipo</h2><p>Federico Alonso<br>Belinda Baez<br>Janet Ziller</p><form method="dialog"><button class="accion-feria">Cerrar</button></form>';
  document.body.append(equipo);
  insignia.onclick = () => equipo.showModal();
}
if (document.querySelector('#rueda')) {
  const ruedaStock = document.querySelector('#rueda');
  const colores = ['#a03660','#474059','#1f665f','#3c415b','#84521c','#474059','#3c415b','#514154'];
  async function pintarStock() {
    if (document.hidden) return;
    try {
      const agotados = await consultarFeria('msc_agotados',{});
      ruedaStock.style.backgroundImage = 'conic-gradient(from -22.5deg,' + colores.map((c,i)=>(agotados.includes(i) ? '#69646b' : c)+' '+i*45+'deg '+(i+1)*45+'deg').join(',')+')';
    } catch {}
  }
  pintarStock();
  setInterval(pintarStock,20000);
  document.addEventListener('visibilitychange',pintarStock);
  document.querySelector('#ventana').addEventListener('close',pintarStock);
}
const formulario = document.querySelector('#form-pedido');
if (formulario) {
  const dialogo = formulario.closest('dialog');
  document.querySelector('#hacer-pedido').onclick = () => dialogo.showModal();
  document.querySelector('#cerrar-pedido').onclick = () => dialogo.close();
  const campos = productosFeria.map((nombre,i)=>{
    const etiqueta = document.createElement('label');
    etiqueta.textContent = nombre;
    const cantidad = document.createElement('input');
    cantidad.type='number'; cantidad.min=0; cantidad.max=50; cantidad.value=0; cantidad.required=true;
    etiqueta.append(cantidad); formulario.querySelector('.cantidades').append(etiqueta);
    return cantidad;
  });
  const total = () => campos.reduce((s,c,i)=>s+Number(c.value)*preciosFeria[i],0);
  formulario.oninput = () => { formulario.querySelector('output').value = 'G. '+total().toLocaleString('es-PY'); };
  let ultimoTexto, id;
  formulario.onsubmit = async evento => {
    evento.preventDefault();
    const aviso = formulario.querySelector('[role=status]');
    if (!total()) { aviso.textContent='Elegí al menos un producto.'; return; }
    const datos = Object.fromEntries(new FormData(formulario));
    datos.p_edad = Number(datos.p_edad);
    datos.p_cantidades = campos.map(c=>Number(c.value));
    const texto=JSON.stringify(datos);
    if(texto!==ultimoTexto){id=crypto.randomUUID();ultimoTexto=texto;}
    const enviar=formulario.querySelector('[type=submit]');
    enviar.disabled=true;
    try {
      await consultarFeria('msc_encargar',{...datos,p_id:id});
      formulario.reset(); campos.forEach(c=>c.value=0); formulario.oninput();
      aviso.textContent='¡Pedido recibido! Recordá acercarte a nuestro puesto para retirar tu pedido.'; ultimoTexto=null;
    } catch {aviso.textContent='No pudimos confirmar el pedido. Volvé a intentar.';}
    finally {enviar.disabled=false;}
  };
}
