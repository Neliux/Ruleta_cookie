begin;

create table mystery_sweet.admin_config (
  unica boolean primary key default true check (unica),
  activo boolean not null default true,
  clave_hash bytea
);
alter table mystery_sweet.admin_config enable row level security;
revoke all on mystery_sweet.admin_config from public, anon, authenticated;
insert into mystery_sweet.admin_config default values;

create or replace function mystery_sweet.resolver_giro(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  elegida integer;
  turno integer;
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
      elegida := sin_premio[1 + pg_catalog.floor(pg_catalog.random() * 5)::integer];
    end if;
  end if;

  insert into mystery_sweet.giros (id, casilla) values (p_id, elegida);
  return elegida;
end;
$$;


create function mystery_sweet.administrar(
  p_clave text, p_accion text, p_casilla integer, p_valor integer, p_anterior integer, p_activo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflicto boolean := false;
begin
  if p_clave is null or pg_catalog.length(p_clave) <> 43 or not exists (
    select 1 from mystery_sweet.admin_config
    where unica and clave_hash = pg_catalog.sha256(pg_catalog.convert_to(p_clave, 'UTF8'))
  ) then
    raise exception 'Clave incorrecta' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1933701274, 52491);
  case p_accion
    when 'leer' then null;
    when 'modo' then
      if p_activo is null then
        raise exception 'Modo inválido' using errcode = '22023';
      end if;
      update mystery_sweet.admin_config set activo = p_activo where unica;
    when 'stock' then
      if p_casilla is null or p_casilla not in (0, 2, 4) or
         p_valor is null or p_valor not between 0 and 9999 or p_anterior is null then
        raise exception 'Cantidad inválida' using errcode = '22023';
      end if;
      update public.mystery_sweet_stock
         set restantes = p_valor
       where casilla = p_casilla and restantes = p_anterior;
      conflicto := not found;
    else
      raise exception 'Acción inválida' using errcode = '22023';
  end case;

  return jsonb_build_object(
    'activo', (select activo from mystery_sweet.admin_config where unica),
    'conflicto', conflicto,
    'stock', (select jsonb_agg(to_jsonb(s) order by casilla) from public.mystery_sweet_stock s)
  );
end;
$$;

revoke all on function mystery_sweet.administrar(text,text,integer,integer,integer,boolean) from public, anon, authenticated;
grant execute on function mystery_sweet.administrar(text,text,integer,integer,integer,boolean) to anon, authenticated;

create function public.mystery_sweet_admin(
  p_clave text, p_accion text, p_casilla integer default null, p_valor integer default null,
  p_anterior integer default null, p_activo boolean default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select mystery_sweet.administrar(p_clave,p_accion,p_casilla,p_valor,p_anterior,p_activo);
$$;

revoke all on function public.mystery_sweet_admin(text,text,integer,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.mystery_sweet_admin(text,text,integer,integer,integer,boolean) to anon, authenticated;

commit;
