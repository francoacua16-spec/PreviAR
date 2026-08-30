'use client'

import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, TILE_ATTRIBUTION, TILE_URL, MAX_ZOOM } from '@/lib/map-style'
import { exactPinDataUrl } from '@/components/map/marker-icons'

export function MiniMapCanvas({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.icon({
    iconUrl: exactPinDataUrl(),
    iconSize: [42, 50],
    iconAnchor: [21, 50],
  })

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      className="h-full w-full bg-background"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
      <TileLayer url={LABELS_URL} maxZoom={MAX_ZOOM} />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  )
}
