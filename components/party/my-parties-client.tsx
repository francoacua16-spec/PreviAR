'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarHeart, Clock, Loader2, MapPin, PartyPopper, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/components/providers'
import { listMyParties, searchParties } from '@/lib/api'
import { formatWhen } from '@/lib/format'
import { genreEmoji, genreLabel, venueDef } from '@/lib/constants'
import { zoneLabel, type City } from '@/lib/zones'
import type { MyPartyRow, SearchPartyRow } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tab = 'armadas' | 'voy'

/**
 * "Mis previas": las que armé y a las que voy, en una sola pantalla con dos
 * pestañas. No hay RPC de "previas a las que voy", así que se deriva del
 * my_status que ya devuelve search_parties — sin migración nueva.
 */
export function MyPartiesClient() {
  const { supabase, user } = useUser()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('armadas')
  const [mine, setMine] = useState<MyPartyRow[]>([])
  const [going, setGoing] = useState<SearchPartyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)

    Promise.all([
      listMyParties(supabase).catch(() => [] as MyPartyRow[]),
      searchParties(supabase, { city: null, q: '', genres: [], venues: [], pos: null }).catch(
        () => [] as SearchPartyRow[]
      ),
    ])
      .then(([hosted, all]) => {
        if (!active) return
        setMine(hosted)
        setGoing(all.filter((p) => p.my_status === 'approved' || p.my_status === 'pending'))
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [supabase, user])

  const pending = mine.reduce((acc, p) => acc + p.pending_count, 0)

  return (
    <main className="pb-tabbar mx-auto min-h-dvh w-full max-w-lg px-4 pt-5">
      <h1 className="type-display font-display text-2xl font-bold">Mis previas</h1>
      <p className="type-caption mt-1 text-xs text-muted-foreground">
        Las que armaste y a las que vas, en un solo lugar.
      </p>

      {/* Segmentado: dos estados, siempre visibles, sin menús escondidos. */}
      <div
        role="tablist"
        aria-label="Filtrar mis previas"
        className="mt-4 flex gap-1 rounded-2xl bg-white/[0.04] p-1"
      >
        <SegTab on={tab === 'armadas'} onClick={() => setTab('armadas')} badge={pending}>
          Que armé ({mine.length})
        </SegTab>
        <SegTab on={tab === 'voy'} onClick={() => setTab('voy')}>
          A las que voy ({going.length})
        </SegTab>
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-neon-violet" />
        </div>
      ) : tab === 'armadas' ? (
        mine.length === 0 ? (
          <Empty
            icon={<PartyPopper className="mx-auto mb-3 h-9 w-9 text-neon-lilac" />}
            text="Todavía no armaste ninguna."
            cta="Armar la primera"
            onCta={() => router.push('/?crear=1')}
          />
        ) : (
          <ul className="mt-4 space-y-2.5">
            {mine.map((row) => (
              <li key={row.id}>
                <button
                  onClick={() => router.push(`/party/${row.id}`)}
                  className="press-soft glass w-full rounded-2xl p-4 text-left transition-colors hover:border-neon-violet/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-display text-base font-bold">
                      {row.title}
                    </p>
                    {row.pending_count > 0 && (
                      <Badge variant="warning">⏳ {row.pending_count} por aprobar</Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {zoneLabel(row.city as City, row.zone_text)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWhen(row.start_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {row.attendees_count}/{row.max_people}
                    </span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : going.length === 0 ? (
        <Empty
          icon={<CalendarHeart className="mx-auto mb-3 h-9 w-9 text-neon-lilac" />}
          text="No pediste entrar a ninguna previa activa."
          cta="Buscar previas"
          onCta={() => router.push('/buscar')}
        />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {going.map((row) => {
            const venue = venueDef(row.venue_type)
            return (
              <li key={row.id}>
                <button
                  onClick={() => router.push(`/party/${row.id}`)}
                  className="press-soft glass w-full rounded-2xl p-4 text-left transition-colors hover:border-neon-violet/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-display text-base font-bold">
                      {row.title}
                    </p>
                    {row.my_status === 'approved' ? (
                      <Badge variant="success">Vas</Badge>
                    ) : (
                      <Badge variant="warning">Pendiente</Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {zoneLabel(row.city, row.zone_text)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWhen(row.start_at)}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {venue && (
                      <Badge variant="outline">
                        {venue.emoji} {venue.label}
                      </Badge>
                    )}
                    {row.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-neon-lilac/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-neon-lilac"
                      >
                        {genreEmoji(g)} {genreLabel(g)}
                      </span>
                    ))}
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

function SegTab({
  on,
  onClick,
  badge = 0,
  children,
}: {
  on: boolean
  onClick: () => void
  badge?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        'press relative flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold',
        'transition-[background-color,color] duration-150',
        on ? 'bg-white/[0.10] text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
      {badge > 0 && (
        <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  )
}

function Empty({
  icon,
  text,
  cta,
  onCta,
}: {
  icon: React.ReactNode
  text: string
  cta: string
  onCta: () => void
}) {
  return (
    <div className="py-14 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
      <button
        onClick={onCta}
        className="press mx-auto mt-3 flex items-center gap-1.5 text-sm font-bold text-neon-violet"
      >
        <Plus className="h-4 w-4" /> {cta}
      </button>
    </div>
  )
}
