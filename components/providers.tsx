'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { PwaRegister } from '@/components/pwa-register'

export interface Profile {
  id: string
  city: string | null
  reputation: number
  display_name: string | null
  avatar_url: string | null
  verified: boolean
}

interface UserContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  supabase: SupabaseClient
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, city, reputation, display_name, avatar_url, verified')
        .eq('id', uid)
        .maybeSingle()

      if (!error) {
        setProfile((data as Profile | null) ?? null)
        return
      }

      // 42703 = columna inexistente: el código salió antes que la migración
      // 0002. Caemos al perfil viejo para no dejar la app sin ciudad ni
      // reputación (las features nuevas quedan apagadas hasta que corra).
      if (error.code !== '42703') return
      const { data: legacy } = await supabase
        .from('users')
        .select('id, city, reputation')
        .eq('id', uid)
        .maybeSingle()
      setProfile(
        legacy
          ? { ...(legacy as Omit<Profile, 'display_name' | 'avatar_url' | 'verified'>),
              display_name: null,
              avatar_url: null,
              verified: false }
          : null
      )
    },
    [supabase]
  )

  useEffect(() => {
    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user)
      if (data.user) refreshProfile(data.user.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) refreshProfile(u.id)
      else setProfile(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, refreshProfile])

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      loading,
      supabase,
      refreshProfile: () => (user ? refreshProfile(user.id) : Promise.resolve()),
    }),
    [user, profile, loading, supabase, refreshProfile]
  )

  return (
    <UserContext.Provider value={value}>
      <PwaRegister />
      {children}
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser debe usarse dentro de <Providers>')
  return ctx
}
