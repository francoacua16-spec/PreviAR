import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Proxy de direcciones (Nominatim / OpenStreetMap).
 * Va del lado del server para mandar User-Agent identificable, como pide la
 * política de uso de Nominatim, y para poder cachear.
 *
 * Dos modos:
 *   GET /api/geocode?q=texto        → busca direcciones (autocomplete)
 *   GET /api/geocode?lat=..&lng=..  → dirección de un punto (pin arrastrado)
 *
 * Sólo para usuarios con sesión y con tope por IP: sin eso era un proxy abierto
 * a Nominatim con nuestro nombre puesto, y el que se come el bloqueo por abuso
 * de su política de uso somos nosotros.
 */
export const runtime = 'nodejs'
export const revalidate = 0

const SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://previar-rust.vercel.app'

const HEADERS = {
  // Nominatim exige un User-Agent que identifique la app y permita contactarla.
  'User-Agent': `PreviAR/1.0 (+${APP_URL})`,
  Accept: 'application/json',
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30

/**
 * Tope por IP en memoria del proceso. En serverless cada instancia lleva su
 * propia cuenta, así que el techo real es MAX × instancias vivas: alcanza para
 * frenar a un cliente que dispara en loop, no para un ataque distribuido. Para
 * eso va WAF o rate limit del borde, no código de la app.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'desconocida'
}

function overLimit(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now > entry.resetAt) {
    // Barrido barato para que el Map no crezca sin techo.
    if (hits.size > 2_000) {
      hits.forEach((value, key) => {
        if (now > value.resetAt) hits.delete(key)
      })
    }
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  if (overLimit(clientIp(request))) {
    return NextResponse.json(
      { error: 'demasiadas búsquedas, esperá un minuto' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

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
