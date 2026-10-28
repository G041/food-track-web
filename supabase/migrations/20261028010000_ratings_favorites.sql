-- Calificaciones (1 a 5 estrellas, una por usuario y lugar) y favoritos.

-- ─────────────────────────────────────────────────────────────
-- Calificaciones
-- ─────────────────────────────────────────────────────────────
create table public.ratings (
  restaurant_id bigint not null references public.restaurants (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  stars         smallint not null check (stars between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create trigger ratings_touch
  before update on public.ratings
  for each row execute function public.touch_updated_at();

alter table public.ratings enable row level security;

-- Cada usuario ve y maneja solo sus calificaciones; el público ve los promedios (vista de abajo).
create policy "ver mis calificaciones" on public.ratings
  for select to authenticated using (user_id = auth.uid());

-- Solo se califican lugares publicados.
create policy "calificar" on public.ratings
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'approved')
  );

create policy "editar mi calificación" on public.ratings
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "borrar mi calificación" on public.ratings
  for delete to authenticated using (user_id = auth.uid());

-- Promedio y cantidad por lugar. La vista corre con permisos de su dueño, así expone solo
-- los agregados sin revelar quién calificó qué.
create view public.restaurant_rating_stats
with (security_invoker = false) as
  select restaurant_id,
         round(avg(stars)::numeric, 2)::double precision as average,
         count(*)::int as count
  from public.ratings
  group by restaurant_id;

grant select on public.restaurant_rating_stats to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Favoritos
-- ─────────────────────────────────────────────────────────────
create table public.favorites (
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  restaurant_id bigint not null references public.restaurants (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

alter table public.favorites enable row level security;

create policy "ver mis favoritos" on public.favorites
  for select to authenticated using (user_id = auth.uid());

create policy "agregar favorito" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());

create policy "quitar favorito" on public.favorites
  for delete to authenticated using (user_id = auth.uid());
