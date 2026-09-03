'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Wordmark } from '@/components/logo'

export function ExpiredParty() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="glass w-full max-w-sm rounded-3xl p-8 animate-fade-up">
        <Wordmark className="mx-auto mb-5 h-16 opacity-40 grayscale" />
        <h1 className="font-display text-xl font-bold">Esta previa ya expiró 💨</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Toda previa vive 8 horas y muere. No queda rastro: ni la dirección, ni el chat,
          ni la lista de invitados.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-neon-violet"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al mapa
        </Link>
      </div>
    </main>
  )
}
