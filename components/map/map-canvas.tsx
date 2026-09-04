'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { haversineMeters, distanceColor } from '@/lib/distance'
import { PIN_COLORS } from '@/lib/constants'
import { getCity, type City, type CityDef } from '@/lib/zones'
import { cityRadiusM } from '@/lib/constants'
import type { BboxZoneRow } from '@/lib/types'
import { zonePinHtml, emptyZonePinHtml, boatHtml, userDotDataUrl } from './marker-icons'
import type { GeoPos } from './use-geolocation'

export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

interface MapCanvasProps {
  city: City
  zones: BboxZoneRow[]
  pos: GeoPos | null
  onSelectZone: (cityKey: string, zoneKey: string, zoneLabel: string) => void
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

const emptyIconCache = new Map<string, L.DivIcon>()

const emptyIcon = (label: string) => {
  const cached = emptyIconCache.get(label)
  if (cached) return cached
  const icon = L.divIcon({
    html: emptyZonePinHtml(label),
    className: 'pin-icon',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
  emptyIconCache.set(label, icon)
  return icon
}

const userIcon = () =>
  L.icon({
    iconUrl: userDotDataUrl(),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

/**
 * Recorridos de los veleros sobre el Nahuel Huapi. Son rutas fijas trazadas
 * dentro del agua en vez de un polígono del lago: el polígono serían varios KB
 * de GeoJSON y un test de punto-en-polígono por cuadro, para un adorno que
 * nadie toca. Con tres rutas alcanza y el costo es cero.
 */
const BOAT_ROUTES: Array<Array<[number, number]>> = [
  [
    [-41.0355, -71.5285],
    [-41.0245, -71.4705],
    [-41.0195, -71.4105],
    [-41.0265, -71.3505],
  ],
  [
    [-41.0455, -71.2205],
    [-41.0325, -71.1705],
    [-41.0215, -71.1205],
  ],
  [
    [-40.9905, -71.5705],
    [-40.9805, -71.6205],
    [-40.9925, -71.6705],
  ],
  // Brazo del lago frente al centro: las otras tres rutas quedan a ~12 km al
  // norte y a zoom 13 no entran en pantalla. Sin esta, el adorno existe pero
  // nadie lo ve nunca.
  [
    [-41.0975, -71.3805],
    [-41.0905, -71.3305],
    [-41.0985, -71.2805],
  ],
]

/** Metros por segundo a los que deriva un velero. Lento a propósito. */
const BOAT_SPEED = 0.00022

/**
 * Recuadro grosero del Nahuel Huapi: alcanza para decidir si dibujar veleros.
 * El borde sur va en -41.16 y no en -41.13 porque el centro de Bariloche está
 * en -41.1335: con el recuadro anterior la ciudad quedaba justo afuera y los
 * veleros no se dibujaban nunca.
 */
const LAKE_BOX = { minLat: -41.16, minLng: -71.72, maxLat: -40.93, maxLng: -71.1 }

function touchesLake(b: L.LatLngBounds): boolean {
  return (
    b.getSouth() < LAKE_BOX.maxLat &&
    b.getNorth() > LAKE_BOX.minLat &&
    b.getWest() < LAKE_BOX.maxLng &&
    b.getEast() > LAKE_BOX.minLng
  )
}

/**
 * Veleros a la deriva sobre el lago. Es la respuesta al pedido de "llamar la
 * atención en el mapa": el lago de Bariloche era una mancha muerta.
 *
 * Se monta sólo cuando el recuadro visible toca el lago, así el resto del país
 * no paga un rAF por nada. La decisión se toma sobre los bounds reales y no
 * sobre el centro de la ciudad: con el centro, panear hasta el lago desde
 * cualquier otra ciudad no encendía nada.
 */
function Boats() {
  const map = useMap()
  const [visible, setVisible] = useState(() => touchesLake(map.getBounds()))

  useEffect(() => {
    const sync = () => setVisible(touchesLake(map.getBounds()))
    map.on('moveend', sync)
    return () => {
      map.off('moveend', sync)
    }
  }, [map])

  useEffect(() => {
    if (!visible) return
    // La regla global de globals.css apaga keyframes, pero no detiene un rAF:
    // acá se consulta a mano y directamente no se arranca.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const markers = BOAT_ROUTES.map((route, i) =>
      L.marker(route[0], {
        icon: L.divIcon({ html: boatHtml(i % 2 === 1), className: 'boat-icon', iconSize: [26, 26], iconAnchor: [13, 13] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: -200,
      }).addTo(map)
    )

    // Progreso de cada velero por su ruta, 0..1, con rebote en las puntas.
    const t = BOAT_ROUTES.map((_, i) => i * 0.3)
    const dir = BOAT_ROUTES.map(() => 1)
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000
      last = now
      BOAT_ROUTES.forEach((route, i) => {
        t[i] += dir[i] * BOAT_SPEED * dt * 60
        if (t[i] >= 1) {
          t[i] = 1
          dir[i] = -1
        } else if (t[i] <= 0) {
          t[i] = 0
          dir[i] = 1
        }
        const seg = (route.length - 1) * t[i]
        const a = route[Math.min(Math.floor(seg), route.length - 2)]
        const b = route[Math.min(Math.floor(seg) + 1, route.length - 1)]
        const f = seg - Math.floor(seg)
        markers[i].setLatLng([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      markers.forEach((m) => m.remove())
    }
  }, [map, visible])

  return null
}

export function MapCanvas({ city, zones, pos, onSelectZone, onBoundsChange }: MapCanvasProps) {
  const cityDef: CityDef = getCity(city)
  const icons = useMemo(() => ({ user: userIcon() }), [])
  // Se lee una sola vez por montaje (el MapContainer remonta con key={city}).
  const savedView = useMemo(() => readSavedView(city), [city])

  // Zonas sin previas de la ciudad actual. Sólo se dibujan cuando no hay NADA
  // en pantalla: con previas alrededor serían ruido gris (por eso se sacaron en
  // su momento), pero en un mapa vacío son la única salida que ve el usuario.
  const emptyZones = zones.length === 0 ? cityDef.zones.slice(0, 6) : []

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
      <Boats />

      {pos && <Marker position={[pos.lat, pos.lng]} icon={icons.user} zIndexOffset={500} />}

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

      {emptyZones.map((zone) => (
        <Marker
          key={`empty/${zone.key}`}
          position={[zone.lat, zone.lng]}
          icon={emptyIcon('Sé el primero')}
          zIndexOffset={100}
          eventHandlers={{ click: () => onSelectZone(cityDef.key, zone.key, zone.label) }}
        />
      ))}
    </MapContainer>
  )
}
