begin;

create or replace function mystery_sweet.resolver_giro(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  disponibles integer[] := array[]::integer[];
  elegida integer;
  turno integer;
  indice integer;
  peso integer;
  peso_sin_premio integer;
begin
  if p_id is null then
    raise exception 'Se requiere un identificador de giro' using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1933701274, 52491);
  select giros.casilla into elegida from mystery_sweet.giros where id = p_id;
  if found then
    return elegida;
  end if;

  if exists (select 1 from mystery_sweet.admin_config where activo and unica) then
    disponibles := array(
      select casilla from public.mystery_sweet_stock
      where restantes > 0
      order by casilla
      for update
    );
  end if;

  -- Preserve 15 of 500 tickets per available prize. Each absent prize
  -- contributes three tickets to each of the five no-prize slots.
  peso_sin_premio := 100 - 3 * pg_catalog.cardinality(disponibles);
  turno := pg_catalog.floor(pg_catalog.random() * 500)::integer;
  for indice in 0..7 loop
    peso := case
      when indice = any(disponibles) then 15
      when indice in (0, 2, 4) then 0
      else peso_sin_premio
    end;
    if turno < peso then
      elegida := indice;
      exit;
    end if;
    turno := turno - peso;
  end loop;

  if elegida = any(disponibles) then
    update public.mystery_sweet_stock
       set restantes = restantes - 1
     where casilla = elegida;
  end if;

  insert into mystery_sweet.giros (id, casilla) values (p_id, elegida);
  return elegida;
end;
$$;

create or replace function mystery_sweet.detallar_giro(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Older exhausted outcomes already have a no-prize slot recorded.
  return jsonb_build_object('casilla', mystery_sweet.resolver_giro(p_id), 'agotado', false);
end;
$$;

commit;
