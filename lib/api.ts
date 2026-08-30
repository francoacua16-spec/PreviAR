import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  City,
} from './zones'
import type {
  CityZoneRow,
  CreatePartyInput,
  MyPartyRow,
  PartyRequestRow,
  PartyRow,
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
  if (msg.includes('BAD_TITLE')) return 'El título necesita al menos 3 caracteres.'
  if (msg.includes('BAD_DATE')) return 'Elegí una fecha de inicio a futuro.'
  if (msg.includes('BAD_CAPACITY')) return 'Capacidad inválida (1 a 500 personas).'
  if (msg.includes('BAD_REASON')) return 'Contanos un poco más el motivo.'
  return msg || 'Algo salió mal. Probá de nuevo.'
}

export async function listCityZones(supabase: SupabaseClient, city: City): Promise<CityZoneRow[]> {
  const { data, error } = await supabase.rpc('list_city_zones', { p_city: city })
  if (error) throw error
  return (data as CityZoneRow[] | null) ?? []
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
  const { data, error } = await supabase.rpc('create_party', {
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
  })
  if (error) throw error
  return data as string
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
