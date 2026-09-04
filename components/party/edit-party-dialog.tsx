'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { hostUpdateParty, friendlyError } from '@/lib/api'
import { useUser } from '@/components/providers'
import { cityLegalLimit } from '@/lib/constants'
import { LegalModal } from '@/components/create/legal-modal'
import { GenrePicker } from '@/components/create/genre-picker'
import { VenuePicker } from '@/components/create/venue-picker'
import type { PartyRow } from '@/lib/types'

interface EditPartyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  party: PartyRow
  onUpdated: (fields: {
    title: string
    description: string | null
    arrivalNotes: string | null
    whatsappNumber: string | null
    maxPeople: number
    genres: string[]
    venueType: string | null
  }) => void
}

export function EditPartyDialog({ open, onOpenChange, party, onUpdated }: EditPartyDialogProps) {
  const { supabase } = useUser()
  const legalLimit = cityLegalLimit(party.city)

  const [title, setTitle] = useState(party.title)
  const [description, setDescription] = useState(party.description ?? '')
  const [arrivalNotes, setArrivalNotes] = useState(party.arrival_notes ?? '')
  const [whatsapp, setWhatsapp] = useState(party.whatsapp_number ?? '')
  const [maxPeople, setMaxPeople] = useState(party.max_people)
  const [genres, setGenres] = useState<string[]>(party.genres ?? [])
  const [venueType, setVenueType] = useState<string | null>(party.venue_type)
  const [legalOpen, setLegalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const needsLegal = maxPeople > legalLimit

  // El diálogo queda montado siempre, así que sus useState sólo leen `party`
  // la primera vez. Sin esto, editar dos veces seguidas mostraba los valores
  // de la primera edición, y el segundo guardado los reescribía pisando lo
  // que ya se había guardado. Se re-siembra cada vez que se abre.
  const seeded = useRef(false)
  useEffect(() => {
    if (!open) {
      seeded.current = false
      return
    }
    // Sólo en la transición a abierto: `party` cambia de identidad en cada
    // refetch, y re-sembrar con el diálogo abierto le borraría al host lo que
    // está escribiendo.
    if (seeded.current) return
    seeded.current = true
    setTitle(party.title)
    setDescription(party.description ?? '')
    setArrivalNotes(party.arrival_notes ?? '')
    setWhatsapp(party.whatsapp_number ?? '')
    setMaxPeople(party.max_people)
    setGenres(party.genres ?? [])
    setVenueType(party.venue_type)
  }, [open, party])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (title.trim().length < 3) {
      toast.error('Poné un título con al menos 3 caracteres.')
      return
    }
    if (whatsapp.trim() && !/^\+?[0-9]{8,15}$/.test(whatsapp.trim())) {
      toast.error('WhatsApp inválido: solo dígitos, sin espacios ni guiones (8 a 15 números).')
      return
    }
    if (maxPeople < party.attendees_count) {
      toast.error(`Ya hay ${party.attendees_count} confirmados: no podés bajar de eso.`)
      return
    }
    if (genres.length === 0) {
      toast.error('Dejá al menos un género musical.')
      return
    }
    if (needsLegal) {
      setLegalOpen(true)
      return
    }
    void doSave()
  }

  async function doSave() {
    setSubmitting(true)
    try {
      const fields = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        arrivalNotes: arrivalNotes.trim() ? arrivalNotes.trim() : null,
        whatsappNumber: whatsapp.trim() ? whatsapp.trim() : null,
        maxPeople,
        genres,
        venueType,
      }
      await hostUpdateParty(supabase, party.id, fields)
      onUpdated(fields)
      toast.success('Previa actualizada ✅')
      onOpenChange(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar previa</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-capacity">Máx. personas</Label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  max={500}
                  value={maxPeople}
                  onChange={(e) => setMaxPeople(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Música</Label>
              <GenrePicker value={genres} onChange={setGenres} />
              <p className="type-caption text-[11px] text-zone-yellow/85">
                Si sacás un género, los temas pedidos de ese género se borran.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Dónde es</Label>
              <VenuePicker value={venueType} onChange={setVenueType} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-arrival">Cómo llegar</Label>
              <Textarea
                id="edit-arrival"
                value={arrivalNotes}
                onChange={(e) => setArrivalNotes(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-whatsapp">WhatsApp (opcional)</Label>
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-whatsapp"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  maxLength={16}
                  className="pl-9"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LegalModal
        open={legalOpen}
        onOpenChange={setLegalOpen}
        city={party.city}
        maxPeople={maxPeople}
        accepted={false}
        onAccept={() => {
          setLegalOpen(false)
          void doSave()
        }}
        onDecline={() => setLegalOpen(false)}
      />
    </>
  )
}
