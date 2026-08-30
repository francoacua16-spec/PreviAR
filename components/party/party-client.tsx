'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Hourglass,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUser } from '@/components/providers'
import { checkIn, friendlyError, requestToJoin } from '@/lib/api'
import { formatCountdown, formatWhen, vibeOf } from '@/lib/format'
import { getCity, zoneLabel } from '@/lib/zones'
import type { MyStatus, PartyRow } from '@/lib/types'
import { Chat } from './chat'
import { HostRequests } from './host-requests'
import { MiniMap } from './mini-map'
import { ReportDialog } from './report-dialog'
import { cn } from '@/lib/utils'

interface PartyClientProps {
  initialParty: PartyRow
  currentUserId: string
}

export function PartyClient({ initialParty, currentUserId }: PartyClientProps) {
  const { supabase } = useUser()
  const router = useRouter()

  const [party] = useState<PartyRow>(initialParty)
  const [myStatus, setMyStatus] = useState<MyStatus>(initialParty.my_status)
  const [checkedIn, setCheckedIn] = useState(initialParty.checked_in)
  const [attendees, setAttendees] = useState(initialParty.attendees_count)
  const [expired, setExpired] = useState(
    new Date(initialParty.expires_at).getTime() <= Date.now()
  )
  const [working, setWorking] = useState(false)

  const isHost = myStatus === 'host'
  const isApproved = isHost || myStatus === 'approved'
  const cityDef = getCity(party.city)
  const vibe = vibeOf(attendees, party.max_people)

  // ── Realtime: contador de asistentes + mi solicitud ──────────
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
        (payload) => setAttendees(payload.new.attendees_count)
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, party.id, currentUserId])

  // ── Cuenta regresiva ─────────────────────────────────────────
  const refreshCountdown = useCallback(() => {
    setExpired(new Date(party.expires_at).getTime() <= Date.now())
  }, [party.expires_at])

  useEffect(() => {
    refreshCountdown()
    const t = setInterval(refreshCountdown, 30_000)
    return () => clearInterval(t)
  }, [refreshCountdown])

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

  // ── Compartir ────────────────────────────────────────────────
  const partyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/party/${party.id}` : ''

  function shareWhatsApp() {
    const text = `🍻 ${party.title} — PreviAR\n📍 ${zoneLabel(party.city, party.zone_text)}, ${cityDef.label}\n${
      isHost ? 'Pedime entrar y te paso la dirección 👇' : 'Pedí entrar acá 👇'
    } ${partyUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(partyUrl)
      toast.success('Link copiado 📋')
    } catch {
      toast.error('No pudimos copiar el link')
    }
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
          </div>

          {/* Capacidad */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold">
                <Users className="h-3.5 w-3.5 text-neon-cyan" />
                {attendees} de {party.max_people} confirmados
              </span>
              <span className={cn('font-semibold', expired ? 'text-zone-red' : 'text-muted-foreground')}>
                {expired ? 'Expiró' : `Expira en ${formatCountdown(party.expires_at)}`}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all duration-700"
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

      {/* Estado según mi relación con la previa */}
      <section className="mt-3 space-y-3">
        {expired && (
          <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
            💨 Esta previa expiró y se autodestruyó. No queda rastro.
          </div>
        )}

        {!expired && !isApproved && myStatus === 'none' && (
          <div className="glass rounded-2xl p-4 text-center animate-fade-up">
            <Lock className="mx-auto mb-2 h-6 w-6 text-neon-pink" />
            <p className="text-sm leading-relaxed text-foreground/85">
              Es <strong>privada</strong>. La dirección exacta se desbloquea solo si{' '}
              <strong>{party.host_name.split(' ')[0]}</strong> te aprueba.
            </p>
            <Button className="mt-3 w-full" onClick={() => void handleRequest()} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pedir ir 🙋'}
            </Button>
          </div>
        )}

        {!expired && !isApproved && myStatus === 'pending' && (
          <div className="glass rounded-2xl p-4 text-center">
            <Hourglass className="mx-auto mb-2 h-6 w-6 animate-pulse text-zone-yellow" />
            <p className="text-sm leading-relaxed">
              Solicitud enviada. <strong>{party.host_name.split(' ')[0]}</strong> decide.
              Te avisamos al toque acá mismo. ⏳
            </p>
          </div>
        )}

        {!expired && !isApproved && myStatus === 'rejected' && (
          <div className="glass rounded-2xl p-4 text-center">
            <XCircle className="mx-auto mb-2 h-6 w-6 text-zone-red" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              No entraste en esta. Hay más previas en {zoneLabel(party.city, party.zone_text)} y
              en toda {cityDef.label}. 👀
            </p>
          </div>
        )}

        {/* Dirección: SOLO aprobados/host */}
        {isApproved && (
          <div className="space-y-3 animate-fade-up">
            <div className="rounded-2xl border border-neon-pink/25 bg-neon-pink/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon-pink">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isHost ? 'Tu dirección (solo la ven aprobados)' : 'Dirección desbloqueada'}
              </p>
              {party.address_hidden && (
                <p className="mt-1.5 flex items-start gap-1.5 text-base font-bold">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                  {party.address_hidden}
                </p>
              )}
              {party.lat_hidden != null && party.lng_hidden != null && (
                <button
                  onClick={openDirections}
                  className="mt-2.5 flex items-center gap-1.5 text-sm font-bold text-neon-cyan underline-offset-4 hover:underline"
                >
                  <Navigation className="h-4 w-4" /> Cómo llegar
                </button>
              )}
            </div>

            {party.lat_hidden != null && party.lng_hidden != null && (
              <MiniMap lat={party.lat_hidden} lng={party.lng_hidden} />
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
        {!expired && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              className="w-full"
              onClick={shareWhatsApp}
            >
              <MessageCircle className="h-4 w-4 text-zone-green" /> WhatsApp
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void copyLink()}>
              <Copy className="h-4 w-4 text-neon-cyan" /> Copiar link
            </Button>
          </div>
        )}

        {/* Chat: solo miembros */}
        {isApproved && !expired && (
          <Chat partyId={party.id} currentUserId={currentUserId} />
        )}

        {/* Panel host */}
        {isHost && !expired && <HostRequests partyId={party.id} />}
      </section>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground/50">
        PreviAR es un tablón entre privados · La previa se autodestruye a las 8 horas ·
        Si algo no cierra, reportá.
      </p>
    </main>
  )
}
