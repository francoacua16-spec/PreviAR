'use client'

import dynamic from 'next/dynamic'

/** Mini-mapa: pin EXACTO para aprobados/host, círculo difuso para el resto. */
const MiniMapCanvas = dynamic(() => import('./mini-map-canvas').then((m) => m.MiniMapCanvas), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
  ),
})

interface MiniMapProps {
  lat: number
  lng: number
  approximate?: boolean
}

export function MiniMap({ lat, lng, approximate }: MiniMapProps) {
  return (
    <div
      className={
        approximate
          ? 'relative h-44 w-full overflow-hidden rounded-2xl border border-white/10'
          : 'relative h-44 w-full overflow-hidden rounded-2xl border border-neon-pink/30'
      }
    >
      {/* z-0: encierra los panes de Leaflet para que no tapen el cartel. */}
      <div className="absolute inset-0 z-0">
        <MiniMapCanvas lat={lat} lng={lng} approximate={approximate} />
      </div>
      <span
        className={
          approximate
            ? 'pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur'
            : 'pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon-pink backdrop-blur'
        }
      >
        {approximate ? 'Zona aproximada' : 'Pin exacto · solo vos y los aprobados'}
      </span>
    </div>
  )
}
