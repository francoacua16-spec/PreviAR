'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateForm } from './create-form'
import type { City } from '@/lib/zones'

interface CreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  city: City
  withAutocomplete: boolean
  onCreated: (partyId: string) => void
}

export function CreateDialog({ open, onOpenChange, city, withAutocomplete, onCreated }: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="brand-gradient-text">+ Crear Previa</DialogTitle>
          <DialogDescription>
            Se publica por zona, sin dirección. Vivirá 8 horas y morirá sola.
          </DialogDescription>
        </DialogHeader>
        <CreateForm
          city={city}
          withAutocomplete={withAutocomplete}
          onCreated={(id) => {
            onOpenChange(false)
            onCreated(id)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
