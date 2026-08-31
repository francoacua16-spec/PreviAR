'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { haversineMeters, distanceColor } from '@/lib/distance'
import { PIN_COLORS } from '@/lib/constants'
import { getCity, type City, type CityDef } from '@/lib/zones'
import { CITY_RADIUS_M } from '@/lib/constants'
import type { CityZoneRow } from '@/lib/types'
import { zonePinDataUrl, userDotDataUrl, dimDotDataUrl } from './marker-icons'
import type { GeoPos } from './use-geolocation'

interface MapCanvasProps {
  city: City
  zones: CityZoneRow[]
  pos: GeoPos | null
  onSelectZone: (zoneKey: string, zoneLabel: string) => void
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
    if (haversineMeters(pos, cityDef.center) > CITY_RADIUS_M) return
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
      if (haversineMeters(parsed, getCity(city).center) > CITY_RADIUS_M) return null
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

/** Guarda el centro/zoom cada vez que el usuario mueve el mapa, para restaurarlo
 * al volver de la vista de una previa (ver "Volver al mapa" en party-client.tsx). */
function PersistView({ city }: { city: City }) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const center = map.getCenter()
      saveView(city, center.lat, center.lng, map.getZoom())
    },
  })
  return null
}

const zoneIcon = (count: number, color: string) =>
  L.icon({
    iconUrl: zonePinDataUrl({ count, color }),
    iconSize: [48, 54],
    iconAnchor: [24, 54],
    tooltipAnchor: [0, -50],
  })

const dimIcon = () =>
  L.icon({
    iconUrl: dimDotDataUrl(),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    tooltipAnchor: [0, -10],
  })

const userIcon = () =>
  L.icon({
    iconUrl: userDotDataUrl(),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

export function MapCanvas({ city, zones, pos, onSelectZone }: MapCanvasProps) {
  const cityDef: CityDef = getCity(city)
  const zoneCounts = zones.reduce<Record<string, number>>((acc, z) => {
    acc[z.zone_text] = Number(z.party_count)
    return acc
  }, {})

  const icons = useMemo(() => ({ dim: dimIcon(), user: userIcon() }), [])
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

      <PersistView city={city} />
      <CenterOnMe pos={pos} cityDef={cityDef} skip={!!savedView} />

      {pos && <Marker position={[pos.lat, pos.lng]} icon={icons.user} zIndexOffset={500} />}

      {cityDef.zones.map((zone) => {
        const count = zoneCounts[zone.key] ?? 0
        if (count === 0) {
          return (
            <Marker
              key={zone.key}
              position={[zone.lat, zone.lng]}
              icon={icons.dim}
              eventHandlers={{ click: () => onSelectZone(zone.key, zone.label) }}
            >
              <Tooltip direction="top">{zone.label}</Tooltip>
            </Marker>
          )
        }
        const meters = pos ? haversineMeters(pos, zone) : null
        const color = meters ? PIN_COLORS[distanceColor(meters)] : PIN_COLORS.neutral
        return (
          <Marker
            key={zone.key}
            position={[zone.lat, zone.lng]}
            icon={zoneIcon(count, color)}
            zIndexOffset={300}
            eventHandlers={{ click: () => onSelectZone(zone.key, zone.label) }}
          >
            <Tooltip direction="top">
              {`${zone.label} · ${count} previa${count === 1 ? '' : 's'}`}
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
