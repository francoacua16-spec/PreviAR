'use client'

import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/components/providers'
import { friendlyError, reportParty } from '@/lib/api'

const REASONS = [
  'Dirección falsa o engañosa',
  'Es un evento público / venta de entradas',
  'Spam o contenido inapropiado',
  'Me hace sentir inseguro',
  'Otro motivo',
]

export function ReportDialog({ partyId }: { partyId: string }) {
  const { supabase } = useUser()
  const [reason, setReason] = useState(REASONS[0])
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await reportParty(supabase, partyId, `${reason}${detail.trim() ? ` — ${detail.trim()}` : ''}`)
      toast.success('Gracias por avisar. Lo revisamos.')
      setOpen(false)
      setDetail('')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-semibold text-muted-foreground transition-colors hover:border-zone-red/40 hover:text-zone-red"
        >
          <Flag className="h-3.5 w-3.5" /> Reportar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Reportar previa</DialogTitle>
          <DialogDescription>
            Tu reporte es anónimo para el anfitrión y se borra con la previa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {REASONS.map((r) => (
              <option key={r} value={r} className="bg-[#131316]">
                {r}
              </option>
            ))}
          </select>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Contanos más (opcional)"
            maxLength={300}
          />
          <Button className="w-full" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar reporte'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
