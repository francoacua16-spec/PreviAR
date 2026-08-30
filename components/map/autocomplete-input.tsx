'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  /** Devuelve coordenadas + dirección formateada al elegir un lugar. */
  onPlaceSelected: (lat: number, lng: number, formattedAddress: string) => void
}

/**
 * Autocomplete de Google Places (sin UI de Google: lista propia).
 * Requiere la librería "places" cargada por <APIProvider libraries={['places']}>.
 */
export function AutocompleteInput({ value, onChange, onPlaceSelected }: AutocompleteInputProps) {
  const places = useMapsLibrary('places')
  const [service, setService] = useState<google.maps.places.AutocompleteService | null>(null)
  const [detailsService, setDetailsService] = useState<google.maps.places.PlacesService | null>(null)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!places) return
    setService(new places.AutocompleteService())
    setDetailsService(new places.PlacesService(document.createElement('div')))
  }, [places])

  function handleInput(text: string) {
    onChange(text)
    if (!service) return
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(() => {
      service.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: 'ar' },
          types: ['geocode', 'establishment'],
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setSuggestions(results.slice(0, 5))
            setOpen(true)
          } else {
            setSuggestions([])
            setOpen(false)
          }
        }
      )
    }, 250)
  }

  function pick(prediction: google.maps.places.AutocompletePrediction) {
    onChange(prediction.description)
    setOpen(false)
    setSuggestions([])
    detailsService?.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry.location', 'formatted_address'],
      },
      (result, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          result?.geometry?.location
        ) {
          onPlaceSelected(
            result.geometry.location.lat(),
            result.geometry.location.lng(),
            result.formatted_address ?? prediction.description
          )
        }
      }
    )
  }

  return (
    <div className="relative">
      <Input
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
            <li key={s.place_id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left text-sm transition-colors hover:bg-white/5"
                onClick={() => pick(s)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                <span className="leading-snug">{s.description}</span>
              </button>
            </li>
          ))}
          <li className="px-3.5 py-1.5 text-right text-[10px] text-muted-foreground/70">
            Lugares por Google
          </li>
        </ul>
      )}
    </div>
  )
}
