import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/require-auth'
import { ProfileClient } from '@/components/profile/profile-client'

// Sin `force-dynamic` ni `getUser()` de server: esta página no renderiza ningún
// dato del usuario en el HTML, sólo el cascarón. Estática la prefetchea Next y
// la pestaña abre al instante. Ver components/auth/require-auth.tsx.

export const metadata: Metadata = {
  title: 'Tu perfil',
  description: 'Tu cuenta de PreviAR.',
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileClient />
    </RequireAuth>
  )
}
