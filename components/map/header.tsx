import { Wordmark } from '@/components/logo'

/**
 * Barra superior del mapa: solo la marca.
 *
 * Antes vivían acá la campana y un menú de cuenta desplegable. Los dos eran
 * duplicados de la barra de apartados de abajo (Previas y Cuenta), y el
 * desplegable además caía detrás del selector de ciudad. Un destino, un lugar:
 * las acciones de cuenta viven en /profile, las solicitudes en /mis-previas.
 *
 * z-[35] igual que el selector de ciudad: sin sesión el LoginGate (z-30)
 * difumina lo que queda abajo, y tener el logo borroso con las ciudades
 * nítidas hacía ver la barra superior como un error de render.
 */
export function Header() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[35] flex items-center p-3">
      <div className="glass flex h-11 items-center rounded-full px-3.5">
        <Wordmark className="h-7" />
      </div>
    </header>
  )
}
