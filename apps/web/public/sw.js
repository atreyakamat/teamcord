const CACHE_VERSION = 'teamcord-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/offline.html']

const isApiLikeRequest = (pathname) =>
  pathname.startsWith('/api/') ||
  pathname.startsWith('/gateway') ||
  pathname.startsWith('/voice/') ||
  pathname.startsWith('/f/')

const isUiAssetRequest = (request, pathname) =>
  ['style', 'script', 'image', 'font'].includes(request.destination) ||
  pathname.startsWith('/icons/') ||
  pathname === '/manifest.json' ||
  pathname === '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestURL = new URL(event.request.url)
  if (requestURL.origin !== self.location.origin) {
    return
  }

  // Network-Only for API/auth/gateway/files calls.
  if (isApiLikeRequest(requestURL.pathname)) {
    event.respondWith(fetch(event.request))
    return
  }

  // Navigation: network first, fallback to offline page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request)
        return cached || caches.match('/offline.html')
      })
    )
    return
  }

  // UI assets: stale-while-revalidate.
  if (isUiAssetRequest(event.request, requestURL.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone()
              caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy))
            }
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      })
    )
    return
  }

  event.respondWith(fetch(event.request))
})
