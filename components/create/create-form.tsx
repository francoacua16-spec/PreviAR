'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Loader2, Lock, PartyPopper, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/components/providers'
import { AutocompleteInput } from '@/components/map/autocomplete-input'
import { createParty, friendlyError, setUserCity } from '@/lib/api'
import { CITY_LEGAL_LIMITS, PARTY_DURATION_HOURS } from '@/lib/constants'
import { getCity, getZone, type City } from '@/lib/zones'
import { toDateTimeLocalValue } from '@/lib/format'
import type { PartyType } from '@/lib/types'
import { LegalModal } from './legal-modal'
import { cn } from '@/lib/utils'

interface CreateFormProps {
  city: City
  onCreated: (partyId: string) => void
}

export function CreateForm({ city, onCreated }: CreateFormProps) {
  const { supabase, user } = useUser()
  const cityDef = getCity(city)
  const legalLimit = CITY_LEGAL_LIMITS[city]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [zone, setZone] = useState(cityDef.zones[0].key)
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 3 * 3600_000)))
  const [type, setType] = useState<PartyType>('private')
  const [maxPeople, setMaxPeople] = useState(20)
  const [legalOk, setLegalOk] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const needsLegal = maxPeople > legalLimit
  const minDateTime = useMemo(() => toDateTimeLocalValue(new Date()), [])

  function setCityProfile() {
    if (user) setUserCity(supabase, user.id, city)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (title.trim().length < 3) {
      toast.error('Poné un título con al menos 3 caracteres.')
      return
    }
    if (!startAt) {
      toast.error('Elegí fecha y hora de inicio.')
      return
    }
    if (needsLegal && !legalOk) {
      setLegalOpen(true)
      return
    }

    void doCreate()
  }

  async function doCreate() {
    setSubmitting(true)
    try {
      const zoneDef = getZone(city, zone)
      const partyId = await createParty(supabase, {
        title,
        description: description.trim() ? description.trim() : null,
        city,
        zone,
        address: address.trim() ? address.trim() : null,
        lat: lat ?? (zoneDef ? zoneDef.lat : null),
        lng: lng ?? (zoneDef ? zoneDef.lng : null),
        startAt: new Date(startAt).toISOString(),
        maxPeople,
        type,
        legalOk,
      })
      setCityProfile()
      toast.success('Previa creada 🔥 Compartí el link y que se llene.')
      onCreated(partyId)
    } catch (err) {
      toast.error(friendlyError(err as { message?: string }))
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="party-title">Título *</Label>
          <Input
            id="party-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Previa en lo de Cami 🍻"
            maxLength={60}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="party-description">Descripción</Label>
          <Textarea
            id="party-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Temática, qué llevar, música, hasta qué hora…"
            maxLength={400}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="party-zone">Zona *</Label>
            <select
              id="party-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {cityDef.zones.map((z) => (
                <option key={z.key} value={z.key} className="bg-[#131316]">
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="party-capacity">Máx. personas *</Label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="party-capacity"
                type="number"
                min={1}
                max={500}
                value={maxPeople}
                onChange={(e) => setMaxPeople(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="party-address">
            Dirección <span className="normal-case tracking-normal text-muted-foreground/70">(privada — solo la ven tus aprobados)</span>
          </Label>
          <AutocompleteInput
            value={address}
            onChange={(v) => {
              setAddress(v)
              setLat(null)
              setLng(null)
            }}
            onPlaceSelected={(la, ln, formatted) => {
              setAddress(formatted)
              setLat(la)
              setLng(ln)
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="party-start">Cuándo arranca *</Label>
          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="party-start"
              type="datetime-local"
              value={startAt}
              min={minDateTime}
              onChange={(e) => setStartAt(e.target.value)}
              className="pl-9 [color-scheme:dark]"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Expira sola a las {PARTY_DURATION_HOURS} horas. Después no queda rastro.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('private')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all',
                type === 'private'
                  ? 'border-neon-pink bg-primary/15 text-neon-pink shadow-neon-pink'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground'
              )}
            >
              <Lock className="h-4 w-4" /> Privada con aprobación
            </button>
            <button
              type="button"
              onClick={() => setType('open')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all',
                type === 'open'
                  ? 'border-neon-cyan bg-accent/10 text-neon-cyan shadow-neon-cyan'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground'
              )}
            >
              <PartyPopper className="h-4 w-4" /> Abierta
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            {type === 'private'
              ? 'Vos aprobás quién entra. La dirección se desbloquea solo para aprobados.'
              : 'Cualquiera se suma al toque. La dirección se muestra al unirse.'}
          </p>
        </div>

        {needsLegal && (
          <div className="rounded-xl border border-zone-yellow/25 bg-zone-yellow/[0.06] p-3 text-xs leading-relaxed text-zone-yellow">
            ⚠️ Más de {legalLimit} personas en {cityDef.label} requiere aceptar la declaración de
            responsabilidad legal.
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando…
            </>
          ) : (
            'Crear previa 🔥'
          )}
        </Button>
      </form>

      <LegalModal
        open={legalOpen}
        onOpenChange={setLegalOpen}
        city={city}
        maxPeople={maxPeople}
        accepted={legalOk}
        onAccept={() => {
          setLegalOk(true)
          void doCreate()
        }}
        onDecline={() => setLegalOk(false)}
      />
    </>
  )
}
