'use client'

import { useEffect, useState } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { PinLogo } from '@/components/logo'
import { useUser } from '@/components/providers'
import { countPendingForMe } from '@/lib/api'

interface HeaderProps {
  onOpenMyParties: () => void
}

export function Header({ onOpenMyParties }: HeaderProps) {
  const { user, profile, supabase } = useUser()
  const [pending, setPending] = useState(0)
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

  async function signOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    toast('Chau 👋 Nos vemos el finde.')
  }

  const initial = user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? '?'

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 p-3">
      <div className="pointer-events-auto glass flex h-11 items-center gap-2 rounded-full px-3.5">
        <PinLogo className="h-6 w-6" />
        <span className="font-display text-sm font-bold brand-gradient-text">PreviAR</span>
      </div>

      <div className="flex-1" />

      {user && (
        <>
          <button
            onClick={onOpenMyParties}
            className="pointer-events-auto glass relative flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10"
            aria-label="Mis previas y solicitudes"
          >
            <Bell className="h-5 w-5" />
            {pending > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-neon-pink">
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan font-display text-sm font-bold text-black">
                {initial.toUpperCase()}
              </span>
              <span className="max-w-24 truncate text-xs font-semibold">
                {user.user_metadata?.full_name ?? 'Mi cuenta'}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#141417] shadow-card animate-fade-in">
                <div className="border-b border-white/5 px-4 py-3">
                  <p className="truncate text-sm font-semibold">
                    {user.user_metadata?.full_name ?? user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Reputación {'⭐'.repeat(Math.min(profile?.reputation ?? 5, 5))}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-zone-red transition-colors hover:bg-white/5"
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
