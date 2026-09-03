'use client'

import { cn } from '@/lib/utils'
import { CITIES, type City } from '@/lib/zones'

interface CityPickerProps {
  city: City
  onChange: (city: City) => void
}

export function CityPicker({ city, onChange }: CityPickerProps) {
  // z-40: por encima del LoginGate (z-30). Sin sesión el mapa no se toca,
  // pero cambiar de ciudad sí, si no los botones parecen rotos.
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[var(--header-h)] z-[35] mt-2 flex justify-center px-4">
      <div className="pointer-events-auto no-scrollbar glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1 sm:max-w-md md:max-w-lg">
        {CITIES.map((c) => {
          const active = c.key === city
          return (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all',
                active
                  ? 'bg-gradient-to-r from-neon-violet to-neon-lilac text-black shadow-neon-violet'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
