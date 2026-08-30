-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración inicial V1
-- Ejecutar EN ORDEN en: Supabase Dashboard → SQL Editor → New query
-- Idempotente (se puede correr de nuevo sin romper nada).
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. TABLAS ─────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  city text,
  reputation int not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  city text not null check (city in ('la_plata','caba','bariloche')),
  zone_text text not null,
  -- Dirección real: NUNCA se expone por tabla. Solo vía funciones
  -- SECURITY DEFINER para el host o invitados aprobados.
  address_hidden text,
  lat_hidden double precision,
  lng_hidden double precision,
  start_at timestamptz not null,
  expires_at timestamptz not null,
  max_people int not null default 20 check (max_people > 0),
  type text not null default 'private' check (type in ('private','open')),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  attendees_count int not null default 0,
  legal_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.party_requests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Desnormalizado a propósito: permite filtrar Realtime por host sin joins.
  host_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (party_id, user_id)
);

create table if not exists public.party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  sender_name text,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists parties_city_zone_idx on public.parties (city, zone_text) where status = 'active';
create index if not exists parties_host_idx on public.parties (host_id);
create index if not exists parties_expires_idx on public.parties (expires_at) where status = 'active';
create index if not exists messages_party_idx on public.party_messages (party_id, created_at);
create index if not exists requests_party_idx on public.party_requests (party_id);
create index if not exists requests_host_idx on public.party_requests (host_id) where status = 'pending';

-- ───────────────────────── 2. TRIGGERS ─────────────────────────

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- host_id en requests siempre consistente
create or replace function public.set_request_host()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select host_id into new.host_id from public.parties where id = new.party_id;
  return new;
end; $$;

drop trigger if exists trg_set_request_host on public.party_requests;
create trigger trg_set_request_host before insert on public.party_requests
  for each row execute function public.set_request_host();

-- Nombre visible en el chat (desde metadata de Google)
create or replace function public.set_message_sender()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'Anónimo')
    into new.sender_name from auth.users where id = new.user_id;
  return new;
end; $$;

drop trigger if exists trg_set_message_sender on public.party_messages;
create trigger trg_set_message_sender before insert on public.party_messages
  for each row execute function public.set_message_sender();

-- ───────────────────────── 3. RLS ─────────────────────────
-- Regla de oro: lat_hidden / lng_hidden / address_hidden jamás se
-- otorgan por columna. Todo dato sensible sale por funciones
-- SECURITY DEFINER que chequean aprobación u host.

alter table public.users enable row level security;
alter table public.parties enable row level security;
alter table public.party_requests enable row level security;
alter table public.party_messages enable row level security;
alter table public.reports enable row level security;

grant select on public.users to authenticated;
grant update (city) on public.users to authenticated;

create policy users_select on public.users for select to authenticated using (true);
create policy users_update_city on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- parties: lectura pública limitada a columnas seguras,
-- solo fiestas activas y no expiradas. Escrituras solo vía RPC.
revoke all on public.parties from anon, authenticated;
grant select (
  id, host_id, title, description, city, zone_text,
  start_at, expires_at, max_people, type, status,
  attendees_count, legal_accepted, created_at
) on public.parties to authenticated;

create policy parties_select on public.parties for select to authenticated
  using (status = 'active' and expires_at > now());

-- party_requests: el solicitante y el host ven las filas (habilita Realtime).
-- Insert/update solo vía RPC (anti-spam y anti-clavo).
revoke all on public.party_requests from anon, authenticated;
grant select on public.party_requests to authenticated;

create policy requests_select on public.party_requests for select to authenticated
  using (user_id = auth.uid() or host_id = auth.uid());

-- party_messages: solo miembros aprobados (o el host) leen y escriben.
revoke all on public.party_messages from anon, authenticated;
grant select, insert on public.party_messages to authenticated;

create policy messages_select on public.party_messages for select to authenticated
  using (public.is_party_member(party_id));
create policy messages_insert on public.party_messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_party_member(party_id));

-- reports: cualquiera logueado puede reportar; nadie puede leer.
revoke all on public.reports from anon, authenticated;
grant insert on public.reports to authenticated;

create policy reports_insert on public.reports for insert to authenticated
  with check (user_id = auth.uid());

-- Vista pública (sin campos ocultos) — tal como pide el documento maestro
create or replace view public.public_parties as
  select id, host_id, title, description, city, zone_text,
         start_at, expires_at, max_people, type, status, attendees_count, created_at
  from public.parties
  where status = 'active' and expires_at > now();
grant select on public.public_parties to authenticated;

-- Realtime para chat y notificaciones de solicitudes
alter publication supabase_realtime add table public.party_messages;
alter publication supabase_realtime add table public.party_requests;

-- ───────────────────────── 4. FUNCIONES ─────────────────────────

-- Helper interno para las políticas de chat
create or replace function public.is_party_member(p_party uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.parties p
    where p.id = p_party
      and (
        p.host_id = auth.uid()
        or exists (
          select 1 from public.party_requests pr
          where pr.party_id = p.id
            and pr.user_id = auth.uid()
            and pr.status = 'approved'
        )
      )
  );
$$;
revoke all on function public.is_party_member(uuid) from public, anon;

-- Crear previa: anti-spam (3/24h), validez, expiración +8h,
-- y control SERVER-SIDE del consentimiento legal.
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
  p_legal_ok boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_count int;
  v_limit int;
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

  -- Límite legal por ciudad: La Plata 50, CABA/Bariloche 40
  v_limit := case when p_city = 'la_plata' then 50 else 40 end;
  if p_max_people > v_limit and p_legal_ok is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  insert into public.parties (
    host_id, title, description, city, zone_text,
    address_hidden, lat_hidden, lng_hidden,
    start_at, expires_at, max_people, type, legal_accepted
  ) values (
    v_uid, trim(p_title), p_description, p_city, trim(p_zone),
    p_address, p_lat, p_lng,
    p_start_at, p_start_at + interval '8 hours',
    p_max_people, p_type, coalesce(p_legal_ok, false)
  )
  returning id into v_id;

  return v_id;
end; $$;
revoke all on function public.create_party(text, text, text, text, text, double precision, double precision, timestamptz, int, text, boolean) from public, anon;
grant execute on function public.create_party(text, text, text, text, text, double precision, double precision, timestamptz, int, text, boolean) to authenticated;

-- Zonas de una ciudad con contadores de previas activas
create or replace function public.list_city_zones(p_city text)
returns table (zone_text text, party_count bigint)
language sql security definer stable set search_path = public as $$
  select p.zone_text, count(*)::bigint
  from public.parties p
  where p.city = p_city and p.status = 'active' and p.expires_at > now()
  group by p.zone_text
  order by p.zone_text;
$$;
revoke all on function public.list_city_zones(text) from public, anon;
grant execute on function public.list_city_zones(text) to authenticated;

-- Previas de una zona + distancia aproximada (redondeada a 100 m, sin exponer coordenadas)
create or replace function public.list_zone_parties(
  p_city text, p_zone text, p_lat double precision, p_lng double precision
)
returns table (
  id uuid, title text, type text, max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz, distance_m int, my_status text
)
language sql security definer stable set search_path = public as $$
  select p.id, p.title, p.type, p.max_people, p.attendees_count, p.start_at, p.expires_at,
    case
      when p.lat_hidden is not null and p_lat is not null and p_lng is not null then
        (round((
          6371000 * 2 * asin(sqrt(
            power(sin(radians((p_lat - p.lat_hidden) / 2)), 2) +
            cos(radians(p_lat)) * cos(radians(p.lat_hidden)) *
            power(sin(radians((p_lng - p.lng_hidden) / 2)), 2)
          ))
        ) / 100) * 100)::int
      else null
    end as distance_m,
    case
      when p.host_id = auth.uid() then 'host'
      else (
        select pr.status from public.party_requests pr
        where pr.party_id = p.id and pr.user_id = auth.uid()
      )
    end as my_status
  from public.parties p
  where p.city = p_city and p.zone_text = p_zone
    and p.status = 'active' and p.expires_at > now()
  order by p.start_at asc;
$$;
revoke all on function public.list_zone_parties(text, text, double precision, double precision) from public, anon;
grant execute on function public.list_zone_parties(text, text, double precision, double precision) to authenticated;

-- Detalle de una previa. Los campos ocultos solo vuelven
-- si sos el host o tenés solicitud aprobada.
create or replace function public.get_party(p_id uuid)
returns table (
  id uuid, host_id uuid, host_name text, title text, description text,
  city text, zone_text text, type text, max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz, status text,
  address_hidden text, lat_hidden double precision, lng_hidden double precision,
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

-- Pedir ir: en previas abiertas aprueba al instante; en privadas queda pendiente.
create or replace function public.request_to_join(p_party uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_party public.parties%rowtype;
  v_status text;
  v_result text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select * into v_party from public.parties where id = p_party;
  if not found or v_party.status <> 'active' or v_party.expires_at <= now() then
    raise exception 'PARTY_NOT_ACTIVE';
  end if;

  if v_party.host_id = v_uid then return 'host'; end if;

  select pr.status into v_status from public.party_requests pr
  where pr.party_id = p_party and pr.user_id = v_uid;
  if v_status is not null then return v_status; end if;

  if v_party.attendees_count >= v_party.max_people then raise exception 'PARTY_FULL'; end if;

  v_result := case when v_party.type = 'open' then 'approved' else 'pending' end;
  insert into public.party_requests (party_id, user_id, host_id, status)
  values (p_party, v_uid, v_party.host_id, v_result)
  on conflict (party_id, user_id) do nothing;
  return v_result;
end; $$;
revoke all on function public.request_to_join(uuid) from public, anon;
grant execute on function public.request_to_join(uuid) to authenticated;

-- Aprobar/rechazar solicitud (solo host)
create or replace function public.respond_request(p_request uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_party uuid;
  v_max int;
  v_count int;
  v_new text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select pr.party_id into v_party from public.party_requests pr where pr.id = p_request;
  if v_party is null then raise exception 'NOT_FOUND'; end if;

  if not exists (select 1 from public.parties p where p.id = v_party and p.host_id = v_uid) then
    raise exception 'NOT_HOST';
  end if;

  v_new := case when p_approve then 'approved' else 'rejected' end;

  if p_approve then
    select p.max_people, p.attendees_count into v_max, v_count
    from public.parties p where p.id = v_party;
    if v_count >= v_max then raise exception 'PARTY_FULL'; end if;
  end if;

  update public.party_requests set status = v_new
  where id = p_request and status = 'pending';
  if not found then return 'already_handled'; end if;
  return v_new;
end; $$;
revoke all on function public.respond_request(uuid, boolean) from public, anon;
grant execute on function public.respond_request(uuid, boolean) to authenticated;

-- "Estoy acá": idempotente por usuario, suma attendees_count una sola vez.
create or replace function public.check_in(p_party uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_party public.parties%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select * into v_party from public.parties where id = p_party;
  if not found then raise exception 'NOT_FOUND'; end if;

  if v_party.host_id <> v_uid and not exists (
    select 1 from public.party_requests pr
    where pr.party_id = p_party and pr.user_id = v_uid and pr.status = 'approved'
  ) then
    raise exception 'NOT_APPROVED';
  end if;

  update public.party_requests pr
  set checked_in = true
  where pr.party_id = p_party and pr.user_id = v_uid and pr.checked_in = false;

  if found then
    update public.parties
    set attendees_count = least(attendees_count + 1, max_people)
    where id = p_party;
  end if;

  return (select attendees_count from public.parties where id = p_party);
end; $$;
revoke all on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;

-- Solicitudes pendientes de mis previas (badge del host)
create or replace function public.count_pending_for_me() returns int
language sql security definer stable set search_path = public as $$
  select count(*)::int from public.party_requests pr
  where pr.host_id = auth.uid() and pr.status = 'pending';
$$;
revoke all on function public.count_pending_for_me() from public, anon;
grant execute on function public.count_pending_for_me() to authenticated;

-- Solicitudes de una previa (solo el host): nombre y reputación para el anti-clavo
create or replace function public.get_party_requests(p_party uuid)
returns table (
  id uuid, user_id uuid, user_name text, reputation int,
  status text, checked_in boolean, created_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select pr.id, pr.user_id,
    coalesce((select u.raw_user_meta_data ->> 'full_name' from auth.users u where u.id = pr.user_id), 'Usuario'),
    coalesce((select us.reputation from public.users us where us.id = pr.user_id), 5),
    pr.status, pr.checked_in, pr.created_at
  from public.party_requests pr
  where pr.party_id = p_party
    and exists (select 1 from public.parties p where p.id = pr.party_id and p.host_id = auth.uid())
  order by pr.created_at asc;
$$;
revoke all on function public.get_party_requests(uuid) from public, anon;
grant execute on function public.get_party_requests(uuid) to authenticated;

-- Mis previas activas (panel del host)
create or replace function public.list_my_parties()
returns table (
  id uuid, title text, zone_text text, city text,
  attendees_count int, max_people int, start_at timestamptz, expires_at timestamptz,
  pending_count bigint
)
language sql security definer stable set search_path = public as $$
  select p.id, p.title, p.zone_text, p.city, p.attendees_count, p.max_people,
         p.start_at, p.expires_at,
         (select count(*) from public.party_requests pr
          where pr.party_id = p.id and pr.status = 'pending')
  from public.parties p
  where p.host_id = auth.uid() and p.status = 'active' and p.expires_at > now()
  order by p.start_at asc;
$$;
revoke all on function public.list_my_parties() from public, anon;
grant execute on function public.list_my_parties() to authenticated;

-- Reportar una previa (anti-denuncia / seguridad)
create or replace function public.report_party(p_party uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'BAD_REASON'; end if;
  insert into public.reports (party_id, user_id, reason)
  values (p_party, auth.uid(), trim(p_reason));
end; $$;
revoke all on function public.report_party(uuid, text) from public, anon;
grant execute on function public.report_party(uuid, text) to authenticated;

-- Borrado de previas expiradas (cron horario). Cascada limpia
-- solicitudes, mensajes y reportes: no queda rastro.
create or replace function public.delete_expired_parties() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with d as (
    delete from public.parties where expires_at <= now() returning 1
  )
  select count(*) into v_count from d;
  return v_count;
end; $$;
revoke all on function public.delete_expired_parties() from public, anon, authenticated;
grant execute on function public.delete_expired_parties() to service_role;
