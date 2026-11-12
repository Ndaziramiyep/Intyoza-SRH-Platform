// Intyoza service worker: keeps the app itself on the phone, so it opens and the offline guide works
// without internet. Only the app's own files are cached. Chats, answers and anything from /api are
// never stored here (they stay under the privacy settings in the app).
const CACHE = 'intyoza-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.png', '/icons/icon-192.png', '/icons/icon-512.png']

// Caches the page and the built JS/CSS it links to (/assets/... names change with every build).
async function cacheShell() {
  const cache = await caches.open(CACHE)
  await cache.addAll(SHELL)
  const html = await (await cache.match('/')).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  await cache.addAll(assets)
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('intyoza-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/health')) return

  // Pages: newest version when online, the saved app when offline (every route is the same app).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Built files never change under the same name: saved copy first.
  // Other files (icons, manifest): saved copy at once, refreshed in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached && url.pathname.startsWith('/assets/')) return cached
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      if (!cached) return network
      network.catch(() => {})
      return cached
    }),
  )
})
