const isDev = process.env.NODE_ENV === 'development'

/**
 * Content-Security-Policy.
 *
 * `unsafe-inline` en scripts es deuda consciente: Next inyecta su bootstrap y
 * los payloads de hidratación como <script> inline, y la alternativa (nonce por
 * request) obliga a que el middleware corra en TODAS las rutas — justo lo que
 * sacamos para que la home no pague un round-trip. Aun con eso, la política
 * cierra lo que más importa: nada de plugins, nada de <base> ajeno, nadie nos
 * mete en un iframe y las conexiones salientes están enumeradas.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Tiles de Esri, avatares de Google, y los data: de los pines del mapa.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Supabase (REST + realtime por websocket) y nada más: el geocoder sale por
  // nuestra propia /api/geocode, no desde el navegador.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // La app necesita geolocalización propia; el resto de los sensores no.
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No anunciamos el framework ni su versión.
  poweredByHeader: false,
  eslint: {
    // ESLint se corre aparte (npm run lint); no bloqueamos builds por reglas de estilo.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
