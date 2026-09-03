'use client'

import { Check } from 'lucide-react'
import { MAX_GENRES, MUSIC_GENRES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface GenrePickerProps {
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * Qué suena en la previa. Multi-select porque una previa real nunca es de un
 * género solo, con tope en {@link MAX_GENRES}: si elegís todo, dejás de decir nada.
 * Al menos uno es obligatorio — lo valida también el RPC.
 */
export function GenrePicker({ value, onChange }: GenrePickerProps) {
  const full = value.length >= MAX_GENRES

  function toggle(key: string) {
    if (value.includes(key)) {
      onChange(value.filter((g) => g !== key))
      return
    }
    if (full) return
    onChange([...value, key])
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {MUSIC_GENRES.map((g) => {
          const on = value.includes(g.key)
          const blocked = !on && full
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => toggle(g.key)}
              disabled={blocked}
              aria-pressed={on}
              className={cn(
                'press flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold',
                'transition-[background-color,border-color,color] duration-150',
                on
                  ? 'border-neon-violet/70 bg-primary/20 text-neon-violet'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground',
                blocked && 'opacity-35'
              )}
            >
              <span aria-hidden>{g.emoji}</span>
              {g.label}
              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </button>
          )
        })}
      </div>

      <p className="type-caption text-[11px] text-muted-foreground/75">
        {value.length === 0
          ? 'Elegí al menos uno. Define qué temas te pueden pedir para el DJ.'
          : full
            ? `Máximo ${MAX_GENRES}. Sacá uno para cambiar.`
            : `${value.length} de ${MAX_GENRES} elegidos.`}
      </p>
    </div>
  )
}
