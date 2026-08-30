export type City = 'la_plata' | 'caba' | 'bariloche'

export interface Zone {
  key: string
  label: string
  lat: number
  lng: number
}

export interface CityDef {
  key: City
  label: string
  short: string
  center: { lat: number; lng: number }
  zones: Zone[]
}

export const CITIES: CityDef[] = [
  {
    key: 'la_plata',
    label: 'La Plata',
    short: 'LP',
    center: { lat: -34.9215, lng: -57.9545 },
    zones: [
      { key: 'tolosa', label: 'Tolosa', lat: -34.9078, lng: -57.975 },
      { key: 'city-bell', label: 'City Bell', lat: -34.8861, lng: -58.0522 },
      { key: 'la-loma', label: 'La Loma', lat: -34.9372, lng: -57.9667 },
      { key: 'barrio-norte', label: 'Barrio Norte', lat: -34.9, lng: -57.9528 },
      { key: 'centro', label: 'Centro', lat: -34.9215, lng: -57.9545 },
      { key: 'gonnet', label: 'Gonnet', lat: -34.8778, lng: -58.01 },
      { key: 'los-hornos', label: 'Los Hornos', lat: -34.9722, lng: -57.9733 },
    ],
  },
  {
    key: 'caba',
    label: 'CABA',
    short: 'BA',
    center: { lat: -34.6037, lng: -58.3816 },
    zones: [
      { key: 'palermo', label: 'Palermo', lat: -34.5883, lng: -58.4306 },
      { key: 'belgrano', label: 'Belgrano', lat: -34.5625, lng: -58.4583 },
      { key: 'nunez', label: 'Nuñez', lat: -34.5472, lng: -58.4667 },
      { key: 'villa-crespo', label: 'Villa Crespo', lat: -34.6033, lng: -58.4394 },
      { key: 'caballito', label: 'Caballito', lat: -34.6125, lng: -58.4431 },
      { key: 'san-telmo', label: 'San Telmo', lat: -34.6211, lng: -58.3714 },
      { key: 'recoleta', label: 'Recoleta', lat: -34.5889, lng: -58.3911 },
    ],
  },
  {
    key: 'bariloche',
    label: 'Bariloche',
    short: 'BRC',
    center: { lat: -41.1335, lng: -71.3103 },
    zones: [
      { key: 'centro', label: 'Centro', lat: -41.1335, lng: -71.3103 },
      { key: 'melipal', label: 'Melipal', lat: -41.125, lng: -71.38 },
      { key: 'las-victorias', label: 'Las Victorias', lat: -41.1467, lng: -71.3472 },
      { key: 'este', label: 'Este', lat: -41.135, lng: -71.25 },
      { key: 'km8', label: 'Km 8', lat: -41.09, lng: -71.41 },
    ],
  },
]

export function getCity(key: City): CityDef {
  return CITIES.find((c) => c.key === key) ?? CITIES[0]
}

export function getZone(cityKey: City, zoneKey: string): Zone | undefined {
  return getCity(cityKey).zones.find((z) => z.key === zoneKey)
}

export function zoneLabel(cityKey: City, zoneKey: string): string {
  return getZone(cityKey, zoneKey)?.label ?? zoneKey
}
