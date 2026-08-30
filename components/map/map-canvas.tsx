'use client'

import { useEffect, useRef } from 'react'
import { Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { DARK_MAP_STYLE } from '@/lib/map-style'
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
    if (map && pos && !done.current) {
      done.current = true
      map.panTo({ lat: pos.lat, lng: pos.lng })
    }
  }, [map, pos])

  return null
}

export function MapCanvas({ city, zones, pos, onSelectZone }: MapCanvasProps) {
  const cityDef: CityDef = getCity(city)
  const zoneCounts = zones.reduce<Record<string, number>>((acc, z) => {
    acc[z.zone_text] = Number(z.party_count)
    return acc
  }, {})

  return (
    <Map
      key={city} // remonta el mapa al cambiar de ciudad
      defaultCenter={cityDef.center}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      styles={DARK_MAP_STYLE}
      className="h-full w-full"
    >
      <CenterOnMe pos={pos} />

      {pos && <Marker position={pos} icon={userDotDataUrl()} zIndex={50} />}

      {cityDef.zones.map((zone) => {
        const count = zoneCounts[zone.key] ?? 0
        if (count === 0) {
          return (
            <Marker
              key={zone.key}
              position={{ lat: zone.lat, lng: zone.lng }}
              icon={dimDotDataUrl()}
              title={zone.label}
              onClick={() => onSelectZone(zone.key, zone.label)}
            />
          )
        }
        const meters = pos ? haversineMeters(pos, zone) : null
        const color = meters ? PIN_COLORS[distanceColor(meters)] : PIN_COLORS.neutral
        return (
          <Marker
            key={zone.key}
            position={{ lat: zone.lat, lng: zone.lng }}
            icon={zonePinDataUrl({ count, color })}
            title={`${zone.label} · ${count} previa${count === 1 ? '' : 's'}`}
            zIndex={30}
            onClick={() => onSelectZone(zone.key, zone.label)}
          />
        )
      })}
    </Map>
  )
}
