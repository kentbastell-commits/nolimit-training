const CACHE_NAME = 'mandarin-field-offline-v3'
const CORE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/mandarin-field-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return
  const urls = event.data.urls.filter((url) => {
    try { return new URL(url).origin === self.location.origin } catch { return false }
  })
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => event.ports[0]?.postMessage({ ready: true }))
      .catch(() => event.ports[0]?.postMessage({ ready: false })),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      if (cached) {
        event.waitUntil(network.catch(() => undefined))
        return cached
      }
      return network.catch(() => request.mode === 'navigate' ? caches.match('/index.html', { ignoreVary: true }) : Response.error())
    }),
  )
})
