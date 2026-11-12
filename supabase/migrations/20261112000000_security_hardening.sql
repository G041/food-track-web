-- Endurecimiento de seguridad (auditoría del 12/11/2026).
-- Aplicar ANTES de publicar la app que la acompaña: el cliente nuevo usa my_profile(), user_roles()
-- y el cuarto parámetro de review_restaurant().

-- ─────────────────────────────────────────────────────────────
-- 1. Nombres de usuario únicos sin importar mayúsculas
--    (antes solo lo validaba el cliente con username_available: "Admin1" podía convivir con "admin1"
--    y romper el login por usuario de ambos).
-- ─────────────────────────────────────────────────────────────
create unique index profiles_username_lower_uniq on public.profiles (lower(username));

-- ─────────────────────────────────────────────────────────────
-- 2. El rol de cada usuario deja de ser público
--    Cualquiera sigue viendo usuario y puntos; el rol solo lo ve el dueño (my_profile) o un admin (user_roles).
-- ─────────────────────────────────────────────────────────────
revoke select on public.profiles from anon, authenticated;
grant select (id, username, points, created_at) on public.profiles to anon, authenticated;

create function public.my_profile()
returns table (id uuid, username text, role text, points int)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username, p.role, p.points from public.profiles p where p.id = auth.uid();
$$;

create function public.user_roles(p_ids uuid[])
returns table (id uuid, role text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver los roles' using errcode = '42501';
  end if;
  return query select p.id, p.role from public.profiles p where p.id = any (p_ids);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Restaurantes: los datos de moderación no se exponen a visitantes sin sesión
-- ─────────────────────────────────────────────────────────────
alter table public.restaurants add column updated_at timestamptz not null default now();

revoke select on public.restaurants from anon;
grant select (id, name, category, address, menu_url, latitude, longitude, location, status, created_at, updated_at)
  on public.restaurants to anon;

-- Devolvía la fila completa (incluidos autor y revisor): ahora solo los datos públicos.
drop function public.restaurants_nearby(double precision, double precision, int);
create function public.restaurants_nearby(lat double precision, lng double precision, radius_m int default 2000)
returns table (
  id bigint, name text, category text, address text, menu_url text,
  latitude double precision, longitude double precision, distance_m double precision
)
language sql stable set search_path = ''
as $$
  select r.id, r.name, r.category, r.address, r.menu_url, r.latitude, r.longitude,
         extensions.st_distance(r.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography)
  from public.restaurants r
  where r.status = 'approved'
    and extensions.st_dwithin(r.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, radius_m)
  order by 8;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Límite diario de aportes que no se puede esquivar
--    Antes contaba las filas existentes: retirar aportes o cambiarles created_at lo reiniciaba.
--    Ahora cuenta los envíos en un registro que el usuario no puede tocar.
-- ─────────────────────────────────────────────────────────────
create table public.submission_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index submission_log_user_idx on public.submission_log (user_id, created_at);
alter table public.submission_log enable row level security; -- sin políticas: solo los triggers (security definer)
revoke all on public.submission_log from anon, authenticated;

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
  new.created_at   := now();
  new.updated_at   := now();

  if public.is_admin() then
    -- los aportes de admins se publican directo
    new.status      := 'approved';
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  else
    new.status := 'pending';

    if auth.uid() is not null then
      select count(*) into recent
      from public.submission_log
      where user_id = auth.uid()
        and created_at > now() - interval '24 hours';

      if recent >= 10 then
        raise exception 'Llegaste al límite de 10 aportes por día' using errcode = 'P0001';
      end if;

      insert into public.submission_log (user_id) values (auth.uid());
      delete from public.submission_log where user_id = auth.uid() and created_at < now() - interval '2 days';
    end if;
  end if;

  return new;
end;
$$;

-- Al editar: se registra cuándo cambió (lo usa la revisión) y un usuario común no puede tocar
-- los campos de moderación ni la fecha de alta.
create or replace function public.restaurants_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Sin usuario (clave secreta, panel de Supabase o la cascada al borrar una cuenta) no se pisa nada:
  -- antes, borrar una cuenta devolvía sus lugares publicados a 'pending' y les dejaba un autor inexistente.
  -- Un visitante anónimo nunca llega acá: la política de update es solo para usuarios con sesión.
  if auth.uid() is not null and not public.is_admin() then
    new.status       := 'pending';
    new.submitted_by := old.submitted_by;
    new.created_at   := old.created_at;
    new.reviewed_by  := null;
    new.reviewed_at  := null;
    new.review_note  := null;
  end if;
  return new;
end;
$$;

-- Un usuario bloqueado tampoco puede editar los aportes que ya tenía pendientes.
create trigger restaurants_banned_check_update
  before update on public.restaurants
  for each row execute function public.reject_banned();

-- ─────────────────────────────────────────────────────────────
-- 5. Revisión: se aprueba lo que el admin vio
--    El autor puede editar mientras está pendiente; si cambió después de que el admin lo abrió
--    (p_seen_at = updated_at que recibió), la revisión se rechaza y hay que mirarlo de nuevo.
-- ─────────────────────────────────────────────────────────────
drop function public.review_restaurant(bigint, text, text);
create function public.review_restaurant(
  p_id bigint,
  p_decision text,
  p_note text default null,
  p_seen_at timestamptz default null
)
returns public.restaurants
language plpgsql security definer set search_path = ''
as $$
declare
  current_row public.restaurants;
  result public.restaurants;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar aportes' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision;
  end if;

  select * into current_row from public.restaurants where id = p_id for update;
  if current_row.id is null then
    raise exception 'Restaurante % no encontrado', p_id;
  end if;
  if p_seen_at is not null and current_row.updated_at <> p_seen_at then
    raise exception 'El aporte cambió desde que lo abriste. Revisalo de nuevo.' using errcode = 'P0001';
  end if;

  update public.restaurants
     set status      = p_decision,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = nullif(trim(p_note), '')
   where id = p_id
  returning * into result;

  -- puntos para quien aportó un lugar aprobado
  if p_decision = 'approved' and result.submitted_by is not null then
    update public.profiles set points = points + 10 where id = result.submitted_by;
  end if;

  return result;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Intentos fallidos de login por usuario (los lee y escribe api/login con la clave secreta)
-- ─────────────────────────────────────────────────────────────
create table public.login_attempts (
  id         bigint generated always as identity primary key,
  username   text not null,
  ip         text,
  created_at timestamptz not null default now()
);
create index login_attempts_username_idx on public.login_attempts (username, created_at);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at);
alter table public.login_attempts enable row level security; -- sin políticas: solo la clave secreta
revoke all on public.login_attempts from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6b. Tope diario de reportes por usuario
--     Antes un usuario podía reportar todos los lugares publicados de una vez y tapar la cola de los admins.
--     El usuario no puede borrar sus reportes, así que alcanza con contar las filas.
-- ─────────────────────────────────────────────────────────────
create function public.reports_daily_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  recent int;
begin
  if auth.uid() is not null and not public.is_admin() then
    select count(*) into recent
    from public.reports
    where reported_by = auth.uid()
      and created_at > now() - interval '24 hours';

    if recent >= 20 then
      raise exception 'Llegaste al límite de 20 reportes por día' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_daily_limit
  before insert on public.reports
  for each row execute function public.reports_daily_limit();

-- ─────────────────────────────────────────────────────────────
-- 7. Funciones: search_path fijo y sin ejecución para visitantes donde no hace falta
-- ─────────────────────────────────────────────────────────────
alter function public.touch_updated_at() set search_path = '';

revoke execute on function public.my_profile() from public, anon;
revoke execute on function public.user_roles(uuid[]) from public, anon;
revoke execute on function public.review_restaurant(bigint, text, text, timestamptz) from public, anon;
revoke execute on function public.set_user_banned(uuid, boolean) from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.user_roles(uuid[]) to authenticated;
grant execute on function public.review_restaurant(bigint, text, text, timestamptz) to authenticated;
grant execute on function public.set_user_banned(uuid, boolean) to authenticated;
