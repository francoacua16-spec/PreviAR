import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Webhook de Didit: marca al usuario como verificado cuando la sesión termina Approved.
 *
 * OJO: la firma HMAC acá se calcula sobre el raw body con SHA256, que es el patrón
 * estándar de Didit (header `X-Signature-V2`, ver docs.didit.me/integration/webhooks).
 * No pudimos probar esto end-to-end sin credenciales reales — antes de confiar en
 * producción, disparar un webhook de prueba desde el dashboard de Didit y confirmar
 * que la firma matchea con el algoritmo de acá.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const signature = req.headers.get('x-signature-v2') ?? req.headers.get('x-signature') ?? ''

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  const validSignature =
    sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)

  if (!validSignature) {
    console.error('Didit webhook: firma inválida')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const session = (payload.session as Record<string, unknown> | undefined) ?? payload
  const vendorData = (session.vendor_data ?? payload.vendor_data) as string | undefined
  const status = (session.status ?? payload.status) as string | undefined

  if (vendorData && status === 'Approved') {
    // El webhook no corre con la sesión del usuario: necesitamos service_role para
    // poder tocar `verified`, columna que los usuarios no pueden editar por su cuenta.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await admin.from('users').update({ verified: true }).eq('id', vendorData)
    if (error) console.error('Didit webhook: no se pudo marcar verified', error.message)
  }

  return NextResponse.json({ ok: true })
}
