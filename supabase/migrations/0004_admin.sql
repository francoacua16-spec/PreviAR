-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0004: panel de administración
--
-- Un admin (Franco) ve TODAS las previas —activas, expiradas y dadas
-- de baja—, con dirección real, y puede darlas de baja o borrarlas.
-- El resto de la gente sigue viendo exactamente lo mismo que antes.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Idempotente.
-- ════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────── 1. QUIÉN ES ADMIN ────────────────────

create table if not exists public.app_admins (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- Marca hasta dónde leyó el panel: lo que entró después cuenta como nuevo.
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Nadie escribe esta tabla desde la app: se toca solo por SQL o service_role.
drop policy if exists app_admins_select_own on public.app_admins;
create policy app_admins_select_own on public.app_admins for select to authenticated
  using (user_id = auth.uid());

-- SECURITY DEFINER: las policies de abajo la llaman, y si dependiera de RLS
-- sobre app_admins se mordería la cola (RLS que consulta la tabla que filtra).
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ───────────────────────── 2. SEED DEL PRIMER ADMIN ─────────────

-- Primero por mail conocido. Si el login de Google usa otra dirección, cae al
-- usuario más viejo de la base: en esta app ese es el dueño, sí o sí.
insert into public.app_admins (user_id)
select u.id
from public.users u
join auth.users au on au.id = u.id
where lower(au.email) in ('franco.acua16@gmail.com', 'fran.acua@hotmail.com')
on conflict (user_id) do nothing;

insert into public.app_admins (user_id)
select u.id from public.users u
order by u.created_at asc
limit 1
on conflict (user_id) do nothing;

-- ───────────────────────── 3. LECTURA TOTAL PARA EL ADMIN ───────

-- Las policies se suman con OR: esto no le saca nada a nadie, solo agrega
-- una vía extra de lectura para quien esté en app_admins.
drop policy if exists parties_select_admin on public.parties;
create policy parties_select_admin on public.parties for select to authenticated
  using (public.is_admin());

drop policy if exists reports_select_admin on public.reports;
create policy reports_select_admin on public.reports for select to authenticated
  using (public.is_admin());

-- Realtime: sin esto el panel no se entera de las previas nuevas.
-- `add table` explota si ya está, así que preguntamos antes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'parties'
  ) then
    alter publication supabase_realtime add table public.parties;
  end if;
end $$;

-- ───────────────────────── 4. LISTADO DEL PANEL ─────────────────

drop function if exists public.admin_list_parties(text);

create or replace function public.admin_list_parties(p_filter text default 'all')
returns table (
  id uuid, host_id uuid, host_name text, host_email text,
  title text, description text, city text, zone_text text, type text,
  address_hidden text, arrival_notes text,
  lat_hidden double precision, lng_hidden double precision,
  max_people int, attendees_count int, pending_count int, report_count int,
  start_at timestamptz, expires_at timestamptz, created_at timestamptz,
  status text, is_live boolean
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select p.id, p.host_id,
      coalesce(
        (select au.raw_user_meta_data ->> 'full_name' from auth.users au where au.id = p.host_id),
        'Anfitrión'
      ),
      (select au.email::text from auth.users au where au.id = p.host_id),
      p.title, p.description, p.city, p.zone_text, p.type,
      p.address_hidden, p.arrival_notes, p.lat_hidden, p.lng_hidden,
      p.max_people, p.attendees_count,
      (select count(*)::int from public.party_requests pr
        where pr.party_id = p.id and pr.status = 'pending'),
      (select count(*)::int from public.reports r where r.party_id = p.id),
      p.start_at, p.expires_at, p.created_at, p.status,
      (p.status = 'active' and p.expires_at > now())
    from public.parties p
    where case p_filter
            when 'live' then p.status = 'active' and p.expires_at > now()
            when 'reported' then exists (select 1 from public.reports r where r.party_id = p.id)
            else true
          end
    order by p.created_at desc
    limit 500;
end; $$;

revoke all on function public.admin_list_parties(text) from public, anon;
grant execute on function public.admin_list_parties(text) to authenticated;

-- ───────────────────────── 5. BAJA Y BORRADO ────────────────────

-- Baja: la previa desaparece del mapa al toque (las policies de la gente
-- filtran por status = 'active'), pero queda el registro para revisarla.
create or replace function public.admin_delete_party(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  update public.parties set status = 'cancelled' where id = p_id;
end; $$;

-- Borrado real: se lleva puestas solicitudes, mensajes y reportes por cascade.
-- No hay vuelta atrás; el panel lo pide con confirmación aparte.
create or replace function public.admin_purge_party(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  delete from public.parties where id = p_id;
end; $$;

-- Revertir una baja hecha de más.
create or replace function public.admin_restore_party(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  update public.parties set status = 'active' where id = p_id;
end; $$;

revoke all on function public.admin_delete_party(uuid) from public, anon;
revoke all on function public.admin_purge_party(uuid) from public, anon;
revoke all on function public.admin_restore_party(uuid) from public, anon;
grant execute on function public.admin_delete_party(uuid) to authenticated;
grant execute on function public.admin_purge_party(uuid) to authenticated;
grant execute on function public.admin_restore_party(uuid) to authenticated;

-- ───────────────────────── 6. AVISOS: CUÁNTO HAY SIN VER ────────

create or replace function public.admin_unseen_count()
returns int
language plpgsql security definer stable set search_path = public as $$
declare
  v_seen timestamptz;
begin
  select a.last_seen_at into v_seen from public.app_admins a where a.user_id = auth.uid();
  if v_seen is null then return 0; end if;

  return (select count(*)::int from public.parties p where p.created_at > v_seen);
end; $$;

create or replace function public.admin_mark_seen()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  update public.app_admins set last_seen_at = v_now where user_id = auth.uid();
  if not found then raise exception 'NOT_ADMIN'; end if;
  return v_now;
end; $$;

revoke all on function public.admin_unseen_count() from public, anon;
revoke all on function public.admin_mark_seen() from public, anon;
grant execute on function public.admin_unseen_count() to authenticated;
grant execute on function public.admin_mark_seen() to authenticated;

-- ───────────────────────── 7. NÚMEROS DE ARRIBA ─────────────────

create or replace function public.admin_stats()
returns table (
  live_parties int, total_parties int, total_users int,
  verified_users int, open_reports int
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query select
    (select count(*)::int from public.parties p where p.status = 'active' and p.expires_at > now()),
    (select count(*)::int from public.parties),
    (select count(*)::int from public.users),
    (select count(*)::int from public.users u where u.verified),
    (select count(*)::int from public.reports);
end; $$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

commit;
