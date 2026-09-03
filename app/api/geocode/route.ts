import { NextResponse } from 'next/server'

/**
 * Proxy de direcciones (Nominatim / OpenStreetMap).
 * Va del lado del server para mandar User-Agent identificable, como pide la
 * política de uso de Nominatim, y para poder cachear.
 *
 * Dos modos:
 *   GET /api/geocode?q=texto        → busca direcciones (autocomplete)
 *   GET /api/geocode?lat=..&lng=..  → dirección de un punto (pin arrastrado)
 */
export const runtime = 'nodejs'
export const revalidate = 0

const SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

const HEADERS = {
  'User-Agent': 'PreviAR/1.0 (https://previar.vercel.app)',
  Accept: 'application/json',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const latRaw = searchParams.get('lat')
  const lngRaw = searchParams.get('lng')
  if (latRaw !== null && lngRaw !== null) {
    return reverse(Number(latRaw), Number(lngRaw))
  }

  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 3) return NextResponse.json({ results: [] })

  const url = new URL(SEARCH_ENDPOINT)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('countrycodes', 'ar')
  url.searchParams.set('accept-language', 'es')
  url.searchParams.set('limit', '5')

  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 })

    const data = (await res.json()) as Array<{
      place_id: number
      lat: string
      lon: string
      display_name: string
    }>

    return NextResponse.json({
      results: data.map((r) => ({
        id: String(r.place_id),
        lat: Number(r.lat),
        lng: Number(r.lon),
        label: r.display_name,
      })),
    })
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 })
  }
}

/**
 * Punto → dirección. Se usa cuando el host mueve el pin a mano: el texto de la
 * dirección tiene que seguir al pin, si no queda una dirección que no coincide
 * con el lugar marcado. Si Nominatim no contesta, devolvemos label null: el pin
 * vale igual, la dirección la escribe el host.
 */
async function reverse(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ label: null }, { status: 200 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ label: null }, { status: 200 })
  }

  const url = new URL(REVERSE_ENDPOINT)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('accept-language', 'es')
  url.searchParams.set('zoom', '18')

  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return NextResponse.json({ label: null }, { status: 200 })
    const data = (await res.json()) as { display_name?: string }
    return NextResponse.json({ label: data.display_name ?? null })
  } catch {
    return NextResponse.json({ label: null }, { status: 200 })
  }
}
