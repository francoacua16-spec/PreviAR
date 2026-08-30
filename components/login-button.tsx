'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useUser } from '@/components/providers'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}

/**
 * Pregunta al endpoint de Supabase si el provider esta habilitado ANTES de
 * navegar. Sin esto, un provider apagado manda al usuario a una pantalla con el
 * JSON crudo de Supabase ("Unsupported provider: provider is not enabled").
 * Ante cualquier duda devuelve ok, para no bloquear un login que sí funciona.
 */
async function googleProviderReady(): Promise<{ ok: boolean; msg?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return { ok: true }
  try {
    const res = await fetch(`${base}/auth/v1/authorize?provider=google`, {
      redirect: 'manual',
      credentials: 'omit',
    })
    // Un redirect cross-origin llega como respuesta opaca: el provider anda.
    if (res.type === 'opaqueredirect' || res.status === 0) return { ok: true }
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { msg?: string } | null
      return { ok: false, msg: body?.msg }
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

export function LoginButton({ next, fullWidth = true }: { next?: string; fullWidth?: boolean }) {
  const { supabase } = useUser()
  const [busy, setBusy] = useState(false)

  async function signInWithGoogle() {
    if (busy) return
    setBusy(true)

    const ready = await googleProviderReady()
    if (!ready.ok) {
      toast.error('El ingreso con Google no está habilitado todavía.', {
        description:
          ready.msg === 'Unsupported provider: provider is not enabled'
            ? 'Falta activar el proveedor Google en Supabase. Escribinos y lo destrabamos.'
            : ready.msg,
        duration: 8000,
      })
      setBusy(false)
      return
    }

    try {
      const callback = `${window.location.origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ''
      }`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
          queryParams: { prompt: 'select_account' },
          skipBrowserRedirect: true,
        },
      })
      if (error || !data?.url) {
        toast.error('No pudimos conectar con Google. Probá de nuevo.')
        setBusy(false)
        return
      }
      window.location.assign(data.url)
      // El navegador se va a Google: no desactivamos busy.
    } catch {
      toast.error('No pudimos conectar con Google. Probá de nuevo.')
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={busy}
      className={`flex h-13 items-center justify-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      Entrar con Google
    </button>
  )
}
