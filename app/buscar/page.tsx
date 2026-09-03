import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SearchClient } from '@/components/search/search-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buscar',
  description: 'Buscá previas por nombre, zona, música o tipo de lugar.',
}

export default async function BuscarPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=%2Fbuscar')
  }

  return <SearchClient />
}
