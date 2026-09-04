'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { cityLegalLimit } from '@/lib/constants'
import { getCity, type City } from '@/lib/zones'

interface LegalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  city: City
  maxPeople: number
  accepted: boolean
  onAccept: () => void
  onDecline: () => void
}

/**
 * Modal legal obligatorio (Pilar B — Anti-denuncia).
 * Se abre cuando max_people supera el límite de la ciudad
 * (50 en La Plata, 40 en el resto; sale de `cities.legal_limit`). No se puede
 * crear sin aceptar.
 */
export function LegalModal({
  open,
  onOpenChange,
  city,
  maxPeople,
  accepted,
  onAccept,
  onDecline,
}: LegalModalProps) {
  const cityDef = getCity(city)
  const limit = cityLegalLimit(city)
  const [checked, setChecked] = useState(accepted)

  useEffect(() => {
    if (open) setChecked(accepted)
  }, [open, accepted])

  function confirm() {
    onAccept()
    onOpenChange(false)
  }

  function decline() {
    onDecline()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-zone-red/15">
            <TriangleAlert className="h-6 w-6 text-zone-red" />
          </div>
          <DialogTitle className="text-lg">Atención legal — {cityDef.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
          <p className="rounded-2xl border border-zone-red/25 bg-zone-red/[0.06] p-4">
            En una reunión de más de <strong className="text-zone-red">{limit} personas</strong> con
            acceso abierto puede ser considerada <strong>Evento Privado</strong> según la ordenanza
            municipal y puede requerir habilitación.
          </p>
          <p>
            PreviAR es solo un tablón entre privados. <strong>Vos sos el único responsable</strong> del
            inmueble y de los ruidos. {maxPeople > 0 && `Estás declarando una capacidad de ${maxPeople} personas.`}
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-snug">
              Confirmo que es una reunión privada, <strong>sin venta de entradas</strong> al público
              general.
            </span>
          </label>
        </div>

        <div className="flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={decline}>
            Volver y ajustar
          </Button>
          <Button className="flex-1" disabled={!checked} onClick={confirm}>
            Acepto y continúo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
