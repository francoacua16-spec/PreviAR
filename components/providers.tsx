'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/api'
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
  /** Solo para pintar el panel: la base valida de nuevo en cada RPC de admin. */
  isAdmin: boolean
  loading: boolean
  supabase: SupabaseClient
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [admin, setAdmin] = useState(false)
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

  // Usuario del que ya cargamos perfil y flag de admin. onAuthStateChange
  // también dispara en cada refresh de token; sin esto volvíamos a pedir perfil
  // e is_admin() cada hora, y otra vez al montar.
  const loadedUid = useRef<string | null>(null)

  const loadExtras = useCallback(
    (u: User | null) => {
      if (!u) {
        loadedUid.current = null
        setProfile(null)
        setAdmin(false)
        return
      }
      if (loadedUid.current === u.id) return
      loadedUid.current = u.id
      void refreshProfile(u.id)
      void isAdmin(supabase).then(setAdmin)
    },
    [refreshProfile, supabase]
  )

  useEffect(() => {
    let active = true

    // getSession lee la sesión que el navegador ya tiene guardada: no sale a la
    // red. getUser() pegaba a /auth/v1/user y dejaba toda la app en `loading`
    // hasta que volviera esa respuesta, así que el primer pintado esperaba un
    // round-trip. Quién sos de verdad lo valida la base en cada RPC (RLS); acá
    // sólo decidimos qué mostrar.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const u = data.session?.user ?? null
      setUser(u)
      loadExtras(u)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const u = session?.user ?? null
      setUser(u)
      loadExtras(u)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, loadExtras])

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      isAdmin: admin,
      loading,
      supabase,
      refreshProfile: () => (user ? refreshProfile(user.id) : Promise.resolve()),
    }),
    [user, profile, admin, loading, supabase, refreshProfile]
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
