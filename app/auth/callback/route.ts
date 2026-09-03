import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * `next` viene de la query, así que solo aceptamos rutas internas: una sola
 * barra al principio y sin "//" ni "/\", que son las formas con las que un link
 * armado por otro te manda a un dominio ajeno con la sesión recién abierta.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return '/'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
