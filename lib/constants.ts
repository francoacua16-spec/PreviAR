import type { City } from './zones'

/** Toda previa vive 8 horas y muere (Pilar C). */
export const PARTY_DURATION_HOURS = 8

/** Anti-spam: máximo 3 previas creadas por usuario cada 24 hs. */
export const MAX_PARTIES_PER_DAY = 3

/** Límite legal por ciudad: La Plata 50, CABA/Bariloche 40. */
export const CITY_LEGAL_LIMITS: Record<City, number> = {
  la_plata: 50,
  caba: 40,
  bariloche: 40,
}

/**
 * Radio en el que consideramos que el mapa "está" en una ciudad. Sirve para no
 * arrastrar la vista fuera de la ciudad elegida: si estás en La Plata y tocás
 * CABA, el mapa tiene que quedarse en CABA. La Plata y CABA están a ~55 km, así
 * que 30 km separa bien las tres ciudades sin cortar sus barrios (el más lejano
 * está a ~20 km del centro).
 */
export const CITY_RADIUS_M = 30_000

/** Colores de pin por distancia a la previa (km). */
export const DISTANCE_THRESHOLDS = {
  green: 10_000, // < 10 km  🟢
  yellow: 30_000, // 10–30 km 🟡
} as const

export const PIN_COLORS = {
  green: '#2BFF88',
  yellow: '#FFD60A',
  red: '#FF4D6D',
  neutral: '#00F5FF',
  dim: '#3A3A44',
} as const

export const APP_NAME = 'PreviAR'
