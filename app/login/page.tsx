import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PinLogo, Wordmark } from '@/components/logo'
import { LoginButton } from '@/components/login-button'
import { CITIES } from '@/lib/zones'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const next = searchParams.next

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
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
        <Link href="/" className="mb-10 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al mapa
        </Link>

        <div className="mb-8 animate-pulse-glow">
          <PinLogo className="h-24 w-24" />
        </div>

        <Wordmark className="mb-3 scale-125" />

        <h1 className="mt-6 text-center font-display text-2xl font-bold leading-snug tracking-tight">
          Las previas reales,
          <br />
          <span className="brand-gradient-text">sin que se entere todo el barrio.</span>
        </h1>

        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          Descubrí por zona. Pedí permiso. La dirección exacta se desbloquea solo
          cuando el anfitrión te aprueba. Y a las 8 horas, no queda rastro.
        </p>

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
      </div>
    </main>
  )
}
