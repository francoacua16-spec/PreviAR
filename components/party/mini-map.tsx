'use client'

import { useEffect, useState } from 'react'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { DARK_MAP_STYLE } from '@/lib/map-style'
import { exactPinDataUrl } from '@/components/map/marker-icons'

/** Mini-mapa con el pin EXACTO (solo para aprobados o host). */
export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const [loaded, setLoaded] = useState(false)

  if (!apiKey) {
    return (
      <div className="flex h-44 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xs text-muted-foreground">
        Mapa no disponible (falta API key)
      </div>
    )
  }

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-neon-pink/30">
      <APIProvider apiKey={apiKey} region="AR" language="es">
        <Map
          defaultCenter={{ lat, lng }}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          styles={DARK_MAP_STYLE}
          onTilesLoaded={() => setLoaded(true)}
        >
          <Marker position={{ lat, lng }} icon={exactPinDataUrl()} />
        </Map>
      </APIProvider>
      <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon-pink backdrop-blur">
        Pin exacto · solo vos y los aprobados
      </span>
      {!loaded && (
        <div className="absolute inset-0 z-10 animate-pulse bg-white/[0.03]" aria-hidden />
      )}
    </div>
  )
}
