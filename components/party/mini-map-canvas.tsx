'use client'

import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { exactPinDataUrl } from '@/components/map/marker-icons'

interface MiniMapCanvasProps {
  lat: number
  lng: number
  /** Modo difuso: círculo en vez de pin, para la ubicación aproximada. */
  approximate?: boolean
}

export function MiniMapCanvas({ lat, lng, approximate }: MiniMapCanvasProps) {
  const icon = L.icon({
    iconUrl: exactPinDataUrl(),
    iconSize: [42, 50],
    iconAnchor: [21, 50],
  })

  return (
    <MapContainer
      center={[lat, lng]}
      // Alejado a propósito en modo difuso: el zoom fino delataría la casa.
      zoom={approximate ? 14 : 15}
      maxZoom={approximate ? 15 : MAX_ZOOM}
      zoomControl={false}
      className="h-full w-full bg-background"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
      <TileLayer url={LABELS_URL} maxZoom={MAX_ZOOM} />
      {approximate ? (
        <Circle
          center={[lat, lng]}
          radius={400}
          pathOptions={{ color: '#8b8b95', weight: 1.5, fillColor: '#8b8b95', fillOpacity: 0.18 }}
        />
      ) : (
        <Marker position={[lat, lng]} icon={icon} />
      )}
    </MapContainer>
  )
}
