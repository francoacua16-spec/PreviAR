import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from '@/components/admin/admin-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Panel',
  description: 'Panel interno.',
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=%2Fadmin')
  }

  // El chequeo de admin lo hace el cliente contra is_admin(), y cada RPC del
  // panel lo vuelve a validar en la base. Acá solo pedimos sesión.
  return <AdminClient />
}
