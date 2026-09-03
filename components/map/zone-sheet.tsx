'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/components/providers'
import { friendlyError, listZoneParties } from '@/lib/api'
import { formatDistanceMeters } from '@/lib/distance'
import { formatWhen, vibeOf } from '@/lib/format'
import type { City } from '@/lib/zones'
import type { ZonePartyRow } from '@/lib/types'
import type { GeoPos } from './use-geolocation'

const MY_STATUS_BADGE: Record<string, { label: string; variant: 'accent' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  host: { label: '👑 Sos el host', variant: 'accent' },
  approved: { label: '✓ Aprobado', variant: 'success' },
  pending: { label: '⏳ Pendiente', variant: 'warning' },
  rejected: { label: '✗ Rechazado', variant: 'destructive' },
}

interface ZoneSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  city: City
  zoneKey: string | null
  zoneLabel: string
  pos: GeoPos | null
}

export function ZoneSheet({ open, onOpenChange, city, zoneKey, zoneLabel, pos }: ZoneSheetProps) {
  const { supabase, user } = useUser()
  const router = useRouter()
  const [rows, setRows] = useState<ZonePartyRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !zoneKey || !user) return
    let active = true
    setLoading(true)
    listZoneParties(supabase, city, zoneKey, pos)
      .then((data) => active && setRows(data))
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, zoneKey, city, pos, supabase, user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[72dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <SheetHeader className="mb-2">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-neon-violet" />
            {zoneLabel}
          </SheetTitle>
          <SheetDescription>
            {loading
              ? 'Buscando previas…'
              : rows.length === 0
                ? 'Todavía no hay previas acá. ¡Armá la primera! 🔥'
                : `${rows.length} previa${rows.length === 1 ? '' : 's'} activa${rows.length === 1 ? '' : 's'} en esta zona`}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-neon-violet" />
          </div>
        )}

        <div className="space-y-2.5">
          {rows.map((row) => {
            const vibe = vibeOf(row.attendees_count, row.max_people)
            const statusBadge = row.my_status ? MY_STATUS_BADGE[row.my_status] : null
            return (
              <button
                key={row.id}
                onClick={() => router.push(`/party/${row.id}`)}
                className="glass w-full rounded-2xl p-4 text-left transition-all hover:border-neon-violet/40 active:scale-[0.99] animate-fade-up"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Hasta {row.max_people} · {formatWhen(row.start_at)}
                    </p>
                  </div>
                  <span className="text-lg" aria-hidden>
                    {vibe.emoji}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={vibe.tone === 'green' ? 'success' : vibe.tone === 'yellow' ? 'warning' : 'destructive'}>
                    {vibe.label}
                  </Badge>
                  {row.distance_m != null && (
                    <Badge variant="outline">{formatDistanceMeters(row.distance_m)} tuyo</Badge>
                  )}
                  {row.attendees_count > 0 && (
                    <Badge variant="outline">
                      {row.attendees_count}/{row.max_people} confirmados
                    </Badge>
                  )}
                  {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
                </div>
              </button>
            )
          })}
        </div>

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <PartyPopper className="h-10 w-10 text-neon-lilac" />
            <p className="text-sm text-muted-foreground">
              Tocá <span className="font-semibold text-neon-violet">+ Crear Previa</span> y que corra la voz.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
