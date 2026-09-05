'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/components/providers'
import { Header } from './header'
import { CityPicker } from './city-picker'
import { ZoneSheet } from './zone-sheet'
import { ShopSheet } from './shop-sheet'
import { LoginGate } from './login-gate'
import { useGeolocation } from './use-geolocation'
import { CreateDialog } from '@/components/create/create-dialog'
import { friendlyError, listZoneParties, setUserCity, shopsInBbox, zonesInBbox } from '@/lib/api'
import { CREATE_EVENT } from '@/lib/constants'
import { DEFAULT_CITY, findCity, type City } from '@/lib/zones'
import type { BboxZoneRow, ShopRow } from '@/lib/types'
import type { MapBounds } from './map-canvas'

// Leaflet toca window/document: solo cliente.
const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-background" />,
})

const CITY_STORAGE_KEY = 'previar:city'
const SHOPS_STORAGE_KEY = 'previar:shops'

/**
 * Zoom mínimo para pedir locales. Más lejos que esto un recuadro puede tener
 * miles de kioscos: no entran en la pantalla ni le sirven a nadie que todavía
 * está mirando media provincia.
 */
const SHOPS_MIN_ZOOM = 14

function readStoredCity(): City | null {
  try {
    const stored = window.localStorage.getItem(CITY_STORAGE_KEY)
    // Se valida contra el catálogo, no contra tres literales: si el usuario
    // guardó una ciudad que después se saca del catálogo, cae al default.
    return stored && findCity(stored) ? stored : null
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
  const [city, setCity] = useState<City>(DEFAULT_CITY)
  const [zones, setZones] = useState<BboxZoneRow[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [selectedZone, setSelectedZone] = useState<
    { city: City; key: string; label: string } | null
  >(null)
  // Último recuadro que reportó el mapa. Es lo que decide qué previas se
  // piden: el usuario puede panear a cualquier lado, no sólo a su ciudad.
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [shops, setShops] = useState<ShopRow[]>([])
  const [showShops, setShowShops] = useState(false)
  const [selectedShop, setSelectedShop] = useState<ShopRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingCreate, setPendingCreate] = useState(false)

  // Ciudad guardada de la visita anterior, ya montado (ver comentario arriba).
  useEffect(() => {
    const stored = readStoredCity()
    if (stored) setCity(stored)
    try {
      setShowShops(window.localStorage.getItem(SHOPS_STORAGE_KEY) === '1')
    } catch {
      // localStorage inaccesible (modo privado): la capa arranca apagada
    }
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

  // Parado en el mapa, el "+" no navega a ningún lado: la ruta ya es "/", así
  // que el efecto de arriba (que corre una sola vez al montar) nunca se volvía
  // a disparar y el botón no hacía nada. La barra avisa por evento en ese caso.
  useEffect(() => {
    function onCreate() {
      setPendingCreate(true)
    }
    window.addEventListener(CREATE_EVENT, onCreate)
    return () => window.removeEventListener(CREATE_EVENT, onCreate)
  }, [])

  // La sesión llega después del primer render: guardamos la intención y abrimos
  // recién cuando hay usuario, si no el diálogo se perdía en la carrera.
  useEffect(() => {
    if (!pendingCreate || !user) return
    setPendingCreate(false)
    setCreateOpen(true)
  }, [pendingCreate, user])

  // Refresca las zonas del recuadro visible: cambia al panear, al hacer zoom,
  // al crear una previa o cuando llega un evento de realtime.
  // silent=true se usa en el refresco de fondo: no prende el spinner ni tira toasts.
  const refreshZones = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user || !bounds) {
        setZones([])
        return
      }
      if (!opts?.silent) setZonesLoading(true)
      try {
        const data = await zonesInBbox(supabase, bounds)
        setZones(data)
      } catch (e) {
        if (!opts?.silent) toast.error(friendlyError(e))
      } finally {
        if (!opts?.silent) setZonesLoading(false)
      }
    },
    [supabase, bounds, user]
  )

  // Los locales no cambian de lugar ni de dueño mientras alguien mira el mapa,
  // así que no van por realtime ni por el refresco de fondo: se piden sólo
  // cuando cambia el recuadro y estamos lo bastante cerca.
  useEffect(() => {
    if (!user || !showShops || !bounds || bounds.zoom < SHOPS_MIN_ZOOM) {
      setShops([])
      return
    }
    let active = true
    shopsInBbox(supabase, bounds)
      .then((data) => active && setShops(data))
      .catch(() => {
        // Silencioso a propósito: es una capa opcional. Si falla, el mapa de
        // previas —que es lo que la app hace— sigue funcionando igual.
        if (active) setShops([])
      })
    return () => {
      active = false
    }
  }, [supabase, user, showShops, bounds])

  // El mapa avisa el recuadro en cada `moveend`. Sin debounce, arrastrar el
  // mapa un rato dispara una RPC por gesto; con esto, una sola al frenar.
  const handleBoundsChange = useCallback((next: MapBounds) => {
    setBounds((prev) => {
      // Micro-movimientos (un toque que mueve 3 px) no justifican otra consulta.
      if (
        prev &&
        Math.abs(prev.minLat - next.minLat) < 1e-4 &&
        Math.abs(prev.minLng - next.minLng) < 1e-4 &&
        Math.abs(prev.maxLat - next.maxLat) < 1e-4 &&
        Math.abs(prev.maxLng - next.maxLng) < 1e-4 &&
        prev.zoom === next.zoom
      ) {
        return prev
      }
      return next
    })
  }, [])

  // Antes esto era un setInterval de 5 segundos: una RPC `list_city_zones` cada
  // 5s por pestaña abierta, corriendo igual con la app en segundo plano y aunque
  // no hubiera cambiado nada. Ahora escuchamos los cambios reales de `parties`
  // (la tabla ya está publicada en realtime, ver migración 0006) y dejamos un
  // refresco lento sólo como red de seguridad si el socket se cae.
  useEffect(() => {
    if (!bounds) return
    void refreshZones()
    if (!user) return

    // Una previa nueva dispara varios eventos seguidos (insert + updates de
    // contadores). Los agrupamos en un solo refresco.
    let burst: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (burst) return
      burst = setTimeout(() => {
        burst = null
        void refreshZones({ silent: true })
      }, 800)
    }

    const channel = supabase
      .channel(`zones:${city}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, scheduleRefresh)
      .subscribe()

    // Volver a la app después de un rato: puede haberse perdido eventos.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshZones({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)

    const fallback = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshZones({ silent: true })
    }, 60_000)

    return () => {
      if (burst) clearTimeout(burst)
      clearInterval(fallback)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [refreshZones, supabase, user, city, bounds])

  // Si la zona tocada tiene una sola previa, saltamos la lista y vamos directo a ella.
  // La ciudad viene del pin y no del selector: el recuadro visible puede cruzar
  // dos ciudades, y buscar la previa en la ciudad equivocada no devolvía nada.
  async function handleSelectZone(cityKey: string, key: string, label: string) {
    const zoneRow = zones.find((z) => z.city_key === cityKey && z.zone_key === key)
    if (Number(zoneRow?.party_count ?? 0) === 1) {
      try {
        const rows = await listZoneParties(supabase, cityKey, key, pos)
        if (rows.length === 1) {
          router.push(`/party/${rows[0].id}`)
          return
        }
      } catch {
        // si falla, seguimos al comportamiento normal (abrir la hoja)
      }
    }
    setSelectedZone({ city: cityKey, key, label })
  }

  function handleCityChange(next: City) {
    setCity(next)
    setSelectedZone(null)
    window.localStorage.setItem(CITY_STORAGE_KEY, next)
    if (user) setUserCity(supabase, user.id, next)
  }

  function toggleShops() {
    setShowShops((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SHOPS_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignorar
      }
      return next
    })
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
          shops={shops}
          pos={pos}
          onSelectZone={handleSelectZone}
          onSelectShop={setSelectedShop}
          onBoundsChange={handleBoundsChange}
        />
      </div>

      {/* OVERLAYS */}
      <Header />
      <CityPicker city={city} onChange={handleCityChange} />

      {/* Antes de una previa hay que ir a comprar. La capa arranca apagada:
          el mapa es de previas, los kioscos son ayuda opcional. */}
      {user && (
        <button
          onClick={toggleShops}
          aria-pressed={showShops}
          className={`press absolute right-4 z-20 flex h-11 items-center gap-2 rounded-full px-4 font-display text-xs font-bold transition-colors ${
            showShops ? 'bg-primary text-primary-foreground' : 'glass text-foreground'
          }`}
          style={{
            bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.75rem)',
          }}
        >
          <ShoppingBasket className="h-4 w-4" />
          Comprar
        </button>
      )}

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
        city={selectedZone?.city ?? city}
        zoneKey={selectedZone?.key ?? null}
        zoneLabel={selectedZone?.label ?? ''}
        pos={pos}
      />

      <ShopSheet
        open={selectedShop !== null}
        onOpenChange={(open) => !open && setSelectedShop(null)}
        shop={selectedShop}
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

      {/* Sin esto, prender "Comprar" con el mapa lejos no muestra nada y
          parece roto. */}
      {user && showShops && bounds && bounds.zoom < SHOPS_MIN_ZOOM && (
        <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2" style={{ top: 'calc(env(safe-area-inset-top) + 7.5rem)' }}>
          <div className="glass rounded-full px-4 py-2 text-[11px] text-muted-foreground">
            Acercá el mapa para ver los locales
          </div>
        </div>
      )}

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
