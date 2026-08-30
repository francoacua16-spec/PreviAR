'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { haversineMeters, distanceColor } from '@/lib/distance'
import { PIN_COLORS } from '@/lib/constants'
import { getCity, type City, type CityDef } from '@/lib/zones'
import type { CityZoneRow } from '@/lib/types'
import { zonePinDataUrl, userDotDataUrl, dimDotDataUrl } from './marker-icons'
import type { GeoPos } from './use-geolocation'

interface MapCanvasProps {
  city: City
  zones: CityZoneRow[]
  pos: GeoPos | null
  onSelectZone: (zoneKey: string, zoneLabel: string) => void
}

/** Centra el mapa en el usuario la primera vez que llega su ubicación. */
function CenterOnMe({ pos }: { pos: GeoPos | null }) {
  const map = useMap()
  const done = useRef(false)

  useEffect(() => {
    if (pos && !done.current) {
      done.current = true
      map.panTo([pos.lat, pos.lng])
    }
  }, [map, pos])

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

  return (
    <MapContainer
      key={city} // remonta el mapa al cambiar de ciudad
      center={[cityDef.center.lat, cityDef.center.lng]}
      zoom={13}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl
      className="h-full w-full bg-background"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
      <TileLayer url={LABELS_URL} maxZoom={MAX_ZOOM} />

      <CenterOnMe pos={pos} />

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
