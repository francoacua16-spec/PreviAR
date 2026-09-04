'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Music,
  PartyPopper,
  Ship,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/components/providers'
import { AutocompleteInput } from '@/components/map/autocomplete-input'
import { createParty, friendlyError, setUserCity } from '@/lib/api'
import { cityLegalLimit, PARTY_DURATION_HOURS, isNauticalVenue } from '@/lib/constants'
import { cityAt, getCity, getZone, nearestZone, type City } from '@/lib/zones'
import { toDateTimeLocalValue } from '@/lib/format'
import type { PartyType } from '@/lib/types'
import { LegalModal } from './legal-modal'
import { GenrePicker } from './genre-picker'
import { VenuePicker } from './venue-picker'
import { PinPicker } from './pin-picker'
import { cn } from '@/lib/utils'

interface CreateFormProps {
  city: City
  onCreated: (partyId: string) => void
}

/** Bloque titulado. Divide el formulario en decisiones, no en campos sueltos. */
function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <header className="flex items-center gap-2">
        <span className="text-neon-violet">{icon}</span>
        <h3 className="type-title text-[13px] font-bold uppercase tracking-wider text-foreground">
          {title}
        </h3>
      </header>
      {hint && <p className="type-caption -mt-1 text-[11px] text-muted-foreground/75">{hint}</p>}
      {children}
    </section>
  )
}

export function CreateForm({ city: initialCity, onCreated }: CreateFormProps) {
  const { supabase, user } = useUser()

  // La ciudad ya no la fija sólo el selector del mapa: con el paneo libre el
  // usuario puede estar mirando La Plata y poner el pin en Mar del Plata. La
  // decide el pin, y el selector es apenas el punto de partida.
  const [city, setCity] = useState<City>(initialCity)
  const cityDef = getCity(city)
  const legalLimit = cityLegalLimit(city)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [zone, setZone] = useState(cityDef.zones[0].key)
  const [address, setAddress] = useState('')
  const [arrivalNotes, setArrivalNotes] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 3 * 3600_000)))
  const [type, setType] = useState<PartyType>('private')
  const [genres, setGenres] = useState<string[]>([])
  const [venueType, setVenueType] = useState<string | null>(null)
  const [maxPeople, setMaxPeople] = useState(20)
  const [legalOk, setLegalOk] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const needsLegal = maxPeople > legalLimit
  const minDateTime = useMemo(() => toDateTimeLocalValue(new Date()), [])
  const zoneDef = getZone(city, zone)
  const nautical = isNauticalVenue(venueType)

  const hasPin = lat !== null && lng !== null
  const addressOk = address.trim().length >= 5

  // Al mover el pin, la ciudad y el barrio se reacomodan solos. Sin esto una
  // previa en Rosario se guardaba como La Plata / Tolosa y no aparecía en
  // ningún pin cerca de donde realmente es.
  useEffect(() => {
    if (lat === null || lng === null) return
    const found = cityAt(lat, lng)
    const nextCity = found?.key ?? city
    const zoneHit = nearestZone(nextCity, lat, lng)
    if (nextCity !== city) setCity(nextCity)
    if (zoneHit && zoneHit.key !== zone) setZone(zoneHit.key)
    // `zone` y `city` se leen pero no disparan: el efecto reacciona al pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  /**
   * Lo que falta, en orden de aparición en el formulario. Se muestra en el
   * botón: el usuario nunca aprieta a ciegas para descubrir qué le falta.
   */
  const missing = useMemo(() => {
    const out: string[] = []
    if (title.trim().length < 3) out.push('el título')
    if (!addressOk) out.push('la dirección')
    if (!hasPin) out.push('el punto en el mapa')
    if (genres.length === 0) out.push('el género musical')
    if (!startAt) out.push('la fecha')
    return out
  }, [title, addressOk, hasPin, genres.length, startAt])

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
    // Sin dirección la previa no sirve: antes se creaba igual y caía al centro
    // de la zona, así que la gente terminaba yendo a una esquina cualquiera.
    if (!addressOk) {
      toast.error(
        nautical
          ? 'Poné el puerto o amarre desde donde zarpan.'
          : 'Poné la dirección de la previa. Sin eso nadie llega.'
      )
      return
    }
    if (!hasPin) {
      toast.error('Marcá el punto exacto en el mapa: elegí una sugerencia o arrastrá el pin.')
      return
    }
    if (genres.length === 0) {
      toast.error('Elegí al menos un género musical.')
      return
    }
    if (!startAt) {
      toast.error('Elegí fecha y hora de inicio.')
      return
    }
    if (whatsapp.trim() && !/^\+?[0-9]{8,15}$/.test(whatsapp.trim())) {
      toast.error('WhatsApp inválido: solo dígitos, sin espacios ni guiones (8 a 15 números).')
      return
    }
    if (needsLegal && !legalOk) {
      setLegalOpen(true)
      return
    }

    void doCreate()
  }

  async function doCreate() {
    // Guard de último momento: `doCreate` también lo llama el modal legal.
    if (!addressOk || lat === null || lng === null || genres.length === 0) {
      toast.error('Faltan datos de la previa.')
      return
    }

    setSubmitting(true)
    try {
      const partyId = await createParty(supabase, {
        title,
        description: description.trim() ? description.trim() : null,
        city,
        zone,
        address: address.trim(),
        arrivalNotes: arrivalNotes.trim() ? arrivalNotes.trim() : null,
        whatsappNumber: whatsapp.trim() ? whatsapp.trim() : null,
        lat,
        lng,
        startAt: new Date(startAt).toISOString(),
        maxPeople,
        type,
        legalOk,
        genres,
        venueType,
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
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* ── 1. QUÉ ── */}
        <Section icon={<PartyPopper className="h-4 w-4" />} title="La previa">
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
              placeholder="Temática, qué llevar, hasta qué hora…"
              maxLength={400}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dónde es</Label>
            <VenuePicker value={venueType} onChange={setVenueType} />
          </div>
        </Section>

        {/* ── 2. MÚSICA ── */}
        <Section
          icon={<Music className="h-4 w-4" />}
          title="Música *"
          hint="Marca el clima de la previa y limita qué temas te pueden pedir para el DJ."
        >
          <GenrePicker value={genres} onChange={setGenres} />
        </Section>

        {/* ── 3. DÓNDE ── */}
        <Section
          icon={nautical ? <Ship className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          title={nautical ? 'Puerto y amarre *' : 'Dirección *'}
          hint="Privada: solo la ven tus aprobados. El resto ve la altura redondeada."
        >
          <div className="space-y-1.5">
            <Label htmlFor="party-address" className="sr-only">
              {nautical ? 'Puerto o amarre' : 'Dirección'}
            </Label>
            <AutocompleteInput
              value={address}
              onChange={(v) => {
                setAddress(v)
                // Texto escrito a mano ≠ punto elegido: se borra el pin para
                // que nadie cree una previa con dirección y pin distintos.
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

          <PinPicker
            lat={lat}
            lng={lng}
            fallback={{ lat: zoneDef?.lat ?? cityDef.center.lat, lng: zoneDef?.lng ?? cityDef.center.lng }}
            onMove={(la, ln) => {
              setLat(la)
              setLng(ln)
            }}
            onAddressResolved={(a) => setAddress(a)}
            nautical={nautical}
          />

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
            <Label htmlFor="party-arrival">
              Cómo llegar{' '}
              <span className="normal-case tracking-normal text-muted-foreground/70">
                (se desbloquea con la dirección)
              </span>
            </Label>
            <Textarea
              id="party-arrival"
              value={arrivalNotes}
              onChange={(e) => setArrivalNotes(e.target.value)}
              placeholder={
                nautical
                  ? 'Dársena 3, barco “Aurora”. Zarpamos 23:30 en punto, después no se puede subir.'
                  : 'Casa en la esquina de Campichuelo y El Ciprés, portón negro. Timbre 2B.'
              }
              maxLength={200}
            />
            {nautical && (
              <p className="type-caption text-[11px] text-zone-yellow/90">
                ⚓ Aclará la hora de zarpada: el que llega tarde se queda en el muelle.
              </p>
            )}
          </div>
        </Section>

        {/* ── 4. CUÁNDO Y QUIÉN ── */}
        <Section icon={<CalendarClock className="h-4 w-4" />} title="Cuándo y quién">
          <div className="space-y-1.5">
            <Label htmlFor="party-start">Arranca *</Label>
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
            <p className="type-caption text-[11px] text-muted-foreground/70">
              Expira sola a las {PARTY_DURATION_HOURS} horas. Después no queda rastro.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('private')}
                aria-pressed={type === 'private'}
                className={cn(
                  'press flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold',
                  'transition-[background-color,border-color,color] duration-150',
                  type === 'private'
                    ? 'border-neon-violet bg-primary/15 text-neon-violet shadow-neon-violet'
                    : 'border-white/10 bg-white/[0.03] text-muted-foreground'
                )}
              >
                <Lock className="h-4 w-4" /> Privada con aprobación
              </button>
              <button
                type="button"
                onClick={() => setType('open')}
                aria-pressed={type === 'open'}
                className={cn(
                  'press flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold',
                  'transition-[background-color,border-color,color] duration-150',
                  type === 'open'
                    ? 'border-neon-lilac bg-accent/10 text-neon-lilac shadow-neon-lilac'
                    : 'border-white/10 bg-white/[0.03] text-muted-foreground'
                )}
              >
                <PartyPopper className="h-4 w-4" /> Abierta
              </button>
            </div>
            <p className="type-caption text-[11px] text-muted-foreground/70">
              {type === 'private'
                ? 'Vos aprobás quién entra. La dirección se desbloquea solo para aprobados.'
                : 'Cualquiera se suma al toque. La dirección se muestra al unirse.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="party-whatsapp">WhatsApp (opcional)</Label>
            <div className="relative">
              <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="party-whatsapp"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5492211234567"
                maxLength={16}
                className="pl-9"
              />
            </div>
            <p className="type-caption text-[11px] text-muted-foreground/70">
              Se revela solo a aprobados, para que te escriban directo. Sin espacios ni guiones.
            </p>
          </div>
        </Section>

        {needsLegal && (
          <div className="rounded-xl border border-zone-yellow/25 bg-zone-yellow/[0.06] p-3 text-xs leading-relaxed text-zone-yellow">
            ⚠️ Más de {legalLimit} personas en {cityDef.label} requiere aceptar la declaración de
            responsabilidad legal.
          </div>
        )}

        {/* El botón nunca se deshabilita: apretarlo tiene que explicar qué falta,
            no quedarse mudo. Lo que falta ya se lee antes de apretar. */}
        <Button type="submit" className="press w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando…
            </>
          ) : (
            'Crear previa 🔥'
          )}
        </Button>

        {missing.length > 0 && !submitting && (
          <p className="type-caption text-center text-[11px] text-muted-foreground/80">
            Falta {missing.join(', ').replace(/, ([^,]*)$/, ' y $1')}.
          </p>
        )}
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
