import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/require-auth'
import { SearchClient } from '@/components/search/search-client'

// Estática a propósito: ver app/profile/page.tsx.

export const metadata: Metadata = {
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
  title: 'Buscar',
  description: 'Buscá previas por nombre, zona, música o tipo de lugar.',
}

export default function BuscarPage() {
  return (
    <RequireAuth>
      <SearchClient />
    </RequireAuth>
  )
}
