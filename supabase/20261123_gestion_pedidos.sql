begin;

alter table mystery_sweet.pedidos
  add column hecho boolean not null default false,
  add column eliminado_en timestamptz;

create or replace function mystery_sweet.ver_pedidos(p_clave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform mystery_sweet.administrar(p_clave, 'leer', null, null, null, null);
  return (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.hecho, p.creado desc), '[]'::jsonb)
    from mystery_sweet.pedidos p
    where p.eliminado_en is null
  );
end;
$$;

create function mystery_sweet.gestionar_pedido(p_clave text, p_id uuid, p_accion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform mystery_sweet.administrar(p_clave, 'leer', null, null, null, null);
  if p_id is null or p_accion is null or p_accion not in ('hecho', 'pendiente', 'eliminar') then
    raise exception 'Acción de pedido inválida' using errcode = '22023';
  end if;

  -- A removed order keeps its ID so a delayed retry cannot restore it.
  if p_accion = 'eliminar' then
    update mystery_sweet.pedidos
    set eliminado_en = pg_catalog.now()
    where id = p_id and eliminado_en is null;
  else
    update mystery_sweet.pedidos
    set hecho = (p_accion = 'hecho')
    where id = p_id and eliminado_en is null;
  end if;
end;
$$;

create function public.msc_gestionar_pedido(p_clave text, p_id uuid, p_accion text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select mystery_sweet.gestionar_pedido(p_clave, p_id, p_accion);
$$;

revoke all on function mystery_sweet.gestionar_pedido(text,uuid,text), public.msc_gestionar_pedido(text,uuid,text) from public, anon, authenticated;
grant execute on function mystery_sweet.gestionar_pedido(text,uuid,text), public.msc_gestionar_pedido(text,uuid,text) to anon, authenticated;

commit;
