'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Suggestion {
  id: string
  lat: number
  lng: number
  label: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  /** Devuelve coordenadas + dirección formateada al elegir un lugar. */
  onPlaceSelected: (lat: number, lng: number, formattedAddress: string) => void
}

/**
 * Autocomplete de direcciones con Nominatim (OpenStreetMap), vía /api/geocode.
 * Debounce 600ms para respetar el rate-limit de Nominatim (1 req/s).
 */
export function AutocompleteInput({ value, onChange, onPlaceSelected }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      abort.current?.abort()
    },
    []
  )

  function handleInput(text: string) {
    onChange(text)
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(async () => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`, {
          signal: controller.signal,
        })
        const data = (await res.json()) as { results: Suggestion[] }
        setSuggestions(data.results ?? [])
        setOpen((data.results ?? []).length > 0)
      } catch {
        /* abortada o red caída: sin sugerencias */
      }
    }, 600)
  }

  function pick(s: Suggestion) {
    onChange(s.label)
    setOpen(false)
    setSuggestions([])
    onPlaceSelected(s.lat, s.lng, s.label)
  }

  return (
    <div className="relative">
      <Input
        id="party-address"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 3 && suggestions.length > 0) setOpen(true)
        }}
        placeholder="Calle y altura · ej: Calle 2 y 530, Tolosa"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-white/10 bg-[#16161A] shadow-card animate-fade-in">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left text-sm transition-colors hover:bg-white/5"
                onClick={() => pick(s)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                <span className="leading-snug">{s.label}</span>
              </button>
            </li>
          ))}
          <li className="px-3.5 py-1.5 text-right text-[10px] text-muted-foreground/70">
            Lugares por OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  )
}
