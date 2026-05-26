const CACHE_NAME = 'feedtrack-static-v2'
const NAVIGATION_TIMEOUT_MS = 900
const NAVIGATION_RETRY_WINDOW_MS = 10000
const navigationFallbacks = new Map()
const STATIC_PATHS = [
  '/app-shell.html',
  '/apple-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/favicon/favicon-16.png',
  '/favicon/favicon-32.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_PATHS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      respondToNavigation(request),
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/') || STATIC_PATHS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          return response
        })
      }),
    )
  }
})

function respondToNavigation(request) {
  const fallbackAt = navigationFallbacks.get(request.url)

  if (fallbackAt && Date.now() - fallbackAt < NAVIGATION_RETRY_WINDOW_MS) {
    navigationFallbacks.delete(request.url)
    return fetch(request).catch(() => caches.match('/app-shell.html'))
  }

  const network = fetch(request)
  const fallback = new Promise(resolve => {
    setTimeout(() => {
      caches.match('/app-shell.html').then(response => {
        if (response) {
          navigationFallbacks.set(request.url, Date.now())
        }

        resolve(response)
      })
    }, NAVIGATION_TIMEOUT_MS)
  })

  return Promise.race([network, fallback])
    .then(response => response || network)
    .catch(() => caches.match('/app-shell.html'))
}
