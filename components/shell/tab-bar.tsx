'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarHeart, Map, Plus, Search, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/components/providers'
import { adminUnseenCount, countPendingForMe } from '@/lib/api'
import { CREATE_EVENT } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Rutas donde la barra estorba: pantallas de foco único o sin sesión. */
const HIDDEN_PREFIXES = ['/login', '/party/', '/auth', '/privacy', '/terminos']

interface Tab {
  href: string
  label: string
  icon: typeof Map
}

const BASE_TABS: Tab[] = [
  { href: '/', label: 'Mapa', icon: Map },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/mis-previas', label: 'Previas', icon: CalendarHeart },
  { href: '/profile', label: 'Cuenta', icon: User },
]

/**
 * Navegación principal. Cinco destinos fijos, siempre en el mismo lugar: la
 * app deja de ser un mapa con menús escondidos y pasa a tener secciones que se
 * ven de una. "Crear" va al centro y más grande porque es la acción que la app
 * quiere que hagas.
 */
export function TabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin, supabase } = useUser()
  const [pending, setPending] = useState(0)
  const [unseen, setUnseen] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    countPendingForMe(supabase)
      .then((n) => active && setPending(n))
      .catch(() => {})

    const channel = supabase
      .channel('tabbar-pending')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_requests', filter: `host_id=eq.${user.id}` },
        () => {
          countPendingForMe(supabase)
            .then((n) => active && setPending(n))
            .catch(() => {})
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // Aviso de admin: previas nuevas desde la última visita al panel, más un
  // toast en vivo si alguien crea una previa mientras Franco usa la app. Vive
  // acá y no en el header del mapa porque la barra está montada en todas las
  // secciones — antes el aviso solo aparecía si estabas parado en el mapa.
  useEffect(() => {
    if (!isAdmin) return
    let active = true

    adminUnseenCount(supabase)
      .then((n) => active && setUnseen(n))
      .catch(() => {})

    const channel = supabase
      .channel('tabbar-admin-new-parties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parties' }, (payload) => {
        if (!active) return
        const title = (payload.new as { title?: string }).title ?? 'sin título'
        toast(`🎉 Previa nueva: ${title}`, { description: 'Entrá a Admin para verla.' })
        setUnseen((n) => n + 1)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  // Al entrar al panel el contador se apaga: adminMarkSeen() ya corre allá.
  useEffect(() => {
    if (pathname.startsWith('/admin')) setUnseen(0)
  }, [pathname])

  if (!user) return null
  if (HIDDEN_PREFIXES.some((p) => (p === '/login' ? pathname === p : pathname.startsWith(p)))) {
    return null
  }

  const tabs = isAdmin
    ? [...BASE_TABS, { href: '/admin', label: 'Admin', icon: Shield }]
    : BASE_TABS

  // "Crear" abre el diálogo del mapa: la creación necesita el mapa detrás para
  // elegir el pin, así que no tiene ruta propia — entra por el mapa con ?crear=1.
  function goCreate() {
    // Ya en el mapa no hay navegación que hacer: `router.push('/?crear=1')` no
    // remonta nada y el efecto que lee el query corre una sola vez, así que el
    // botón quedaba muerto. Le avisamos al mapa directo por evento.
    if (pathname === '/') {
      window.dispatchEvent(new Event(CREATE_EVENT))
      return
    }
    router.push('/?crear=1')
  }

  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)

  return (
    <nav
      aria-label="Secciones"
      className="glass-deep fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-0.5 px-1.5 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5"
      style={{ minHeight: 'var(--tabbar-h)' }}
    >
      {left.map((t) => (
        <TabLink key={t.href} tab={t} pathname={pathname} />
      ))}

      <button
        type="button"
        onClick={goCreate}
        aria-label="Crear previa"
        className="press -mt-5 flex h-14 w-14 shrink-0 items-center justify-center self-center rounded-full bg-primary text-primary-foreground shadow-neon-violet"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
      </button>

      {right.map((t) => (
        <TabLink
          key={t.href}
          tab={t}
          pathname={pathname}
          badge={t.href === '/mis-previas' ? pending : t.href === '/admin' ? unseen : 0}
        />
      ))}
    </nav>
  )
}

function TabLink({
  tab,
  pathname,
  badge = 0,
}: {
  tab: Tab
  pathname: string
  badge?: number
}) {
  const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
  const Icon = tab.icon

  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1',
        'transition-colors duration-150',
        active ? 'text-neon-violet' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-semibold leading-none tracking-tight">{tab.label}</span>
      {badge > 0 && (
        <span className="absolute right-1/2 top-0 translate-x-3.5 rounded-full bg-primary px-1.5 text-[9px] font-bold leading-4 text-primary-foreground">
          {badge}
        </span>
      )}
      {active && (
        <span
          aria-hidden
          className="absolute -top-1.5 h-1 w-8 rounded-full bg-neon-violet shadow-neon-violet"
        />
      )}
    </Link>
  )
}
