import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://previar-rust.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Todo lo que hay detrás del login es privado: no tiene nada que hacer
        // en un índice y además devuelve un redirect a /login para el crawler.
        disallow: ['/api/', '/auth/', '/admin', '/profile', '/mis-previas', '/buscar', '/party/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
