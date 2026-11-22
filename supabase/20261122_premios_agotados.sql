begin;

alter table mystery_sweet.giros
  add column casilla_agotada integer check (casilla_agotada in (0, 2, 4));

-- Retain the numeric result used by older clients, and persist the empty prize for newer clients.
create or replace function mystery_sweet.resolver_giro(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  elegida integer;
  turno integer;
  agotada integer;
  indice integer;
  peso integer;
  sin_premio constant integer[] := array[1, 3, 5, 6, 7];
begin
  if p_id is null then
    raise exception 'Se requiere un identificador de giro' using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1933701274, 52491);

  select giros.casilla into elegida from mystery_sweet.giros where id = p_id;
  if found then
    return elegida;
  end if;

  if not exists (select 1 from mystery_sweet.admin_config where activo and unica) then
    elegida := sin_premio[1 + pg_catalog.floor(pg_catalog.random() * 5)::integer];
    insert into mystery_sweet.giros (id, casilla) values (p_id, elegida);
    return elegida;
  end if;

  turno := pg_catalog.floor(pg_catalog.random() * 500)::integer;
  for indice in 0..7 loop
    peso := case when indice in (0, 2, 4) then 15 else 91 end;
    if turno < peso then
      elegida := indice;
      exit;
    end if;
    if not exists (select 1 from mystery_sweet.admin_config where activo and unica) then
    elegida := sin_premio[1 + pg_catalog.floor(pg_catalog.random() * 5)::integer];
    insert into mystery_sweet.giros (id, casilla) values (p_id, elegida);
    return elegida;
  end if;

  turno := turno - peso;
  end loop;

  if elegida in (0, 2, 4) then
    update public.mystery_sweet_stock
       set restantes = restantes - 1
     where casilla = elegida and restantes > 0;
    if not found then
      agotada := elegida;
      elegida := sin_premio[1 + pg_catalog.floor(pg_catalog.random() * 5)::integer];
    end if;
  end if;

  insert into mystery_sweet.giros (id, casilla, casilla_agotada) values (p_id, elegida, agotada);
  return elegida;
end;
$$;


create function mystery_sweet.detallar_giro(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  elegida integer;
  agotada integer;
begin
  elegida := mystery_sweet.resolver_giro(p_id);
  select casilla_agotada into agotada from mystery_sweet.giros where id = p_id;
  return jsonb_build_object('casilla', coalesce(agotada, elegida), 'agotado', agotada is not null);
end;
$$;

revoke all on function mystery_sweet.detallar_giro(uuid) from public, anon, authenticated;
grant execute on function mystery_sweet.detallar_giro(uuid) to anon, authenticated;

create function public.mystery_sweet_girar_detalle(p_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select mystery_sweet.detallar_giro(p_id);
$$;

revoke all on function public.mystery_sweet_girar_detalle(uuid) from public, anon, authenticated;
grant execute on function public.mystery_sweet_girar_detalle(uuid) to anon, authenticated;

commit;
