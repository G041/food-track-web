-- Reportes de lugares publicados y bloqueo de usuarios (requisitos de App Store para contenido de usuarios).

-- ─────────────────────────────────────────────────────────────
-- Usuarios bloqueados
-- ─────────────────────────────────────────────────────────────
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin', 'banned'));

create or replace function public.is_banned()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'banned'
  );
$$;

-- Un usuario bloqueado puede seguir viendo el mapa, pero no aportar, calificar ni reportar.
create or replace function public.reject_banned()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_banned() then
    raise exception 'Tu cuenta está bloqueada por incumplir los términos de uso' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Postgres dispara los triggers por orden alfabético: "banned" va antes que "before_insert"
-- para que un bloqueado vea ese motivo y no el límite diario.
create trigger restaurants_banned_check
  before insert on public.restaurants
  for each row execute function public.reject_banned();

create trigger ratings_reject_banned
  before insert or update on public.ratings
  for each row execute function public.reject_banned();

-- Solo un admin bloquea o desbloquea, y nunca a otro admin.
create or replace function public.set_user_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede bloquear usuarios' using errcode = '42501';
  end if;

  update public.profiles
     set role = case when p_banned then 'banned' else 'user' end
   where id = p_user and role <> 'admin';

  if not found then
    raise exception 'No se puede bloquear a ese usuario' using errcode = 'P0001';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Reportes
-- ─────────────────────────────────────────────────────────────
create table public.reports (
  id            bigint generated always as identity primary key,
  restaurant_id bigint not null references public.restaurants (id) on delete cascade,
  reported_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  reason        text not null check (reason in ('menu_roto', 'cerrado', 'datos_incorrectos', 'inapropiado', 'otro')),
  detail        text check (char_length(detail) <= 300),
  status        text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
-- Un mismo usuario no repite un reporte abierto sobre el mismo lugar.
create unique index reports_open_uniq on public.reports (restaurant_id, reported_by) where status = 'open';

create trigger reports_reject_banned
  before insert on public.reports
  for each row execute function public.reject_banned();

alter table public.reports enable row level security;

-- Se reportan solo lugares publicados, siempre a nombre propio.
create policy "reportar" on public.reports
  for insert to authenticated
  with check (
    reported_by = auth.uid()
    and status = 'open'
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'approved')
  );

create policy "ver reportes" on public.reports
  for select to authenticated
  using (reported_by = auth.uid() or public.is_admin());

create policy "resolver reportes" on public.reports
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "borrar reportes" on public.reports
  for delete to authenticated
  using (public.is_admin());
