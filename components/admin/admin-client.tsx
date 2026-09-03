'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Disc3,
  Eye,
  Flag,
  Loader2,
  MapPin,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/components/providers'
import {
  adminBanUser,
  adminDeleteMessage,
  adminDeleteParty,
  adminListFeedback,
  adminListParties,
  adminListReports,
  adminListUsers,
  adminMarkSeen,
  adminPartyPeople,
  adminPartySongs,
  adminPurgeParty,
  adminReadChat,
  adminRestoreParty,
  adminSetVerified,
  adminStats,
  friendlyError,
} from '@/lib/api'
import type {
  AdminFilter,
  AdminMessageRow,
  AdminPartyRow,
  AdminPersonRow,
  AdminReportRow,
  AdminSongRow,
  AdminStats,
  AdminUserRow,
  FeedbackRow,
} from '@/lib/types'
import { genreEmoji, genreLabel, venueDef } from '@/lib/constants'

const CITY_LABEL: Record<string, string> = {
  la_plata: 'La Plata',
  caba: 'CABA',
  bariloche: 'Bariloche',
}

const FILTERS: { id: AdminFilter; label: string }[] = [
  { id: 'live', label: 'En vivo' },
  { id: 'all', label: 'Todas' },
  { id: 'reported', label: 'Reportadas' },
]

type Tab = 'parties' | 'users' | 'reports' | 'feedback'

const TABS: { id: Tab; label: string }[] = [
  { id: 'parties', label: 'Previas' },
  { id: 'users', label: 'Gente' },
  { id: 'reports', label: 'Reportes' },
  { id: 'feedback', label: 'Feedback' },
]

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminClient() {
  const router = useRouter()
  const { user, isAdmin, loading, supabase } = useUser()

  const [tab, setTab] = useState<Tab>('parties')
  const [filter, setFilter] = useState<AdminFilter>('live')
  const [parties, setParties] = useState<AdminPartyRow[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  // Ref para que el canal de Realtime no se resuscriba en cada cambio de filtro.
  const filterRef = useRef(filter)
  filterRef.current = filter

  const load = useCallback(
    async (f: AdminFilter) => {
      setFetching(true)
      try {
        const [rows, s] = await Promise.all([adminListParties(supabase, f), adminStats(supabase)])
        setParties(rows)
        setStats(s)
      } catch (e) {
        toast.error(friendlyError(e))
      } finally {
        setFetching(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    if (!isAdmin) return
    load(filter)
  }, [isAdmin, filter, load])

  // Entrar al panel es "ya lo vi": resetea el contador del header.
  useEffect(() => {
    if (isAdmin) adminMarkSeen(supabase)
  }, [isAdmin, supabase])

  // Previa nueva mientras el panel está abierto: avisamos y refrescamos.
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel('admin-parties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parties' }, (payload) => {
        const title = (payload.new as { title?: string }).title ?? 'sin título'
        toast(`🎉 Previa nueva: ${title}`)
        load(filterRef.current)
        adminMarkSeen(supabase)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase, load])

  async function run(id: string, fn: () => Promise<void>, ok: string) {
    setBusyId(id)
    try {
      await fn()
      toast.success(ok)
      await load(filter)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusyId(null)
    }
  }

  function handlePurge(p: AdminPartyRow) {
    // Confirmación explícita: esto se lleva chat, solicitudes y reportes.
    const sure = window.confirm(
      `Borrar "${p.title}" para siempre?\n\nSe van también las solicitudes, el chat y los reportes. No hay vuelta atrás.`
    )
    if (!sure) return
    run(p.id, () => adminPurgeParty(supabase, p.id), 'Previa borrada.')
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-zone-red" />
        <p className="text-sm text-muted-foreground">Este panel es solo para administradores.</p>
        <button
          onClick={() => router.push('/')}
          className="glass flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
        >
          Volver al mapa
        </button>
      </div>
    )
  }

  return (
    <div className="pb-tabbar min-h-dvh bg-background px-4 py-6">
      <button
        onClick={() => router.push('/')}
        className="glass mb-6 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al mapa
      </button>

      <h1 className="font-display text-xl font-bold brand-gradient-text">Panel de control</h1>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" /> Modo fantasma: nadie ve que estás mirando.
      </p>

      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="En vivo" value={stats.live_parties} />
          <Stat label="Totales" value={stats.total_parties} />
          <Stat label="Usuarios" value={stats.total_users} />
          <Stat label="Verificados" value={stats.verified_users} />
          <Stat label="Reportes" value={stats.open_reports} />
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'h-9 flex-1 rounded-full bg-white/10 text-xs font-bold text-foreground'
                : 'h-9 flex-1 rounded-full text-xs font-semibold text-muted-foreground'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'parties' && (
        <>
          <div className="mb-4 flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={
                  filter === f.id
                    ? 'h-9 flex-1 rounded-full bg-primary text-xs font-bold text-primary-foreground'
                    : 'glass h-9 flex-1 rounded-full text-xs font-semibold text-muted-foreground'
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {fetching ? (
            <Spinner />
          ) : parties.length === 0 ? (
            <Empty>No hay previas para este filtro.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {parties.map((p) => (
                <li key={p.id} className="glass rounded-2xl p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{p.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.host_name}
                        {p.host_email ? ` · ${p.host_email}` : ''}
                      </p>
                    </div>
                    <span
                      className={
                        p.is_live
                          ? 'shrink-0 rounded-full bg-neon-lilac/15 px-2 py-1 text-[10px] font-bold uppercase text-neon-lilac'
                          : 'shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground'
                      }
                    >
                      {p.is_live ? 'en vivo' : p.status === 'cancelled' ? 'de baja' : 'expirada'}
                    </span>
                  </div>

                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {CITY_LABEL[p.city] ?? p.city} · {p.zone_text}
                      {p.address_hidden ? ` · ${p.address_hidden}` : ''}
                      {p.arrival_notes ? ` (${p.arrival_notes})` : ''}
                    </span>
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {p.attendees_count}/{p.max_people}
                      {p.pending_count > 0 && ` · ${p.pending_count} pendientes`}
                    </span>
                    {p.report_count > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-zone-red">
                        <Flag className="h-3.5 w-3.5" />
                        {p.report_count}
                      </span>
                    )}
                    <span>Creada {fmt(p.created_at)}</span>
                    <span>Arranca {fmt(p.start_at)}</span>
                  </p>

                  {(p.venue_type || p.genres.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {(() => {
                        const v = venueDef(p.venue_type)
                        return v ? (
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {v.emoji} {v.label}
                          </span>
                        ) : null
                      })()}
                      {p.genres.map((g) => (
                        <span
                          key={g}
                          className="rounded-full border border-neon-lilac/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-neon-lilac"
                        >
                          {genreEmoji(g)} {genreLabel(g)}
                        </span>
                      ))}
                    </div>
                  )}

                  <PartyDrilldown partyId={p.id} songCount={p.song_count} />

                  <div className="mt-3 flex gap-2">
                    {p.status === 'cancelled' ? (
                      <button
                        onClick={() =>
                          run(p.id, () => adminRestoreParty(supabase, p.id), 'Previa restaurada.')
                        }
                        disabled={busyId === p.id}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          run(p.id, () => adminDeleteParty(supabase, p.id), 'Previa dada de baja.')
                        }
                        disabled={busyId === p.id}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Dar de baja
                      </button>
                    )}
                    <button
                      onClick={() => handlePurge(p)}
                      disabled={busyId === p.id}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-zone-red/40 px-4 text-xs font-semibold text-zone-red transition-colors hover:bg-zone-red/10 disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'users' && <UsersTab />}
      {tab === 'reports' && <ReportsTab onJump={() => setTab('parties')} />}
      {tab === 'feedback' && <FeedbackTab />}
    </div>
  )
}

/** Chat privado y lista de gente de una previa. Se carga solo si lo pedís. */
type Panel = 'chat' | 'people' | 'songs'

function PartyDrilldown({ partyId, songCount }: { partyId: string; songCount: number }) {
  const { supabase } = useUser()
  const [open, setOpen] = useState<Panel | null>(null)
  const [messages, setMessages] = useState<AdminMessageRow[] | null>(null)
  const [people, setPeople] = useState<AdminPersonRow[] | null>(null)
  const [songs, setSongs] = useState<AdminSongRow[] | null>(null)
  const [loadingPanel, setLoadingPanel] = useState(false)

  async function show(which: Panel) {
    if (open === which) {
      setOpen(null)
      return
    }
    setOpen(which)
    if (which === 'chat' && messages) return
    if (which === 'people' && people) return
    if (which === 'songs' && songs) return

    setLoadingPanel(true)
    try {
      if (which === 'chat') setMessages(await adminReadChat(supabase, partyId))
      else if (which === 'people') setPeople(await adminPartyPeople(supabase, partyId))
      else setSongs(await adminPartySongs(supabase, partyId))
    } catch (e) {
      toast.error(friendlyError(e))
      setOpen(null)
    } finally {
      setLoadingPanel(false)
    }
  }

  async function removeMessage(id: string) {
    try {
      await adminDeleteMessage(supabase, id)
      setMessages((m) => (m ? m.filter((x) => x.id !== id) : m))
      toast.success('Mensaje borrado.')
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          onClick={() => show('chat')}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-white/5"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <button
          onClick={() => show('people')}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-white/5"
        >
          <Users className="h-3.5 w-3.5" /> Gente
        </button>
        <button
          onClick={() => show('songs')}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-white/5"
        >
          <Disc3 className="h-3.5 w-3.5" /> Temas{songCount > 0 ? ` · ${songCount}` : ''}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-white/5 bg-black/20 p-3">
          {loadingPanel ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : open === 'chat' ? (
            messages && messages.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {messages.map((m) => (
                  <li key={m.id} className="group flex items-start justify-between gap-2">
                    <p className="min-w-0 text-xs">
                      <span
                        className={
                          m.is_host
                            ? 'font-bold text-neon-violet'
                            : 'font-semibold text-muted-foreground'
                        }
                      >
                        {m.sender_name}
                        {m.is_host ? ' (anfitrión)' : ''}:
                      </span>{' '}
                      <span className="break-words text-foreground">{m.content}</span>{' '}
                      <span className="text-[10px] text-muted-foreground">{fmt(m.created_at)}</span>
                    </p>
                    <button
                      onClick={() => removeMessage(m.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-zone-red"
                      aria-label="Borrar mensaje"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Todavía no hablaron nada.</p>
            )
          ) : open === 'songs' ? (
            songs && songs.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {songs.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span aria-hidden>{genreEmoji(s.genre)}</span>{' '}
                      <span className="font-semibold">{s.title}</span>
                      {s.artist ? (
                        <span className="text-muted-foreground"> — {s.artist}</span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {' '}
                        · {genreLabel(s.genre)} · {s.user_name}
                        {s.user_email ? ` (${s.user_email})` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {fmt(s.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nadie pidió temas.</p>
            )
          ) : people && people.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {people.map((p) => (
                <li key={p.request_id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    {p.display_name}
                    {p.verified && <BadgeCheck className="ml-1 inline h-3 w-3 text-neon-lilac" />}
                    {p.email ? (
                      <span className="text-muted-foreground"> · {p.email}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {p.status === 'approved' ? (p.checked_in ? 'llegó' : 'aprobado') : p.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nadie pidió entrar.</p>
          )}
        </div>
      )}
    </div>
  )
}

function UsersTab() {
  const { supabase } = useUser()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [fetching, setFetching] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    async (query: string) => {
      setFetching(true)
      try {
        setRows(await adminListUsers(supabase, query))
      } catch (e) {
        toast.error(friendlyError(e))
      } finally {
        setFetching(false)
      }
    },
    [supabase]
  )

  // Debounce simple: no le pegamos a la base en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => load(q), 300)
    return () => clearTimeout(t)
  }, [q, load])

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusyId(id)
    try {
      await fn()
      toast.success(ok)
      await load(q)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusyId(null)
    }
  }

  function ban(u: AdminUserRow) {
    const sure = window.confirm(
      `Bajar a ${u.display_name}?\n\nSe le dan de baja todas las previas activas, se rechazan sus solicitudes pendientes y queda con reputación 0.`
    )
    if (!sure) return
    act(u.id, () => adminBanUser(supabase, u.id), 'Usuario bajado.')
  }

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o mail…"
        className="glass mb-4 h-10 w-full rounded-full px-4 text-sm outline-none placeholder:text-muted-foreground"
      />

      {fetching ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty>No hay usuarios con ese nombre.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((u) => (
            <li key={u.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    {u.display_name}
                    {u.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon-lilac" />}
                    {u.is_admin && (
                      <span className="rounded-full bg-neon-lilac/15 px-1.5 text-[9px] font-bold uppercase text-neon-lilac">
                        admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? 'sin mail'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {u.parties_hosted} organizadas · {u.parties_joined} asistidas ·{' '}
                    {u.reports_made} reportes · rep {u.reputation}
                  </p>
                </div>
              </div>

              {!u.is_admin && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() =>
                      act(
                        u.id,
                        () => adminSetVerified(supabase, u.id, !u.verified),
                        u.verified ? 'Verificación sacada.' : 'Usuario verificado.'
                      )
                    }
                    disabled={busyId === u.id}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 text-[11px] font-semibold transition-colors hover:bg-white/5 disabled:opacity-50"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {u.verified ? 'Sacar verificado' : 'Verificar'}
                  </button>
                  <button
                    onClick={() => ban(u)}
                    disabled={busyId === u.id}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-full border border-zone-red/40 px-3 text-[11px] font-semibold text-zone-red transition-colors hover:bg-zone-red/10 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Bajar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ReportsTab({ onJump }: { onJump: () => void }) {
  const { supabase } = useUser()
  const [rows, setRows] = useState<AdminReportRow[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    adminListReports(supabase)
      .then(setRows)
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => setFetching(false))
  }, [supabase])

  if (fetching) return <Spinner />
  if (rows.length === 0) return <Empty>Ningún reporte. Todo tranquilo.</Empty>

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="glass rounded-2xl p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Flag className="h-3.5 w-3.5 shrink-0 text-zone-red" />
            <span className="truncate">{r.party_title}</span>
            {r.party_status !== 'active' && (
              <span className="shrink-0 rounded-full bg-white/5 px-1.5 text-[9px] uppercase text-muted-foreground">
                {r.party_status === 'cancelled' ? 'de baja' : r.party_status}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground">{r.reason}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {r.reporter_name}
            {r.reporter_email ? ` · ${r.reporter_email}` : ''} · {fmt(r.created_at)}
          </p>
          <button
            onClick={onJump}
            className="mt-2 text-[11px] font-semibold text-neon-lilac underline-offset-2 hover:underline"
          >
            Ver en Previas
          </button>
        </li>
      ))}
    </ul>
  )
}

function FeedbackTab() {
  const { supabase } = useUser()
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    adminListFeedback(supabase)
      .then(setRows)
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => setFetching(false))
  }, [supabase])

  if (fetching) return <Spinner />
  if (rows.length === 0) return <Empty>Todavía no hay feedback.</Empty>

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((f) => (
        <li key={f.id} className="glass rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{f.party_title}</p>
            <span className="shrink-0 rounded-full bg-white/5 px-1.5 text-[9px] uppercase text-muted-foreground">
              {f.role === 'host' ? 'anfitrión' : 'invitado'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-3.5 w-3.5 ${n <= f.rating ? 'fill-neon-violet text-neon-violet' : 'text-muted-foreground/30'}`}
              />
            ))}
          </div>
          {f.comment && <p className="mt-1.5 text-xs text-foreground/85">{f.comment}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">{fmt(f.created_at)}</p>
        </li>
      ))}
    </ul>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>
}
