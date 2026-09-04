import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/require-auth'
import { AdminClient } from '@/components/admin/admin-client'

// Estática a propósito: ver app/profile/page.tsx. El chequeo de admin lo hace
// el cliente contra is_admin(), y cada RPC del panel lo vuelve a validar en la
// base — este cascarón no expone nada.

export const metadata: Metadata = {
  title: 'Panel',
  description: 'Panel interno.',
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminClient />
    </RequireAuth>
  )
}
