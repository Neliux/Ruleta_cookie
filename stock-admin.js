const url = 'https://eyvzpzwagdccphsktogu.supabase.co/rest/v1/rpc/mystery_sweet_admin';
const clavePublica = 'sb_publishable_TuwjOiBnavNXWkxzGye_Jw_20vuNP8E';
const elemento = id => document.getElementById(id);
const acceso = elemento('acceso');
const panel = elemento('panel');
const acciones = elemento('acciones');
const estado = elemento('estado');
const campoClave = elemento('clave');
let clave = '';
let ocupado = false;
let activo = false;

async function solicitar(accion, datos = {}) {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { apikey: clavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_clave: clave, p_accion: accion, ...datos })
  });
  const resultado = await respuesta.json();
  if (resultado.code === '42501') throw new Error('La clave de administración es incorrecta.');
  if (!respuesta.ok) throw new Error('Supabase no pudo completar el cambio.');
  return resultado;
}

function mostrar(resultado) {
  activo = resultado.activo;
  elemento('modo').textContent = activo ? 'Activos · se puede ganar' : 'Pausados · imposible ganar';
  elemento('cambiar').textContent = activo ? 'Pausar premios' : 'Activar premios';
  elemento('stock').replaceChildren(...resultado.stock.map(premio => {
    const fila = document.createElement('form');
    fila.className = 'fila';
    fila.innerHTML = '<label></label><div class="controles"><button type="button">−</button><input type="number" min="0" max="9999" step="1" required><button type="button">+</button><button type="submit">Guardar</button></div>';
    const etiqueta = fila.querySelector('label');
    const cantidad = fila.querySelector('input');
    const [menos, mas] = fila.querySelectorAll('button');
    cantidad.id = 'stock-' + premio.casilla;
    cantidad.value = premio.restantes;
    etiqueta.htmlFor = cantidad.id;
    etiqueta.textContent = premio.premio;
    menos.setAttribute('aria-label', 'Quitar uno · ' + premio.premio);
    mas.setAttribute('aria-label', 'Añadir uno · ' + premio.premio);
    menos.disabled = premio.restantes === 0;
    mas.disabled = premio.restantes >= 9999;
    function cambiar(valor) {
      aplicar('stock', { p_casilla: premio.casilla, p_valor: valor, p_anterior: premio.restantes }, 'Stock guardado.');
    }
    menos.addEventListener('click', () => cambiar(premio.restantes - 1));
    mas.addEventListener('click', () => cambiar(premio.restantes + 1));
    fila.addEventListener('submit', evento => {
      evento.preventDefault();
      cambiar(cantidad.valueAsNumber);
    });
    return fila;
  }));
}

function botonPedido(texto, accion, id, nombre) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = texto;
  boton.dataset.accion = accion;
  boton.setAttribute('aria-label', texto + ' · ' + nombre);
  boton.addEventListener('click', () => modificarPedido(id, accion, nombre));
  return boton;
}

async function cargarPedidos() {
  const pedidos = await consultarFeria('msc_pedidos', { p_clave: clave });
  const lista = elemento('pedidos');
  lista.replaceChildren(...pedidos.map(pedido => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'pedido';
    tarjeta.id = 'pedido-' + pedido.id;
    const nombre = pedido.nombre + ' ' + pedido.apellido;
    const titulo = document.createElement('h3');
    titulo.textContent = nombre;
    const etiqueta = document.createElement('span');
    etiqueta.className = pedido.hecho ? 'estado-pedido hecho' : 'estado-pedido';
    etiqueta.textContent = pedido.hecho ? 'Hecho' : 'Pendiente';
    const datos = document.createElement('p');
    datos.textContent = [pedido.edad + ' años', pedido.curso, pedido.telefono].filter(Boolean).join(' · ');
    const items = document.createElement('p');
    items.textContent = pedido.cantidades.flatMap((n, i) => n ? [n + ' × ' + productosFeria[i]] : []).join(' · ');
    const controles = document.createElement('div');
    controles.className = 'acciones-pedido';
    controles.append(
      pedido.hecho ? botonPedido('Volver a pendiente', 'pendiente', pedido.id, nombre)
        : botonPedido('Marcar como hecho', 'hecho', pedido.id, nombre),
      botonPedido('Eliminar', 'eliminar', pedido.id, nombre)
    );
    tarjeta.append(titulo, etiqueta, datos, items, controles);
    return tarjeta;
  }));
  if (!pedidos.length) lista.textContent = 'Todavía no hay pedidos.';
}

async function modificarPedido(id, accion, nombre) {
  if (ocupado || !clave) return;
  if (accion === 'eliminar' && !window.confirm('¿Eliminar el pedido de ' + nombre + '?')) return;
  ocupado = true;
  const botones = [...document.querySelectorAll('button:not(:disabled)')];
  botones.forEach(boton => { boton.disabled = true; });
  estado.textContent = 'Guardando pedido…';
  let guardado = false;
  let actualizado = false;
  try {
    await consultarFeria('msc_gestionar_pedido', { p_clave: clave, p_id: id, p_accion: accion });
    guardado = true;
    await cargarPedidos();
    actualizado = true;
    estado.textContent = {
      hecho: 'Pedido marcado como hecho.',
      pendiente: 'Pedido marcado como pendiente.',
      eliminar: 'Pedido eliminado de la lista.'
    }[accion];
  } catch {
    estado.textContent = guardado
      ? 'Cambio guardado. Tocá Actualizar para volver a cargar los pedidos.'
      : 'No se pudo confirmar el cambio. Tocá Actualizar y revisá el pedido.';
  } finally {
    botones.forEach(boton => { boton.disabled = false; });
    ocupado = false;
    if (actualizado) (elemento('pedido-' + id)?.querySelector('button') ?? elemento('actualizar')).focus();
  }
}

async function aplicar(accion, datos, confirmacion) {
  if (ocupado) return;
  ocupado = true;
  const botones = [...document.querySelectorAll('button:not(:disabled)')];
  botones.forEach(boton => { boton.disabled = true; });
  estado.textContent = 'Consultando…';
  try {
    const resultado = await solicitar(accion, datos);
    mostrar(resultado);
    if (accion === 'leer') {
      try {
        await cargarPedidos();
      } catch {
        elemento('pedidos').textContent = 'No se pudieron cargar los pedidos. Tocá Actualizar.';
      }
    }
    acceso.hidden = true;
    campoClave.value = '';
    panel.hidden = acciones.hidden = false;
    estado.textContent = resultado.conflicto ? 'El stock acaba de cambiar. Se actualizó la cantidad. Revisala e intentá de nuevo.' : confirmacion;
  } catch (error) {
    estado.textContent = error instanceof TypeError ? 'Error de conexión. Actualizá para comprobar el estado antes de reintentar.' : error.message;
  } finally {
    botones.forEach(boton => { boton.disabled = false; });
    ocupado = false;
  }
}

acceso.addEventListener('submit', evento => {
  evento.preventDefault();
  if (ocupado) return;
  clave = campoClave.value.trim();
  aplicar('leer', {}, '');
});
elemento('cambiar').addEventListener('click', () => aplicar('modo', { p_activo: !activo }, 'Modo guardado.'));
elemento('actualizar').addEventListener('click', () => aplicar('leer', {}, 'Stock actualizado.'));
elemento('salir').addEventListener('click', () => {
  elemento('pedidos').replaceChildren();
  clave = '';
  panel.hidden = acciones.hidden = true;
  elemento('stock').replaceChildren();
  elemento('modo').textContent = '';
  estado.textContent = '';
  acceso.hidden = false;
  campoClave.focus();
});
