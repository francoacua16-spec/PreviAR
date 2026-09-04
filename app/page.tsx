import { MapShell } from '@/components/map/map-shell'

// Sin `force-dynamic`: MapShell es 100% cliente y esta página no lee cookies ni
// datos del server. Prerenderizada, el HTML sale de la CDN en vez de esperar un
// render por request.

export default function HomePage() {
  return <MapShell />
}
