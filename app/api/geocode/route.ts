import { NextResponse } from 'next/server'

/**
 * Proxy de búsqueda de direcciones (Nominatim / OpenStreetMap).
 * Va del lado del server para mandar User-Agent identificable, como pide la
 * política de uso de Nominatim, y para poder cachear.
 */
export const runtime = 'nodejs'
export const revalidate = 0

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 3) return NextResponse.json({ results: [] })

  const url = new URL(ENDPOINT)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('countrycodes', 'ar')
  url.searchParams.set('accept-language', 'es')
  url.searchParams.set('limit', '5')

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PreviAR/1.0 (https://previar.vercel.app)',
        Accept: 'application/json',
      },
      next: { revalidate: 86400 },
    })
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
