import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/** Compara en tiempo constante, tolerando largos distintos. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

const hmac = (secret: string, data: string) =>
  crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex')

/** JSON compacto con las claves ordenadas: la forma canónica que firma X-Signature-V2. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const body = Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')
    return `{${body}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Webhook de Didit: marca al usuario como verificado cuando la sesión termina Approved.
 *
 * Didit manda tres firmas HMAC-SHA256 (docs.didit.me/integration/webhooks):
 *   X-Signature      → sobre los bytes crudos, tal cual se transmitieron.
 *   X-Signature-V2   → sobre el JSON canónico (claves ordenadas, compacto).
 *   X-Signature-Simple → NO autentica el cuerpo; no la usamos.
 * Priorizamos X-Signature porque acá leemos el raw body antes de parsear, así que
 * es exacta y no depende de reproducir su canonicalización. V2 queda de respaldo.
 *
 * X-Timestamp acota el replay: rechazamos cualquier cosa a más de 5 minutos.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const ts = Number(req.headers.get('x-timestamp'))
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return NextResponse.json({ error: 'stale timestamp' }, { status: 401 })
  }

  const raw = await req.text()

  let validSignature = false
  const sigRaw = req.headers.get('x-signature')
  if (sigRaw) validSignature = safeEqual(sigRaw, hmac(secret, raw))

  const sigV2 = req.headers.get('x-signature-v2')
  if (!validSignature && sigV2) {
    try {
      validSignature = safeEqual(sigV2, hmac(secret, canonicalJson(JSON.parse(raw))))
    } catch {
      validSignature = false
    }
  }

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
