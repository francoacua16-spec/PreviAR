'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { Wordmark } from '@/components/logo'
import { useUser } from '@/components/providers'

/**
 * Barra superior del mapa: la marca a la izquierda, tu foto a la derecha.
 *
 * Antes vivían acá también la campana y un menú de cuenta desplegable. Los dos
 * eran duplicados de la barra de apartados de abajo (Previas y Cuenta), y el
 * desplegable además caía detrás del selector de ciudad. Un destino, un lugar:
 * las acciones de cuenta viven en /profile, las solicitudes en /mis-previas.
 * Queda la foto sola, como atajo directo a tu cuenta — sin submenú.
 *
 * z-[35] igual que el selector de ciudad: sin sesión el LoginGate (z-30)
 * difumina lo que queda abajo, y tener el logo borroso con las ciudades
 * nítidas hacía ver la barra superior como un error de render.
 */
export function Header() {
  const { user, profile } = useUser()

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[35] flex items-center justify-between p-3">
      <div className="glass flex h-11 items-center rounded-full px-3.5">
        <Wordmark className="h-7" />
      </div>

      {user && (
        <Link
          href="/profile"
          aria-label="Tu cuenta"
          className="press pointer-events-auto glass grid h-11 w-11 place-items-center overflow-hidden rounded-full"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="Tu foto de perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-neon-lilac" />
          )}
        </Link>
      )}
    </header>
  )
}
