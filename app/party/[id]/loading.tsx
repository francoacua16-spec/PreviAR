import { Loader2 } from 'lucide-react'

/**
 * La página de la previa sigue siendo server-rendered (lee la previa con la
 * sesión del server), así que hay una espera real. Sin este archivo Next no
 * tiene nada que mostrar mientras tanto y el navegador se queda pintando la
 * pantalla anterior: parecía que el toque no había registrado.
 */
export default function LoadingParty() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background"
      role="status"
      aria-label="Cargando previa"
    >
      <Loader2 className="h-6 w-6 animate-spin text-neon-violet" />
    </div>
  )
}
