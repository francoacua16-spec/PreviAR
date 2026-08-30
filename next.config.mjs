/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint se corre aparte (npm run lint); no bloqueamos builds por reglas de estilo.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
