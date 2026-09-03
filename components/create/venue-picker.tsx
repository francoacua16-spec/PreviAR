'use client'

import { VENUE_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface VenuePickerProps {
  value: string | null
  onChange: (next: string | null) => void
}

/**
 * Dónde es la previa. Es un eje distinto de `type` (privada/abierta): ese
 * decide quién entra, este decide cómo se llega. Los náuticos van marcados
 * porque cambian el copy de dirección y de horario.
 */
export function VenuePicker({ value, onChange }: VenuePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {VENUE_TYPES.map((v) => {
        const on = value === v.key
        return (
          <button
            key={v.key}
            type="button"
            // Volver a tocar el elegido lo deselecciona: nadie queda encerrado.
            onClick={() => onChange(on ? null : v.key)}
            aria-pressed={on}
            className={cn(
              'press flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold',
              'transition-[background-color,border-color,color] duration-150',
              on
                ? v.nautical
                  ? 'border-neon-lilac/70 bg-accent/15 text-neon-lilac'
                  : 'border-neon-violet/70 bg-primary/20 text-neon-violet'
                : 'border-white/10 bg-white/[0.03] text-muted-foreground'
            )}
          >
            <span aria-hidden>{v.emoji}</span>
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
