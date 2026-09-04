import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from '@/components/profile/profile-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu perfil',
  description: 'Tu cuenta de PreviAR.',
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=%2Fprofile')
  }

  return <ProfileClient />
}
