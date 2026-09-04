import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/require-auth'
import { MyPartiesClient } from '@/components/party/my-parties-client'

// Estática a propósito: ver app/profile/page.tsx.

export const metadata: Metadata = {
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
  title: 'Mis previas',
  description: 'Las previas que armaste y a las que vas.',
}

export default function MisPreviasPage() {
  return (
    <RequireAuth>
      <MyPartiesClient />
    </RequireAuth>
  )
}
