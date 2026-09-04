'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CITIES, getCity, searchCities, type City } from '@/lib/zones'

interface CityPickerProps {
  city: City
  onChange: (city: City) => void
}

/**
 * Antes esto era una tira horizontal de botones, uno por ciudad. Con tres
 * entraba; con 59 el usuario tendría que arrastrar a ciegas para encontrar la
 * suya. Ahora es un botón con el nombre de la ciudad activa y una hoja con
 * buscador, que además matchea por provincia y por barrio: escribir "palermo"
 * lleva a CABA aunque no se sepa que Palermo es CABA.
 */
export function CityPicker({ city, onChange }: CityPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const active = getCity(city)
  const results = useMemo(() => (query.trim() ? searchCities(query) : CITIES), [query])

  // La búsqueda anterior no tiene por qué sobrevivir al cierre.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[var(--header-h)] z-[35] mt-2 flex justify-center px-4">
        <button
          onClick={() => setOpen(true)}
          className="press pointer-events-auto glass flex max-w-full items-center gap-2 rounded-full py-2 pl-4 pr-3 text-xs font-bold uppercase tracking-wider text-foreground"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-neon-lilac" strokeWidth={2.5} />
          <span className="truncate">{active.label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={3} />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          // El teclado del celular tapa media pantalla: si el foco automático
          // lo abre al entrar, la lista queda escondida antes de verla.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>¿Dónde estás?</SheetTitle>
            <SheetDescription>
              Buscá por ciudad, provincia o barrio. También podés mover el mapa a mano.
            </SheetDescription>
          </SheetHeader>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mar del Plata, Palermo, Córdoba…"
              className="pl-9"
              autoComplete="off"
            />
          </div>

          <div className="no-scrollbar -mx-1 mt-3 max-h-[46dvh] overflow-y-auto px-1">
            {results.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                No encontramos esa ciudad. Cerrá y movés el mapa hasta donde estés.
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map((c) => {
                  const isActive = c.key === city
                  return (
                    <li key={c.key}>
                      <button
                        onClick={() => {
                          onChange(c.key)
                          setOpen(false)
                        }}
                        className={cn(
                          'press flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors',
                          isActive
                            ? 'bg-gradient-to-r from-neon-violet to-neon-lilac text-black'
                            : 'bg-white/5 hover:bg-white/10'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-display text-sm font-bold">
                            {c.label}
                          </span>
                          <span
                            className={cn(
                              'block truncate text-[11px]',
                              isActive ? 'text-black/70' : 'text-muted-foreground'
                            )}
                          >
                            {c.province}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'ml-3 shrink-0 text-[10px] font-bold uppercase tracking-wider',
                            isActive ? 'text-black/70' : 'text-muted-foreground'
                          )}
                        >
                          {c.short}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
