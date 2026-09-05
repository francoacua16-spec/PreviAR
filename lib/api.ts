import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  City,
} from './zones'
import type {
  AdminFilter,
  AdminMessageRow,
  AdminPartyRow,
  AdminPersonRow,
  AdminReportRow,
  AdminStats,
  AdminUserRow,
  CheckinTimeRow,
  BboxZoneRow,
  CreatePartyInput,
  FeedbackRow,
  MyPartyRow,
  PartyRequestRow,
  PartyRow,
  AdminSongRow,
  SearchPartyRow,
  ShopRow,
  SongRequestRow,
  ZonePartyRow,
} from './types'

/** Traduce los errores SQL (raise exception) a mensajes humanos en español. */
export function friendlyError(error: unknown): string {
  const msg =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '')
  if (msg.includes('SPAM_LIMIT')) return 'Alcanzaste el límite de 3 previas por día. Probá mañana 🔒'
  if (msg.includes('LEGAL_REQUIRED')) return 'Tenés que aceptar la declaración de responsabilidad.'
  if (msg.includes('PARTY_FULL')) return 'La previa ya está llena.'
  if (msg.includes('PARTY_NOT_ACTIVE')) return 'Esa previa ya expiró.'
  if (msg.includes('NOT_APPROVED')) return 'Necesitás la aprobación del anfitrión.'
  if (msg.includes('NOT_HOST')) return 'Solo el anfitrión puede hacer eso.'
  if (msg.includes('NOT_AUTH')) return 'Iniciá sesión para continuar.'
  if (msg.includes('NOT_ADMIN')) return 'No tenés permiso para eso.'
  if (msg.includes('BAD_TITLE')) return 'El título necesita al menos 3 caracteres.'
  if (msg.includes('BAD_DATE')) return 'Elegí una fecha de inicio a futuro.'
  if (msg.includes('BAD_CAPACITY')) return 'Capacidad inválida (1 a 500 personas).'
  if (msg.includes('BAD_REASON')) return 'Contanos un poco más el motivo.'
  if (msg.includes('BAD_WHATSAPP')) return 'Número de WhatsApp inválido (solo dígitos, 8 a 15).'
  if (msg.includes('CAPACITY_BELOW_ATTENDEES')) return 'No podés bajar el máximo por debajo de quienes ya confirmaron.'
  if (msg.includes('HOST_CANNOT_LEAVE')) return 'Sos el anfitrión: cancelá la previa en vez de abandonarla.'
  if (msg.includes('NOT_PARTICIPANT')) return 'No participaste de esta previa.'
  if (msg.includes('NOT_FOUND')) return 'Esa previa no existe.'
  if (msg.includes('BAD_RATING')) return 'Elegí un puntaje de 1 a 5.'
  if (msg.includes('ADDRESS_REQUIRED')) return 'Falta la dirección de la previa.'
  if (msg.includes('PIN_REQUIRED')) return 'Falta marcar el punto exacto en el mapa.'
  if (msg.includes('GENRES_REQUIRED')) return 'Elegí al menos un género musical.'
  if (msg.includes('TOO_MANY_GENRES')) return 'Máximo 4 géneros por previa.'
  if (msg.includes('BAD_VENUE')) return 'Ese tipo de lugar no existe.'
  if (msg.includes('BAD_SONG_GENRE')) return 'Ese tema no va con los géneros de la previa.'
  if (msg.includes('BAD_SONG')) return 'Escribí el nombre del tema (2 a 120 caracteres).'
  if (msg.includes('SONG_LIMIT')) return 'Ya pediste 2 temas. Borrá uno para pedir otro.'
  if (msg.includes('BAD_CITY')) return 'Ciudad inválida.'
  if (msg.includes('BAD_ZONE')) return 'Elegí una zona.'
  if (msg.includes('BAD_TYPE')) return 'Tipo de previa inválido.'
  return msg || 'Algo salió mal. Probá de nuevo.'
}

/**
 * Zonas con previas dentro del recuadro visible del mapa. Reemplaza al
 * `list_city_zones` + array de JS cuando el usuario panea libremente: el
 * recuadro puede caer entre dos ciudades, o en ninguna.
 */
export async function zonesInBbox(
  supabase: SupabaseClient,
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }
): Promise<BboxZoneRow[]> {
  const { data, error } = await supabase.rpc('zones_in_bbox', {
    p_min_lat: bbox.minLat,
    p_min_lng: bbox.minLng,
    p_max_lat: bbox.maxLat,
    p_max_lng: bbox.maxLng,
  })
  if (error) throw error
  return (data as BboxZoneRow[] | null) ?? []
}

/**
 * Locales para comprar dentro del recuadro visible. Se sirve de la tabla
 * `shops` y no de OpenStreetMap en vivo: la Overpass API se cae seguido y no
 * puede estar en el camino crítico del mapa de nadie.
 */
export async function shopsInBbox(
  supabase: SupabaseClient,
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }
): Promise<ShopRow[]> {
  const { data, error } = await supabase.rpc('shops_in_bbox', {
    p_min_lat: bbox.minLat,
    p_min_lng: bbox.minLng,
    p_max_lat: bbox.maxLat,
    p_max_lng: bbox.maxLng,
  })
  if (error) throw error
  return (data as ShopRow[] | null) ?? []
}

export async function listZoneParties(
  supabase: SupabaseClient,
  city: City,
  zone: string,
  pos: { lat: number; lng: number } | null
): Promise<ZonePartyRow[]> {
  const { data, error } = await supabase.rpc('list_zone_parties', {
    p_city: city,
    p_zone: zone,
    p_lat: pos?.lat ?? null,
    p_lng: pos?.lng ?? null,
  })
  if (error) throw error
  return (data as ZonePartyRow[] | null) ?? []
}

export async function getParty(supabase: SupabaseClient, id: string): Promise<PartyRow | null> {
  const { data, error } = await supabase.rpc('get_party', { p_id: id })
  if (error) throw error
  return ((data as PartyRow[] | null) ?? [])[0] ?? null
}

export async function requestToJoin(
  supabase: SupabaseClient,
  partyId: string
): Promise<'host' | 'pending' | 'approved' | 'rejected'> {
  const { data, error } = await supabase.rpc('request_to_join', { p_party: partyId })
  if (error) throw error
  return data as 'host' | 'pending' | 'approved' | 'rejected'
}

export async function respondRequest(
  supabase: SupabaseClient,
  requestId: string,
  approve: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('respond_request', {
    p_request: requestId,
    p_approve: approve,
  })
  if (error) throw error
  return data as string
}

export async function checkIn(supabase: SupabaseClient, partyId: string): Promise<number> {
  const { data, error } = await supabase.rpc('check_in', { p_party: partyId })
  if (error) throw error
  return data as number
}

export async function createParty(
  supabase: SupabaseClient,
  input: CreatePartyInput
): Promise<string> {
  const base = {
    p_title: input.title,
    p_description: input.description,
    p_city: input.city,
    p_zone: input.zone,
    p_address: input.address,
    p_lat: input.lat,
    p_lng: input.lng,
    p_start_at: input.startAt,
    p_max_people: input.maxPeople,
    p_type: input.type,
    p_legal_ok: input.legalOk,
  }

  const { data, error } = await supabase.rpc('create_party', {
    ...base,
    p_arrival_notes: input.arrivalNotes,
    p_whatsapp_number: input.whatsappNumber,
    p_genres: input.genres,
    p_venue_type: input.venueType,
  })

  // PGRST202 = no existe una función con esa firma. Pasa cuando el código ya
  // está deployado pero la migración todavía no corrió en la base. Bajamos un
  // escalón por vez: se pierden campos nuevos, no la previa.
  if (error) {
    if (error.code !== 'PGRST202') throw error

    const retry06 = await supabase.rpc('create_party', {
      ...base,
      p_arrival_notes: input.arrivalNotes,
      p_whatsapp_number: input.whatsappNumber,
    })
    if (!retry06.error) return retry06.data as string
    if (retry06.error.code !== 'PGRST202') throw retry06.error

    const retry03 = await supabase.rpc('create_party', { ...base, p_arrival_notes: input.arrivalNotes })
    if (retry03.error) throw retry03.error
    return retry03.data as string
  }

  return data as string
}

/** Buscador: texto libre + filtro por género y tipo de lugar sobre previas activas. */
export async function searchParties(
  supabase: SupabaseClient,
  params: {
    city: City | null
    q: string
    genres: string[]
    venues: string[]
    pos: { lat: number; lng: number } | null
  }
): Promise<SearchPartyRow[]> {
  const { data, error } = await supabase.rpc('search_parties', {
    p_city: params.city,
    p_q: params.q.trim() ? params.q.trim() : null,
    p_genres: params.genres.length ? params.genres : null,
    p_venues: params.venues.length ? params.venues : null,
    p_lat: params.pos?.lat ?? null,
    p_lng: params.pos?.lng ?? null,
  })
  if (error) throw error
  return (data as SearchPartyRow[] | null) ?? []
}

// ───────────────────── TEMAS PARA EL DJ ─────────────────────

export async function listSongRequests(
  supabase: SupabaseClient,
  partyId: string
): Promise<SongRequestRow[]> {
  const { data, error } = await supabase.rpc('list_song_requests', { p_party: partyId })
  if (error) throw error
  return (data as SongRequestRow[] | null) ?? []
}

export async function addSongRequest(
  supabase: SupabaseClient,
  partyId: string,
  song: { title: string; artist: string | null; genre: string }
): Promise<string> {
  const { data, error } = await supabase.rpc('add_song_request', {
    p_party: partyId,
    p_title: song.title,
    p_artist: song.artist,
    p_genre: song.genre,
  })
  if (error) throw error
  return data as string
}

export async function deleteSongRequest(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_song_request', { p_id: id })
  if (error) throw error
}

export async function adminPartySongs(
  supabase: SupabaseClient,
  partyId: string
): Promise<AdminSongRow[]> {
  const { data, error } = await supabase.rpc('admin_party_songs', { p_party: partyId })
  if (error) throw error
  return (data as AdminSongRow[] | null) ?? []
}

export async function partyCheckinTimes(supabase: SupabaseClient, partyId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('party_checkin_times', { p_party: partyId })
  if (error) throw error
  return ((data as CheckinTimeRow[] | null) ?? []).map((r) => r.checked_in_at)
}

export async function hostUpdateParty(
  supabase: SupabaseClient,
  partyId: string,
  fields: {
    title: string
    description: string | null
    arrivalNotes: string | null
    whatsappNumber: string | null
    maxPeople: number
    genres?: string[]
    venueType?: string | null
  }
): Promise<void> {
  const base = {
    p_id: partyId,
    p_title: fields.title,
    p_description: fields.description,
    p_arrival_notes: fields.arrivalNotes,
    p_whatsapp_number: fields.whatsappNumber,
    p_max_people: fields.maxPeople,
  }

  const { error } = await supabase.rpc('host_update_party', {
    ...base,
    p_genres: fields.genres ?? null,
    p_venue_type: fields.venueType ?? null,
  })

  if (error) {
    if (error.code !== 'PGRST202') throw error
    const retry = await supabase.rpc('host_update_party', base)
    if (retry.error) throw retry.error
  }
}

export async function hostCancelParty(supabase: SupabaseClient, partyId: string): Promise<void> {
  const { error } = await supabase.rpc('host_cancel_party', { p_id: partyId })
  if (error) throw error
}

export async function hostMarkFull(supabase: SupabaseClient, partyId: string): Promise<void> {
  const { error } = await supabase.rpc('host_mark_full', { p_id: partyId })
  if (error) throw error
}

export async function submitPartyFeedback(
  supabase: SupabaseClient,
  partyId: string,
  rating: number,
  comment: string | null
): Promise<void> {
  const { error } = await supabase.rpc('submit_party_feedback', {
    p_party: partyId,
    p_rating: rating,
    p_comment: comment,
  })
  if (error) throw error
}

export async function leaveParty(supabase: SupabaseClient, partyId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_party', { p_party: partyId })
  if (error) throw error
}

export async function adminListFeedback(supabase: SupabaseClient): Promise<FeedbackRow[]> {
  const { data, error } = await supabase.rpc('admin_list_feedback')
  if (error) throw error
  return (data as FeedbackRow[] | null) ?? []
}

export async function countPendingForMe(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_for_me')
  if (error) throw error
  return (data as number) ?? 0
}

export async function getPartyRequests(
  supabase: SupabaseClient,
  partyId: string
): Promise<PartyRequestRow[]> {
  const { data, error } = await supabase.rpc('get_party_requests', { p_party: partyId })
  if (error) throw error
  return (data as PartyRequestRow[] | null) ?? []
}

export async function listMyParties(supabase: SupabaseClient): Promise<MyPartyRow[]> {
  const { data, error } = await supabase.rpc('list_my_parties')
  if (error) throw error
  return (data as MyPartyRow[] | null) ?? []
}

export async function reportParty(
  supabase: SupabaseClient,
  partyId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('report_party', { p_party: partyId, p_reason: reason })
  if (error) throw error
}

export async function setUserCity(supabase: SupabaseClient, userId: string, city: City) {
  const { error } = await supabase
    .from('users')
    .update({ city })
    .eq('id', userId)
  if (error) {
    // No bloqueamos la UX si falla la persistencia del perfil
    console.error('setUserCity failed', error.message)
  }
}

/** Sube la foto de perfil al bucket público `avatars` (carpeta `<uid>/`) y devuelve la URL pública. */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
}

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  // La extensión sale del MIME, no del nombre: una foto sacada con la cámara
  // llega como `image` o `blob`, sin punto, y `split('.').pop()` devolvía el
  // nombre entero (path `avatar.image`, que después nadie sabe servir).
  const ext = MIME_EXT[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
    })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-busting: mismo path pero foto nueva, si no el <img> vieja queda cacheada.
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: { display_name?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await supabase.from('users').update(fields).eq('id', userId)
  if (error) throw error
}

// ─────────────────────────── ADMIN ───────────────────────────
// Todo esto vive detrás de is_admin() en la base: si no sos admin, las
// funciones tiran NOT_ADMIN. El front solo esconde botones, no protege nada.

/** true si el usuario actual es admin. Devuelve false si la 0004 todavía no corrió. */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  // PGRST202 = la función no existe todavía (migración 0004 sin correr).
  if (error) {
    if (error.code !== 'PGRST202') console.error('is_admin failed', error.message)
    return false
  }
  return data === true
}

export async function adminListParties(
  supabase: SupabaseClient,
  filter: AdminFilter = 'all'
): Promise<AdminPartyRow[]> {
  const { data, error } = await supabase.rpc('admin_list_parties', { p_filter: filter })
  if (error) throw error
  return (data as AdminPartyRow[] | null) ?? []
}

export async function adminStats(supabase: SupabaseClient): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw error
  return ((data as AdminStats[] | null) ?? [])[0] ?? null
}

/** Da de baja: sale del mapa al instante, pero la previa queda registrada. */
export async function adminDeleteParty(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_party', { p_id: id })
  if (error) throw error
}

export async function adminRestoreParty(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_restore_party', { p_id: id })
  if (error) throw error
}

/** Borrado definitivo: se lleva solicitudes, chat y reportes. No hay undo. */
export async function adminPurgeParty(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_purge_party', { p_id: id })
  if (error) throw error
}

/** Previas creadas desde la última vez que el admin abrió el panel. */
export async function adminUnseenCount(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('admin_unseen_count')
  if (error) return 0
  return (data as number) ?? 0
}

export async function adminMarkSeen(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_seen')
  if (error) console.error('admin_mark_seen failed', error.message)
}

/**
 * Chat privado de una previa. Es solo lectura: no existe forma de escribir
 * desde el panel, así que la gente nunca se entera de que lo miraste.
 */
export async function adminReadChat(
  supabase: SupabaseClient,
  partyId: string
): Promise<AdminMessageRow[]> {
  const { data, error } = await supabase.rpc('admin_read_chat', { p_party: partyId })
  if (error) throw error
  return (data as AdminMessageRow[] | null) ?? []
}

export async function adminDeleteMessage(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_message', { p_id: id })
  if (error) throw error
}

export async function adminPartyPeople(
  supabase: SupabaseClient,
  partyId: string
): Promise<AdminPersonRow[]> {
  const { data, error } = await supabase.rpc('admin_party_people', { p_party: partyId })
  if (error) throw error
  return (data as AdminPersonRow[] | null) ?? []
}

export async function adminListUsers(
  supabase: SupabaseClient,
  q?: string
): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users', { p_q: q ?? null })
  if (error) throw error
  return (data as AdminUserRow[] | null) ?? []
}

export async function adminListReports(supabase: SupabaseClient): Promise<AdminReportRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reports')
  if (error) throw error
  return (data as AdminReportRow[] | null) ?? []
}

export async function adminSetVerified(
  supabase: SupabaseClient,
  userId: string,
  value: boolean
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_verified', { p_user: userId, p_value: value })
  if (error) throw error
}

/** Da de baja todas sus previas activas y rechaza sus pendientes. Devuelve cuántas cayeron. */
export async function adminBanUser(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_ban_user', { p_user: userId })
  if (error) throw error
  return (data as number) ?? 0
}

/** Arranca una sesión de verificación de identidad (Didit) y devuelve la URL a la que redirigir. */
export async function startVerification(): Promise<string> {
  const res = await fetch('/api/didit/session', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'No se pudo iniciar la verificación.')
  return json.url as string
}
