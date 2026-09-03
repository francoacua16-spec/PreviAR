'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { LABELS_URL, MAX_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-style'
import { exactPinDataUrl } from '@/components/map/marker-icons'

interface PinPickerCanvasProps {
  lat: number
  lng: number
  onMove: (lat: number, lng: number) => void
}

/**
 * Recentra el mapa cuando el punto cambia desde afuera (autocomplete, "usar mi
 * ubicación"). No se dispara cuando el cambio vino de arrastrar el pin: ahí el
 * mapa ya está donde tiene que estar y recentrar pelearía con el dedo.
 */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const last = useRef<string>('')

  useEffect(() => {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`
    if (last.current === key) return
    last.current = key

    const center = map.getCenter()
    const moved = map.distance(center, L.latLng(lat, lng))
    // Menos de 40 m es el propio arrastre del pin: no vale la pena mover nada.
    if (moved < 40) return
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true })
  }, [lat, lng, map])

  return null
}

/** Tocar el mapa mueve el pin ahí. Es el gesto que la gente prueba primero. */
function TapToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function PinPickerCanvas({ lat, lng, onMove }: PinPickerCanvasProps) {
  const icon = useMemo(
    () =>
      L.icon({
        iconUrl: exactPinDataUrl(),
        iconSize: [46, 54],
        iconAnchor: [23, 54],
        className: 'previar-draggable-pin',
      }),
    []
  )

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      className="h-full w-full bg-background"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
      <TileLayer url={LABELS_URL} maxZoom={MAX_ZOOM} />
      <TapToPlace onMove={onMove} />
      <Recenter lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={icon}
        draggable
        autoPan
        eventHandlers={{
          // Leaflet ya mueve el marker 1:1 con el dedo; acá solo levantamos el
          // valor final. `dragend` en vez de `drag` para no reverse-geocodificar
          // en cada frame.
          dragend(e) {
            const p = (e.target as L.Marker).getLatLng()
            onMove(p.lat, p.lng)
          },
        }}
      />
    </MapContainer>
  )
}
