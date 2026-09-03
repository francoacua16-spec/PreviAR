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
import { friendlyError, listCityZones, listZoneParties, setUserCity } from '@/lib/api'
import type { City } from '@/lib/zones'
import type { CityZoneRow } from '@/lib/types'

// Leaflet toca window/document: solo cliente.
const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background" />,
})

const CITY_STORAGE_KEY = 'previar:city'

function readStoredCity(): City | null {
  try {
    const stored = window.localStorage.getItem(CITY_STORAGE_KEY)
    return stored === 'caba' || stored === 'bariloche' || stored === 'la_plata' ? stored : null
  } catch {
    return null
  }
}

export function MapShell() {
  const { user, loading, supabase } = useUser()
  const router = useRouter()
  const { pos } = useGeolocation()

  // El server no puede leer localStorage: si acá arrancáramos con la ciudad
  // guardada, el HTML del server y el del cliente no coinciden y React descarta
  // el marcado hidratado. Eso dejaba el botón de la ciudad activa pintado mal:
  // tocabas CABA estando ya en CABA y no pasaba nada. Arrancamos siempre igual
  // que el server y ajustamos después de montar.
  const [city, setCity] = useState<City>('la_plata')
  const [zones, setZones] = useState<CityZoneRow[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [selectedZone, setSelectedZone] = useState<{ key: string; label: string } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingCreate, setPendingCreate] = useState(false)

  // Ciudad guardada de la visita anterior, ya montado (ver comentario arriba).
  useEffect(() => {
    const stored = readStoredCity()
    if (stored) setCity(stored)
  }, [])

  // El botón "+" de la barra inferior entra por acá: crear necesita el mapa
  // detrás para elegir el pin, así que no tiene ruta propia. Leemos el query a
  // mano (no useSearchParams) para no obligar a un boundary de Suspense, y lo
  // limpiamos enseguida para que un refresh no vuelva a abrir el diálogo.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('crear') !== '1') return
    window.history.replaceState(null, '', '/')
    setPendingCreate(true)
  }, [])

  // La sesión llega después del primer render: guardamos la intención y abrimos
  // recién cuando hay usuario, si no el diálogo se perdía en la carrera.
  useEffect(() => {
    if (!pendingCreate || !user) return
    setPendingCreate(false)
    setCreateOpen(true)
  }, [pendingCreate, user])

  // Refresca zonas cuando cambia ciudad / usuario / o se crea una previa.
  // silent=true se usa en el polling de fondo: no prende el spinner ni tira toasts.
  const refreshZones = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user) {
        setZones([])
        return
      }
      if (!opts?.silent) setZonesLoading(true)
      try {
        const data = await listCityZones(supabase, city)
        setZones(data)
      } catch (e) {
        if (!opts?.silent) toast.error(friendlyError(e))
      } finally {
        if (!opts?.silent) setZonesLoading(false)
      }
    },
    [supabase, city, user]
  )

  useEffect(() => {
    void refreshZones()
    // Actualiza previas activas cada 5s sin que el usuario tenga que recargar.
    const id = setInterval(() => void refreshZones({ silent: true }), 5000)
    return () => clearInterval(id)
  }, [refreshZones])

  // Si la zona tocada tiene una sola previa, saltamos la lista y vamos directo a ella.
  async function handleSelectZone(key: string, label: string) {
    const zoneRow = zones.find((z) => z.zone_text === key)
    if (Number(zoneRow?.party_count ?? 0) === 1) {
      try {
        const rows = await listZoneParties(supabase, city, key, pos)
        if (rows.length === 1) {
          router.push(`/party/${rows[0].id}`)
          return
        }
      } catch {
        // si falla, seguimos al comportamiento normal (abrir la hoja)
      }
    }
    setSelectedZone({ key, label })
  }

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
      {/* z-0 crea un stacking context propio: los panes de Leaflet (z-index 400+)
          quedan encerrados y no tapan los overlays de la UI. */}
      <div className="absolute inset-0 z-0">
        <MapCanvas
          city={city}
          zones={zones}
          pos={pos}
          onSelectZone={handleSelectZone}
        />
      </div>

      {/* OVERLAYS */}
      <Header />
      <CityPicker city={city} onChange={handleCityChange} />

      {/* Leyenda de colores. Se apoya sobre la barra inferior cuando hay sesión
          (la barra se oculta sola si no la hay), así nunca queda tapada. */}
      <div
        className="pointer-events-none absolute left-4 z-10"
        style={{
          bottom: user
            ? 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.75rem)'
            : 'calc(env(safe-area-inset-bottom) + 1.25rem)',
        }}
      >
        <div className="glass rounded-full px-3.5 py-2 text-[10px] font-semibold text-muted-foreground">
          🟢 &lt;10 km · 🟡 10–30 km · 🔴 +30 km
        </div>
      </div>

      {/* Sin sesión no hay barra inferior, así que el mapa mantiene su propio
          botón de crear; con sesión la acción vive en el "+" central de la barra
          y repetirla acá solo sumaba ruido. */}
      {!user && (
        <button
          onClick={handleCreateClick}
          className="press absolute bottom-5 right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-bold text-primary-foreground shadow-neon-violet transition-colors hover:bg-primary/90 sm:bottom-8 sm:right-8 md:bottom-10 md:right-10"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
          Crear Previa
        </button>
      )}

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

      {zonesLoading && user && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
            <span className="h-3 w-3 animate-ping rounded-full bg-neon-violet" />
            Buscando previas…
          </div>
        </div>
      )}
    </div>
  )
}
