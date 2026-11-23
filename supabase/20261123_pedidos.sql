begin;
create table mystery_sweet.pedidos (
 id uuid primary key, creado timestamptz not null default now(), nombre text not null check(length(trim(nombre)) between 1 and 60),
 apellido text not null check(length(trim(apellido)) between 1 and 60), edad integer not null check(edad between 1 and 120),
 curso text not null check(length(trim(curso)) between 1 and 60), telefono text check(length(telefono)<=30),
 cantidades integer[] not null check(array_ndims(cantidades)=1 and array_lower(cantidades,1)=1 and cardinality(cantidades)=4 and array_position(cantidades,null) is null and 0<=all(cantidades) and 50>=all(cantidades) and 0<any(cantidades))
);
alter table mystery_sweet.pedidos enable row level security;
revoke all on mystery_sweet.pedidos from public,anon,authenticated;
create function mystery_sweet.encargar(p_id uuid,p_nombre text,p_apellido text,p_edad integer,p_curso text,p_telefono text,p_cantidades integer[]) returns void language sql security definer set search_path='' as $$
 insert into mystery_sweet.pedidos(id,nombre,apellido,edad,curso,telefono,cantidades) values(p_id,trim(p_nombre),trim(p_apellido),p_edad,trim(p_curso),nullif(trim(p_telefono),''),p_cantidades) on conflict(id) do nothing;
$$;
create function public.msc_encargar(p_id uuid,p_nombre text,p_apellido text,p_edad integer,p_curso text,p_telefono text,p_cantidades integer[]) returns void language sql security invoker set search_path='' as $$
 select mystery_sweet.encargar(p_id,p_nombre,p_apellido,p_edad,p_curso,p_telefono,p_cantidades);
$$;
create function mystery_sweet.ver_pedidos(p_clave text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform mystery_sweet.administrar(p_clave,'leer',null,null,null,null);
 return (select coalesce(jsonb_agg(to_jsonb(p) order by creado desc),'[]'::jsonb) from mystery_sweet.pedidos p);
end;
$$;
create function public.msc_pedidos(p_clave text) returns jsonb language sql security invoker set search_path='' as $$ select mystery_sweet.ver_pedidos(p_clave); $$;
create function mystery_sweet.agotados() returns jsonb language sql stable security definer set search_path='' as $$ select coalesce(jsonb_agg(casilla),'[]'::jsonb) from public.mystery_sweet_stock where restantes=0; $$;
create function public.msc_agotados() returns jsonb language sql stable security invoker set search_path='' as $$ select mystery_sweet.agotados(); $$;
revoke all on function mystery_sweet.encargar(uuid,text,text,integer,text,text,integer[]), public.msc_encargar(uuid,text,text,integer,text,text,integer[]), mystery_sweet.ver_pedidos(text),public.msc_pedidos(text), mystery_sweet.agotados(),public.msc_agotados() from public;
grant execute on function mystery_sweet.encargar(uuid,text,text,integer,text,text,integer[]), public.msc_encargar(uuid,text,text,integer,text,text,integer[]), mystery_sweet.ver_pedidos(text),public.msc_pedidos(text), mystery_sweet.agotados(),public.msc_agotados() to anon,authenticated;
commit;
