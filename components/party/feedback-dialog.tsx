'use client'

import { useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/components/providers'
import { submitPartyFeedback, friendlyError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partyId: string
  onDone?: () => void
}

export function FeedbackDialog({ open, onOpenChange, partyId, onDone }: FeedbackDialogProps) {
  const { supabase } = useUser()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function close() {
    onOpenChange(false)
    onDone?.()
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error('Elegí un puntaje de 1 a 5 ⭐')
      return
    }
    setSubmitting(true)
    try {
      await submitPartyFeedback(supabase, partyId, rating, comment.trim() ? comment.trim() : null)
      toast.success('¡Gracias por el feedback! 🙌')
      close()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Qué tal la previa?</DialogTitle>
          <DialogDescription>Un toque rápido antes de irte. Ayuda a mejorar PreviAR.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1"
              aria-label={`${n} estrellas`}
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  n <= rating ? 'fill-neon-violet text-neon-violet' : 'text-muted-foreground/40'
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué le faltaría? (opcional)"
          maxLength={300}
        />

        <div className="flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={close}>
            Omitir
          </Button>
          <Button className="flex-1" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
