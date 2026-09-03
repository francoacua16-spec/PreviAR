'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Bell, LogOut, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { Wordmark } from '@/components/logo'
import { useUser } from '@/components/providers'
import { adminUnseenCount, countPendingForMe } from '@/lib/api'

export function Header() {
  const { user, profile, isAdmin, supabase } = useUser()
  const router = useRouter()
  const [pending, setPending] = useState(0)
  const [unseen, setUnseen] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true

    countPendingForMe(supabase)
      .then((n) => active && setPending(n))
      .catch(() => {})

    const channel = supabase
      .channel('pending-for-me')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_requests',
          filter: `host_id=eq.${user.id}`,
        },
        () => {
          countPendingForMe(supabase).then((n) => active && setPending(n))
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // Aviso de admin: previas nuevas desde la última visita al panel, más un
  // toast en vivo si alguien crea una previa mientras Franco mira el mapa.
  useEffect(() => {
    if (!isAdmin) return
    let active = true

    adminUnseenCount(supabase).then((n) => active && setUnseen(n))

    const channel = supabase
      .channel('admin-new-parties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parties' }, (payload) => {
        if (!active) return
        const title = (payload.new as { title?: string }).title ?? 'sin título'
        toast(`🎉 Previa nueva: ${title}`, { description: 'Tocá tu cuenta → Panel de control.' })
        setUnseen((n) => n + 1)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  async function signOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    toast('Chau 👋 Nos vemos el finde.')
  }

  const name = profile?.display_name ?? user?.user_metadata?.full_name ?? 'Mi cuenta'
  const initial = name?.[0] ?? user?.email?.[0] ?? '?'

  // z-[35] igual que el selector de ciudad: sin sesión el LoginGate (z-30)
  // difumina lo que queda abajo, y tener el logo borroso con las ciudades
  // nítidas hacía ver la barra superior como un error de render.
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[35] flex items-center gap-2 p-3">
      <div className="pointer-events-auto glass flex h-11 items-center rounded-full px-3.5">
        <Wordmark className="h-7" />
      </div>

      <div className="flex-1" />

      {user && (
        <>
          {/* Atajo a la misma sección que la barra inferior: "mis previas" vive
              en un solo lugar, no en una hoja aparte que duplicaba la lista. */}
          <button
            onClick={() => router.push('/mis-previas')}
            className="press pointer-events-auto glass relative flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10"
            aria-label={
              pending > 0 ? `Mis previas, ${pending} solicitudes por aprobar` : 'Mis previas'
            }
          >
            <Bell className="h-5 w-5" />
            {pending > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-neon-violet">
                {pending}
              </span>
            )}
          </button>

          <div className="pointer-events-auto relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="glass flex h-11 items-center gap-2 rounded-full pl-1.5 pr-3.5 transition-colors hover:bg-white/10"
              aria-label="Menú de cuenta"
            >
              <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-neon-violet to-neon-lilac font-display text-sm font-bold text-black">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial.toUpperCase()
                )}
              </span>
              <span className="max-w-24 truncate text-xs font-semibold">{name}</span>
              {profile?.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-neon-lilac" />}
              {isAdmin && unseen > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-lilac px-1 text-[10px] font-bold text-black">
                  {unseen}
                </span>
              )}
            </button>

            {menuOpen && (
              <button
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
            )}

            {menuOpen && (
              <div className="fixed right-3 top-[var(--header-h)] z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#141417] shadow-card animate-fade-in">
                <div className="border-b border-white/5 px-4 py-3">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    {name}
                    {profile?.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon-lilac" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Reputación {'⭐'.repeat(Math.min(profile?.reputation ?? 5, 5))}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    router.push('/profile')
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-foreground transition-colors hover:bg-white/5"
                >
                  <User className="h-4 w-4" /> Mi perfil
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setUnseen(0)
                      router.push('/admin')
                    }}
                    className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-neon-lilac transition-colors hover:bg-white/5"
                  >
                    <Shield className="h-4 w-4" /> Panel de control
                    {unseen > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-lilac px-1 text-[10px] font-bold text-black">
                        {unseen}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-zone-red transition-colors hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )
}
