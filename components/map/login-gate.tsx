'use client'

import { Wordmark } from '@/components/logo'
import { LoginButton } from '@/components/login-button'

/** Overlay sobre el mapa cuando no hay sesión: la app se deja ver pero no tocar. */
export function LoginGate() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6 backdrop-blur-md animate-fade-in">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-card animate-fade-up">
        <Wordmark className="mx-auto mb-5 h-20 animate-pulse-glow" />
        <h1 className="font-display text-xl font-bold leading-snug tracking-tight">
          Tus previas, <span className="brand-gradient-text">sin que se entere todo el barrio.</span>
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Descubrí por zona · Pedí permiso · La dirección se desbloquea al aprobarte ·
          A las 8 horas no queda rastro.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground/60">
          La Plata · CABA · Bariloche
        </p>
      </div>
    </div>
  )
}
