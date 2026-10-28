-- Notas internas del equipo (ideas y pendientes). Solo los admins las ven y las editan.

create table public.admin_notes (
  id         bigint generated always as identity primary key,
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  done       boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_notes_created_at_idx on public.admin_notes (created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger admin_notes_touch
  before update on public.admin_notes
  for each row execute function public.touch_updated_at();

alter table public.admin_notes enable row level security;

create policy "admins leen notas" on public.admin_notes
  for select to authenticated using (public.is_admin());

create policy "admins crean notas" on public.admin_notes
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

create policy "admins editan notas" on public.admin_notes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins borran notas" on public.admin_notes
  for delete to authenticated using (public.is_admin());
