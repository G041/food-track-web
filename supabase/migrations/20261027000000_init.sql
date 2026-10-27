-- FoodTrack: esquema inicial
-- Restaurantes con cola de moderación: todo aporte entra como 'pending'
-- y solo es público cuando un admin lo aprueba.

create extension if not exists postgis with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Perfiles (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text not null unique check (username ~ '^[A-Za-z0-9_.]{4,15}$'),
  role       text not null default 'user' check (role in ('user', 'admin')),
  points     int  not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Crea el perfil al registrarse (username viene en raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Para validar el username antes del signup
create or replace function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Categorías
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  slug text primary key,
  name text not null,
  sort smallint not null default 0
);

insert into public.categories (slug, name, sort) values
  ('restaurante',   'Restaurante',   1),
  ('bar',           'Bar',           2),
  ('merienda',      'Merienda',      3),
  ('bodegon',       'Bodegón',       4),
  ('comida-rapida', 'Comida rápida', 5);

-- ─────────────────────────────────────────────────────────────
-- Restaurantes
-- ─────────────────────────────────────────────────────────────
create table public.restaurants (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(trim(name)) between 2 and 80),
  category     text not null references public.categories (slug),
  address      text check (char_length(address) <= 160),
  menu_url     text not null check (menu_url ~* '^https?://' and char_length(menu_url) <= 500),
  latitude     double precision not null check (latitude between -90 and 90),
  longitude    double precision not null check (longitude between -180 and 180),
  location     extensions.geography(Point, 4326)
               generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,

  -- moderación
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references public.profiles (id) on delete set null,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  review_note  text check (char_length(review_note) <= 300),

  created_at   timestamptz not null default now()
);

create index restaurants_location_gix on public.restaurants using gist (location);
create index restaurants_status_idx   on public.restaurants (status);
create index restaurants_submitter_idx on public.restaurants (submitted_by);
-- Un mismo menú no puede estar dos veces (salvo que el anterior haya sido rechazado)
create unique index restaurants_menu_url_uniq
  on public.restaurants (lower(menu_url)) where status <> 'rejected';

-- Antes de insertar: forzar estado de moderación y autor; limitar spam.
create or replace function public.restaurants_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  recent int;
begin
  new.submitted_by := auth.uid();
  new.reviewed_by  := null;
  new.reviewed_at  := null;
  new.review_note  := null;

  if public.is_admin() then
    -- los aportes de admins se publican directo
    new.status      := 'approved';
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  else
    new.status := 'pending';

    select count(*) into recent
    from public.restaurants
    where submitted_by = auth.uid()
      and created_at > now() - interval '24 hours';

    if recent >= 10 then
      raise exception 'Llegaste al límite de 10 aportes por día' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger restaurants_before_insert
  before insert on public.restaurants
  for each row execute function public.restaurants_before_insert();

-- Antes de actualizar: un usuario común no puede tocar los campos de moderación,
-- y si edita su aporte vuelve a quedar pendiente.
create or replace function public.restaurants_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.status       := 'pending';
    new.submitted_by := old.submitted_by;
    new.reviewed_by  := null;
    new.reviewed_at  := null;
    new.review_note  := null;
  end if;
  return new;
end;
$$;

create trigger restaurants_before_update
  before update on public.restaurants
  for each row execute function public.restaurants_before_update();

-- Revisión por parte de un admin
create or replace function public.review_restaurant(
  p_id bigint,
  p_decision text,
  p_note text default null
)
returns public.restaurants
language plpgsql security definer set search_path = ''
as $$
declare
  result public.restaurants;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar aportes' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision;
  end if;

  update public.restaurants
     set status      = p_decision,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = nullif(trim(p_note), '')
   where id = p_id
  returning * into result;

  if result.id is null then
    raise exception 'Restaurante % no encontrado', p_id;
  end if;

  -- puntos para quien aportó un lugar aprobado
  if p_decision = 'approved' and result.submitted_by is not null then
    update public.profiles set points = points + 10 where id = result.submitted_by;
  end if;

  return result;
end;
$$;

-- Restaurantes aprobados cerca de un punto (para "cerca mío")
create or replace function public.restaurants_nearby(lat double precision, lng double precision, radius_m int default 2000)
returns setof public.restaurants
language sql stable set search_path = ''
as $$
  select *
  from public.restaurants r
  where r.status = 'approved'
    and extensions.st_dwithin(r.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, radius_m)
  order by extensions.st_distance(r.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography);
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.restaurants enable row level security;

create policy "perfiles visibles" on public.profiles
  for select using (true);

create policy "categorias visibles" on public.categories
  for select using (true);

-- Público ve aprobados; cada usuario ve sus propios aportes; admin ve todo.
create policy "ver restaurantes" on public.restaurants
  for select using (
    status = 'approved'
    or submitted_by = auth.uid()
    or public.is_admin()
  );

create policy "crear aportes" on public.restaurants
  for insert to authenticated
  with check (true);  -- el trigger fija autor y estado

-- El autor puede editar o retirar su aporte mientras siga pendiente; el admin, cualquiera.
create policy "editar aportes" on public.restaurants
  for update to authenticated
  using ((submitted_by = auth.uid() and status = 'pending') or public.is_admin());

create policy "borrar aportes" on public.restaurants
  for delete to authenticated
  using ((submitted_by = auth.uid() and status = 'pending') or public.is_admin());
