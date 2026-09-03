import Image from 'next/image'
import { cn } from '@/lib/utils'

/* El logo NO se redibuja. `public/logo-previar.png` sale del archivo original
   de la marca: recortado y con el fondo hecho transparente, pero el trazo es
   exactamente el mismo, píxel por píxel. Un cambio de marca se hace
   reemplazando ese archivo, nunca dibujando acá.

   Va siempre el lockup entero, en chico también: la copa está volcada y no
   tiene tallo ni pie, así que sola no se lee como copa. */

/** Lockup: copa + "previAR". Escala por alto (`h-*`); el ancho lo sigue solo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-previar.png"
      alt="PreviAR"
      width={531}
      height={319}
      priority
      className={cn('w-auto object-contain', className)}
    />
  )
}
