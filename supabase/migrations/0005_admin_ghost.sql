-- ════════════════════════════════════════════════════════════════
-- PREVIAR · Migración 0005: acceso total + modo fantasma
--
-- Franco ve TODO: chats privados, solicitudes, usuarios, reportes.
-- Y no deja rastro: no hay ninguna función que escriba algo que la
-- gente pueda ver como venido del admin. Sin "visto por", sin
-- mensajes de admin, sin aparecer en listas de asistentes.
--
-- A propósito NO existe admin_send_message: en el momento en que el
-- admin escribe en un chat, deja de ser fantasma.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere 0004. Idempotente.
-- ════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────── 1. EL ADMIN REAL ─────────────────────
-- Mail confirmado por Franco. Los dos por si migra de cuenta.
insert into public.app_admins (user_id)
select u.id
from public.users u
join auth.users au on au.id = u.id
where lower(au.email) in ('franco.acua16@gmail.com', 'fran.acua@hotmail.com')
on conflict (user_id) do nothing;

-- Cualquier otro admin que haya entrado por el fallback "usuario más viejo"
-- de la 0004 se va: el panel es de una sola persona. Pero solo si el mail
-- real ya quedó adentro; si no, nos quedaríamos sin ningún admin.
delete from public.app_admins a
where not exists (
  select 1 from auth.users au
  where au.id = a.user_id
    and lower(au.email) in ('franco.acua16@gmail.com', 'fran.acua@hotmail.com')
)
and exists (
  select 1 from public.app_admins b
  join auth.users au2 on au2.id = b.user_id
  where lower(au2.email) in ('franco.acua16@gmail.com', 'fran.acua@hotmail.com')
);

-- ───────────────────────── 2. LECTURA TOTAL ─────────────────────
-- Las policies se suman con OR: nadie pierde acceso, el admin gana uno.

drop policy if exists messages_select_admin on public.party_messages;
create policy messages_select_admin on public.party_messages for select to authenticated
  using (public.is_admin());

drop policy if exists requests_select_admin on public.party_requests;
create policy requests_select_admin on public.party_requests for select to authenticated
  using (public.is_admin());

-- ───────────────────────── 3. CHAT PRIVADO ──────────────────────

drop function if exists public.admin_read_chat(uuid);

create or replace function public.admin_read_chat(p_party uuid)
returns table (
  id uuid, user_id uuid, sender_name text, sender_email text,
  content text, created_at timestamptz, is_host boolean
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select m.id, m.user_id,
      coalesce(m.sender_name, 'Alguien'),
      (select au.email::text from auth.users au where au.id = m.user_id),
      m.content, m.created_at,
      (m.user_id = (select p.host_id from public.parties p where p.id = m.party_id))
    from public.party_messages m
    where m.party_id = p_party
    order by m.created_at asc
    limit 1000;
end; $$;

revoke all on function public.admin_read_chat(uuid) from public, anon;
grant execute on function public.admin_read_chat(uuid) to authenticated;

-- Un mensaje puntual se puede borrar (denuncia, doxxing, lo que sea).
create or replace function public.admin_delete_message(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  delete from public.party_messages where id = p_id;
end; $$;

revoke all on function public.admin_delete_message(uuid) from public, anon;
grant execute on function public.admin_delete_message(uuid) to authenticated;

-- ───────────────────────── 4. QUIÉN VA A CADA PREVIA ────────────

drop function if exists public.admin_party_people(uuid);

create or replace function public.admin_party_people(p_party uuid)
returns table (
  request_id uuid, user_id uuid, display_name text, email text,
  verified boolean, reputation int, status text, checked_in boolean,
  created_at timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select r.id, r.user_id,
      coalesce(u.display_name, au.raw_user_meta_data ->> 'full_name', 'Sin nombre'),
      au.email::text, u.verified, u.reputation,
      r.status, r.checked_in, r.created_at
    from public.party_requests r
    join public.users u on u.id = r.user_id
    left join auth.users au on au.id = r.user_id
    where r.party_id = p_party
    order by r.created_at asc;
end; $$;

revoke all on function public.admin_party_people(uuid) from public, anon;
grant execute on function public.admin_party_people(uuid) to authenticated;

-- ───────────────────────── 5. USUARIOS ──────────────────────────

drop function if exists public.admin_list_users(text);

create or replace function public.admin_list_users(p_q text default null)
returns table (
  id uuid, display_name text, email text, avatar_url text,
  city text, verified boolean, reputation int,
  parties_hosted int, parties_joined int, reports_made int,
  is_admin boolean, created_at timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select u.id,
      coalesce(u.display_name, au.raw_user_meta_data ->> 'full_name', 'Sin nombre'),
      au.email::text, u.avatar_url, u.city, u.verified, u.reputation,
      (select count(*)::int from public.parties p where p.host_id = u.id),
      (select count(*)::int from public.party_requests r
        where r.user_id = u.id and r.status = 'approved'),
      (select count(*)::int from public.reports rp where rp.user_id = u.id),
      exists (select 1 from public.app_admins a where a.user_id = u.id),
      u.created_at
    from public.users u
    left join auth.users au on au.id = u.id
    where p_q is null or p_q = ''
       or u.display_name ilike '%' || p_q || '%'
       or au.email::text ilike '%' || p_q || '%'
    order by u.created_at desc
    limit 500;
end; $$;

revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

-- Verificación a mano: para arreglar un Didit que falló, o sacarle el
-- tilde a alguien que lo consiguió de trucho.
create or replace function public.admin_set_verified(p_user uuid, p_value boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  update public.users set verified = p_value where id = p_user;
end; $$;

-- Bajón total de un usuario: se le caen todas las previas activas y sus
-- solicitudes pendientes. No borra la cuenta (eso se hace desde Auth).
create or replace function public.admin_ban_user(p_user uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if exists (select 1 from public.app_admins a where a.user_id = p_user) then
    raise exception 'NOT_ADMIN';  -- no te podés banear a vos mismo
  end if;

  update public.parties set status = 'cancelled'
  where host_id = p_user and status = 'active';
  get diagnostics v_count = row_count;

  update public.party_requests set status = 'rejected'
  where user_id = p_user and status = 'pending';

  update public.users set reputation = 0 where id = p_user;

  return v_count;
end; $$;

revoke all on function public.admin_set_verified(uuid, boolean) from public, anon;
revoke all on function public.admin_ban_user(uuid) from public, anon;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_ban_user(uuid) to authenticated;

-- ───────────────────────── 6. REPORTES ──────────────────────────

drop function if exists public.admin_list_reports();

create or replace function public.admin_list_reports()
returns table (
  id uuid, party_id uuid, party_title text,
  reporter_name text, reporter_email text,
  reason text, created_at timestamptz, party_status text
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  return query
    select r.id, r.party_id, p.title,
      coalesce(u.display_name, au.raw_user_meta_data ->> 'full_name', 'Anónimo'),
      au.email::text, r.reason, r.created_at, p.status
    from public.reports r
    join public.parties p on p.id = r.party_id
    left join public.users u on u.id = r.user_id
    left join auth.users au on au.id = r.user_id
    order by r.created_at desc
    limit 500;
end; $$;

revoke all on function public.admin_list_reports() from public, anon;
grant execute on function public.admin_list_reports() to authenticated;

commit;
