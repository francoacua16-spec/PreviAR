-- ─────────────────────────────────────────────────────────────────
-- 0008 — El host recupera su propio WhatsApp en get_party
--
-- Bug de pérdida de datos, silencioso, en producción:
--
--   1. get_party (0007) devolvía whatsapp_number en NULL cuando el que mira
--      es el host. La intención era buena: no tiene sentido mostrarle a
--      alguien un botón para escribirse a sí mismo por WhatsApp.
--   2. EditPartyDialog siembra su campo con `party.whatsapp_number ?? ''`,
--      así que para el host el input arrancaba vacío.
--   3. Al guardar, el diálogo manda `null` (campo vacío → null).
--   4. host_update_party escribe `whatsapp_number = v_whatsapp` sin condición.
--
--   Resultado: cada vez que un host editaba su previa, el WhatsApp de
--   contacto se borraba. Los invitados aprobados perdían la única vía de
--   contacto directo con el anfitrión.
--
-- El arreglo va acá y no en el cliente porque el dato es del propio host:
-- ocultárselo no protegía nada (ya es suyo) y rompía el round-trip de la
-- edición. Quién ve el botón de WhatsApp lo sigue decidiendo la UI, que ya
-- lo esconde para el host — eso no cambia.
-- ─────────────────────────────────────────────────────────────────

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
      -- El host ve su propio número (lo necesita para editarlo sin borrarlo);
      -- los aprobados lo ven para contactarlo. El resto, nada.
      case when v_is_host or v_approved then p.whatsapp_number end,
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
