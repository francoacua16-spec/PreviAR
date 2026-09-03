export type PartyType = 'private' | 'open'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type MyStatus = 'host' | RequestStatus | 'none' | null

/** Row de list_city_zones */
export interface CityZoneRow {
  zone_text: string
  party_count: number
}

/** Row de list_zone_parties */
export interface ZonePartyRow {
  id: string
  title: string
  type: PartyType
  max_people: number
  attendees_count: number
  start_at: string
  expires_at: string
  distance_m: number | null
  my_status: MyStatus
  genres: string[]
  venue_type: string | null
}

/** Row de search_parties */
export interface SearchPartyRow {
  id: string
  title: string
  city: 'la_plata' | 'caba' | 'bariloche'
  zone_text: string
  type: PartyType
  max_people: number
  attendees_count: number
  start_at: string
  expires_at: string
  genres: string[]
  venue_type: string | null
  approx_area: string | null
  distance_m: number | null
  my_status: MyStatus
}

/** Row de list_song_requests */
export interface SongRequestRow {
  id: string
  user_id: string
  user_name: string
  title: string
  artist: string | null
  genre: string
  created_at: string
  is_mine: boolean
}

/** Row de get_party */
export interface PartyRow {
  id: string
  host_id: string
  host_name: string
  title: string
  description: string | null
  city: 'la_plata' | 'caba' | 'bariloche'
  zone_text: string
  type: PartyType
  max_people: number
  attendees_count: number
  start_at: string
  expires_at: string
  status: string
  address_hidden: string | null
  lat_hidden: number | null
  lng_hidden: number | null
  /** Cómo llegar, escrito por el host. Solo host/aprobados. */
  arrival_notes: string | null
  /** WhatsApp del host. Solo visible para aprobados (no el propio host). */
  whatsapp_number: string | null
  /** Zona aproximada ("Campichuelo al 1300"). Visible para todos. */
  approx_area: string | null
  lat_approx: number | null
  lng_approx: number | null
  /** Géneros de la previa. Manda qué temas se le pueden pedir al DJ. */
  genres: string[]
  /** Dónde es: casa, quinta, barco, yate… Null en previas viejas. */
  venue_type: string | null
  my_status: MyStatus
  checked_in: boolean
}

/** Row de party_checkin_times */
export interface CheckinTimeRow {
  checked_in_at: string
}

/** Row de admin_list_feedback */
export interface FeedbackRow {
  id: string
  party_id: string
  party_title: string
  role: 'host' | 'guest'
  rating: number
  comment: string | null
  created_at: string
}

/** Row de get_party_requests */
export interface PartyRequestRow {
  id: string
  user_id: string
  user_name: string
  reputation: number
  status: RequestStatus
  checked_in: boolean
  created_at: string
}

/** Row de list_my_parties */
export interface MyPartyRow {
  id: string
  title: string
  zone_text: string
  city: 'la_plata' | 'caba' | 'bariloche'
  attendees_count: number
  max_people: number
  start_at: string
  expires_at: string
  pending_count: number
}

export interface ChatMessage {
  id: string
  party_id: string
  user_id: string
  sender_name: string | null
  content: string
  created_at: string
}

/** Row de admin_list_parties. El admin ve todo: dirección real incluida. */
export interface AdminPartyRow {
  id: string
  host_id: string
  host_name: string
  host_email: string | null
  title: string
  description: string | null
  city: 'la_plata' | 'caba' | 'bariloche'
  zone_text: string
  type: PartyType
  address_hidden: string | null
  arrival_notes: string | null
  whatsapp_number: string | null
  lat_hidden: number | null
  lng_hidden: number | null
  max_people: number
  attendees_count: number
  pending_count: number
  report_count: number
  start_at: string
  expires_at: string
  created_at: string
  status: string
  /** Activa y sin expirar: lo que la gente ve en el mapa ahora mismo. */
  is_live: boolean
  genres: string[]
  venue_type: string | null
  song_count: number
}

/** Row de admin_party_songs */
export interface AdminSongRow {
  id: string
  user_id: string
  user_name: string
  user_email: string | null
  title: string
  artist: string | null
  genre: string
  created_at: string
}

export interface AdminStats {
  live_parties: number
  total_parties: number
  total_users: number
  verified_users: number
  open_reports: number
}

export type AdminFilter = 'all' | 'live' | 'reported'

/** Mensaje del chat privado visto desde el panel. Leer no deja rastro. */
export interface AdminMessageRow {
  id: string
  user_id: string
  sender_name: string
  sender_email: string | null
  content: string
  created_at: string
  is_host: boolean
}

export interface AdminPersonRow {
  request_id: string
  user_id: string
  display_name: string
  email: string | null
  verified: boolean
  reputation: number
  status: 'pending' | 'approved' | 'rejected'
  checked_in: boolean
  created_at: string
}

export interface AdminUserRow {
  id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  city: string | null
  verified: boolean
  reputation: number
  parties_hosted: number
  parties_joined: number
  reports_made: number
  is_admin: boolean
  created_at: string
}

export interface AdminReportRow {
  id: string
  party_id: string
  party_title: string
  reporter_name: string
  reporter_email: string | null
  reason: string
  created_at: string
  party_status: string
}

export interface CreatePartyInput {
  title: string
  description: string | null
  city: 'la_plata' | 'caba' | 'bariloche'
  zone: string
  /** Obligatoria: sin dirección la previa no sirve. */
  address: string
  arrivalNotes: string | null
  whatsappNumber: string | null
  /** Obligatorios: el pin exacto que eligió el host (geocodificado o arrastrado). */
  lat: number
  lng: number
  startAt: string
  maxPeople: number
  type: PartyType
  legalOk: boolean
  /** Al menos uno. */
  genres: string[]
  venueType: string | null
}
