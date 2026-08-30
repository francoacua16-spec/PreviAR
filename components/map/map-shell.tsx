'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/components/providers'
import { Header } from './header'
import { CityPicker } from './city-picker'
import { ZoneSheet } from './zone-sheet'
import { LoginGate } from './login-gate'
import { useGeolocation } from './use-geolocation'
import { CreateDialog } from '@/components/create/create-dialog'
import { MyPartiesSheet } from '@/components/party/my-parties-sheet'
import { friendlyError, listCityZones, setUserCity } from '@/lib/api'
import type { City } from '@/lib/zones'
import type { CityZoneRow } from '@/lib/types'

// Leaflet toca window/document: solo cliente.
const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background" />,
})

const CITY_STORAGE_KEY = 'previar:city'

function getStoredCity(): City {
  if (typeof window === 'undefined') return 'la_plata'
  const stored = window.localStorage.getItem(CITY_STORAGE_KEY)
  return stored === 'caba' || stored === 'bariloche' ? stored : 'la_plata'
}

export function MapShell() {
  const { user, loading, supabase } = useUser()
  const router = useRouter()
  const { pos } = useGeolocation()

  const [city, setCity] = useState<City>(getStoredCity)
  const [zones, setZones] = useState<CityZoneRow[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [selectedZone, setSelectedZone] = useState<{ key: string; label: string } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [myPartiesOpen, setMyPartiesOpen] = useState(false)

  // Refresca zonas cuando cambia ciudad / usuario / o se crea una previa
  const refreshZones = useCallback(async () => {
    if (!user) {
      setZones([])
      return
    }
    setZonesLoading(true)
    try {
      const data = await listCityZones(supabase, city)
      setZones(data)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setZonesLoading(false)
    }
  }, [supabase, city, user])

  useEffect(() => {
    void refreshZones()
  }, [refreshZones])

  function handleCityChange(next: City) {
    setCity(next)
    setSelectedZone(null)
    window.localStorage.setItem(CITY_STORAGE_KEY, next)
    if (user) setUserCity(supabase, user.id, next)
  }

  function handleCreateClick() {
    if (!user) {
      toast.info('Iniciá sesión para armar tu previa 🔑')
      return
    }
    setCreateOpen(true)
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {/* MAPA */}
      <div className="absolute inset-0">
        <MapCanvas
          city={city}
          zones={zones}
          pos={pos}
          onSelectZone={(key, label) => setSelectedZone({ key, label })}
        />
      </div>

      {/* OVERLAYS */}
      <Header onOpenMyParties={() => setMyPartiesOpen(true)} />
      <CityPicker city={city} onChange={handleCityChange} />

      {/* Leyenda de colores */}
      <div className="pointer-events-none absolute bottom-24 left-4 z-10">
        <div className="glass rounded-full px-3.5 py-2 text-[10px] font-semibold text-muted-foreground">
          🟢 &lt;10 km · 🟡 10–30 km · 🔴 +30 km
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={handleCreateClick}
        className="absolute bottom-5 right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-bold text-primary-foreground shadow-neon-pink transition-all hover:bg-primary/90 active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        Crear Previa
      </button>

      {!user && !loading && <LoginGate />}

      {/* SHEETS / DIALOGS */}
      <ZoneSheet
        open={selectedZone !== null}
        onOpenChange={(open) => !open && setSelectedZone(null)}
        city={city}
        zoneKey={selectedZone?.key ?? null}
        zoneLabel={selectedZone?.label ?? ''}
        pos={pos}
      />

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        city={city}
        onCreated={(partyId) => {
          void refreshZones()
          router.push(`/party/${partyId}`)
        }}
      />

      <MyPartiesSheet
        open={myPartiesOpen}
        onOpenChange={setMyPartiesOpen}
        onCreate={() => setCreateOpen(true)}
      />

      {zonesLoading && user && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
            <span className="h-3 w-3 animate-ping rounded-full bg-neon-pink" />
            Buscando previas…
          </div>
        </div>
      )}
    </div>
  )
}
