'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, MapPin, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/components/providers'
import { useGeolocation } from '@/components/map/use-geolocation'
import { searchParties } from '@/lib/api'
import { MUSIC_GENRES, VENUE_TYPES, genreEmoji, genreLabel, venueDef } from '@/lib/constants'
import { formatWhen, vibeOf } from '@/lib/format'
import { CITIES, zoneLabel, type City } from '@/lib/zones'
import type { SearchPartyRow } from '@/lib/types'
import { cn } from '@/lib/utils'

const CITY_STORAGE_KEY = 'previar:city'

/**
 * Buscador: texto libre + géneros + tipo de lugar. Es la contraparte del mapa —
 * el mapa responde "¿qué hay cerca?", esto responde "¿dónde suena lo que quiero?".
 * Nunca devuelve coordenadas exactas: el RPC solo expone la zona aproximada.
 */
export function SearchClient() {
  const { supabase, user } = useUser()
  const router = useRouter()
  const { pos } = useGeolocation()

  const [city, setCity] = useState<City | null>(null)
  const [q, setQ] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [venues, setVenues] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [rows, setRows] = useState<SearchPartyRow[]>([])
  const [loading, setLoading] = useState(true)

  // Arranca en la ciudad que el usuario venía mirando en el mapa.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CITY_STORAGE_KEY)
      if (stored === 'caba' || stored === 'bariloche' || stored === 'la_plata') setCity(stored)
    } catch {
      // sin localStorage: buscamos en todas las ciudades
    }
  }, [])

  const run = useCallback(() => {
    if (!user) return
    setLoading(true)
    searchParties(supabase, { city, q, genres, venues, pos })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [supabase, user, city, q, genres, venues, pos])

  // Debounce del texto; los chips disparan al toque porque el usuario ya decidió.
  useEffect(() => {
    const t = setTimeout(run, q ? 350 : 0)
    return () => clearTimeout(t)
  }, [run, q])

  function toggle(list: string[], set: (v: string[]) => void, key: string) {
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key])
  }

  const activeFilters = genres.length + venues.length + (city ? 1 : 0)

  return (
    <main className="pb-tabbar mx-auto min-h-dvh w-full max-w-lg px-4 pt-5">
      <h1 className="type-display font-display text-2xl font-bold">Buscar previas</h1>
      <p className="type-caption mt-1 text-xs text-muted-foreground">
        Por nombre, zona, música o tipo de lugar. Solo previas activas.
      </p>

      {/* Búsqueda */}
      <div className="sticky top-0 z-20 -mx-4 mt-3 bg-background/85 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Techno en Tolosa, quinta, yate…"
            className="pl-9 pr-10"
            aria-label="Buscar previas"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Borrar búsqueda"
              className="press absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={cn(
            'press mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold',
            activeFilters > 0
              ? 'border-neon-violet/60 bg-primary/15 text-neon-violet'
              : 'border-white/10 text-muted-foreground'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros{activeFilters > 0 ? ` · ${activeFilters}` : ''}
        </button>

        {filtersOpen && (
          <div className="materialize mt-2.5 space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div>
              <p className="type-caption mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Ciudad
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={city === null} onClick={() => setCity(null)}>
                  Todas
                </Chip>
                {CITIES.map((c) => (
                  <Chip key={c.key} on={city === c.key} onClick={() => setCity(c.key)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="type-caption mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Música
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_GENRES.map((g) => (
                  <Chip
                    key={g.key}
                    on={genres.includes(g.key)}
                    onClick={() => toggle(genres, setGenres, g.key)}
                  >
                    {g.emoji} {g.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="type-caption mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Dónde
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_TYPES.map((v) => (
                  <Chip
                    key={v.key}
                    on={venues.includes(v.key)}
                    onClick={() => toggle(venues, setVenues, v.key)}
                  >
                    {v.emoji} {v.label}
                  </Chip>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGenres([])
                  setVenues([])
                  setCity(null)
                }}
                className="press text-[12px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-neon-violet" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center">
          <Search className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Nada con eso ahora mismo. Probá sacar filtros o mirá el mapa.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const vibe = vibeOf(r.attendees_count, r.max_people)
            const venue = venueDef(r.venue_type)
            return (
              <li key={r.id}>
                <button
                  onClick={() => router.push(`/party/${r.id}`)}
                  className="press-soft glass w-full rounded-2xl p-4 text-left transition-colors hover:border-neon-violet/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-display text-base font-bold">
                      {r.title}
                    </p>
                    <span aria-label={vibe.label} title={vibe.label} className="text-lg">
                      {vibe.emoji}
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {zoneLabel(r.city, r.zone_text)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWhen(r.start_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {r.attendees_count}/{r.max_people}
                    </span>
                    {r.distance_m != null && (
                      <span>
                        · a {r.distance_m < 1000
                          ? `${Math.round(r.distance_m)} m`
                          : `${(r.distance_m / 1000).toFixed(1)} km`}
                      </span>
                    )}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {venue && (
                      <Badge variant="outline">
                        {venue.emoji} {venue.label}
                      </Badge>
                    )}
                    {r.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-neon-lilac/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-neon-lilac"
                      >
                        {genreEmoji(g)} {genreLabel(g)}
                      </span>
                    ))}
                    {r.my_status === 'host' && <Badge variant="default">Tuya</Badge>}
                    {r.my_status === 'approved' && <Badge variant="success">Vas</Badge>}
                    {r.my_status === 'pending' && <Badge variant="warning">Pendiente</Badge>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'press rounded-full border px-2.5 py-1.5 text-[12px] font-semibold',
        'transition-[background-color,border-color,color] duration-150',
        on
          ? 'border-neon-violet/70 bg-primary/20 text-neon-violet'
          : 'border-white/10 bg-white/[0.03] text-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}
