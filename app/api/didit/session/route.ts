import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Arranca una sesión de verificación en Didit para el usuario logueado y devuelve la URL. */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'NOT_AUTH' }, { status: 401 })
  }

  const apiKey = process.env.DIDIT_API_KEY
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  if (!apiKey || !workflowId) {
    return NextResponse.json(
      { error: 'La verificación todavía no está configurada. Avisale al admin.' },
      { status: 503 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  try {
    const res = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: user.id,
        callback: `${appUrl}/profile`,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Didit session error', res.status, text)
      return NextResponse.json({ error: 'No se pudo iniciar la verificación.' }, { status: 502 })
    }

    const json = await res.json()

    // Guardamos el session_id para poder cruzarlo si hace falta debug del webhook.
    await supabase.from('users').update({ didit_session_id: json.session_id }).eq('id', user.id)

    return NextResponse.json({ url: json.url })
  } catch (e) {
    console.error('Didit session fetch failed', e)
    return NextResponse.json({ error: 'No se pudo conectar con el servicio de verificación.' }, { status: 502 })
  }
}
