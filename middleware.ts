import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Corre en todo menos en estáticos de Next e imágenes
     * (favicon, sw.js, íconos PWA, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
