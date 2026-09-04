import type { Metadata, Viewport } from 'next'
import { Sora, Unbounded } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { TabBar } from '@/components/shell/tab-bar'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

/** Dominio real de producción. Sin esto, Next no puede resolver las URLs
 *  absolutas que piden Open Graph y los canónicos. */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://previar-rust.vercel.app'

const DESCRIPTION =
  'El mapa privado y efímero de las previas reales de todo el país. Casas y quintas, no boliches. La dirección aparece cuando te aprueban.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PreviAR — Las previas reales de tu ciudad',
    template: '%s · PreviAR',
  },
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: '/',
    siteName: 'PreviAR',
    title: 'PreviAR — Las previas reales de tu ciudad',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PreviAR — Las previas reales de tu ciudad',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // `app/icon.png` ya lo toma Next por convención de archivo; declarar acá un
  // `/icon.svg` que no existe en `public/` sólo generaba un 404 en producción.
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'PreviAR',
    statusBarStyle: 'black-translucent',
  },
  applicationName: 'PreviAR',
  formatDetection: { telephone: false },
  keywords: ['previas', 'jodas', 'fiestas', 'La Plata', 'CABA', 'Bariloche', 'Córdoba', 'Rosario', 'Mar del Plata', 'mapa'],
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${sora.variable} ${unbounded.variable} min-h-dvh`}>
        <Providers>
          {children}
          {/* Se monta una sola vez y decide sola si aparece: así ninguna página
              tiene que acordarse de incluirla ni de ocultarla. */}
          <TabBar />
        </Providers>
      </body>
    </html>
  )
}
