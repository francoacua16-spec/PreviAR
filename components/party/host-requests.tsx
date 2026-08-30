'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/components/providers'
import { friendlyError, getPartyRequests, respondRequest } from '@/lib/api'
import { formatWhen } from '@/lib/format'
import type { PartyRequestRow } from '@/lib/types'

/**
 * Panel del host: anti-clavo. Ve nombre + reputación de cada solicitante
 * y aprueba o rechaza. Realtime.
 */
export function HostRequests({ partyId }: { partyId: string }) {
  const { supabase } = useUser()
  const [rows, setRows] = useState<PartyRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getPartyRequests(supabase, partyId)
      setRows(data)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }, [supabase, partyId])

  useEffect(() => {
    void load()

    const channel = supabase
      .channel(`requests-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_requests',
          filter: `party_id=eq.${partyId}`,
        },
        () => void load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, partyId, load])

  async function respond(id: string, approve: boolean) {
    setBusyId(id)
    try {
      const result = await respondRequest(supabase, id, approve)
      if (result === 'already_handled') toast.info('Esa solicitud ya fue resuelta.')
      else toast.success(approve ? 'Aprobado ✅ Le avisamos con la dirección.' : 'Rechazado.')
      await load()
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusyId(null)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending')

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
          <UserRound className="h-4 w-4 text-neon-pink" /> Solicitudes
        </h2>
        {pending.length > 0 && <Badge variant="warning">{pending.length} pendientes</Badge>}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-neon-pink" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Todavía nadie pidió entrar. Compartí el link 📲
        </p>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan font-display text-xs font-bold text-black">
              {(r.user_name[0] ?? '?').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.user_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {'⭐'.repeat(Math.min(Math.max(r.reputation, 1), 5))} · {formatWhen(r.created_at)}
              </p>
            </div>

            {r.status === 'pending' ? (
              <div className="flex gap-1.5">
                <button
                  onClick={() => void respond(r.id, true)}
                  disabled={busyId === r.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zone-green/15 text-zone-green transition-all hover:bg-zone-green/25 active:scale-90 disabled:opacity-40"
                  aria-label={`Aprobar a ${r.user_name}`}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </button>
                <button
                  onClick={() => void respond(r.id, false)}
                  disabled={busyId === r.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zone-red/15 text-zone-red transition-all hover:bg-zone-red/25 active:scale-90 disabled:opacity-40"
                  aria-label={`Rechazar a ${r.user_name}`}
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <Badge variant={r.status === 'approved' ? 'success' : 'destructive'}>
                {r.status === 'approved' ? '✓ Adentro' : '✗ Rechazado'}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
