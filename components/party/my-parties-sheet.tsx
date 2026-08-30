'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PartyPopper, Plus } from 'lucide-react'
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
import { friendlyError, listMyParties } from '@/lib/api'
import { formatWhen } from '@/lib/format'
import { zoneLabel, type City } from '@/lib/zones'
import type { MyPartyRow } from '@/lib/types'

interface MyPartiesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: () => void
}

export function MyPartiesSheet({ open, onOpenChange, onCreate }: MyPartiesSheetProps) {
  const { supabase, user } = useUser()
  const router = useRouter()
  const [rows, setRows] = useState<MyPartyRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    let active = true
    setLoading(true)
    listMyParties(supabase)
      .then((data) => active && setRows(data))
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, supabase, user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[72dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <SheetHeader className="mb-2">
          <SheetTitle>Mis previas</SheetTitle>
          <SheetDescription>
            Las que armaste vos. Aprobanzas acá y en cada pantalla de previa.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-neon-pink" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <PartyPopper className="h-10 w-10 text-neon-cyan" />
            <p className="text-sm text-muted-foreground">Todavía no armaste ninguna.</p>
            <button
              onClick={() => {
                onOpenChange(false)
                onCreate()
              }}
              className="flex items-center gap-1.5 text-sm font-bold text-neon-pink"
            >
              <Plus className="h-4 w-4" /> Crear la primera
            </button>
          </div>
        )}

        <div className="space-y-2.5">
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => {
                onOpenChange(false)
                router.push(`/party/${row.id}`)
              }}
              className="glass w-full rounded-2xl p-4 text-left transition-all hover:border-neon-pink/40 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {zoneLabel(row.city as City, row.zone_text)} · {formatWhen(row.start_at)}
                  </p>
                </div>
                {row.pending_count > 0 && (
                  <Badge variant="warning">⏳ {row.pending_count} por aprobar</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.attendees_count}/{row.max_people} confirmados
              </p>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
