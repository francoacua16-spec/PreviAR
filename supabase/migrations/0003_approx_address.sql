-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0003: dirección aproximada + notas de llegada
--
-- Antes de aprobar:  se ve una zona aproximada ("Campichuelo al 1300")
--                    y un punto corrido ~250m del real.
-- Después de aprobar: dirección exacta + la nota que escribió el host
--                    ("Casa en la esquina de Campichuelo y El Ciprés").
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Idempotente.
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. COLUMNAS ─────────────────────────

alter table public.parties
  -- Nota que escribe el host para que la encuentren. Se revela SOLO a aprobados.
  add column if not exists arrival_notes text,
  -- Versión pública/difusa de la dirección. Se puede mostrar a cualquiera.
  add column if not exists approx_area text,
  add column if not exists lat_approx double precision,
  add column if not exists lng_approx double precision;

-- ───────── 2. HELPERS: cómo se difumina una dirección ──────────

-- "Calle Campichuelo 1310" → "Campichuelo al 1300"
-- Si no hay altura reconocible, devuelve la calle sin número.
create or replace function public.blur_address(p_address text)
returns text
language plpgsql immutable set search_path = public as $$
declare
  v_clean text;
  v_parts text[];
  v_number int;
  v_street text;
begin
  if p_address is null or length(trim(p_address)) = 0 then
    return null;
  end if;

  -- Nos quedamos solo con el primer tramo (antes de la coma): calle + altura.
  v_clean := trim(split_part(p_address, ',', 1));
  -- Sacamos prefijos que no aportan ("Calle", "Av.", "Avenida").
  v_clean := regexp_replace(v_clean, '^(calle|av\.?|avenida)\s+', '', 'i');

  -- La altura es el número FINAL, no el primero: en La Plata la calle
  -- misma es un número ("7 1310"), y agarrar el primero filtraría la
  -- dirección exacta justo en la ciudad principal.
  v_parts := regexp_match(v_clean, '^(.*?)\s+(\d{1,5})\s*$');

  if v_parts is null then
    -- Sin altura al final (esquinas, "e/ 12 y 13"): ya es difuso de por sí.
    return v_clean;
  end if;

  v_street := trim(v_parts[1]);
  v_number := v_parts[2]::int;

  -- Si al sacar la altura quedó un conector colgando ("50 e/ 12 y"), lo cortamos.
  v_street := trim(regexp_replace(v_street, '\s+(y|e/|esq\.?|entre)\s*$', '', 'i'));

  -- Redondeamos hacia abajo a la centena: 1310 → 1300.
  if length(v_street) = 0 or v_number < 100 then
    return nullif(v_street, '');
  end if;

  return v_street || ' al ' || ((v_number / 100) * 100)::text;
end; $$;

-- Corre el punto ~150-350m en una dirección fija por previa.
-- Determinista a propósito: si cambiara en cada lectura, ver el punto
-- varias veces permitiría promediar y recuperar la ubicación real.
create or replace function public.blur_point(
  p_lat double precision, p_lng double precision, p_seed uuid
)
returns table (lat double precision, lng double precision)
language plpgsql immutable set search_path = public as $$
declare
  v_hash bigint;
  v_angle double precision;
  v_meters double precision;
begin
  if p_lat is null or p_lng is null then
    return query select null::double precision, null::double precision;
    return;
  end if;

  -- Hash estable del uuid → ángulo y distancia reproducibles.
  v_hash := abs(hashtext(p_seed::text));
  v_angle := (v_hash % 360) * pi() / 180.0;
  v_meters := 150 + ((v_hash / 360) % 200);

  return query select
    p_lat + (v_meters * cos(v_angle)) / 111320.0,
    p_lng + (v_meters * sin(v_angle)) / (111320.0 * cos(radians(p_lat)));
end; $$;

-- ───────── 3. BACKFILL de las previas que ya existen ───────────

update public.parties p
set approx_area = public.blur_address(p.address_hidden),
    lat_approx = b.lat,
    lng_approx = b.lng
from public.blur_point(p.lat_hidden, p.lng_hidden, p.id) b
where p.approx_area is null and p.lat_approx is null;

-- ───────── 4. create_party: acepta la nota de llegada ──────────

-- Firma vieja (11 args) queda huérfana: la borramos para no dejar dos.
drop function if exists public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean
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
  p_arrival_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_count int;
  v_limit int;
  v_blur record;
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

  v_limit := case when p_city = 'la_plata' then 50 else 40 end;
  if p_max_people > v_limit and p_legal_ok is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  -- El id se genera acá arriba para poder usarlo como semilla del difuminado.
  select * into v_blur from public.blur_point(p_lat, p_lng, v_id);

  insert into public.parties (
    id, host_id, title, description, city, zone_text,
    address_hidden, lat_hidden, lng_hidden, arrival_notes,
    approx_area, lat_approx, lng_approx,
    start_at, expires_at, max_people, type, legal_accepted
  ) values (
    v_id, v_uid, trim(p_title), p_description, p_city, trim(p_zone),
    p_address, p_lat, p_lng, nullif(trim(coalesce(p_arrival_notes, '')), ''),
    public.blur_address(p_address), v_blur.lat, v_blur.lng,
    p_start_at, p_start_at + interval '8 hours',
    p_max_people, p_type, coalesce(p_legal_ok, false)
  );

  return v_id;
end; $$;

revoke all on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text
) from public, anon;
grant execute on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text
) to authenticated;

-- ───────── 5. get_party: suma aproximados + nota de llegada ────

create or replace function public.get_party(p_id uuid)
returns table (
  id uuid, host_id uuid, host_name text, title text, description text,
  city text, zone_text text, type text, max_people int, attendees_count int,
  start_at timestamptz, expires_at timestamptz, status text,
  address_hidden text, lat_hidden double precision, lng_hidden double precision,
  arrival_notes text,
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
      -- Los aproximados los ve cualquiera: son la carnada para pedir entrar.
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
