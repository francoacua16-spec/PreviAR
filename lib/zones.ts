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
      { key: 'ringuelet', label: 'Ringuelet', lat: -34.8917, lng: -57.9744 },
      { key: 'villa-elisa', label: 'Villa Elisa', lat: -34.8625, lng: -58.0819 },
      { key: 'el-mondongo', label: 'El Mondongo', lat: -34.9308, lng: -57.9264 },
      { key: 'meridiano-v', label: 'Meridiano V', lat: -34.9153, lng: -57.9639 },
      { key: 'abasto', label: 'Abasto', lat: -35.0167, lng: -57.9667 },
      { key: 'san-carlos', label: 'San Carlos', lat: -34.9481, lng: -58.0106 },
      { key: 'altos-de-san-lorenzo', label: 'Altos de San Lorenzo', lat: -34.9367, lng: -57.9439 },
      { key: 'olmos', label: 'Olmos', lat: -34.9506, lng: -58.0119 },
      { key: 'arturo-segui', label: 'Arturo Seguí', lat: -34.8961, lng: -58.0308 },
      { key: 'villa-castells', label: 'Villa Castells', lat: -34.8797, lng: -58.0389 },
      { key: 'hernandez', label: 'Hernández', lat: -34.8664, lng: -58.0722 },
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
      { key: 'almagro', label: 'Almagro', lat: -34.6089, lng: -58.4206 },
      { key: 'boedo', label: 'Boedo', lat: -34.6294, lng: -58.4183 },
      { key: 'flores', label: 'Flores', lat: -34.6283, lng: -58.4633 },
      { key: 'floresta', label: 'Floresta', lat: -34.6294, lng: -58.4839 },
      { key: 'villa-urquiza', label: 'Villa Urquiza', lat: -34.5761, lng: -58.4864 },
      { key: 'colegiales', label: 'Colegiales', lat: -34.5761, lng: -58.4489 },
      { key: 'chacarita', label: 'Chacarita', lat: -34.5872, lng: -58.4544 },
      { key: 'barracas', label: 'Barracas', lat: -34.6417, lng: -58.3833 },
      { key: 'la-boca', label: 'La Boca', lat: -34.6345, lng: -58.3631 },
      { key: 'puerto-madero', label: 'Puerto Madero', lat: -34.6083, lng: -58.3625 },
      { key: 'constitucion', label: 'Constitución', lat: -34.6264, lng: -58.3811 },
      { key: 'retiro', label: 'Retiro', lat: -34.5925, lng: -58.3747 },
      { key: 'once', label: 'Once / Balvanera', lat: -34.6089, lng: -58.4056 },
      { key: 'villa-del-parque', label: 'Villa del Parque', lat: -34.6014, lng: -58.4886 },
      { key: 'saavedra', label: 'Saavedra', lat: -34.5589, lng: -58.4842 },
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
      { key: 'circuito-chico', label: 'Circuito Chico', lat: -41.145, lng: -71.45 },
      { key: 'playa-bonita', label: 'Playa Bonita', lat: -41.1092, lng: -71.42 },
      { key: 'colonia-suiza', label: 'Colonia Suiza', lat: -41.115, lng: -71.5528 },
      { key: 'villa-los-coihues', label: 'Villa Los Coihues', lat: -41.15, lng: -71.4 },
      { key: 'lago-gutierrez', label: 'Lago Gutiérrez', lat: -41.2039, lng: -71.3711 },
      { key: 'cerro-otto', label: 'Cerro Otto', lat: -41.1181, lng: -71.3719 },
      { key: 'cerro-catedral', label: 'Cerro Catedral', lat: -41.1622, lng: -71.4489 },
      { key: 'pinar-de-arelauquen', label: 'Pinar de Arelauquen', lat: -41.0664, lng: -71.4083 },
      { key: 'bustillo-km12', label: 'Bustillo Km 12', lat: -41.0917, lng: -71.4472 },
      { key: 'bustillo-km18', label: 'Bustillo Km 18', lat: -41.0958, lng: -71.5083 },
      { key: 'virgen-de-las-nieves', label: 'Virgen de las Nieves', lat: -41.1444, lng: -71.3 },
      { key: 'barrio-belgrano', label: 'Belgrano', lat: -41.1272, lng: -71.3167 },
      { key: 'nahuel-huapi', label: 'Nahuel Huapi', lat: -41.15, lng: -71.35 },
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
