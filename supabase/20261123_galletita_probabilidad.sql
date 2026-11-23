update public.mystery_sweet_stock
set premio = '1 galletita'
where casilla = 0;

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
  premios_sin_galletita integer;
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

  -- 500 tickets: 100 for the cookie, 50 for each other prize.
  -- The remaining tickets are split equally between the five no-prize slots.
  premios_sin_galletita := pg_catalog.cardinality(disponibles)
    - case when 0 = any(disponibles) then 1 else 0 end;
  peso_sin_premio := (
    500
    - case when 0 = any(disponibles) then 100 else 0 end
    - 50 * premios_sin_galletita
  ) / 5;

  turno := pg_catalog.floor(pg_catalog.random() * 500)::integer;
  for indice in 0..7 loop
    peso := case
      when indice = 0 and indice = any(disponibles) then 100
      when indice = any(disponibles) then 50
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
