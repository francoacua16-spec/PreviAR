'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { haversineMeters, distanceColor } from '@/lib/distance'
import { PIN_COLORS } from '@/lib/constants'
import { getCity, type City, type CityDef } from '@/lib/zones'
import { cityRadiusM } from '@/lib/constants'
import type { BboxZoneRow, ShopRow } from '@/lib/types'
import { isOpenNow } from '@/lib/opening-hours'
import { SHOP_EMOJI } from '@/lib/constants'
import { zonePinHtml, shopPinHtml, userDotDataUrl } from './marker-icons'
import type { GeoPos } from './use-geolocation'

export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
  /** Zoom con el que se está mirando. Los locales sólo se piden de cerca. */
  zoom: number
}

interface MapCanvasProps {
  city: City
  zones: BboxZoneRow[]
  shops: ShopRow[]
  pos: GeoPos | null
  onSelectZone: (cityKey: string, zoneKey: string, zoneLabel: string) => void
  onSelectShop: (shop: ShopRow) => void
  onBoundsChange: (bounds: MapBounds) => void
}

/**
 * Centra el mapa en el usuario la primera vez que llega su ubicación, pero
 * SOLO si está dentro de la ciudad elegida. Sin ese chequeo, estando en
 * La Plata y tocando CABA el mapa se centraba en CABA y al instante volvía
 * a La Plata: parecía que el botón no hacía nada.
 */
function CenterOnMe({ pos, cityDef, skip }: { pos: GeoPos | null; cityDef: CityDef; skip?: boolean }) {
  const map = useMap()
  const done = useRef(false)

  useEffect(() => {
    if (skip) done.current = true
  }, [skip])

  useEffect(() => {
    if (!pos || done.current) return
    done.current = true
    if (haversineMeters(pos, cityDef.center) > cityRadiusM(cityDef.key)) return
    map.panTo([pos.lat, pos.lng])
  }, [map, pos, cityDef])

  return null
}

interface SavedView {
  lat: number
  lng: number
  zoom: number
}

const mapViewKey = (city: City) => `previar:mapview:${city}`

/** Recupera el último centro/zoom que el usuario dejó en esta ciudad, si hay uno. */
function readSavedView(city: City): SavedView | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(mapViewKey(city))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.lat === 'number' &&
      typeof parsed?.lng === 'number' &&
      typeof parsed?.zoom === 'number'
    ) {
      // Una vista guardada lejos de la ciudad quedó mal (bug viejo: el mapa se
      // iba a tu ubicación al cambiar de ciudad y guardaba eso). La tiramos.
      if (haversineMeters(parsed, getCity(city).center) > cityRadiusM(city)) return null
      return parsed
    }
  } catch {
    // sessionStorage corrupto o inaccesible: ignoramos y usamos el default
  }
  return null
}

function saveView(city: City, lat: number, lng: number, zoom: number) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(mapViewKey(city), JSON.stringify({ lat, lng, zoom }))
  } catch {
    // ignorar (modo privado, cuota llena, etc.)
  }
}

/**
 * Guarda el centro/zoom cada vez que el usuario mueve el mapa, y avisa hacia
 * arriba qué recuadro quedó visible: los pines ya no salen de la ciudad
 * elegida sino de lo que se está mirando, así el paneo libre trae previas de
 * donde sea sin pasar por el selector.
 */
function ViewWatcher({ city, onBoundsChange }: { city: City; onBoundsChange: (b: MapBounds) => void }) {
  const emit = (map: L.Map) => {
    const b = map.getBounds()
    onBoundsChange({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
      zoom: map.getZoom(),
    })
  }

  const map = useMapEvents({
    moveend: (e) => {
      const m = e.target as L.Map
      const center = m.getCenter()
      saveView(city, center.lat, center.lng, m.getZoom())
      emit(m)
    },
  })

  // Primer recuadro: sin esto el mapa arranca vacío hasta que el usuario lo
  // toca. `moveend` no dispara solo al montar.
  useEffect(() => {
    emit(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

/**
 * Cache de íconos por (contador, color, pulso, brillo). Sin esto cada render
 * volvía a construir un ícono por pin: con el refresco de fondo, todos los
 * markers se reconstruían aunque no hubiera cambiado nada. Las combinaciones
 * son pocas (contadores chicos × 4 colores × 4 estados), así que no crece.
 */
const zoneIconCache = new Map<string, L.DivIcon>()

const zoneIcon = (count: number, color: string, pulse: boolean, glow: boolean) => {
  const key = `${count}|${color}|${pulse ? 1 : 0}|${glow ? 1 : 0}`
  const cached = zoneIconCache.get(key)
  if (cached) return cached
  const icon = L.divIcon({
    html: zonePinHtml({ count, color, pulse, glow }),
    className: 'pin-icon',
    iconSize: [48, 54],
    iconAnchor: [24, 54],
    tooltipAnchor: [0, -50],
  })
  zoneIconCache.set(key, icon)
  return icon
}

/** Íconos de local, cacheados por (emoji, estado). Son 5 × 3 combinaciones. */
const shopIconCache = new Map<string, L.DivIcon>()

const shopIcon = (emoji: string, open: boolean | null) => {
  const key = `${emoji}|${open === null ? '?' : open ? 1 : 0}`
  const cached = shopIconCache.get(key)
  if (cached) return cached
  const icon = L.divIcon({
    html: shopPinHtml({ emoji, open }),
    className: 'shop-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -14],
  })
  shopIconCache.set(key, icon)
  return icon
}

const userIcon = () =>
  L.icon({
    iconUrl: userDotDataUrl(),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

export function MapCanvas({ city, zones, shops, pos, onSelectZone, onSelectShop, onBoundsChange }: MapCanvasProps) {
  const cityDef: CityDef = getCity(city)
  const icons = useMemo(() => ({ user: userIcon() }), [])
  // Se lee una sola vez por montaje (el MapContainer remonta con key={city}).
  const savedView = useMemo(() => readSavedView(city), [city])

  return (
    <MapContainer
      key={city} // remonta el mapa al cambiar de ciudad
      center={savedView ? [savedView.lat, savedView.lng] : [cityDef.center.lat, cityDef.center.lng]}
      zoom={savedView ? savedView.zoom : 13}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl
      className="h-full w-full bg-background"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
      <TileLayer url={LABELS_URL} maxZoom={MAX_ZOOM} />

      <ViewWatcher city={city} onBoundsChange={onBoundsChange} />
      <CenterOnMe pos={pos} cityDef={cityDef} skip={!!savedView} />

      {pos && <Marker position={[pos.lat, pos.lng]} icon={icons.user} zIndexOffset={500} />}

      {/* Locales primero: van debajo de los pines de previa, que son el
          contenido de la app. */}
      {shops.map((shop) => {
        const state = isOpenNow(shop.opening_hours)
        return (
          <Marker
            key={`${shop.osm_type}/${shop.osm_id}`}
            position={[shop.lat, shop.lng]}
            icon={shopIcon(SHOP_EMOJI[shop.kind] ?? '🏪', state ? state.open : null)}
            zIndexOffset={100}
            eventHandlers={{ click: () => onSelectShop(shop) }}
          >
            <Tooltip direction="top">{shop.name}</Tooltip>
          </Marker>
        )
      })}

      {zones.map((zone) => {
        const count = Number(zone.party_count)
        const meters = pos ? haversineMeters(pos, zone) : null
        const color = meters ? PIN_COLORS[distanceColor(meters)] : PIN_COLORS.neutral
        return (
          <Marker
            key={`${zone.city_key}/${zone.zone_key}`}
            position={[zone.lat, zone.lng]}
            icon={zoneIcon(count, color, zone.has_space, zone.is_new)}
            zIndexOffset={300}
            eventHandlers={{ click: () => onSelectZone(zone.city_key, zone.zone_key, zone.zone_label) }}
          >
            <Tooltip direction="top">
              {`${zone.zone_label} · ${count} previa${count === 1 ? '' : 's'}`}
            </Tooltip>
          </Marker>
        )
      })}

    </MapContainer>
  )
}
