import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  /*
   * El middleware existe sólo para una cosa: refrescar la cookie de sesión
   * cuando la va a leer un Server Component, porque un Server Component no
   * puede escribir cookies y por eso no puede refrescarla él mismo.
   *
   * Después de mover /profile, /buscar, /mis-previas y /admin al cliente, el
   * único Server Component que lee sesión es /party/[id]. Corría en todas las
   * rutas y cada corrida es un `getUser()`, o sea un viaje de red a Supabase
   * antes de que el request llegue siquiera a la página: era medio segundo de
   * peaje en cada toque de pestaña, para nada.
   *
   * Los Route Handlers de /api sí pueden escribir cookies, así que refrescan
   * solos y tampoco lo necesitan.
   */
  matcher: ['/party/:path*', '/auth/:path*'],
}
