'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUser } from '@/components/providers'

/**
 * Puerta de sesión del lado del cliente.
 *
 * Antes cada sección protegida era un Server Component con `force-dynamic` que
 * hacía `getUser()` — o sea, un viaje de red a Supabase — y encima el
 * middleware hacía otro `getUser()` sobre el mismo request. Tocar una pestaña
 * costaba dos round-trips antes de que el navegador recibiera una sola línea de
 * HTML, y como no había `loading.tsx` la pantalla se quedaba congelada en la
 * sección anterior todo ese tiempo.
 *
 * La sesión del server no se usaba para nada más que este redirect: los datos
 * los pide igual el componente cliente y quien decide qué podés ver es RLS en
 * la base, no este chequeo. Así que el guard se muda al cliente, las páginas
 * quedan estáticas (Next las prefetchea y aparecen al instante) y el redirect
 * lo resolvemos con la sesión que el navegador ya tiene en memoria.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading || user) return
    router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  if (loading || !user) {
    return (
      <div
        className="pb-tabbar flex min-h-dvh items-center justify-center bg-background"
        role="status"
        aria-label="Cargando"
      >
        <Loader2 className="h-6 w-6 animate-spin text-neon-violet" />
      </div>
    )
  }

  return <>{children}</>
}
