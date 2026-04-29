const CACHE_NAME = 'pwa-api-showcase-v1'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-maskable.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request)

      if (request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(request)
          cache.put('./index.html', networkResponse.clone())
          return networkResponse
        } catch (error) {
          if (cachedResponse) {
            return cachedResponse
          }

          const cachedShell = await cache.match('./index.html')
          if (cachedShell) {
            return cachedShell
          }

          throw error
        }
      }

      if (cachedResponse) {
        return cachedResponse
      }

      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }),
  )
})
