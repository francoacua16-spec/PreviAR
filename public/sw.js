// PreviAR Service Worker — network-first para páginas, cache como fallback offline.
const CACHE = 'previar-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Solo recursos same-origin, GET, que no sean API
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(event.request)
        if (fresh.ok) cache.put(event.request, fresh.clone())
        return fresh
      } catch {
        const cached = await cache.match(event.request, { ignoreSearch: true })
        if (cached) return cached
        // último recurso: shell de la app
        const shell = await cache.match('/')
        return shell || new Response('Offline', { status: 503 })
      }
    })
  )
})
