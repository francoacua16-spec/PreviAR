import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * El middleware existe sólo para refrescar la cookie de sesión antes de que
     * la lea un componente de server. Corre en todo menos:
     *   - estáticos de Next, íconos, manifest, sw.js, imágenes
     *   - `/` (el mapa es cliente puro y no lee sesión en el server; el cliente
     *     de Supabase refresca solo). El `.+` final es lo que excluye la raíz:
     *     el matcher pide match completo y `/` no tiene nada después de la barra.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).+)',
  ],
}
