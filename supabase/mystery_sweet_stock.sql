begin;

create schema mystery_sweet;
revoke all on schema mystery_sweet from public;

create table public.mystery_sweet_stock (
  casilla integer primary key check (casilla in (0, 2, 4)),
  premio text not null,
  restantes integer not null check (restantes >= 0)
);
alter table public.mystery_sweet_stock enable row level security;
revoke all on public.mystery_sweet_stock from public, anon, authenticated;

insert into public.mystery_sweet_stock (casilla, premio, restantes) values
  (0, 'Paquete de Mini Oreo', 3),
  (2, 'Paquete de Oreo clásicas', 2),
  (4, 'Mini trozo de tarta', 0);

create table mystery_sweet.giros (
  id uuid primary key,
  casilla integer not null check (casilla between 0 and 7)
);
alter table mystery_sweet.giros enable row level security;
revoke all on mystery_sweet.giros from public, anon, authenticated;

-- The row update and the recorded result commit together; retries return the recorded result.
create function mystery_sweet.resolver_giro(p_id uuid)
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

  turno := pg_catalog.floor(pg_catalog.random() * 500)::integer;
  for indice in 0..7 loop
    peso := case when indice in (0, 2, 4) then 15 else 91 end;
    if turno < peso then
      elegida := indice;
      exit;
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

revoke all on function mystery_sweet.resolver_giro(uuid) from public, anon, authenticated;
grant usage on schema mystery_sweet to anon, authenticated;
grant execute on function mystery_sweet.resolver_giro(uuid) to anon, authenticated;

create function public.mystery_sweet_girar(p_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select mystery_sweet.resolver_giro(p_id);
$$;

revoke all on function public.mystery_sweet_girar(uuid) from public, anon, authenticated;
grant execute on function public.mystery_sweet_girar(uuid) to anon, authenticated;

commit;
