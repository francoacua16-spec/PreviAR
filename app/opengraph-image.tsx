import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const alt = 'PreviAR — Las previas reales de tu ciudad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * El logo se usa tal cual está en `public/`: se embebe el PNG original, no se
 * redibuja ni se reconstruye con formas. Cualquier cambio de marca sale de
 * reemplazar ese archivo.
 */
const logo = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public', 'logo-previar.png')
).toString('base64')}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
          // Satori (el motor de ImageResponse) sólo parsea gradientes simples:
          // los radiales con tamaño + posición que usa la app tiran
          // "Missing comma before color stops". Lineal, mismo tinte lila.
          backgroundImage: 'linear-gradient(135deg, #0A0A0A 0%, #191327 48%, #0A0A0A 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="PreviAR" width={520} height={312} />

        <div
          style={{
            marginTop: 24,
            fontSize: 38,
            fontWeight: 700,
            color: '#F5F5F7',
            letterSpacing: -0.5,
          }}
        >
          Las previas reales de tu ciudad
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 26,
            color: '#B299F1',
          }}
        >
          La Plata · CABA · Bariloche · +56 ciudades
        </div>
      </div>
    ),
    size
  )
}
