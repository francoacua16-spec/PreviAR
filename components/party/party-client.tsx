'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DoorOpen,
  Hourglass,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  QrCode,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUser } from '@/components/providers'
import {
  checkIn,
  friendlyError,
  getParty,
  hostCancelParty,
  hostMarkFull,
  leaveParty,
  partyCheckinTimes,
  requestToJoin,
} from '@/lib/api'
import { formatCountdown, formatWhen, vibeOf } from '@/lib/format'
import { genreEmoji, genreLabel, venueDef } from '@/lib/constants'
import { getCity, zoneLabel } from '@/lib/zones'
import type { MyStatus, PartyRow } from '@/lib/types'
import { Chat } from './chat'
import { EditPartyDialog } from './edit-party-dialog'
import { FeedbackDialog } from './feedback-dialog'
import { HostRequests } from './host-requests'
import { InviteDialog } from './invite-dialog'
import { MiniMap } from './mini-map'
import { ReportDialog } from './report-dialog'
import { SongRequests } from './song-requests'
import { cn } from '@/lib/utils'

interface PartyClientProps {
  initialParty: PartyRow
  currentUserId: string
}

export function PartyClient({ initialParty, currentUserId }: PartyClientProps) {
  const { supabase } = useUser()
  const router = useRouter()

  const [party, setParty] = useState<PartyRow>(initialParty)
  const [myStatus, setMyStatus] = useState<MyStatus>(initialParty.my_status)
  const [checkedIn, setCheckedIn] = useState(initialParty.checked_in)
  const [attendees, setAttendees] = useState(initialParty.attendees_count)
  const [expired, setExpired] = useState(
    new Date(initialParty.expires_at).getTime() <= Date.now()
  )
  const [working, setWorking] = useState(false)
  const [checkinTimes, setCheckinTimes] = useState<string[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const isHost = myStatus === 'host'
  const isApproved = isHost || myStatus === 'approved'
  const cancelled = party.status === 'cancelled'
  const cityDef = getCity(party.city)
  const vibe = vibeOf(attendees, party.max_people)
  const venue = venueDef(party.venue_type)

  // ── Registro horario de check-ins: lo ve cualquiera, sin nombres ─
  useEffect(() => {
    let active = true
    partyCheckinTimes(supabase, party.id)
      .then((times) => active && setCheckinTimes(times))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [supabase, party.id])

  // ── Realtime: contador de asistentes + mi solicitud + registro ──
  // OJO seguridad: Realtime manda el payload de UPDATE según la RLS de
  // SELECT (activa y no expirada), no según el GRANT SELECT (columnas) que
  // sí filtra queries normales. Por eso acá solo se mergean columnas de esa
  // misma whitelist — nunca address_hidden/arrival_notes/whatsapp_number/
  // lat_hidden/lng_hidden, que solo llegan gateados vía getParty() (poll).
  useEffect(() => {
    const channel = supabase
      .channel(`party-${party.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parties',
          filter: `id=eq.${party.id}`,
        },
        (payload) => {
          const p = payload.new as Record<string, unknown>
          setAttendees(p.attendees_count as number)
          setParty((prev) => ({
            ...prev,
            title: (p.title as string) ?? prev.title,
            description: (p.description as string | null) ?? prev.description,
            status: (p.status as string) ?? prev.status,
            max_people: (p.max_people as number) ?? prev.max_people,
            start_at: (p.start_at as string) ?? prev.start_at,
            expires_at: (p.expires_at as string) ?? prev.expires_at,
            // genres/venue_type están en el GRANT SELECT (0007): no son datos
            // gateados, así que mergearlos por realtime no filtra nada.
            genres: (p.genres as string[] | null) ?? prev.genres,
            venue_type: (p.venue_type as string | null) ?? prev.venue_type,
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'party_requests',
          filter: `party_id=eq.${party.id}`,
        },
        (payload) => {
          if (payload.new.user_id === currentUserId) {
            setMyStatus(payload.new.status as MyStatus)
            setCheckedIn(payload.new.checked_in)
            if (payload.new.status === 'approved') {
              toast.success('¡Te aprobaron! 🔓 Ya ves la dirección exacta.')
            }
          }
          if (payload.new.checked_in && payload.new.checked_in_at) {
            setCheckinTimes((prev) =>
              prev.includes(payload.new.checked_in_at)
                ? prev
                : [...prev, payload.new.checked_in_at as string].sort()
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, party.id, currentUserId])

  // ── Poll de respaldo cada 20s: re-corre el gating real server-side ──
  useEffect(() => {
    const id = setInterval(() => {
      getParty(supabase, party.id)
        .then((fresh) => {
          if (fresh) setParty(fresh)
        })
        .catch(() => {})
    }, 20_000)
    return () => clearInterval(id)
  }, [supabase, party.id])

  // ── Cuenta regresiva ─────────────────────────────────────────
  const refreshCountdown = useCallback(() => {
    setExpired(new Date(party.expires_at).getTime() <= Date.now())
  }, [party.expires_at])

  useEffect(() => {
    refreshCountdown()
    const t = setInterval(refreshCountdown, 30_000)
    return () => clearInterval(t)
  }, [refreshCountdown])

  // ── Encuesta automática: una vez, cuando termina la previa y vos participaste ──
  useEffect(() => {
    if (!(isHost || myStatus === 'approved')) return
    if (!(cancelled || expired)) return
    const key = `previar:feedback:${party.id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // sin sessionStorage, mostramos igual
    }
    setFeedbackOpen(true)
  }, [cancelled, expired, isHost, myStatus, party.id])

  // ── Acciones ─────────────────────────────────────────────────
  async function handleRequest() {
    if (working) return
    setWorking(true)
    try {
      const status = await requestToJoin(supabase, party.id)
      setMyStatus(status)
      if (status === 'approved') {
        toast.success('Estás adentro 🎉 La dirección ya es visible.')
      } else {
        toast.success('Solicitud enviada ⏳ El anfitrión decide.')
      }
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setWorking(false)
    }
  }

  async function handleCheckIn() {
    if (working) return
    setWorking(true)
    try {
      const count = await checkIn(supabase, party.id)
      setAttendees(count)
      setCheckedIn(true)
      toast.success('¡Bienvenido a la joda! 🍻')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setWorking(false)
    }
  }

  async function handleMarkFull() {
    if (working) return
    if (!window.confirm('¿Marcar la previa como llena? Nadie más va a poder pedir entrar.')) return
    setWorking(true)
    try {
      await hostMarkFull(supabase, party.id)
      setParty((prev) => ({ ...prev, max_people: Math.max(attendees, 1) }))
      toast.success('Previa marcada como llena 🔒')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setWorking(false)
    }
  }

  async function handleCancel() {
    if (working) return
    if (!window.confirm('¿Cancelar esta previa? No se puede deshacer.')) return
    setWorking(true)
    try {
      await hostCancelParty(supabase, party.id)
      toast.success('Previa cancelada')
      router.push('/')
    } catch (e) {
      toast.error(friendlyError(e))
      setWorking(false)
    }
  }

  async function handleLeave() {
    if (leaving) return
    if (!window.confirm('¿Abandonar esta previa? Perdés tu lugar.')) return
    setLeaving(true)
    try {
      await leaveParty(supabase, party.id)
      toast.success('Saliste de la previa 👋')
      setFeedbackOpen(true)
    } catch (e) {
      toast.error(friendlyError(e))
      setLeaving(false)
    }
  }

  // ── Compartir ────────────────────────────────────────────────
  const partyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/party/${party.id}` : ''

  function shareWhatsApp() {
    const text = `🍻 ${party.title} — PreviAR\n📍 ${zoneLabel(party.city, party.zone_text)}, ${cityDef.label}\n${
      isHost ? 'Pedime entrar y te paso la dirección 👇' : 'Pedí entrar acá 👇'
    } ${partyUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function openDirections() {
    if (party.lat_hidden == null || party.lng_hidden == null) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${party.lat_hidden},${party.lng_hidden}`,
      '_blank'
    )
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-12 pt-4">
      {/* Barra superior */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="glass flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Mapa
        </button>
        <ReportDialog partyId={party.id} />
      </div>

      {/* Índice de la previa. Aparece recién cuando la página se hace larga (ya
          aprobado: dirección + temas + chat + panel), que es cuando encontrar
          algo a puro scroll empieza a costar. */}
      {isApproved && !expired && !cancelled && (
        <SectionNav
          items={[
            { id: 'sec-lugar', label: '📍 Lugar' },
            ...(party.genres.length > 0
              ? [{ id: 'sec-musica', label: '🎧 Música' }]
              : []),
            { id: 'sec-chat', label: '💬 Chat' },
            ...(isHost ? [{ id: 'sec-gente', label: '🙋 Gente' }] : []),
          ]}
        />
      )}

      {/* Hero */}
      <section className="glass relative overflow-hidden rounded-3xl p-5 animate-fade-up">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-[80px]"
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">
              {party.title}
            </h1>
            <span className="text-2xl" aria-label={vibe.label} title={vibe.label}>
              {vibe.emoji}
            </span>
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">
            por <span className="font-semibold text-foreground">{party.host_name}</span> ·{' '}
            {zoneLabel(party.city, party.zone_text)} · {cityDef.label}
          </p>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            <Badge variant={vibe.tone === 'green' ? 'success' : vibe.tone === 'yellow' ? 'warning' : 'destructive'}>
              {vibe.emoji} {vibe.label}
            </Badge>
            <Badge variant="outline">
              <Clock className="h-3 w-3" /> {formatWhen(party.start_at)}
            </Badge>
            <Badge variant={party.type === 'private' ? 'default' : 'accent'}>
              {party.type === 'private' ? (
                <>
                  <Lock className="h-3 w-3" /> Privada
                </>
              ) : (
                'Abierta'
              )}
            </Badge>
            {venue && (
              <Badge variant="outline">
                {venue.emoji} {venue.label}
              </Badge>
            )}
          </div>

          {/* Música: lo primero que cualquiera quiere saber de una previa. */}
          {party.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {party.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-neon-lilac/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-neon-lilac"
                >
                  {genreEmoji(g)} {genreLabel(g)}
                </span>
              ))}
            </div>
          )}

          {/* Capacidad */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold">
                <Users className="h-3.5 w-3.5 text-neon-lilac" />
                {attendees} de {party.max_people} confirmados
              </span>
              <span className={cn('font-semibold', expired ? 'text-zone-red' : 'text-muted-foreground')}>
                {expired ? 'Expiró' : `Expira en ${formatCountdown(party.expires_at)}`}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-lilac transition-all duration-700"
                style={{ width: `${Math.min(100, (attendees / Math.max(party.max_people, 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Descripción */}
      {party.description && (
        <section className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
            {party.description}
          </p>
        </section>
      )}

      {/* Ubicación aproximada: la ve cualquiera, aun sin aprobación. */}
      {!isApproved && !expired && (party.approx_area || party.lat_approx != null) && (
        <section className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Zona aproximada
          </p>
          {party.approx_area && (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {party.approx_area}
            </p>
          )}
          {party.lat_approx != null && party.lng_approx != null && (
            <div className="mt-2.5">
              <MiniMap lat={party.lat_approx} lng={party.lng_approx} approximate />
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Es orientativo. La dirección exacta y cómo llegar aparecen cuando te aprueban.
          </p>
        </section>
      )}

      {/* Estado según mi relación con la previa */}
      <section className="mt-3 space-y-3">
        {cancelled && (
          <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
            🚫 El anfitrión canceló esta previa.
          </div>
        )}

        {!cancelled && expired && (
          <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
            💨 Esta previa expiró y se autodestruyó. No queda rastro.
          </div>
        )}

        {checkinTimes.length > 0 && !cancelled && (
          <div className="glass rounded-2xl p-3 text-center text-xs text-muted-foreground">
            🕐 {checkinTimes
              .map((t) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
              .join(', ')}{' '}
            — {checkinTimes.length} persona{checkinTimes.length === 1 ? '' : 's'} ya llegaron
          </div>
        )}

        {!cancelled && !expired && !isApproved && myStatus === 'none' && (
          <div className="glass rounded-2xl p-4 text-center animate-fade-up">
            <Lock className="mx-auto mb-2 h-6 w-6 text-neon-violet" />
            <p className="text-sm leading-relaxed text-foreground/85">
              Es <strong>privada</strong>. La dirección exacta se desbloquea solo si{' '}
              <strong>{party.host_name.split(' ')[0]}</strong> te aprueba.
            </p>
            <Button className="mt-3 w-full" onClick={() => void handleRequest()} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pedir ir 🙋'}
            </Button>
          </div>
        )}

        {!cancelled && !expired && !isApproved && myStatus === 'pending' && (
          <div className="glass rounded-2xl p-4 text-center">
            <Hourglass className="mx-auto mb-2 h-6 w-6 animate-pulse text-zone-yellow" />
            <p className="text-sm leading-relaxed">
              Solicitud enviada. <strong>{party.host_name.split(' ')[0]}</strong> decide.
              Te avisamos al toque acá mismo. ⏳
            </p>
          </div>
        )}

        {!cancelled && !expired && !isApproved && myStatus === 'rejected' && (
          <div className="glass rounded-2xl p-4 text-center">
            <XCircle className="mx-auto mb-2 h-6 w-6 text-zone-red" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              No entraste en esta. Hay más previas en {zoneLabel(party.city, party.zone_text)} y
              en toda {cityDef.label}. 👀
            </p>
          </div>
        )}

        {/* Dirección: SOLO aprobados/host */}
        {isApproved && !cancelled && (
          <div id="sec-lugar" className="scroll-mt-20 space-y-3 animate-fade-up">
            <div className="rounded-2xl border border-neon-violet/25 bg-neon-violet/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon-violet">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isHost ? 'Tu dirección (solo la ven aprobados)' : 'Dirección desbloqueada'}
              </p>
              {party.address_hidden && (
                <p className="mt-1.5 flex items-start gap-1.5 text-base font-bold">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-violet" />
                  {party.address_hidden}
                </p>
              )}
              {party.arrival_notes && (
                <p className="mt-2 whitespace-pre-line rounded-xl bg-white/[0.04] p-2.5 text-sm leading-relaxed text-foreground/85">
                  {party.arrival_notes}
                </p>
              )}
              {party.lat_hidden != null && party.lng_hidden != null && (
                <button
                  onClick={openDirections}
                  className="mt-2.5 flex items-center gap-1.5 text-sm font-bold text-neon-lilac underline-offset-4 hover:underline"
                >
                  <Navigation className="h-4 w-4" /> Cómo llegar
                </button>
              )}
            </div>

            {party.lat_hidden != null && party.lng_hidden != null && (
              <MiniMap lat={party.lat_hidden} lng={party.lng_hidden} />
            )}

            {party.whatsapp_number && !isHost && (
              <a
                href={`https://wa.me/${party.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-zone-green/30 bg-zone-green/10 p-3 text-sm font-bold text-zone-green transition-colors hover:bg-zone-green/15"
              >
                <MessageCircle className="h-4 w-4" /> Mandale un WhatsApp
              </a>
            )}

            {!expired && (
              <Button
                variant={checkedIn ? 'secondary' : 'accent'}
                className="w-full"
                onClick={() => void handleCheckIn()}
                disabled={working || checkedIn}
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : checkedIn ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Estás acá — ¡a disfrutar! 🍻
                  </>
                ) : (
                  '📍 Estoy acá'
                )}
              </Button>
            )}
          </div>
        )}

        {/* Compartir */}
        {!expired && !cancelled && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="press w-full" onClick={shareWhatsApp}>
              <MessageCircle className="h-4 w-4 text-zone-green" /> WhatsApp
            </Button>
            <Button variant="outline" className="press w-full" onClick={() => setInviteOpen(true)}>
              <QrCode className="h-4 w-4 text-neon-lilac" /> QR e invitar
            </Button>
          </div>
        )}

        {/* Temas para el DJ: solo miembros, y solo si la previa definió géneros */}
        {isApproved && !expired && !cancelled && party.genres.length > 0 && (
          <div id="sec-musica" className="scroll-mt-20">
            <SongRequests partyId={party.id} genres={party.genres} isHost={isHost} />
          </div>
        )}

        {/* Chat: solo miembros */}
        {isApproved && !expired && !cancelled && (
          <div id="sec-chat" className="scroll-mt-20">
            <Chat partyId={party.id} currentUserId={currentUserId} />
          </div>
        )}

        {/* Abandonar previa: invitado aprobado, no el anfitrión */}
        {myStatus === 'approved' && !isHost && !expired && !cancelled && (
          <Button
            variant="outline"
            className="w-full text-muted-foreground"
            onClick={() => void handleLeave()}
            disabled={leaving}
          >
            {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
            Abandonar previa
          </Button>
        )}

        {/* Controles de anfitrión */}
        {isHost && !expired && !cancelled && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar previa
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleMarkFull()}
              disabled={working}
            >
              <Lock className="h-4 w-4" /> Marcar llena
            </Button>
            <Button
              variant="outline"
              className="col-span-2 w-full text-zone-red hover:text-zone-red"
              onClick={() => void handleCancel()}
              disabled={working}
            >
              <XCircle className="h-4 w-4" /> Cancelar previa
            </Button>
          </div>
        )}

        {/* Panel host */}
        {isHost && !expired && !cancelled && (
          <div id="sec-gente" className="scroll-mt-20">
            <HostRequests partyId={party.id} />
          </div>
        )}
      </section>

      <EditPartyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        party={party}
        onUpdated={(fields) =>
          setParty((prev) => ({
            ...prev,
            title: fields.title,
            description: fields.description,
            arrival_notes: fields.arrivalNotes,
            whatsapp_number: fields.whatsappNumber,
            max_people: fields.maxPeople,
            genres: fields.genres,
            venue_type: fields.venueType,
          }))
        }
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        url={partyUrl}
        title={party.title}
        place={`${zoneLabel(party.city, party.zone_text)} · ${cityDef.label}`}
        when={formatWhen(party.start_at)}
      />

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        partyId={party.id}
        onDone={() => {
          if (leaving) router.push('/')
        }}
      />

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground/50">
        PreviAR es un tablón entre privados · La previa se autodestruye a las 8 horas ·
        Si algo no cierra, reportá.
      </p>
    </main>
  )
}

/**
 * Índice de secciones de la previa. Se pega arriba al hacer scroll para que
 * "dónde es", "qué suena", "quién habla" y "quién viene" estén siempre a un
 * toque, en vez de a media pantalla de scroll.
 */
function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  function go(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Secciones de la previa"
      className="glass-deep sticky top-0 z-30 -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 py-2"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => go(it.id)}
          className="press glass-chip shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-foreground/85"
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
