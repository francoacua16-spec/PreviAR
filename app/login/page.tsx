import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Wordmark } from '@/components/logo'
import { LoginButton } from '@/components/login-button'
import { CITIES } from '@/lib/zones'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  const next = searchParams.next
  const authFailed = searchParams.error === 'auth'

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pb-28 pt-12">
      {/* Glow de marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center animate-fade-up">
        <Wordmark className="mb-3 h-32 animate-pulse-glow" />

        <h1 className="mt-6 text-center font-display text-2xl font-bold leading-snug tracking-tight">
          Las previas reales,
          <br />
          <span className="brand-gradient-text">sin que se entere todo el barrio.</span>
        </h1>

        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          Descubrí por zona. Pedí permiso. La dirección exacta se desbloquea solo
          cuando el anfitrión te aprueba. Y a las 8 horas, no queda rastro.
        </p>

        {authFailed && (
          <p className="mt-8 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-xs leading-relaxed text-destructive-foreground">
            No pudimos completar el ingreso. Probá de nuevo; si sigue fallando,
            cerrá la pestaña y volvé a entrar.
          </p>
        )}

        <div className="mt-8 w-full">
          <LoginButton next={next} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {CITIES.map((c) => (
            <span
              key={c.key}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {c.label}
            </span>
          ))}
        </div>

        <p className="mt-10 max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground/60">
          PreviAR es un tablón entre privados. No vendemos entradas ni organizamos
          eventos. Al usar la app aceptás ser responsable de tu propia joda.
        </p>

        <p className="mt-3 text-center text-[11px] text-muted-foreground/60">
          Al entrar aceptás los{' '}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/terminos">
            términos
          </Link>{' '}
          y la{' '}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/privacy">
            política de privacidad
          </Link>
          .
        </p>
      </div>

      <Link
        href="/"
        className="press glass-chip fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 z-20 flex h-11 items-center gap-2 rounded-full pl-3.5 pr-4 text-sm font-medium on-glass"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al mapa
      </Link>
    </main>
  )
}
