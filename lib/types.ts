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
  my_status: MyStatus
  checked_in: boolean
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

export interface CreatePartyInput {
  title: string
  description: string | null
  city: 'la_plata' | 'caba' | 'bariloche'
  zone: string
  address: string | null
  lat: number | null
  lng: number | null
  startAt: string
  maxPeople: number
  type: PartyType
  legalOk: boolean
}
