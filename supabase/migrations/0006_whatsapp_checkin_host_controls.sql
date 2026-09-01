-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0006: WhatsApp del host + fix check-in/tiempo
-- real + registro horario + controles de anfitrión (editar/cancelar/
-- marcar llena)
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere 0003, 0004, 0005. Idempotente.
-- ════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────── 1. COLUMNAS ──────────────────────────

alter table public.parties
  add column if not exists whatsapp_number text;

do $$
begin
  alter table public.parties
    add constraint parties_whatsapp_format
    check (whatsapp_number is null or whatsapp_number ~ '^\+?[0-9]{8,15}$');
exception when duplicate_object then null;
end $$;

alter table public.party_requests
  add column if not exists checked_in_at timestamptz;

-- ─────────────── 2. REAFIRMAR REALTIME (defensivo) ──────────────
-- Si 0004 no corrió completa en algún proyecto, esto la deja bien.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'parties'
  ) then
    alter publication supabase_realtime add table public.parties;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'party_requests'
  ) then
    alter publication supabase_realtime add table public.party_requests;
  end if;
end $$;

-- ───────────────────────── 3. create_party ──────────────────────

create or replace function public.create_party(
  p_title text,
  p_description text,
  p_city text,
  p_zone text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_start_at timestamptz,
  p_max_people int,
  p_type text,
  p_legal_ok boolean,
  p_arrival_notes text,
  p_whatsapp_number text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_count int;
  v_limit int;
  v_blur record;
  v_whatsapp text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select count(*) into v_count from public.parties
  where host_id = v_uid and created_at > now() - interval '24 hours';
  if v_count >= 3 then raise exception 'SPAM_LIMIT'; end if;

  if p_title is null or length(trim(p_title)) < 3 then raise exception 'BAD_TITLE'; end if;
  if p_city not in ('la_plata','caba','bariloche') then raise exception 'BAD_CITY'; end if;
  if p_zone is null or length(trim(p_zone)) = 0 then raise exception 'BAD_ZONE'; end if;
  if p_start_at is null or p_start_at < now() - interval '5 minutes' then raise exception 'BAD_DATE'; end if;
  if p_max_people is null or p_max_people < 1 or p_max_people > 500 then raise exception 'BAD_CAPACITY'; end if;
  if p_type not in ('private','open') then raise exception 'BAD_TYPE'; end if;

  v_whatsapp := nullif(trim(coalesce(p_whatsapp_number, '')), '');
  if v_whatsapp is not null and v_whatsapp !~ '^\+?[0-9]{8,15}$' then
    raise exception 'BAD_WHATSAPP';
  end if;

  v_limit := case when p_city = 'la_plata' then 50 else 40 end;
  if p_max_people > v_limit and p_legal_ok is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  select * into v_blur from public.blur_point(p_lat, p_lng, v_id);

  insert into public.parties (
    id, host_id, title, description, city, zone_text,
    address_hidden, lat_hidden, lng_hidden, arrival_notes, whatsapp_number,
    approx_area, lat_approx, lng_approx,
    start_at, expires_at, max_people, type, legal_accepted
  ) values (
    v_id, v_uid, trim(p_title), p_description, p_city, trim(p_zone),
    p_address, p_lat, p_lng, nullif(trim(coalesce(p_arrival_notes, '')), ''), v_whatsapp,
    public.blur_address(p_address), v_blur.lat, v_blur.lng,
    p_start_at, p_start_at + interval '8 hours',
    p_max_people, p_type, coalesce(p_legal_ok, false)
  );

  return v_id;
end; $$;

revoke all on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text
) from public, anon;
grant execute on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text
) to authenticated;

-- ───────────────────────── 4. get_party ─────────────────────────

drop function if exists public.get_party(uuid);

create or replace function public.get_party(p_id uuid)
returns table (
  id uuid, host_id uuid, host_name text, title text, description text,
  city text, zone_text text, type text, max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz, status text,
  address_hidden text, lat_hidden double precision, lng_hidden double precision,
  arrival_notes text, whatsapp_number text,
  approx_area text, lat_approx double precision, lng_approx double precision,
  my_status text, checked_in boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_is_host boolean;
  v_approved boolean;
begin
  select (p.host_id = auth.uid()) into v_is_host from public.parties p where p.id = p_id;
  select exists(
    select 1 from public.party_requests pr
    where pr.party_id = p_id and pr.user_id = auth.uid() and pr.status = 'approved'
  ) into v_approved;

  return query
    select p.id, p.host_id,
      coalesce((select u.raw_user_meta_data ->> 'full_name' from auth.users u where u.id = p.host_id), 'Anfitrión'),
      p.title, p.description, p.city, p.zone_text, p.type,
      p.max_people, p.attendees_count, p.start_at, p.expires_at, p.status,
      case when v_is_host or v_approved then p.address_hidden end,
      case when v_is_host or v_approved then p.lat_hidden end,
      case when v_is_host or v_approved then p.lng_hidden end,
      case when v_is_host or v_approved then p.arrival_notes end,
      -- WhatsApp: NO se muestra al propio host (no tiene sentido escribirse a sí mismo).
      case when (not v_is_host) and v_approved then p.whatsapp_number end,
      p.approx_area, p.lat_approx, p.lng_approx,
      case
        when v_is_host then 'host'
        else coalesce((select pr.status from public.party_requests pr
                       where pr.party_id = p.id and pr.user_id = auth.uid()), 'none')
      end,
      coalesce((select pr.checked_in from public.party_requests pr
                where pr.party_id = p.id and pr.user_id = auth.uid()), false)
    from public.parties p
    where p.id = p_id;
end; $$;

revoke all on function public.get_party(uuid) from public, anon;
grant execute on function public.get_party(uuid) to authenticated;

-- ───────────────────────── 5. check_in + registro horario ───────

create or replace function public.check_in(p_party uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_max int;
  v_count int;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  if not exists (
    select 1 from public.party_requests
    where party_id = p_party and user_id = v_uid and status = 'approved'
  ) then
    raise exception 'NOT_APPROVED';
  end if;

  update public.party_requests
  set checked_in = true, checked_in_at = now()
  where party_id = p_party and user_id = v_uid and checked_in is not true;

  select max_people, attendees_count into v_max, v_count from public.parties where id = p_party;
  return v_count;
end; $$;

revoke all on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;

create or replace function public.party_checkin_times(p_party uuid)
returns table (checked_in_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (
    select 1 from public.parties where id = p_party and status = 'active' and expires_at > now()
  ) then
    raise exception 'PARTY_NOT_ACTIVE';
  end if;

  return query
    select pr.checked_in_at from public.party_requests pr
    where pr.party_id = p_party and pr.checked_in_at is not null
    order by pr.checked_in_at asc;
end; $$;

revoke all on function public.party_checkin_times(uuid) from public, anon;
grant execute on function public.party_checkin_times(uuid) to authenticated;

-- ───────────────────────── 6. admin_list_parties + whatsapp ─────

drop function if exists public.admin_list_parties(text);

create or replace function public.admin_list_parties(p_filter text default 'all')
returns table (
  id uuid, host_id uuid, host_name text, host_email text, title text, description text,
  city text, zone_text text, type text, address_hidden text, arrival_notes text,
  whatsapp_number text, lat_hidden double precision, lng_hidden double precision,
  max_people int, attendees_count int, pending_count int, report_count int,
  start_at timestamptz, expires_at timestamptz, created_at timestamptz,
  status text, is_live boolean
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select p.id, p.host_id,
      coalesce(u.display_name, au.raw_user_meta_data ->> 'full_name', 'Anfitrión'),
      au.email::text, p.title, p.description, p.city, p.zone_text, p.type,
      p.address_hidden, p.arrival_notes, p.whatsapp_number, p.lat_hidden, p.lng_hidden,
      p.max_people, p.attendees_count,
      (select count(*)::int from public.party_requests r where r.party_id = p.id and r.status = 'pending'),
      (select count(*)::int from public.reports rp where rp.party_id = p.id),
      p.start_at, p.expires_at, p.created_at, p.status,
      (p.status = 'active' and p.expires_at > now())
    from public.parties p
    left join public.users u on u.id = p.host_id
    left join auth.users au on au.id = p.host_id
    where p_filter = 'all'
       or (p_filter = 'live' and p.status = 'active' and p.expires_at > now())
       or (p_filter = 'reported' and exists (select 1 from public.reports rp where rp.party_id = p.id))
    order by p.created_at desc
    limit 500;
end; $$;

revoke all on function public.admin_list_parties(text) from public, anon;
grant execute on function public.admin_list_parties(text) to authenticated;

-- ───────────────────────── 7. Controles de anfitrión ────────────

create or replace function public.host_update_party(
  p_id uuid, p_title text, p_description text, p_arrival_notes text,
  p_whatsapp_number text, p_max_people int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_party public.parties%rowtype;
  v_limit int;
  v_whatsapp text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  select * into v_party from public.parties where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_party.host_id <> auth.uid() then raise exception 'NOT_HOST'; end if;
  if v_party.status <> 'active' then raise exception 'PARTY_NOT_ACTIVE'; end if;
  if p_title is null or length(trim(p_title)) < 3 then raise exception 'BAD_TITLE'; end if;
  if p_max_people is null or p_max_people < 1 or p_max_people > 500 then raise exception 'BAD_CAPACITY'; end if;
  if p_max_people < v_party.attendees_count then raise exception 'CAPACITY_BELOW_ATTENDEES'; end if;

  v_whatsapp := nullif(trim(coalesce(p_whatsapp_number, '')), '');
  if v_whatsapp is not null and v_whatsapp !~ '^\+?[0-9]{8,15}$' then
    raise exception 'BAD_WHATSAPP';
  end if;

  v_limit := case when v_party.city = 'la_plata' then 50 else 40 end;
  if p_max_people > v_limit and v_party.legal_accepted is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  update public.parties set
    title = trim(p_title),
    description = p_description,
    arrival_notes = nullif(trim(coalesce(p_arrival_notes, '')), ''),
    whatsapp_number = v_whatsapp,
    max_people = p_max_people
  where id = p_id;
end; $$;

create or replace function public.host_cancel_party(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  if not exists (select 1 from public.parties where id = p_id and host_id = auth.uid()) then
    raise exception 'NOT_HOST';
  end if;
  update public.parties set status = 'cancelled' where id = p_id;
end; $$;

create or replace function public.host_mark_full(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_party public.parties%rowtype;
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  select * into v_party from public.parties where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_party.host_id <> auth.uid() then raise exception 'NOT_HOST'; end if;
  update public.parties set max_people = greatest(v_party.attendees_count, 1) where id = p_id;
end; $$;

revoke all on function public.host_update_party(uuid, text, text, text, text, int) from public, anon;
revoke all on function public.host_cancel_party(uuid) from public, anon;
revoke all on function public.host_mark_full(uuid) from public, anon;
grant execute on function public.host_update_party(uuid, text, text, text, text, int) to authenticated;
grant execute on function public.host_cancel_party(uuid) to authenticated;
grant execute on function public.host_mark_full(uuid) to authenticated;

-- ───────────────────────── 8. Feedback + abandonar previa ───────

create table if not exists public.party_feedback (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host','guest')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (party_id, user_id)
);
alter table public.party_feedback enable row level security;
revoke all on public.party_feedback from anon, authenticated;

create or replace function public.submit_party_feedback(p_party uuid, p_rating int, p_comment text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'BAD_RATING'; end if;

  if exists (select 1 from public.parties where id = p_party and host_id = v_uid) then
    v_role := 'host';
  elsif exists (
    select 1 from public.party_requests
    where party_id = p_party and user_id = v_uid and status = 'approved'
  ) then
    v_role := 'guest';
  else
    raise exception 'NOT_PARTICIPANT';
  end if;

  insert into public.party_feedback (party_id, user_id, role, rating, comment)
  values (p_party, v_uid, v_role, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (party_id, user_id) do update
    set rating = excluded.rating, comment = excluded.comment;
end; $$;

create or replace function public.leave_party(p_party uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;
  if exists (select 1 from public.parties where id = p_party and host_id = v_uid) then
    raise exception 'HOST_CANNOT_LEAVE';
  end if;

  delete from public.party_requests
  where party_id = p_party and user_id = v_uid and status = 'approved';
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then raise exception 'NOT_APPROVED'; end if;

  update public.parties set attendees_count = greatest(attendees_count - 1, 0) where id = p_party;
end; $$;

create or replace function public.admin_list_feedback()
returns table (
  id uuid, party_id uuid, party_title text, role text,
  rating smallint, comment text, created_at timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select f.id, f.party_id, p.title, f.role, f.rating, f.comment, f.created_at
    from public.party_feedback f
    join public.parties p on p.id = f.party_id
    order by f.created_at desc
    limit 500;
end; $$;

revoke all on function public.submit_party_feedback(uuid, int, text) from public, anon;
revoke all on function public.leave_party(uuid) from public, anon;
revoke all on function public.admin_list_feedback() from public, anon;
grant execute on function public.submit_party_feedback(uuid, int, text) to authenticated;
grant execute on function public.leave_party(uuid) to authenticated;
grant execute on function public.admin_list_feedback() to authenticated;

commit;
