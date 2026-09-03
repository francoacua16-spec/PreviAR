-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0007
--   · Géneros musicales de la previa (mínimo 1)
--   · Tipo de lugar (casa, depto, quinta, barco, yate, catamarán…)
--   · Dirección + pin obligatorios al crear
--   · Temas para el DJ: hasta 2 por persona, acordes al género
--   · Buscador de previas activas
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere 0001…0006. Idempotente.
-- ════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────── 1. COLUMNAS ──────────────────────────

alter table public.parties
  add column if not exists genres text[] not null default '{}'::text[];

alter table public.parties
  add column if not exists venue_type text;

do $$
begin
  alter table public.parties
    add constraint parties_venue_type_valid
    check (
      venue_type is null or venue_type in (
        'casa','depto','quinta','terraza','salon','camping',
        'barco','yate','catamaran','playa'
      )
    );
exception when duplicate_object then null;
end $$;

-- Máximo 4 géneros: más que eso es "cualquier cosa", y deja de servir
-- para que la gente elija previa por música.
do $$
begin
  alter table public.parties
    add constraint parties_genres_max
    check (array_length(genres, 1) is null or array_length(genres, 1) <= 4);
exception when duplicate_object then null;
end $$;

-- Ambas columnas son públicas (no revelan ubicación): entran al grant de
-- columnas seguras. La whitelist sensible (address_hidden, lat_hidden,
-- lng_hidden, arrival_notes, whatsapp_number) sigue intacta.
grant select (genres, venue_type) on public.parties to authenticated;

-- ──────────────────── 2. TEMAS PARA EL DJ ───────────────────────

create table if not exists public.party_song_requests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 120),
  artist text,
  -- Género del tema. Tiene que ser uno de los de la previa: lo valida el RPC.
  genre text not null,
  created_at timestamptz not null default now()
);

create index if not exists song_requests_party_idx
  on public.party_song_requests (party_id, created_at);
create index if not exists song_requests_user_idx
  on public.party_song_requests (party_id, user_id);

alter table public.party_song_requests enable row level security;
revoke all on public.party_song_requests from anon, authenticated;

-- Se lee por select directo (para que Realtime entregue los INSERT/DELETE),
-- pero solo si sos miembro de esa previa. Escribir es solo vía RPC.
grant select on public.party_song_requests to authenticated;

do $$
begin
  create policy song_requests_select on public.party_song_requests
    for select to authenticated
    using (public.is_party_member(party_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'party_song_requests'
  ) then
    alter publication supabase_realtime add table public.party_song_requests;
  end if;
end $$;

-- ───────────────────────── 3. create_party ──────────────────────
-- Cambios: géneros (mínimo 1), tipo de lugar, y dirección + pin
-- OBLIGATORIOS. Antes se podía crear una previa sin dirección y la
-- función caía al centroide de la zona: la gente terminaba yendo a
-- una esquina cualquiera del barrio.

drop function if exists public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean
);
drop function if exists public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text
);
drop function if exists public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text
);

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
  p_whatsapp_number text,
  p_genres text[],
  p_venue_type text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_count int;
  v_limit int;
  v_blur record;
  v_whatsapp text;
  v_genres text[];
  v_venue text;
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

  -- Dirección y pin: sin esto la previa no sirve para nada.
  if p_address is null or length(trim(p_address)) < 5 then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_lat is null or p_lng is null then raise exception 'PIN_REQUIRED'; end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then raise exception 'PIN_REQUIRED'; end if;

  -- Géneros: al menos uno, máximo cuatro, sin repetidos ni vacíos.
  select coalesce(array_agg(distinct g), '{}'::text[])
    into v_genres
  from unnest(coalesce(p_genres, '{}'::text[])) as g
  where g is not null and length(trim(g)) > 0;

  if array_length(v_genres, 1) is null then raise exception 'GENRES_REQUIRED'; end if;
  if array_length(v_genres, 1) > 4 then raise exception 'TOO_MANY_GENRES'; end if;

  v_venue := nullif(trim(coalesce(p_venue_type, '')), '');
  if v_venue is not null and v_venue not in (
    'casa','depto','quinta','terraza','salon','camping','barco','yate','catamaran','playa'
  ) then
    raise exception 'BAD_VENUE';
  end if;

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
    start_at, expires_at, max_people, type, legal_accepted,
    genres, venue_type
  ) values (
    v_id, v_uid, trim(p_title), p_description, p_city, trim(p_zone),
    trim(p_address), p_lat, p_lng, nullif(trim(coalesce(p_arrival_notes, '')), ''), v_whatsapp,
    public.blur_address(trim(p_address)), v_blur.lat, v_blur.lng,
    p_start_at, p_start_at + interval '8 hours',
    p_max_people, p_type, coalesce(p_legal_ok, false),
    v_genres, v_venue
  );

  return v_id;
end; $$;

revoke all on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text, text[], text
) from public, anon;
grant execute on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text, text[], text
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
  genres text[], venue_type text,
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
      coalesce(p.genres, '{}'::text[]), p.venue_type,
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

-- ─────────────────── 5. list_zone_parties + géneros ─────────────

drop function if exists public.list_zone_parties(text, text, double precision, double precision);

create or replace function public.list_zone_parties(
  p_city text, p_zone text, p_lat double precision, p_lng double precision
)
returns table (
  id uuid, title text, type text, max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz, distance_m int, my_status text,
  genres text[], venue_type text
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
    end as my_status,
    coalesce(p.genres, '{}'::text[]) as genres,
    p.venue_type
  from public.parties p
  where p.city = p_city and p.zone_text = p_zone
    and p.status = 'active' and p.expires_at > now()
  order by p.start_at asc;
$$;

revoke all on function public.list_zone_parties(text, text, double precision, double precision) from public, anon;
grant execute on function public.list_zone_parties(text, text, double precision, double precision) to authenticated;

-- ───────────────────────── 6. search_parties ────────────────────
-- Buscador del apartado "Buscar": texto libre + filtro por género y por
-- tipo de lugar, sobre previas activas de una ciudad. Nunca devuelve
-- coordenadas exactas: solo la zona aproximada, igual que el mapa.

create or replace function public.search_parties(
  p_city text,
  p_q text default null,
  p_genres text[] default null,
  p_venues text[] default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  id uuid, title text, city text, zone_text text, type text,
  max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz,
  genres text[], venue_type text, approx_area text,
  distance_m int, my_status text
)
language sql security definer stable set search_path = public as $$
  select p.id, p.title, p.city, p.zone_text, p.type,
    p.max_people, p.attendees_count, p.start_at, p.expires_at,
    coalesce(p.genres, '{}'::text[]), p.venue_type, p.approx_area,
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
  where p.status = 'active' and p.expires_at > now()
    and (p_city is null or p.city = p_city)
    and (
      p_q is null or length(trim(p_q)) = 0
      or p.title ilike '%' || trim(p_q) || '%'
      or coalesce(p.description, '') ilike '%' || trim(p_q) || '%'
      or p.zone_text ilike '%' || trim(p_q) || '%'
      or coalesce(p.approx_area, '') ilike '%' || trim(p_q) || '%'
    )
    and (p_genres is null or array_length(p_genres, 1) is null or p.genres && p_genres)
    and (p_venues is null or array_length(p_venues, 1) is null or p.venue_type = any(p_venues))
  order by p.start_at asc
  limit 100;
$$;

revoke all on function public.search_parties(text, text, text[], text[], double precision, double precision) from public, anon;
grant execute on function public.search_parties(text, text, text[], text[], double precision, double precision) to authenticated;

-- ──────────────────── 7. host_update_party + géneros ────────────

drop function if exists public.host_update_party(uuid, text, text, text, text, int);

create or replace function public.host_update_party(
  p_id uuid, p_title text, p_description text, p_arrival_notes text,
  p_whatsapp_number text, p_max_people int,
  p_genres text[] default null, p_venue_type text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_party public.parties%rowtype;
  v_limit int;
  v_whatsapp text;
  v_genres text[];
  v_venue text;
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

  -- null = no tocar los géneros. Array vacío sí es un error explícito.
  if p_genres is null then
    v_genres := v_party.genres;
  else
    select coalesce(array_agg(distinct g), '{}'::text[])
      into v_genres
    from unnest(p_genres) as g
    where g is not null and length(trim(g)) > 0;
    if array_length(v_genres, 1) is null then raise exception 'GENRES_REQUIRED'; end if;
    if array_length(v_genres, 1) > 4 then raise exception 'TOO_MANY_GENRES'; end if;
  end if;

  v_venue := nullif(trim(coalesce(p_venue_type, '')), '');
  if v_venue is null then
    v_venue := v_party.venue_type;
  elsif v_venue not in (
    'casa','depto','quinta','terraza','salon','camping','barco','yate','catamaran','playa'
  ) then
    raise exception 'BAD_VENUE';
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
    max_people = p_max_people,
    genres = v_genres,
    venue_type = v_venue
  where id = p_id;

  -- Si el host saca un género, los temas pedidos con ese género quedan
  -- fuera de la fiesta: se borran para que la lista del DJ siga siendo
  -- "acorde al género", que es la única regla que tiene.
  delete from public.party_song_requests
  where party_id = p_id and genre <> all(v_genres);
end; $$;

revoke all on function public.host_update_party(uuid, text, text, text, text, int, text[], text) from public, anon;
grant execute on function public.host_update_party(uuid, text, text, text, text, int, text[], text) to authenticated;

-- ──────────────── 8. Temas para el DJ: RPCs ─────────────────────
-- Reglas: solo miembros (host o aprobado), máximo 2 por persona por
-- previa, y el género del tema tiene que ser uno de los de la previa.

create or replace function public.add_song_request(
  p_party uuid, p_title text, p_artist text, p_genre text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_party public.parties%rowtype;
  v_count int;
  v_id uuid;
  v_title text;
  v_genre text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select * into v_party from public.parties where id = p_party;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_party.status <> 'active' or v_party.expires_at <= now() then
    raise exception 'PARTY_NOT_ACTIVE';
  end if;

  if not public.is_party_member(p_party) then raise exception 'NOT_APPROVED'; end if;

  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null or char_length(v_title) < 2 or char_length(v_title) > 120 then
    raise exception 'BAD_SONG';
  end if;

  v_genre := nullif(trim(coalesce(p_genre, '')), '');
  if v_genre is null or v_genre <> all(coalesce(v_party.genres, '{}'::text[])) then
    raise exception 'BAD_SONG_GENRE';
  end if;

  select count(*)::int into v_count from public.party_song_requests
  where party_id = p_party and user_id = v_uid;
  if v_count >= 2 then raise exception 'SONG_LIMIT'; end if;

  insert into public.party_song_requests (party_id, user_id, title, artist, genre)
  values (p_party, v_uid, v_title, nullif(trim(coalesce(p_artist, '')), ''), v_genre)
  returning id into v_id;

  return v_id;
end; $$;

create or replace function public.delete_song_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.party_song_requests%rowtype;
  v_host uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;
  select * into v_row from public.party_song_requests where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select host_id into v_host from public.parties where id = v_row.party_id;
  if v_row.user_id <> v_uid and v_host <> v_uid then raise exception 'NOT_HOST'; end if;

  delete from public.party_song_requests where id = p_id;
end; $$;

create or replace function public.list_song_requests(p_party uuid)
returns table (
  id uuid, user_id uuid, user_name text, title text, artist text,
  genre text, created_at timestamptz, is_mine boolean
)
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  if not public.is_party_member(p_party) then raise exception 'NOT_APPROVED'; end if;

  return query
    select s.id, s.user_id,
      coalesce(
        (select au.raw_user_meta_data ->> 'full_name' from auth.users au where au.id = s.user_id),
        'Alguien'
      ),
      s.title, s.artist, s.genre, s.created_at,
      (s.user_id = auth.uid())
    from public.party_song_requests s
    where s.party_id = p_party
    order by s.created_at asc;
end; $$;

revoke all on function public.add_song_request(uuid, text, text, text) from public, anon;
revoke all on function public.delete_song_request(uuid) from public, anon;
revoke all on function public.list_song_requests(uuid) from public, anon;
grant execute on function public.add_song_request(uuid, text, text, text) to authenticated;
grant execute on function public.delete_song_request(uuid) to authenticated;
grant execute on function public.list_song_requests(uuid) to authenticated;

-- ───────────────── 9. admin_list_parties + géneros ──────────────

drop function if exists public.admin_list_parties(text);

create or replace function public.admin_list_parties(p_filter text default 'all')
returns table (
  id uuid, host_id uuid, host_name text, host_email text, title text, description text,
  city text, zone_text text, type text, address_hidden text, arrival_notes text,
  whatsapp_number text, lat_hidden double precision, lng_hidden double precision,
  max_people int, attendees_count int, pending_count int, report_count int,
  start_at timestamptz, expires_at timestamptz, created_at timestamptz,
  status text, is_live boolean, genres text[], venue_type text, song_count int
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
      (p.status = 'active' and p.expires_at > now()),
      coalesce(p.genres, '{}'::text[]), p.venue_type,
      (select count(*)::int from public.party_song_requests s where s.party_id = p.id)
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

-- ─────────── 10. Panel admin: temas pedidos de una previa ────────

create or replace function public.admin_party_songs(p_party uuid)
returns table (
  id uuid, user_id uuid, user_name text, user_email text,
  title text, artist text, genre text, created_at timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select s.id, s.user_id,
      coalesce(u.display_name, au.raw_user_meta_data ->> 'full_name', 'Alguien'),
      au.email::text, s.title, s.artist, s.genre, s.created_at
    from public.party_song_requests s
    left join public.users u on u.id = s.user_id
    left join auth.users au on au.id = s.user_id
    where s.party_id = p_party
    order by s.created_at asc;
end; $$;

revoke all on function public.admin_party_songs(uuid) from public, anon;
grant execute on function public.admin_party_songs(uuid) to authenticated;

commit;
