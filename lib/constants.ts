import { getCity, type City } from './zones'

/** Toda previa vive 8 horas y muere (Pilar C). */
export const PARTY_DURATION_HOURS = 8

/** Anti-spam: máximo 3 previas creadas por usuario cada 24 hs. */
export const MAX_PARTIES_PER_DAY = 3

/**
 * Límite legal por ciudad. Antes era un Record exhaustivo con las tres
 * ciudades escritas a mano; con el catálogo completo cada ciudad trae el suyo
 * (`legalLimit`), y la base lo valida por su lado en `city_legal_limit()`.
 */
export function cityLegalLimit(city: City): number {
  return getCity(city).legalLimit
}

/**
 * Radio en el que consideramos que el mapa "está" en una ciudad. Sirve para no
 * arrastrar la vista fuera de la ciudad elegida.
 *
 * Era una constante global de 30 km, que servía con tres ciudades separadas por
 * más de 50 km. Con el país entero un radio fijo pega ciudades vecinas: en el
 * Gran Buenos Aires hay partidos a 8 km uno del otro. Ahora cada ciudad declara
 * el suyo en el catálogo y esto queda sólo como piso para claves desconocidas.
 */
export const CITY_RADIUS_FALLBACK_M = 30_000

export function cityRadiusM(city: City): number {
  return getCity(city).radiusM || CITY_RADIUS_FALLBACK_M
}

/** Colores de pin por distancia a la previa (km). */
export const DISTANCE_THRESHOLDS = {
  green: 10_000, // < 10 km  🟢
  yellow: 30_000, // 10–30 km 🟡
} as const

export const PIN_COLORS = {
  green: '#2BFF88',
  yellow: '#FFD60A',
  red: '#FF4D6D',
  neutral: '#B299F1',
  dim: '#3A3A44',
} as const

export const APP_NAME = 'PreviAR'

/**
 * Géneros de la previa. La clave se guarda en `parties.genres` (text[]) y no se
 * renombra nunca: hay previas creadas con estos valores. El orden es el de la
 * pista real de una previa argentina, no alfabético — lo primero que se ve es
 * lo que más suena.
 */
export const MUSIC_GENRES = [
  { key: 'reggaeton', label: 'Reggaetón', emoji: '🔥' },
  { key: 'cumbia', label: 'Cumbia', emoji: '🪗' },
  { key: 'rkt', label: 'RKT', emoji: '💥' },
  { key: 'trap', label: 'Trap', emoji: '🎤' },
  { key: 'techno', label: 'Techno', emoji: '🖤' },
  { key: 'house', label: 'House', emoji: '🏠' },
  { key: 'electronica', label: 'Electrónica', emoji: '🎛️' },
  { key: 'pop', label: 'Pop', emoji: '✨' },
  { key: 'rock', label: 'Rock nacional', emoji: '🎸' },
  { key: 'cuarteto', label: 'Cuarteto', emoji: '🕺' },
  { key: 'hiphop', label: 'Hip hop', emoji: '🧢' },
  { key: 'latino', label: 'Salsa / Bachata', emoji: '💃' },
] as const

export type MusicGenreKey = (typeof MUSIC_GENRES)[number]['key']

/** Máximo de géneros por previa. Más que esto deja de servir para elegir. */
export const MAX_GENRES = 4

export function genreLabel(key: string): string {
  return MUSIC_GENRES.find((g) => g.key === key)?.label ?? key
}

export function genreEmoji(key: string): string {
  return MUSIC_GENRES.find((g) => g.key === key)?.emoji ?? '🎵'
}

/**
 * Dónde es la previa. `nautical: true` cambia el copy de dirección: en un barco
 * no hay calle y altura, hay puerto y amarre, y la gente necesita saber a qué
 * hora zarpa o no llega nunca.
 */
export const VENUE_TYPES = [
  { key: 'casa', label: 'Casa', emoji: '🏡', nautical: false },
  { key: 'depto', label: 'Depto', emoji: '🏢', nautical: false },
  { key: 'quinta', label: 'Quinta', emoji: '🌳', nautical: false },
  { key: 'terraza', label: 'Terraza', emoji: '🌆', nautical: false },
  { key: 'salon', label: 'Salón', emoji: '🎉', nautical: false },
  { key: 'camping', label: 'Camping', emoji: '⛺', nautical: false },
  { key: 'playa', label: 'Playa', emoji: '🏖️', nautical: false },
  { key: 'barco', label: 'Barco', emoji: '🚤', nautical: true },
  { key: 'yate', label: 'Yate', emoji: '🛥️', nautical: true },
  { key: 'catamaran', label: 'Catamarán', emoji: '⛵', nautical: true },
] as const

export type VenueTypeKey = (typeof VENUE_TYPES)[number]['key']

export function venueDef(key: string | null | undefined) {
  if (!key) return null
  return VENUE_TYPES.find((v) => v.key === key) ?? null
}

export function isNauticalVenue(key: string | null | undefined): boolean {
  return venueDef(key)?.nautical === true
}

/** Temas que cada persona le puede pedir al DJ. Duro, del lado del servidor también. */
export const MAX_SONGS_PER_PERSON = 2

/**
 * Ícono por tipo de local. Las claves son las que escribe
 * `scripts/gen-shops-seed.mjs` en la columna `shops.kind`.
 */
export const SHOP_EMOJI: Record<string, string> = {
  kiosco: '🏪',
  vinoteca: '🍷',
  bebidas: '🍺',
  growshop: '🌱',
  '24hs': '🌙',
}

/** Nombre legible del tipo de local, para la hoja de detalle. */
export const SHOP_LABEL: Record<string, string> = {
  kiosco: 'Kiosco',
  vinoteca: 'Vinoteca',
  bebidas: 'Bebidas',
  growshop: 'Growshop',
  '24hs': 'Abierto 24hs',
}

/**
 * El "+" de la barra inferior abre el diálogo de crear, que vive dentro del
 * mapa. Desde otra sección eso es una navegación a `/?crear=1`; parado en el
 * mapa no hay navegación posible, así que la barra emite este evento.
 */
export const CREATE_EVENT = 'previar:crear'
