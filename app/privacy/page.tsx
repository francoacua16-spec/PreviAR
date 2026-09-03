import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Wordmark } from '@/components/logo'

export const metadata: Metadata = {
  title: 'Política de privacidad',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-10 text-sm leading-relaxed text-foreground/90">
      <Link
        href="/"
        className="mb-8 inline-flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <Wordmark className="mb-8 h-8 self-start" />

      <h1 className="mb-6 text-2xl font-bold text-foreground">Política de privacidad</h1>
      <p className="mb-4 text-muted-foreground">Última actualización: 30 de agosto de 2026.</p>

      <p className="mb-4">
        PreviAR (&ldquo;la app&rdquo;) es un mapa privado y efímero para organizar previas en La
        Plata, CABA y Bariloche. Esta política explica qué datos usamos y por qué.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Qué datos recolectamos</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Datos de tu cuenta de Google al iniciar sesión: nombre, email y foto de perfil.</li>
        <li>La ubicación aproximada o exacta que compartís al crear o unirte a una previa.</li>
        <li>Los mensajes y datos que cargás dentro de una previa (título, dirección, invitados).</li>
      </ul>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Para qué los usamos</h2>
      <p className="mb-4">
        Únicamente para operar la app: autenticarte, mostrarte el mapa, y conectar hosts con
        invitados aprobados. No vendemos tus datos ni los compartimos con terceros con fines
        publicitarios.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Carácter efímero</h2>
      <p className="mb-4">
        Las previas y su información asociada (ubicación, invitados) se eliminan automáticamente
        una vez finalizadas. La dirección exacta solo se muestra a los invitados aprobados por el
        host.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Tus derechos</h2>
      <p className="mb-4">
        Podés pedir la eliminación de tu cuenta y tus datos en cualquier momento escribiéndonos a{' '}
        <a className="underline" href="mailto:fran.acua@hotmail.com">
          fran.acua@hotmail.com
        </a>
        .
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Contacto</h2>
      <p>
        Ante cualquier duda sobre esta política, escribinos a{' '}
        <a className="underline" href="mailto:fran.acua@hotmail.com">
          fran.acua@hotmail.com
        </a>
        .
      </p>
    </main>
  )
}
