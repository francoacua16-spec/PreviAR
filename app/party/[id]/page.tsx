import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getParty } from '@/lib/api'
import { PartyClient } from '@/components/party/party-client'
import { ExpiredParty } from '@/components/party/expired-party'
import type { PartyRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PartyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/party/${params.id}`)}`)
  }

  let party: PartyRow | null = null
  let fetchError = false
  try {
    party = await getParty(supabase, params.id)
  } catch {
    fetchError = true
  }

  if (fetchError || !party) {
    return <ExpiredParty />
  }

  return <PartyClient initialParty={party} currentUserId={user.id} />
}
