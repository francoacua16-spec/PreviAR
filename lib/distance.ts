import { DISTANCE_THRESHOLDS } from './constants'

export interface LatLngLike {
  lat: number
  lng: number
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function haversineMeters(a: LatLngLike, b: LatLngLike): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Color de pin según distancia: 🟢 <10km · 🟡 10–30km · 🔴 >30km */
export function distanceColor(meters: number): 'green' | 'yellow' | 'red' {
  if (meters < DISTANCE_THRESHOLDS.green) return 'green'
  if (meters < DISTANCE_THRESHOLDS.yellow) return 'yellow'
  return 'red'
}

export function formatDistanceMeters(meters: number | null | undefined): string | null {
  if (meters == null) return null
  if (meters < 1000) return `A ${Math.max(100, Math.round(meters / 100) * 100)} m`
  return `A ${(meters / 1000).toFixed(1)} km`
}
