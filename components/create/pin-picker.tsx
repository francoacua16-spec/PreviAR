'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Crosshair, Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'

// Leaflet toca window: solo cliente.
const PinPickerCanvas = dynamic(() => import('./pin-picker-canvas').then((m) => m.PinPickerCanvas), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
  ),
})

interface PinPickerProps {
  lat: number | null
  lng: number | null
  /** Punto al que caer si todavía no hay pin (centro de la zona elegida). */
  fallback: { lat: number; lng: number }
  /** Se dispara al arrastrar el pin, tocar el mapa o usar la ubicación real. */
  onMove: (lat: number, lng: number) => void
  /** Dirección que resolvió la geocodificación inversa del punto nuevo. */
  onAddressResolved: (address: string) => void
  nautical?: boolean
}

/**
 * Ajuste manual del punto exacto. El autocomplete acierta la cuadra pero casi
 * nunca la casa: acá el host corrige arrastrando. El pin arrastrado es el que
 * se guarda, y la dirección escrita se reescribe con la del punto nuevo para
 * que texto y pin nunca digan cosas distintas.
 */
export function PinPicker({
  lat,
  lng,
  fallback,
  onMove,
  onAddressResolved,
  nautical,
}: PinPickerProps) {
  const [locating, setLocating] = useState(false)
  const [resolving, setResolving] = useState(false)

  const hasPin = lat !== null && lng !== null
  const shownLat = lat ?? fallback.lat
  const shownLng = lng ?? fallback.lng

  async function handleMove(nextLat: number, nextLng: number) {
    onMove(nextLat, nextLng)
    setResolving(true)
    try {
      const res = await fetch(`/api/geocode?lat=${nextLat}&lng=${nextLng}`)
      const data = (await res.json()) as { label: string | null }
      if (data.label) onAddressResolved(data.label)
    } catch {
      // Sin red o Nominatim caído: el pin vale igual, la dirección la escribe el host.
    } finally {
      setResolving(false)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no comparte ubicación.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        void handleMove(p.coords.latitude, p.coords.longitude)
      },
      () => {
        setLocating(false)
        toast.error('No pudimos leer tu ubicación. Movés el pin a mano y listo.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-neon-violet/30">
        <div className="absolute inset-0 z-0">
          <PinPickerCanvas lat={shownLat} lng={shownLng} onMove={handleMove} />
        </div>

        <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon-violet backdrop-blur">
          {hasPin ? 'Arrastrá el pin al punto exacto' : 'Tocá el mapa para marcar el punto'}
        </span>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Usar mi ubicación actual"
          className="press glass absolute bottom-2.5 right-2.5 z-10 flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-foreground disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-neon-lilac" />
          )}
          Estoy acá
        </button>
      </div>

      <p className="type-caption flex items-start gap-1.5 text-[11px] text-muted-foreground/75">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-violet" />
        <span>
          {resolving
            ? 'Buscando la dirección del punto…'
            : nautical
              ? 'Marcá el amarre o la dársena desde donde zarpan. Solo lo ven tus aprobados.'
              : 'Este punto es el que ven tus aprobados. El resto solo ve la zona.'}
        </span>
      </p>
    </div>
  )
}
