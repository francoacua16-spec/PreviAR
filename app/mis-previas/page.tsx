import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyPartiesClient } from '@/components/party/my-parties-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  // Ruta privada: detrás del login y con datos de gente real. Fuera del índice.
  robots: { index: false, follow: false },
  title: 'Mis previas',
  description: 'Las previas que armaste y a las que vas.',
}

export default async function MisPreviasPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=%2Fmis-previas')
  }

  return <MyPartiesClient />
}
