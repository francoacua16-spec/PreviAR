'use client'

import { MapPin, Info } from 'lucide-react'
import type { City } from '@/lib/zones'
import type { CityZoneRow } from '@/lib/types'

interface MapFallbackProps {
  city: City
  zones: CityZoneRow[]
  onSelectZone: (zoneKey: string, zoneLabel: string) => void
}

/** Vista sin Google Maps (falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). */
export function MapFallback({ city, zones, onSelectZone }: MapFallbackProps) {
  const counts = new Map(zones.map((z) => [z.zone_text, Number(z.party_count)]))

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-32 pt-24">
      <div className="glass mb-4 flex items-start gap-2.5 rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
        <span>
          Modo lista: agregá <code className="text-neon-pink">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> a
          tu <code>.env.local</code> para ver el mapa oscuro.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {zones.length > 0 &&
          zones.map((z) => (
            <button
              key={z.zone_text}
              onClick={() => onSelectZone(z.zone_text, z.zone_text)}
              className="glass flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition-all hover:border-neon-pink/40 active:scale-[0.98]"
            >
              <MapPin className="h-4 w-4 text-neon-pink" />
              <span className="font-display text-sm font-bold capitalize">{z.zone_text}</span>
              <span className="text-xs text-muted-foreground">
                {z.party_count} previa{Number(z.party_count) === 1 ? '' : 's'}
              </span>
            </button>
          ))}
      </div>

      {zones.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Todavía no hay previas en {city === 'la_plata' ? 'La Plata' : city === 'caba' ? 'CABA' : 'Bariloche'}.
          ¡Creá la primera! 🔥
        </p>
      )}
    </div>
  )
}
