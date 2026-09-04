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

  // El id nunca cambia en esta pantalla: lo fijamos desde el prop para que
  // los efectos no se resuscriban en cada refetch.
  const partyId = initialParty.id

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

  // ── Único escritor de `party`: get_party ─────────────────────
  //
  // Antes había tres escritores sobre este estado, sin orden entre sí: el
  // prop del server (que se leía una sola vez y nunca se reconciliaba), un
  // merge parcial campo por campo desde el payload de realtime, y un poll
  // cada 20s. Cada uno traía los datos en un formato distinto y con un
  // criterio de visibilidad distinto — la policy `parties_select` filtra por
  // status y expires_at, get_party (SECURITY DEFINER) no filtra nada — así
  // que se pisaban entre ellos.
  //
  // Eso es lo que hacía "aparecer y desaparecer" la previa entera al editar:
  // `expired` gatea quince bloques del render, y se recalcula desde
  // `party.expires_at`. Realtime manda los timestamps en el formato del WAL
  // de Postgres ("2026-09-04 23:15:00+00"), que WebKit no parsea — o sea que
  // en el iPhone quedaba Invalid Date hasta que el poll lo corregía 20
  // segundos después. Ida y vuelta, bloques que se van y vuelven.
  //
  // Ahora realtime no escribe: solo avisa "algo cambió". El estado siempre lo
  // escribe get_party, que además re-corre el gating real del server. De paso
  // desaparece el problema de las columnas: ya no hay que mantener a mano una
  // whitelist de qué se puede mergear del payload y qué no.
  const refetch = useCallback(async () => {
    try {
      const fresh = await getParty(supabase, partyId)
      if (!fresh) return
      setParty(fresh)
      setMyStatus(fresh.my_status)
      setCheckedIn(fresh.checked_in)
      setAttendees(fresh.attendees_count)
    } catch {
      // Un fallo puntual de red no debe vaciar lo que ya está en pantalla.
    }
  }, [supabase, partyId])

  // ── Realtime: disparador, no fuente de datos ────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`party-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parties',
          filter: `id=eq.${partyId}`,
        },
        (payload) => {
          // El contador se puede aplicar directo: es un int, no tiene
          // problema de formato, y es el dato que más rápido quiere verse.
          const count = (payload.new as Record<string, unknown>).attendees_count
          if (typeof count === 'number') setAttendees(count)
          void refetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'party_requests',
          filter: `party_id=eq.${partyId}`,
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
  }, [supabase, partyId, currentUserId, refetch])

  // ── Red de seguridad: por si se cae el websocket ─────────────
  // Con realtime disparando el refetch, el poll dejó de ser la vía principal
  // y pasó a ser respaldo. Cada 20s era una tercera fuente compitiendo; a 60s
  // más un refetch al volver a la pestaña cubre el caso real (la app estuvo
  // en segundo plano y el socket se murió) sin pelearse con nadie.
  useEffect(() => {
    const id = setInterval(() => void refetch(), 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refetch])

  // ── Reconciliar el prop del server ───────────────────────────
  // Sin esto, `router.refresh()` después de editar re-renderiza el Server
  // Component pero el cliente sigue mostrando el objeto con el que se montó,
  // porque `useState(initialParty)` sólo lee el prop la primera vez.
  useEffect(() => {
    setParty(initialParty)
    setMyStatus(initialParty.my_status)
    setCheckedIn(initialParty.checked_in)
    setAttendees(initialParty.attendees_count)
  }, [initialParty])

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
        onUpdated={(fields) => {
          // Optimista, para que el cambio se vea al instante...
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
          // ...y refresh para tirar el Router Cache de Next. Sin esto, salir al
          // mapa y volver a entrar dentro de los 30s que Next cachea una ruta
          // dinámica te devolvía la versión previa a la edición, y recién el
          // poll la corregía. Ése era el otro lado del "aparece y desaparece".
          router.refresh()
        }}
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
