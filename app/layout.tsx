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

export const metadata: Metadata = {
  title: {
    default: 'PreviAR — Las previas reales de tu ciudad',
    template: '%s · PreviAR',
  },
  description:
    'El mapa privado y efímero donde se arman las previas reales de La Plata, CABA y Bariloche. Sin boliches: casas, quintas y deptos. Dirección oculta hasta que te aprueban.',
  icons: {
    icon: '/icon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'PreviAR',
    statusBarStyle: 'black-translucent',
  },
  applicationName: 'PreviAR',
  keywords: ['previas', 'jodas', 'fiestas', 'La Plata', 'CABA', 'Bariloche', 'mapa'],
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
