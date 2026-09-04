import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Wordmark } from '@/components/logo'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Las reglas de uso de PreviAR: qué es, qué no es, y de qué responde cada uno.',
  alternates: { canonical: '/terminos' },
}

export default function TerminosPage() {
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

      <h1 className="mb-6 text-2xl font-bold text-foreground">Términos y condiciones</h1>
      <p className="mb-4 text-muted-foreground">Última actualización: 4 de septiembre de 2026.</p>

      <p className="mb-4">
        Al usar PreviAR (&ldquo;la app&rdquo;) aceptás estos términos. Si no estás de acuerdo, no
        la uses.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Qué es PreviAR</h2>
      <p className="mb-4">
        Un tablón privado y efímero entre particulares para avisar dónde y cuándo hay una previa.
        No vendemos entradas, no organizamos eventos, no somos productora ni intermediarios de
        pago. La previa la arma y la maneja el host, no nosotros.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Quién puede usarla</h2>
      <p className="mb-4">
        Necesitás una cuenta de Google propia y ser mayor de 18 años. Una cuenta por persona; no
        se pueden crear cuentas a nombre de otro.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Si sos host</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Publicás sólo lugares sobre los que tenés derecho a invitar gente.</li>
        <li>Sos responsable de a quién aprobás y de lo que pase en tu previa.</li>
        <li>La dirección exacta se revela sólo a los invitados que vos aprobás.</li>
        <li>No podés publicar previas con venta de entradas, alcohol a menores, ni actividad ilegal.</li>
      </ul>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Si vas a una previa</h2>
      <p className="mb-4">
        Vas por tu cuenta y riesgo, a la casa de un particular. Respetá el lugar, a los vecinos y
        lo que pida el host. PreviAR no verifica los lugares ni garantiza que la previa exista,
        sea segura o esté como la describieron.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Conducta</h2>
      <p className="mb-4">
        Está prohibido acosar, amenazar, suplantar identidades, publicar direcciones de terceros
        sin permiso, o usar la app para vender cualquier cosa. Podemos suspender o eliminar
        cuentas y previas que incumplan esto, sin aviso previo.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Contenido efímero</h2>
      <p className="mb-4">
        Las previas se borran solas cuando terminan. No garantizamos poder recuperar nada después
        de eso: guardá vos lo que necesites conservar.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Responsabilidad</h2>
      <p className="mb-4">
        La app se ofrece &ldquo;tal cual está&rdquo;, sin garantía de disponibilidad continua. En
        la medida en que la ley lo permita, PreviAR no responde por daños derivados de lo que pase
        en una previa, del trato entre usuarios, ni de interrupciones del servicio.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Cambios</h2>
      <p className="mb-4">
        Podemos actualizar estos términos. Si el cambio es de fondo, lo avisamos dentro de la app.
        Seguir usándola después de eso implica aceptarlos.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Ley aplicable</h2>
      <p className="mb-4">
        Se rigen por la ley de la República Argentina, con jurisdicción en los tribunales
        ordinarios de la Ciudad de La Plata, Provincia de Buenos Aires.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-foreground">Contacto</h2>
      <p className="mb-4">
        Escribinos a{' '}
        <a className="underline" href="mailto:fran.acua@hotmail.com">
          fran.acua@hotmail.com
        </a>
        .
      </p>

      <p className="text-muted-foreground">
        Ver también la{' '}
        <Link className="underline" href="/privacy">
          política de privacidad
        </Link>
        .
      </p>
    </main>
  )
}
